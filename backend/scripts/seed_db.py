import asyncio
import json
from uuid import uuid4
from sqlalchemy.future import select
import openai
from typing import List

from app.db.session import get_session, async_engine
from app.models.models import KnowledgeNode, Question, SQLModel
from app.core.config import settings

# --- New OpenAI Embedding Implementation ---
if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "YOUR_OPENAI_API_KEY":
    print("FATAL: OPENAI_API_KEY is not configured in your .env file.")
    print("Please set it to a valid key to generate embeddings.")
    exit(1)

client = openai.AsyncClient(api_key=settings.OPENAI_API_KEY)
EMBEDDING_MODEL = "text-embedding-3-small"

async def get_embedding(text: str) -> List[float]:
    """Generates a real embedding for a given text using the OpenAI API."""
    text = text.replace("\n", " ")
    try:
        response = await client.embeddings.create(input=[text], model=EMBEDDING_MODEL)
        return response.data[0].embedding
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        # Return a zero-vector on failure
        return [0.0] * 1536

async def seed_database():
    """
    Populates the database with initial knowledge nodes and questions.
    """
    print("Starting database seeding...")
    
    # --- Corrected Session Handling ---
    async for session in get_session():
        # 1. Create Knowledge Nodes
        print("Creating knowledge nodes...")
        
        result = await session.execute(select(KnowledgeNode).where(KnowledgeNode.code.in_(["mechanics", "NEWTON-LAW-2", "electromagnetism", "LORENTZ-FORCE"])))
        existing_nodes_map = {node.code: node for node in result.scalars().all()}
        
        # Define nodes to ensure they exist
        mech_node = existing_nodes_map.get("mechanics")
        if not mech_node:
            mech_node = KnowledgeNode(name="力学", code="mechanics", level=1, description="研究物体机械运动规律的科学")
            session.add(mech_node)
            await session.commit()
            await session.refresh(mech_node)

        em_node = existing_nodes_map.get("electromagnetism")
        if not em_node:
            em_node = KnowledgeNode(name="电磁学", code="electromagnetism", level=1, description="研究电荷、磁场及其相互作用的物理学分支")
            session.add(em_node)
            await session.commit()
            await session.refresh(em_node)
        
        if "NEWTON-LAW-2" not in existing_nodes_map:
            newton_law_node = KnowledgeNode(name="牛顿第二定律", code="NEWTON-LAW-2", level=2, parent_id=mech_node.id)
            session.add(newton_law_node)
        
        if "LORENTZ-FORCE" not in existing_nodes_map:
            lorentz_force_node = KnowledgeNode(name="洛伦兹力", code="LORENTZ-FORCE", level=2, parent_id=em_node.id)
            session.add(lorentz_force_node)
            
        await session.commit()
        print("Knowledge nodes created or verified.")

        # 2. Create Questions from DOMAIN_KNOWLEDGE.md
        print("Creating questions from domain knowledge file...")
        
        try:
            with open('.ai_context/DOMAIN_KNOWLEDGE.md', 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            print("Error: '.ai_context/DOMAIN_KNOWLEDGE.md' not found. Run script from project root.")
            return

        json_blocks = [block.strip() for block in content.split('```json') if '}' in block]
        
        node_map_res = await session.execute(select(KnowledgeNode))
        node_map = {node.code: node.id for node in node_map_res.scalars().all()}

        for block in json_blocks:
            try:
                clean_block = block.split('```')[0]
                question_data = json.loads(clean_block)
                
                node_code = question_data.get("primary_node_code")
                if not node_code or node_code not in node_map:
                    print(f"Skipping question with invalid node code: {node_code}")
                    continue

                content_latex = question_data["content_latex"]
                result = await session.execute(select(Question).where(Question.content_latex == content_latex))
                if result.scalars().first():
                    print(f"Skipping existing question: {content_latex[:30]}...")
                    continue
                
                print(f"Generating embedding for: {content_latex[:30]}...")
                # --- Await the real embedding function ---
                embedding_vector = await get_embedding(content_latex)
                
                new_question = Question(
                    id=uuid4(),
                    content_latex=content_latex,
                    difficulty=question_data["difficulty"],
                    question_type=question_data["question_type"],
                    primary_node_id=node_map[node_code],
                    answer_schema=question_data["answer_schema"],
                    solution_steps=question_data["solution_steps"],
                    embedding=embedding_vector
                )
                session.add(new_question)
                print(f"Added new question: {content_latex[:30]}...")
            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse JSON block. Error: {e}")
                continue
        
        await session.commit()
        print("Questions created.")
        break # Exit after one session pass

    print("Database seeding finished.")


async def main():
    print("Initializing database schema...")
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    print("Schema initialized.")
    
    await seed_database()


if __name__ == "__main__":
    print("Running DB Seeder...")
    asyncio.run(main())
    print("Seeder finished.")

