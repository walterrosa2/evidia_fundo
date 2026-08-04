import type { RiskLevel } from "@/lib/risk";
import { HelpHint } from "@/components/shared/HelpHint";

const levels: Array<{ id: RiskLevel; label: string; color: string }> = [
  { id: "baixo", label: "Baixo", color: "var(--risk-low)" },
  { id: "moderado", label: "Moderado", color: "var(--risk-moderate)" },
  { id: "alto", label: "Alto", color: "var(--risk-high)" },
  { id: "critico", label: "Crítico", color: "var(--risk-critical)" },
];

export function RiskHierarchy({ current }: { current: RiskLevel }) {
  const currentIndex = levels.findIndex((level) => level.id === current);
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        Hierarquia de criticidade
        <HelpHint
          label="hierarquia de criticidade"
          text="Ordena o risco consolidado do caso do nível baixo ao crítico. O destaque indica a classificação atual."
        />
      </div>
      <div
        className="mt-5 grid grid-cols-4 gap-2"
        aria-label={`Criticidade atual: ${levels[currentIndex]?.label}`}
      >
        {levels.map((level, index) => {
          const active = index === currentIndex;
          return (
            <div key={level.id} className="min-w-0 text-center">
              <div
                className={`h-2 rounded-full transition ${index <= currentIndex ? "opacity-100" : "opacity-25"}`}
                style={{ backgroundColor: level.color }}
              />
              <div
                className={`mt-2 truncate text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {level.label}
              </div>
              {active && (
                <div
                  className="mx-auto mt-2 size-2 rounded-full"
                  style={{ backgroundColor: level.color }}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        A criticidade combina nulidades, robustez probatória, risco jurídico e potencial de acordo.
      </p>
    </section>
  );
}
