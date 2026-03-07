import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlmodel import select

from app.models.models import KnowledgeNode, TopicDocument, TopicDocumentCollaborator, TopicDocumentNode, TopicDocumentVersion, User, get_password_hash
from main import app
from tests.conftest import TestingSessionLocal

pytestmark = pytest.mark.asyncio


async def create_user(username: str, email: str, is_admin: bool = False) -> User:
    async with TestingSessionLocal() as session:
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash("testpass123"),
            is_admin=is_admin,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def login(username: str) -> str:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": username, "password": "testpass123"},
        )
        assert response.status_code == 200, response.text
        return response.json()["access_token"]


@pytest_asyncio.fixture(scope="function")
async def seeded_users(setup_database):
    owner = await create_user("owner_user", "owner@example.com")
    editor = await create_user("editor_user", "editor@example.com")
    viewer = await create_user("viewer_user", "viewer@example.com")
    stranger = await create_user("stranger_user", "stranger@example.com")
    admin = await create_user("admin_user", "admin@example.com", is_admin=True)

    owner_token = await login(owner.username)
    editor_token = await login(editor.username)
    viewer_token = await login(viewer.username)
    stranger_token = await login(stranger.username)

    return {
        "owner": owner,
        "editor": editor,
        "viewer": viewer,
        "stranger": stranger,
        "admin": admin,
        "owner_token": owner_token,
        "editor_token": editor_token,
        "viewer_token": viewer_token,
        "stranger_token": stranger_token,
    }


@pytest_asyncio.fixture(scope="function")
async def seeded_nodes(setup_database):
    async with TestingSessionLocal() as session:
        root = KnowledgeNode(id=1, name="力学", code="MECH-001", level=1)
        child = KnowledgeNode(id=2, name="牛顿第二定律", code="MECH-002", parent_id=1, level=2)
        session.add(root)
        session.add(child)
        await session.commit()
    return [1, 2]


async def create_document_with_roles(owner: User, editor: User, viewer: User, visibility: str = "class") -> TopicDocument:
    async with TestingSessionLocal() as session:
        document = TopicDocument(
            id=uuid.uuid4(),
            title="测试文档",
            summary="用于测试权限",
            content_markdown="# 原始版本",
            owner_id=owner.id,
            visibility=visibility,
        )
        session.add(document)
        await session.flush()
        session.add(TopicDocumentCollaborator(document_id=document.id, user_id=owner.id, role="owner"))
        session.add(TopicDocumentCollaborator(document_id=document.id, user_id=editor.id, role="editor"))
        session.add(TopicDocumentCollaborator(document_id=document.id, user_id=viewer.id, role="viewer"))
        session.add(TopicDocumentNode(document_id=document.id, node_id=1))
        session.add(
            TopicDocumentVersion(
                document_id=document.id,
                version_no=1,
                title=document.title,
                content_markdown=document.content_markdown,
                edited_by=owner.id,
            )
        )
        await session.commit()
        await session.refresh(document)
        return document


