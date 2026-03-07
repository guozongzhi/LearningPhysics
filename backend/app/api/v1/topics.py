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
    parent_id: Optional[int] = None
    level: int
    question_count: int = 0
    difficulty_counts: dict[str, int] = {}

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
        # First query: get all nodes
        nodes_result = await db.execute(select(KnowledgeNode).order_by(KnowledgeNode.level, KnowledgeNode.name))
        nodes = nodes_result.scalars().all()
        
        # Second query: get counts grouped by node and difficulty
        query = (
            select(
                KnowledgeNode.id, 
                Question.difficulty, 
                func.count(Question.id).label("count")
            )
            .join(Question, KnowledgeNode.id == Question.primary_node_id)
            .group_by(KnowledgeNode.id, Question.difficulty)
        )
        counts_result = await db.execute(query)
        
        # Aggregate counts
        difficulty_map = {}
        for node_id, diff, count in counts_result.all():
            if node_id not in difficulty_map:
                difficulty_map[node_id] = {}
            if diff is not None:
                difficulty_map[node_id][str(diff)] = count
                
        topics_data = []
        for node in nodes:
            topic_dict = node.model_dump()
            diff_counts = difficulty_map.get(node.id, {})
            topic_dict["difficulty_counts"] = diff_counts
            topic_dict["question_count"] = sum(diff_counts.values())
            topics_data.append(topic_dict)
            
        api_logger.debug(f"主题列表获取成功 - 总计 {len(topics_data)} 个主题")
        return topics_data
    except Exception as e:
        api_logger.error(f"主题列表获取失败 - 错误: {str(e)}")
        raise
