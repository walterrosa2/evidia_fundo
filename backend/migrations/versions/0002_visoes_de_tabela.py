"""visoes de tabela por usuario (T015)

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-16 23:10:00
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "table_views",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("table_key", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "table_key", "name", name="uq_table_view_user_table_name"),
    )
    with op.batch_alter_table("table_views", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_table_views_organization_id"), ["organization_id"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_table_views_user_id"), ["user_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("table_views", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_table_views_user_id"))
        batch_op.drop_index(batch_op.f("ix_table_views_organization_id"))
    op.drop_table("table_views")
