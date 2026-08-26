from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Example .env entry:
# DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/scm_db

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env file")

# Managed Postgres providers (Supabase, Neon, Render) require TLS on external
# connections; a local dev Postgres on localhost typically doesn't have it enabled.
_is_local_db = "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL
_connect_args = {} if _is_local_db else {"ssl": "require"}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # Set True to see raw SQL in terminal during dev
    pool_pre_ping=True,  # Reconnects if connection drops
    connect_args=_connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

# Dependency for FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Call this once on startup to create all tables
async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        from models import Base as ModelBase
        await conn.run_sync(ModelBase.metadata.create_all)