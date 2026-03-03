from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext

# Use UTC+8 for all datetime defaults instead of UTC
CHINA_TZ = timezone(timedelta(hours=8))

# Try to import pgvector, but allow it to fail gracefully
try:
    from pgvector.sqlalchemy import Vector
    PGVECTOR_AVAILABLE = True
except ImportError:
    PGVECTOR_AVAILABLE = False
    Vector = None  # type: ignore

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
    question_type: str  # ENUM: "CHOICE", "BLANK", "CALCULATION"
    answer_schema: Dict[str, Any] = Field(sa_column=Column(JSONB))
    solution_steps: str
    image_url: Optional[str] = Field(default=None)  # URL to diagram/illustration
    
    # Store embedding as JSON (JSONB) instead of vector type
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(JSONB))

    primary_node_id: int = Field(foreign_key="knowledge_nodes.id")
    primary_node: "KnowledgeNode" = Relationship(back_populates="questions")

    exam_records: List["ExamRecord"] = Relationship(back_populates="question")


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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
