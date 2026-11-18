"""Modelo de dados operacional.

Toda entidade carrega organization_id: autorizacao e sempre resolvida no servidor a
partir da sessao, nunca a partir de IDs enviados pela interface (P07).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from datetime import date as date_type
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from evidia.db import Base


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    username: Mapped[str] = mapped_column(String(120), unique=True)
    display_name: Mapped[str] = mapped_column(String(200), default="")
    password_hash: Mapped[str] = mapped_column(String(400))
    # admin | analyst | reviewer | viewer
    role: Mapped[str] = mapped_column(String(20), default="analyst")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    organization: Mapped[Organization] = relationship()


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship()


class Process(Base):
    """Processo judicial. Chave: organizacao + CNJ normalizado (US01)."""

    __tablename__ = "processes"
    __table_args__ = (UniqueConstraint("organization_id", "cnj", name="uq_process_org_cnj"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    # Nulo apenas em rascunho: caso sem CNJ valido nao e ligado por nome de parte.
    cnj: Mapped[str | None] = mapped_column(String(25), nullable=True)
    court_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    court_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | draft
    draft_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Opportunity(Base):
    """Oportunidade: processo + posicao avaliada + referencia de origem.

    Processo, oportunidade comercial e posicao economica sao entidades distintas.
    O contrato permanece 'not_defined' ate etapa futura (D1).
    """

    __tablename__ = "opportunities"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "process_id",
            "position_side",
            "origin_system",
            "origin_external_id",
            name="uq_opportunity_identity",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.id"), index=True)
    position_side: Mapped[str] = mapped_column(String(20))  # claimant | defendant
    represented_party: Mapped[str] = mapped_column(String(300), default="")
    title: Mapped[str] = mapped_column(String(400), default="")
    origin_system: Mapped[str] = mapped_column(String(60))
    origin_external_id: Mapped[str] = mapped_column(String(120))
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    contract_status: Mapped[str] = mapped_column(String(30), default="not_defined")
    # Incrementado a cada mudanca documental; analises guardam a versao em que rodaram.
    dossier_version: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    process: Mapped[Process] = relationship()


class OriginSnapshot(Base):
    __tablename__ = "origin_snapshots"
    __table_args__ = (
        UniqueConstraint("opportunity_id", "content_hash", name="uq_snapshot_opportunity_hash"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    version_no: Mapped[int] = mapped_column(Integer)
    origin_system: Mapped[str] = mapped_column(String(60))
    origin_external_id: Mapped[str] = mapped_column(String(120))
    content_hash: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    differences: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    source_updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[str] = mapped_column(String(36))


class ImportOperation(Base):
    """Uma operacao efetiva por chave de idempotencia; tentativas repetidas sao contadas."""

    __tablename__ = "import_operations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(64), unique=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"))
    snapshot_id: Mapped[str] = mapped_column(ForeignKey("origin_snapshots.id"))
    outcome: Mapped[str] = mapped_column(String(20))  # created | new_version
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ImportConflict(Base):
    """Divergencia de identidade (nome/polo/documento) entre snapshots: exige revisao."""

    __tablename__ = "import_conflicts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    snapshot_id: Mapped[str] = mapped_column(ForeignKey("origin_snapshots.id"))
    field: Mapped[str] = mapped_column(String(80))
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    incoming_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    # Tipo documental (peticao_inicial, contestacao, laudo...) — distinto da natureza
    # das afirmacoes contidas no documento (RF03).
    doc_type: Mapped[str] = mapped_column(String(60), default="nao_classificado")
    # full_record | piece | derived_report | metadata
    category: Mapped[str] = mapped_column(String(30), default="piece")
    current_version_no: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    versions: Mapped[list[DocumentVersion]] = relationship(
        back_populates="document", order_by="DocumentVersion.version_no"
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    __table_args__ = (UniqueConstraint("document_id", "version_no", name="uq_document_version_no"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    version_no: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    filename: Mapped[str] = mapped_column(String(300))
    media_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    # Contagem real do arquivo recebido; nulo quando o formato nao tem paginas.
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # stored | needs_ocr | password_protected
    state: Mapped[str] = mapped_column(String(30), default="stored")
    origin: Mapped[str] = mapped_column(String(40), default="upload")
    obtained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    uploaded_by: Mapped[str] = mapped_column(String(36))
    storage_key: Mapped[str] = mapped_column(String(300))
    # Origem do texto disponivel por pagina: none | native | text | ocr | mixed.
    text_source: Mapped[str] = mapped_column(String(20), default="none")
    text_pages: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    document: Mapped[Document] = relationship(back_populates="versions")


class MissingPiece(Base):
    """Peca citada ou esperada e nao recebida: lacuna explicita, nunca 'sem irregularidade'."""

    __tablename__ = "missing_pieces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    description: Mapped[str] = mapped_column(String(400))
    reason: Mapped[str] = mapped_column(String(400), default="")
    source: Mapped[str] = mapped_column(String(40), default="manual")  # manual | import
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | received | dismissed
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Claim(Base):
    """Afirmacao rastreavel extraida ou registrada sobre uma versao de documento."""

    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    document_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("document_versions.id"), nullable=True, index=True
    )
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    excerpt: Mapped[str] = mapped_column(Text, default="")
    text: Mapped[str] = mapped_column(Text)
    # documentary_finding | attributed_allegation | analytical_inference | human_conclusion
    nature: Mapped[str] = mapped_column(String(30))
    asserted_by: Mapped[str] = mapped_column(String(200), default="")
    subject: Mapped[str] = mapped_column(String(200), default="")
    premise_claim_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    # pending | in_review | validated | discarded | contested | inconclusive
    review_state: Mapped[str] = mapped_column(String(20), default="pending")
    dossier_version: Mapped[int] = mapped_column(Integer, default=0)
    stale: Mapped[bool] = mapped_column(Boolean, default=False)
    stale_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    extraction_confidence: Mapped[float | None] = mapped_column(nullable=True)
    # Como a afirmacao nasceu: manual | rules (regras locais) | llm (modelo, aceita por pessoa).
    origin: Mapped[str] = mapped_column(String(20), default="manual")
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    reviews: Mapped[list[ClaimReview]] = relationship(order_by="ClaimReview.created_at")


class ClaimReview(Base):
    """Historico de revisao: preserva antes/depois e autoria; nada e sobrescrito."""

    __tablename__ = "claim_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), index=True)
    reviewer_id: Mapped[str] = mapped_column(String(36))
    reviewer_name: Mapped[str] = mapped_column(String(200), default="")
    before: Mapped[dict[str, Any]] = mapped_column(JSON)
    after: Mapped[dict[str, Any]] = mapped_column(JSON)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CalculationRun(Base):
    """Execucao versionada do motor economico (entrada, formula e resultado)."""

    __tablename__ = "calculation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    formula_version: Mapped[str] = mapped_column(String(40))
    dossier_version: Mapped[int] = mapped_column(Integer)
    inputs: Mapped[dict[str, Any]] = mapped_column(JSON)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    stale: Mapped[bool] = mapped_column(Boolean, default=False)
    stale_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Memo(Base):
    """Memorando economico versionado: texto gerado de um demonstrativo gravado.

    Imutavel depois de criado; mudanca gera nova versao.
    """

    __tablename__ = "memos"
    __table_args__ = (
        UniqueConstraint("opportunity_id", "version", name="uq_memo_opportunity_version"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    calculation_run_id: Mapped[str] = mapped_column(ForeignKey("calculation_runs.id"))
    formula_version: Mapped[str] = mapped_column(String(40))
    dossier_version: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    notes: Mapped[str] = mapped_column(Text, default="")
    limitations: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    # Decisao do responsavel sobre esta versao: nulo | approved | returned.
    # Registra quem decidiu; nao altera o texto nem homologa a metodologia.
    decision: Mapped[str | None] = mapped_column(String(20), nullable=True)
    decision_comment: Mapped[str] = mapped_column(Text, default="")
    decided_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stale: Mapped[bool] = mapped_column(Boolean, default=False)
    stale_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TableView(Base):
    """Visao salva de uma tabela (RF16). Preferencia pessoal: nunca amplia permissao."""

    __tablename__ = "table_views"
    __table_args__ = (
        UniqueConstraint("user_id", "table_key", "name", name="uq_table_view_user_table_name"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    table_key: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(80))
    config: Mapped[dict[str, Any]] = mapped_column(JSON)
    # Aplicada ao abrir a tabela sem estado na URL.
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EngineRun(Base):
    """Execucao de motor especializado (RF04). Registrada antes da chamada externa."""

    __tablename__ = "engine_runs"
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_engine_run_idempotency_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    engine: Mapped[str] = mapped_column(String(30))
    # queued | running | partial | completed | failed | cancelled
    status: Mapped[str] = mapped_column(String(20), default="queued")
    # Rotulo de estado como veio do motor.
    engine_status: Mapped[str | None] = mapped_column(String(60), nullable=True)
    dossier_version: Mapped[int] = mapped_column(Integer)
    input_hash: Mapped[str] = mapped_column(String(64))
    # organizacao + oportunidade + motor + hash do documento + lado + versao do dossie.
    idempotency_key: Mapped[str] = mapped_column(String(64))
    document_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"))
    sent_filename: Mapped[str] = mapped_column(String(300))
    simulated_side: Mapped[str] = mapped_column(String(20))
    side_confirmed_by: Mapped[str] = mapped_column(String(36))
    # Mapa de evidencias entregue ao motor antes da analise: versao do documento, arquivo e
    # quantos itens o motor leu. Nulo = execucao sem mapa.
    evidence_map: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # Identificador do caso no motor: e por ele que a execucao e reconciliada.
    external_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    external_analysis_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    engine_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    checklist_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    blocks: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    limitations: Mapped[list[str]] = mapped_column(JSON, default=list)
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    # Nulo = desconhecido (nunca zero presumido). Texto decimal.
    cost_amount: Mapped[str | None] = mapped_column(String(40), nullable=True)
    cost_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    overall_risk_index: Mapped[str | None] = mapped_column(String(20), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    stale: Mapped[bool] = mapped_column(Boolean, default=False)
    stale_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # Saida original do motor (sem os achados, guardados um a um).
    original: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EngineFinding(Base):
    """Achado normalizado de um motor; `original` guarda a saida sem alteracao."""

    __tablename__ = "engine_findings"
    __table_args__ = (
        UniqueConstraint("run_id", "external_id", name="uq_engine_finding_run_external"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("engine_runs.id"), index=True)
    external_id: Mapped[str] = mapped_column(String(120))
    block_key: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(400))
    basis: Mapped[str] = mapped_column(Text, default="")
    consequence_hypothesis: Mapped[str] = mapped_column(Text, default="")
    support_strength: Mapped[str] = mapped_column(String(20), default="not_assessed")
    risk_index: Mapped[str | None] = mapped_column(String(20), nullable=True)
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    pendencies: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    review_state: Mapped[str] = mapped_column(String(20), default="pending")
    original: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FindingClaimLink(Base):
    """Vinculo declarado por pessoa entre um achado de motor e uma afirmacao do dossie.

    O vinculo nao valida nenhum dos dois: registra a relacao e quem a apontou.
    """

    __tablename__ = "finding_claim_links"
    __table_args__ = (UniqueConstraint("finding_id", "claim_id", name="uq_finding_claim_link"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    finding_id: Mapped[str] = mapped_column(ForeignKey("engine_findings.id"), index=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), index=True)
    # supports (a afirmacao sustenta o achado) | contradicts | related
    relation: Mapped[str] = mapped_column(String(20))
    note: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EngineFindingReview(Base):
    """Historico de revisao de achado de motor: antes/depois e autoria; nada e sobrescrito."""

    __tablename__ = "engine_finding_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    finding_id: Mapped[str] = mapped_column(ForeignKey("engine_findings.id"), index=True)
    reviewer_id: Mapped[str] = mapped_column(String(36))
    reviewer_name: Mapped[str] = mapped_column(String(200), default="")
    before: Mapped[dict[str, Any]] = mapped_column(JSON)
    after: Mapped[dict[str, Any]] = mapped_column(JSON)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DocumentPage(Base):
    """Texto de uma pagina do arquivo recebido. Leitura derivada: o original e a fonte."""

    __tablename__ = "document_pages"
    __table_args__ = (
        UniqueConstraint("document_version_id", "page_no", name="uq_document_page_version_no"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    document_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"), index=True)
    page_no: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    # native | text | ocr
    source: Mapped[str] = mapped_column(String(20))
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DocumentSegment(Base):
    """Peca dentro de um documento: intervalo de paginas do arquivo e, se conhecida, a
    numeracao de folhas do processo. Pagina do arquivo e folha impressa sao coisas distintas."""

    __tablename__ = "document_segments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    document_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"), index=True)
    label: Mapped[str] = mapped_column(String(300))
    piece_type: Mapped[str] = mapped_column(String(60), default="nao_classificado")
    page_start: Mapped[int] = mapped_column(Integer)
    page_end: Mapped[int] = mapped_column(Integer)
    folio_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    folio_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str] = mapped_column(String(600), default="")
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ClaimEvidence(Base):
    """Evidencia favoravel ou contraria a uma afirmacao, com documento e pagina."""

    __tablename__ = "claim_evidences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), index=True)
    # supporting | contrary
    stance: Mapped[str] = mapped_column(String(20))
    document_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"))
    page_start: Mapped[int] = mapped_column(Integer)
    page_end: Mapped[int] = mapped_column(Integer)
    excerpt: Mapped[str] = mapped_column(Text, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Job(Base):
    """Trabalho em segundo plano (ADR-004)."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str | None] = mapped_column(
        ForeignKey("opportunities.id"), nullable=True, index=True
    )
    kind: Mapped[str] = mapped_column(String(40))
    target_id: Mapped[str] = mapped_column(String(36), index=True)
    # queued | running | completed | failed | cancelled
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Participant(Base):
    """Pessoa ou empresa envolvida (RF07). O papel fica na relacao com o processo, nao aqui.

    Fichas nunca sao unidas pelo nome. `merged_into_id` registra uma uniao decidida por
    revisor; a ficha de origem e preservada e a uniao pode ser desfeita.
    """

    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="person")  # person | company
    name: Mapped[str] = mapped_column(String(300))
    name_key: Mapped[str] = mapped_column(String(300), index=True)
    identifiers: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    specialty: Mapped[str] = mapped_column(String(200), default="")
    locality: Mapped[str] = mapped_column(String(200), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    identity_status: Mapped[str] = mapped_column(String(20), default="candidate")
    identity_note: Mapped[str] = mapped_column(Text, default="")
    merged_into_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    merge_log: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProcessRole(Base):
    """Papel de um participante em um processo, com a data do ato ou atuacao."""

    __tablename__ = "process_roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"), index=True)
    cnj: Mapped[str] = mapped_column(String(40), index=True)
    court: Mapped[str] = mapped_column(String(80), default="")
    # court_expert | party_assistant | lawyer | judge | party | other
    role: Mapped[str] = mapped_column(String(30))
    side: Mapped[str] = mapped_column(String(20), default="none")
    # Data do ato (nomeacao, laudo, decisao). Diferente da distribuicao do processo.
    event_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    event_label: Mapped[str] = mapped_column(String(200), default="")
    filing_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    source_kind: Mapped[str] = mapped_column(String(20), default="manual")
    document_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("document_versions.id"), nullable=True
    )
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_ref: Mapped[str] = mapped_column(String(500), default="")
    search_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DiligenceSearch(Base):
    """Uma consulta a uma fonte: janela, criterios, cobertura declarada e desfecho.
    'Nao foi possivel consultar' e 'nada encontrado' sao estados diferentes."""

    __tablename__ = "diligence_searches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"), index=True)
    connector: Mapped[str] = mapped_column(String(60))
    reference_date: Mapped[date_type] = mapped_column(Date)
    window_start: Mapped[date_type] = mapped_column(Date)
    window_end: Mapped[date_type] = mapped_column(Date)
    timezone: Mapped[str] = mapped_column(String(60))
    criteria: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20))  # completed | no_results | failed
    coverage: Mapped[str] = mapped_column(Text, default="")
    filter_field: Mapped[str | None] = mapped_column(String(20), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(60), nullable=True)
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Occurrence(Base):
    """Ocorrencia de diligencia (RF11/RF12). Nasce candidata; nunca entra validada."""

    __tablename__ = "occurrences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    relation: Mapped[str | None] = mapped_column(String(30), nullable=True)
    state: Mapped[str] = mapped_column(String(30), default="candidate")
    subject_participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"), index=True)
    related_participant_id: Mapped[str | None] = mapped_column(
        ForeignKey("participants.id"), nullable=True
    )
    cnj: Mapped[str] = mapped_column(String(40), default="")
    fact_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    document_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("document_versions.id"), nullable=True
    )
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_url: Mapped[str] = mapped_column(String(1000), default="")
    # Integridade da copia preservada; nao prova autenticidade nem verdade do conteudo.
    material_hash: Mapped[str] = mapped_column(String(64), default="")
    sheet: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OccurrenceReview(Base):
    __tablename__ = "occurrence_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    occurrence_id: Mapped[str] = mapped_column(ForeignKey("occurrences.id"), index=True)
    reviewer_id: Mapped[str] = mapped_column(String(36))
    reviewer_name: Mapped[str] = mapped_column(String(200), default="")
    before: Mapped[dict[str, Any]] = mapped_column(JSON)
    after: Mapped[dict[str, Any]] = mapped_column(JSON)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Plea(Base):
    """Pedido individualizado do processo (RF06). Lista quem pede e contra quem."""

    __tablename__ = "pleas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    claimant_participant_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    defendant_participant_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ScenarioRun(Base):
    """Cenario de um participante para um pedido, simulando um lado.

    O lado simulado e o papel de quem argumenta; nao e a posicao economica de quem investe.
    """

    __tablename__ = "scenario_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    plea_id: Mapped[str] = mapped_column(ForeignKey("pleas.id"), index=True)
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"))
    simulated_side: Mapped[str] = mapped_column(String(20))
    dossier_version: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="running")
    source: Mapped[str] = mapped_column(String(20), default="manual")  # manual | model
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False)
    limitations: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ScenarioArgumentRow(Base):
    """Argumento de um cenario. Pertence a um unico cenario: nao vira fato no outro lado."""

    __tablename__ = "scenario_arguments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("scenario_runs.id"), index=True)
    formulated_by: Mapped[str] = mapped_column(String(36))
    against: Mapped[str] = mapped_column(String(36))
    affected_act: Mapped[str] = mapped_column(String(400), default="")
    # source_evidence | scenario_inference
    origin: Mapped[str] = mapped_column(String(30))
    hypothesis: Mapped[str] = mapped_column(Text)
    counter_evidence: Mapped[str] = mapped_column(Text, default="")
    mitigation: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[str] = mapped_column(String(20), default="not_assessed")
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    pendencies: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # supported | hypothesis_for_validation
    status: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class P4Request(Base):
    """Pedido de execucao do P4 (T009). O P4 nao tem API: a execucao e feita fora, por quem
    tem autorizacao, com o pacote de entrada gerado aqui; o pedido fecha na importacao."""

    __tablename__ = "p4_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    document_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"))
    simulated_side: Mapped[str] = mapped_column(String(20))
    note: Mapped[str] = mapped_column(Text, default="")
    # awaiting_external | imported | cancelled
    status: Mapped[str] = mapped_column(String(20), default="awaiting_external")
    dossier_version: Mapped[int] = mapped_column(Integer)
    pages: Mapped[int] = mapped_column(Integer)
    package_sha256: Mapped[str] = mapped_column(String(64))
    # Linhas do texto que o P4 leria como marcador de pagina (ex.: "fls. 12" no corpo).
    ambiguous_markers: Mapped[int] = mapped_column(Integer, default=0)
    run_id: Mapped[str | None] = mapped_column(ForeignKey("engine_runs.id"), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class P4Item(Base):
    """Item do relatorio do P4: prova, quesito ou resposta. `original` guarda a linha lida."""

    __tablename__ = "p4_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("engine_runs.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    # evidence | question | answer
    kind: Mapped[str] = mapped_column(String(20))
    index_key: Mapped[str] = mapped_column(String(60), default="")
    evidence_type: Mapped[str] = mapped_column(String(200), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    # Referencia como o P4 escreveu (texto livre) e a pagina extraida dela, se houver.
    reference_raw: Mapped[str] = mapped_column(String(400), default="")
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    question: Mapped[str] = mapped_column(Text, default="")
    answer: Mapped[str] = mapped_column(Text, default="")
    technical_status: Mapped[str] = mapped_column(String(200), default="")
    justification: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    pendencies: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    original: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
