import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Table2 } from "lucide-react";
import { api, ApiError, documentContentUrl, queryKeys } from "@/lib/operacao/api";
import {
  blockSummary,
  citableVersions,
  engineStatusClasses,
  engineStatusLabel,
  extraBlockers,
  isRunActive,
  simulableVersions,
  spreadsheetVersions,
  supportLabel,
} from "@/lib/operacao/engines";
import { downloadBlob } from "@/lib/operacao/download";
import { formatDateTime, formatPages, positionLabel, reviewLabel } from "@/lib/operacao/labels";
import type { TableState } from "@/lib/operacao/tableState";
import type {
  EngineFindingOut,
  EngineRunOut,
  FindingClaimRelation,
  OpportunityDetail,
  PositionSide,
  ReviewState,
} from "@/lib/operacao/types";
import { DataTable, type CellRenderer } from "./DataTable";
import {
  EmptyState,
  ErrorNotice,
  FullscreenDetail,
  Help,
  inputClass,
  labelClass,
  Loading,
  Pill,
  primaryButton,
  secondaryButton,
  WithHelp,
} from "./primitives";

const POLL_MS = 3000;

const findingRenderers: Record<string, CellRenderer> = {
  title: (_row, value) => <p className="line-clamp-2 break-words">{value}</p>,
  has_evidence: (_row, value, label) => (
    <span className={value ? "" : "text-risk-high"}>{label}</span>
  ),
  is_mock: (_row, value, label) => <span className={value ? "text-gold" : ""}>{label}</span>,
  risk_index: (_row, value) =>
    value === null ? <span className="text-muted-foreground/70">—</span> : <>{value}</>,
};

