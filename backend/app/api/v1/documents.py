from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.models import (
    KnowledgeNode,
    TopicDocument,
    TopicDocumentCollaborator,
    TopicDocumentNode,
    TopicDocumentVersion,
    User,
)
from app.schemas.documents import (
    DocumentCollaboratorCreateRequest,
    DocumentCollaboratorResponse,
    DocumentCollaboratorUpdateRequest,
    DocumentCreateRequest,
    DocumentDetailResponse,
    DocumentListItemResponse,
    DocumentRole,
    DocumentUpdateRequest,
    DocumentVersionResponse,
    DocumentVisibility,
)

router = APIRouter()

CHINA_TZ = timezone(timedelta(hours=8))


def now_cn() -> datetime:
    return datetime.now(CHINA_TZ).replace(tzinfo=None)


async def _get_document_or_404(db: AsyncSession, document_id: UUID) -> TopicDocument:
    document = await db.get(TopicDocument, document_id)
    if document is None or document.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


async def _get_user_map(db: AsyncSession, user_ids: Iterable[UUID]) -> dict[UUID, User]:
    user_ids = list(set(user_ids))
    if not user_ids:
        return {}
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = result.scalars().all()
    return {user.id: user for user in users}


async def _ensure_node_ids_exist(db: AsyncSession, node_ids: List[int]) -> None:
    if not node_ids:
        return
    result = await db.execute(select(KnowledgeNode.id).where(KnowledgeNode.id.in_(node_ids)))
    existing_ids = set(result.scalars().all())
    missing_ids = sorted(set(node_ids) - existing_ids)
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Knowledge nodes not found: {', '.join(str(node_id) for node_id in missing_ids)}",
        )


async def _get_collaborators(db: AsyncSession, document_id: UUID) -> list[TopicDocumentCollaborator]:
    result = await db.execute(
        select(TopicDocumentCollaborator).where(TopicDocumentCollaborator.document_id == document_id)
    )
    return list(result.scalars().all())


async def _get_node_ids(db: AsyncSession, document_id: UUID) -> list[int]:
    result = await db.execute(
        select(TopicDocumentNode.node_id)
        .where(TopicDocumentNode.document_id == document_id)
        .order_by(TopicDocumentNode.node_id)
    )
    return list(result.scalars().all())


async def _get_versions(db: AsyncSession, document_id: UUID) -> list[TopicDocumentVersion]:
    result = await db.execute(
        select(TopicDocumentVersion)
        .where(TopicDocumentVersion.document_id == document_id)
        .order_by(TopicDocumentVersion.version_no.desc())
    )
    return list(result.scalars().all())

async def _get_role_for_user(
    db: AsyncSession, document: TopicDocument, current_user: User
) -> Optional[DocumentRole]:
    if current_user.is_admin:
        return DocumentRole.OWNER

    if document.owner_id == current_user.id:
        return DocumentRole.OWNER

    result = await db.execute(
        select(TopicDocumentCollaborator).where(
            and_(
                TopicDocumentCollaborator.document_id == document.id,
                TopicDocumentCollaborator.user_id == current_user.id,
            )
        )
    )
    collaborator = result.scalar_one_or_none()
    if collaborator is not None:
        return DocumentRole(collaborator.role)

    if document.visibility == DocumentVisibility.PUBLIC.value:
        return DocumentRole.EDITOR

    return None


async def _require_read_access(db: AsyncSession, document: TopicDocument, current_user: User) -> DocumentRole:
    role = await _get_role_for_user(db, document, current_user)
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Document access denied")
    return role


async def _require_owner(db: AsyncSession, document: TopicDocument, current_user: User) -> None:
    role = await _require_read_access(db, document, current_user)
    if role != DocumentRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")


