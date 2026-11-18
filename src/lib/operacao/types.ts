/**
 * Tipos do contrato v1 da API operacional.
 *
 * Espelham `backend/evidia/schemas.py` (fonte do contrato, exportado em
 * `specs/001-evidia-operacional/contracts/openapi.json`). Alterar um lado exige alterar o outro.
 */

export type PositionSide = "claimant" | "defendant";
export type ClaimNature =
  "documentary_finding" | "attributed_allegation" | "analytical_inference" | "human_conclusion";
export type ReviewState =
  "pending" | "in_review" | "validated" | "discarded" | "contested" | "inconclusive";
export type DocumentCategory = "full_record" | "piece" | "derived_report" | "metadata";

export type UserOut = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  organization_id: string;
  organization_name: string;
};

export type CandidateOut = {
  external_id: string;
  commercial_case_id: number | null;
  cnj_raw: string | null;
  cnj_valid: boolean;
  title: string | null;
  claimant: string | null;
  defendant: string | null;
  case_class: string | null;
  has_study: boolean;
  source_updated_at: string | null;
  /** Cadastro do processo na origem; nulos quando a origem não os informa. */
  court?: string | null;
  origin_status?: string | null;
  filing_date?: string | null;
  is_lead?: boolean;
  searched_company_cnpj?: string | null;
  already_imported_sides: PositionSide[];
};

export type CandidateList = {
  origin_system: string;
  is_synthetic: boolean;
  consulted_at: string;
  items: CandidateOut[];
};

export type ImportRequest = {
  external_id: string;
  position_side: PositionSide;
  represented_party: string;
};

export type ImportOut = {
  operation_id: string;
  opportunity_id: string;
  snapshot_id: string;
  outcome: "created" | "new_version" | "reused";
  attempts: number;
  is_draft: boolean;
  conflicts: number;
};

export type ProcessOut = {
  id: string;
  cnj: string | null;
  court_code: string | null;
  court_label: string | null;
  status: string;
  draft_reason: string | null;
};

export type OpportunitySummary = {
  id: string;
  title: string;
  position_side: PositionSide;
  represented_party: string;
  origin_system: string;
  origin_external_id: string;
  is_synthetic: boolean;
  contract_status: string;
  dossier_version: number;
  created_at: string;
  updated_at: string;
  process: ProcessOut;
  documents_count: number;
  open_gaps_count: number;
  open_conflicts_count: number;
  claims_count: number;
  has_full_record: boolean;
};

export type SnapshotParty = { name: string; role: string };

export type SnapshotPayload = {
  schema_version: string;
  cnj_raw: string | null;
  title: string | null;
  parties: SnapshotParty[];
  judge: string | null;
  court_body: string | null;
  case_class: string | null;
  subject: string | null;
  procedural_stage: string | null;
  study: {
    id: number | null;
    version: number | null;
    generated_at: string | null;
    simulated: boolean | null;
    completeness: string | null;
    has_full_record: boolean;
  } | null;
  document_refs: { kind: string; category: string; path: string }[];
  gaps: { code: string; description: string; reason: string }[];
  [key: string]: unknown;
};

export type SnapshotOut = {
  id: string;
  version_no: number;
  origin_system: string;
  origin_external_id: string;
  content_hash: string;
  is_synthetic: boolean;
  source_updated_at: string | null;
  fetched_at: string;
  payload: SnapshotPayload;
  differences: { field: string; previous: unknown; incoming: unknown }[];
};

export type ConflictOut = {
  id: string;
  field: string;
  previous_value: string | null;
  incoming_value: string | null;
  status: string;
  created_at: string;
};

export type MissingPieceOut = {
  id: string;
  description: string;
  reason: string;
  source: string;
  status: "open" | "received" | "dismissed";
  created_at: string;
};

export type DocumentVersionOut = {
  id: string;
  document_id: string;
  version_no: number;
  sha256: string;
  filename: string;
  media_type: string;
  size_bytes: number;
  page_count: number | null;
  state: "stored" | "needs_ocr" | "password_protected";
  origin: string;
  obtained_at: string;
  uploaded_by: string;
  is_current: boolean;
  /** Origem do texto por página: none | native | text | ocr | mixed. */
  text_source: string;
  text_pages: number;
};

