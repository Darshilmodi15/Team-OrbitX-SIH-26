import importlib.util
from pathlib import Path
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


def test_stamped_legacy_chat_schema_is_repaired_without_losing_messages():
    path = Path(__file__).parents[1] / "alembic/versions/0003_repair_chat_conversation_link.py"
    spec = importlib.util.spec_from_file_location("repair_chat", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=ON"))
        connection.execute(text("CREATE TABLE conversations (id VARCHAR(36) PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE chat_history (id VARCHAR(36) PRIMARY KEY, message TEXT NOT NULL)"))
        connection.execute(text("INSERT INTO chat_history VALUES ('old', 'Existing message')"))
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            migration.upgrade()  # Safe on an already repaired database.
        assert connection.execute(text("SELECT message, conversation_id FROM chat_history")).one() == ("Existing message", None)
        assert "ix_chat_history_conversation_id" in {i['name'] for i in inspect(connection).get_indexes('chat_history')}
        assert any(f['constrained_columns'] == ['conversation_id'] and f['referred_table'] == 'conversations' for f in inspect(connection).get_foreign_keys('chat_history'))
        connection.execute(text("INSERT INTO conversations VALUES ('new')"))
        connection.execute(text("INSERT INTO chat_history VALUES ('new-message', 'New message', 'new')"))
        assert connection.execute(text("SELECT message FROM chat_history WHERE conversation_id = 'new'")).scalar() == 'New message'
