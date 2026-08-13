import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, FileText, ShieldAlert, Swords, TrendingUp, GitBranch } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CaseDocumentViewer } from "@/components/cases/CaseDocumentViewer";
import { EconomicPotentialCard } from "@/components/cases/EconomicPotentialCard";
import { ProceduralTimeline } from "@/components/cases/ProceduralTimeline";
import { RiskHierarchy } from "@/components/cases/RiskHierarchy";
import { HelpHint } from "@/components/shared/HelpHint";
import { EditableText, EditableValue } from "@/components/shared/Editable";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { featuredDealId, mockDeals, purchaseProfileLabel } from "@/data/mockDeals";
import { getCaseDetail } from "@/data/mockCaseDetail";
import { formatCurrency } from "@/lib/formatters";
import { calculateCriticality } from "@/lib/criticalityScore";
import { FIELD_HELP } from "@/config/fieldHelp";
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
  const criticality = calculateCriticality({
    nullityRisk: c.nullityScore,
    evidenceScore: c.evidenceScore,
    legalScore: c.legalScore,
    settlementLeverage: c.settlementPotential,
  });

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
              <HelpHint label="fase processual" text={FIELD_HELP.faseProcessual} />
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-cyan/30 bg-cyan/5 px-3 py-1.5 text-xs font-medium text-cyan">
              #{deal.rankingPosition} · Perfil {purchaseProfileLabel[deal.purchaseProfile]}
              <HelpHint label="perfil de compra" text={FIELD_HELP.perfilCompra} />
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${recommendationClasses[deal.recommendation as Recommendation]}`}
            >
              Recomendação: {recommendationLabel[deal.recommendation as Recommendation]}
              <HelpHint label="recomendação" text={FIELD_HELP.recomendacao} align="right" />
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-wider text-primary">
            Resumo executivo EvidIA
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            <EditableText
              overrideKey={`${deal.id}.executiveSummary`}
              label="resumo executivo"
              value={c.executiveSummary}
              multiline
            />
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat
              help={FIELD_HELP.valorDaCausa}
              label="Valor da causa"
              value={
                deal.caseValue ? (
                  <EditableValue
                    overrideKey={`${deal.id}.caseValue`}
                    label="valor da causa"
                    value={deal.caseValue}
                    format="compact"
                  />
                ) : (
                  "A confirmar"
                )
              }
            />
            <Stat
              help={FIELD_HELP.dealValue}
              label="Deal Value"
              value={
                deal.potentialTicket ? (
                  <EditableValue
                    overrideKey={`${deal.id}.potentialTicket`}
                    label="deal value"
                    value={deal.potentialTicket}
                    format="compact"
                  />
                ) : (
                  "A confirmar"
                )
              }
            />
            <Stat
              help={FIELD_HELP.valorAtualizado}
              label="Valor econômico potencial"
              value={
                deal.economicPotential.valorEconomicoPotencial ? (
                  <EditableValue
                    overrideKey={`${deal.id}.economicPotential`}
                    label="valor econômico potencial"
                    value={deal.economicPotential.valorEconomicoPotencial}
                    format="compact"
                  />
                ) : (
                  "A confirmar"
                )
              }
              color="text-risk-low"
              align="right"
            />
            <Stat
              label="Documentos analisados"
              value={String(c.documentsAnalyzed)}
              help={FIELD_HELP.documentosAnalisados}
              align="right"
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
              <HelpHint label="score EvidIA" text={FIELD_HELP.score} />
            </span>
          </div>
        </div>
      </div>

      <EconomicPotentialCard calculation={deal.economicPotential} caseId={deal.id} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <ScoreCard
          label="Jurídico"
          overrideKey={`${deal.id}.legalScore`}
          value={c.legalScore}
          help={FIELD_HELP.scoreJuridico}
        />
        <ScoreCard
          label="Probatório"
          overrideKey={`${deal.id}.evidenceScore`}
          value={c.evidenceScore}
          help={FIELD_HELP.scoreProbatorio}
        />
        <ScoreCard
          label="Nulidade"
          overrideKey={`${deal.id}.nullityScore`}
          value={c.nullityScore}
          help={FIELD_HELP.scoreNulidade}
        />
        <ScoreCard
          label="Potencial de acordo"
          overrideKey={`${deal.id}.settlementPotential`}
          value={c.settlementPotential}
          help={FIELD_HELP.scoreAcordo}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CaseDocumentViewer sourceFiles={c.sourceFiles} pages={c.pagesAnalyzed} />
        </div>
        <RiskHierarchy current={deal.evidenceRisk} criticality={criticality} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <ProceduralTimeline events={c.proceduralTimeline} filingDate={deal.filingDate} />
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
  align,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  help?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} align={align} />}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  help,
  overrideKey,
}: {
  label: string;
  value: number | null;
  help: string;
  overrideKey: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        <HelpHint label={label} text={help} />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className="text-3xl font-semibold tabular-nums">
          {value !== null ? (
            <EditableValue
              overrideKey={overrideKey}
              label={label.toLocaleLowerCase("pt-BR")}
              value={value}
              format="score"
            />
          ) : (
            "—"
          )}
        </div>
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
