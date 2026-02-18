import uuid
import json
import re
from typing import List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import openai

from app.models.models import Question, ExamRecord
from app.schemas.quiz import QuizGenerateRequest, QuizSubmitRequest, StudentAnswer, AnalysisResult
from app.core.config import settings

# --- OpenAI Client Setup ---
client = None
if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "YOUR_OPENAI_API_KEY":
    client = openai.AsyncClient(api_key=settings.OPENAI_API_KEY)

EMBEDDING_MODEL = "text-embedding-3-small"
ANALYSIS_MODEL = "gpt-4-turbo-preview"


async def generate_quiz(
    db: AsyncSession, request_data: QuizGenerateRequest
) -> Dict[str, Any]:
    """
    Service layer function to generate a quiz based on user request.
    """
    query = (
        select(Question)
        .where(Question.primary_node_id.in_(request_data.topic_ids))
        .limit(request_data.count)
    )
    
    result = await db.execute(query)
    questions = result.scalars().all()

    new_quiz_id = uuid.uuid4()
    return {"quiz_id": new_quiz_id, "questions": questions}


# --- Quiz Submission and Analysis Logic ---

def _evaluate_answer(student_input: str, answer_schema: Dict[str, Any]) -> bool:
    """A simple evaluator for student answers."""
    schema_type = answer_schema.get("type")
    if schema_type == "value_unit":
        try:
            # Extract the first number found in the student's input
            student_value_match = re.search(r'[-+]?\d*\.\d+|\d+', student_input)
            if not student_value_match:
                return False
            student_value = float(student_value_match.group())
            
            correct_value = float(answer_schema["correct_value"])
            tolerance = float(answer_schema.get("tolerance", 0.01))
            
            # Check value within tolerance
            if not (correct_value - tolerance <= student_value <= correct_value + tolerance):
                return False
                
            # Check unit (case-insensitive, basic matching)
            correct_unit = answer_schema["unit"]
            # A simple check if the unit string is present
            if correct_unit.lower() not in student_input.lower():
                # Allow for some flexibility, e.g. m/s^2 vs m/s2
                normalized_input = student_input.replace("^", "").lower()
                normalized_unit = correct_unit.replace("^", "").lower()
                if normalized_unit not in normalized_input:
                    return False
            
            return True
        except (ValueError, TypeError):
            return False
    return False


async def _get_ai_feedback(question: Question, student_answer: StudentAnswer) -> AnalysisResult:
    """Generates feedback for an incorrect answer using an LLM."""
    if not client:
        return AnalysisResult(
            is_correct=False,
            feedback="AI analysis is not configured. Please check the server's OpenAI API key.",
            error_tag="CONFIG_ERROR"
        )

    prompt = f"""
You are an expert high school physics tutor. Your task is to analyze a student's incorrect answer and provide concise, helpful feedback.

The user was asked the following question:
--- QUESTION ---
{question.content_latex}

The correct answer is:
--- CORRECT ANSWER ---
Value: {question.answer_schema.get('correct_value')}
Unit: {question.answer_schema.get('unit')}

The student provided the following answer:
--- STUDENT'S ANSWER ---
{student_answer.student_input}

--- YOUR ANALYSIS ---
1.  **Analyze the error:** Is the value wrong? Is the unit wrong? Is there a conceptual misunderstanding?
2.  **Provide Feedback:** Write a short, encouraging feedback message (1-2 sentences) in Chinese that explains the mistake.
3.  **Categorize the Error:** Classify the error into ONE of the following categories: [VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR].

Respond with a valid JSON object with two keys: "feedback" and "error_tag". Do not include any other text, explanation, or markdown formatting in your response.
Example JSON:
{{"feedback": "你的计算结果基本正确，但是单位弄错了，加速度的单位应该是 m/s²。", "error_tag": "UNIT_ERROR"}}
"""

    try:
        response = await client.chat.completions.create(
            model=ANALYSIS_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        analysis_json = json.loads(response.choices[0].message.content)
        return AnalysisResult(is_correct=False, **analysis_json)
    except Exception as e:
        print(f"Error calling OpenAI for feedback: {e}")
        return AnalysisResult(
            is_correct=False,
            feedback="There was an error generating AI feedback.",
            error_tag="AI_ERROR"
        )


async def submit_quiz(db: AsyncSession, request_data: QuizSubmitRequest) -> Dict[str, Any]:
    """
    Service layer function to grade a submitted quiz and provide feedback.
    """
    question_ids = [answer.question_id for answer in request_data.answers]
    query = select(Question).where(Question.id.in_(question_ids))
    result = await db.execute(query)
    questions = {q.id: q for q in result.scalars().all()}

    analysis_results: Dict[uuid.UUID, AnalysisResult] = {}
    correct_count = 0
    
    # Placeholder for a real user ID from an auth system
    user_id_placeholder = uuid.uuid4() 

    for answer in request_data.answers:
        question = questions.get(answer.question_id)
        if not question:
            continue

        is_correct = _evaluate_answer(answer.student_input, question.answer_schema)
        
        if is_correct:
            correct_count += 1
            analysis_results[answer.question_id] = AnalysisResult(
                is_correct=True,
                feedback="回答正确！",
                error_tag="CORRECT"
            )
        else:
            analysis_results[answer.question_id] = await _get_ai_feedback(question, answer)

        # Create and save an exam record
        exam_record = ExamRecord(
            id=uuid.uuid4(),
            user_id=user_id_placeholder,
            question_id=answer.question_id,
            student_input=answer.student_input,
            is_correct=is_correct,
            ai_analysis=analysis_results[answer.question_id].dict()
        )
        db.add(exam_record)

    total_score = (correct_count / len(request_data.answers)) * 100 if request_data.answers else 0
    
    await db.commit()

    return {"total_score": total_score, "analysis": analysis_results}
