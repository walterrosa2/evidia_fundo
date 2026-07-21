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

export const valuationScenarios: ValuationScenario[] = [
  {
    id: "conservador",
    name: "Conservador",
    grossClaimValue: 482_000_000,
    initialPurchasePrice: 96_000_000,
    evidenceRiskAdjustment: -22_000_000,
    nullityAdjustment: -14_000_000,
    settlementLeverageAdjustment: 6_000_000,
    recommendedPrice: 66_000_000,
    expectedROI: 1.6,
  },
  {
    id: "base",
    name: "Base",
    grossClaimValue: 482_000_000,
    initialPurchasePrice: 96_000_000,
    evidenceRiskAdjustment: -14_000_000,
    nullityAdjustment: -8_000_000,
    settlementLeverageAdjustment: 12_000_000,
    recommendedPrice: 86_000_000,
    expectedROI: 2.4,
  },
  {
    id: "agressivo",
    name: "Agressivo",
    grossClaimValue: 482_000_000,
    initialPurchasePrice: 96_000_000,
    evidenceRiskAdjustment: -6_000_000,
    nullityAdjustment: -2_000_000,
    settlementLeverageAdjustment: 22_000_000,
    recommendedPrice: 110_000_000,
    expectedROI: 3.1,
  },
];

export const waterfallData = [
  { name: "Preço inicial", value: 96, fill: "var(--cyan)" },
  { name: "Risco probatório", value: -14, fill: "var(--risk-high)" },
  { name: "Nulidades", value: -8, fill: "var(--risk-critical)" },
  { name: "Alavanca acordo", value: 12, fill: "var(--risk-low)" },
  { name: "Preço recomendado", value: 86, fill: "var(--violet)" },
];
