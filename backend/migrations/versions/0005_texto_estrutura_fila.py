"""texto por pagina, estrutura do documento, evidencias de afirmacao e fila (T006/T007/T018)

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-17 13:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("document_versions", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("text_source", sa.String(length=20), nullable=False, server_default="none")
        )
        batch_op.add_column(
            sa.Column("text_pages", sa.Integer(), nullable=False, server_default="0")
        )
    with op.batch_alter_table("claims", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("origin", sa.String(length=20), nullable=False, server_default="manual")
        )

    op.create_table(
        "document_pages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("document_version_id", sa.String(length=36), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_version_id"], ["document_versions.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_version_id", "page_no", name="uq_document_page_version_no"),
    )
    op.create_index("ix_document_pages_organization_id", "document_pages", ["organization_id"])
    op.create_index(
        "ix_document_pages_document_version_id", "document_pages", ["document_version_id"]
    )

    op.create_table(
        "document_segments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), nullable=False),
        sa.Column("document_version_id", sa.String(length=36), nullable=False),
        sa.Column("label", sa.String(length=300), nullable=False),
        sa.Column("piece_type", sa.String(length=60), nullable=False),
        sa.Column("page_start", sa.Integer(), nullable=False),
        sa.Column("page_end", sa.Integer(), nullable=False),
        sa.Column("folio_start", sa.Integer(), nullable=True),
        sa.Column("folio_end", sa.Integer(), nullable=True),
        sa.Column("note", sa.String(length=600), nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_version_id"], ["document_versions.id"]),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_document_segments_organization_id", "document_segments", ["organization_id"]
    )
    op.create_index("ix_document_segments_opportunity_id", "document_segments", ["opportunity_id"])
    op.create_index(
        "ix_document_segments_document_version_id", "document_segments", ["document_version_id"]
    )

    op.create_table(
        "claim_evidences",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("claim_id", sa.String(length=36), nullable=False),
        sa.Column("stance", sa.String(length=20), nullable=False),
        sa.Column("document_version_id", sa.String(length=36), nullable=False),
        sa.Column("page_start", sa.Integer(), nullable=False),
        sa.Column("page_end", sa.Integer(), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["claim_id"], ["claims.id"]),
        sa.ForeignKeyConstraint(["document_version_id"], ["document_versions.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_claim_evidences_organization_id", "claim_evidences", ["organization_id"])
    op.create_index("ix_claim_evidences_claim_id", "claim_evidences", ["claim_id"])

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), nullable=True),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("target_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("error", sa.String(length=500), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_organization_id", "jobs", ["organization_id"])
    op.create_index("ix_jobs_opportunity_id", "jobs", ["opportunity_id"])
    op.create_index("ix_jobs_target_id", "jobs", ["target_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("claim_evidences")
    op.drop_table("document_segments")
    op.drop_table("document_pages")
    with op.batch_alter_table("claims", schema=None) as batch_op:
        batch_op.drop_column("origin")
    with op.batch_alter_table("document_versions", schema=None) as batch_op:
        batch_op.drop_column("text_pages")
        batch_op.drop_column("text_source")
