import { X } from "lucide-react";
import type { PipelineStageData } from "@/data/pipelineDemo";

export function PipelineDetailsSheet({
  stage,
  onClose,
}: {
  stage: PipelineStageData | null;
  onClose: () => void;
}) {
  if (!stage) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pipeline-detail-title"
    >
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <aside className="animate-pipeline-in absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-md border border-border hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
        <div className="pr-12 text-xs uppercase tracking-[0.2em] text-primary">
          Etapa {stage.order}
        </div>
        <h2 id="pipeline-detail-title" className="mt-3 pr-12 text-2xl font-semibold">
          {stage.title}
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{stage.fullDescription}</p>
        <div className="mt-8">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Dados e mecanismos
          </div>
          <div className="mt-3 grid gap-2">
            {stage.items.map((item) => (
              <div key={item} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="text-xs uppercase tracking-wider text-primary">Resultado produzido</div>
            <div className="mt-2 font-medium">{stage.result}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
