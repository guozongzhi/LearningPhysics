
import asyncio
from sqlmodel import select
from app.db.session import async_session_factory
from app.models.models import KnowledgeNode, Question

async def inspect():
    async with async_session_factory() as db:
        result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.name == "电磁学"))
        nodes = result.scalars().all()
        print(f"Found {len(nodes)} Electromagnetism nodes:")
        for node in nodes:
            q_result = await db.execute(select(Question).where(Question.primary_node_id == node.id))
            q_count = len(q_result.scalars().all())
            print(f"ID: {node.id}, Code: {node.code}, Name: {node.name}, QCount: {q_count}, Desc: {node.description}")

if __name__ == "__main__":
    asyncio.run(inspect())
