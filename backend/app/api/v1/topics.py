from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models.models import KnowledgeNode, Question
from app.core.logging_config import api_logger

router = APIRouter()


class TopicResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    level: int
    question_count: int = 0

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
        # Query topics with their question counts
        query = (
            select(KnowledgeNode, func.count(Question.id).label("question_count"))
            .outerjoin(Question, KnowledgeNode.id == Question.primary_node_id)
            .group_by(KnowledgeNode.id)
            .order_by(KnowledgeNode.level, KnowledgeNode.name)
        )
        result = await db.execute(query)
        
        topics_data = []
        for node, count in result.all():
            topic_dict = node.model_dump()
            topic_dict["question_count"] = count
            topics_data.append(topic_dict)
            
        api_logger.debug(f"主题列表获取成功 - 总计 {len(topics_data)} 个主题")
        return topics_data
    except Exception as e:
        api_logger.error(f"主题列表获取失败 - 错误: {str(e)}")
        raise
