"""
Database engine and session management for ORCA Marine AI.
Supports PostgreSQL on production (Render/Supabase) and SQLite for local development/testing.
"""
import os
import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

logger = logging.getLogger(__name__)

def get_database_url() -> str:
    """
    Retrieves and normalizes DATABASE_URL from environment variables.
    Handles 'postgres://' -> 'postgresql://' conversion for modern SQLAlchemy on Render/Heroku.
    Defaults to local SQLite if not configured.
    """
    url = os.getenv("DATABASE_URL", "").strip()

    # Strip wrapping quotes if pasted with quotes ("..." or '...')
    if (url.startswith('"') and url.endswith('"')) or (url.startswith("'") and url.endswith("'")):
        url = url[1:-1].strip()

    if not url or url.lower() in ("none", "null", "undefined", "false", '""', "''"):
        # Fallback to local SQLite database in workspace
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "orca_dev.db")
        return f"sqlite:///{db_path}"

    # Fix Render/Heroku postgres:// schema prefix
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Ensure compatibility with whichever postgres driver is installed (psycopg v3 or psycopg2)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        try:
            import psycopg  # noqa: F401 - psycopg 3
        except ImportError:
            try:
                import psycopg2  # noqa: F401 - fallback to psycopg2
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            except ImportError:
                pass

    # Safety check: ensure URL is parsable by SQLAlchemy
    try:
        from sqlalchemy.engine import make_url
        make_url(url)
    except Exception as exc:
        logger.warning("Malformed DATABASE_URL detected (%s). Falling back to local SQLite.", exc)
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "orca_dev.db")
        return f"sqlite:///{db_path}"

    return url


DATABASE_URL = get_database_url()

# Configure engine arguments based on dialect
connect_args = {}
engine_kwargs = {"echo": False}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    if DATABASE_URL.endswith(":memory:"):
        engine_kwargs["poolclass"] = StaticPool
else:
    # PostgreSQL production pool settings
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
        "pool_recycle": 1800,  # recycle connections after 30 minutes
    })

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database session lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager for standalone scripts, background workers, and seeders."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Creates all registered SQLAlchemy tables if they do not already exist."""
    from app.db.base import Base
    import app.db.models  # Ensure all models are imported into metadata
    Base.metadata.create_all(bind=engine)
    logger.info("Initialized database schema and tables.")
