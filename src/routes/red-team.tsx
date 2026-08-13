import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Swords,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  FileWarning,
  FileStack,
  MessagesSquare,
  ChartPie,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { HelpHint } from "@/components/shared/HelpHint";
import { FIELD_HELP } from "@/config/fieldHelp";
import { EvidenceTab } from "@/components/redteam/EvidenceTab";
import { QueryAnswerTab } from "@/components/redteam/QueryAnswerTab";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { getRedTeamData } from "@/data/mockRedTeam";
import {
  EVIDENCE_CATEGORY_LABEL,
  TECHNICAL_STATUS_LABEL,
  getEvidenceDossier,
  type EvidenceCategory,
  type TechnicalStatus,
} from "@/data/v2/evidenceDossier";

export const Route = createFileRoute("/red-team")({
  component: RedTeam,
});

const severityColor = {
  moderado: "var(--risk-moderate)",
  alto: "var(--risk-high)",
  critico: "var(--risk-critical)",
} as const;

const STATUS_COLOR: Record<TechnicalStatus, string> = {
  compliant: "var(--risk-low)",
  non_compliant: "var(--risk-critical)",
  partially_compliant: "var(--risk-moderate)",
  inconclusive: "var(--muted-foreground)",
};

type TabId = "ataques" | "provas" | "quesitos" | "sintese";

