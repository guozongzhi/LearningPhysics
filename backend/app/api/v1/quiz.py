from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.quiz import (
    QuizGenerateRequest, 
    QuizGenerateResponse,
    QuizSubmitRequest,
    QuizSubmitResponse
)
from app.services import quiz_service

router = APIRouter()

@router.post(
    "/generate",
    response_model=QuizGenerateResponse,
    summary="Generate a new Quiz",
    description="Creates a new quiz with a specified number of questions based on selected topics.",
)
async def generate_quiz_endpoint(
    request: QuizGenerateRequest,
    db: AsyncSession = Depends(get_session),
):
    """
    Endpoint to generate a new quiz.
    - **topic_ids**: List of knowledge node IDs to source questions from.
    - **difficulty_preference**: How to select difficulty (currently ignored, defaults to adaptive).
    - **count**: The number of questions to include in the quiz.
    """
    quiz_data = await quiz_service.generate_quiz(db=db, request_data=request)
    return quiz_data

@router.post(
    "/submit",
    response_model=QuizSubmitResponse,
    summary="Submit a quiz for grading and analysis",
    description="Grades the submitted answers, provides AI-powered feedback for incorrect ones, and saves the record.",
)
async def submit_quiz_endpoint(
    request: QuizSubmitRequest,
    db: AsyncSession = Depends(get_session),
):
    """
    Endpoint to submit a quiz for grading.
    - **quiz_id**: The ID of the quiz being submitted.
    - **answers**: A list of student answers for each question.
    """
    analysis_data = await quiz_service.submit_quiz(db=db, request_data=request)
    return analysis_data
