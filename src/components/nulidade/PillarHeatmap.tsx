import { HelpHint } from "@/components/shared/HelpHint";
import {
  NULLITY_PILLARS,
  type NullityPillarId,
  type NullityReport,
} from "@/data/v2/nullityReports";

const LEVEL_COLOR = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
} as const;

const LEVEL_LABEL = {
  low: "Baixo",
  moderate: "Moderado",
  high: "Alto",
  critical: "Crítico",
} as const;

export function PillarHeatmap({
  report,
  selected,
  onSelect,
}: {
  report: NullityReport;
  selected?: NullityPillarId | null;
  onSelect?: (pillar: NullityPillarId | null) => void;
}) {
  const byPillar = new Map(report.pillarScores.map((item) => [item.pillar, item]));

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            Mapa dos 14 pilares de nulidade
            <HelpHint
              label="pilares de nulidade"
              text="O que é: a grade de auditoria do parecer Nulidade360, que percorre catorze frentes de invalidação processual. Como é calculado: cada pilar recebe o score dos achados que o afetam. Como ler: pilar sem achado significa não avaliado — ausência de risco apurado, não ausência de risco."
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.affectedPillars} de 14 pilares com achado apurado
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          {(["low", "moderate", "high", "critical"] as const).map((level) => (
            <span key={level} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: LEVEL_COLOR[level] }} />
              {LEVEL_LABEL[level]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm border border-border bg-surface" />
            Não avaliado
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {NULLITY_PILLARS.map((pillar) => {
          const score = byPillar.get(pillar.id);
          const isSelected = selected === pillar.id;
          const evaluated = Boolean(score);

          return (
            <button
              key={pillar.id}
              type="button"
              disabled={!evaluated}
              aria-pressed={isSelected}
              onClick={() => onSelect?.(isSelected ? null : pillar.id)}
              title={`${pillar.id} — ${pillar.name}: ${pillar.scope}`}
              className={`group relative overflow-hidden rounded-lg border p-2.5 text-left transition ${
                isSelected
                  ? "border-primary ring-1 ring-primary/40"
                  : evaluated
                    ? "border-border hover:border-primary/40"
                    : "border-dashed border-border/60"
              } ${evaluated ? "bg-surface cursor-pointer" : "bg-surface/30 cursor-default"}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`font-mono text-[11px] font-semibold ${evaluated ? "" : "text-muted-foreground"}`}
                >
                  {pillar.id}
                </span>
                {evaluated && (
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{ background: LEVEL_COLOR[score!.level] }}
                  />
                )}
              </div>
              <div
                className={`mt-1 line-clamp-2 text-[10px] leading-tight ${evaluated ? "text-foreground/90" : "text-muted-foreground"}`}
              >
                {pillar.name}
              </div>
              {evaluated ? (
                <>
                  <div className="mt-2 text-sm font-semibold tabular-nums">
                    {score!.score.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {score!.findingCount} {score!.findingCount === 1 ? "achado" : "achados"}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${score!.score}%`,
                        background: LEVEL_COLOR[score!.level],
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-2 text-[10px] text-muted-foreground">não avaliado</div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <div className="text-xs font-semibold">
            {selected} — {NULLITY_PILLARS.find((item) => item.id === selected)?.name}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {NULLITY_PILLARS.find((item) => item.id === selected)?.scope}
          </p>
        </div>
      )}
    </section>
  );
}
