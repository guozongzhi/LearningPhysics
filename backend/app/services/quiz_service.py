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
    """
    query = (
        select(Question)
        .where(Question.primary_node_id.in_(request_data.topic_ids))
        .order_by(func.random())
        .limit(request_data.count)
    )

    result = await db.execute(query)
    questions = result.scalars().all()

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

    if is_correct:
        prompt = f"""你是一位资深高中物理教师。一位学生正确回答了以下题目，请给出详细的解题分析。

--- 题目 ---
{question.content_latex}

--- 正确答案 ---
数值: {question.answer_schema.get('correct_value')}
单位: {question.answer_schema.get('unit')}

--- 参考解题步骤 ---
{question.solution_steps}

--- 学生的答案 ---
{student_answer.student_input}

请用中文写出详细的解析（3-5句话），包含：
1. 肯定学生的正确回答
2. 详细的解题思路和关键步骤
3. 涉及的核心物理知识点和公式
4. 易错点提醒或拓展延伸（如有）

以 JSON 格式返回，包含 "feedback" 和 "error_tag" 两个字段。error_tag 固定为 "CORRECT"。
不要包含 markdown 格式或其他多余的文本。
示例：{{"feedback": "回答正确！本题考查牛顿第二定律 F=ma。由已知条件 F=10N、m=2kg，代入公式得 a=F/m=10/2=5m/s²。注意此题假设了光滑表面，如果存在摩擦力，需要先求合力。", "error_tag": "CORRECT"}}"""
    else:
        prompt = f"""你是一位资深高中物理教师。一位学生错误回答了以下题目，请给出详细的分析和解题指导。

--- 题目 ---
{question.content_latex}

--- 正确答案 ---
数值: {question.answer_schema.get('correct_value')}
单位: {question.answer_schema.get('unit')}

--- 参考解题步骤 ---
{question.solution_steps}

--- 学生的答案 ---
{student_answer.student_input}

请用中文写出详细的解析（3-5句话），包含：
1. 分析学生答案的错误原因（数值错误、单位错误、概念错误等）
2. 给出完整的正确解题过程
3. 涉及的核心物理知识点和公式
4. 鼓励性的建议

以 JSON 格式返回，包含 "feedback" 和 "error_tag" 两个字段。
error_tag 从以下选项中选一个：[VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR]
不要包含 markdown 格式或其他多余的文本。
示例：{{"feedback": "你的计算过程有误。本题应用牛顿第二定律 F=ma，已知 F=10N、m=2kg，正确计算为 a=F/m=10/2=5m/s²，而非你给出的 10m/s²。看起来你可能忘记了除以质量，建议复习 F=ma 的推导过程。", "error_tag": "CALCULATION_ERROR"}}"""

    try:
        response = await get_client().chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
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
