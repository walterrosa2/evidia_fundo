import { type RiskLevel, riskClasses, riskLabel } from "@/lib/risk";

export function RiskBadge({ level, className = "" }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${riskClasses[level]} ${className}`}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: `var(--risk-${level === "critico" ? "critical" : level === "alto" ? "high" : level === "moderado" ? "moderate" : "low"})` }}
      />
      {riskLabel[level]}
    </span>
  );
}
