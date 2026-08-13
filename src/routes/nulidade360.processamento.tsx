import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Circle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { processingSteps } from "@/data/mockProcessingSteps";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/nulidade360/processamento")({
  component: Processamento,
});

function Processamento() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (current >= processingSteps.length) return;
    const t = setTimeout(() => setCurrent((c) => c + 1), 900);
    return () => clearTimeout(t);
  }, [current]);

  const done = current >= processingSteps.length;
  const progress = Math.min(100, Math.round((current / processingSteps.length) * 100));

  return (
    <AppShell context="Nulidade360 · Processamento">
      <SectionHeader
        eyebrow="Pipeline EvidIA"
        title="Analisando laudo por blocos"
        subtitle="Processamento do documento em etapas auditáveis. Cada bloco registra entrada, achados e tempo de execução."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                Laudo pericial — {caseDetail.pagesAnalyzed} páginas
              </div>
              <div className="text-xs text-muted-foreground">{caseDetail.name}</div>
            </div>
            <div className="text-2xl font-semibold tabular-nums">{progress}%</div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-6 space-y-2">
            {processingSteps.map((s, i) => {
              const status = i < current ? "done" : i === current ? "running" : "pending";
              return (
                <li
                  key={s.id}
                  className={`flex items-start gap-3 rounded-md border px-3 py-2.5 transition ${
                    status === "running"
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-surface/40"
                  }`}
                >
                  <div className="mt-0.5">
                    {status === "done" && <CheckCircle2 className="size-4 text-risk-low" />}
                    {status === "running" && (
                      <Loader2 className="size-4 text-primary animate-spin" />
                    )}
                    {status === "pending" && <Circle className="size-4 text-muted-foreground/50" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          {done && (
            <button
              onClick={() => navigate({ to: "/nulidade360/resultado" })}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Ver resultado executivo <ArrowRight className="size-4" />
            </button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Log da análise</div>
          <div className="mt-3 space-y-1.5 font-mono text-[11px] text-muted-foreground max-h-[28rem] overflow-y-auto">
            {processingSteps.slice(0, current + 1).map((s, i) => (
              <div key={s.id} className="leading-relaxed">
                <span className="text-primary">[{String(i + 1).padStart(2, "0")}:14]</span>{" "}
                {s.label.toLowerCase()} — {s.detail}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
