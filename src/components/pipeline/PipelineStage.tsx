import {
  ArrowRight,
  FolderInput,
  Network,
  BrainCircuit,
  Swords,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PipelineStageData } from "@/data/pipelineDemo";

const icons = [FolderInput, Network, BrainCircuit, Swords, TrendingUp, BadgeCheck];

export function PipelineStage({ stage, onOpen }: { stage: PipelineStageData; onOpen: () => void }) {
  const Icon = icons[stage.order - 1];
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_30px_color-mix(in_oklab,var(--cyan)_12%,transparent)]">
      <button
        onClick={onOpen}
        className="flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center justify-between">
          <div className="grid size-10 place-items-center rounded-lg border border-primary/30 bg-primary/5 text-primary">
            <Icon className="size-5" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">0{stage.order}</span>
        </div>
        <h3 className="mt-5 font-semibold">{stage.title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {stage.shortDescription}
        </p>
        <div className="mt-4 space-y-2">
          {stage.metrics.map((metric) => (
            <div key={metric.label} className="flex justify-between gap-3 text-[11px]">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="font-medium text-foreground">{metric.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100">
          Explorar etapa <ArrowRight className="size-3.5" />
        </div>
      </button>
      <Link
        to={stage.destination}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"
      >
        {stage.destinationLabel} <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}
