"""Add user-owned conversations and link chat messages.

Revision ID: 0002_user_owned_conversations
Revises: 0001_initial_orca_schema
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_user_owned_conversations"
down_revision = "0001_initial_orca_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(255), nullable=False, server_default="New conversation"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    op.create_index("ix_conversations_updated_at", "conversations", ["updated_at"])
    if op.get_bind().dialect.name == "sqlite":
        op.execute(sa.text("ALTER TABLE chat_history ADD COLUMN conversation_id VARCHAR(36) "
                           "CONSTRAINT fk_chat_history_conversation_id REFERENCES conversations(id) ON DELETE CASCADE"))
    else:
        op.add_column("chat_history", sa.Column("conversation_id", sa.String(36), nullable=True))
        op.create_foreign_key("fk_chat_history_conversation_id", "chat_history", "conversations", ["conversation_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_chat_history_conversation_id", "chat_history", ["conversation_id"])


def downgrade():
    op.drop_index("ix_chat_history_conversation_id", table_name="chat_history")
    with op.batch_alter_table("chat_history") as batch:
        batch.drop_constraint("fk_chat_history_conversation_id", type_="foreignkey")
        batch.drop_column("conversation_id")
    op.drop_index("ix_conversations_updated_at", table_name="conversations")
    op.drop_index("ix_conversations_user_id", table_name="conversations")
    op.drop_table("conversations")
