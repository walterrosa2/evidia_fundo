import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Filter, Layers, Search, Swords } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { HelpHint } from "@/components/shared/HelpHint";
import { PillarHeatmap } from "@/components/nulidade/PillarHeatmap";
import { FindingSheet } from "@/components/nulidade/FindingSheet";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { getNullityReport, type NullityPillarId } from "@/data/v2/nullityReports";
import { recommendationClasses, recommendationLabel } from "@/lib/risk";

export const Route = createFileRoute("/nulidade360/resultado")({
  component: Resultado,
});

const LEVEL_LABEL = {
  low: "Baixo",
  moderate: "Moderado",
  high: "Alto",
  critical: "Crítico",
} as const;

const LEVEL_TONE = {
  low: "text-risk-low",
  moderate: "text-risk-moderate",
  high: "text-risk-high",
  critical: "text-risk-critical",
} as const;

const LEVEL_VAR = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
} as const;

type RiskFilter = "todos" | "critical" | "high" | "moderate" | "low";

function Resultado() {
  const { selectedDeal } = useCaseSelection();
  const report = getNullityReport(selectedDeal.id);
  const [pillar, setPillar] = useState<NullityPillarId | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("todos");

  const findings = useMemo(() => {
    if (!report) return [];
    return [...report.findings]
      .filter((finding) => (pillar ? finding.pillar === pillar : true))
      .filter((finding) => (riskFilter === "todos" ? true : finding.riskLevel === riskFilter))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [report, pillar, riskFilter]);

  const ctas = [
    { to: "/nulidade360/blocos", label: "Análise por bloco", icon: Layers },
    { to: "/nulidade360/evidencias", label: "Ver evidências", icon: Search },
    { to: "/red-team", label: "Red Team adversarial", icon: Swords },
    { to: "/relatorios/investment-memo", label: "Investment Memo", icon: FileText },
  ] as const;

  if (!report) {
    return (
      <AppShell context={`Nulidade360 · ${selectedDeal.name}`}>
        <SectionHeader
          eyebrow={`Resultado executivo · ${selectedDeal.name}`}
          title="Parecer de nulidade não disponível"
          subtitle="Este processo ainda não passou pela auditoria dos catorze pilares. Sem o parecer, não há score de nulidade que sustente decisão de preço."
        />
      </AppShell>
    );
  }

  const riskCounts = {
    critical: report.findings.filter((item) => item.riskLevel === "critical").length,
    high: report.findings.filter((item) => item.riskLevel === "high").length,
    moderate: report.findings.filter((item) => item.riskLevel === "moderate").length,
    low: report.findings.filter((item) => item.riskLevel === "low").length,
  };

  return (
    <AppShell context={`Nulidade360 · Resultado · ${selectedDeal.name}`}>
      <SectionHeader
        eyebrow={`Parecer de auditoria jurídico-pericial · ${selectedDeal.name}`}
        title={`Risco de nulidade ${LEVEL_LABEL[report.globalLevel].toLowerCase()} — score ${report.globalScore}`}
        subtitle="Resultado consolidado da auditoria dos catorze pilares de invalidação processual. Cada achado declara o dever violado, o prejuízo, o nexo causal e a ação recomendada."
        actions={
          <span
            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${recommendationClasses[selectedDeal.recommendation]}`}
          >
            Recomendação: {recommendationLabel[selectedDeal.recommendation]}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
          <ScoreRing value={report.globalScore} size={170} />
          <div className="mt-4 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Nível global
            </div>
            <div className={`mt-1 text-lg font-semibold ${LEVEL_TONE[report.globalLevel]}`}>
              {LEVEL_LABEL[report.globalLevel]}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {report.acceptedFindings} achados aceitos após revisão humana
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Como o score foi apurado
            <HelpHint
              label="composição do score"
              text="O que é: o score global de risco de nulidade, na escala de 0 a 100. Como é calculado: ponderação jurídico-pericial que combina a média dos achados, o achado de maior risco, a quantidade de achados críticos e a amplitude de pilares afetados. Como ler: amplitude importa tanto quanto intensidade — muitos pilares atingidos indicam fragilidade estrutural, e não pontual."
            />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {report.scoreExplanation}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Média ponderada" value={report.weightedAverage.toFixed(2)} />
            <Stat label="Maior risco" value={report.maxRisk.toFixed(2)} />
            <Stat label="Achados críticos" value={String(report.criticalFindings)} />
            <Stat label="Pilares afetados" value={`${report.affectedPillars} / 14`} />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Distribuição dos achados por nível
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full border border-border">
              {(["critical", "high", "moderate", "low"] as const).map((level) =>
                riskCounts[level] > 0 ? (
                  <div
                    key={level}
                    style={{
                      width: `${(riskCounts[level] / report.findings.length) * 100}%`,
                      background: LEVEL_VAR[level],
                    }}
                    title={`${LEVEL_LABEL[level]}: ${riskCounts[level]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {(["critical", "high", "moderate", "low"] as const).map((level) => (
                <span key={level} className="tabular-nums">
                  {LEVEL_LABEL[level]} <b className="text-foreground">{riskCounts[level]}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <PillarHeatmap report={report} selected={pillar} onSelect={setPillar} />
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Achados do parecer
            <span className="text-xs font-normal text-muted-foreground">
              {findings.length} de {report.findings.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            {(["todos", "critical", "high", "moderate", "low"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setRiskFilter(level)}
                aria-pressed={riskFilter === level}
                className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                  riskFilter === level
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {level === "todos" ? "Todos" : LEVEL_LABEL[level]}
                {level !== "todos" && (
                  <span className="ml-1 tabular-nums opacity-70">{riskCounts[level]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {pillar && (
          <div className="mt-3 text-xs text-muted-foreground">
            Filtrado pelo pilar <b className="text-foreground">{pillar}</b>.{" "}
            <button
              type="button"
              onClick={() => setPillar(null)}
              className="text-primary hover:underline"
            >
              Limpar
            </button>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {findings.map((finding) => (
            <FindingSheet key={finding.id} finding={finding} />
          ))}
          {findings.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
              Nenhum achado corresponde ao filtro selecionado.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ctas.map((cta) => (
          <Link
            key={cta.to}
            to={cta.to}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <div className="grid size-9 place-items-center rounded-md border border-border text-primary">
              <cta.icon className="size-4" />
            </div>
            <div className="text-sm font-medium">{cta.label}</div>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Parecer gerado a partir de documentos submetidos ao sistema e de achados aceitos ou editados
        por revisor humano. Ausências documentais devem ser verificadas no processo antes de uso em
        peça jurídica.
      </p>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