export type DocumentOut = {
  id: string;
  title: string;
  doc_type: string;
  category: DocumentCategory;
  current_version_no: number;
  created_at: string;
  versions: DocumentVersionOut[];
};

export type DocumentUploadOut = {
  document: DocumentOut;
  version: DocumentVersionOut;
  duplicate: boolean;
  superseded_claims: number;
  superseded_calculations: number;
  dossier_version: number;
};

export type OpportunityDetail = OpportunitySummary & {
  snapshots: SnapshotOut[];
  conflicts: ConflictOut[];
  missing_pieces: MissingPieceOut[];
  documents: DocumentOut[];
  integral_opinion_allowed: boolean;
  integral_opinion_blockers: string[];
};

export type ClaimCreate = {
  text: string;
  nature: ClaimNature;
  asserted_by?: string;
  subject?: string;
  document_version_id?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  excerpt?: string;
  premise_claim_ids?: string[];
  /** De onde a afirmação veio; sugestão aceita guarda a confiança da extração. */
  origin?: "manual" | "rules" | "llm";
  extraction_confidence?: number | null;
};

export type ClaimReviewRequest = {
  review_state?: ReviewState;
  text?: string;
  nature?: ClaimNature;
  document_version_id?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  comment?: string;
};

export type ClaimReviewOut = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  comment: string;
  created_at: string;
};

export type ClaimOut = {
  id: string;
  opportunity_id: string;
  text: string;
  nature: ClaimNature;
  asserted_by: string;
  subject: string;
  document_version_id: string | null;
  document_title: string | null;
  document_version_no: number | null;
  page_start: number | null;
  page_end: number | null;
  excerpt: string;
  premise_claim_ids: string[];
  review_state: ReviewState;
  dossier_version: number;
  stale: boolean;
  stale_reason: string | null;
  validation_blockers: { code: string; message: string }[];
  created_at: string;
  updated_at: string;
  reviews: ClaimReviewOut[];
  origin: string;
  /** Fidelidade da extração, não verdade do conteúdo. */
  extraction_confidence: number | null;
  evidences: ClaimEvidenceOut[];
};

export type ClaimEvidenceIn = {
  stance: "supporting" | "contrary";
  document_version_id: string;
  page_start: number;
  page_end?: number | null;
  excerpt?: string;
  note?: string;
};

export type ClaimEvidenceOut = {
  id: string;
  claim_id: string;
  stance: "supporting" | "contrary";
  document_version_id: string;
  document_title: string | null;
  document_version_no: number | null;
  is_current_version: boolean;
  page_start: number;
  page_end: number;
  excerpt: string;
  note: string;
  created_by: string;
  created_at: string;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details: Record<string, unknown> | null };
  correlation_id: string;
};

// ---------------------------------------------------------------- tabela comum

/** `money` é texto decimal: a tela formata, o servidor ordena e filtra por valor. */
export type ColumnKind = "text" | "number" | "money" | "date" | "enum" | "bool";
export type FilterOp = "contains" | "equals" | "between" | "empty" | "not_empty";

export type ColumnFilter = {
  column: string;
  /** Valores combinados por OU; `null` representa "vazio". */
  values?: (string | null)[] | null;
  op?: FilterOp | null;
  text?: string | null;
  min?: string | null;
  max?: string | null;
};

export type SortSpec = { column: string; direction: "asc" | "desc" };

export type TableQuery = {
  filters: ColumnFilter[];
  sort: SortSpec[];
  page: number;
  page_size: number;
  include_ids: boolean;
  /** Oportunidade a que a tabela pertence (tabelas do dossiê). */
  scope_id?: string | null;
};

export type TableColumnOut = {
  key: string;
  label: string;
  kind: ColumnKind;
  sortable: boolean;
  filterable: boolean;
  facet: boolean;
  required: boolean;
  default_visible: boolean;
  help: string;
  /** Largura inicial sugerida em px; nulo usa o padrão do tipo. */
  default_width?: number | null;
};

