"""historico de revisao de achado de motor (T016)

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-17 11:30:00
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "engine_finding_reviews",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("finding_id", sa.String(length=36), nullable=False),
        sa.Column("reviewer_id", sa.String(length=36), nullable=False),
        sa.Column("reviewer_name", sa.String(length=200), nullable=False),
        sa.Column("before", sa.JSON(), nullable=False),
        sa.Column("after", sa.JSON(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["finding_id"], ["engine_findings.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("engine_finding_reviews", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_engine_finding_reviews_organization_id"),
            ["organization_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_engine_finding_reviews_finding_id"), ["finding_id"], unique=False
        )


def downgrade() -> None:
    with op.batch_alter_table("engine_finding_reviews", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_engine_finding_reviews_finding_id"))
        batch_op.drop_index(batch_op.f("ix_engine_finding_reviews_organization_id"))
    op.drop_table("engine_finding_reviews")
