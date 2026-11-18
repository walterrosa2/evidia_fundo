/**
 * Cliente da API operacional.
 *
 * Regras:
 * - a URL vem de `VITE_EVIDIA_API_URL`; não há endereço embutido no código;
 * - falha operacional é sempre erro tipado — nunca há retorno a dados da demonstração;
 * - a sessão é um cookie HttpOnly; nenhuma credencial fica acessível ao JavaScript.
 */
import type {
  ApiErrorBody,
  CalculationRunOut,
  ClaimBulkReviewOut,
  ImpactSourceOut,
  MemoOut,
  OriginDocumentsOut,
  StageOut,
  CandidateList,
  ClaimCreate,
  ClaimEvidenceIn,
  ClaimEvidenceOut,
  ClaimOut,
  ClaimReviewRequest,
  ClaimSuggestionRequest,
  ClaimSuggestionsOut,
  CrosscheckOut,
  DocumentPageOut,
  DocumentSegmentIn,
  DocumentSegmentOut,
  DocumentTextOut,
  DocumentUploadOut,
  EconomicsRequest,
  EngineFindingOut,
  FindingClaimRelation,
  EngineFindingReviewRequest,
  EngineRunCreate,
  EngineRunOut,
  ImportOut,
  ImportRequest,
  JobOut,
  MissingPieceOut,
  OccurrenceIn,
  OccurrenceOut,
  OccurrenceReviewRequest,
  OpportunityDetail,
  OpportunitySummary,
  P4ImportRequest,
  P4RequestCreate,
  P4RequestOut,
  ParticipantIn,
  ParticipantOut,
  ParticipantUpdate,
  PleaIn,
  PleaOut,
  RoleIn,
  RoleOut,
  ScenarioArgumentIn,
  ScenarioComparisonOut,
  ScenarioRunCreate,
  ScenarioRunOut,
  SearchOut,
  TableExportRequest,
  TableQuery,
  TableQueryOut,
  TableViewOut,
  TableViewSave,
  UserOut,
} from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> | null = null,
    public readonly correlationId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

export function resolveBaseUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) {
    throw new ApiError(
      0,
      "api_not_configured",
      "A API operacional não está configurada neste ambiente. Defina VITE_EVIDIA_API_URL e reinicie o frontend.",
    );
  }
  return value;
}

function baseUrl(): string {
  return resolveBaseUrl(import.meta.env.VITE_EVIDIA_API_URL as string | undefined);
}

