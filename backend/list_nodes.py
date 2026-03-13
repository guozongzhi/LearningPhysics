
import asyncio
from sqlmodel import select
from app.db.session import async_session_factory
from app.models.models import KnowledgeNode

async def list_all():
    async with async_session_factory() as db:
        result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.level == 1))
        nodes = result.scalars().all()
        print(f"Total Level 1 nodes: {len(nodes)}")
        for node in nodes:
            print(f"ID: {node.id}, Code: {node.code}, Name: '{node.name}', Desc: {node.description}")

if __name__ == "__main__":
    asyncio.run(list_all())
