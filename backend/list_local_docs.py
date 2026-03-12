
import asyncio
import json
from sqlmodel import select
from app.db.session import async_session_factory
from app.models.models import TopicDocument

async def list_docs():
    async with async_session_factory() as session:
        statement = select(TopicDocument)
        results = await session.execute(statement)
        docs = results.scalars().all()
        
        output = []
        for doc in docs:
            output.append({
                "id": str(doc.id),
                "title": doc.title,
                "summary": doc.summary,
                "owner_id": str(doc.owner_id),
                "is_template": doc.is_template,
                "created_at": doc.created_at.isoformat()
            })
        print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(list_docs())
