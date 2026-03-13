import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User, UserMastery, KnowledgeNode
# from app.schemas.user import UserCreate, UserUpdate # Schema file doesn't exist yet, using Mock or Dict for now or finding real one
from app.schemas.auth import UserCreate # Checking if this is appropriate fallback
from app.core.auth import get_password_hash, verify_password


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """Get a user by username."""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    """Create a new user."""
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
    """Authenticate a user by username and password."""
    user = await get_user_by_username(db, username=username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def update_user(db: AsyncSession, user: User, user_in: Dict[str, Any]) -> User:
    """Update user information."""
    if "password" in user_in:
        user_in["hashed_password"] = get_password_hash(user_in.pop("password"))

    for field, value in user_in.items():
        if hasattr(user, field):
            setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_mastery(db: AsyncSession, user_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Get user's mastery for all knowledge nodes."""
    result = await db.execute(
        select(UserMastery, KnowledgeNode)
        .join(KnowledgeNode, UserMastery.node_id == KnowledgeNode.id)
        .where(UserMastery.user_id == user_id)
    )
    mastery_records = result.all()

    return [
        {
            "node_id": record.UserMastery.node_id,
            "node_name": record.KnowledgeNode.name,
            "mastery_score": record.UserMastery.mastery_score,
            "last_updated": record.UserMastery.last_updated
        }
        for record in mastery_records
    ]


async def update_user_mastery(
    db: AsyncSession,
    user_id: uuid.UUID,
    node_id: int,
    new_score: float
) -> UserMastery:
    """Update or create user's mastery for a specific knowledge node."""
    result = await db.execute(
        select(UserMastery)
        .where(UserMastery.user_id == user_id)
        .where(UserMastery.node_id == node_id)
    )
    mastery = result.scalar_one_or_none()

    if mastery:
        # EMA smoothing: 0.7 * old_score + 0.3 * new_score
        mastery.mastery_score = 0.7 * mastery.mastery_score + 0.3 * new_score
    else:
        mastery = UserMastery(
            user_id=user_id,
            node_id=node_id,
            mastery_score=new_score
        )
        db.add(mastery)

    await db.commit()
    await db.refresh(mastery)
    return mastery


async def get_user_progress(db: AsyncSession, user_id: uuid.UUID) -> Dict[str, Any]:
    """Get user's overall learning progress."""
    # Get mastery records
    mastery = await get_user_mastery(db, user_id)

    # Get total answered questions
    from app.models.models import ExamRecord
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.user_id == user_id)
    )
    exam_records = result.scalars().all()

    total_answered = len(exam_records)
    if total_answered == 0:
        correct_rate = 0.0
    else:
        correct_count = sum(1 for record in exam_records if record.is_correct)
        correct_rate = correct_count / total_answered

    return {
        "mastery": mastery,
        "total_questions_answered": total_answered,
        "correct_rate": correct_rate
    }