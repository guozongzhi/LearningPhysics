"""
Admin API Endpoints
All endpoints require admin privileges (is_admin=True).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel, Field
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
    token_usage: int = 0
    token_limit: int = 100000

    class Config:
        from_attributes = True

class PasswordReset(BaseModel):
    new_password: str

class TokenLimitUpdate(BaseModel):
    token_limit: int


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
                token_usage=s.token_usage,
                token_limit=s.token_limit,
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
        token_usage=student.token_usage,
        token_limit=student.token_limit,
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


@router.put("/students/{student_id}/token-limit")
async def update_student_token_limit(
    student_id: UUID,
    data: TokenLimitUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.debug(f"更新学生Token限制请求 - 管理员: {admin.username}, 学生ID: {student_id}")
    result = await db.execute(select(User).where(User.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        api_logger.warning(f"更新Token限制失败 - 学生不存在: {student_id}")
        raise HTTPException(status_code=404, detail="Student not found")
        
    student.token_limit = data.token_limit
    await db.commit()
    api_logger.debug(f"学生Token限制更新成功 - 管理员: {admin.username}, 学生: {student.username}, 新限制: {data.token_limit}")
    return {"message": "Token limit updated successfully", "token_limit": student.token_limit}


@router.get("/students/tokens/summary")
async def get_tokens_summary(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.debug(f"获取全局Token统计 - 管理员: {admin.username}")
    
    # Calculate sum of token_usage and token_limit across all non-admin users
    result = await db.execute(
        select(
            func.sum(User.token_usage).label("total_usage"),
            func.sum(User.token_limit).label("total_limit")
        ).where(User.is_admin == False)
    )
    row = result.first()
    
    total_usage = row.total_usage or 0
    total_limit = row.total_limit or 0
    global_limit = settings.GLOBAL_TOKEN_LIMIT
    
    alert_message = None
    if global_limit > 0 and total_usage >= global_limit * 0.8:
        alert_message = f"警告：全平台 Token 消耗已达到系统设定总额度 ({global_limit}) 的 {(total_usage/global_limit)*100:.1f}%，请留意续费或限制使用。"

    return {
        "global_limit": global_limit,
        "total_usage": total_usage,
        "total_limit": total_limit,
        "alert_message": alert_message
    }

@router.post("/students/tokens/clear")
async def clear_all_tokens(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.info(f"清空所有学生Token消耗 - 管理员: {admin.username}")
    
    # Reset token_usage to 0 for all non-admin users
    from sqlalchemy import update
    stmt = update(User).where(User.is_admin == False).values(token_usage=0)
    result = await db.execute(stmt)
    await db.commit()
    
    cleared_count = result.rowcount
    api_logger.info(f"成功清空了 {cleared_count} 个学生的Token消耗")
    
    return {"message": f"Successfully cleared token usage for {cleared_count} students."}


class GlobalTokenLimitUpdate(BaseModel):
    global_limit: int

@router.put("/students/tokens/global-limit")
async def update_global_token_limit(
    data: GlobalTokenLimitUpdate,
    admin: User = Depends(get_admin_user),
):
    import os
    import dotenv
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    
    # Update in memory and write to .env
    settings.GLOBAL_TOKEN_LIMIT = data.global_limit
    dotenv.set_key(env_path, "GLOBAL_TOKEN_LIMIT", str(data.global_limit))
    
    api_logger.info(f"全局Token上限已更新为: {data.global_limit} - 管理员: {admin.username}")
    return {"message": "Global token limit updated successfully", "global_limit": data.global_limit}

@router.post("/students/tokens/average-distribute")
async def average_distribute_tokens(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    api_logger.info(f"请求一键平均分配Token - 管理员: {admin.username}")
    
    # Get total students count
    count_result = await db.execute(select(func.count(User.id)).where(User.is_admin == False))
    student_count = count_result.scalar_one()
    
    if student_count == 0:
        return {"message": "由于没有学生，忽略分配计算。", "per_student": 0, "students_updated": 0}
        
    global_limit = settings.GLOBAL_TOKEN_LIMIT
    per_student = global_limit // student_count
    
    from sqlalchemy import update
    stmt = update(User).where(User.is_admin == False).values(token_limit=per_student)
    result = await db.execute(stmt)
    await db.commit()
    
    api_logger.info(f"平均分配完成，每位学生 ({student_count}人) 新限额: {per_student}")
    return {"message": f"Successfully distributed {per_student} tokens to {student_count} students.", "per_student": per_student, "students_updated": student_count}

# ============================================================
# Question Management
# ============================================================

class QuestionImportRequest(BaseModel):
    mode: str = Field(..., description="Import mode: 'overwrite' or 'extend'")

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


@router.post("/questions/clear-history")
async def clear_question_history(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Clears all questions from the database that don't have associated exam records.
    """
    api_logger.info(f"管理员 {admin.username} 请求清除题库历史")
    
    # 1. Fetch all questions that DO NOT have exam records
    # Subquery: find all question_ids in exam_records
    subq = select(ExamRecord.question_id)
    
    # Select questions not in the subquery
    query_to_delete = select(Question).where(Question.id.notin_(subq))
    result = await db.execute(query_to_delete)
    questions_to_delete = result.scalars().all()
    
    deleted_count = 0
    for q in questions_to_delete:
        await db.delete(q)
        deleted_count += 1
        
    await db.commit()
    api_logger.info(f"题库历史清除成功，共删除 {deleted_count} 道未被使用的题目")
    
    return {"message": f"Successfully deleted {deleted_count} unused questions", "deleted_count": deleted_count}