export function EnginesSection({
  opportunity,
  canWrite,
  canReview,
  openRunId,
  onOpenRun,
  onCloseRun,
  tableOpen,
  onOpenTable,
  tableState,
  onTableState,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  canReview: boolean;
  openRunId: string | null;
  onOpenRun: (runId: string) => void;
  onCloseRun: () => void;
  /** Achados de todas as execuções na tabela comum, em tela inteira. */
  tableOpen: boolean;
  onOpenTable: () => void;
  tableState: TableState;
  onTableState: (next: TableState, options?: { replace?: boolean }) => void;
}) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const runs = useQuery({
    queryKey: queryKeys.engineRuns(opportunity.id),
    queryFn: () => api.engineRuns(opportunity.id),
  });

  // Enquanto houver execução em andamento, consulta o motor em intervalos. A consulta só
  // lê o estado: não reenvia documento nem reinicia análise.
  const mine = (runs.data ?? []).filter((run) => run.engine === "nulidade360");
  const active = mine.filter(isRunActive);
  const poll = useQuery({
    queryKey: [...queryKeys.engineRuns(opportunity.id), "acompanhamento", active.map((r) => r.id)],
    enabled: active.length > 0,
    refetchInterval: POLL_MS,
    retry: false,
    queryFn: async () => {
      const updated = await Promise.all(active.map((run) => api.refreshEngineRun(run.id)));
      queryClient.setQueryData<EngineRunOut[]>(queryKeys.engineRuns(opportunity.id), (current) =>
        (current ?? []).map((run) => updated.find((u) => u.id === run.id) ?? run),
      );
      return updated;
    },
  });

  const openRun = runs.data?.find((run) => run.id === openRunId) ?? null;

  const health = useQuery({ queryKey: queryKeys.health, queryFn: api.health, staleTime: 60_000 });
  const live = health.data?.nulidade360_mode === "live";

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
        Etapa 3 · Motores especializados
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Auditoria de Nulidades (Nulidade360)
        </h2>
        <Help topic="engines" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        O motor audita o documento por blocos e devolve achados com índice de risco. Bloco que falha
        mantém a análise parcial; achado sem página de origem fica pendente de evidência.
      </p>
      <p
        role="note"
        className="mt-3 max-w-3xl rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
      >
        {live ? (
          <>
            <span className="font-medium">Modo real.</span> Cada auditoria envia o documento ao
            provedor de IA do motor e consome API paga. Só arquivos de texto (.txt ou .md) são
            enviados nesta versão. Os achados são saída de modelo e dependem de revisão.
          </>
        ) : (
          <>
            <span className="font-medium">Somente modo simulado.</span> Nesta versão o motor
            responde com dados de teste e só recebe arquivos de texto (.txt ou .md). Os achados e
            índices não representam análise do documento. A análise real consome API paga e depende
            de autorização.
          </>
        )}
      </p>

      {canWrite && <StartForm opportunity={opportunity} live={live} />}

      <div className="mt-4 space-y-4">
        {runs.isPending && <Loading label="Carregando execuções…" />}
        {runs.isError && <ErrorNotice error={runs.error} onRetry={() => runs.refetch()} />}
        {poll.isError && (
          <div>
            <ErrorNotice error={poll.error} onRetry={() => poll.refetch()} />
            <p className="mt-1 text-xs text-muted-foreground">
              A execução continua registrada como em andamento; nenhum resultado foi presumido.
            </p>
          </div>
        )}
        {runs.data && mine.length === 0 && (
          <EmptyState
            title="Nenhuma execução de motor"
            description={
              live
                ? "Escolha um documento de texto e confirme o lado a simular para iniciar a auditoria."
                : "Escolha um documento de texto e confirme o lado a simular para iniciar a auditoria em modo simulado."
            }
          />
        )}
        {mine.map((run) => (
          <RunCard
            key={run.id}
            run={run}
            opportunity={opportunity}
            onOpen={() => onOpenRun(run.id)}
          />
        ))}
      </div>

      {mine.some((run) => run.findings_count > 0) && (
        <WithHelp topic="findingsTable" className="mt-4">
          <button type="button" onClick={onOpenTable} className={secondaryButton}>
            <Table2 aria-hidden="true" className="size-4" />
            Achados em Tabela
          </button>
        </WithHelp>
      )}

      {tableOpen && (
        <FullscreenDetail eyebrow="Nulidade360" title="Achados do Motor" onBack={onCloseRun}>
          <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
            Achados de todas as execuções deste dossiê. O índice é de risco do motor, não estimativa
            de êxito. Achado de execução simulada é dado de teste.
          </p>
          <DataTable
            tableKey="engine_findings"
            scopeId={opportunity.id}
            label="Achados do motor"
            noun={{ one: "achado", many: "achados" }}
            state={tableState}
            onStateChange={onTableState}
            renderers={findingRenderers}
            actionsWidth={190}
            rowActions={(row) => (
              <button
                type="button"
                onClick={() => row.refs?.run_id && onOpenRun(row.refs.run_id)}
                aria-label={`Abrir execução do achado: ${String(row.values.title ?? "").slice(0, 80)}`}
                className={secondaryButton}
              >
                Abrir Execução
              </button>
            )}
            emptyState={
              <EmptyState
                title="Nenhum achado"
                description="Execute a auditoria para gerar achados."
              />
            }
          />
        </FullscreenDetail>
      )}

      {openRun && (
        <FullscreenDetail
          eyebrow={`Nulidade360 · lado analisado: ${positionLabel[openRun.simulated_side]}`}
          title="Achados da Execução"
          onBack={onCloseRun}
        >
          <RunFindings
            run={openRun}
            opportunity={opportunity}
            canReview={canReview}
            canWrite={canWrite}
          />
        </FullscreenDetail>
      )}
    </section>
  );
}

