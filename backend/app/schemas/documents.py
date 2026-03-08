from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentVisibility(str, Enum):
    PRIVATE = "private"
    CLASS = "class"
    PUBLIC = "public"


class DocumentRole(str, Enum):
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class CollaboratorCandidateResponse(BaseModel):
    id: UUID
    username: str


class DocumentCollaboratorResponse(BaseModel):
    user_id: UUID
    username: str
    role: DocumentRole


class DocumentVersionResponse(BaseModel):
    id: UUID
    version_no: int
    edited_by: str
    title: str
    content_markdown: str
    content_blocks: Optional[List[Dict[str, Any]]] = None
    whiteboard_data: Optional[Dict[str, Any]] = None
    created_at: datetime


class DocumentListItemResponse(BaseModel):
    id: UUID
    title: str
    summary: Optional[str] = None
    visibility: DocumentVisibility
    owner_id: UUID
    owner_username: str
    updated_at: datetime
    node_ids: List[int] = Field(default_factory=list)
    collaborator_count: int = 0
    collaborators: List[DocumentCollaboratorResponse] = Field(default_factory=list)
    is_template: bool = False


class DocumentDetailResponse(DocumentListItemResponse):
    content_markdown: str
    content_blocks: Optional[List[Dict[str, Any]]] = None
    whiteboard_data: Optional[Dict[str, Any]] = None
    current_user_role: DocumentRole
    versions: List[DocumentVersionResponse] = Field(default_factory=list)


class DocumentCreateRequest(BaseModel):
    title: str
    summary: Optional[str] = None
    content_markdown: str = ""
    content_blocks: Optional[List[Dict[str, Any]]] = None
    whiteboard_data: Optional[Dict[str, Any]] = None
    visibility: DocumentVisibility = DocumentVisibility.PRIVATE
    node_ids: List[int] = Field(default_factory=list)


class DocumentUpdateRequest(BaseModel):
    base_updated_at: Optional[datetime] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    content_markdown: Optional[str] = None
    content_blocks: Optional[List[Dict[str, Any]]] = None
    whiteboard_data: Optional[Dict[str, Any]] = None
    visibility: Optional[DocumentVisibility] = None
    node_ids: Optional[List[int]] = None


class DocumentCollaboratorCreateRequest(BaseModel):
    username: str
    role: DocumentRole


class DocumentCollaboratorUpdateRequest(BaseModel):
    role: DocumentRole


class DocumentActivityResponse(BaseModel):
    id: UUID
    user_name: str
    action: str
    detail: Optional[str] = None
    created_at: datetime


class DocumentTemplateResponse(BaseModel):
    id: UUID
    title: str
    summary: Optional[str] = None
    content_markdown: str
    owner_name: str
    node_ids: List[int] = Field(default_factory=list)
    updated_at: datetime