export type FacetValue = { value: string | null; label: string; count: number };
export type CellValue = string | number | boolean | null;
export type TableRow = {
  id: string;
  is_synthetic: boolean;
  values: Record<string, CellValue>;
  /** Identificadores relacionados, usados por ações da linha. */
  refs?: Record<string, string>;
};

export type TableQueryOut = {
  table: string;
  columns: TableColumnOut[];
  rows: TableRow[];
  total: number;
  unfiltered_total: number;
  page: number;
  page_size: number;
  page_count: number;
  facets: Record<string, FacetValue[]>;
  result_version: string;
  all_ids: string[] | null;
};

export type TableExportRequest = { query: TableQuery; columns: string[]; ids?: string[] | null };

export type ViewColumn = { key: string; visible: boolean; width?: number | null };

export type TableViewConfig = {
  columns: ViewColumn[];
  filters: ColumnFilter[];
  sort: SortSpec[];
  page_size: number;
};

export type TableViewSave = { name: string; config: TableViewConfig; is_default: boolean };

export type TableViewOut = {
  id: string;
  table: string;
  name: string;
  config: TableViewConfig;
  is_default: boolean;
  updated_at: string;
};

// ------------------------------------------------------------------ economia

/** Confiança declarada por quem informa o componente; vazio = não declarada. */
export type ComponentConfidence = "" | "low" | "medium" | "high";

export type CostIn = {
  label: string;
  amount: string;
  years_from_base?: string | null;
  included_in_disbursement?: boolean;
  source?: string;
  responsible?: string;
  confidence?: ComponentConfidence;
};

export type ImpactAffects = "value" | "cost" | "term" | "probability" | "contract";
export type ImpactSourceType = "manual" | "finding" | "occurrence" | "claim";

/** Ajuste de um cenário. Mesma causa = mesmo `dependency_group` (sem dupla contagem). */
export type ImpactIn = {
  id: string;
  label: string;
  dependency_group: string;
  affects: ImpactAffects;
  amount?: string | null;
  years?: string | null;
  note?: string;
  source_type?: ImpactSourceType;
  source_id?: string | null;
  responsible?: string;
  confidence?: ComponentConfidence;
};

/** Fonte validada do dossiê que pode justificar um impacto. */
export type ImpactSourceOut = {
  type: Exclude<ImpactSourceType, "manual">;
  id: string;
  label: string;
};

export type ImpactOut = {
  id: string;
  label: string;
  dependency_group: string;
  affects: ImpactAffects;
  amount: string | null;
  years: string | null;
  applied: boolean;
  not_applied_reason: string | null;
  note: string;
  source: { type: ImpactSourceType; id: string | null; label: string };
  responsible: string;
  confidence: ComponentConfidence;
};

export type SensitivityRow = {
  parameter: "gross_receipt" | "disbursement" | "years" | "discount_rate";
  change: string;
  net_receipt?: string;
  net_reduction?: string;
  net_present_value?: string | null;
};

export type StatementLimitation = { code: string; message: string };

export type MemoOut = {
  id: string;
  opportunity_id: string;
  version: number;
  calculation_run_id: string;
  formula_version: string;
  dossier_version: number;
  title: string;
  body: string;
  notes: string;
  limitations: StatementLimitation[];
  decision: "approved" | "returned" | null;
  decision_comment: string;
  decided_by: string | null;
  decided_at: string | null;
  stale: boolean;
  stale_reason: string | null;
  created_by: string;
  created_at: string;
};

export type AssumptionsIn = {
  currency?: string;
  base_date: string;
  discount_rate?: string | null;
  discount_rate_approved_by?: string | null;
  probabilities_approved_by?: string | null;
  notes?: string[];
};

export type ClaimantScenarioIn = {
  id: string;
  label: string;
  gross_receipt: string;
  years_from_base?: string | null;
  costs?: CostIn[];
  probability?: string | null;
  impacts?: ImpactIn[];
  source?: string;
  responsible?: string;
  confidence?: ComponentConfidence;
};