async def _require_edit_access(db: AsyncSession, document: TopicDocument, current_user: User) -> DocumentRole:
    role = await _require_read_access(db, document, current_user)
    if role not in {DocumentRole.OWNER, DocumentRole.EDITOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit access required")
    return role


async def _sync_document_nodes(db: AsyncSession, document_id: UUID, node_ids: List[int]) -> None:
    await db.execute(delete(TopicDocumentNode).where(TopicDocumentNode.document_id == document_id))
    for node_id in node_ids:
        db.add(TopicDocumentNode(document_id=document_id, node_id=node_id))


async def _create_document_version(
    db: AsyncSession,
    document: TopicDocument,
    edited_by: UUID,
) -> TopicDocumentVersion:
    result = await db.execute(
        select(TopicDocumentVersion.version_no)
        .where(TopicDocumentVersion.document_id == document.id)
        .order_by(TopicDocumentVersion.version_no.desc())
    )
    latest_version = result.scalars().first()
    next_version_no = (latest_version or 0) + 1

    version = TopicDocumentVersion(
        document_id=document.id,
        version_no=next_version_no,
        title=document.title,
        content_markdown=document.content_markdown,
        content_blocks=document.content_blocks,
        whiteboard_data=document.whiteboard_data,
        edited_by=edited_by,
        created_at=document.updated_at,
    )
    db.add(version)
    await db.flush()
    return version


async def _serialize_document(
    db: AsyncSession,
    document: TopicDocument,
    current_user_role: DocumentRole,
) -> DocumentDetailResponse:
    node_ids = await _get_node_ids(db, document.id)
    collaborators = await _get_collaborators(db, document.id)
    versions = await _get_versions(db, document.id)
    user_ids = [document.owner_id, *(collaborator.user_id for collaborator in collaborators), *(version.edited_by for version in versions)]
    users_by_id = await _get_user_map(db, user_ids)

    owner = users_by_id.get(document.owner_id)
    collaborator_responses = [
        DocumentCollaboratorResponse(
            user_id=collaborator.user_id,
            username=users_by_id.get(collaborator.user_id).username if users_by_id.get(collaborator.user_id) else "unknown",
            role=DocumentRole(collaborator.role),
        )
        for collaborator in sorted(
            collaborators,
            key=lambda item: (0 if item.role == DocumentRole.OWNER.value else 1, users_by_id.get(item.user_id).username if users_by_id.get(item.user_id) else ""),
        )
    ]
    version_responses = [
        DocumentVersionResponse(
            id=version.id,
            version_no=version.version_no,
            edited_by=users_by_id.get(version.edited_by).username if users_by_id.get(version.edited_by) else "unknown",
            title=version.title,
            content_markdown=version.content_markdown,
            content_blocks=version.content_blocks,
            whiteboard_data=version.whiteboard_data,
            created_at=version.created_at,
        )
        for version in versions
    ]

    return DocumentDetailResponse(
        id=document.id,
        title=document.title,
        summary=document.summary,
        visibility=DocumentVisibility(document.visibility),
        owner_id=document.owner_id,
        owner_username=owner.username if owner else "unknown",
        updated_at=document.updated_at,
        node_ids=node_ids,
        collaborator_count=len(collaborator_responses),
        content_markdown=document.content_markdown,
        content_blocks=document.content_blocks,
        whiteboard_data=document.whiteboard_data,
        current_user_role=current_user_role,
        collaborators=collaborator_responses,
        versions=version_responses,
        is_template=document.is_template,
    )


async def _serialize_list_item(
    db: AsyncSession,
    document: TopicDocument,
) -> DocumentListItemResponse:
    node_ids = await _get_node_ids(db, document.id)
    collaborators = await _get_collaborators(db, document.id)
    
    # Needs all users
    user_ids = [document.owner_id, *(c.user_id for c in collaborators)]
    users_by_id = await _get_user_map(db, user_ids)
    owner = users_by_id.get(document.owner_id)

    collab_responses = [
        DocumentCollaboratorResponse(
            user_id=c.user_id,
            username=users_by_id.get(c.user_id).username if users_by_id.get(c.user_id) else "unknown",
            role=DocumentRole(c.role),
        )
        for c in sorted(
            collaborators,
            key=lambda item: (0 if item.role == DocumentRole.OWNER.value else 1, users_by_id.get(item.user_id).username if users_by_id.get(item.user_id) else ""),
        )
    ]

    return DocumentListItemResponse(
        id=document.id,
        title=document.title,
        summary=document.summary,
        visibility=DocumentVisibility(document.visibility),
        owner_id=document.owner_id,
        owner_username=owner.username if owner else "unknown",
        updated_at=document.updated_at,
        node_ids=node_ids,
        collaborator_count=len(collab_responses),
        collaborators=collab_responses,
        is_template=document.is_template,
    )


@router.get("", response_model=List[DocumentListItemResponse], summary="获取主题文档列表")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(TopicDocument)
        .outerjoin(
            TopicDocumentCollaborator,
            and_(
                TopicDocumentCollaborator.document_id == TopicDocument.id,
                TopicDocumentCollaborator.user_id == current_user.id,
            ),
        )
        .where(
            TopicDocument.is_archived.is_(False),
            or_(
                TopicDocument.owner_id == current_user.id,
                TopicDocumentCollaborator.user_id.is_not(None),
                TopicDocument.visibility == DocumentVisibility.PUBLIC.value,
            ),
        )
        .distinct()
        .order_by(TopicDocument.updated_at.desc())
    )
    documents = result.scalars().all()
    return [await _serialize_list_item(db, document) for document in documents]


