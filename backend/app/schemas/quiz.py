import uuid
from typing import List, Dict
from pydantic import BaseModel

# --- Schemas for Quiz Generation ---

class QuizGenerateRequest(BaseModel):
    """
    Request model for generating a new quiz.
    """
    topic_ids: List[int]
    difficulty_preference: str = "adaptive"
    count: int

class QuestionResponse(BaseModel):
    """
    Response model for a single question in a quiz.
    Note: This is a subset of the full Question model to avoid exposing sensitive data like the answer.
    """
    id: uuid.UUID
    content_latex: str
    question_type: str

    class Config:
        from_attributes = True # Replaces orm_mode=True in Pydantic v2

class QuizGenerateResponse(BaseModel):
    """
    Response model for a newly generated quiz.
    """
    quiz_id: uuid.UUID
    questions: List[QuestionResponse]


# --- Schemas for Quiz Submission and Analysis ---

class StudentAnswer(BaseModel):
    """
    Model for a single answer provided by a student.
    """
    question_id: uuid.UUID
    student_input: str
    time_spent_ms: int

class QuizSubmitRequest(BaseModel):
    """
    Request model for submitting a quiz for grading and analysis.
    """
    quiz_id: uuid.UUID
    answers: List[StudentAnswer]

class AnalysisResult(BaseModel):
    """
    Response model for the analysis of a single question's answer.
    """
    is_correct: bool
    feedback: str
    error_tag: str

class QuizSubmitResponse(BaseModel):
    """
    Response model after a quiz has been submitted and analyzed.
    """
    total_score: float
    analysis: Dict[uuid.UUID, AnalysisResult]
