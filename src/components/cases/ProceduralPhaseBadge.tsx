import { GitBranch } from "lucide-react";
import { classifyProceduralPhase } from "@/lib/proceduralPhases";

export function ProceduralPhaseBadge({ description }: { description: string }) {
  const phase = classifyProceduralPhase(description);

  if (!phase) {
    return (
      <div>
        <span className="inline-flex rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted-foreground">
          Fase a confirmar
        </span>
        {description !== "A confirmar" ? (
          <div className="mt-1.5 max-w-56 text-[11px] leading-snug text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
        <GitBranch className="size-3" />
        {String(phase.number).padStart(2, "0")} · {phase.label}
      </span>
      <div className="mt-1.5 max-w-56 text-[11px] leading-snug text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
