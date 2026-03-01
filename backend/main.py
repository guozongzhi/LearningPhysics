import uvicorn
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
import asyncio
from contextlib import asynccontextmanager
import time

from app.db.session import init_db
from app.api.v1 import quiz as quiz_router_v1
from app.api.v1 import auth as auth_router_v1
from app.api.v1 import topics as topics_router_v1
from app.api.v1 import admin as admin_router_v1
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from app.core.rate_limit import rate_limit_middleware
from app.core.auth import get_password_hash
from app.core.logging_config import log_app_startup, log_app_shutdown, log_api_request, api_logger
from sqlalchemy.future import select
from app.models.models import User

from fastapi import HTTPException
import uuid

from app.core.logging_config import request_id_ctx

class APILoggingMiddleware(BaseHTTPMiddleware):
    """API 请求日志中间件"""
    async def dispatch(self, request: Request, call_next):
        # 生成唯一请求 ID
        request_id = str(uuid.uuid4())
        request_id_ctx.set(request_id)
        
        start_time = time.time()
        
        # 处理请求
        try:
            response = await call_next(request)
        except Exception as e:
            # 这里的异常会被全局异常处理器捕获，但我们记录下时间
            duration_ms = (time.time() - start_time) * 1000
            log_api_request(
                method=request.method,
                path=request.url.path,
                status_code=500,
                duration_ms=duration_ms
            )
            raise e
            
        duration_ms = (time.time() - start_time) * 1000
        
        # 记录 API 请求
        log_api_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms
        )
        
        # 在响应头中返回请求 ID，方便前端/用户排查
        response.headers["X-Request-ID"] = request_id
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Skip rate limiting for authentication endpoints to allow login/register
        if request.url.path.startswith("/api/v1/auth"):
            response = await call_next(request)
            return response

        # Apply rate limiting to other endpoints
        try:
            rate_limit_middleware(request)
        except HTTPException as exc:
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
        
        response = await call_next(request)
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    log_app_startup(version="1.0.0")
    api_logger.info("数据库初始化中...")
    await init_db()
    api_logger.info("✓ 数据库初始化完成")
    
    # Check if admin user exists, if not create default admin
    api_logger.info("检查管理员用户...")
    from app.core.user_config import users_config
    from app.db.session import async_session_factory
    
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == users_config.admin.username)
        )
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            api_logger.info("创建默认管理员用户...")
            admin_user = User(
                id=uuid.uuid4(),
                email=users_config.admin.email,
                username=users_config.admin.username,
                hashed_password=get_password_hash(users_config.admin.password),
                is_active=True,
                is_admin=True
            )
            session.add(admin_user)
            await session.commit()
            api_logger.info(f"✓ 默认管理员用户创建成功 ({users_config.admin.username}/{users_config.admin.password})")
        else:
            api_logger.info("✓ 管理员用户已存在")
            
        api_logger.info("初始化白名单默认用户...")
        from app.core.auth import get_password_hash
        import uuid
        created_count = 0
        for student in users_config.students:
            res = await session.execute(select(User).where(User.username == student.username))
            if not res.scalar_one_or_none():
                new_user = User(
                    id=uuid.uuid4(),
                    email=student.email,
                    username=student.username,
                    hashed_password=get_password_hash(student.password),
                    is_active=True,
                    is_admin=False
                )
                session.add(new_user)
                created_count += 1
        if created_count > 0:
            await session.commit()
            api_logger.info(f"✓ 成功初始化 {created_count} 个白名单学生账号")
        else:
            api_logger.info("✓ 白名单学生账号已存在")
    
    yield
    # Shutdown code
    log_app_shutdown()

app = FastAPI(title="LearningPhysics API", lifespan=lifespan)

# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Add logging middleware (first for comprehensive logging)
app.add_middleware(APILoggingMiddleware)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Set up CORS middleware with specific allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|198\.18\.\d+\.\d+|.*tensor-orbit\.top)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import logs as logs_router_v1

# Include authentication routes first
app.include_router(auth_router_v1.router, prefix="/api/v1/auth", tags=["Authentication"])

# Include logs router
app.include_router(logs_router_v1.router, prefix="/api/v1/logs", tags=["Logs"])

# Include public topics endpoint (no auth required)
app.include_router(topics_router_v1.router, prefix="/api/v1/topics", tags=["Topics"])

# Include admin endpoints
app.include_router(admin_router_v1.router, prefix="/api/v1/admin", tags=["Admin"])

# Create a main router for the v1 API
api_router_v1 = APIRouter()

# Protect quiz endpoints by requiring authentication
api_router_v1.include_router(quiz_router_v1.router, prefix="/quiz", tags=["Quiz"])

# Include the v1 router into the main app
app.include_router(api_router_v1, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to the LearningPhysics API"}

@app.get("/health", tags=["Health"])
def health_check():
    """健康检查端点，用于监控和负载均衡器检测。"""
    return {"status": "ok"}


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "initdb":
        print("Manual database initialization...")
        asyncio.run(init_db())
        print("Database initialization complete.")
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
