from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import KnowledgeNode


async def get_all_nodes(db: AsyncSession) -> List[KnowledgeNode]:
    """Get all knowledge nodes."""
    result = await db.execute(
        select(KnowledgeNode)
        .options(selectinload(KnowledgeNode.children))
        .order_by(KnowledgeNode.level, KnowledgeNode.id)
    )
    return result.scalars().all()


async def get_node_by_id(db: AsyncSession, node_id: int) -> Optional[KnowledgeNode]:
    """Get a knowledge node by ID."""
    result = await db.execute(
        select(KnowledgeNode)
        .options(selectinload(KnowledgeNode.children))
        .where(KnowledgeNode.id == node_id)
    )
    return result.scalar_one_or_none()


async def get_node_by_code(db: AsyncSession, code: str) -> Optional[KnowledgeNode]:
    """Get a knowledge node by code."""
    result = await db.execute(
        select(KnowledgeNode)
        .where(KnowledgeNode.code == code)
    )
    return result.scalar_one_or_none()


async def build_knowledge_tree(nodes: List[KnowledgeNode]) -> List[Dict[str, Any]]:
    """Build a hierarchical tree structure from flat knowledge nodes."""
    node_map = {}
    root_nodes = []

    # First pass: create node map with all nodes
    for node in nodes:
        node_dict = node.dict()
        node_dict["children"] = []
        node_map[node.id] = node_dict

    # Second pass: build parent-child relationships
    for node in nodes:
        if node.parent_id is None:
            root_nodes.append(node_map[node.id])
        else:
            parent_node = node_map.get(node.parent_id)
            if parent_node:
                parent_node["children"].append(node_map[node.id])

    return root_nodes


async def get_knowledge_tree(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get the complete knowledge tree."""
    nodes = await get_all_nodes(db)
    return await build_knowledge_tree(nodes)


async def create_node(db: AsyncSession, node_data: Dict[str, Any]) -> KnowledgeNode:
    """Create a new knowledge node."""
    node = KnowledgeNode(**node_data)
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


async def update_node(
    db: AsyncSession,
    node: KnowledgeNode,
    update_data: Dict[str, Any]
) -> KnowledgeNode:
    """Update a knowledge node."""
    for field, value in update_data.items():
        setattr(node, field, value)

    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


async def delete_node(db: AsyncSession, node: KnowledgeNode) -> bool:
    """Delete a knowledge node and reparent its children to its parent."""
    # Get all children of this node
    children_result = await db.execute(
        select(KnowledgeNode)
        .where(KnowledgeNode.parent_id == node.id)
    )
    children = children_result.scalars().all()

    # Reparent children to node's parent
    for child in children:
        child.parent_id = node.parent_id
        db.add(child)
    await db.flush() # Ensure parents are updated before deleting node

    # Delete the node
    await db.delete(node)
    await db.commit()
    return True


async def get_node_children(db: AsyncSession, node_id: int) -> List[KnowledgeNode]:
    """Get all children of a knowledge node."""
    result = await db.execute(
        select(KnowledgeNode)
        .where(KnowledgeNode.parent_id == node_id)
        .order_by(KnowledgeNode.id)
    )
    return result.scalars().all()