export type DefendantScenarioIn = {
  id: string;
  label: string;
  disbursement: string;
  incremental_costs?: CostIn[];
  probability?: string | null;
  impacts?: ImpactIn[];
  source?: string;
  responsible?: string;
  confidence?: ComponentConfidence;
};

export type EconomicsRequest = {
  claimant?: { assumptions: AssumptionsIn; scenarios: ClaimantScenarioIn[] } | null;
  defendant?: {
    assumptions: AssumptionsIn;
    reference_exposure: string;
    reference_label?: string;
    scenarios: DefendantScenarioIn[];
  } | null;
};

/** Campo que depende de contrato: nulo com motivo, nunca zero. */
export type Undefinable = { value: string | null; reason: string };

export type StatementStep = {
  key: string;
  label: string;
  sign: "+" | "-" | "info";
  amount: string;
  years: string | null;
  present_value: string | null;
  source: string;
  /** Ausentes em execuções anteriores à fórmula econ-1.2.0. */
  responsible?: string;
  confidence?: ComponentConfidence;
};

type StatementBase = {
  formula_version: string;
  methodology_status: string;
  currency: string;
  base_date: string;
  rounding: string;
  day_count: string;
  discount_rate: string | null;
  discount_rate_approved_by: string | null;
  probabilities_approved_by: string | null;
  heuristic_score_ignored: boolean;
  notes: string[];
  contract: {
    status: string;
    price: Undefinable;
    investor_return: Undefinable;
    contractual_fee: Undefinable;
  };
};

export type ClaimantScenarioOut = {
  id: string;
  label: string;
  probability: string | null;
  gross_receipt: string;
  total_costs: string;
  net_receipt: string;
  net_present_value: string | null;
  formula: string;
  present_value_formula?: string | null;
  /** Ausente em execuções anteriores à fórmula econ-1.1.0. */
  steps?: StatementStep[];
  /** Ausentes em execuções anteriores à fórmula econ-1.2.0. */
  impacts?: ImpactOut[];
  sensitivity?: SensitivityRow[];
  impacts_on_value?: string;
  adjusted_gross_receipt?: string;
};

export type DefendantScenarioOut = {
  id: string;
  label: string;
  probability: string | null;
  disbursement: string;
  gross_reduction: string;
  incremental_costs_deducted: string;
  net_reduction: string;
  residual_exposure: string;
  formula: string;
  steps?: StatementStep[];
  impacts?: ImpactOut[];
  sensitivity?: SensitivityRow[];
  impacts_on_value?: string;
  adjusted_disbursement?: string;
};

export type ClaimantStatement = StatementBase & {
  side: "claimant";
  scenarios: ClaimantScenarioOut[];
  weighted: {
    available: boolean;
    reason: string | null;
    expected_net_receipt: string | null;
    expected_net_present_value: string | null;
    formula: string;
  };
};

export type DefendantStatement = StatementBase & {
  side: "defendant";
  reference_exposure: string;
  reference_label: string;
  beneficiary: string;
  evidia_revenue: Undefinable;
  scenarios: DefendantScenarioOut[];
  weighted: {
    available: boolean;
    reason: string | null;
    expected_net_reduction: string | null;
    formula: string;
  };
};

export type CalculationRunOut = {
  id: string;
  opportunity_id: string;
  formula_version: string;
  dossier_version: number;
  stale: boolean;
  stale_reason: string | null;
  created_by: string;
  created_at: string;
  inputs: EconomicsRequest;
  result: {
    formula_version: string;
    claimant: ClaimantStatement | null;
    defendant: DefendantStatement | null;
    /** Limitações do dossiê no momento do cálculo (fórmula econ-1.2.0 em diante). */
    limitations?: StatementLimitation[];
  };
};

/** Resultado da importação de um relatório derivado da originação. */
export type OriginDocumentResult = {
  kind: string;
  title: string;
  outcome: "stored" | "duplicate" | "not_available" | "rejected";
  reason: string;
  document_id: string | null;
  version_id: string | null;
};

export type OriginDocumentsOut = { results: OriginDocumentResult[]; dossier_version: number };

export type ClaimBulkReviewOut = {
  updated: number;
  skipped: { id: string; reason: string }[];
};

