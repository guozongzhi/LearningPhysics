import asyncio
from sqlalchemy import select
from app.db.session import async_session_factory
from app.models.models import KnowledgeNode

async def main():
    async with async_session_factory() as session:
        result = await session.execute(select(KnowledgeNode))
        nodes = result.scalars().all()
        for n in nodes:
            print(f"ID: {n.id}, Name: {n.name}, Code: {n.code}")

if __name__ == "__main__":
    asyncio.run(main())
