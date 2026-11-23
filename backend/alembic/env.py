import os
import sys
from logging.config import fileConfig
from typing import Any

from sqlalchemy import engine_from_config, event, pool

from alembic import context

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
import app.db.models  # Ensures all 16 models are registered in metadata
from app.db.session import configure_sqlite_connection, get_database_url

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata


def get_url() -> str:
    return get_database_url()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section) or {}
    db_url = get_url()
    configuration["sqlalchemy.url"] = db_url

    connect_args: dict[str, Any] = {}
    is_sqlite = db_url.startswith("sqlite")
    if is_sqlite:
        connect_args["check_same_thread"] = False
        connect_args["timeout"] = 30

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    if is_sqlite:
        @event.listens_for(connectable, "connect")
        def _set_sqlite_pragmas(dbapi_conn, connection_record):
            configure_sqlite_connection(
                dbapi_conn,
                connection_record,
                enable_wal=not db_url.endswith(":memory:"),
            )

    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection, target_metadata=target_metadata
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
