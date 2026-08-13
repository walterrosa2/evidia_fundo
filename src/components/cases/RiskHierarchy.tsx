import type { RiskLevel } from "@/lib/risk";
import { HelpHint } from "@/components/shared/HelpHint";
import {
  CRITICALITY_HELP,
  CRITICALITY_THRESHOLDS,
  type CriticalityResult,
} from "@/lib/criticalityScore";

const levels: Array<{ id: RiskLevel; label: string; color: string; from: number }> = [
  { id: "baixo", label: "Baixo", color: "var(--risk-low)", from: 0 },
  {
    id: "moderado",
    label: "Moderado",
    color: "var(--risk-moderate)",
    from: CRITICALITY_THRESHOLDS.moderado,
  },
  { id: "alto", label: "Alto", color: "var(--risk-high)", from: CRITICALITY_THRESHOLDS.alto },
  {
    id: "critico",
    label: "Crítico",
    color: "var(--risk-critical)",
    from: CRITICALITY_THRESHOLDS.critico,
  },
];

export function RiskHierarchy({
  current,
  criticality,
}: {
  current: RiskLevel;
  criticality?: CriticalityResult;
}) {
  const level = criticality?.level ?? current;
  const currentIndex = levels.findIndex((item) => item.id === level);
  const maxContribution = criticality
    ? Math.max(...criticality.components.map((component) => component.contribution), 1)
    : 1;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Hierarquia de criticidade
          <HelpHint label="hierarquia de criticidade" text={CRITICALITY_HELP} />
        </div>
        {criticality && (
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Índice</div>
            <div className="text-lg font-semibold tabular-nums">
              {criticality.score.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">/ 100</span>
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-5 grid grid-cols-4 gap-2"
        aria-label={`Criticidade atual: ${levels[currentIndex]?.label}`}
      >
        {levels.map((item, index) => {
          const active = index === currentIndex;
          return (
            <div key={item.id} className="min-w-0 text-center">
              <div
                className={`h-2 rounded-full transition ${index <= currentIndex ? "opacity-100" : "opacity-25"}`}
                style={{ backgroundColor: item.color }}
              />
              <div
                className={`mt-2 truncate text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {item.label}
              </div>
              <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                {index === levels.length - 1
                  ? `${item.from}+`
                  : `${item.from}–${levels[index + 1].from}`}
              </div>
              {active && (
                <div
                  className="mx-auto mt-2 size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </div>
          );
        })}
      </div>

      {criticality ? (
        <>
          <div className="mt-6 border-t border-border pt-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Composição do índice
            </div>
            <ul className="mt-3 space-y-2.5">
              {criticality.components.map((component) => (
                <li key={component.id}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">
                      {component.label}
                      <span className="ml-1.5 text-muted-foreground">
                        peso {Math.round(component.weight * 100)}%
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {component.direction === "inverted"
                        ? `100 − ${component.rawValue} = ${component.riskValue.toFixed(0)}`
                        : component.riskValue.toFixed(1)}
                      <b className="ml-2 text-foreground">+{component.contribution.toFixed(1)}</b>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                      style={{ width: `${(component.contribution / maxContribution) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {!criticality.complete && (
            <p className="mt-4 text-xs leading-relaxed text-risk-moderate">
              Um ou mais indicadores ainda não foram apurados. O índice exibido é parcial e não deve
              sustentar decisão de preço.
            </p>
          )}
        </>
      ) : (
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          A criticidade combina risco de nulidade, fragilidade probatória, fragilidade jurídica e
          alavanca de acordo.
        </p>
      )}
    </section>
  );
}
