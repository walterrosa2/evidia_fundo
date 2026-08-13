import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HelpHint } from "@/components/shared/HelpHint";
import { FIELD_HELP } from "@/config/fieldHelp";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { getFindings, findingStatusLabel } from "@/data/mockFindings";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/nulidade360/evidencias")({
  component: Evidencias,
});

function Evidencias() {
  const { selectedCaseId } = useCaseSelection();
  const mockFindings = getFindings(selectedCaseId);
  const [idx, setIdx] = useState(0);
  const f = mockFindings[idx];

  return (
    <AppShell context="Nulidade360 · Evidências">
      <SectionHeader
        eyebrow="Rastreabilidade probatória"
        title="Visualizador de evidências"
        subtitle="Cada achado é vinculado ao trecho do documento de origem, com tipo de evidência, inferência e impacto processual — base para sustentar a conclusão perante o comitê."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface/40">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-primary" />
              <span className="font-medium">laudo_pericial_principal.pdf</span>
              <span className="text-muted-foreground">
                · pág. {f.page ?? "—"} / {caseDetail.pagesAnalyzed}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                className="grid size-7 place-items-center rounded border border-border hover:bg-secondary"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                onClick={() => setIdx((i) => Math.min(mockFindings.length - 1, i + 1))}
                className="grid size-7 place-items-center rounded border border-border hover:bg-secondary"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="p-6 min-h-[28rem] bg-[oklch(0.97_0.005_250)] text-[oklch(0.2_0.02_250)]">
            <div className="mx-auto max-w-md font-serif text-[13px] leading-relaxed">
              <div className="text-center text-[10px] uppercase tracking-widest opacity-60 mb-4">
                — Laudo Pericial — pág. {f.page ?? "—"} —
              </div>
              <p className="mb-3">
                Trata-se de análise técnica vinculada ao processo nº {caseDetail.caseNumber}, em
                curso perante {caseDetail.court}.
              </p>
              {f.excerpt ? (
                <p className="mb-3 rounded bg-[oklch(0.85_0.16_85_/0.45)] px-1 py-0.5 ring-1 ring-[oklch(0.7_0.18_45_/0.6)]">
                  {f.excerpt}
                </p>
              ) : (
                <p className="mb-3 italic opacity-60 border-l-2 border-[oklch(0.7_0.18_45)] pl-2">
                  [Trecho ausente — ausência relevante registrada]: {f.absenceExplanation}
                </p>
              )}
              <p className="mb-3">
                A análise prosseguiu conforme metodologia declarada, observando-se eventuais
                adaptações descritas no item 4.3 do presente laudo.
              </p>
              <p>
                Os resultados constam das tabelas anexas, com base nos parâmetros aferidos durante
                os ensaios realizados em campo e laboratório.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <RiskBadge level={f.riskLevel} />
            <span className="text-xs text-muted-foreground">{findingStatusLabel[f.status]}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Achado {idx + 1} / {mockFindings.length}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold leading-tight">{f.question}</h3>

          <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
            <Stat help={FIELD_HELP.confianca} k="Confiança" v={`${f.confidence}%`} />
            <Stat help={FIELD_HELP.score} k="Score de risco" v={`${f.riskScore}/100`} />
            <Stat help={FIELD_HELP.tipoProva} k="Tipo" v={f.evidenceType} />
          </div>

          <Section title="Inferência da EvidIA">
            <p className="text-sm text-foreground/90 leading-relaxed">{f.inference}</p>
          </Section>

          <Section title="Impacto processual">
            <p className="text-sm text-foreground/90 leading-relaxed">{f.proceduralImpact}</p>
          </Section>

          <Section title="Ação recomendada">
            <p className="text-sm text-primary">{f.recommendedAction}</p>
          </Section>

          <div className="mt-6 flex flex-wrap gap-2">
            <Btn>Aceitar achado</Btn>
            <Btn>Editar</Btn>
            <Btn>Marcar para relatório</Btn>
            <Btn variant="ghost">Solicitar documento</Btn>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ k, v, help }: { k: string; v: string; help?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {k}
        {help && <HelpHint label={k} text={help} />}
      </div>
      <div className="mt-0.5 font-medium">{v}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-wider text-primary mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Btn({ children, variant }: { children: React.ReactNode; variant?: "ghost" }) {
  return (
    <button
      className={`rounded-md px-3 py-1.5 text-xs transition ${
        variant === "ghost"
          ? "border border-border bg-surface hover:bg-secondary text-foreground"
          : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15"
      }`}
    >
      {children}
    </button>
  );
}
