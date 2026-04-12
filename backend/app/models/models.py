import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column
from passlib.context import CryptContext
from sqlalchemy import LargeBinary
from sqlalchemy.dialects.postgresql import JSONB

# Use UTC+8 for all datetime defaults instead of UTC
CHINA_TZ = timezone(timedelta(hours=8))

# Try to import pgvector, but allow it to fail gracefully
PGVECTOR_AVAILABLE = False
try:
    from pgvector.sqlalchemy import Vector as RealVector
    Vector = RealVector
    PGVECTOR_AVAILABLE = True
except ImportError:
    class FakeVector:
        def __init__(self, *args, **kwargs): pass
    Vector = FakeVector
    PGVECTOR_AVAILABLE = False

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class KnowledgeNode(SQLModel, table=True):
    __tablename__ = "knowledge_nodes"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    name: str = Field(index=True)
    code: str = Field(unique=True)
    description: Optional[str] = Field(default=None)
    parent_id: Optional[int] = Field(default=None, foreign_key="knowledge_nodes.id")
    level: int

    children: List["KnowledgeNode"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"foreign_keys": "KnowledgeNode.parent_id"}
    )
    parent: Optional["KnowledgeNode"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "KnowledgeNode.id"}
    )
    questions: List["Question"] = Relationship(back_populates="primary_node")
    user_masteries: List["UserMastery"] = Relationship(back_populates="node")

class Question(SQLModel, table=True):
    __tablename__ = "questions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    content_latex: str
    difficulty: int = Field(ge=1, le=5)
    question_type: str  # ENUM: "CHOICE", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "BLANK", "CALCULATION"
    answer_schema: Dict[str, Any] = Field(sa_column=Column(JSONB))
    solution_steps: str
    image_url: Optional[str] = Field(default=None)  # URL to diagram/illustration
    # Use pgvector for embedding storage if available, fallback to JSONB
    # To avoid UndefinedObjectError for VECTOR type during table creation in non-pgvector envs,
    # we must ensure that Vector(1536) is never part of the metadata at class definition time.
    _emb_col = Column(JSONB)
    if PGVECTOR_AVAILABLE and Vector is not None:
        try:
            _emb_col = Column(Vector(1536))
        except:
            pass
    
    embedding: Optional[List[float]] = Field(default=None, sa_column=_emb_col)

    primary_node_id: int = Field(foreign_key="knowledge_nodes.id")
    primary_node: "KnowledgeNode" = Relationship(back_populates="questions")

    exam_records: List["ExamRecord"] = Relationship(back_populates="question", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class UserMastery(SQLModel, table=True):
    __tablename__ = "user_mastery"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    node_id: int = Field(foreign_key="knowledge_nodes.id", primary_key=True)
    mastery_score: float = Field(default=0.0, ge=0.0, le=1.0)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None), sa_column_kwargs={"onupdate": lambda: datetime.now(CHINA_TZ).replace(tzinfo=None)})

    node: KnowledgeNode = Relationship(back_populates="user_masteries")
    user: "User" = Relationship(back_populates="masteries")

class ExamRecord(SQLModel, table=True):
    __tablename__ = "exam_records"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    student_input: str
    is_correct: bool
    ai_analysis: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))
    question_id: uuid.UUID = Field(foreign_key="questions.id")
    user: "User" = Relationship(back_populates="exam_records")
    question: Question = Relationship(back_populates="exam_records")


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None), sa_column_kwargs={"onupdate": lambda: datetime.now(CHINA_TZ).replace(tzinfo=None)})
    token_usage: int = Field(default=0)
    token_limit: int = Field(default=100000)

    # Relationships
    masteries: List["UserMastery"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    exam_records: List["ExamRecord"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    def set_password(self, password: str):
        self.hashed_password = get_password_hash(password)

    def check_password(self, password: str) -> bool:
        return verify_password(password, self.hashed_password)


class TopicDocument(SQLModel, table=True):
    __tablename__ = "topic_documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(index=True)
    summary: Optional[str] = Field(default=None)
    content_markdown: str = Field(default="")
    content_blocks: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSONB))
    whiteboard_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    visibility: str = Field(default="private")
    is_archived: bool = Field(default=False)
    is_template: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None),
        sa_column_kwargs={"onupdate": lambda: datetime.now(CHINA_TZ).replace(tzinfo=None)},
    )


class TopicDocumentNode(SQLModel, table=True):
    __tablename__ = "topic_document_nodes"

    document_id: uuid.UUID = Field(foreign_key="topic_documents.id", primary_key=True)
    node_id: int = Field(foreign_key="knowledge_nodes.id", primary_key=True)


class TopicDocumentCollaborator(SQLModel, table=True):
    __tablename__ = "topic_document_collaborators"

    document_id: uuid.UUID = Field(foreign_key="topic_documents.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    role: str = Field(default="viewer")
    invited_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))


class TopicDocumentVersion(SQLModel, table=True):
    __tablename__ = "topic_document_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(foreign_key="topic_documents.id", index=True)
    version_no: int = Field(default=1)
    title: str
    content_markdown: str
    content_blocks: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSONB))
    whiteboard_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    edited_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))


class TopicDocumentActivity(SQLModel, table=True):
    __tablename__ = "topic_document_activities"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(foreign_key="topic_documents.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    action: str  # "created", "updated", "collaborator_added", "collaborator_removed", "collaborator_updated", "version_restored"
    detail: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))


class Media(SQLModel, table=True):
    __tablename__ = "media"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    filename: str
    content_type: str
    data: bytes = Field(sa_column=Column(LargeBinary))
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))


class PageVisitCounter(SQLModel, table=True):
    __tablename__ = "page_visit_counters"
    
    path: str = Field(primary_key=True)
    visit_count: int = Field(default=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(CHINA_TZ).replace(tzinfo=None))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
