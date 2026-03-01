from fastapi import APIRouter, Request, Body
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
