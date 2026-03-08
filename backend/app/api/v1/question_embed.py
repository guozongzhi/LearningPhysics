from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from uuid import UUID

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.models import Question, User

router = APIRouter()


class QuestionEmbedResponse:
    pass


from pydantic import BaseModel
from typing import Optional, Any, Dict


class QuestionEmbedResponse(BaseModel):
    id: UUID
    content_latex: str
    question_type: str
    difficulty: int
    answer_schema: Dict[str, Any]
    solution_steps: str
    image_url: Optional[str] = None
    primary_node_id: int


@router.get(
    "/{question_id}/embed",
    response_model=QuestionEmbedResponse,
    summary="获取题目嵌入信息",
)
async def get_question_embed(
    question_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    return QuestionEmbedResponse(
        id=question.id,
        content_latex=question.content_latex,
        question_type=question.question_type,
        difficulty=question.difficulty,
        answer_schema=question.answer_schema,
        solution_steps=question.solution_steps,
        image_url=question.image_url,
        primary_node_id=question.primary_node_id,
    )


@router.get(
    "/by-nodes",
    response_model=List[QuestionEmbedResponse],
    summary="根据知识点获取题目列表",
)
async def get_questions_by_nodes(
    node_ids: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get questions by comma-separated node IDs. E.g. ?node_ids=1,2,3"""
    try:
        ids = [int(x.strip()) for x in node_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid node_ids format")

    if not ids:
        return []

    result = await db.execute(
        select(Question)
        .where(Question.primary_node_id.in_(ids))
        .order_by(Question.difficulty, Question.question_type)
    )
    questions = result.scalars().all()

    return [
        QuestionEmbedResponse(
            id=q.id,
            content_latex=q.content_latex,
            question_type=q.question_type,
            difficulty=q.difficulty,
            answer_schema=q.answer_schema,
            solution_steps=q.solution_steps,
            image_url=q.image_url,
            primary_node_id=q.primary_node_id,
        )
        for q in questions
    ]
