import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import TopicDocument, TopicDocumentCollaborator, TopicDocumentNode
from app.schemas.documents import DocumentCreateRequest, DocumentUpdateRequest


async def get_user_documents(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_archived: bool = False
) -> List[TopicDocument]:
    """Get all documents owned by or shared with a user."""
    # Get owned documents
    owned_query = select(TopicDocument).where(TopicDocument.owner_id == user_id)
    if not include_archived:
        owned_query = owned_query.where(TopicDocument.is_archived == False)

    owned_result = await db.execute(owned_query)
    owned_docs = owned_result.scalars().all()

    # Get shared documents (as collaborator)
    shared_query = (
        select(TopicDocument)
        .join(TopicDocumentCollaborator)
        .where(TopicDocumentCollaborator.user_id == user_id)
    )
    if not include_archived:
        shared_query = shared_query.where(TopicDocument.is_archived == False)

    shared_result = await db.execute(shared_query)
    shared_docs = shared_result.scalars().all()

    # Combine and deduplicate
    all_docs = {doc.id: doc for doc in owned_docs + shared_docs}
    return list(all_docs.values())


async def get_document_by_id(
    db: AsyncSession,
    document_id: uuid.UUID
) -> Optional[TopicDocument]:
    """Get a document by ID."""
    result = await db.execute(
        select(TopicDocument).where(TopicDocument.id == document_id)
    )
    return result.scalar_one_or_none()


async def has_document_access(
    db: AsyncSession,
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    required_role: str = "viewer"
) -> bool:
    """Check if a user has access to a document with the required role."""
    doc = await get_document_by_id(db, document_id)
    if not doc:
        return False

    # Owner has full access
    if doc.owner_id == user_id:
        return True

    # Check collaborator role
    result = await db.execute(
        select(TopicDocumentCollaborator)
        .where(TopicDocumentCollaborator.document_id == document_id)
        .where(TopicDocumentCollaborator.user_id == user_id)
    )
    collaborator = result.scalar_one_or_none()

    if not collaborator:
        # Public documents can be viewed by anyone
        if required_role == "viewer" and doc.visibility == "public":
            return True
        return False

    # Role hierarchy: owner > editor > viewer
    role_hierarchy = {"viewer": 1, "editor": 2, "owner": 3}
    return role_hierarchy.get(collaborator.role, 0) >= role_hierarchy.get(required_role, 0)


async def create_document(
    db: AsyncSession,
    doc_in: DocumentCreateRequest,
    owner_id: uuid.UUID
) -> TopicDocument:
    """Create a new document."""
    doc = TopicDocument(
        **doc_in.dict(),
        owner_id=owner_id
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Add associated knowledge nodes if provided
    if doc_in.node_ids:
        for node_id in doc_in.node_ids:
            doc_node = TopicDocumentNode(
                document_id=doc.id,
                node_id=node_id
            )
            db.add(doc_node)
        await db.commit()
        await db.refresh(doc)

    return doc


async def update_document(
    db: AsyncSession,
    doc: TopicDocument,
    doc_in: DocumentUpdateRequest
) -> TopicDocument:
    """Update a document."""
    update_data = doc_in.dict(exclude_unset=True)
    node_ids = update_data.pop("node_ids", None)

    for field, value in update_data.items():
        setattr(doc, field, value)

    db.add(doc)

    # Update associated knowledge nodes if provided
    if node_ids is not None:
        # Delete existing associations
        await db.execute(
            TopicDocumentNode.__table__.delete()
            .where(TopicDocumentNode.document_id == doc.id)
        )
        # Add new associations
        for node_id in node_ids:
            doc_node = TopicDocumentNode(
                document_id=doc.id,
                node_id=node_id
            )
            db.add(doc_node)

    await db.commit()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, doc: TopicDocument) -> bool:
    """Delete a document."""
    await db.delete(doc)
    await db.commit()
    return True


async def add_collaborator(
    db: AsyncSession,
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    role: str = "viewer"
) -> TopicDocumentCollaborator:
    """Add a collaborator to a document."""
    collaborator = TopicDocumentCollaborator(
        document_id=document_id,
        user_id=user_id,
        role=role
    )
    db.add(collaborator)
    await db.commit()
    await db.refresh(collaborator)
    return collaborator


async def remove_collaborator(
    db: AsyncSession,
    document_id: uuid.UUID,
    user_id: uuid.UUID
) -> bool:
    """Remove a collaborator from a document."""
    result = await db.execute(
        select(TopicDocumentCollaborator)
        .where(TopicDocumentCollaborator.document_id == document_id)
        .where(TopicDocumentCollaborator.user_id == user_id)
    )
    collaborator = result.scalar_one_or_none()

    if collaborator:
        await db.delete(collaborator)
        await db.commit()
        return True
    return False


async def get_document_collaborators(
    db: AsyncSession,
    document_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """Get all collaborators of a document."""
    result = await db.execute(
        select(TopicDocumentCollaborator, User)
        .join(User, TopicDocumentCollaborator.user_id == User.id)
        .where(TopicDocumentCollaborator.document_id == document_id)
    )
    records = result.all()

    return [
        {
            "user_id": str(record.User.id),
            "username": record.User.username,
            "email": record.User.email,
            "role": record.TopicDocumentCollaborator.role,
            "invited_at": record.TopicDocumentCollaborator.invited_at
        }
        for record in records
    ]

# Import User model at the end to avoid circular imports
from app.models.models import User