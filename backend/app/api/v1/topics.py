from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models.models import KnowledgeNode

router = APIRouter()


class TopicResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    level: int

    class Config:
        from_attributes = True


@router.get(
    "",
    response_model=List[TopicResponse],
    summary="List all available topics",
    description="Returns all knowledge nodes that can be used as quiz topics. No authentication required.",
)
async def list_topics(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(KnowledgeNode).order_by(KnowledgeNode.level, KnowledgeNode.name))
    nodes = result.scalars().all()
    return nodes