async def test_owner_create_document_generates_v1(client: AsyncClient, seeded_users, seeded_nodes):
    response = await client.post(
        "/api/v1/documents",
        json={
            "title": "牛顿第二定律共创",
            "summary": "测试文档",
            "content_markdown": "# 内容",
            "visibility": "private",
            "node_ids": seeded_nodes,
        },
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["current_user_role"] == "owner"
    assert payload["node_ids"] == seeded_nodes
    assert len(payload["versions"]) == 1
    assert payload["versions"][0]["version_no"] == 1
    assert payload["versions"][0]["title"] == "牛顿第二定律共创"


async def test_owner_update_document_generates_incrementing_version(client: AsyncClient, seeded_users, seeded_nodes):
    document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"])

    response = await client.put(
        f"/api/v1/documents/{document.id}",
        json={
          "title": "测试文档-已更新",
          "summary": "更新摘要",
          "content_markdown": "# 第二版",
          "visibility": "public",
          "node_ids": seeded_nodes,
        },
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["title"] == "测试文档-已更新"
    assert payload["visibility"] == "public"
    assert payload["versions"][0]["version_no"] == 2


async def test_viewer_cannot_update_delete_or_manage_collaborators(client: AsyncClient, seeded_users):
    document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"])

    update_response = await client.put(
        f"/api/v1/documents/{document.id}",
        json={"title": "试图更新"},
        headers={"Authorization": f"Bearer {seeded_users['viewer_token']}"},
    )
    delete_response = await client.delete(
        f"/api/v1/documents/{document.id}",
        headers={"Authorization": f"Bearer {seeded_users['viewer_token']}"},
    )
    collaborator_response = await client.post(
        f"/api/v1/documents/{document.id}/collaborators",
        json={"username": seeded_users["stranger"].username, "role": "editor"},
        headers={"Authorization": f"Bearer {seeded_users['viewer_token']}"},
    )

    assert update_response.status_code == 403
    assert delete_response.status_code == 403
    assert collaborator_response.status_code == 403


async def test_editor_can_update_but_not_delete_manage_or_restore(client: AsyncClient, seeded_users):
    document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"])

    update_response = await client.put(
        f"/api/v1/documents/{document.id}",
        json={"content_markdown": "# editor updated"},
        headers={"Authorization": f"Bearer {seeded_users['editor_token']}"},
    )
    delete_response = await client.delete(
        f"/api/v1/documents/{document.id}",
        headers={"Authorization": f"Bearer {seeded_users['editor_token']}"},
    )
    collaborator_response = await client.post(
        f"/api/v1/documents/{document.id}/collaborators",
        json={"username": seeded_users["stranger"].username, "role": "viewer"},
        headers={"Authorization": f"Bearer {seeded_users['editor_token']}"},
    )
    version_id = update_response.json()["versions"][0]["id"]
    restore_response = await client.post(
        f"/api/v1/documents/{document.id}/versions/{version_id}/restore",
        headers={"Authorization": f"Bearer {seeded_users['editor_token']}"},
    )

    assert update_response.status_code == 200, update_response.text
    assert delete_response.status_code == 403
    assert collaborator_response.status_code == 403
    assert restore_response.status_code == 403


async def test_owner_can_add_update_and_remove_collaborator(client: AsyncClient, seeded_users):
    document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"])

    add_response = await client.post(
        f"/api/v1/documents/{document.id}/collaborators",
        json={"username": seeded_users["stranger"].username, "role": "viewer"},
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert add_response.status_code == 200, add_response.text
    stranger_entry = next(item for item in add_response.json()["collaborators"] if item["username"] == seeded_users["stranger"].username)
    assert stranger_entry["role"] == "viewer"

    update_response = await client.put(
        f"/api/v1/documents/{document.id}/collaborators/{seeded_users['stranger'].id}",
        json={"role": "editor"},
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert update_response.status_code == 200, update_response.text
    updated_entry = next(item for item in update_response.json()["collaborators"] if item["username"] == seeded_users["stranger"].username)
    assert updated_entry["role"] == "editor"

    remove_response = await client.delete(
        f"/api/v1/documents/{document.id}/collaborators/{seeded_users['stranger'].id}",
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert remove_response.status_code == 200, remove_response.text
    assert all(item["username"] != seeded_users["stranger"].username for item in remove_response.json()["collaborators"])

    owner_role_response = await client.put(
        f"/api/v1/documents/{document.id}/collaborators/{seeded_users['owner'].id}",
        json={"role": "viewer"},
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert owner_role_response.status_code == 400


async def test_private_and_class_documents_require_membership_but_public_is_readable(client: AsyncClient, seeded_users):
    private_document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"], visibility="private")
    class_document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"], visibility="class")
    public_document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"], visibility="public")

    private_response = await client.get(
        f"/api/v1/documents/{private_document.id}",
        headers={"Authorization": f"Bearer {seeded_users['stranger_token']}"},
    )
    class_response = await client.get(
        f"/api/v1/documents/{class_document.id}",
        headers={"Authorization": f"Bearer {seeded_users['stranger_token']}"},
    )
    public_response = await client.get(
        f"/api/v1/documents/{public_document.id}",
        headers={"Authorization": f"Bearer {seeded_users['stranger_token']}"},
    )

    assert private_response.status_code == 403
    assert class_response.status_code == 403
    assert public_response.status_code == 200
    assert public_response.json()["current_user_role"] == "viewer"


async def test_restore_version_resets_content_and_creates_new_snapshot(client: AsyncClient, seeded_users):
    document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"])

    update_response = await client.put(
        f"/api/v1/documents/{document.id}",
        json={"title": "第二标题", "content_markdown": "# 第二版"},
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert update_response.status_code == 200, update_response.text
    versions = update_response.json()["versions"]
    original_version = next(version for version in versions if version["version_no"] == 1)

    restore_response = await client.post(
        f"/api/v1/documents/{document.id}/versions/{original_version['id']}/restore",
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert restore_response.status_code == 200, restore_response.text
    payload = restore_response.json()
    assert payload["title"] == "测试文档"
    assert payload["content_markdown"] == "# 原始版本"
    assert payload["versions"][0]["version_no"] == 3


async def test_delete_document_removes_related_rows(client: AsyncClient, seeded_users):
    document = await create_document_with_roles(seeded_users["owner"], seeded_users["editor"], seeded_users["viewer"])

    response = await client.delete(
        f"/api/v1/documents/{document.id}",
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )
    assert response.status_code == 204, response.text

    async with TestingSessionLocal() as session:
        assert await session.get(TopicDocument, document.id) is None
        versions = await session.execute(select(TopicDocumentVersion).where(TopicDocumentVersion.document_id == document.id))
        collaborators = await session.execute(select(TopicDocumentCollaborator).where(TopicDocumentCollaborator.document_id == document.id))
        nodes = await session.execute(select(TopicDocumentNode).where(TopicDocumentNode.document_id == document.id))
        assert versions.scalars().all() == []
        assert collaborators.scalars().all() == []
        assert nodes.scalars().all() == []


async def test_topics_include_parent_id_and_collaborator_candidates_exclude_admin(client: AsyncClient, seeded_users, seeded_nodes):
    topics_response = await client.get("/api/v1/topics")
    collaborators_response = await client.get(
        "/api/v1/users/collaborators",
        headers={"Authorization": f"Bearer {seeded_users['owner_token']}"},
    )

    assert topics_response.status_code == 200
    topics_payload = topics_response.json()
    child_topic = next(item for item in topics_payload if item["id"] == 2)
    assert child_topic["parent_id"] == 1

    assert collaborators_response.status_code == 200
    usernames = [item["username"] for item in collaborators_response.json()]
    assert seeded_users["admin"].username not in usernames
    assert seeded_users["owner"].username not in usernames
