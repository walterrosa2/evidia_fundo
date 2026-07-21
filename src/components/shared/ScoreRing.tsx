import { scoreToRisk, riskColor, riskLabel } from "@/lib/risk";

export function ScoreRing({
  value,
  size = 120,
  label = "Score EvidIA",
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const risk = scoreToRisk(value);
  const color = riskColor[risk];

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={8}
          className="stroke-border fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="fill-none transition-all duration-700"
          style={{ stroke: color }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color }}>
            Risco {riskLabel[risk]}
          </div>
        </div>
      </div>
    </div>
  );
}
