import { useCallback, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ClaimsSection } from "@/components/operacao/ClaimsSection";
import { DecisionSection } from "@/components/operacao/DecisionSection";
import { DiligenceSection } from "@/components/operacao/DiligenceSection";
import { DocumentDetail } from "@/components/operacao/DocumentDetail";
import { DocumentsSection, GapsSection } from "@/components/operacao/DocumentsSection";
import { EconomicsSection } from "@/components/operacao/EconomicsSection";
import { EnginesSection } from "@/components/operacao/EnginesSection";
import { OperationalShell } from "@/components/operacao/OperationalShell";
import { P4Section } from "@/components/operacao/P4Section";
import { ScenariosSection } from "@/components/operacao/ScenariosSection";
import { StageNav, StageSummary } from "@/components/operacao/StageNav";
import { useOperationalUser } from "@/lib/operacao/useOperationalUser";
import { useStages } from "@/lib/operacao/useStages";
import {
  ErrorNotice,
  FullscreenDetail,
  Help,
  labelClass,
  Loading,
  Pill,
  secondaryButton,
  SyntheticBadge,
} from "@/components/operacao/primitives";
import { api, queryKeys } from "@/lib/operacao/api";
import { formatDateTime, originLabel, positionLabel } from "@/lib/operacao/labels";
import { parseStage } from "@/lib/operacao/stages";
import {
  defaultTableState,
  isDefaultState,
  parseTableState,
  type TableState,
} from "@/lib/operacao/tableState";
import type { OpportunityDetail, SnapshotOut } from "@/lib/operacao/types";

type TableSlot = "docs" | "afirm" | "ach" | "p4" | "lac" | "calc";
const TABLE_SLOTS: TableSlot[] = ["docs", "afirm", "ach", "p4", "lac", "calc"];
type DossierSearch = { detalhe?: string; etapa?: number } & Partial<Record<TableSlot, TableState>>;

export const Route = createFileRoute("/operacao/$id")({
  head: () => ({ meta: [{ title: "Dossiê — Operação EvidIA" }] }),
  // O detalhe aberto fica na URL: voltar restaura a tela anterior na mesma posição.
  // O mesmo vale para a consulta das tabelas de documentos e de afirmações.
  validateSearch: (search: Record<string, unknown>): DossierSearch => {
    const out: DossierSearch = {};
    if (typeof search.detalhe === "string") out.detalhe = search.detalhe;
    // Etapa aberta; ausente = visão completa. O caso é o mesmo em qualquer etapa.
    const etapa = parseStage(search.etapa);
    if (etapa !== undefined) out.etapa = etapa;
    for (const slot of TABLE_SLOTS) {
      const state = parseTableState(search[slot]);
      if (!isDefaultState(state)) out[slot] = state;
    }
    return out;
  },
  component: () => (
    <OperationalShell context="Dossiê">
      <Dossier />
    </OperationalShell>
  ),
});

const WRITERS = ["admin", "analyst", "reviewer"];
const REVIEWERS = ["admin", "reviewer"];

