import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { pipelineCase } from "@/data/pipelineDemo";

export function PipelineHero() {
  return (
    <section className="relative overflow-hidden border-b border-border px-5 py-16 sm:px-8 lg:px-12">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-cyan/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[1.25fr_.75fr]">
        <div className="animate-pipeline-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-3.5" /> EvidIA Intelligence Pipeline
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Do processo judicial à <span className="text-gradient">decisão de investimento</span>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A EvidIA estrutura documentos, audita provas, simula ataques jurídicos e traduz risco
            processual em impacto financeiro.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
            {["Documentos", "Evidências", "Decisão"].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span className="rounded-md border border-border bg-card px-3 py-2">{item}</span>
                {index < 2 && <ArrowRight className="size-4 text-primary" />}
              </div>
            ))}
          </div>
        </div>
        <div className="relative rounded-2xl border border-border bg-card/80 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Caso demonstrativo
            </span>
            <ShieldCheck className="size-5 text-risk-low" />
          </div>
          <div className="mt-4 text-xl font-semibold">{pipelineCase.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {pipelineCase.process} · {pipelineCase.court}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Mini icon={FileText} label="Documentos" value={pipelineCase.pages} />
            <Mini icon={GitBranch} label="Transformação" value="6 etapas" />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="pipeline-energy h-full w-full rounded-full" />
          </div>
        </div>
      </div>
      <Link
        to="/dashboard"
        className="absolute right-5 top-5 text-xs text-muted-foreground hover:text-primary sm:right-8"
      >
        Pular introdução →
      </Link>
    </section>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <Icon className="size-4 text-primary" />
      <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
