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


def _format_correct_answer_brief(question: Question) -> str:
    """生成简短的正确答案展示字符串"""
    ans_schema = question.answer_schema or {}
    q_type = question.question_type
    if q_type in ["CHOICE", "SINGLE_CHOICE"]:
        return str(ans_schema.get("correct_answer", ""))
    elif q_type == "MULTIPLE_CHOICE":
        return ", ".join(ans_schema.get("correct_answers", []))
    elif q_type == "TRUE_FALSE":
        return "正确" if str(ans_schema.get("correct_answer")).lower() == "true" else "错误"
    elif q_type == "BLANK":
        return str(ans_schema.get("correct_answer", ""))
    elif q_type == "CALCULATION":
        return f"{ans_schema.get('correct_value')} {ans_schema.get('unit')}"
    return ""


def _clean_ai_content(content: str) -> str:
    """清洗 AI 输出内容，提取 JSON"""
    content = content.strip()
    # 清理 reasoning 模型的 <think> 标签
    if "<think>" in content:
        think_end = content.find("</think>")
        if think_end != -1:
            content = content[think_end + 8:].strip()
        else:
            content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
            content = re.sub(r'<think>[\s\S]*', '', content).strip()
    # 去除 markdown 代码块标记
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    # 兜底：提取 JSON 对象
    json_start = content.find('{')
    json_end = content.rfind('}')
    if json_start != -1 and json_end != -1 and json_end > json_start:
        content = content[json_start:json_end + 1]
    return content


async def _batch_evaluate(
    ai_client: openai.AsyncClient,
    questions: Dict[uuid.UUID, Question],
    answers: List[StudentAnswer],
    eval_results: Dict[uuid.UUID, bool],
    correct_count: int
) -> tuple:
    """
    批量评估方案：1 次 API 调用完成所有题目的对错判定 + 错题解析 + 总结报告。
    使用 reasoning_split=true 分离思维链，max_tokens=8192。
    返回 (analysis_dict, overall_summary, tokens_used)
    """
    total_count = len(answers)
    items_list = []

    for idx, answer in enumerate(answers):
        q = questions.get(answer.question_id)
        if not q:
            continue
        is_correct = eval_results.get(answer.question_id, False)
        correct_str = _format_correct_answer_brief(q)
        status = "正确" if is_correct else "错误"

        items_list.append(
            f"[题{idx+1}] ID:{answer.question_id} | 答案:{correct_str} | 学生:{answer.student_input} | {status}"
        )
        # 仅对错题提供题干和解题步骤，节省 Prompt Token
        if not is_correct:
            items_list.append(f"  题干: {q.content_latex}")
            if q.solution_steps:
                items_list.append(f"  解法: {q.solution_steps}")

    all_items_str = "\n".join(items_list)

    prompt = f"""你是一位亲切耐心的高中物理辅导老师，正在给学生写个性化学习反馈。语气温暖鼓励，用"你"称呼学生。请直接输出JSON，第一个字符必须是{{。
共{total_count}题，系统已预判对错。

{all_items_str}

JSON格式：
{{"answers":[{{"question_id":"ID","is_correct":bool,"error_tag":"CORRECT或VALUE_ERROR/UNIT_ERROR/CALCULATION_ERROR/CONCEPT_ERROR/FORMAT_ERROR","feedback":"仅错题：4-5句详细解析"}}],"overall_summary":"6-8句详细整体反馈"}}

错题feedback要求（4-5句，用"你"称呼）：
- 第1句：温和指出错因（如"这道题你可能把XX和YY搞混了"）
- 第2句：讲解正确的物理概念或原理
- 第3句：写出关键公式并简要演示正确的解题步骤
- 第4句：点明这类题的易错点或记忆口诀
- 第5句（可选）：给出举一反三的建议（如"类似的题目还会考到XX场景，思路是一样的"）
is_correct为true时不输出feedback字段。

overall_summary要求（6-8句，用"你"称呼，语气亲切鼓励）：
- 这次你答对了{correct_count}/{total_count}题
- 哪些题目做得不错，值得肯定
- 按物理模块归纳薄弱知识点（如力学、电学、热学等）
- 分析错误的主要类型（是概念不清、公式记错还是计算粗心）
- 给出具体可操作的复习建议（如"建议你把XX章节的公式整理一遍"）
- 鼓励性结尾，让你对后续学习充满信心"""

    response = await ai_client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=16384,
        timeout=120.0,
        extra_body={"reasoning_split": True}
    )

    raw_content = response.choices[0].message.content or ""
    tokens_used = response.usage.total_tokens if response.usage else 0
    content = _clean_ai_content(raw_content)

    data = json.loads(content)
    ai_answers = data.get("answers", [])
    overall_summary = data.get("overall_summary", "")

    # 构建 analysis_dict: question_id -> AnalysisResult
    analysis_dict: Dict[uuid.UUID, AnalysisResult] = {}
    # 将 AI 返回的按 question_id 索引
    ai_answer_map = {}
    for ai_ans in ai_answers:
        qid_str = ai_ans.get("question_id", "")
        try:
            qid = uuid.UUID(qid_str)
            ai_answer_map[qid] = ai_ans
        except (ValueError, AttributeError):
            continue

    for answer in answers:
        qid = answer.question_id
        is_correct = eval_results.get(qid, False)
        ai_ans = ai_answer_map.get(qid, {})

        feedback = ai_ans.get("feedback", "")
        error_tag = ai_ans.get("error_tag", "CORRECT" if is_correct else "AI_ERROR")

        if is_correct:
            feedback = feedback or "回答正确！"
            error_tag = "CORRECT"

        # 附加正确答案展示
        q = questions.get(qid)
        correct_answer_display = _format_correct_answer_brief(q) if q else ""

        analysis_dict[qid] = AnalysisResult(
            is_correct=is_correct,
            feedback=feedback,
            error_tag=error_tag,
            correct_answer_display=correct_answer_display
        )

    return analysis_dict, overall_summary, tokens_used