export type StageStatus =
  | "not_started"
  | "in_progress"
  | "partial"
  | "waiting_document"
  | "waiting_review"
  | "completed"
  | "stale"
  | "failed";

/** Estado de uma das seis etapas da jornada, derivado do dossiê pelo servidor. */
export type StageOut = {
  number: number;
  key: string;
  title: string;
  status: StageStatus;
  summary: string;
  pending: string[];
};

// ------------------------------------------------------------------- motores
// Espelha backend/evidia/schemas_engines.py (execução e achado).

export type EngineRunStatus =
  "queued" | "running" | "partial" | "completed" | "failed" | "cancelled";
export type SupportStrength = "strong" | "moderate" | "weak" | "not_assessed";

export type EngineBlock = {
  key: string;
  label: string;
  status: "completed" | "failed" | "skipped";
  message: string;
};

export type EngineCitation = {
  document_version_id: string;
  page_start: number;
  page_end?: number | null;
  excerpt: string;
  /** `engine`: veio do motor. `review`: informada por revisor. */
  source: "engine" | "review";
};

export type EnginePendency = { code: string; message: string };

export type EngineRunCreate = {
  engine: "nulidade360";
  document_version_id: string;
  /** Opcional: planilha .xlsx do dossiê entregue ao motor como mapa de evidências. */
  evidence_map_version_id?: string | null;
  /** Confirmado por quem pede; não há valor padrão. */
  simulated_side: PositionSide;
};

export type EngineRunOut = {
  id: string;
  /** Mapa de evidências entregue ao motor nesta execução; nulo = nenhum. */
  evidence_map?: {
    document_version_id: string;
    filename: string;
    total_items: number | null;
  } | null;
  opportunity_id: string;
  dossier_version: number;
  engine: "nulidade360" | "p4";
  engine_version: string | null;
  checklist_version: string | null;
  prompt_version: string | null;
  model: string | null;
  input_hash: string;
  document_version_ids: string[];
  simulated_side: PositionSide;
  side_confirmed_by: string;
  status: EngineRunStatus;
  /** Rótulo de estado como veio do motor. */
  engine_status: string | null;
  blocks: EngineBlock[];
  attempts: number;
  /** Nulo = custo desconhecido; nunca tratado como zero. Texto decimal. */
  cost_amount: string | null;
  cost_currency: string | null;
  usage: Record<string, number> | null;
  limitations: string[];
  request_id: string | null;
  is_mock: boolean;
  is_synthetic: boolean;
  stale: boolean;
  stale_reason: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  external_ref: string | null;
  /** Índice de risco do motor (0–100), texto decimal. Não é estimativa de êxito. */
  overall_risk_index: string | null;
  findings_count: number;
  /** Itens importados de relatório (provas, quesitos e respostas do P4). */
  items_count: number;
};

export type P4ImportRequest = {
  report_version_id: string;
  source_version_id: string;
  /** Confirmado por quem importa; não há valor padrão. */
  simulated_side: PositionSide;
  engine_version?: string;
  /** Pedido de execução que este relatório atende; fecha o pedido. */
  request_id?: string | null;
};

export type P4RequestCreate = {
  document_version_id: string;
  /** Confirmado por quem pede; não há valor padrão. */
  simulated_side: PositionSide;
  note?: string;
};

/** Pedido de execução do P4: a execução acontece fora da Evidia. */
export type P4RequestOut = {
  id: string;
  opportunity_id: string;
  document_version_id: string;
  simulated_side: PositionSide;
  note: string;
  status: "awaiting_external" | "imported" | "cancelled";
  dossier_version: number;
  pages: number;
  package_sha256: string;
  ambiguous_markers: number;
  run_id: string | null;
  is_synthetic: boolean;
  stale: boolean;
  created_by: string;
  created_at: string;
  closed_at: string | null;
};

export type FindingClaimRelation = "supports" | "contradicts" | "related";

/** Afirmação do dossiê que uma pessoa relacionou ao achado. O vínculo não valida nada. */
export type FindingClaimLinkOut = {
  id: string;
  claim_id: string;
  claim_text: string;
  claim_review_state: ReviewState;
  claim_stale: boolean;
  relation: FindingClaimRelation;
  note: string;
  created_by: string;
  created_at: string;
};

