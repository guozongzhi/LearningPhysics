import sys
import os
import pytest
import asyncio
from typing import AsyncGenerator

# Add the project root directory to the sys.path to resolve module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.main import app
from app.db.session import get_session

# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create a new async engine for the test database
test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)

# Create a new sessionmaker for the test database
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency override for getting a test database session.
    """
    async with TestingSessionLocal() as session:
        yield session

# Apply the dependency override to the app
app.dependency_overrides[get_session] = override_get_session

@pytest.fixture(scope="session")
def event_loop():
    """
    Creates an instance of the default event loop for each test session.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function", autouse=True)
async def setup_database():
    """
    Fixture to create and drop database tables for each test function.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture to provide an async test client.
    """
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c