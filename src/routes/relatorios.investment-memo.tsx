import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileDown, Send, Save, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { caseDetail } from "@/data/mockCaseDetail";
import { mockFindings } from "@/data/mockFindings";
import { valuationScenarios } from "@/data/mockValuation";
import { formatCurrency } from "@/lib/formatters";

export const Route = createFileRoute("/relatorios/investment-memo")({
  component: Memo,
});

function Memo() {
  const [toast, setToast] = useState<string | null>(null);
  const base = valuationScenarios.find((s) => s.id === "base")!;

  const fakeAction = (label: string) => {
    setToast(label);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <AppShell context="Relatórios · Investment Memo">
      <SectionHeader
        eyebrow={`v1.3 · gerado 20/05/2026 · ${caseDetail.caseNumber}`}
        title="Investment Memo"
        subtitle={caseDetail.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fakeAction("Gerando Word…")} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-secondary"><FileDown className="size-4" /> Gerar Word</button>
            <button onClick={() => fakeAction("Exportando PDF executivo…")} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-secondary"><Download className="size-4" /> PDF Executivo</button>
            <button onClick={() => fakeAction("Memo enviado ao comitê")} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Send className="size-4" /> Enviar ao comitê</button>
            <button onClick={() => fakeAction("Versão v1.4 salva")} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-secondary"><Save className="size-4" /> Salvar versão</button>
          </div>
        }
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-card px-4 py-2.5 text-sm shadow-lg">
          <Check className="size-4 text-risk-low" /> {toast}
        </div>
      )}

      <article className="rounded-xl border border-border bg-card p-8 lg:p-10 max-w-4xl mx-auto">
        <div className="border-b border-border pb-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">EvidIA · Investment Memo</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{caseDetail.name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">{caseDetail.court} · {caseDetail.caseNumber}</div>
        </div>

        <Section title="1. Resumo executivo">
          <p>{caseDetail.executiveSummary}</p>
        </Section>

        <Section title="2. Tese de investimento">
          <p>{caseDetail.thesis} Estimativa de upside líquido em cenário base superior a {formatCurrency(54_000_000, { compact: true })}, com janela de saída via Recurso Especial em 18–24 meses.</p>
        </Section>

        <Section title="3. Riscos identificados">
          <ul className="space-y-2">
            {mockFindings.filter((f) => f.includedInReport).map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <RiskBadge level={f.riskLevel} />
                <span><b>{f.question}</b> — {f.inference}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Red Team — síntese">
          <p>Probabilidade média de êxito dos ataques mapeados: 60%. Com adoção das mitigações sugeridas (contraprova documental, complementação pericial preventiva e parecer técnico de equivalência metodológica), a exposição cai para zona aceitável.</p>
        </Section>

        <Section title="5. Impacto financeiro">
          <div className="grid grid-cols-3 gap-3 not-prose">
            <KV k="Preço inicial" v={formatCurrency(base.initialPurchasePrice, { compact: true })} />
            <KV k="Preço recomendado" v={formatCurrency(base.recommendedPrice, { compact: true })} highlight />
            <KV k="ROI base" v={`${base.expectedROI.toFixed(1)}×`} />
          </div>
        </Section>

        <Section title="6. Recomendação">
          <p className="text-foreground"><b className="text-risk-moderate">Reprecificar</b> — reduzir ticket para {formatCurrency(base.recommendedPrice, { compact: true })} e condicionar aporte à complementação pericial.</p>
        </Section>

        <Section title="7. Próximos passos">
          <ol className="list-decimal list-inside space-y-1">
            <li>Solicitar juntada dos anexos B-3, B-4 e B-7.</li>
            <li>Encomendar parecer técnico de equivalência metodológica.</li>
            <li>Reapresentar proposta ao cedente com preço ajustado.</li>
            <li>Levar ao comitê em 48h.</li>
          </ol>
        </Section>

        <Section title="8. Registro de versão">
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>v1.3 — 20/05/2026 · M. Almeida · revisão final</li>
            <li>v1.2 — 19/05/2026 · C. Bernardes · inclusão de Red Team</li>
            <li>v1.1 — 18/05/2026 · sistema · geração inicial pela EvidIA</li>
          </ul>
        </Section>
      </article>
    </AppShell>
  );
}

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
    <div className={`rounded-md border p-3 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-surface"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{v}</div>
    </div>
  );
}
