from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_session
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizSubmitRequest,
    QuizSubmitResponse
)
from app.services import quiz_service
from app.models.models import User, ExamRecord
from app.core.auth import get_current_user
from app.core.logging_config import api_logger
from sqlmodel import select, func

router = APIRouter()

@router.post(
    "/generate",
    response_model=QuizGenerateResponse,
    summary="Generate a new Quiz",
    description="Creates a new quiz with a specified number of questions based on selected topics.",
)
async def generate_quiz_endpoint(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Endpoint to generate a new quiz.
    - **topic_ids**: List of knowledge node IDs to source questions from.
    - **difficulty_preference**: How to select difficulty (currently ignored, defaults to adaptive).
    - **count**: The number of questions to include in the quiz.
    """
    api_logger.debug(f"生成测验请求 - 用户: {current_user.username}, 题目数: {request.count}, 主题数: {len(request.topic_ids)}")
    try:
        # Add the current user's ID to the request data
        quiz_data = await quiz_service.generate_quiz(db=db, request_data=request, user_id=current_user.id)
        api_logger.debug(f"测验生成成功 - 用户: {current_user.username}, 测验ID: {quiz_data.get('quiz_id')}")
        return quiz_data
    except Exception as e:
        api_logger.error(f"测验生成失败 - 用户: {current_user.username}, 错误: {str(e)}")
        raise

@router.post(
    "/submit",
    response_model=QuizSubmitResponse,
    summary="Submit a quiz for grading and analysis",
    description="Grades the submitted answers, provides AI-powered feedback for incorrect ones, and saves the record.",
)
async def submit_quiz_endpoint(
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Endpoint to submit a quiz for grading.
    - **quiz_id**: The ID of the quiz being submitted.
    - **answers**: A list of student answers for each question.
    """
    api_logger.debug(f"测验提交请求 - 用户: {current_user.username}, 测验ID: {request.quiz_id}, 答案数: {len(request.answers)}")
    try:
        # Pass the current user's ID to the service layer
        analysis_data = await quiz_service.submit_quiz(db=db, request_data=request, user_id=current_user.id)
        api_logger.debug(f"测验提交成功 - 用户: {current_user.username}, 测验ID: {request.quiz_id}")
        return analysis_data
    except Exception as e:
        api_logger.error(f"测验提交失败 - 用户: {current_user.username}, 测验ID: {request.quiz_id}, 错误: {str(e)}")
        raise

@router.get(
    "/last",
    summary="Get the timestamp of the user's last quiz",
    description="Retrieves the created_at timestamp of the most recent ExamRecord for the current user.",
)
async def get_last_quiz_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Returns the time the user last took a quiz.
    """
    query = select(func.max(ExamRecord.created_at)).where(ExamRecord.user_id == current_user.id)
    result = await db.execute(query)
    last_taken = result.scalar()
    return {"last_quiz_at": last_taken.isoformat() if last_taken else None}
