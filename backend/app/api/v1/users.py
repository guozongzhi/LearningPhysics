from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.models import User
from app.schemas.documents import CollaboratorCandidateResponse

router = APIRouter()


@router.get("/collaborators", response_model=List[CollaboratorCandidateResponse], summary="获取协作者候选列表")
async def list_collaborator_candidates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(User)
        .where(User.is_admin == False, User.id != current_user.id)
        .order_by(User.username)
    )
    users = result.scalars().all()
    return [CollaboratorCandidateResponse(id=user.id, username=user.username) for user in users]