export function documentContentUrl(versionId: string): string {
  return `${baseUrl()}/api/v1/document-versions/${encodeURIComponent(versionId)}/content`;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function send(
  path: string,
  init: RequestInit,
  fetcher: FetchLike,
  base: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  // Exigido pelo servidor em requisições que alteram estado com sessão por cookie.
  headers.set("X-Evidia-Request", "1");
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetcher(`${base}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError(
      0,
      "api_unreachable",
      "Não foi possível falar com a API operacional. Verifique se o serviço está em execução e tente novamente.",
    );
  }

  if (response.ok) return response;

  if ((response.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error) {
      throw new ApiError(
        response.status,
        body.error.code,
        body.error.message,
        body.error.details ?? null,
        body.correlation_id ?? null,
      );
    }
  }
  throw new ApiError(
    response.status,
    "unexpected_response",
    `A API respondeu ${response.status} em formato inesperado.`,
  );
}

/** Arquivo gerado pelo servidor (exportação). Erros seguem o mesmo envelope tipado. */
export async function requestFile(
  path: string,
  init: RequestInit = {},
  fetcher: FetchLike = fetch,
  base: string = baseUrl(),
): Promise<Blob> {
  return (await send(path, init, fetcher, base)).blob();
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  fetcher: FetchLike = fetch,
  base: string = baseUrl(),
): Promise<T> {
  const response = await send(path, init, fetcher, base);
  if (response.status === 204) return undefined as T;
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new ApiError(
      response.status,
      "unexpected_response",
      "A API respondeu em formato inesperado.",
    );
  }
  return (await response.json()) as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  me: () => request<UserOut>("/api/v1/auth/me"),
  /** Modos do servidor (sem segredo): dizem se há motor real ou simulado. */
  health: () => request<{ nulidade360_mode?: string; llm_mode?: string }>("/health"),
  login: (username: string, password: string) =>
    request<UserOut>("/api/v1/auth/login", json({ username, password })),
  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),

  candidates: () => request<CandidateList>("/api/v1/origination/candidates"),
  importOpportunity: (body: ImportRequest) =>
    request<ImportOut>("/api/v1/origination/imports", json(body)),

  opportunities: () => request<OpportunitySummary[]>("/api/v1/opportunities"),
  opportunity: (id: string) =>
    request<OpportunityDetail>(`/api/v1/opportunities/${encodeURIComponent(id)}`),

  uploadDocument: (opportunityId: string, form: FormData) =>
    request<DocumentUploadOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/documents`,
      { method: "POST", body: form },
    ),

  addMissingPiece: (opportunityId: string, description: string, reason: string) =>
    request<MissingPieceOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/missing-pieces`,
      json({ description, reason }),
    ),
  updateMissingPiece: (pieceId: string, status: MissingPieceOut["status"]) =>
    request<MissingPieceOut>(`/api/v1/missing-pieces/${encodeURIComponent(pieceId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  claims: (opportunityId: string) =>
    request<ClaimOut[]>(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/claims`),
  createClaim: (opportunityId: string, body: ClaimCreate) =>
    request<ClaimOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/claims`,
      json(body),
    ),
  reviewClaim: (claimId: string, body: ClaimReviewRequest) =>
    request<ClaimOut>(`/api/v1/claims/${encodeURIComponent(claimId)}/reviews`, json(body)),

  documentText: (versionId: string) =>
    request<DocumentTextOut>(`/api/v1/document-versions/${encodeURIComponent(versionId)}/text`),
  documentPage: (versionId: string, pageNo: number) =>
    request<DocumentPageOut>(
      `/api/v1/document-versions/${encodeURIComponent(versionId)}/pages/${pageNo}`,
    ),
  requestOcr: (versionId: string) =>
    request<JobOut>(`/api/v1/document-versions/${encodeURIComponent(versionId)}/ocr`, {
      method: "POST",
    }),
  addDocumentSegment: (versionId: string, body: DocumentSegmentIn) =>
    request<DocumentSegmentOut>(
      `/api/v1/document-versions/${encodeURIComponent(versionId)}/segments`,
      json(body),
    ),
  deleteDocumentSegment: (segmentId: string) =>
    request<void>(`/api/v1/document-segments/${encodeURIComponent(segmentId)}`, {
      method: "DELETE",
    }),
  /** Sugestões para revisão; nada é gravado por esta chamada. */
  suggestClaims: (versionId: string, body: ClaimSuggestionRequest) =>
    request<ClaimSuggestionsOut>(
      `/api/v1/document-versions/${encodeURIComponent(versionId)}/claim-suggestions`,
      json(body),
    ),
  addClaimEvidence: (claimId: string, body: ClaimEvidenceIn) =>
    request<ClaimEvidenceOut>(
      `/api/v1/claims/${encodeURIComponent(claimId)}/evidences`,
      json(body),
    ),
  deleteClaimEvidence: (evidenceId: string) =>
    request<void>(`/api/v1/claim-evidences/${encodeURIComponent(evidenceId)}`, {
      method: "DELETE",
    }),

  participants: (opportunityId: string) =>
    request<ParticipantOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/participants`,
    ),
  createParticipant: (opportunityId: string, body: ParticipantIn) =>
    request<ParticipantOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/participants`,
      json(body),
    ),
  updateParticipant: (participantId: string, body: ParticipantUpdate) =>
    request<ParticipantOut>(`/api/v1/participants/${encodeURIComponent(participantId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  mergeParticipant: (participantId: string, intoId: string, reason: string) =>
    request<ParticipantOut>(
      `/api/v1/participants/${encodeURIComponent(participantId)}/merge`,
      json({ into_participant_id: intoId, reason }),
    ),
  addRole: (participantId: string, body: RoleIn) =>
    request<RoleOut>(`/api/v1/participants/${encodeURIComponent(participantId)}/roles`, json(body)),
  deleteRole: (roleId: string) =>
    request<void>(`/api/v1/process-roles/${encodeURIComponent(roleId)}`, { method: "DELETE" }),
  /** Consulta a fonte configurada; falha é gravada como falha, não como vazio. */
  importDiligenceFile: (
    opportunityId: string,
    body: {
      participant_id: string;
      file_version_id: string;
      source_name: string;
      coverage: string;
    },
  ) =>
    request<SearchOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/diligence-searches/file`,
      json(body),
    ),
  runDiligenceSearch: (opportunityId: string, participantId: string) =>
    request<SearchOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/diligence-searches`,
      json({ participant_id: participantId }),
    ),
  crosscheck: (opportunityId: string) =>
    request<CrosscheckOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/diligence/crosscheck`,
    ),
  occurrences: (opportunityId: string) =>
    request<OccurrenceOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/occurrences`,
    ),
  createOccurrence: (opportunityId: string, body: OccurrenceIn) =>
    request<OccurrenceOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/occurrences`,
      json(body),
    ),
  reviewOccurrence: (occurrenceId: string, body: OccurrenceReviewRequest) =>
    request<OccurrenceOut>(
      `/api/v1/occurrences/${encodeURIComponent(occurrenceId)}/reviews`,
      json(body),
    ),
  exportDiligence: (opportunityId: string) =>
    requestFile(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/diligence/export`),

  pleas: (opportunityId: string) =>
    request<PleaOut[]>(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/pleas`),
  createPlea: (opportunityId: string, body: PleaIn) =>
    request<PleaOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/pleas`,
      json(body),
    ),
  scenarioRuns: (opportunityId: string) =>
    request<ScenarioRunOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/scenario-runs`,
    ),
  createScenarioRun: (pleaId: string, body: ScenarioRunCreate) =>
    request<ScenarioRunOut>(
      `/api/v1/pleas/${encodeURIComponent(pleaId)}/scenario-runs`,
      json(body),
    ),
  addScenarioArgument: (runId: string, body: ScenarioArgumentIn) =>
    request<ScenarioRunOut>(
      `/api/v1/scenario-runs/${encodeURIComponent(runId)}/arguments`,
      json(body),
    ),
  completeScenarioRun: (runId: string) =>
    request<ScenarioRunOut>(`/api/v1/scenario-runs/${encodeURIComponent(runId)}/complete`, {
      method: "POST",
    }),
  pleaComparison: (pleaId: string) =>
    request<ScenarioComparisonOut>(`/api/v1/pleas/${encodeURIComponent(pleaId)}/comparison`),

  tableRows: (table: string, query: TableQuery) =>
    request<TableQueryOut>(
      `/api/v1/tables/${encodeURIComponent(table)}/rows?q=${encodeURIComponent(JSON.stringify(query))}`,
    ),
  exportTable: (table: string, body: TableExportRequest) =>
    requestFile(`/api/v1/tables/${encodeURIComponent(table)}/export`, json(body)),
  tableViews: (table: string) =>
    request<TableViewOut[]>(`/api/v1/tables/${encodeURIComponent(table)}/views`),
  saveTableView: (table: string, body: TableViewSave) =>
    request<TableViewOut>(`/api/v1/tables/${encodeURIComponent(table)}/views`, json(body)),
  deleteTableView: (viewId: string) =>
    request<void>(`/api/v1/table-views/${encodeURIComponent(viewId)}`, { method: "DELETE" }),

  importOriginDocuments: (opportunityId: string) =>
    request<OriginDocumentsOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/origin-documents`,
      { method: "POST" },
    ),
  bulkSendClaimsToReview: (opportunityId: string, ids: string[]) =>
    request<ClaimBulkReviewOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/claims/bulk-review`,
      json({ ids, review_state: "in_review" }),
    ),
  calculations: (opportunityId: string) =>
    request<CalculationRunOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/calculations`,
    ),
  runCalculation: (opportunityId: string, body: EconomicsRequest) =>
    request<CalculationRunOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/calculations`,
      json(body),
    ),
  exportCalculation: (runId: string) =>
    requestFile(`/api/v1/calculations/${encodeURIComponent(runId)}/export`),
  impactSources: (opportunityId: string) =>
    request<ImpactSourceOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/impact-sources`,
    ),
  memos: (opportunityId: string) =>
    request<MemoOut[]>(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/memos`),
  createMemo: (opportunityId: string, body: { calculation_run_id: string; notes?: string }) =>
    request<MemoOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/memos`,
      json(body),
    ),
  decideMemo: (memoId: string, body: { decision: "approved" | "returned"; comment: string }) =>
    request<MemoOut>(`/api/v1/memos/${encodeURIComponent(memoId)}/decision`, json(body)),
  stages: (opportunityId: string) =>
    request<StageOut[]>(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/stages`),
  exportMemo: (memoId: string) => requestFile(`/api/v1/memos/${encodeURIComponent(memoId)}/export`),

  engineRuns: (opportunityId: string) =>
    request<EngineRunOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/engine-runs`,
    ),
  engineRunReport: (runId: string) =>
    requestFile(`/api/v1/engine-runs/${encodeURIComponent(runId)}/report`),
  startEngineRun: (opportunityId: string, body: EngineRunCreate) =>
    request<EngineRunOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/engine-runs`,
      json(body),
    ),
  /** Consulta o motor; não reenvia documento nem reinicia a análise. */
  refreshEngineRun: (runId: string) =>
    request<EngineRunOut>(`/api/v1/engine-runs/${encodeURIComponent(runId)}/refresh`, {
      method: "POST",
    }),
  /** Importa o relatório de uma execução do P4 feita fora da Evidia. */
  p4Requests: (opportunityId: string) =>
    request<P4RequestOut[]>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/p4-requests`,
    ),
  createP4Request: (opportunityId: string, body: P4RequestCreate) =>
    request<P4RequestOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/p4-requests`,
      json(body),
    ),
  p4RequestPackage: (requestId: string) =>
    requestFile(`/api/v1/p4-requests/${encodeURIComponent(requestId)}/package`),
  cancelP4Request: (requestId: string) =>
    request<P4RequestOut>(`/api/v1/p4-requests/${encodeURIComponent(requestId)}/cancel`, {
      method: "POST",
    }),
  importP4Report: (opportunityId: string, body: P4ImportRequest) =>
    request<EngineRunOut>(
      `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/p4-imports`,
      json(body),
    ),
  linkFindingClaim: (
    findingId: string,
    body: { claim_id: string; relation: FindingClaimRelation; note: string },
  ) =>
    request<EngineFindingOut>(
      `/api/v1/engine-findings/${encodeURIComponent(findingId)}/claim-links`,
      json(body),
    ),
  unlinkFindingClaim: (linkId: string) =>
    request<EngineFindingOut>(`/api/v1/engine-finding-claim-links/${encodeURIComponent(linkId)}`, {
      method: "DELETE",
    }),
  engineFindings: (runId: string) =>
    request<EngineFindingOut[]>(`/api/v1/engine-runs/${encodeURIComponent(runId)}/findings`),
  reviewEngineFinding: (findingId: string, body: EngineFindingReviewRequest) =>
    request<EngineFindingOut>(
      `/api/v1/engine-findings/${encodeURIComponent(findingId)}/reviews`,
      json(body),
    ),
};

