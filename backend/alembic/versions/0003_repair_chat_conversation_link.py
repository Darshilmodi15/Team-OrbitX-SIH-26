"""Repair databases stamped at 0002 without the chat conversation column.

Revision ID: 0003_repair_chat_link
Revises: 0002_user_owned_conversations
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_repair_chat_link"
down_revision = "0002_user_owned_conversations"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("chat_history")}
    if "conversation_id" not in columns:
        # Nullable: legacy messages remain untouched and are not reassigned to users.
        # Inline REFERENCES works on PostgreSQL and SQLite without rebuilding data.
        op.execute(sa.text(
            "ALTER TABLE chat_history ADD COLUMN conversation_id VARCHAR(36) "
            "CONSTRAINT fk_chat_history_conversation_id REFERENCES conversations(id) ON DELETE CASCADE"
        ))
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("chat_history")}
    if "ix_chat_history_conversation_id" not in indexes:
        op.create_index("ix_chat_history_conversation_id", "chat_history", ["conversation_id"])


def downgrade():
    # This restores a column owned by revision 0002. Never remove it on rollback.
    pass
