import type { LucideIcon } from "lucide-react";
import { HelpHint } from "@/components/shared/HelpHint";

export function MetricCard({
  label,
  value,
  hint,
  help,
  icon: Icon,
  accent = "cyan",
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Texto da ajuda contextual. Quando presente, exibe o botão "?" ao lado do rótulo. */
  help?: string;
  icon?: LucideIcon;
  accent?: "cyan" | "violet" | "gold" | "risk-low" | "risk-high" | "risk-critical";
  delta?: { value: string; positive?: boolean };
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition hover:border-primary/30">
      <div
        className="absolute -top-12 -right-12 size-32 rounded-full opacity-[0.08] blur-2xl"
        style={{ background: `var(--${accent})` }}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          {label}
          {help && <HelpHint label={label} text={help} />}
        </span>
        {Icon && (
          <div
            className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface"
            style={{ color: `var(--${accent})` }}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {delta && (
          <span className={delta.positive ? "text-risk-low" : "text-risk-high"}>
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
