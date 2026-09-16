"""Canonical marine snapshots and durable chat request identity."""
from alembic import op
import sqlalchemy as sa
revision = "0005_marine_snapshots"
down_revision = "0004_device_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("marine_snapshots",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("request_key", sa.String(64), nullable=False, unique=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_marine_snapshots_user_id", "marine_snapshots", ["user_id"])
    op.create_table("chat_requests",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", sa.String(36), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_chat_requests_conversation_id", "chat_requests", ["conversation_id"])


def downgrade():
    op.drop_table("chat_requests")
    op.drop_table("marine_snapshots")