@router.post("/questions/import")
async def import_questions(
    request: QuestionImportRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Imports questions from data/questions.json using either 'overwrite' or 'extend' mode.
    """
    api_logger.info(f"管理员 {admin.username} 请求导入题库，模式: {request.mode}")
    
    import json
    from pathlib import Path
    
    # Resolve the path relative to the backend directory
    project_root = Path(__file__).parent.parent.parent.parent.parent
    data_path = project_root / "data" / "questions.json"
    
    if not data_path.exists():
        raise HTTPException(status_code=404, detail=f"questions.json file not found at {data_path}")
        
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read JSON: {e}")
        
    questions_data = data.get("questions", [])
    if not questions_data:
        return {"message": "No questions found in JSON"}
        
    from app.models.models import KnowledgeNode
    import uuid
    
    # Get all topics for code -> id mapping
    result = await db.execute(select(KnowledgeNode))
    code_to_id = {node.code: node.id for node in result.scalars().all()}
    
    added_count = 0
    updated_count = 0
    skipped_count = 0
    
    if request.mode == "overwrite":
        # Delete unused questions first
        subq = select(ExamRecord.question_id)
        query_to_delete = select(Question).where(Question.id.notin_(subq))
        res = await db.execute(query_to_delete)
        for q in res.scalars().all():
            await db.delete(q)
        await db.commit() # commit deletions before insert
        
    for q_data in questions_data:
        topic_code = q_data.get("topic_code")
        if topic_code not in code_to_id:
            skipped_count += 1
            continue
            
        content_latex = q_data.get("content_latex")
        
        # Check if question exists
        res = await db.execute(select(Question).where(Question.content_latex == content_latex))
        existing_q = res.scalars().first()
        
        if existing_q:
            if request.mode == "extend":
                # Update existing
                existing_q.difficulty = q_data.get("difficulty", existing_q.difficulty)
                existing_q.question_type = q_data.get("question_type", existing_q.question_type)
                existing_q.answer_schema = q_data.get("answer_schema", existing_q.answer_schema)
                existing_q.solution_steps = q_data.get("solution_steps", existing_q.solution_steps)
                existing_q.primary_node_id = code_to_id[topic_code]
                updated_count += 1
            else:
                # In overwrite mode after deleting unused, if it still exists it has exam records. 
                # We can choose to update it or skip it. Let's update it to keep it fresh.
                existing_q.difficulty = q_data.get("difficulty", existing_q.difficulty)
                existing_q.question_type = q_data.get("question_type", existing_q.question_type)
                existing_q.answer_schema = q_data.get("answer_schema", existing_q.answer_schema)
                existing_q.solution_steps = q_data.get("solution_steps", existing_q.solution_steps)
                existing_q.primary_node_id = code_to_id[topic_code]
                updated_count += 1
        else:
            # Insert new
            new_q = Question(
                id=uuid.uuid4(),
                content_latex=content_latex,
                difficulty=q_data.get("difficulty", 1),
                question_type=q_data.get("question_type", "CHOICE"),
                answer_schema=q_data.get("answer_schema", {}),
                solution_steps=q_data.get("solution_steps", ""),
                embedding=[0.0] * 1536, # Placeholder
                primary_node_id=code_to_id[topic_code]
            )
            db.add(new_q)
            added_count += 1
            
    await db.commit()
    return {
        "message": f"Import completed in {request.mode} mode",
        "added": added_count,
        "updated": updated_count,
        "skipped": skipped_count
    }


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
