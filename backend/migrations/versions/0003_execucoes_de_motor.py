"""execucoes de motor e achados (T008)

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-17 10:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "engine_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), nullable=False),
        sa.Column("engine", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("engine_status", sa.String(length=60), nullable=True),
        sa.Column("dossier_version", sa.Integer(), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column("document_version_id", sa.String(length=36), nullable=False),
        sa.Column("sent_filename", sa.String(length=300), nullable=False),
        sa.Column("simulated_side", sa.String(length=20), nullable=False),
        sa.Column("side_confirmed_by", sa.String(length=36), nullable=False),
        sa.Column("external_ref", sa.String(length=120), nullable=True),
        sa.Column("external_analysis_ref", sa.String(length=120), nullable=True),
        sa.Column("engine_version", sa.String(length=60), nullable=True),
        sa.Column("checklist_version", sa.String(length=60), nullable=True),
        sa.Column("prompt_version", sa.String(length=60), nullable=True),
        sa.Column("model", sa.String(length=120), nullable=True),
        sa.Column("blocks", sa.JSON(), nullable=False),
        sa.Column("limitations", sa.JSON(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("cost_amount", sa.String(length=40), nullable=True),
        sa.Column("cost_currency", sa.String(length=3), nullable=True),
        sa.Column("overall_risk_index", sa.String(length=20), nullable=True),
        sa.Column("request_id", sa.String(length=120), nullable=True),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False),
        sa.Column("stale", sa.Boolean(), nullable=False),
        sa.Column("stale_reason", sa.String(length=300), nullable=True),
        sa.Column("original", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["document_version_id"], ["document_versions.id"]),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_engine_run_idempotency_key"),
    )
    with op.batch_alter_table("engine_runs", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_engine_runs_organization_id"), ["organization_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_engine_runs_opportunity_id"), ["opportunity_id"], unique=False
        )

    op.create_table(
        "engine_findings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), nullable=False),
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=False),
        sa.Column("block_key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=400), nullable=False),
        sa.Column("basis", sa.Text(), nullable=False),
        sa.Column("consequence_hypothesis", sa.Text(), nullable=False),
        sa.Column("support_strength", sa.String(length=20), nullable=False),
        sa.Column("risk_index", sa.String(length=20), nullable=True),
        sa.Column("citations", sa.JSON(), nullable=False),
        sa.Column("pendencies", sa.JSON(), nullable=False),
        sa.Column("review_state", sa.String(length=20), nullable=False),
        sa.Column("original", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["engine_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id", "external_id", name="uq_engine_finding_run_external"),
    )
    with op.batch_alter_table("engine_findings", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_engine_findings_organization_id"), ["organization_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_engine_findings_opportunity_id"), ["opportunity_id"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_engine_findings_run_id"), ["run_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("engine_findings", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_engine_findings_run_id"))
        batch_op.drop_index(batch_op.f("ix_engine_findings_opportunity_id"))
        batch_op.drop_index(batch_op.f("ix_engine_findings_organization_id"))
    op.drop_table("engine_findings")
    with op.batch_alter_table("engine_runs", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_engine_runs_opportunity_id"))
        batch_op.drop_index(batch_op.f("ix_engine_runs_organization_id"))
    op.drop_table("engine_runs")
