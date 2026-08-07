import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  ShieldAlert,
  Swords,
  TrendingUp,
  CalendarClock,
  GitBranch,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CaseDocumentViewer } from "@/components/cases/CaseDocumentViewer";
import { EconomicPotentialCard } from "@/components/cases/EconomicPotentialCard";
import { RiskHierarchy } from "@/components/cases/RiskHierarchy";
import { HelpHint } from "@/components/shared/HelpHint";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { featuredDealId, mockDeals, purchaseProfileLabel } from "@/data/mockDeals";
import { getCaseDetail } from "@/data/mockCaseDetail";
import { formatCurrency } from "@/lib/formatters";
import { recommendationClasses, recommendationLabel, type Recommendation } from "@/lib/risk";

export const Route = createFileRoute("/deals/$id")({
  loader: ({ params }) => {
    const requestedId = params.id === "atlas-energia-delta" ? featuredDealId : params.id;
    const deal = mockDeals.find((d) => d.id === requestedId);
    if (!deal) throw notFound();
    return { deal };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="text-muted-foreground">Caso não encontrado.</div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="text-risk-critical">{error.message}</div>
    </AppShell>
  ),
  component: DealDetail,
});

function DealDetail() {
  const { deal } = Route.useLoaderData();
  const c = getCaseDetail(deal.id)!;

  const modules = [
    {
      id: "nulidade360",
      name: "Nulidade360",
      to: "/nulidade360",
      icon: ShieldAlert,
      accent: "violet",
    },
    { id: "red-team", name: "Red Team", to: "/red-team", icon: Swords, accent: "risk-high" },
    { id: "valuation", name: "Valuation", to: "/valuation", icon: TrendingUp, accent: "cyan" },
    {
      id: "memo",
      name: "Investment Memo",
      to: "/relatorios/investment-memo",
      icon: FileText,
      accent: "gold",
    },
  ] as const;

  return (
    <AppShell context={`Casos · ${deal.name}`}>
      <SectionHeader
        eyebrow={`${c.court} · ${c.caseNumber}`}
        title={deal.name}
        subtitle={c.thesis}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <GitBranch className="size-3.5" /> Fase: {deal.proceduralPhase}
              <HelpHint
                label="fase processual"
                text="Momento atual do processo, definido a partir do último andamento disponível nos autos."
              />
            </span>
            <span className="inline-flex items-center rounded-md border border-cyan/30 bg-cyan/5 px-3 py-1.5 text-xs font-medium text-cyan">
              #{deal.rankingPosition} · Perfil {purchaseProfileLabel[deal.purchaseProfile]}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${recommendationClasses[deal.recommendation as Recommendation]}`}
            >
              Recomendação: {recommendationLabel[deal.recommendation as Recommendation]}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-wider text-primary">
            Resumo executivo EvidIA
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{c.executiveSummary}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat
              help="Valor econômico atribuído aos pedidos do processo."
              label="Valor da causa"
              value={
                deal.caseValue ? formatCurrency(deal.caseValue, { compact: true }) : "A confirmar"
              }
            />
            <Stat
              help="Preço-base de aquisição, equivalente a 10% do Valor Econômico Potencial (relação 1:10)."
              label="Deal Value"
              value={
                deal.potentialTicket
                  ? formatCurrency(deal.potentialTicket, { compact: true })
                  : "A confirmar"
              }
            />
            <Stat
              help="Valor informado na ação multiplicado pelo fator correspondente ao tempo decorrido desde a distribuição."
              label="Valor econômico potencial"
              value={
                deal.economicPotential.valorEconomicoPotencial
                  ? formatCurrency(deal.economicPotential.valorEconomicoPotencial, {
                      compact: true,
                    })
                  : "A confirmar"
              }
              color="text-risk-low"
            />
            <Stat
              label="Documentos analisados"
              value={String(c.documentsAnalyzed)}
              help="Quantidade de documentos que já passaram pela estruturação e análise EvidIA."
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center">
          {deal.dataStatus === "awaiting_documents" ? (
            <div className="grid size-40 place-items-center rounded-full border-8 border-border text-center">
              <div>
                <div className="text-3xl font-semibold">—</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Dados pendentes
                </div>
              </div>
            </div>
          ) : (
            <>
              <ScoreRing value={deal.evidiaScore} size={160} label="Risco jurídico" />
              <div className="mt-4 flex gap-2">
                <RiskBadge level={deal.evidenceRisk} />
              </div>
            </>
          )}
          <div className="mt-3 text-xs text-muted-foreground text-center">
            <span className="inline-flex items-center gap-2">
              Score global do relatório Nulidade360 · quanto maior, maior o risco{" "}
              <HelpHint
                label="score EvidIA"
                text="Score jurídico-probatório preservado do relatório revisado. Ele mede risco, e não atratividade de compra."
              />
            </span>
          </div>
        </div>
      </div>

      <EconomicPotentialCard calculation={deal.economicPotential} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <ScoreCard
          label="Jurídico"
          value={c.legalScore}
          help="Consistência da tese jurídica e aderência aos elementos do processo."
        />
        <ScoreCard
          label="Probatório"
          value={c.evidenceScore}
          help="Força, cobertura e rastreabilidade das evidências disponíveis."
        />
        <ScoreCard
          label="Nulidade"
          value={c.nullityScore}
          help="Intensidade do risco de invalidação ou perda de utilidade de atos e provas."
        />
        <ScoreCard
          label="Potencial de acordo"
          value={c.settlementPotential}
          help="Alavanca estimada para composição, considerando riscos e posição das partes."
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CaseDocumentViewer sourceFiles={c.sourceFiles} pages={c.pagesAnalyzed} />
        </div>
        <RiskHierarchy current={deal.evidenceRisk} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4 text-primary" /> Timeline processual
          </div>
          {c.timeline.length > 0 ? (
            <ol className="mt-5 ml-2 space-y-4 border-l border-border">
              {c.timeline.map((t, i) => (
                <li key={`${t.date}-${t.label}`} className="relative pl-5">
                  <span
                    className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ${i === c.timeline.length - 1 ? "bg-primary" : "bg-border"}`}
                  />
                  <div className="text-xs text-muted-foreground tabular-nums">{t.date}</div>
                  <div className="text-sm">{t.label}</div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-border bg-surface/40 p-4 text-sm text-muted-foreground">
              Timeline detalhada pendente. A fase “laudo juntado” veio do relatório, mas a
              movimentação primária mais recente ainda precisa ser confirmada.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Módulos EvidIA aplicados</div>
          <div className="mt-4 space-y-2">
            {c.modulesApplied.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.findings} achados · {m.status}
                  </div>
                </div>
                <span
                  className={`size-2 rounded-full ${m.status === "Concluído" ? "bg-risk-low" : "bg-muted-foreground/50"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="text-sm font-semibold mb-4">Aprofundar análise</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {modules.map((m) => (
            <Link
              key={m.id}
              to={m.to}
              className="group flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid size-9 place-items-center rounded-md border border-border"
                  style={{ color: `var(--${m.accent})` }}
                >
                  <m.icon className="size-4" />
                </div>
                <div className="text-sm font-medium">{m.name}</div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  color,
  help,
}: {
  label: string;
  value: string;
  color?: string;
  help?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function ScoreCard({ label, value, help }: { label: string; value: number | null; help: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        <HelpHint label={label} text={help} />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className="text-3xl font-semibold tabular-nums">{value ?? "—"}</div>
        {value !== null && <div className="mb-1 text-xs text-muted-foreground">/ 100</div>}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}
