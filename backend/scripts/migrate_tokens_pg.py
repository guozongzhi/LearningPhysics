import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def migrate_tokens():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN token_usage INTEGER DEFAULT 0 NOT NULL;"))
            print("Added token_usage column")
        except Exception as e:
            print(f"Token_usage maybe already exists: {e}")

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN token_limit INTEGER DEFAULT 100000 NOT NULL;"))
            print("Added token_limit column")
        except Exception as e:
            print(f"Token_limit maybe already exists: {e}")
            
    await engine.dispose()
    print("Migration finished successfully.")

if __name__ == "__main__":
    asyncio.run(migrate_tokens())
