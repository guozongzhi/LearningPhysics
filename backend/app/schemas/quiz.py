import uuid
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

# --- Schemas for Quiz Generation ---

class QuizGenerateRequest(BaseModel):
    """
    Request model for generating a new quiz.
    """
    topic_ids: List[int] = Field(..., min_items=1, max_items=10, description="List of knowledge node IDs to source questions from")
    difficulty_preference: str = Field(default="adaptive", description="Difficulty selection preference",
                                      pattern=r"^(adaptive|easy|medium|hard)$")
    count: int = Field(default=5, ge=1, le=50, description="Number of questions to include in the quiz")


class QuestionResponse(BaseModel):
    """
    Response model for a single question in a quiz.
    Note: This is a subset of the full Question model to avoid exposing sensitive data like the answer.
    """
    id: uuid.UUID
    content_latex: str = Field(..., max_length=10000, description="LaTeX formatted question content")
    question_type: str = Field(..., pattern=r"^(CHOICE|BLANK|CALCULATION)$", description="Type of the question")
    difficulty: int = Field(..., ge=1, le=5, description="Difficulty level of the question")
    image_url: Optional[str] = None

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
    student_input: str = Field(..., max_length=1000, description="Student's answer input")
    time_spent_ms: int = Field(default=0, ge=0, description="Time spent on the question in milliseconds")


class QuizSubmitRequest(BaseModel):
    """
    Request model for submitting a quiz for grading and analysis.
    """
    quiz_id: uuid.UUID
    answers: List[StudentAnswer] = Field(..., min_items=1, max_items=50, description="List of student answers")


class AnalysisResult(BaseModel):
    """
    Response model for the analysis of a single question's answer.
    """
    is_correct: bool
    feedback: str = Field(..., max_length=2000, description="Feedback for the student")
    error_tag: str = Field(..., pattern=r"^(CORRECT|VALUE_ERROR|UNIT_ERROR|CALCULATION_ERROR|CONCEPT_ERROR|FORMAT_ERROR|CONFIG_ERROR|AI_ERROR)$",
                          description="Tag categorizing the type of error")


class QuizSubmitResponse(BaseModel):
    """
    Response model after a quiz has been submitted and analyzed.
    """
    total_score: float = Field(ge=0, le=100, description="Total score percentage")
    analysis: Dict[uuid.UUID, AnalysisResult]
    overall_summary: str = Field(default="", description="AI overall analysis summary")
