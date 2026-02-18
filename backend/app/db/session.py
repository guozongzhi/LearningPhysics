from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Create an async engine
async_engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)

async def get_session() -> AsyncSession:
    """
    Dependency to get an async session for API endpoints.
    """
    async_session = sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

async def init_db():
    """
    Initializes the database by creating all tables.
    """
    async with async_engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all) # Use this to drop tables for a fresh start
        await conn.run_sync(SQLModel.metadata.create_all)