async def _get_ai_feedback(question: Question, student_answer: StudentAnswer, is_correct: bool, user: User) -> tuple[AnalysisResult, int]:
    """单题 AI 反馈（降级兜底路径，仅在批量评估失败时使用）。返回 (AnalysisResult, token_usage)。"""
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
            max_tokens=2000,
            timeout=30.0,
            extra_body={"reasoning_split": True}
        )
        content = _clean_ai_content(response.choices[0].message.content or "")
        tokens = response.usage.total_tokens if response.usage else 0
        
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
    
    优化后的架构：1 次 API 调用完成全部评估（对错判定 + 错题解析 + 总结报告）。
    如果批量调用失败，降级为逐题调用。
    """
    from app.models.models import User
    
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()

    question_ids = [answer.question_id for answer in request_data.answers]
    query = select(Question).where(Question.id.in_(question_ids))
    result = await db.execute(query)
    questions = {q.id: q for q in result.scalars().all()}

    total_answers = len(request_data.answers)
    
    # ========== Phase 1: 本地预判对错 ==========
    eval_results: Dict[uuid.UUID, bool] = {}
    correct_count = 0
    for answer in request_data.answers:
        question = questions.get(answer.question_id)
        if not question:
            continue
        is_correct = _evaluate_answer(answer.student_input, question.answer_schema)
        eval_results[answer.question_id] = is_correct
        if is_correct:
            correct_count += 1

    # 发送"评估中"进度
    yield json.dumps({"progress": 0, "total": total_answers, "status": "analyzing"}) + "\n"

    analysis_results: Dict[uuid.UUID, AnalysisResult] = {}
    total_tokens_used = 0
    overall_summary = ""

    ai_client = get_client()
    batch_success = False

    # ========== Phase 2: 尝试批量 AI 评估（1 次 API 调用） ==========
    if ai_client and user.token_usage < user.token_limit:
        try:
            # 将 AI 调用放入后台 task，主循环每 5 秒发送心跳保持连接
            batch_task = asyncio.create_task(
                _batch_evaluate(ai_client, questions, request_data.answers, eval_results, correct_count)
            )
            heartbeat_count = 0
            # 动态阶段文案，每 5 秒轮换
            stage_messages = [
                "正在判定每道题的对错...",
                "正在分析错题原因...",
                "正在生成详细解题步骤...",
                "正在归纳薄弱知识点...",
                "正在撰写学习建议...",
                "正在生成学情报告...",
                "即将完成，请稍等...",
            ]
            while not batch_task.done():
                try:
                    await asyncio.wait_for(asyncio.shield(batch_task), timeout=5.0)
                except asyncio.TimeoutError:
                    # AI 还没返回，发送心跳保持连接存活
                    heartbeat_count += 1
                    msg = stage_messages[min(heartbeat_count - 1, len(stage_messages) - 1)]
                    yield json.dumps({"progress": 0, "total": total_answers, "status": "analyzing", "heartbeat": heartbeat_count, "message": msg}) + "\n"

            # 获取结果（如有异常会在此抛出）
            analysis_results, overall_summary, total_tokens_used = batch_task.result()
            batch_success = True
            # 批量成功，发送完成进度
            yield json.dumps({"progress": total_answers, "total": total_answers, "status": "analyzing"}) + "\n"
        except Exception as e:
            print(f"[submit_quiz] 批量评估失败，降级为逐题调用: {e}")
            import traceback
            traceback.print_exc()
            batch_success = False

    # ========== Phase 3: 降级路径 - 逐题调用 ==========
    if not batch_success:
        graded_count = 0
        sem = asyncio.Semaphore(2)
        
        async def sem_feedback(q_obj, ans_obj, is_corr, user_obj):
            async with sem:
                return await _get_ai_feedback(q_obj, ans_obj, is_corr, user_obj)

        feedback_tasks = []
        task_map = {}

        for i, answer in enumerate(request_data.answers):
            question = questions.get(answer.question_id)
            if not question:
                continue

            is_correct = eval_results.get(answer.question_id, False)
            progress_data = {"progress": graded_count, "total": total_answers, "status": "analyzing", "currentIndex": i}
            yield json.dumps(progress_data) + "\n"

            task = asyncio.create_task(sem_feedback(question, answer, is_correct, user))
            feedback_tasks.append(task)
            task_map[task] = answer.question_id

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
                yield json.dumps({"progress": graded_count, "total": total_answers}) + "\n"

        # 降级路径的 summary 生成
        yield json.dumps({"progress": graded_count, "total": total_answers, "status": "summarizing"}) + "\n"
        
        if ai_client and len(request_data.answers) > 0 and user.token_usage + total_tokens_used < user.token_limit:
            try:
                wrong_details = []
                for answer in request_data.answers:
                    q = questions.get(answer.question_id)
                    ar = analysis_results.get(answer.question_id)
                    if q and ar and not ar.is_correct:
                        wrong_details.append(f"- 题目: {q.content_latex[:80]}，学生答: {answer.student_input}，错误类型: {ar.error_tag}")

                summary_prompt = f"""你是一位资深高中物理教师。一位学生刚完成了一次物理测验。
