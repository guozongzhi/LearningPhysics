"""
Admin API Endpoints
All endpoints require admin privileges (is_admin=True).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
import csv
import io
from datetime import datetime

from app.db.session import get_session
from app.models.models import User, Question, KnowledgeNode, ExamRecord, get_password_hash
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.logging_config import api_logger
import dotenv
import os

router = APIRouter()


# --- Dependency: Admin check ---
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ============================================================
# Student Management
# ============================================================

class StudentCreate(BaseModel):
    username: str
    email: str
    password: str

class StudentResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

class PasswordReset(BaseModel):
    new_password: str


@router.get("/students", response_model=List[StudentResponse])
async def list_students(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.debug(f"列表学生请求 - 管理员: {admin.username}")
    try:
        result = await db.execute(
            select(User).where(User.is_admin == False).order_by(User.created_at.desc())
        )
        students = result.scalars().all()
        api_logger.debug(f"学生列表获取成功 - 管理员: {admin.username}, 学生数: {len(students)}")
        return [
            StudentResponse(
                id=str(s.id),
                username=s.username,
                email=s.email,
                is_active=s.is_active,
                created_at=s.created_at.isoformat() if s.created_at else "",
            )
            for s in students
        ]
    except Exception as e:
        api_logger.error(f"学生列表获取失败 - 管理员: {admin.username}, 错误: {str(e)}")
        raise


@router.post("/students", response_model=StudentResponse, status_code=201)
async def create_student(
    data: StudentCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.debug(f"创建学生请求 - 管理员: {admin.username}, 用户名: {data.username}")
    # Check if exists
    existing = await db.execute(
        select(User).where((User.email == data.email) | (User.username == data.username))
    )
    if existing.scalar_one_or_none():
        api_logger.warning(f"创建学生失败 - 用户名或邮箱已存在: {data.username}")
        raise HTTPException(status_code=400, detail="Username or email already exists")

    student = User(
        email=data.email,
        username=data.username,
        is_admin=False,
    )
    student.set_password(data.password)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    api_logger.debug(f"学生创建成功 - 管理员: {admin.username}, 新学生: {student.username}")
    return StudentResponse(
        id=str(student.id),
        username=student.username,
        email=student.email,
        is_active=student.is_active,
        created_at=student.created_at.isoformat() if student.created_at else "",
    )


@router.delete("/students/{student_id}", status_code=204)
async def delete_student(
    student_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.debug(f"删除学生请求 - 管理员: {admin.username}, 学生ID: {student_id}")
    result = await db.execute(select(User).where(User.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        api_logger.warning(f"删除学生失败 - 学生不存在: {student_id}")
        raise HTTPException(status_code=404, detail="Student not found")
    if student.is_admin:
        api_logger.warning(f"删除学生失败 - 无法删除管理员: {student.username}")
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    await db.delete(student)
    await db.commit()
    api_logger.debug(f"学生删除成功 - 管理员: {admin.username}, 学生: {student.username}")


@router.put("/students/{student_id}/reset-password")
async def reset_student_password(
    student_id: UUID,
    data: PasswordReset,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.debug(f"重置学生密码请求 - 管理员: {admin.username}, 学生ID: {student_id}")
    result = await db.execute(select(User).where(User.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        api_logger.warning(f"重置密码失败 - 学生不存在: {student_id}")
        raise HTTPException(status_code=404, detail="Student not found")
    student.set_password(data.new_password)
    await db.commit()
    api_logger.debug(f"学生密码重置成功 - 管理员: {admin.username}, 学生: {student.username}")
    return {"message": "Password reset successfully"}


# ============================================================
# Question Management
# ============================================================

class QuestionCreate(BaseModel):
    content_latex: str
    difficulty: int
    question_type: str
    answer_schema: dict
    solution_steps: str
    primary_node_id: int
    image_url: Optional[str] = None

class QuestionUpdate(BaseModel):
    content_latex: Optional[str] = None
    difficulty: Optional[int] = None
    answer_schema: Optional[dict] = None
    solution_steps: Optional[str] = None
    primary_node_id: Optional[int] = None
    image_url: Optional[str] = None

class QuestionResponse(BaseModel):
    id: str
    content_latex: str
    difficulty: int
    question_type: str
    answer_schema: dict
    solution_steps: str
    primary_node_id: int
    topic_name: str = ""

class TopicCreate(BaseModel):
    name: str
    code: str
    level: int
    description: Optional[str] = None


@router.get("/questions", response_model=List[QuestionResponse])
async def list_questions(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Question))
    questions = result.scalars().all()

    # Get topic names
    nodes_result = await db.execute(select(KnowledgeNode))
    id_to_name = {n.id: n.name for n in nodes_result.scalars().all()}

    return [
        QuestionResponse(
            id=str(q.id),
            content_latex=q.content_latex,
            difficulty=q.difficulty,
            question_type=q.question_type,
            answer_schema=q.answer_schema,
            solution_steps=q.solution_steps,
            primary_node_id=q.primary_node_id,
            topic_name=id_to_name.get(q.primary_node_id, ""),
        )
        for q in questions
    ]


@router.post("/questions", response_model=QuestionResponse, status_code=201)
async def create_question(
    data: QuestionCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    import uuid as uuid_mod
    zero_embedding = [0.0] * 1536
    question = Question(
        id=uuid_mod.uuid4(),
        content_latex=data.content_latex,
        difficulty=data.difficulty,
        question_type=data.question_type,
        answer_schema=data.answer_schema,
        solution_steps=data.solution_steps,
        embedding=zero_embedding,
        primary_node_id=data.primary_node_id,
        image_url=data.image_url,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    # Get topic name
    node_result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.id == data.primary_node_id))
    node = node_result.scalar_one_or_none()

    return QuestionResponse(
        id=str(question.id),
        content_latex=question.content_latex,
        difficulty=question.difficulty,
        question_type=question.question_type,
        answer_schema=question.answer_schema,
        solution_steps=question.solution_steps,
        primary_node_id=question.primary_node_id,
        topic_name=node.name if node else "",
    )


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: UUID,
    data: QuestionUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if data.content_latex is not None:
        question.content_latex = data.content_latex
    if data.difficulty is not None:
        question.difficulty = data.difficulty
    if data.answer_schema is not None:
        question.answer_schema = data.answer_schema
    if data.solution_steps is not None:
        question.solution_steps = data.solution_steps
    if data.primary_node_id is not None:
        question.primary_node_id = data.primary_node_id

    await db.commit()
    await db.refresh(question)

    node_result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.id == question.primary_node_id))
    node = node_result.scalar_one_or_none()

    return QuestionResponse(
        id=str(question.id),
        content_latex=question.content_latex,
        difficulty=question.difficulty,
        question_type=question.question_type,
        answer_schema=question.answer_schema,
        solution_steps=question.solution_steps,
        primary_node_id=question.primary_node_id,
        topic_name=node.name if node else "",
    )


@router.delete("/questions/{question_id}", status_code=204)
async def delete_question(
    question_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(question)
    await db.commit()


# ============================================================
# Topic Management
# ============================================================

@router.post("/topics", status_code=201)
async def create_topic(
    data: TopicCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    existing = await db.execute(select(KnowledgeNode).where(KnowledgeNode.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Topic code already exists")

    node = KnowledgeNode(name=data.name, code=data.code, level=data.level, description=data.description)
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return {"id": node.id, "name": node.name, "code": node.code}


# ============================================================
# System Configuration Management
# ============================================================

class LlmConfigUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None

class LlmConfigResponse(BaseModel):
    openai_api_key_masked: str
    openai_base_url: str
    openai_model: str

@router.get("/config/llm", response_model=LlmConfigResponse)
async def get_llm_config(
    admin: User = Depends(get_admin_user),
):
    # Mask the API key, showing only first 4 and last 4 characters if it exists
    key = settings.OPENAI_API_KEY
    masked_key = ""
    if key and len(key) > 8:
        masked_key = f"{key[:4]}...{key[-4:]}"
    elif key:
        masked_key = "***MASKED***"
        
    return LlmConfigResponse(
        openai_api_key_masked=masked_key,
        openai_base_url=settings.OPENAI_BASE_URL,
        openai_model=settings.OPENAI_MODEL,
    )

@router.put("/config/llm", response_model=LlmConfigResponse)
async def update_llm_config(
    data: LlmConfigUpdate,
    admin: User = Depends(get_admin_user),
):
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    
    # Update in memory and write to .env
    if data.openai_api_key is not None and data.openai_api_key.strip():
        settings.OPENAI_API_KEY = data.openai_api_key
        dotenv.set_key(env_path, "OPENAI_API_KEY", data.openai_api_key)
        
    if data.openai_base_url is not None:
        settings.OPENAI_BASE_URL = data.openai_base_url
        dotenv.set_key(env_path, "OPENAI_BASE_URL", data.openai_base_url)
        
    if data.openai_model is not None:
        settings.OPENAI_MODEL = data.openai_model
        dotenv.set_key(env_path, "OPENAI_MODEL", data.openai_model)

    # Return updated config
    key = settings.OPENAI_API_KEY
    masked_key = ""
    if key and len(key) > 8:
        masked_key = f"{key[:4]}...{key[-4:]}"
    elif key:
        masked_key = "***MASKED***"
        
    return LlmConfigResponse(
        openai_api_key_masked=masked_key,
        openai_base_url=settings.OPENAI_BASE_URL,
        openai_model=settings.OPENAI_MODEL,
    )


@router.get("/config/llm/test")
async def test_llm_connection(
    admin: User = Depends(get_admin_user),
):
    """Test the connectivity of the current LLM configuration."""
    from app.services.quiz_service import client
    import openai
    
    if not client:
        return {"status": "error", "message": "AI 客户端未初始化，请检查 API Key 配置"}
    
    try:
        # Perform a minimal completion request to test connectivity
        # We use a very low max_tokens and high temperature to keep it cheap and fast
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
            timeout=10.0
        )
        return {"status": "success", "message": "连接成功", "model": settings.OPENAI_MODEL}
    except openai.AuthenticationError:
        return {"status": "error", "message": "认证失败：API Key 无效"}
    except openai.APIConnectionError:
        return {"status": "error", "message": "网络错误：无法连接到 Base URL"}
    except Exception as e:
        return {"status": "error", "message": f"连接失败: {str(e)}"}


# ============================================================
# Record Export
# ============================================================

@router.get("/records/export")
async def export_records(
    token: str = "",
    db: AsyncSession = Depends(get_session),
):
    """Export all student exam records as CSV. Accepts token as query param for browser download."""
    from app.core.auth import get_current_user as _get_user
    from fastapi import Request

    # Verify admin via token query param
    if not token:
        raise HTTPException(status_code=401, detail="Token required")

    from jose import JWTError, jwt as jose_jwt
    from app.core.auth import SECRET_KEY, ALGORITHM
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.execute(
        select(ExamRecord, User, Question)
        .join(User, ExamRecord.user_id == User.id)
        .join(Question, ExamRecord.question_id == Question.id)
        .order_by(User.username)
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["学生用户名", "学生邮箱", "题目内容", "学生答案", "是否正确", "反馈", "答题时间"])

    for record, user, question in rows:
        feedback = ""
        if record.ai_analysis:
            feedback = record.ai_analysis.get("feedback", "")
        created = record.created_at.isoformat() if hasattr(record, 'created_at') and record.created_at else ""
        writer.writerow([
            user.username,
            user.email,
            question.content_latex[:100],
            record.student_input,
            "正确" if record.is_correct else "错误",
            feedback,
            created,
        ])

    output.seek(0)
    # Add BOM for Excel compatibility with Chinese characters
    bom_output = io.BytesIO()
    bom_output.write(b'\xef\xbb\xbf')
    bom_output.write(output.getvalue().encode('utf-8'))
    bom_output.seek(0)

    return StreamingResponse(
        bom_output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=records_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
