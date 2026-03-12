
import asyncio
import json
from sqlmodel import select
from app.db.session import async_session_factory
from app.models.models import TopicDocument, TopicDocumentNode, TopicDocumentCollaborator, Media

async def export_all():
    async with async_session_factory() as session:
        # Documents
        doc_stmt = select(TopicDocument)
        docs = (await session.execute(doc_stmt)).scalars().all()
        
        # Nodes
        node_stmt = select(TopicDocumentNode)
        nodes = (await session.execute(node_stmt)).scalars().all()
        
        # Collaborators
        coll_stmt = select(TopicDocumentCollaborator)
        colls = (await session.execute(coll_stmt)).scalars().all()
        
        # Media (We'll export all media for simplicity if it's small)
        media_stmt = select(Media)
        media_list = (await session.execute(media_stmt)).scalars().all()
        
        data = {
            "topic_documents": [doc.model_dump(mode='json') for doc in docs],
            "topic_document_nodes": [n.model_dump(mode='json') for n in nodes],
            "topic_document_collaborators": [c.model_dump(mode='json') for c in colls],
            "media": [{
                "id": str(m.id),
                "filename": m.filename,
                "content_type": m.content_type,
                "data_hex": m.data.hex(), # Convert bytes to hex for JSON
                "owner_id": str(m.owner_id),
                "created_at": m.created_at.isoformat()
            } for m in media_list]
        }
        
        with open("../data/exported_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Exported {len(docs)} docs, {len(nodes)} node links, {len(colls)} collaborators, and {len(media_list)} media files.")

if __name__ == "__main__":
    asyncio.run(export_all())
