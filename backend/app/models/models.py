from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

class KnowledgeNode(SQLModel, table=True):
    __tablename__ = "knowledge_nodes"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    name: str = Field(index=True)
    code: str = Field(unique=True)
    description: Optional[str] = Field(default=None)
    parent_id: Optional[int] = Field(default=None, foreign_key="knowledge_nodes.id")
    level: int

    children: List["KnowledgeNode"] = Relationship(back_populates="parent")
    parent: Optional["KnowledgeNode"] = Relationship(back_populates="children")
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
    
    embedding: List[float] = Field(sa_column=Column(Vector(1536)))

    primary_node_id: int = Field(foreign_key="knowledge_nodes.id")
    primary_node: "KnowledgeNode" = Relationship(back_populates="questions")

    exam_records: List["ExamRecord"] = Relationship(back_populates="question")


class UserMastery(SQLModel, table=True):
    __tablename__ = "user_mastery"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True) # Assuming a users table exists
    node_id: int = Field(foreign_key="knowledge_nodes.id", primary_key=True)
    mastery_score: float = Field(default=0.0, ge=0.0, le=1.0)
    last_updated: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    node: KnowledgeNode = Relationship(back_populates="user_masteries")
    # user: "User" = Relationship(back_populates="masteries") # Assuming a User model

class ExamRecord(SQLModel, table=True):
    __tablename__ = "exam_records"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID # Assuming a users table exists
    student_input: str
    is_correct: bool
    ai_analysis: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))

    question_id: uuid.UUID = Field(foreign_key="questions.id")
    question: Question = Relationship(back_populates="exam_records")

# Placeholder for the User model as it's referenced but not defined in DATAMODEL.md
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # other fields like email, name, etc.
    # masteries: List[UserMastery] = Relationship(back_populates="user")
