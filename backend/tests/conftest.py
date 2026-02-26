import sys
import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator

# Add the project root directory to the sys.path to resolve module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

from main import app
from app.db.session import get_session

# Use a dedicated PostgreSQL test database with NullPool to avoid connection conflicts
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/learningphysics_test"

# NullPool disables connection pooling — each connection is created fresh and closed immediately.
# This avoids "another operation is in progress" errors with asyncpg in tests.
test_engine = create_async_engine(TEST_DATABASE_URL, echo=True, poolclass=NullPool)

# Create a session factory bound to the test engine
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession, expire_on_commit=False
)

async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency override for getting a test database session.
    """
    async with TestingSessionLocal() as session:
        yield session

# Apply the dependency override to the app
app.dependency_overrides[get_session] = override_get_session

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """
    Fixture to create and drop database tables for each test function.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture to provide an async test client.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c