from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models.models import KnowledgeNode
from app.core.logging_config import api_logger

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
    api_logger.debug("获取主题列表请求")
    try:
        result = await db.execute(select(KnowledgeNode).order_by(KnowledgeNode.level, KnowledgeNode.name))
        nodes = result.scalars().all()
        api_logger.debug(f"主题列表获取成功 - 总计 {len(nodes)} 个主题")
        return nodes
    except Exception as e:
        api_logger.error(f"主题列表获取失败 - 错误: {str(e)}")
        raise
