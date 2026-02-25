import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
import asyncio
from contextlib import asynccontextmanager

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

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Skip rate limiting for authentication endpoints to allow login/register
        if request.url.path.startswith("/api/v1/auth"):
            response = await call_next(request)
            return response

        # Apply rate limiting to other endpoints
        rate_limit_middleware(request)
        response = await call_next(request)
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    print("Starting up...")
    yield
    # Code to run on shutdown
    print("Shutting down...")

app = FastAPI(title="LeaningPhysics API", lifespan=lifespan)

# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Add rate limiting middleware (before CORS for proper handling)
app.add_middleware(RateLimitMiddleware)

# Set up CORS middleware with specific allowed origins
origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://localhost:3001",  # Alternative Next.js port
    "http://localhost:8000",  # Local API server (for testing)
    "http://127.0.0.1:3000",  # Alternative localhost format
    "http://127.0.0.1:3001",  # Alternative localhost format
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # More specific methods
    allow_headers=["*"],  # Allow all headers - consider restricting further in production
)

# Include authentication routes first
app.include_router(auth_router_v1.router, prefix="/api/v1/auth", tags=["Authentication"])

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
    return {"message": "Welcome to the LeaningPhysics API"}


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "initdb":
        print("Manual database initialization...")
        asyncio.run(init_db())
        print("Database initialization complete.")
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
