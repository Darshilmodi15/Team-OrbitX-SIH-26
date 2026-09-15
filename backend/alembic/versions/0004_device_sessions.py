"""Independent revocable login sessions.

Revision ID: 0004_device_sessions
"""
from alembic import op
import sqlalchemy as sa
revision = "0004_device_sessions"
down_revision = "0003_repair_chat_link"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("device_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_device_sessions_user_id", "device_sessions", ["user_id"])


def downgrade():
    op.drop_table("device_sessions")
