"""
Database engine and session management for ORCA Marine AI.
Supports PostgreSQL on production (Render/Supabase) and SQLite for local development/testing.
"""
import importlib
import os
import logging
import re
from contextlib import contextmanager
from typing import Any, Generator

from sqlalchemy import create_engine, event
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

    # Strip unmatched/wrapping quotes and stray whitespace/newlines if pasted from dashboard UI
    url = url.strip().strip('"').strip("'").strip()

    if not url or url.lower() in ("none", "null", "undefined", "false", '""', "''"):
        # Fallback to local SQLite database in workspace
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "orca_dev.db")
        return f"sqlite:///{db_path}"

    if not url.startswith(("sqlite://", "postgres://", "postgresql://", "postgresql+")):
        embedded_pg = re.search(r'(postgres(?:ql)?(?:\+[a-z0-9_]+)?://[^\s"\']+)', url)
        if embedded_pg:
            url = embedded_pg.group(1)

    # Fix Render/Heroku postgres:// schema prefix
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Ensure compatibility with whichever postgres driver is installed (psycopg v3 or psycopg2)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        try:
            importlib.import_module("psycopg")
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        except ImportError:
            try:
                importlib.import_module("psycopg2")
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            except ImportError:
                pass

    # Safety check: ensure URL is parsable by SQLAlchemy
    try:
        from sqlalchemy.engine import make_url
        make_url(url)
    except Exception as exc:
        logger.warning("Malformed DATABASE_URL detected (%s).", type(exc).__name__)
        env_name = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT", "")).lower()
        if env_name in {"production", "prod"}:
            raise RuntimeError("Malformed DATABASE_URL in production.") from exc
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "orca_dev.db")
        return f"sqlite:///{db_path}"

    return url


DATABASE_URL = get_database_url()

# Configure engine arguments based on dialect
connect_args: dict[str, Any] = {}
engine_kwargs: dict[str, Any] = {"echo": False}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30
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

def configure_sqlite_connection(
    dbapi_conn,
    _connection_record=None,
    *,
    enable_wal: bool = True,
) -> None:
    """Configure SQLite WAL journal mode and busy timeout to prevent write-lock errors."""
    cursor = dbapi_conn.cursor()
    try:
        if enable_wal:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")
    finally:
        cursor.close()


engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

if DATABASE_URL.startswith("sqlite"):
    _sqlite_enable_wal = not DATABASE_URL.endswith(":memory:")

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, connection_record):
        configure_sqlite_connection(dbapi_conn, connection_record, enable_wal=_sqlite_enable_wal)

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
    from sqlalchemy import inspect, text
    from app.db.base import Base
    import app.db.models  # Ensure all models are imported into metadata
    Base.metadata.create_all(bind=engine)
    try:
        cols = {col["name"] for col in inspect(engine).get_columns("user_preferences")}
        if "vessel_class" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_preferences ADD COLUMN vessel_class VARCHAR(40)"))
    except Exception as exc:
        logger.warning("Column verification note on user_preferences: %s", type(exc).__name__)
    logger.info("Initialized database schema and tables.")
