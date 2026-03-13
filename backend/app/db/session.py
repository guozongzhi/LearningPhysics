from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings

# Create an async engine
async_engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)

# Create a global session factory
async_session_factory = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncSession:
    """
    Dependency to get an async session for API endpoints.
    """
    async with async_session_factory() as session:
        yield session

async def init_db():
    """
    Initializes the database by creating all tables.
    """
    from app.models.models import PGVECTOR_AVAILABLE
    async with async_engine.begin() as conn:
        if PGVECTOR_AVAILABLE:
            # Enable pgvector extension if available
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # await conn.run_sync(SQLModel.metadata.drop_all) # Use this to drop tables for a fresh start
        await conn.run_sync(SQLModel.metadata.create_all)