export type EngineFindingOut = {
  id: string;
  run_id: string;
  opportunity_id: string;
  engine: "nulidade360" | "p4";
  engine_version: string | null;
  block_key: string;
  title: string;
  basis: string;
  consequence_hypothesis: string;
  support_strength: SupportStrength;
  risk_index: string | null;
  citations: EngineCitation[];
  pendencies: EnginePendency[];
  review_state: ReviewState;
  /** Saída do motor, sem alteração. */
  original: Record<string, unknown>;
  is_synthetic: boolean;
  /** O que impede validar o achado agora. */
  validation_blockers: EnginePendency[];
  reviews: EngineFindingReview[];
  claim_links: FindingClaimLinkOut[];
};

export type EngineFindingReview = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  before: { review_state?: ReviewState };
  after: { review_state?: ReviewState };
  comment: string;
  created_at: string;
};

export type EngineFindingReviewRequest = {
  review_state?: ReviewState;
  citation?: { document_version_id: string; page_start: number; page_end?: number | null };
  comment?: string;
};

// --------------------------------------------------- texto, OCR e estrutura

export type JobOut = {
  id: string;
  kind: string;
  target_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  attempts: number;
  error: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type DocumentSegmentIn = {
  label: string;
  piece_type?: string;
  page_start: number;
  page_end?: number | null;
  /** Folha do processo, quando conhecida. Diferente da página do arquivo. */
  folio_start?: number | null;
  folio_end?: number | null;
  note?: string;
};

export type DocumentSegmentOut = {
  id: string;
  document_version_id: string;
  label: string;
  piece_type: string;
  page_start: number;
  page_end: number;
  folio_start: number | null;
  folio_end: number | null;
  note: string;
  created_at: string;
};

export type DocumentTextOut = {
  document_version_id: string;
  filename: string;
  state: string;
  page_count: number | null;
  text_source: string;
  pages_with_text: { page_no: number; source: string; char_count: number }[];
  ocr_available: boolean;
  active_jobs: JobOut[];
  last_job: JobOut | null;
  segments: DocumentSegmentOut[];
};

export type DocumentPageOut = {
  page_no: number;
  text: string;
  source: string;
  char_count: number;
  folio: number | null;
};

export type ClaimSuggestionRequest = {
  method: "rules" | "llm";
  page_from?: number | null;
  page_to?: number | null;
};

export type ClaimSuggestionOut = {
  text: string;
  nature: ClaimNature;
  asserted_by: string;
  page_no: number;
  excerpt: string;
  confidence: number;
  method: "rules" | "llm";
};

export type ClaimSuggestionsOut = {
  /** Em peça de parte: constatações do modelo devolvidas como alegação de quem assina. */
  nature_adjusted?: number;
  document_version_id: string;
  method: "rules" | "llm";
  is_mock: boolean;
  model: string | null;
  pages_analyzed: number;
  suggestions: ClaimSuggestionOut[];
  rejected: { reason: string; detail?: string }[];
  usage: Record<string, number> | null;
};

// ---------------------------------------------------- diligência de vínculos
// Espelha backend/evidia/schemas_diligence.py.

export type ParticipantRole =
  "court_expert" | "party_assistant" | "lawyer" | "judge" | "party" | "other";
export type RoleSide = "claimant" | "defendant" | "court" | "none";
export type IdentifierType =
  "cpf" | "cnpj" | "oab" | "crea" | "professional_registry" | "source_id" | "other";
export type OccurrenceState =
  | "candidate"
  | "identity_pending"
  | "identity_confirmed"
  | "evidence_collected"
  | "in_review"
  | "validated"
  | "discarded"
  | "inconclusive"
  | "contested"
  | "forwarded_legal";
export type OccurrenceKind = "cooccurrence" | "qualification" | "disciplinary" | "social" | "other";
export type Relation =
  "expert_lawyer" | "expert_party" | "expert_judge" | "expert_attribution" | "expert_disciplinary";
export type EventTiming = "in_window" | "out_of_window" | "undated";

export type Identifier = { type: IdentifierType; value: string; uf?: string | null };

export type ParticipantIn = {
  kind?: "person" | "company";
  name: string;
  identifiers?: Identifier[];
  specialty?: string;
  locality?: string;
  note?: string;
};

export type ParticipantUpdate = Partial<ParticipantIn> & {
  identity_status?: "candidate" | "confirmed";
  identity_note?: string;
};

export type RoleIn = {
  cnj: string;
  court?: string;
  role: ParticipantRole;
  side?: RoleSide;
  /** Data do ato ou atuação; diferente da distribuição do processo. */
  event_date?: string | null;
  event_label?: string;
  filing_date?: string | null;
  document_version_id?: string | null;
  page_start?: number | null;
  source_ref?: string;
};

export type RoleOut = {
  id: string;
  participant_id: string;
  cnj: string;
  court: string;
  role: ParticipantRole;
  side: RoleSide;
  event_date: string | null;
  event_label: string;
  filing_date: string | null;
  source_kind: "dossier" | "connector" | "manual";
  document_version_id: string | null;
  page_start: number | null;
  source_ref: string;
  search_id: string | null;
  is_synthetic: boolean;
  created_at: string;
};

export type ParticipantOut = {
  id: string;
  opportunity_id: string;
  kind: "person" | "company";
  name: string;
  identifiers: Identifier[];
  specialty: string;
  locality: string;
  note: string;
  identity_status: "candidate" | "confirmed";
  identity_note: string;
  merged_into_id: string | null;
  is_synthetic: boolean;
  roles: RoleOut[];
  /** Outras fichas com o mesmo nome e sem identificador comum. */
  homonym_ids: string[];
  created_at: string;
  updated_at: string;
};

export type SearchOut = {
  id: string;
  participant_id: string;
  connector: string;
  reference_date: string;
  window_start: string;
  window_end: string;
  timezone: string;
  status: "completed" | "no_results" | "failed";
  coverage: string;
  filter_field: string | null;
  error_code: string | null;
  results_count: number;
  is_synthetic: boolean;
  created_at: string;
};

export type CooccurrenceOut = {
  subject_role_id: string;
  other_role_id: string;
  other_participant_id: string;
  other_name: string;
  relation: Relation;
  cnj: string;
  event_date: string | null;
  timing: EventTiming;
  expected: boolean;
  filed_before_window: boolean;
};

export type RecurrenceOut = {
  other_participant_id: string;
  other_name: string;
  relation: Relation;
  count: number;
  /** Nulo: sem base para falar em frequência. */
  universe: number | null;
  expected: boolean;
};

export type SubjectCrosscheck = {
  participant_id: string;
  name: string;
  identity_status: "candidate" | "confirmed";
  roles_in_dossier: ParticipantRole[];
  cooccurrences: CooccurrenceOut[];
  recurrences: RecurrenceOut[];
  searches: SearchOut[];
};

export type CrosscheckOut = {
  opportunity_id: string;
  reference_date: string;
  window_start: string;
  window_end: string;
  timezone: string;
  subjects: SubjectCrosscheck[];
  limitations: string[];
};

export type OccurrenceSheet = {
  what_found: string;
  allows_to_state: string;
  does_not_allow: string;
  missing_to_verify: string;
  possible_impact: string;
  interpretation: string;
  alternative_hypothesis: string;
  contrary_evidence: string;
  coverage: string;
  access_method: string;
  location: string;
  author_attributed: string;
  content_date: string;
  relevance_justification: string;
  proceeding_status:
    "" | "ongoing" | "archived" | "acquitted" | "sanction_in_force" | "sanction_served";
  registry_valid_from: string;
  registry_valid_to: string;
  affected_act: string;
  legal_basis: string;
  prejudice: string;
  causal_nexus: string;
  timeliness: string;
  possible_remedy: string;
};

export type OccurrenceIn = {
  kind: OccurrenceKind;
  relation?: Relation | null;
  subject_participant_id: string;
  related_participant_id?: string | null;
  cnj?: string;
  fact_date?: string | null;
  document_version_id?: string | null;
  page_start?: number | null;
  source_url?: string;
  material_hash?: string;
  sheet?: Partial<OccurrenceSheet>;
};

export type OccurrenceReviewRequest = {
  state?: OccurrenceState;
  sheet?: Partial<OccurrenceSheet>;
  comment?: string;
};

export type OccurrenceOut = {
  id: string;
  opportunity_id: string;
  kind: OccurrenceKind;
  relation: Relation | null;
  state: OccurrenceState;
  subject_participant_id: string;
  subject_name: string;
  related_participant_id: string | null;
  related_name: string | null;
  cnj: string;
  fact_date: string | null;
  collected_at: string;
  timing: EventTiming;
  document_version_id: string | null;
  page_start: number | null;
  source_url: string;
  material_hash: string;
  sheet: OccurrenceSheet;
  expected_relation: boolean;
  qualification_status: "covered" | "not_covered" | "unknown" | null;
  is_current_sanction: boolean;
  validation_blockers: { code: string; message: string }[];
  is_synthetic: boolean;
  reviews: {
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    before: { state?: OccurrenceState };
    after: { state?: OccurrenceState };
    comment: string;
    created_at: string;
  }[];
  created_at: string;
  updated_at: string;
};

// ------------------------------------------------------------- contraditório
// Espelha os contratos de pedido e cenário em backend/evidia/schemas_engines.py.

export type SideStatus = "not_analyzed" | "running" | "partial" | "completed" | "failed" | "stale";
export type ArgumentConfidence = "high" | "medium" | "low" | "not_assessed";

export type PleaIn = {
  title: string;
  description?: string;
  claimant_participant_ids: string[];
  defendant_participant_ids: string[];
};

export type PleaOut = PleaIn & {
  id: string;
  opportunity_id: string;
  description: string;
  is_synthetic: boolean;
  created_at: string;
};

export type ScenarioArgumentOut = {
  id: string;
  formulated_by: string;
  against: string;
  plea_id: string | null;
  affected_act: string | null;
  /** `source_evidence`: apoia-se em documento. `scenario_inference`: construção do cenário. */
  origin: "source_evidence" | "scenario_inference";
  hypothesis: string;
  counter_evidence: string;
  mitigation: string;
  confidence: ArgumentConfidence;
  citations: EngineCitation[];
  pendencies: EnginePendency[];
  status: "supported" | "hypothesis_for_validation";
};

export type ScenarioRunOut = {
  id: string;
  opportunity_id: string;
  dossier_version: number;
  participant_id: string;
  plea_id: string;
  /** Papel de quem argumenta; não é a posição econômica de quem investe. */
  simulated_side: PositionSide;
  status: EngineRunStatus;
  arguments: ScenarioArgumentOut[];
  limitations: string[];
  is_mock: boolean;
  is_synthetic: boolean;
  created_at: string;
  finished_at: string | null;
  source: "manual" | "model";
  stale: boolean;
};

export type ScenarioRunCreate = {
  participant_id: string;
  simulated_side: PositionSide;
  method: "manual" | "model";
};

export type ScenarioArgumentIn = {
  against: string;
  affected_act?: string;
  hypothesis: string;
  counter_evidence?: string;
  mitigation?: string;
  confidence?: ArgumentConfidence;
  citations?: {
    document_version_id: string;
    page_start: number;
    page_end?: number | null;
    excerpt?: string;
  }[];
};

export type ParticipantScenario = {
  participant_id: string;
  status: SideStatus;
  run_id: string | null;
  arguments_count: number | null;
  hypotheses_count: number | null;
};

export type ScenarioSideView = {
  side: PositionSide;
  status: SideStatus;
  run_id: string | null;
  participants: ParticipantScenario[];
  /** Nulo enquanto o lado não foi analisado: ausência de ataque não é êxito. */
  arguments_count: number | null;
  hypotheses_count: number | null;
};

export type ScenarioComparisonOut = {
  opportunity_id: string;
  plea_id: string;
  dossier_version: number;
  claimant: ScenarioSideView;
  defendant: ScenarioSideView;
  comparable: boolean;
  common_sources: string[];
  limitations: string[];
};
