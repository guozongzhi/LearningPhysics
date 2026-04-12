from fastapi import APIRouter, Request, Body, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.logging_config import app_logger, error_logger

router = APIRouter()

class FrontendLog(BaseModel):
    level: str  # info, warn, error
    message: str
    metadata: Optional[Dict[str, Any]] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None

@router.post("/client")
async def log_client_event(log: FrontendLog, request: Request):
    """接收并记录前端发来的日志"""
    
    log_content = f"[CLIENT] {log.message}"
    if log.url:
        log_content += f" (URL: {log.url})"
    if log.metadata:
        log_content += f" | Meta: {log.metadata}"
    
    level = log.level.lower()
    if level == "error":
        error_logger.error(log_content)
    elif level == "warn" or level == "warning":
        app_logger.warning(log_content)
    else:
        app_logger.info(log_content)
        
    return {"status": "logged"}


class VisitRecordCreate(BaseModel):
    path: str

from app.db.session import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import PageVisitCounter, CHINA_TZ
from datetime import datetime

@router.post("/visits/record")
async def record_visit(visit: VisitRecordCreate, db: AsyncSession = Depends(get_session)):
    """累加特定页面的访问次数"""
    result = await db.execute(select(PageVisitCounter).where(PageVisitCounter.path == visit.path))
    counter = result.scalar_one_or_none()
    
    if counter is None:
        counter = PageVisitCounter(path=visit.path, visit_count=1)
        db.add(counter)
    else:
        counter.visit_count += 1
        counter.updated_at = datetime.now(CHINA_TZ).replace(tzinfo=None)
        
    await db.commit()
    return {"status": "ok"}

from fastapi import HTTPException, status
from app.core.auth import get_current_user
from sqlalchemy.future import select
from sqlalchemy import desc

async def get_optional_admin(current_user=Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/admin/visits")
async def get_visit_logs(
    admin=Depends(get_optional_admin), 
    db: AsyncSession = Depends(get_session)
):
    """获取访问次数统计（管理员）"""
    result = await db.execute(select(PageVisitCounter).order_by(desc(PageVisitCounter.visit_count)))
    records = result.scalars().all()
    
    return [
        {
            "path": r.path,
            "visit_count": r.visit_count,
            "updated_at": r.updated_at.isoformat()
        }
        for r in records
    ]
