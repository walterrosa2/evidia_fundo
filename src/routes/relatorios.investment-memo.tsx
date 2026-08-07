import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileDown, Send, Save, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { getCaseDetail } from "@/data/mockCaseDetail";
import { getInvestmentMemoMetadata } from "@/data/mockInvestmentMemos";
import { getRedTeamData } from "@/data/mockRedTeam";
import { getValuationData } from "@/data/mockValuation";
import { formatCurrency } from "@/lib/formatters";
import { recommendationClasses, recommendationLabel, type RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/relatorios/investment-memo")({
  component: Memo,
});

function Memo() {
  const [toast, setToast] = useState<string | null>(null);
  const { selectedCase, selectedDeal } = useCaseSelection();
  const caseDetail = getCaseDetail(selectedDeal.id)!;
  const metadata = getInvestmentMemoMetadata(selectedDeal.id);
  const valuation = getValuationData(selectedDeal.id);
  const base = valuation?.scenarios.find((scenario) => scenario.id === "base") ?? null;
  const redTeam = getRedTeamData(selectedDeal.id);
  const reportFindings = selectedCase.findings.filter((finding) => finding.includedInReport);
  const averageAttackProbability = redTeam.attacks.length
    ? Math.round(
        redTeam.attacks.reduce((total, attack) => total + attack.successProbability, 0) /
          redTeam.attacks.length,
      )
    : null;
  const recommendedActions = reportFindings
    .map((finding) => finding.recommendedAction)
    .filter(Boolean)
    .slice(0, 4);
  const nextSteps = recommendedActions.length ? recommendedActions : pendingDataSteps;
  const recommendation = recommendationLabel[selectedDeal.recommendation];

  const fakeAction = (label: string) => {
    setToast(label);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <AppShell context="Relatórios · Investment Memo">
      <SectionHeader
        eyebrow={`${metadata.version} · gerado ${metadata.date} · ${caseDetail.caseNumber}`}
        title="Investment Memo"
        subtitle={caseDetail.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fakeAction("Gerando Word…")}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-secondary"
            >
              <FileDown className="size-4" /> Gerar Word
            </button>
            <button
              type="button"
              onClick={() => fakeAction("Exportando PDF executivo…")}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-secondary"
            >
              <Download className="size-4" /> PDF Executivo
            </button>
            <button
              type="button"
              onClick={() => fakeAction("Memo enviado ao comitê")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Send className="size-4" /> Enviar ao comitê
            </button>
            <button
              type="button"
              onClick={() => fakeAction(`${metadata.version} salva`)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-secondary"
            >
              <Save className="size-4" /> Salvar versão
            </button>
          </div>
        }
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-card px-4 py-2.5 text-sm shadow-lg">
          <Check className="size-4 text-risk-low" /> {toast}
        </div>
      ) : null}

      <article className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-6 sm:p-8 lg:p-10">
        <div className="border-b border-border pb-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
            EvidIA · Investment Memo
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{caseDetail.name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {caseDetail.court} · {caseDetail.caseNumber}
          </div>
        </div>

        <Section title="1. Resumo executivo">
          <p>{caseDetail.executiveSummary}</p>
        </Section>

        <Section title="2. Tese de investimento">
          {base ? (
            <p>
              {caseDetail.thesis} O motor temporal estima Valor Econômico Potencial de{" "}
              {formatCurrency(base.economicPotentialValue, { compact: true })}, com preço de entrada
              recomendado de {formatCurrency(base.recommendedPrice, { compact: true })}, ajustado
              aos riscos jurídicos e probatórios identificados.
            </p>
          ) : (
            <p>
              {caseDetail.thesis} A tese segue em revisão humana; valor da causa, data de
              distribuição e mapa de evidências precisam ser confirmados antes do cálculo de preço.
            </p>
          )}
        </Section>

        <Section title="3. Riscos identificados">
          {reportFindings.length ? (
            <ul className="space-y-3">
              {reportFindings.map((finding) => (
                <li key={finding.id} className="flex items-start gap-3">
                  <RiskBadge
                    level={sourceRiskToRiskLevel[finding.riskLevel]}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    <b>{finding.title}</b> — {finding.inference}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-surface p-4 text-muted-foreground">
              Os achados detalhados ainda não estão vinculados ao relatório deste processo. A
              revisão humana e a ingestão dos documentos devem ser concluídas antes da emissão da
              versão final.
            </p>
          )}
        </Section>

        <Section title="4. Red Team — síntese">
          {redTeam.available && averageAttackProbability !== null ? (
            <div className="space-y-2">
              <p>
                Probabilidade média simulada de êxito dos ataques mapeados:{" "}
                <b>{averageAttackProbability}%</b>. O vetor prioritário é{" "}
                <b>{redTeam.attacks[0]?.title}</b>.
              </p>
              <p className="text-muted-foreground">
                Mitigação recomendada: {redTeam.attacks[0]?.mitigation}
              </p>
            </div>
          ) : (
            <p>{redTeam.investmentThesisImpact}</p>
          )}
        </Section>

        <Section title="5. Impacto financeiro">
          <div className="not-prose grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KV
              k="Valor econômico potencial"
              v={
                base
                  ? formatCurrency(base.economicPotentialValue, { compact: true })
                  : "A confirmar"
              }
            />
            <KV
              k="Preço de referência"
              v={
                base ? formatCurrency(base.initialPurchasePrice, { compact: true }) : "A confirmar"
              }
            />
            <KV
              k="Preço recomendado"
              v={base ? formatCurrency(base.recommendedPrice, { compact: true }) : "A confirmar"}
              highlight={Boolean(base)}
            />
          </div>
          {valuation?.disclaimer ? (
            <p className="mt-3 text-xs text-muted-foreground">{valuation.disclaimer}</p>
          ) : null}
        </Section>

        <Section title="6. Recomendação">
          <p className="text-foreground">
            <span
              className={`mr-2 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${recommendationClasses[selectedDeal.recommendation]}`}
            >
              {recommendation}
            </span>
            {base
              ? `Estabelecer ticket-base de ${formatCurrency(base.recommendedPrice, { compact: true })}, correspondente à relação de compra 1:10 sobre o Valor Econômico Potencial, e condicionar o aporte às mitigações indicadas.`
              : "Não emitir recomendação financeira automática até confirmar os dados mínimos e concluir a revisão humana."}
          </p>
        </Section>

        <Section title="7. Próximos passos">
          <ol className="list-inside list-decimal space-y-2">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>

        <Section title="8. Registro de versão">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              {metadata.version} — {metadata.date} · {metadata.author} · {metadata.status}
            </li>
            <li>Dados vinculados ao processo {caseDetail.caseNumber}.</li>
          </ul>
        </Section>
      </article>
    </AppShell>
  );
}

const sourceRiskToRiskLevel = {
  low: "baixo",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
} satisfies Record<string, RiskLevel>;

const pendingDataSteps = [
  "Confirmar o valor da causa e a data de distribuição.",
  "Vincular o mapa de evidências e os documentos do processo.",
  "Revisar os achados jurídicos e probatórios com um responsável humano.",
  "Recalcular o valuation antes da apresentação ao comitê.",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 prose prose-invert max-w-none">
      <h2 className="text-lg font-semibold tracking-tight mb-2">{title}</h2>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </section>
  );
}

function KV({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border p-3 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-surface"}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {v}
      </div>
    </div>
  );
}