function Dossier() {
  const { id } = Route.useParams();
  const { detalhe, etapa, docs, afirm, ach, p4, lac, calc } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const user = useOperationalUser();
  const query = useQuery({
    queryKey: queryKeys.opportunity(id),
    queryFn: () => api.opportunity(id),
  });

  const open = useCallback(
    (value: string) =>
      navigate({ search: (prev) => ({ ...prev, detalhe: value }), resetScroll: false }),
    [navigate],
  );
  const close = useCallback(
    () =>
      navigate({
        search: (prev) => ({ ...prev, detalhe: undefined }),
        resetScroll: false,
        replace: true,
      }),
    [navigate],
  );
  const stages = useStages(id);
  const selectStage = useCallback(
    (stage: number | undefined) =>
      navigate({ search: (prev) => ({ ...prev, etapa: stage, detalhe: undefined }) }),
    [navigate],
  );
  const tableSetters = useMemo(() => {
    const setter = (slot: TableSlot) => (next: TableState, options?: { replace?: boolean }) =>
      navigate({
        search: (prev) => ({ ...prev, [slot]: isDefaultState(next) ? undefined : next }),
        replace: options?.replace,
        resetScroll: false,
      });
    return {
      docs: setter("docs"),
      afirm: setter("afirm"),
      ach: setter("ach"),
      p4: setter("p4"),
      lac: setter("lac"),
      calc: setter("calc"),
    };
  }, [navigate]);

  if (query.isPending) return <Loading label="Carregando dossiê…" />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => query.refetch()} />;

  const opportunity = query.data;
  const canWrite = !!user && WRITERS.includes(user.role);
  const canReview = !!user && REVIEWERS.includes(user.role);
  const latest = opportunity.snapshots[0];
  // Sem etapa na URL, todas as seções aparecem (visão completa).
  const shows = (stage: number) => etapa === undefined || etapa === stage;
  const currentStage = stages.data?.find((stage) => stage.number === etapa);
  const openClaimId = detalhe?.startsWith("afirmacao:") ? detalhe.slice("afirmacao:".length) : null;
  const openCalculation = detalhe?.startsWith("calculo:") ? detalhe.slice("calculo:".length) : null;
  const openEngineRun = detalhe?.startsWith("motor:") ? detalhe.slice("motor:".length) : null;
  const openDiligence = detalhe?.startsWith("diligencia:")
    ? detalhe.slice("diligencia:".length)
    : null;
  const openDocument = detalhe?.startsWith("documento:")
    ? detalhe.slice("documento:".length)
    : null;

  return (
    <>
      <Link to="/operacao" className={secondaryButton}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para Oportunidades
      </Link>

      <header className="mt-5 rounded-xl border border-border bg-card p-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
          Dossiê da oportunidade
        </div>
        <h1 className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {opportunity.title || "Título não informado pela origem"}
        </h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opportunity.is_synthetic && <SyntheticBadge />}
          <Pill className="border-primary/40 bg-primary/10 text-primary">
            Posição avaliada: {positionLabel[opportunity.position_side]}
          </Pill>
          <Pill className="border-border text-muted-foreground">Contrato: não definido</Pill>
          <Pill className="border-border text-muted-foreground">
            Dossiê v{opportunity.dossier_version}
          </Pill>
          {opportunity.process.status === "draft" && (
            <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">Rascunho</Pill>
          )}
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Processo (CNJ)">
            <span className="tabular-nums" translate="no">
              {opportunity.process.cnj ?? "Sem CNJ válido"}
            </span>
          </Info>
          <Info label="Tribunal">{opportunity.process.court_label ?? "Não identificado"}</Info>
          <Info label="Parte representada">{opportunity.represented_party}</Info>
          <Info label="Origem">
            {originLabel(opportunity.origin_system)} ·{" "}
            <span translate="no">{opportunity.origin_external_id}</span>
          </Info>
        </dl>
        {opportunity.process.draft_reason && (
          <p className="mt-4 rounded-md border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm">
            {opportunity.process.draft_reason}
          </p>
        )}
      </header>

      <StageNav stages={stages.data} current={etapa} onSelect={selectStage} />
      {stages.isError && <ErrorNotice error={stages.error} onRetry={() => stages.refetch()} />}
      {currentStage && <StageSummary stage={currentStage} />}

      {shows(1) && opportunity.integral_opinion_blockers.length > 0 && (
        <section
          aria-label="Bloqueios do parecer integral"
          className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm"
        >
          <h2 className="font-semibold">Parecer integral indisponível</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {opportunity.integral_opinion_blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </section>
      )}

      {shows(1) && opportunity.conflicts.some((conflict) => conflict.status === "open") && (
        <section
          aria-label="Conflitos entre snapshots"
          className="mt-5 rounded-xl border border-risk-critical/40 bg-risk-critical/10 p-4 text-sm"
        >
          <h2 className="font-semibold">Conflito de identidade a revisar</h2>
          <p className="mt-1 text-muted-foreground">
            A origem passou a informar dados diferentes. Nada foi substituído automaticamente.
          </p>
          <ul className="mt-2 space-y-2">
            {opportunity.conflicts
              .filter((conflict) => conflict.status === "open")
              .map((conflict) => (
                <li
                  key={conflict.id}
                  className="break-words rounded-md border border-border bg-card px-3 py-2"
                >
                  <span className={labelClass}>
                    {conflict.field === "parties" ? "Partes" : "CNJ"}
                  </span>
                  <br />
                  Antes: {conflict.previous_value}
                  <br />
                  Agora: {conflict.incoming_value}
                </li>
              ))}
          </ul>
        </section>
      )}

      {shows(1) && latest && (
        <SnapshotSummary
          snapshot={latest}
          total={opportunity.snapshots.length}
          onOpen={() => open("snapshot")}
        />
      )}

      {shows(1) && (
        <GapsSection
          opportunity={opportunity}
          canWrite={canWrite}
          tableState={lac ?? defaultTableState}
          onTableState={tableSetters.lac}
        />
      )}
      {shows(2) && (
        <DocumentsSection
          opportunity={opportunity}
          canWrite={canWrite}
          tableState={docs ?? defaultTableState}
          onOpenDocument={(versionId) => open(`documento:${versionId}`)}
          onTableState={tableSetters.docs}
        />
      )}
      {shows(2) && (
        <ClaimsSection
          opportunity={opportunity}
          canWrite={canWrite}
          canReview={canReview}
          openClaimId={openClaimId}
          onOpenClaim={(claimId) => open(`afirmacao:${claimId}`)}
          onCloseClaim={close}
          tableState={afirm ?? defaultTableState}
          onTableState={tableSetters.afirm}
        />
      )}
      {shows(3) && (
        <EnginesSection
          opportunity={opportunity}
          canWrite={canWrite}
          canReview={canReview}
          openRunId={openEngineRun}
          onOpenRun={(runId) => open(`motor:${runId}`)}
          onCloseRun={close}
          tableOpen={detalhe === "achados"}
          onOpenTable={() => open("achados")}
          tableState={ach ?? defaultTableState}
          onTableState={tableSetters.ach}
        />
      )}
      {shows(3) && (
        <P4Section
          opportunity={opportunity}
          canWrite={canWrite}
          open={detalhe === "p4"}
          onOpen={() => open("p4")}
          onClose={close}
          tableState={p4 ?? defaultTableState}
          onTableState={tableSetters.p4}
        />
      )}
      {shows(4) && (
        <ScenariosSection
          opportunity={opportunity}
          canWrite={canWrite}
          open={detalhe === "contraditorio"}
          onOpen={() => open("contraditorio")}
          onClose={close}
        />
      )}
      {shows(3) && (
        <DiligenceSection
          opportunity={opportunity}
          canWrite={canWrite}
          canReview={canReview}
          openTab={openDiligence}
          onOpen={(tab) => open(`diligencia:${tab}`)}
          onClose={close}
        />
      )}
      {shows(5) && (
        <EconomicsSection
          opportunity={opportunity}
          canWrite={canWrite}
          openDetail={openCalculation}
          onOpenDetail={(detail) => open(`calculo:${detail}`)}
          onCloseDetail={close}
          tableState={calc ?? defaultTableState}
          onTableState={tableSetters.calc}
        />
      )}
      {shows(6) && (
        <DecisionSection opportunity={opportunity} canReview={canReview} stages={stages.data} />
      )}

      {openDocument && (
        <FullscreenDetail
          eyebrow="Documento do dossiê"
          title="Texto e Estrutura do Documento"
          onBack={close}
        >
          <DocumentDetail opportunity={opportunity} versionId={openDocument} canWrite={canWrite} />
        </FullscreenDetail>
      )}

      {detalhe === "snapshot" && (
        <FullscreenDetail
          eyebrow="Snapshot da originação"
          title="Histórico de Snapshots"
          onBack={close}
        >
          <SnapshotHistory opportunity={opportunity} />
        </FullscreenDetail>
      )}
    </>
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

const completenessLabel: Record<string, string> = {
  so_capa: "Somente capa",
  movimentos: "Movimentos",
  movimentos_e_publicacoes: "Movimentos e publicações",
  autos: "Autos",
};

function SnapshotSummary({
  snapshot,
  total,
  onOpen,
}: {
  snapshot: SnapshotOut;
  total: number;
  onOpen: () => void;
}) {
  const payload = snapshot.payload;
  return (
    <section aria-labelledby="snapshot-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="snapshot-title" className="text-lg font-semibold tracking-tight">
              Snapshot da Origem
            </h2>
            <Help topic="snapshot" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Versão {snapshot.version_no} de {total} · consultado em{" "}
            <span className="tabular-nums">{formatDateTime(snapshot.fetched_at)}</span>
          </p>
        </div>
        <button type="button" onClick={onOpen} className={secondaryButton}>
          Ver Snapshot Completo
        </button>
      </div>
      <dl className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Partes informadas">
          {payload.parties.length === 0 ? (
            <span className="text-risk-high">Não informadas pela origem</span>
          ) : (
            <ul className="space-y-0.5">
              {payload.parties.map((party) => (
                <li key={`${party.role}-${party.name}`}>
                  <span className="text-muted-foreground">
                    {party.role === "claimant"
                      ? "Autor"
                      : party.role === "defendant"
                        ? "Réu"
                        : "Parte"}
                    :
                  </span>{" "}
                  {party.name}
                </li>
              ))}
            </ul>
          )}
        </Info>
        <Info label="Classe e assunto">
          {payload.case_class ?? "Não informada"}
          {payload.subject ? ` · ${payload.subject}` : ""}
        </Info>
        <Info label="Estudo da originação">
          {payload.study ? (
            <>
              Relatório derivado · cobertura:{" "}
              {completenessLabel[payload.study.completeness ?? ""] ?? "não informada"}
              <br />
              <span className="text-muted-foreground">
                {payload.study.has_full_record ? "Baseado nos autos" : "Sem acesso aos autos"}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Não disponível</span>
          )}
        </Info>
        <Info label="Atualizado na origem">
          <span className="tabular-nums">{formatDateTime(snapshot.source_updated_at)}</span>
        </Info>
      </dl>
    </section>
  );
}

function SnapshotHistory({ opportunity }: { opportunity: OpportunityDetail }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {opportunity.snapshots.map((snapshot) => (
        <article key={snapshot.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">Versão {snapshot.version_no}</h3>
            {snapshot.is_synthetic && <SyntheticBadge />}
          </div>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <Info label="Consultado em">
              <span className="tabular-nums">{formatDateTime(snapshot.fetched_at)}</span>
            </Info>
            <Info label="Origem">{originLabel(snapshot.origin_system)}</Info>
            <Info label="Hash do conteúdo">
              <span className="font-mono text-xs" translate="no">
                {snapshot.content_hash}
              </span>
            </Info>
          </dl>

          {snapshot.differences.length > 0 && (
            <div className="mt-4">
              <h4 className={labelClass}>Diferenças em relação à versão anterior</h4>
              <ul className="mt-2 space-y-2 text-sm">
                {snapshot.differences.map((difference) => (
                  <li key={difference.field} className="rounded-md border border-border p-3">
                    <span className="font-medium" translate="no">
                      {difference.field}
                    </span>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2">
                      <pre className="overflow-auto whitespace-pre-wrap break-words rounded bg-surface p-2 text-xs text-muted-foreground">
                        {JSON.stringify(difference.previous, null, 2)}
                      </pre>
                      <pre className="overflow-auto whitespace-pre-wrap break-words rounded bg-surface p-2 text-xs">
                        {JSON.stringify(difference.incoming, null, 2)}
                      </pre>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <h4 className={labelClass}>Lacunas declaradas na importação</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {snapshot.payload.gaps.map((gap) => (
                <li key={gap.code}>
                  {gap.description}
                  <span className="text-muted-foreground"> — {gap.reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer rounded text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Conteúdo importado (como normalizado)
            </summary>
            <pre className="mt-2 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface p-3 text-xs">
              {JSON.stringify(snapshot.payload, null, 2)}
            </pre>
          </details>
        </article>
      ))}
    </div>
  );
}