测验结果：答对 {correct_count}/{len(request_data.answers)} 题，得分 {(correct_count / len(request_data.answers)) * 100:.0f} 分。

{'错题详情：' + chr(10).join(wrong_details) if wrong_details else '全部正确！'}

请用中文写一段简短的整体分析报告（3-5句话），包含：
1. 对学生表现的整体评价
2. 薄弱知识点分析（如果有错题）
3. 具体的学习建议

不要使用 markdown 格式，直接输出纯文本。"""

                summary_response = await ai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.7,
                    max_tokens=2000,
                    timeout=30.0,
                    extra_body={"reasoning_split": True}
                )
                overall_summary = _clean_ai_content(summary_response.choices[0].message.content or "")
                # clean_ai_content 会提取 JSON，但 summary 是纯文本，如果不是 JSON 则直接使用
                if not overall_summary.startswith('{'):
                    overall_summary = (summary_response.choices[0].message.content or "").strip()
                    # 仍需清理 think 标签
                    if "<think>" in overall_summary:
                        think_end = overall_summary.find("</think>")
                        if think_end != -1:
                            overall_summary = overall_summary[think_end + 8:].strip()
                        else:
                            overall_summary = re.sub(r'<think>[\s\S]*?</think>', '', overall_summary).strip()
                            overall_summary = re.sub(r'<think>[\s\S]*', '', overall_summary).strip()
                total_tokens_used += (summary_response.usage.total_tokens if summary_response.usage else 0)
            except Exception as e:
                total_score = (correct_count / len(request_data.answers)) * 100 if request_data.answers else 0
                overall_summary = f"本次测验得分 {total_score:.0f} 分，答对 {correct_count}/{len(request_data.answers)} 题。"
        else:
            total_score = (correct_count / len(request_data.answers)) * 100 if request_data.answers else 0
            if user.token_usage + total_tokens_used >= user.token_limit:
                overall_summary = f"本次测验得分 {total_score:.0f} 分，答对 {correct_count}/{len(request_data.answers)} 题。[超额取消长分析]"
            else:
                overall_summary = f"本次测验得分 {total_score:.0f} 分，答对 {correct_count}/{len(request_data.answers)} 题。请配置 AI API 以获取更详细的分析。"

    # ========== Phase 4: 保存记录并返回结果 ==========
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

    # Update token usage and commit
    user.token_usage += total_tokens_used
    await db.commit()

    # Yield final result
    serializable_analysis = {str(k): v.dict() for k, v in analysis_results.items()}
    final_data = {
        "result": {
            "total_score": total_score,
            "analysis": serializable_analysis,
            "overall_summary": overall_summary,
            "model_name": settings.OPENAI_MODEL or "AI"
        }
    }
    yield json.dumps(final_data) + "\n"
