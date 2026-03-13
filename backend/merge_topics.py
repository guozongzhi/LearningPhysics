
import asyncio
from sqlmodel import select
from app.db.session import async_session_factory
from app.models.models import KnowledgeNode, Question, UserMastery

async def merge_topics():
    async with async_session_factory() as db:
        # Define target and duplicate IDs based on remote inspection
        target_id = 4
        duplicate_id = 105
        
        # 1. Verify they exist
        target = await db.get(KnowledgeNode, target_id)
        duplicate = await db.get(KnowledgeNode, duplicate_id)
        
        if not target or not duplicate:
            print(f"Error: Target ({target_id}) or Duplicate ({duplicate_id}) not found.")
            return

        print(f"Merging '{duplicate.name}' (Code: {duplicate.code}) into '{target.name}' (Code: {target.code})...")

        # 2. Reassign Questions
        q_result = await db.execute(select(Question).where(Question.primary_node_id == duplicate_id))
        questions = q_result.scalars().all()
        for q in questions:
            q.primary_node_id = target_id
        print(f"Reassigned {len(questions)} questions.")

        # 3. Reassign UserMastery
        m_result = await db.execute(select(UserMastery).where(UserMastery.node_id == duplicate_id))
        masteries = m_result.scalars().all()
        for m in masteries:
            # Check if target mastery already exists for this user
            existing_m_res = await db.execute(
                select(UserMastery).where(
                    UserMastery.user_id == m.user_id,
                    UserMastery.node_id == target_id
                )
            )
            existing_m = existing_m_res.scalar_one_or_none()
            if existing_m:
                # Merge logic: keep the higher score
                existing_m.mastery_score = max(existing_m.mastery_score, m.mastery_score)
                await db.delete(m)
            else:
                m.node_id = target_id
        print(f"Merged/Reassigned {len(masteries)} mastery records.")

        # 4. Standardize Description
        if not target.description or len(target.description) < len(duplicate.description):
             target.description = duplicate.description
        
        # 5. Delete Duplicate
        await db.delete(duplicate)
        
        await db.commit()
        print("Merge completed successfully!")

if __name__ == "__main__":
    asyncio.run(merge_topics())
