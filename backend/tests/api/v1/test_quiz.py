import pytest
from httpx import AsyncClient
import uuid

from app.models.models import KnowledgeNode, Question
from app.db.session import get_session

# Using pytest-asyncio for async tests
pytestmark = pytest.mark.asyncio

@pytest.fixture(scope="function")
async def populate_db(setup_database):
    """Fixture to populate the test database with initial data."""
    async for session in get_session():
        # Create a knowledge node
        node = KnowledgeNode(id=101, name="Test Node", code="TEST-001", level=1)
        session.add(node)
        await session.commit()

        # Create a question associated with the node
        # The embedding is a list of zeros because we are using SQLite for testing
        question = Question(
            id=uuid.uuid4(),
            content_latex="What is 2+2?",
            difficulty=1,
            question_type="CALCULATION",
            primary_node_id=101,
            answer_schema={"type": "value_unit", "correct_value": 4, "unit": ""},
            solution_steps="2+2=4",
            embedding=[0.0] * 1536
        )
        session.add(question)
        await session.commit()
        await session.refresh(question)
        break # We only need one session pass
    
    return {"node": node, "question": question}


async def test_read_root(client: AsyncClient):
    """Test the root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the LeaningPhysics API"}

async def test_generate_quiz_happy_path(client: AsyncClient, populate_db):
    """Test the happy path for the quiz generation endpoint."""
    node_id = populate_db["node"].id
    
    request_data = {
        "topic_ids": [node_id],
        "difficulty_preference": "adaptive",
        "count": 1
    }
    
    response = await client.post("/api/v1/quiz/generate", json=request_data)
    
    assert response.status_code == 200
    
    response_json = response.json()
    assert "quiz_id" in response_json
    assert "questions" in response_json
    assert len(response_json["questions"]) == 1
    
    question_in_response = response_json["questions"][0]
    mock_question = populate_db["question"]
    
    assert question_in_response["id"] == str(mock_question.id)
    assert question_in_response["content_latex"] == mock_question.content_latex
    assert "answer_schema" not in question_in_response # Ensure sensitive data is not exposed

# Placeholder for submit endpoint test
async def test_submit_quiz_correct_answer():
    # This test will be implemented properly later.
    pass