function StartForm({ opportunity, live }: { opportunity: OpportunityDetail; live: boolean }) {
  const id = useId();
  const queryClient = useQueryClient();
  const options = simulableVersions(opportunity.documents);
  const sheets = spreadsheetVersions(opportunity.documents);
  const [versionId, setVersionId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [side, setSide] = useState<PositionSide | "">("");
  const [touched, setTouched] = useState(false);

  const start = useMutation({
    mutationFn: () =>
      api.startEngineRun(opportunity.id, {
        engine: "nulidade360",
        document_version_id: versionId,
        simulated_side: side as PositionSide,
        ...(evidenceId ? { evidence_map_version_id: evidenceId } : {}),
      }),
    onSuccess: () => {
      setTouched(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.engineRuns(opportunity.id) });
    },
  });

  const missingDocument = touched && !versionId;
  const missingSide = touched && !side;

  return (
    <form
      aria-label={live ? "Iniciar auditoria" : "Iniciar auditoria simulada"}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (versionId && side) start.mutate();
      }}
      className="mt-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor={`${id}-doc`} className={labelClass}>
            Documento a auditar
          </label>
          <select
            id={`${id}-doc`}
            value={versionId}
            onChange={(event) => setVersionId(event.target.value)}
            aria-invalid={missingDocument}
            aria-describedby={`${id}-doc-help`}
            disabled={options.length === 0}
            className={inputClass}
          >
            <option value="" className="bg-popover text-popover-foreground">
              {options.length === 0 ? "Nenhum documento de texto no dossiê" : "Selecione…"}
            </option>
            {options.map((option) => (
              <option
                key={option.id}
                value={option.id}
                className="bg-popover text-popover-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
          <p
            id={`${id}-doc-help`}
            className={`mt-1 text-xs ${missingDocument ? "text-risk-high" : "text-muted-foreground"}`}
          >
            {missingDocument
              ? "Escolha o documento a auditar."
              : "Só versões vigentes em .txt ou .md. PDF exigiria a análise paga."}
          </p>
        </div>
        <fieldset aria-describedby={`${id}-side-help`}>
          <legend className={labelClass}>Lado a simular</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(["claimant", "defendant"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${
                  side === value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:bg-secondary/40"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-side`}
                  value={value}
                  checked={side === value}
                  onChange={() => setSide(value)}
                  className="size-4 accent-[var(--primary)]"
                />
                {positionLabel[value]}
              </label>
            ))}
          </div>
          <p
            id={`${id}-side-help`}
            className={`mt-1 text-xs ${missingSide ? "text-risk-high" : "text-muted-foreground"}`}
          >
            {missingSide
              ? "Confirme o lado: não há valor presumido."
              : `Posição avaliada nesta oportunidade: ${positionLabel[opportunity.position_side]}. O lado simulado é confirmado a cada execução.`}
          </p>
        </fieldset>
        <div className="lg:col-span-2">
          <label htmlFor={`${id}-evidence`} className={labelClass}>
            Mapa de evidências (opcional)
          </label>
          <select
            id={`${id}-evidence`}
            value={evidenceId}
            onChange={(event) => setEvidenceId(event.target.value)}
            aria-describedby={`${id}-evidence-help`}
            disabled={sheets.length === 0}
            className={inputClass}
          >
            <option value="" className="bg-popover text-popover-foreground">
              {sheets.length === 0 ? "Nenhuma planilha .xlsx no dossiê" : "Sem mapa de evidências"}
            </option>
            {sheets.map((option) => (
              <option
                key={option.id}
                value={option.id}
                className="bg-popover text-popover-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
          <p id={`${id}-evidence-help`} className="mt-1 text-xs text-muted-foreground">
            A planilha é entregue ao motor antes da análise. Se o motor recusar o formato, a
            execução não prossegue sem ela.
          </p>
        </div>
      </div>

      <div aria-live="polite" className="mt-3">
        {start.isError && <ErrorNotice error={start.error} />}
        {start.isSuccess && (
          <p className="text-sm text-muted-foreground">
            Execução registrada. O estado é atualizado automaticamente.
          </p>
        )}
      </div>

      <WithHelp topic="startAudit" className="mt-3">
        <button type="submit" disabled={start.isPending} className={primaryButton}>
          {start.isPending ? (
            <>
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Enviando…
            </>
          ) : live ? (
            "Iniciar Auditoria (Consome API Paga)"
          ) : (
            "Iniciar Auditoria Simulada"
          )}
        </button>
      </WithHelp>
    </form>
  );
}

function documentLabel(opportunity: OpportunityDetail, versionId: string): string {
  for (const document of opportunity.documents) {
    const version = document.versions.find((v) => v.id === versionId);
    if (version) return `${document.title} · v${version.version_no}`;
  }
  return "Documento não localizado neste dossiê";
}

function RunCard({
  run,
  opportunity,
  onOpen,
}: {
  run: EngineRunOut;
  opportunity: OpportunityDetail;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => api.refreshEngineRun(run.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.engineRuns(opportunity.id) }),
  });
  const summary = blockSummary(run.blocks);
  const running = isRunActive(run);

  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Iniciada em <span className="tabular-nums">{formatDateTime(run.created_at)}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill className={engineStatusClasses[run.status]}>
              {running && (
                <Loader2
                  aria-hidden="true"
                  className="mr-1 inline size-3 animate-spin motion-reduce:animate-none"
                />
              )}
              {engineStatusLabel[run.status]}
            </Pill>
            {run.is_mock && (
              <Pill className="border-gold/40 bg-gold/15 text-gold">Modo simulado</Pill>
            )}
            {run.stale && (
              <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                Desatualizada
              </Pill>
            )}
            <Pill className="border-border text-muted-foreground">
              Dossiê v{run.dossier_version}
            </Pill>
            {run.attempts > 1 && (
              <Pill className="border-border text-muted-foreground">{run.attempts} tentativas</Pill>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {running && (
            <button
              type="button"
              disabled={refresh.isPending}
              onClick={() => refresh.mutate()}
              className={secondaryButton}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {refresh.isPending ? "Consultando…" : "Consultar o Motor"}
            </button>
          )}
          {run.findings_count > 0 && (
            <button type="button" onClick={onOpen} className={secondaryButton}>
              Ver {run.findings_count} {run.findings_count === 1 ? "Achado" : "Achados"}
            </button>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Lado simulado">{positionLabel[run.simulated_side]}</Info>
        <Info label="Documento auditado">
          {documentLabel(opportunity, run.document_version_ids[0])}
        </Info>
        <Info label="Blocos">
          {summary.total === 0 ? (
            <span className="text-muted-foreground">
              {running ? "Aguardando o motor" : "Nenhum bloco informado"}
            </span>
          ) : (
            <span className={summary.incomplete > 0 ? "text-risk-high" : ""}>
              {summary.completed} de {summary.total} concluídos
            </span>
          )}
        </Info>
        <Info label="Índice global de risco">
          {run.overall_risk_index != null ? (
            <span className="tabular-nums">{run.overall_risk_index}</span>
          ) : (
            <span className="text-muted-foreground">
              {run.status === "partial" ? "Não exibido: análise parcial" : "Não disponível"}
            </span>
          )}
        </Info>
        <Info label="Versão do checklist">
          {run.checklist_version ?? "Não informada pelo motor"}
        </Info>
        <Info label="Modelo">{run.model ?? "Não informado pelo motor"}</Info>
        <Info label="Custo">
          {run.cost_amount != null ? (
            <span className="tabular-nums">
              {run.cost_amount} {run.cost_currency}
            </span>
          ) : (
            <span className="text-muted-foreground">Não informado pelo motor</span>
          )}
        </Info>
        <Info label="Estado no motor">
          <span translate="no">{run.engine_status ?? "—"}</span>
        </Info>
        <Info label="Mapa de evidências">
          {run.evidence_map ? (
            <>
              <span translate="no">{run.evidence_map.filename}</span>
              {run.evidence_map.total_items != null &&
                ` · ${run.evidence_map.total_items} itens lidos pelo motor`}
            </>
          ) : (
            <span className="text-muted-foreground">Não enviado</span>
          )}
        </Info>
      </dl>

      {summary.incomplete > 0 && (
        <div className="mt-4">
          <h3 className={labelClass}>Blocos não concluídos</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {run.blocks
              .filter((block) => block.status !== "completed")
              .map((block) => (
                <li
                  key={block.key}
                  className="break-words rounded-md border border-risk-high/30 bg-risk-high/10 px-3 py-2"
                >
                  <span className="font-medium">
                    {block.key} · {block.label || "Bloco"}
                  </span>{" "}
                  — {block.status === "skipped" ? "não executado" : "falhou"}
                  {block.message ? `: ${block.message}` : ""}
                </li>
              ))}
          </ul>
        </div>
      )}

      {(run.limitations.length > 0 || run.stale_reason) && (
        <div className="mt-4">
          <h3 className={labelClass}>Limitações</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {run.stale_reason && <li>{run.stale_reason}. O resultado continua consultável.</li>}
            {run.limitations.map((text) => (
              <li key={text} className="break-words">
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EngineReportButton run={run} />

      <div aria-live="polite">
        {refresh.isError && (
          <div className="mt-3">
            <ErrorNotice error={refresh.error} />
          </div>
        )}
      </div>
    </article>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

function RunFindings({
  run,
  opportunity,
  canReview,
  canWrite,
}: {
  run: EngineRunOut;
  opportunity: OpportunityDetail;
  canReview: boolean;
  canWrite: boolean;
}) {
  const findings = useQuery({
    queryKey: queryKeys.engineFindings(run.id),
    queryFn: () => api.engineFindings(run.id),
  });

  return (
    <div className="mx-auto max-w-5xl">
      {run.is_mock && (
        <p
          role="note"
          className="mb-5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
        >
          <span className="font-medium">Modo simulado.</span> Estes achados foram gerados pelo modo
          de teste do motor e não representam análise do documento.
        </p>
      )}
      {run.status === "partial" && (
        <p
          role="note"
          className="mb-5 rounded-md border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm"
        >
          <span className="font-medium">Análise parcial.</span> Há blocos não concluídos: a lista
          abaixo não cobre a auditoria inteira.
        </p>
      )}
      {findings.isPending && <Loading label="Carregando achados…" />}
      {findings.isError && (
        <ErrorNotice
          error={
            findings.error instanceof ApiError ? findings.error : new Error("Falha ao carregar")
          }
          onRetry={() => findings.refetch()}
        />
      )}
      <ol className="space-y-5">
        {findings.data?.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            opportunity={opportunity}
            canReview={canReview}
            canWrite={canWrite}
          />
        ))}
      </ol>
    </div>
  );
}

function FindingCard({
  finding,
  opportunity,
  canReview,
  canWrite,
}: {
  finding: EngineFindingOut;
  opportunity: OpportunityDetail;
  canReview: boolean;
  canWrite: boolean;
}) {
  const otherBlockers = extraBlockers(finding.validation_blockers, finding.pendencies);
  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap gap-1.5">
        <Pill className="border-border text-muted-foreground">Bloco {finding.block_key}</Pill>
        <Pill className="border-border text-muted-foreground">
          Revisão: {reviewLabel[finding.review_state]}
        </Pill>
        {finding.pendencies.length > 0 && (
          <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
            Pendente de evidência
          </Pill>
        )}
      </div>
      <h3 className="mt-3 break-words text-base font-semibold leading-snug">{finding.title}</h3>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Info label="Índice de risco do motor">
          {finding.risk_index != null ? (
            <>
              <span className="tabular-nums">{finding.risk_index}</span>
              <span className="text-muted-foreground"> de 100 · não é estimativa de êxito</span>
            </>
          ) : (
            <span className="text-muted-foreground">Não informado</span>
          )}
        </Info>
        <Info label="Força do suporte">{supportLabel[finding.support_strength]}</Info>
        <div className="min-w-0 sm:col-span-2">
          <dt className={labelClass}>Fundamento</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
            {finding.basis || "Não informado pelo motor"}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className={labelClass}>Hipótese de consequência jurídica</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
            {finding.consequence_hypothesis || "Não informada pelo motor"}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <h4 className={labelClass}>Origem no documento</h4>
        {finding.citations.length === 0 ? (
          <p className="mt-1 text-sm text-risk-high">Sem citação resolvível.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {/* O motor pode citar a mesma página mais de uma vez: a posição entra na chave. */}
            {finding.citations.map((citation, index) => (
              <li key={`${citation.document_version_id}-${citation.page_start}-${index}`}>
                <span className="tabular-nums">
                  {formatPages(citation.page_start, citation.page_end ?? null)}
                </span>{" "}
                <a
                  href={documentContentUrl(citation.document_version_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Abrir original
                </a>
                {citation.source === "review" && (
                  <span className="ml-2 text-xs text-muted-foreground">informada por revisor</span>
                )}
                {citation.excerpt && (
                  <span className="block break-words text-muted-foreground">
                    “{citation.excerpt}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {finding.pendencies.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-risk-high">
            {finding.pendencies.map((pendency, index) => (
              <li key={`${pendency.code}-${index}`} className="break-words">
                {pendency.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {otherBlockers.length > 0 && (
        <div className="mt-4">
          <h4 className={labelClass}>Outros impedimentos para validar</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-risk-high">
            {otherBlockers.map((blocker, index) => (
              <li key={`${blocker.code}-${index}`} className="break-words">
                {blocker.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h4 className={labelClass}>Histórico de revisão</h4>
        {finding.reviews.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nenhuma revisão registrada.</p>
        ) : (
          <ol className="mt-2 space-y-2 text-sm">
            {[...finding.reviews].reverse().map((entry) => (
              <li key={entry.id} className="rounded-md border border-border px-3 py-2">
                <span className="font-medium">{entry.reviewer_name}</span>{" "}
                <span className="tabular-nums text-muted-foreground">
                  {formatDateTime(entry.created_at)}
                </span>
                <p className="mt-1">
                  {reviewLabel[entry.before.review_state ?? "pending"]} →{" "}
                  <span className="font-medium">
                    {reviewLabel[entry.after.review_state ?? "pending"]}
                  </span>
                </p>
                {entry.comment && (
                  <p className="mt-1 break-words text-muted-foreground">{entry.comment}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <FindingClaimLinks finding={finding} canWrite={canWrite} />

      {canReview ? (
        <FindingReviewForm finding={finding} opportunity={opportunity} />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          A revisão é reservada ao papel de revisor.
        </p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer rounded text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Saída original do motor
        </summary>
        <pre
          translate="no"
          className="mt-2 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface p-3 text-xs"
        >
          {JSON.stringify(finding.original, null, 2)}
        </pre>
      </details>
    </li>
  );
}

const REVIEW_STATES = Object.keys(reviewLabel) as ReviewState[];

function FindingReviewForm({
  finding,
  opportunity,
}: {
  finding: EngineFindingOut;
  opportunity: OpportunityDetail;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const options = citableVersions(opportunity.documents);
  const [state, setState] = useState<ReviewState>(finding.review_state);
  const [comment, setComment] = useState("");
  const [versionId, setVersionId] = useState("");
  const [page, setPage] = useState("");

  const review = useMutation({
    mutationFn: () =>
      api.reviewEngineFinding(finding.id, {
        review_state: state,
        comment: comment.trim(),
        ...(versionId && page
          ? { citation: { document_version_id: versionId, page_start: Number(page) } }
          : {}),
      }),
    onSuccess: () => {
      setComment("");
      setVersionId("");
      setPage("");
      queryClient.invalidateQueries({ queryKey: queryKeys.engineFindings(finding.run_id) });
    },
  });

  const blockers =
    review.error instanceof ApiError && review.error.code === "validation_blocked"
      ? ((review.error.details?.blockers as { code: string; message: string }[] | undefined) ?? [])
      : [];
  const selected = options.find((option) => option.id === versionId);
  const pageMissing = Boolean(versionId) && !page;

  return (
    <form
      aria-label={`Revisar achado: ${finding.title.slice(0, 80)}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!pageMissing) review.mutate();
      }}
      className="mt-4 rounded-lg border border-border bg-surface p-4"
    >
      <h4 className="text-sm font-semibold">Registrar Revisão</h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-state`} className={labelClass}>
            Estado da revisão
          </label>
          <select
            id={`${id}-state`}
            value={state}
            onChange={(event) => setState(event.target.value as ReviewState)}
            className={inputClass}
          >
            {REVIEW_STATES.map((value) => (
              <option key={value} value={value} className="bg-popover text-popover-foreground">
                {reviewLabel[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-doc`} className={labelClass}>
            Informar origem no documento (opcional)
          </label>
          <select
            id={`${id}-doc`}
            value={versionId}
            onChange={(event) => setVersionId(event.target.value)}
            className={inputClass}
          >
            <option value="" className="bg-popover text-popover-foreground">
              Não informar
            </option>
            {options.map((option) => (
              <option
                key={option.id}
                value={option.id}
                className="bg-popover text-popover-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {versionId && (
          <div>
            <label htmlFor={`${id}-page`} className={labelClass}>
              Página do arquivo
            </label>
            <input
              id={`${id}-page`}
              type="number"
              inputMode="numeric"
              min={1}
              max={selected?.pageCount ?? undefined}
              value={page}
              onChange={(event) => setPage(event.target.value)}
              aria-invalid={pageMissing}
              aria-describedby={pageMissing ? `${id}-page-error` : undefined}
              placeholder="Ex.: 12…"
              className={inputClass}
            />
            {pageMissing && (
              <p id={`${id}-page-error`} className="mt-1 text-xs text-risk-high">
                Informe a página do arquivo citado.
              </p>
            )}
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-comment`} className={labelClass}>
            Fundamento da revisão
          </label>
          <textarea
            id={`${id}-comment`}
            rows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-describedby={`${id}-comment-help`}
            placeholder="Ex.: Conferido com o laudo, página 12…"
            className={inputClass}
          />
          <p id={`${id}-comment-help`} className="mt-1 text-xs text-muted-foreground">
            Obrigatório para validar ou descartar. “Validado” significa revisado por responsável,
            não verdade judicial.
          </p>
        </div>
      </div>

      <div aria-live="polite" className="mt-3">
        {review.isError &&
          (blockers.length > 0 ? (
            <div
              role="alert"
              className="rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm"
            >
              <p className="font-medium">O achado não pode ser validado ainda:</p>
              <ul className="mt-1 list-disc pl-5">
                {blockers.map((blocker, index) => (
                  <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <ErrorNotice error={review.error} />
          ))}
        {review.isSuccess && <p className="text-sm text-risk-low">Revisão registrada.</p>}
      </div>

      <button type="submit" disabled={review.isPending} className={`${secondaryButton} mt-3`}>
        {review.isPending ? (
          <>
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Registrando…
          </>
        ) : (
          "Registrar Revisão"
        )}
      </button>
    </form>
  );
}

const relationLabel: Record<FindingClaimRelation, string> = {
  supports: "Sustenta o achado",
  contradicts: "Contraria o achado",
  related: "Relacionada",
};

/**
 * Afirmações do dossiê relacionadas ao achado por uma pessoa. O vínculo registra a relação
 * e não valida o achado nem a afirmação: o estado de cada um continua visível.
 */
function FindingClaimLinks({
  finding,
  canWrite,
}: {
  finding: EngineFindingOut;
  canWrite: boolean;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const claims = useQuery({
    queryKey: queryKeys.claims(finding.opportunity_id),
    queryFn: () => api.claims(finding.opportunity_id),
    enabled: canWrite,
  });
  const [claimId, setClaimId] = useState("");
  const [relation, setRelation] = useState<FindingClaimRelation>("supports");
  const [note, setNote] = useState("");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.engineFindings(finding.run_id) });
  const link = useMutation({
    mutationFn: () =>
      api.linkFindingClaim(finding.id, { claim_id: claimId, relation, note: note.trim() }),
    onSuccess: () => {
      setClaimId("");
      setNote("");
      refresh();
    },
  });
  const unlink = useMutation({ mutationFn: api.unlinkFindingClaim, onSuccess: refresh });
  const linked = new Set(finding.claim_links.map((item) => item.claim_id));
  const available = (claims.data ?? []).filter((claim) => !linked.has(claim.id));

  return (
    <div className="mt-4">
      <h4 className={labelClass}>Afirmações relacionadas</h4>
      {finding.claim_links.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhuma afirmação do dossiê foi relacionada a este achado.
        </p>
      ) : (
        <ul aria-label="Afirmações relacionadas ao achado" className="mt-2 space-y-2">
          {finding.claim_links.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start gap-2 rounded-md border border-border/60 bg-surface/40 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words">{item.claim_text}</p>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill className="border-primary/40 bg-primary/10 text-primary">
                    {relationLabel[item.relation]}
                  </Pill>
                  <Pill className="border-border text-muted-foreground">
                    Afirmação: {reviewLabel[item.claim_review_state]}
                  </Pill>
                  {item.claim_stale && (
                    <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                      Afirmação desatualizada
                    </Pill>
                  )}
                </span>
                {item.note && (
                  <p className="mt-1.5 break-words text-xs text-muted-foreground">{item.note}</p>
                )}
              </div>
              {canWrite && (
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={unlink.isPending}
                  onClick={() => unlink.mutate(item.id)}
                  aria-label={`Remover vínculo com a afirmação: ${item.claim_text.slice(0, 80)}`}
                >
                  Remover Vínculo
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form
          aria-label="Relacionar afirmação ao achado"
          onSubmit={(event) => {
            event.preventDefault();
            if (claimId) link.mutate();
          }}
          className="mt-3 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end"
        >
          <div>
            <label htmlFor={`${id}-claim`} className={labelClass}>
              Afirmação do dossiê
            </label>
            <select
              id={`${id}-claim`}
              value={claimId}
              onChange={(event) => setClaimId(event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione…</option>
              {available.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  {claim.text.length > 90 ? `${claim.text.slice(0, 89)}…` : claim.text}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-relation`} className={labelClass}>
              Relação
            </label>
            <select
              id={`${id}-relation`}
              value={relation}
              onChange={(event) => setRelation(event.target.value as FindingClaimRelation)}
              className={inputClass}
            >
              {(Object.keys(relationLabel) as FindingClaimRelation[]).map((value) => (
                <option key={value} value={value}>
                  {relationLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-note`} className={labelClass}>
              Observação
            </label>
            <input
              id={`${id}-note`}
              type="text"
              autoComplete="off"
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Opcional…"
              className={inputClass}
            />
          </div>
          <button type="submit" className={secondaryButton} disabled={!claimId || link.isPending}>
            {link.isPending ? "Relacionando…" : "Relacionar Afirmação"}
          </button>
        </form>
      )}
      <div aria-live="polite" className="mt-2">
        {link.isError && <ErrorNotice error={link.error} />}
        {unlink.isError && <ErrorNotice error={unlink.error} />}
      </div>
    </div>
  );
}

/** Relatório .docx montado pelo próprio motor. Só leitura: nada entra no dossiê. */
function EngineReportButton({ run }: { run: EngineRunOut }) {
  const report = useMutation({
    mutationFn: () => api.engineRunReport(run.id),
    onSuccess: (blob) =>
      downloadBlob(blob, `nulidade360-${run.id.slice(0, 8)}${run.is_mock ? "-SIMULADO" : ""}.docx`),
  });
  if (!run.external_ref || run.status === "queued" || run.status === "running") return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        className={secondaryButton}
        disabled={report.isPending}
        onClick={() => report.mutate()}
      >
        {report.isPending ? "Buscando…" : "Baixar Relatório do Motor"}
      </button>{" "}
      <Help topic="engineReport" />
      <div aria-live="polite">
        {report.isError && (
          <div className="mt-2">
            <ErrorNotice error={report.error} />
          </div>
        )}
      </div>
    </div>
  );
}