export const queryKeys = {
  me: ["operacao", "me"] as const,
  health: ["operacao", "modos"] as const,
  candidates: ["operacao", "candidatos"] as const,
  opportunities: ["operacao", "oportunidades"] as const,
  opportunity: (id: string) => ["operacao", "oportunidade", id] as const,
  claims: (id: string) => ["operacao", "afirmacoes", id] as const,
  calculations: (id: string) => ["operacao", "demonstrativos", id] as const,
  impactSources: (id: string) => ["operacao", "fontes-de-impacto", id] as const,
  memos: (id: string) => ["operacao", "memorandos", id] as const,
  stages: (id: string) => ["operacao", "etapas", id] as const,
  p4Requests: (id: string) => ["operacao", "pedidos-p4", id] as const,
  engineRuns: (id: string) => ["operacao", "motores", id] as const,
  participants: (id: string) => ["operacao", "participantes", id] as const,
  crosscheck: (id: string) => ["operacao", "cruzamentos", id] as const,
  occurrences: (id: string) => ["operacao", "ocorrencias", id] as const,
  pleas: (id: string) => ["operacao", "pedidos", id] as const,
  scenarioRuns: (id: string) => ["operacao", "cenarios", id] as const,
  pleaComparison: (pleaId: string) => ["operacao", "comparacao", pleaId] as const,
  documentText: (versionId: string) => ["operacao", "texto", versionId] as const,
  documentPage: (versionId: string, pageNo: number) =>
    ["operacao", "pagina", versionId, pageNo] as const,
  engineFindings: (runId: string) => ["operacao", "achados", runId] as const,
  /** Prefixo de todas as consultas de tabela: invalida lista e tabelas do dossiê. */
  tables: ["operacao", "tabela"] as const,
  tableRows: (table: string, query: unknown) => ["operacao", "tabela", table, query] as const,
  tableViews: (table: string) => ["operacao", "visoes", table] as const,
};
