import { stageStatusLabel, stageStatusTone } from "@/lib/operacao/stages";
import type { StageOut } from "@/lib/operacao/types";
import { Help, Pill } from "./primitives";

const tabClass = (active: boolean) =>
  `flex min-h-11 min-w-[9.5rem] flex-1 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
    active
      ? "border-primary/60 bg-primary/10"
      : "border-border bg-card hover:border-primary/40 hover:bg-secondary"
  }`;

/**
 * Navegação principal do dossiê pelas seis etapas. O caso permanece o mesmo ao trocar
 * de etapa; a etapa aberta fica na URL (`?etapa=`).
 */
export function StageNav({
  stages,
  current,
  onSelect,
}: {
  stages: StageOut[] | undefined;
  current: number | undefined;
  onSelect: (stage: number | undefined) => void;
}) {
  return (
    <nav aria-label="Etapas da avaliação" className="mt-5 border-b border-border pb-2">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Etapas da avaliação
        <Help topic="stages" align="left" side="bottom" />
      </p>
      <ol className="flex gap-2 overflow-x-auto pb-1">
        <li className="flex">
          <button
            type="button"
            aria-current={current === undefined ? "page" : undefined}
            onClick={() => onSelect(undefined)}
            className={`${tabClass(current === undefined)} min-w-[7.5rem] flex-none justify-center`}
          >
            <span className="font-medium">Visão Completa</span>
            <span className="text-xs text-muted-foreground">Todas as etapas</span>
          </button>
        </li>
        {(stages ?? []).map((stage) => (
          <li key={stage.key} className="flex flex-1">
            <button
              type="button"
              aria-current={current === stage.number ? "page" : undefined}
              onClick={() => onSelect(stage.number)}
              title={stage.summary}
              className={tabClass(current === stage.number)}
            >
              <span className="font-medium">
                <span className="tabular-nums text-muted-foreground">{stage.number}.</span>{" "}
                {stage.title}
              </span>
              <Pill className={stageStatusTone[stage.status]}>
                {stageStatusLabel[stage.status]}
              </Pill>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Resumo e pendências da etapa aberta, logo abaixo da navegação. */
export function StageSummary({ stage }: { stage: StageOut }) {
  return (
    <section
      aria-label={`Estado da etapa ${stage.number}`}
      className="mt-4 rounded-xl border border-border bg-card p-4 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          Etapa {stage.number} · {stage.title}
        </h2>
        <Pill className={stageStatusTone[stage.status]}>{stageStatusLabel[stage.status]}</Pill>
      </div>
      <p className="mt-1.5 text-muted-foreground">{stage.summary}</p>
      {stage.pending.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {stage.pending.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
