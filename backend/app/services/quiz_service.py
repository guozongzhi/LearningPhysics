import uuid
import json
import re
from typing import List, Dict, Any, Optional
import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
import openai

from app.models.models import Question, ExamRecord, User
from app.schemas.quiz import QuizGenerateRequest, QuizSubmitRequest, StudentAnswer, AnalysisResult
from app.core.config import settings

# --- AI Client Setup (supports OpenAI, Gemini, Doubao) ---
client: Optional[openai.AsyncClient] = None

def get_client() -> Optional[openai.AsyncClient]:
    """Get or initialize the AI client."""
    global client
    if client is None:
        refresh_client()
    return client

def refresh_client():
    """Re-initialize the AI client with current settings."""
    global client
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "YOUR_OPENAI_API_KEY":
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        client = openai.AsyncClient(**client_kwargs)
    else:
        client = None

# Initialize on module load
refresh_client()


async def generate_quiz(
    db: AsyncSession, request_data: QuizGenerateRequest, user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Service layer function to generate a quiz based on user request.
    Optimized random sampling: more efficient than ORDER BY RANDOM() for large datasets
    """
    # Get all matching question IDs first
    id_query = (
        select(Question.id)
        .where(Question.primary_node_id.in_(request_data.topic_ids))
    )
    id_result = await db.execute(id_query)
    question_ids = [row[0] for row in id_result.all()]

    # If there are fewer questions than requested, return all
    if len(question_ids) <= request_data.count:
        selected_ids = question_ids
    else:
        # Randomly select the requested number of IDs
        import random
        selected_ids = random.sample(question_ids, request_data.count)

    # Fetch the full question data for selected IDs
    query = select(Question).where(Question.id.in_(selected_ids))
    result = await db.execute(query)
    questions = result.scalars().all()

    # Shuffle the questions to avoid ordering by ID
    import random
    random.shuffle(questions)

    new_quiz_id = uuid.uuid4()
    
    # Sanitize questions for the response (remove correct answers from answer_schema)
    sanitized_questions = []
    for q in questions:
        # Create a shallow copy of the question-like dict or use pydantic if possible
        # Since 'questions' are SQLModel instances, we can modify them or create a dict
        q_data = q.model_dump()
        if "answer_schema" in q_data and q_data["answer_schema"]:
            # Remove sensitive fields
            s = q_data["answer_schema"].copy()
            s.pop("correct_answer", None)
            s.pop("correct_answers", None)
            s.pop("correct_value", None)
            q_data["answer_schema"] = s
        sanitized_questions.append(q_data)

    return {"quiz_id": new_quiz_id, "questions": sanitized_questions}


# --- Quiz Submission and Analysis Logic ---

def _evaluate_answer(student_input: str, answer_schema: Dict[str, Any]) -> bool:
    """A simple evaluator for student answers."""
    if not student_input:
        return False
        
    schema_type = answer_schema.get("type")
    
    # 1. Calculation / Numeric with Unit
    if schema_type == "value_unit":
        try:
            student_value_match = re.search(r'[-+]?\d*\.\d+|\d+', student_input)
            if not student_value_match:
                return False
            student_value = float(student_value_match.group())

            correct_value = float(answer_schema["correct_value"])
            tolerance = float(answer_schema.get("tolerance", 0.01))

            if not (correct_value - tolerance <= student_value <= correct_value + tolerance):
                return False

            correct_unit = answer_schema["unit"]
            if correct_unit.lower() not in student_input.lower():
                normalized_input = student_input.replace("^", "").lower()
                normalized_unit = correct_unit.replace("^", "").lower()
                if normalized_unit not in normalized_input:
                    return False
            return True
        except (ValueError, TypeError, KeyError):
            return False

    # 2. True/False
    elif schema_type == "true_false":
        correct = str(answer_schema.get("correct_answer")).lower()
        return student_input.strip().lower() == correct

    # 3. Single Choice (e.g., A, B, C, D)
    elif schema_type == "single_choice":
        correct = str(answer_schema.get("correct_answer")).strip().upper()
        return student_input.strip().upper() == correct

    # 4. Multiple Choice (e.g., A, C)
    elif schema_type == "multiple_choice":
        # Format can be "A,C" or "A, C"
        correct_list = [s.strip().upper() for s in answer_schema.get("correct_answers", [])]
        student_list = [s.strip().upper() for s in student_input.split(",") if s.strip()]
        
        if not correct_list or not student_list:
            return False
            
        return set(correct_list) == set(student_list)

    # 5. Fill in the Blank
    elif schema_type == "blank":
        correct = str(answer_schema.get("correct_answer", "")).strip().lower()
        return student_input.strip().lower() == correct

    return False


async def _get_ai_feedback(question: Question, student_answer: StudentAnswer, is_correct: bool, user: User) -> tuple[AnalysisResult, int]:
    """Generates detailed feedback for any answer. Returns (AnalysisResult, token_usage)."""
    ai_client = get_client()
    if not ai_client:
        return AnalysisResult(
            is_correct=is_correct,
            feedback="AI analysis is not configured." if not is_correct else "回答正确！",
            error_tag="CONFIG_ERROR" if not is_correct else "CORRECT"
        ), 0

    if user.token_usage >= user.token_limit:
        return AnalysisResult(
            is_correct=is_correct,
            feedback="Token 额度已达上限，无法提供详细 AI 分析。您的回答" + ("正确" if is_correct else "错误") + "。",
            error_tag="CORRECT" if is_correct else "AI_ERROR"
        ), 0

    # Determine the correct answer string for the prompt
    correct_answer_str = ""
    ans_schema = question.answer_schema or {}
    q_type = question.question_type
    
    if q_type in ["CHOICE", "SINGLE_CHOICE"]:
        correct_answer_str = f"正确选项是: {ans_schema.get('correct_answer')}"
        if "options" in ans_schema:
            options_str = "\n".join([f"{o['label']}: {o['text']}" for o in ans_schema["options"]])
            correct_answer_str += f"\n选项列表:\n{options_str}"
    elif q_type == "MULTIPLE_CHOICE":
        correct_answer_str = f"正确选项是: {', '.join(ans_schema.get('correct_answers', []))}"
        if "options" in ans_schema:
            options_str = "\n".join([f"{o['label']}: {o['text']}" for o in ans_schema["options"]])
            correct_answer_str += f"\n选项列表:\n{options_str}"
    elif q_type == "TRUE_FALSE":
        val = "正确" if str(ans_schema.get("correct_answer")).lower() == "true" else "错误"
        correct_answer_str = f"正确答案是: {val}"
    elif q_type == "BLANK":
        correct_answer_str = f"正确填空内容是: {ans_schema.get('correct_answer')}"
    elif q_type == "CALCULATION":
        correct_answer_str = f"正确数值: {ans_schema.get('correct_value')}, 单位: {ans_schema.get('unit')}"

    status_str = "正确回答" if is_correct else "错误回答"
    
    prompt = f"""你是一位资深高中物理教师。一位学生{status_str}了以下题目，请给出详细的解析。

--- 题目 ---
{question.content_latex}

--- 正确答案信息 ---
{correct_answer_str}

--- 参考解题步骤 ---
{question.solution_steps}

--- 学生的答案 ---
{student_answer.student_input}

请用中文写出详细的解析（3-5句话），包含：
1. {"肯定学生的表现并深化理解" if is_correct else "分析错误原因（如概念混淆、计算失误等）并给出指引"}
2. 详细的物理思路和关联的知识点
3. 如果是多选题或单选题，请解释为什么选项正确或错误
4. 鼓励性的结尾

以 JSON 格式返回，包含 "feedback" 和 "error_tag" 两个字段。
如果回答正确，error_tag 固定为 "CORRECT"。
如果回答错误，从以下选项中选一个最贴切的 error_tag：[VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR]
不要包含 markdown 格式或其他多余的文本。"""

    try:
        response = await get_client().chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            timeout=10.0,  # 10 seconds timeout for AI calls
            max_retries=2,  # Retry up to 2 times on failure
        )
        # Parse the JSON and handle markdown blocks
        content = response.choices[0].message.content.strip()
        tokens = response.usage.total_tokens if response.usage else 0
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        
        analysis_json = json.loads(content)
        return AnalysisResult(is_correct=is_correct, **analysis_json), tokens
    except Exception as e:
        print(f"Error calling OpenAI for feedback: {e}")
        return AnalysisResult(
            is_correct=is_correct,
            feedback="回答正确！" if is_correct else "生成 AI 反馈时出错。",
            error_tag="CORRECT" if is_correct else "AI_ERROR"
        ), 0

async def submit_quiz(db: AsyncSession, request_data: QuizSubmitRequest, user_id: uuid.UUID):
    """
    Service layer function to grade a submitted quiz and provide feedback.
    Yields NDJSON progress chunks, and final result.
    """
    from app.models.models import User
    
    # Needs to run in a db scope capable of concurrent commits if needed,
    # but since it's an async generator, the db session remains open during iteration.
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()

    question_ids = [answer.question_id for answer in request_data.answers]
    query = select(Question).where(Question.id.in_(question_ids))
    result = await db.execute(query)
    questions = {q.id: q for q in result.scalars().all()}

    analysis_results: Dict[uuid.UUID, AnalysisResult] = {}
    correct_count = 0
    total_tokens_used = 0
    
    total_answers = len(request_data.answers)
    graded_count = 0

    feedback_tasks = []
    task_map = {}

    for i, answer in enumerate(request_data.answers):
        question = questions.get(answer.question_id)
        if not question:
            continue

        is_correct = _evaluate_answer(answer.student_input, question.answer_schema)
        if is_correct:
            correct_count += 1
            
        # Yield 'analyzing' status chunk before kicking off the task
        progress_data = {"progress": graded_count, "total": total_answers, "status": "analyzing", "currentIndex": i}
        yield json.dumps(progress_data) + "\n"

        task = asyncio.create_task(_get_ai_feedback(question, answer, is_correct, user))
        feedback_tasks.append(task)
        task_map[task] = answer.question_id

    # We use asyncio.wait instead of as_completed to keep our internal mapping
    pending = set(feedback_tasks)
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            q_id = task_map.get(task)
            res, tokens = task.result()
            analysis_results[q_id] = res
            
            # Add correct_answer_display
            q = questions.get(q_id)
            if q:
                ans_schema = q.answer_schema or {}
                q_type = q.question_type
                if q_type in ["CHOICE", "SINGLE_CHOICE"]:
                    res.correct_answer_display = str(ans_schema.get("correct_answer", ""))
                elif q_type == "MULTIPLE_CHOICE":
                    res.correct_answer_display = ", ".join(ans_schema.get("correct_answers", []))
                elif q_type == "TRUE_FALSE":
                    res.correct_answer_display = "正确" if str(ans_schema.get("correct_answer")).lower() == "true" else "错误"
                elif q_type == "BLANK":
                    res.correct_answer_display = str(ans_schema.get("correct_answer", ""))
                elif q_type == "CALCULATION":
                    res.correct_answer_display = f"{ans_schema.get('correct_value')} {ans_schema.get('unit')}"

            total_tokens_used += tokens
            graded_count += 1
            
            # Yield progress checkpoint
            progress_data = {"progress": graded_count, "total": total_answers}
            yield json.dumps(progress_data) + "\n"

    # Save exam records based on outcomes
    for answer in request_data.answers:
        if answer.question_id not in analysis_results:
            continue
        
        exam_record = ExamRecord(
            id=uuid.uuid4(),
            user_id=user_id,
            question_id=answer.question_id,
            student_input=answer.student_input,
            is_correct=analysis_results[answer.question_id].is_correct,
            ai_analysis=analysis_results[answer.question_id].dict()
        )
        db.add(exam_record)

    total_score = (correct_count / len(request_data.answers)) * 100 if request_data.answers else 0

    # Generate AI overall analysis summary
    
    # Yield 'summarizing' before the final API call
    yield json.dumps({"progress": graded_count, "total": total_answers, "status": "summarizing"}) + "\n"
    
    overall_summary = ""
    ai_client = get_client()
    if ai_client and len(request_data.answers) > 0 and user.token_usage + total_tokens_used < user.token_limit:
        try:
            wrong_details = []
            for answer in request_data.answers:
                q = questions.get(answer.question_id)
                ar = analysis_results.get(answer.question_id)
                if q and ar and not ar.is_correct:
                    wrong_details.append(f"- 题目: {q.content_latex[:80]}，学生答: {answer.student_input}，错误类型: {ar.error_tag}")

            summary_prompt = f"""你是一位资深高中物理教师。一位学生刚完成了一次物理测验。
测验结果：答对 {correct_count}/{len(request_data.answers)} 题，得分 {total_score:.0f} 分。

{'错题详情：' + chr(10).join(wrong_details) if wrong_details else '全部正确！'}

请用中文写一段简短的整体分析报告（3-5句话），包含：
1. 对学生表现的整体评价
2. 薄弱知识点分析（如果有错题）
3. 具体的学习建议

不要使用 markdown 格式，直接输出纯文本。"""

            summary_response = await get_client().chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": summary_prompt}],
                temperature=0.7,
                max_tokens=300,
                timeout=15.0,  # 15 seconds timeout for summary generation
                max_retries=2,  # Retry up to 2 times on failure
            )
            overall_summary = summary_response.choices[0].message.content.strip()
            total_tokens_used += (summary_response.usage.total_tokens if summary_response.usage else 0)
        except Exception as e:
            overall_summary = f"本次测验得分 {total_score:.0f} 分，答对 {correct_count}/{len(request_data.answers)} 题。"
    else:
        if user.token_usage + total_tokens_used >= user.token_limit:
             overall_summary = f"本次测验得分 {total_score:.0f} 分，答对 {correct_count}/{len(request_data.answers)} 题。[超额取消长分析]"
        else:
             overall_summary = f"本次测验得分 {total_score:.0f} 分，答对 {correct_count}/{len(request_data.answers)} 题。请配置 AI API 以获取更详细的分析。"

    # Update token usage and commit
    user.token_usage += total_tokens_used
    await db.commit()

    # Yield final result
    # Pydantic dict formatting
    serializable_analysis = {str(k): v.dict() for k, v in analysis_results.items()}
    final_data = {
        "result": {
            "total_score": total_score,
            "analysis": serializable_analysis,
            "overall_summary": overall_summary
        }
    }
    yield json.dumps(final_data) + "\n"
