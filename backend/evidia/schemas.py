"""Contratos de entrada e saida da API (versao v1).

Estes modelos sao o contrato: o OpenAPI exportado em
specs/001-evidia-operacional/contracts/openapi.json e gerado a partir deles.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PositionSide = Literal["claimant", "defendant"]
ClaimNature = Literal[
    "documentary_finding", "attributed_allegation", "analytical_inference", "human_conclusion"
]
ReviewState = Literal["pending", "in_review", "validated", "discarded", "contested", "inconclusive"]
DocumentCategory = Literal["full_record", "piece", "derived_report", "metadata"]


def _no_float(value: Any) -> Any:
    # Dinheiro chega como texto ou inteiro; float binario perderia centavos.
    if isinstance(value, float):
        raise ValueError('use texto decimal (ex.: "1000.50"), não número de ponto flutuante')
    return value


Dec = Annotated[Decimal, BeforeValidator(_no_float)]


class Model(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


# ------------------------------------------------------------------------ erro


class ErrorBody(Model):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(Model):
    error: ErrorBody
    correlation_id: str


# ------------------------------------------------------------------------ auth


class LoginRequest(Model):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)


class UserOut(Model):
    id: str
    username: str
    display_name: str
    role: str
    organization_id: str
    organization_name: str


class HealthOut(Model):
    status: Literal["ok"]
    service: str
    version: str
    mode: Literal["operational"]
    origination_mode: str
    # Modos dos motores: a tela usa para nao chamar de simulada uma execucao real.
    nulidade360_mode: str = "disabled"
    llm_mode: str = "disabled"


# ------------------------------------------------------------------ originacao


class CandidateOut(Model):
    external_id: str
    commercial_case_id: int | None = None
    cnj_raw: str | None = None
    cnj_valid: bool
    title: str | None = None
    claimant: str | None = None
    defendant: str | None = None
    case_class: str | None = None
    has_study: bool
    source_updated_at: str | None = None
    # Cadastro do processo na origem; nulos quando a origem nao os informa.
    court: str | None = None
    origin_status: str | None = None
    filing_date: str | None = None
    is_lead: bool = False
    searched_company_cnpj: str | None = None
    already_imported_sides: list[PositionSide] = []


class CandidateList(Model):
    origin_system: str
    is_synthetic: bool
    consulted_at: datetime
    items: list[CandidateOut]


class ImportRequest(Model):
    external_id: str = Field(min_length=1, max_length=120)
    # Posicao e parte precisam ser confirmadas por quem importa; nao ha valor padrao.
    position_side: PositionSide
    represented_party: str = Field(min_length=1, max_length=300)


class ImportOut(Model):
    operation_id: str
    opportunity_id: str
    snapshot_id: str
    outcome: Literal["created", "new_version", "reused"]
    attempts: int
    is_draft: bool
    conflicts: int


# --------------------------------------------------------------- oportunidade


class ProcessOut(Model):
    id: str
    cnj: str | None
    court_code: str | None
    court_label: str | None
    status: str
    draft_reason: str | None


class OpportunitySummary(Model):
    id: str
    title: str
    position_side: PositionSide
    represented_party: str
    origin_system: str
    origin_external_id: str
    is_synthetic: bool
    contract_status: str
    dossier_version: int
    created_at: datetime
    updated_at: datetime
    process: ProcessOut
    documents_count: int
    open_gaps_count: int
    open_conflicts_count: int
    claims_count: int
    has_full_record: bool


class SnapshotOut(Model):
    id: str
    version_no: int
    origin_system: str
    origin_external_id: str
    content_hash: str
    is_synthetic: bool
    source_updated_at: str | None
    fetched_at: datetime
    payload: dict[str, Any]
    differences: list[dict[str, Any]]


class ConflictOut(Model):
    id: str
    field: str
    previous_value: str | None
    incoming_value: str | None
    status: str
    created_at: datetime


class MissingPieceOut(Model):
    id: str
    description: str
    reason: str
    source: str
    status: str
    created_at: datetime


class MissingPieceCreate(Model):
    description: str = Field(min_length=3, max_length=400)
    reason: str = Field(default="", max_length=400)


class MissingPieceUpdate(Model):
    status: Literal["open", "received", "dismissed"]


class DocumentVersionOut(Model):
    id: str
    document_id: str
    version_no: int
    sha256: str
    filename: str
    media_type: str
    size_bytes: int
    page_count: int | None
    state: str
    origin: str
    obtained_at: datetime
    uploaded_by: str
    is_current: bool
    # Origem do texto por pagina: none | native | text | ocr | mixed.
    text_source: str = "none"
    text_pages: int = 0


class DocumentOut(Model):
    id: str
    title: str
    doc_type: str
    category: DocumentCategory
    current_version_no: int
    created_at: datetime
    versions: list[DocumentVersionOut]


class DocumentUploadOut(Model):
    document: DocumentOut
    version: DocumentVersionOut
    duplicate: bool
    superseded_claims: int
    superseded_calculations: int
    dossier_version: int


class OriginDocumentResult(Model):
    """Resultado da importacao de um relatorio derivado da originacao."""

    kind: str
    title: str
    # stored | duplicate | not_available (a origem nao tem) | rejected (arquivo invalido)
    outcome: Literal["stored", "duplicate", "not_available", "rejected"]
    reason: str = ""
    document_id: str | None = None
    version_id: str | None = None


class OriginDocumentsOut(Model):
    results: list[OriginDocumentResult]
    dossier_version: int


class OpportunityDetail(OpportunitySummary):
    snapshots: list[SnapshotOut]
    conflicts: list[ConflictOut]
    missing_pieces: list[MissingPieceOut]
    documents: list[DocumentOut]
    # Parecer integral so pode ser concluido com autos integrais recebidos (AC02).
    integral_opinion_allowed: bool
    integral_opinion_blockers: list[str]


# ------------------------------------------------------------------ afirmacao


class ClaimCreate(Model):
    text: str = Field(min_length=3, max_length=5000)
    nature: ClaimNature
    asserted_by: str = Field(default="", max_length=200)
    subject: str = Field(default="", max_length=200)
    document_version_id: str | None = None
    page_start: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    excerpt: str = Field(default="", max_length=5000)
    premise_claim_ids: list[str] = []
    # Sugestao aceita por uma pessoa guarda de onde veio e a confianca da extracao.
    origin: Literal["manual", "rules", "llm"] = "manual"
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)


class ClaimReviewRequest(Model):
    review_state: ReviewState | None = None
    text: str | None = Field(default=None, min_length=3, max_length=5000)
    nature: ClaimNature | None = None
    document_version_id: str | None = None
    page_start: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    comment: str = Field(default="", max_length=2000)


class ClaimBulkReviewRequest(Model):
    """Acao em massa: so o encaminhamento para revisao, que nao exige fundamento por linha."""

    ids: list[str] = Field(min_length=1, max_length=500)
    review_state: Literal["in_review"]


class BulkSkipped(Model):
    id: str
    reason: str


class ClaimBulkReviewOut(Model):
    updated: int
    skipped: list[BulkSkipped]


class ClaimReviewOut(Model):
    id: str
    reviewer_id: str
    reviewer_name: str
    before: dict[str, Any]
    after: dict[str, Any]
    comment: str
    created_at: datetime


class ClaimEvidenceIn(Model):
    stance: Literal["supporting", "contrary"]
    document_version_id: str = Field(min_length=1, max_length=36)
    page_start: int = Field(ge=1)
    page_end: int | None = Field(default=None, ge=1)
    excerpt: str = Field(default="", max_length=5000)
    note: str = Field(default="", max_length=2000)


class ClaimEvidenceOut(Model):
    id: str
    claim_id: str
    stance: Literal["supporting", "contrary"]
    document_version_id: str
    document_title: str | None
    document_version_no: int | None
    is_current_version: bool
    page_start: int
    page_end: int
    excerpt: str
    note: str
    created_by: str
    created_at: datetime


class ClaimOut(Model):
    id: str
    opportunity_id: str
    text: str
    nature: ClaimNature
    asserted_by: str
    subject: str
    document_version_id: str | None
    document_title: str | None
    document_version_no: int | None
    page_start: int | None
    page_end: int | None
    excerpt: str
    premise_claim_ids: list[str]
    review_state: ReviewState
    dossier_version: int
    stale: bool
    stale_reason: str | None
    validation_blockers: list[dict[str, str]]
    created_at: datetime
    updated_at: datetime
    reviews: list[ClaimReviewOut]
    origin: str = "manual"
    # Fidelidade da extracao, nao verdade do conteudo. Nulo em afirmacao manual.
    extraction_confidence: float | None = None
    evidences: list[ClaimEvidenceOut] = []


# ------------------------------------------------------------------- economia


# Confianca declarada por quem informa o componente; vazio = nao declarada.
ComponentConfidence = Literal["", "low", "medium", "high"]


class CostIn(Model):
    label: str = Field(min_length=1, max_length=200)
    amount: Dec
    currency: str = Field(default="BRL", min_length=3, max_length=3)
    years_from_base: Dec | None = None
    on_date: date | None = None
    included_in_disbursement: bool = False
    source: str = Field(default="", max_length=300)
    responsible: str = Field(default="", max_length=200)
    confidence: ComponentConfidence = ""


class ImpactIn(Model):
    """Ajuste de um cenario. Impactos de mesma causa compartilham `dependency_group`:
    so um e aplicado por dimensao (sem dupla contagem)."""

    id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=200)
    dependency_group: str = Field(min_length=1, max_length=80)
    affects: Literal["value", "cost", "term", "probability", "contract"]
    amount: Dec | None = None
    years: Dec | None = None
    note: str = Field(default="", max_length=1000)
    # Origem no dossie. Diferente de `manual`, a fonte precisa estar validada.
    source_type: Literal["manual", "finding", "occurrence", "claim"] = "manual"
    source_id: str | None = Field(default=None, max_length=36)
    responsible: str = Field(default="", max_length=200)
    confidence: ComponentConfidence = ""


class AssumptionsIn(Model):
    currency: str = Field(default="BRL", min_length=3, max_length=3)
    base_date: date
    discount_rate: Dec | None = None
    discount_rate_approved_by: str | None = Field(default=None, max_length=200)
    probabilities_approved_by: str | None = Field(default=None, max_length=200)
    heuristic_score: Dec | None = None
    notes: list[str] = []


class ClaimantScenarioIn(Model):
    id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=200)
    gross_receipt: Dec
    currency: str = Field(default="BRL", min_length=3, max_length=3)
    years_from_base: Dec | None = None
    receipt_date: date | None = None
    costs: list[CostIn] = []
    probability: Dec | None = None
    impacts: list[ImpactIn] = []
    source: str = Field(default="", max_length=300)
    responsible: str = Field(default="", max_length=200)
    confidence: ComponentConfidence = ""


class DefendantScenarioIn(Model):
    id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=200)
    disbursement: Dec
    currency: str = Field(default="BRL", min_length=3, max_length=3)
    years_from_base: Dec | None = None
    disbursement_date: date | None = None
    incremental_costs: list[CostIn] = []
    probability: Dec | None = None
    impacts: list[ImpactIn] = []
    source: str = Field(default="", max_length=300)
    responsible: str = Field(default="", max_length=200)
    confidence: ComponentConfidence = ""


class ClaimantStatementIn(Model):
    assumptions: AssumptionsIn
    scenarios: list[ClaimantScenarioIn] = Field(min_length=1)


class DefendantStatementIn(Model):
    assumptions: AssumptionsIn
    reference_exposure: Dec
    reference_currency: str = Field(default="BRL", min_length=3, max_length=3)
    reference_label: str = Field(default="", max_length=300)
    scenarios: list[DefendantScenarioIn] = Field(min_length=1)


class EconomicsRequest(Model):
    """Os dois lados sao independentes; pode-se calcular um, outro ou ambos."""

    claimant: ClaimantStatementIn | None = None
    defendant: DefendantStatementIn | None = None


class CalculationRunOut(Model):
    id: str
    opportunity_id: str
    formula_version: str
    dossier_version: int
    stale: bool
    stale_reason: str | None
    created_by: str
    created_at: datetime
    inputs: dict[str, Any]
    result: dict[str, Any]


class ImpactSourceOut(Model):
    """Fonte validada do dossie que pode justificar um impacto economico."""

    type: Literal["finding", "occurrence", "claim"]
    id: str
    label: str


class MemoCreate(Model):
    calculation_run_id: str = Field(min_length=1, max_length=36)
    notes: str = Field(default="", max_length=4000)


class MemoOut(Model):
    """Memorando economico: retrato versionado de um demonstrativo. Nunca e reescrito."""

    id: str
    opportunity_id: str
    version: int
    calculation_run_id: str
    formula_version: str
    dossier_version: int
    title: str
    body: str
    notes: str
    limitations: list[dict[str, str]]
    decision: Literal["approved", "returned"] | None = None
    decision_comment: str = ""
    decided_by: str | None = None
    decided_at: datetime | None = None
    stale: bool
    stale_reason: str | None
    created_by: str
    created_at: datetime


class MemoDecisionRequest(Model):
    decision: Literal["approved", "returned"]
    comment: str = Field(min_length=3, max_length=2000)


StageStatus = Literal[
    "not_started",
    "in_progress",
    "partial",
    "waiting_document",
    "waiting_review",
    "completed",
    "stale",
    "failed",
]


class StageOut(Model):
    """Estado de uma das seis etapas da jornada, derivado do dossie (RF15)."""

    number: int
    key: str
    title: str
    status: StageStatus
    summary: str
    pending: list[str]


# -------------------------------------------------------------------- tabelas


class ColumnFilter(Model):
    """Filtro de uma coluna. `values` combina por OU; condicoes da mesma coluna e de
    colunas diferentes combinam por E."""

    column: str = Field(min_length=1, max_length=60)
    # None dentro da lista representa "vazio".
    values: list[str | None] | None = Field(default=None, max_length=200)
    op: Literal["contains", "equals", "between", "empty", "not_empty"] | None = None
    text: str | None = Field(default=None, max_length=200)
    min: str | None = Field(default=None, max_length=40)
    max: str | None = Field(default=None, max_length=40)


class SortSpec(Model):
    column: str = Field(min_length=1, max_length=60)
    direction: Literal["asc", "desc"] = "asc"


class TableQuery(Model):
    filters: list[ColumnFilter] = Field(default=[], max_length=40)
    sort: list[SortSpec] = Field(default=[], max_length=5)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=200)
    # Devolve os IDs de todo o resultado filtrado (selecao de "todos os resultados").
    include_ids: bool = False
    # Oportunidade a que a tabela pertence (tabelas do dossie). A autorizacao e conferida
    # no servidor; o ID sozinho nao da acesso.
    scope_id: str | None = Field(default=None, min_length=1, max_length=36)


class TableColumnOut(Model):
    key: str
    label: str
    kind: Literal["text", "number", "money", "date", "enum", "bool"]
    sortable: bool
    filterable: bool
    facet: bool
    required: bool
    default_visible: bool
    help: str
    # Largura inicial sugerida em px; nulo usa o padrao do tipo.
    default_width: int | None = None


class FacetValue(Model):
    value: str | None
    label: str
    count: int


class TableRow(Model):
    id: str
    is_synthetic: bool
    values: dict[str, str | int | bool | None]
    # Identificadores relacionados usados por acoes da linha (nunca exibidos).
    refs: dict[str, str] = {}


class TableQueryOut(Model):
    table: str
    columns: list[TableColumnOut]
    rows: list[TableRow]
    total: int
    unfiltered_total: int
    page: int
    page_size: int
    page_count: int
    facets: dict[str, list[FacetValue]]
    # Muda quando o conjunto filtrado muda; invalida selecao global antiga (AC17).
    result_version: str
    all_ids: list[str] | None


class TableExportRequest(Model):
    query: TableQuery = TableQuery()
    columns: list[str] = Field(min_length=1, max_length=60)
    # Ausente: exporta todo o resultado filtrado. Presente: apenas estes IDs.
    ids: list[str] | None = Field(default=None, max_length=5000)


class ViewColumn(Model):
    key: str = Field(min_length=1, max_length=60)
    visible: bool = True
    width: int | None = Field(default=None, ge=60, le=800)


class TableViewConfig(Model):
    columns: list[ViewColumn] = Field(default=[], max_length=60)
    filters: list[ColumnFilter] = Field(default=[], max_length=40)
    sort: list[SortSpec] = Field(default=[], max_length=5)
    page_size: int = Field(default=25, ge=1, le=200)


class TableViewSave(Model):
    name: str = Field(min_length=1, max_length=80)
    config: TableViewConfig
    is_default: bool = False


class TableViewOut(Model):
    id: str
    table: str
    name: str
    config: TableViewConfig
    is_default: bool
    updated_at: datetime


# ------------------------------------------------------- texto, OCR e estrutura


class JobOut(Model):
    id: str
    kind: str
    target_id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    attempts: int
    error: str | None
    result: dict[str, Any] | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class PageTextInfo(Model):
    page_no: int
    source: str
    char_count: int


class DocumentSegmentIn(Model):
    label: str = Field(min_length=1, max_length=300)
    piece_type: str = Field(default="nao_classificado", max_length=60)
    page_start: int = Field(ge=1)
    page_end: int | None = Field(default=None, ge=1)
    # Numeracao de folhas do processo, quando conhecida. Diferente da pagina do arquivo.
    folio_start: int | None = Field(default=None, ge=1)
    folio_end: int | None = Field(default=None, ge=1)
    note: str = Field(default="", max_length=600)


class DocumentSegmentOut(Model):
    id: str
    document_version_id: str
    label: str
    piece_type: str
    page_start: int
    page_end: int
    folio_start: int | None
    folio_end: int | None
    note: str
    created_at: datetime


class DocumentTextOut(Model):
    document_version_id: str
    filename: str
    state: str
    page_count: int | None
    text_source: str
    pages_with_text: list[PageTextInfo]
    ocr_available: bool
    active_jobs: list[JobOut]
    last_job: JobOut | None
    segments: list[DocumentSegmentOut]


class DocumentPageOut(Model):
    page_no: int
    text: str
    source: str
    char_count: int
    # Folha do processo correspondente, quando a estrutura do documento a informa.
    folio: int | None


class ClaimSuggestionRequest(Model):
    # rules: regras locais, sem IA. llm: modelo de linguagem configurado no servidor.
    method: Literal["rules", "llm"]
    page_from: int | None = Field(default=None, ge=1)
    page_to: int | None = Field(default=None, ge=1)


class ClaimSuggestionOut(Model):
    text: str
    nature: ClaimNature
    asserted_by: str
    page_no: int
    excerpt: str
    confidence: float
    method: Literal["rules", "llm"]


class ClaimSuggestionsOut(Model):
    document_version_id: str
    method: Literal["rules", "llm"]
    # Verdadeiro quando o modelo respondeu em modo simulado (sem provedor).
    is_mock: bool
    model: str | None
    pages_analyzed: int
    suggestions: list[ClaimSuggestionOut]
    # Itens que o modelo devolveu e foram recusados na conferencia com o documento.
    rejected: list[dict[str, str]]
    # Em peca de parte, sugestoes que o modelo classificou como constatacao documental e
    # o servidor devolveu como alegacao de quem assina.
    nature_adjusted: int = 0
    usage: dict[str, int] | None