function RedTeam() {
  const { selectedDeal } = useCaseSelection();
  const data = getRedTeamData(selectedDeal.id);
  const dossier = getEvidenceDossier(selectedDeal.id);
  const [tab, setTab] = useState<TabId>("ataques");

  const stats = useMemo(() => {
    if (!dossier) return null;
    const byStatus = new Map<TechnicalStatus, number>();
    for (const query of dossier.queries) {
      byStatus.set(query.status, (byStatus.get(query.status) ?? 0) + 1);
    }
    const byCategory = new Map<EvidenceCategory, number>();
    for (const evidence of dossier.evidences) {
      byCategory.set(evidence.category, (byCategory.get(evidence.category) ?? 0) + 1);
    }
    const byBlock = new Map<number, { total: number; nonCompliant: number }>();
    for (const query of dossier.queries) {
      const current = byBlock.get(query.block) ?? { total: 0, nonCompliant: 0 };
      current.total += 1;
      if (query.status === "non_compliant") current.nonCompliant += 1;
      byBlock.set(query.block, current);
    }
    const compliant = byStatus.get("compliant") ?? 0;
    return {
      byStatus,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      byBlock: [...byBlock.entries()].sort((a, b) => a[0] - b[0]),
      complianceRate: dossier.queries.length ? compliant / dossier.queries.length : 0,
    };
  }, [dossier]);

  const tabs: Array<{ id: TabId; label: string; icon: typeof Swords; count?: number }> = [
    { id: "ataques", label: "Ataques", icon: Swords, count: data.attacks.length },
    ...(dossier
      ? ([
          { id: "provas", label: "Provas", icon: FileStack, count: dossier.evidences.length },
          {
            id: "quesitos",
            label: "Quesitos e respostas",
            icon: MessagesSquare,
            count: dossier.queries.length,
          },
          { id: "sintese", label: "Síntese", icon: ChartPie },
        ] as const)
      : []),
  ];

  if (!data.available && !dossier) {
    return (
      <AppShell context={`Red Team · ${selectedDeal.name}`}>
        <SectionHeader
          eyebrow={`Simulação adversarial · ${selectedDeal.name}`}
          title="Como a tese resiste ao contraditório"
          subtitle="A EvidIA assume a posição da parte contrária e mede a probabilidade de cada linha de ataque prosperar."
        />
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
            <FileWarning className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Simulação adversarial não consolidada</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            {data.investmentThesisImpact}
          </p>
          <Link
            to="/deals/$id"
            params={{ id: selectedDeal.id }}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm hover:border-primary/40 hover:text-primary"
          >
            Voltar ao caso <ArrowRight className="size-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell context={`Red Team · ${selectedDeal.name}`}>
      <SectionHeader
        eyebrow={`Simulação adversarial · ${selectedDeal.name}`}
        title="Como a tese resiste ao contraditório"
        subtitle="A EvidIA assume a posição da parte contrária: mede a probabilidade de cada linha de ataque prosperar, cataloga as provas disponíveis e simula o parecer técnico da ré aos quesitos da autora."
        actions={
          <Link
            to="/valuation"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ver impacto no valuation <ArrowRight className="size-4" />
          </Link>
        }
      />

      {/* Abas */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition ${
              tab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
            {item.count !== undefined && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "ataques" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {data.attacks.map((attack) => (
                <div key={attack.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-md border border-border"
                        style={{ color: severityColor[attack.severity] }}
                      >
                        <Swords className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold">{attack.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {attack.attackingSide === "defendant"
                            ? "Vetor da defesa"
                            : "Vetor da autora"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Êxito estimado
                        <HelpHint
                          label="êxito estimado"
                          text={FIELD_HELP.exitoEstimado}
                          align="right"
                        />
                      </div>
                      <div
                        className="text-xl font-semibold tabular-nums"
                        style={{ color: severityColor[attack.severity] }}
                      >
                        {attack.successProbability}%
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{attack.vector}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, attack.successProbability)}%`,
                        background: severityColor[attack.severity],
                      }}
                    />
                  </div>
                  <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                    <ShieldCheck className="mr-1 inline size-3.5 text-primary" />
                    <span className="text-foreground/90">Mitigação:</span> {attack.mitigation}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="inline-flex items-center gap-2 text-sm font-semibold">
                  Vulnerabilidades ocultas
                  <HelpHint
                    label="vulnerabilidades ocultas"
                    text="O que é: fragilidades da tese que não constavam da narrativa do cedente. Como ler: são o que a parte contrária tende a explorar primeiro — devem entrar no preço."
                  />
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.hiddenVulnerabilities.map((vulnerability) => (
                    <li key={vulnerability} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-risk-critical" />
                      <span className="text-foreground/90">{vulnerability}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-gradient-to-br from-violet/10 to-cyan/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="size-4 text-primary" /> Impacto na tese de investimento
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {data.investmentThesisImpact}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "provas" && dossier && <EvidenceTab evidences={dossier.evidences} />}

        {tab === "quesitos" && dossier && <QueryAnswerTab queries={dossier.queries} />}

        {tab === "sintese" && dossier && stats && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                Taxa de conformidade
                <HelpHint
                  label="taxa de conformidade"
                  text="O que é: a proporção de quesitos em que a resposta técnica simulada da ré confirma a alegação da autora. Como é calculado: quesitos conformes divididos pelo total respondido. Como ler: quanto menor, mais controvertida a matéria técnica — e maior a dependência de perícia para fixar os fatos."
                />
              </div>
              <div className="mt-4 text-4xl font-semibold tabular-nums">
                {(stats.complianceRate * 100).toFixed(0)}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {stats.byStatus.get("compliant") ?? 0} de {dossier.queries.length} quesitos
                confirmam a tese da autora
              </div>
              <div className="mt-5 space-y-2.5">
                {(
                  [
                    "compliant",
                    "non_compliant",
                    "partially_compliant",
                    "inconclusive",
                  ] as TechnicalStatus[]
                ).map((status) => {
                  const count = stats.byStatus.get(status) ?? 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs">
                        <span>{TECHNICAL_STATUS_LABEL[status]}</span>
                        <span className="tabular-nums text-muted-foreground">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / dossier.queries.length) * 100}%`,
                            background: STATUS_COLOR[status],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="inline-flex items-center gap-2 text-sm font-semibold">
                Provas por natureza
                <HelpHint label="provas por natureza" text={FIELD_HELP.tipoProva} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {dossier.evidences.length} documentos catalogados
              </div>
              <ul className="mt-4 space-y-2.5">
                {stats.byCategory.map(([category, count]) => (
                  <li key={category}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{EVIDENCE_CATEGORY_LABEL[category]}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                        style={{ width: `${(count / dossier.evidences.length) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="inline-flex items-center gap-2 text-sm font-semibold">
                Controvérsia por bloco
                <HelpHint label="controvérsia por bloco" text={FIELD_HELP.statusTecnico} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Quesitos em que a ré diverge da autora
              </div>
              <ul className="mt-4 space-y-3">
                {stats.byBlock.map(([block, info]) => (
                  <li key={block}>
                    <div className="flex items-center justify-between text-xs">
                      <span>Bloco {block}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {info.nonCompliant} de {info.total} divergentes
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-risk-critical"
                        style={{ width: `${(info.nonCompliant / info.total) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                Blocos com maior divergência concentram o risco de instrução: são os pontos em que a
                fixação dos fatos dependerá de prova pericial ou de esclarecimentos.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
