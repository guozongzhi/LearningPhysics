"""
Batch Question Import Tool
Usage: PYTHONPATH=. python import_questions.py [path_to_json]

Default file: data/questions.json

JSON format:
{
  "knowledge_nodes": [
    {"id": 101, "name": "牛顿定律", "code": "NEWTON-LAWS", "level": 1, "description": "..."}
  ],
  "questions": [
    {
      "topic_code": "NEWTON-LAWS",
      "content_latex": "题目内容，支持 $LaTeX$",
      "difficulty": 1,
      "question_type": "CALCULATION",
      "answer_schema": {"type": "value_unit", "correct_value": 5, "unit": "m/s^2", "tolerance": 0.1},
      "solution_steps": "解题步骤"
    }
  ]
}
"""

import asyncio
import json
import sys
from uuid import uuid4
from pathlib import Path

from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import get_session, async_engine
from app.models.models import KnowledgeNode, Question, ExamRecord, SQLModel


async def import_from_json(filepath: str):
    """Import knowledge nodes and questions from a JSON file."""

    # Read JSON file
    data_path = Path(filepath)
    if not data_path.exists():
        print(f"❌ File not found: {filepath}")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"📖 Reading from: {filepath}")

    # Ensure tables exist
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async for session in get_session():
        # --- Step 1: Import knowledge nodes ---
        nodes = data.get("knowledge_nodes", [])
        print(f"\n📚 Knowledge nodes: {len(nodes)}")

        for node_data in nodes:
            # Check if node already exists
            result = await session.execute(
                select(KnowledgeNode).where(KnowledgeNode.code == node_data["code"])
            )
            existing = result.scalars().first()

            if existing:
                # Update existing node
                existing.name = node_data["name"]
                existing.description = node_data.get("description")
                existing.level = node_data["level"]
                print(f"  ✏️  Updated: {node_data['name']} ({node_data['code']})")
            else:
                new_node = KnowledgeNode(
                    id=node_data.get("id"),
                    name=node_data["name"],
                    code=node_data["code"],
                    level=node_data["level"],
                    description=node_data.get("description"),
                )
                session.add(new_node)
                print(f"  ✅ Created: {node_data['name']} ({node_data['code']})")

        await session.commit()

        # --- Step 2: Build code -> id map ---
        result = await session.execute(select(KnowledgeNode))
        code_to_id = {node.code: node.id for node in result.scalars().all()}

        # --- Step 3: Import questions ---
        questions = data.get("questions", [])
        print(f"\n📝 Questions: {len(questions)}")

        active_contents = [q["content_latex"] for q in questions]
        added = 0
        skipped = 0

        for q in questions:
            topic_code = q.get("topic_code") or q.get("knowledge_code")
            if not topic_code or topic_code not in code_to_id:
                print(f"  ⚠️  Skipped (unknown topic '{topic_code}'): {q['content_latex'][:40]}...")
                skipped += 1
                continue

            # Check for duplicate by content
            result = await session.execute(
                select(Question).where(Question.content_latex == q["content_latex"])
            )
            if result.scalars().first():
                print(f"  ⏭️  Exists: {q['content_latex'][:40]}...")
                skipped += 1
                continue

            # Create zero-vector embedding (placeholder)
            zero_embedding = [0.0] * 1536

            new_question = Question(
                id=uuid4(),
                content_latex=q["content_latex"],
                difficulty=q["difficulty"],
                question_type=q["question_type"],
                answer_schema=q["answer_schema"],
                solution_steps=q["solution_steps"],
                embedding=zero_embedding,
                primary_node_id=code_to_id[topic_code],
            )
            session.add(new_question)
            added += 1
            print(f"  ✅ Added: {q['content_latex'][:40]}...")

        await session.commit()

        # --- Step 4: Cleanup unreferenced questions ---
        print("\n🗑️ Cleaning up old questions (preserving exam records)...")
        if active_contents:
            result = await session.execute(
                select(Question).where(Question.content_latex.notin_(active_contents))
            )
            old_qs = result.scalars().all()
            deleted_count = 0
            for oq in old_qs:
                er = await session.execute(select(ExamRecord).where(ExamRecord.question_id == oq.id))
                if not er.scalars().first():
                    await session.delete(oq)
                    deleted_count += 1
            await session.commit()
            print(f"  ✅ Deleted {deleted_count} unreferenced old questions.\n  ⚠️  Note: Some old questions may be retained if they have associated exam records.")

        print(f"\n🎉 Done! Added: {added}, Skipped: {skipped}")

        # Show summary
        result = await session.execute(select(KnowledgeNode))
        all_nodes = result.scalars().all()
        print(f"\n📊 Database summary:")
        for node in all_nodes:
            q_result = await session.execute(
                select(Question).where(Question.primary_node_id == node.id)
            )
            q_count = len(q_result.scalars().all())
            print(f"  {node.name} ({node.code}): {q_count} questions")

        break  # Exit generator


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else "data/questions.json"
    print("🚀 LearningPhysics Question Importer")
    print("=" * 40)
    asyncio.run(import_from_json(filepath))
