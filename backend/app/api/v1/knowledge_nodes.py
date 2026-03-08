from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from app.models.models import KnowledgeNode
from app.db.session import get_session as get_db
from app.core.auth import get_current_user
from app.schemas.knowledge import KnowledgeNodeUpdate

router = APIRouter(tags=["knowledge_nodes"])

@router.patch("/{node_id}", response_model=KnowledgeNode)
async def update_knowledge_node(
    node_id: int,
    payload: KnowledgeNodeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    node = db.exec(select(KnowledgeNode).where(KnowledgeNode.id == node_id)).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge node not found")
    # Permission check removed to allow any authenticated user to edit knowledge nodes
    if payload.name is not None:
        node.name = payload.name
    if payload.description is not None:
        node.description = payload.description
    db.add(node)
    db.commit()
    db.refresh(node)
    return node