@router.post("", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED, summary="创建主题文档")
async def create_document(
    payload: DocumentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await _ensure_node_ids_exist(db, payload.node_ids)

    timestamp = now_cn()
    document = TopicDocument(
        title=payload.title,
        summary=payload.summary,
        content_markdown=payload.content_markdown,
        content_blocks=payload.content_blocks,
        whiteboard_data=payload.whiteboard_data,
        owner_id=current_user.id,
        visibility=payload.visibility.value,
        created_at=timestamp,
        updated_at=timestamp,
    )
    db.add(document)
    await db.flush()

    db.add(
        TopicDocumentCollaborator(
            document_id=document.id,
            user_id=current_user.id,
            role=DocumentRole.OWNER.value,
            invited_at=timestamp,
        )
    )

    if payload.collaborator_usernames:
        for username in payload.collaborator_usernames:
            user_res = await db.execute(select(User).where(User.username == username))
            u = user_res.scalar_one_or_none()
            if u and u.id != current_user.id:
                db.add(
                    TopicDocumentCollaborator(
                        document_id=document.id,
                        user_id=u.id,
                        role=DocumentRole.EDITOR.value,
                        invited_at=timestamp,
                    )
                )

    await _sync_document_nodes(db, document.id, payload.node_ids)
    await _create_document_version(db, document, current_user.id)
    await db.commit()

    return await _serialize_document(db, document, DocumentRole.OWNER)


@router.get("/{document_id}", response_model=DocumentDetailResponse, summary="获取主题文档详情")
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    document = await _get_document_or_404(db, document_id)
    role = await _require_read_access(db, document, current_user)
    return await _serialize_document(db, document, role)


@router.put("/{document_id}", response_model=DocumentDetailResponse, summary="更新主题文档")
async def update_document(
    document_id: UUID,
    payload: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    document = await _get_document_or_404(db, document_id)
    role = await _require_edit_access(db, document, current_user)

    if payload.base_updated_at is not None and document.updated_at != payload.base_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document has been updated by another user. Please refresh and try again.",
        )

    next_node_ids = payload.node_ids if payload.node_ids is not None else await _get_node_ids(db, document.id)
    await _ensure_node_ids_exist(db, next_node_ids)

    if payload.title is not None:
        document.title = payload.title
    if payload.summary is not None:
        document.summary = payload.summary
    if payload.content_markdown is not None:
        document.content_markdown = payload.content_markdown
    if payload.content_blocks is not None:
        document.content_blocks = payload.content_blocks
    if payload.whiteboard_data is not None:
        document.whiteboard_data = payload.whiteboard_data
    if payload.visibility is not None:
        document.visibility = payload.visibility.value
    document.updated_at = now_cn()

    if payload.node_ids is not None:
        await _sync_document_nodes(db, document.id, payload.node_ids)

    db.add(document)
    await _create_document_version(db, document, current_user.id)
    await db.commit()

    return await _serialize_document(db, document, role)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除主题文档")
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    document = await _get_document_or_404(db, document_id)
    await _require_owner(db, document, current_user)

    await db.execute(delete(TopicDocumentNode).where(TopicDocumentNode.document_id == document.id))
    await db.execute(delete(TopicDocumentCollaborator).where(TopicDocumentCollaborator.document_id == document.id))
    await db.execute(delete(TopicDocumentVersion).where(TopicDocumentVersion.document_id == document.id))
    await db.delete(document)
    await db.commit()


@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse], summary="获取主题文档版本")
async def list_document_versions(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    document = await _get_document_or_404(db, document_id)
    await _require_read_access(db, document, current_user)
    detail = await _serialize_document(db, document, await _get_role_for_user(db, document, current_user) or DocumentRole.VIEWER)
    return detail.versions


@router.post(
    "/{document_id}/collaborators",
    response_model=DocumentDetailResponse,
    summary="添加主题文档协作者",
)
async def add_document_collaborator(
    document_id: UUID,
    payload: DocumentCollaboratorCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if payload.role == DocumentRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign owner role")

    document = await _get_document_or_404(db, document_id)
    await _require_edit_access(db, document, current_user)

    result = await db.execute(
        select(User).where(and_(User.username == payload.username, User.is_admin == False))
    )
    target_user = result.scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.id == document.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner is already a collaborator")

    existing = await db.execute(
        select(TopicDocumentCollaborator).where(
            and_(
                TopicDocumentCollaborator.document_id == document.id,
                TopicDocumentCollaborator.user_id == target_user.id,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collaborator already exists")

    db.add(
        TopicDocumentCollaborator(
            document_id=document.id,
            user_id=target_user.id,
            role=payload.role.value,
            invited_at=now_cn(),
        )
    )
    await db.commit()
    return await _serialize_document(db, document, DocumentRole.OWNER)


@router.put(
    "/{document_id}/collaborators/{user_id}",
    response_model=DocumentDetailResponse,
    summary="更新主题文档协作者角色",
)
async def update_document_collaborator(
    document_id: UUID,
    user_id: UUID,
    payload: DocumentCollaboratorUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if payload.role == DocumentRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign owner role")

    document = await _get_document_or_404(db, document_id)
    await _require_edit_access(db, document, current_user)

    if user_id == document.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify owner role")

    result = await db.execute(
        select(TopicDocumentCollaborator).where(
            and_(
                TopicDocumentCollaborator.document_id == document.id,
                TopicDocumentCollaborator.user_id == user_id,
            )
        )
    )
    collaborator = result.scalar_one_or_none()
    if collaborator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")

    collaborator.role = payload.role.value
    db.add(collaborator)
    await db.commit()
    return await _serialize_document(db, document, DocumentRole.OWNER)


@router.delete(
    "/{document_id}/collaborators/{user_id}",
    response_model=DocumentDetailResponse,
    summary="移除主题文档协作者",
)
async def delete_document_collaborator(
    document_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    document = await _get_document_or_404(db, document_id)
    await _require_edit_access(db, document, current_user)

    if user_id == document.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove owner")

    result = await db.execute(
        select(TopicDocumentCollaborator).where(
            and_(
                TopicDocumentCollaborator.document_id == document.id,
                TopicDocumentCollaborator.user_id == user_id,
            )
        )
    )
    collaborator = result.scalar_one_or_none()
    if collaborator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")

    await db.delete(collaborator)
    await db.commit()
    return await _serialize_document(db, document, DocumentRole.OWNER)


@router.post(
    "/{document_id}/versions/{version_id}/restore",
    response_model=DocumentDetailResponse,
    summary="恢复主题文档历史版本",
)
async def restore_document_version(
    document_id: UUID,
    version_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    document = await _get_document_or_404(db, document_id)
    await _require_edit_access(db, document, current_user)

    result = await db.execute(
        select(TopicDocumentVersion).where(
            and_(
                TopicDocumentVersion.id == version_id,
                TopicDocumentVersion.document_id == document.id,
            )
        )
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    document.title = version.title
    document.content_markdown = version.content_markdown
    document.content_blocks = version.content_blocks
    document.whiteboard_data = version.whiteboard_data
    document.updated_at = now_cn()
    db.add(document)
    await _create_document_version(db, document, current_user.id)
    await db.commit()
    return await _serialize_document(db, document, DocumentRole.OWNER)
