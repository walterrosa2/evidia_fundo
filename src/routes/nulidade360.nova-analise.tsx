import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, FileUp, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/nulidade360/nova-analise")({
  component: NovaAnalise,
});

const steps = ["Dados do caso", "Documentos", "Configuração", "Revisão"];

function NovaAnalise() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  return (
    <AppShell context="Nulidade360 · Nova análise">
      <SectionHeader
        eyebrow="Nulidade360"
        title="Nova análise de laudo"
        subtitle="A EvidIA reduz erro antes da análise: dados do caso, documentos, configuração e revisão."
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition ${
                  i === step
                    ? "bg-primary/15 text-primary"
                    : i < step
                      ? "text-risk-low"
                      : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-[10px] ${i <= step ? "bg-primary text-primary-foreground" : "bg-border"}`}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
              {i < steps.length - 1 && <span className="text-muted-foreground/40">/</span>}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 0 && <StepDados />}
          {step === 1 && <StepDocs />}
          {step === 2 && <StepConfig />}
          {step === 3 && <StepReview />}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface/30">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm disabled:opacity-40 hover:bg-secondary transition"
          >
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Avançar <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate({ to: "/nulidade360/processamento" })}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Iniciar análise com IA <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        defaultValue={value}
        className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </label>
  );
}

function StepDados() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome do caso" value={caseDetail.name} />
      <Field label="Número do processo" value={caseDetail.caseNumber} />
      <Field label="Parte representada" value="Federação Espírita Brasileira" />
      <Field label="Fase processual" value={caseDetail.proceduralPhase} />
      <Field label="Objetivo da análise" value="Auditoria de laudo pericial para reprecificação" />
      <Field label="Ponto prioritário" value="Cadeia de custódia e contraditório" />
    </div>
  );
}

function StepDocs() {
  return (
    <div>
      <div className="rounded-lg border border-dashed border-border bg-surface/60 p-8 text-center">
        <FileUp className="size-8 mx-auto text-primary" />
        <div className="mt-3 font-medium">Arraste e solte o laudo aqui</div>
        <div className="text-xs text-muted-foreground mt-1">
          PDF, DOCX · até 200 MB · upload simulado
        </div>
        <button className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-secondary">
          Selecionar arquivo
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {[
          { n: "laudo_pericial_v3.2.pdf", s: "12.4 MB", ok: true },
          { n: "anexos_tecnicos.zip", s: "48.1 MB", ok: true },
          { n: "decisao_TJSP.pdf", s: "1.2 MB", ok: true },
        ].map((f) => (
          <div
            key={f.n}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            <span>
              {f.n} <span className="text-muted-foreground">· {f.s}</span>
            </span>
            <span className="text-risk-low text-xs flex items-center gap-1">
              <Check className="size-3" /> Pronto
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepConfig() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="text-sm font-medium mb-3">Checklist aplicado</div>
        <div className="space-y-2">
          {[
            "Cadeia de custódia",
            "Metodologia pericial",
            "Documentação",
            "Contraditório",
            "Suspeição",
            "Sentença sobre prova viciada",
          ].map((c) => (
            <label
              key={c}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <input type="checkbox" defaultChecked className="accent-primary" /> {c}
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-3">Profundidade da análise</div>
        <div className="space-y-2">
          {[
            { v: "Executiva", d: "Visão decisória rápida (~15 min)" },
            { v: "Padrão", d: "Análise por blocos com evidências (~45 min)", on: true },
            { v: "Profunda", d: "Inclui Red Team e cenários adversariais (~2h)" },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex items-start gap-3 rounded-md border bg-surface px-3 py-2.5 text-sm ${o.on ? "border-primary" : "border-border"}`}
            >
              <input
                type="radio"
                name="depth"
                defaultChecked={o.on}
                className="mt-1 accent-primary"
              />
              <div>
                <div className="font-medium">{o.v}</div>
                <div className="text-xs text-muted-foreground">{o.d}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Urgência</div>
          <select className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option>Alta — apresentação ao comitê em 48h</option>
            <option>Média</option>
            <option>Padrão</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function StepReview() {
  const rows = [
    ["Caso", caseDetail.name],
    ["Processo", caseDetail.caseNumber],
    ["Fase", caseDetail.proceduralPhase],
    ["Documentos", "3 arquivos · 61.7 MB"],
    ["Checklist", "6 blocos · 142 perguntas"],
    ["Profundidade", "Padrão"],
    ["Urgência", "Alta · 48h"],
  ];
  return (
    <div>
      <div className="rounded-lg border border-border bg-surface/40 divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        Ao iniciar, a EvidIA processará o laudo por blocos (B1 → B6) e gerará score executivo,
        achados e relatório pronto para comitê.
      </div>
    </div>
  );
}
