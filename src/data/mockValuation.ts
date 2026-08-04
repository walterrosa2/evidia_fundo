import { febSapCase } from "@/data/v2";
import { calcularPrecoCompra, calcularValorPotencialPorPeriodo } from "@/lib/economicPotential";

export type ValuationScenario = {
  id: string;
  name: "Conservador" | "Base" | "Agressivo";
  claimValue: number;
  economicPotentialValue: number;
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
const filingDate = febSapCase.timeline[0]?.date ?? new Date().toISOString().slice(0, 10);
const economicPotential = calcularValorPotencialPorPeriodo(v.grossClaimValue, filingDate);
const basePurchasePrice = calcularPrecoCompra(economicPotential.valorEconomicoPotencial);
const monetaryScale = basePurchasePrice / v.recommendedPrice;

// Distribute the case-level adjustments between scenarios for demo purposes.
const evidenceAdj =
  -monetaryScale *
  (v.adjustments.find((a) => a.label.toLowerCase().includes("prova"))?.amount ?? 0);
const nullityAdj =
  -monetaryScale *
  (v.adjustments.find((a) => a.label.toLowerCase().includes("responsabilidade"))?.amount ?? 0);
const settlementAdj =
  monetaryScale * (v.adjustments.find((a) => a.direction === "positive")?.amount ?? 0);

export const valuationScenarios: ValuationScenario[] = v.scenarios.map((s) => ({
  id: s.id,
  name: nameMap[s.id],
  claimValue: v.grossClaimValue,
  economicPotentialValue: economicPotential.valorEconomicoPotencial,
  initialPurchasePrice: v.initialReferencePrice * monetaryScale,
  evidenceRiskAdjustment: evidenceAdj,
  nullityAdjustment: nullityAdj,
  settlementLeverageAdjustment: settlementAdj,
  recommendedPrice: s.recommendedPrice * monetaryScale,
  expectedROI: economicPotential.valorEconomicoPotencial / (s.recommendedPrice * monetaryScale),
}));

const base = valuationScenarios.find((s) => s.id === "base")!;
const toMillions = (value: number) => Number((value / 1_000_000).toFixed(4));
const afterEvidenceRisk = base.initialPurchasePrice + base.evidenceRiskAdjustment;
const afterNullity = afterEvidenceRisk + base.nullityAdjustment;
const structuralDiscount = base.economicPotentialValue - base.initialPurchasePrice;

export const waterfallData = [
  {
    name: "Valor potencial",
    base: 0,
    value: toMillions(base.economicPotentialValue),
    displayValue: base.economicPotentialValue,
    fill: "var(--cyan)",
  },
  {
    name: "Deságio estrutural",
    base: toMillions(base.initialPurchasePrice),
    value: toMillions(structuralDiscount),
    displayValue: -structuralDiscount,
    fill: "var(--risk-moderate)",
  },
  {
    name: "Risco probatório",
    base: toMillions(afterEvidenceRisk),
    value: toMillions(Math.abs(base.evidenceRiskAdjustment)),
    displayValue: base.evidenceRiskAdjustment,
    fill: "var(--risk-high)",
  },
  {
    name: "Nulidades",
    base: toMillions(afterNullity),
    value: toMillions(Math.abs(base.nullityAdjustment)),
    displayValue: base.nullityAdjustment,
    fill: "var(--risk-critical)",
  },
  {
    name: "Alavanca acordo",
    base: toMillions(afterNullity),
    value: toMillions(base.settlementLeverageAdjustment),
    displayValue: base.settlementLeverageAdjustment,
    fill: "var(--risk-low)",
  },
  {
    name: "Preço recomendado",
    base: 0,
    value: toMillions(base.recommendedPrice),
    displayValue: base.recommendedPrice,
    fill: "var(--violet)",
  },
];

export const valuationDisclaimer = v.disclaimer;
