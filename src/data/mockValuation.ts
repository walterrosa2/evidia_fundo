import { febSapCase } from "@/data/v2";

export type ValuationScenario = {
  id: string;
  name: "Conservador" | "Base" | "Agressivo";
  grossClaimValue: number;
  initialPurchasePrice: number;
  evidenceRiskAdjustment: number;
  nullityAdjustment: number;
  settlementLeverageAdjustment: number;
  recommendedPrice: number;
  expectedROI: number;
};

const nameMap = {
  conservative: "Conservador",
  base: "Base",
  aggressive: "Agressivo",
} as const;

const v = febSapCase.valuation!;

// Distribute the case-level adjustments between scenarios for demo purposes.
const evidenceAdj =
  -1 *
  (v.adjustments.find((a) => a.label.toLowerCase().includes("prova"))?.amount ?? 0);
const nullityAdj =
  -1 *
  (v.adjustments.find((a) => a.label.toLowerCase().includes("responsabilidade"))
    ?.amount ?? 0);
const settlementAdj =
  v.adjustments.find((a) => a.direction === "positive")?.amount ?? 0;

export const valuationScenarios: ValuationScenario[] = v.scenarios.map((s) => ({
  id: s.id,
  name: nameMap[s.id],
  grossClaimValue: v.grossClaimValue,
  initialPurchasePrice: v.initialReferencePrice,
  evidenceRiskAdjustment: evidenceAdj,
  nullityAdjustment: nullityAdj,
  settlementLeverageAdjustment: settlementAdj,
  recommendedPrice: s.recommendedPrice,
  expectedROI: s.roiMultiple,
}));

const base = valuationScenarios.find((s) => s.id === "base")!;

export const waterfallData = [
  { name: "Preço inicial", value: Math.round(base.initialPurchasePrice / 1000), fill: "var(--cyan)" },
  { name: "Risco probatório", value: Math.round(base.evidenceRiskAdjustment / 1000), fill: "var(--risk-high)" },
  { name: "Nulidades", value: Math.round(base.nullityAdjustment / 1000), fill: "var(--risk-critical)" },
  { name: "Alavanca acordo", value: Math.round(base.settlementLeverageAdjustment / 1000), fill: "var(--risk-low)" },
  { name: "Preço recomendado", value: Math.round(base.recommendedPrice / 1000), fill: "var(--violet)" },
];

export const valuationDisclaimer = v.disclaimer;
