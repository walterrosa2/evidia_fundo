import { featuredDealId } from "@/data/mockDeals";
import { realCasesV2, type RealCaseDemo } from "@/data/v2";
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

export type WaterfallItem = {
  name: string;
  base: number;
  value: number;
  displayValue: number;
  fill: string;
};

export type ValuationData = {
  scenarios: ValuationScenario[];
  waterfall: WaterfallItem[];
  disclaimer: string;
};

const nameMap = {
  conservative: "Conservador",
  base: "Base",
  aggressive: "Agressivo",
} as const;

const toMillions = (value: number) => Number((value / 1_000_000).toFixed(4));
const normalizeMonetaryValue = (value: number) => (Math.abs(value) < 0.005 ? 0 : value);

function buildValuationData(source: RealCaseDemo): ValuationData | null {
  const valuation = source.valuation;
  if (!valuation) return null;

  const filingDate = source.timeline[0]?.date ?? new Date().toISOString().slice(0, 10);
  const economicPotential = calcularValorPotencialPorPeriodo(valuation.grossClaimValue, filingDate);
  const basePurchasePrice = calcularPrecoCompra(economicPotential.valorEconomicoPotencial);
  const monetaryScale = basePurchasePrice / valuation.recommendedPrice;
  const evidenceAdjustment = normalizeMonetaryValue(
    -monetaryScale *
      (valuation.adjustments.find((adjustment) => adjustment.label.toLowerCase().includes("prova"))
        ?.amount ?? 0),
  );
  const nullityAdjustment = normalizeMonetaryValue(
    -monetaryScale *
      (valuation.adjustments.find((adjustment) =>
        adjustment.label.toLowerCase().includes("responsabilidade"),
      )?.amount ?? 0),
  );
  const settlementAdjustment = normalizeMonetaryValue(
    monetaryScale *
      (valuation.adjustments.find((adjustment) => adjustment.direction === "positive")?.amount ??
        0),
  );

  const scenarios: ValuationScenario[] = valuation.scenarios.map((scenario) => ({
    id: scenario.id,
    name: nameMap[scenario.id],
    claimValue: valuation.grossClaimValue,
    economicPotentialValue: economicPotential.valorEconomicoPotencial,
    initialPurchasePrice: valuation.initialReferencePrice * monetaryScale,
    evidenceRiskAdjustment: evidenceAdjustment,
    nullityAdjustment,
    settlementLeverageAdjustment: settlementAdjustment,
    recommendedPrice: scenario.recommendedPrice * monetaryScale,
    expectedROI:
      economicPotential.valorEconomicoPotencial / (scenario.recommendedPrice * monetaryScale),
  }));

  const baseScenario = scenarios.find((scenario) => scenario.id === "base")!;
  const afterEvidenceRisk = baseScenario.initialPurchasePrice + baseScenario.evidenceRiskAdjustment;
  const afterNullity = afterEvidenceRisk + baseScenario.nullityAdjustment;
  const structuralDiscount =
    baseScenario.economicPotentialValue - baseScenario.initialPurchasePrice;
  const waterfall: WaterfallItem[] = [
    {
      name: "Valor potencial",
      base: 0,
      value: toMillions(baseScenario.economicPotentialValue),
      displayValue: baseScenario.economicPotentialValue,
      fill: "var(--cyan)",
    },
    {
      name: "Deságio estrutural",
      base: toMillions(baseScenario.initialPurchasePrice),
      value: toMillions(structuralDiscount),
      displayValue: -structuralDiscount,
      fill: "var(--risk-moderate)",
    },
    {
      name: "Risco probatório",
      base: toMillions(afterEvidenceRisk),
      value: toMillions(Math.abs(baseScenario.evidenceRiskAdjustment)),
      displayValue: baseScenario.evidenceRiskAdjustment,
      fill: "var(--risk-high)",
    },
    {
      name: "Nulidades",
      base: toMillions(afterNullity),
      value: toMillions(Math.abs(baseScenario.nullityAdjustment)),
      displayValue: baseScenario.nullityAdjustment,
      fill: "var(--risk-critical)",
    },
    {
      name: "Alavanca acordo",
      base: toMillions(afterNullity),
      value: toMillions(baseScenario.settlementLeverageAdjustment),
      displayValue: baseScenario.settlementLeverageAdjustment,
      fill: "var(--risk-low)",
    },
    {
      name: "Preço recomendado",
      base: 0,
      value: toMillions(baseScenario.recommendedPrice),
      displayValue: baseScenario.recommendedPrice,
      fill: "var(--violet)",
    },
  ];

  return { scenarios, waterfall, disclaimer: valuation.disclaimer };
}

const valuationByCaseId = new Map(
  realCasesV2.map((caseItem) => [caseItem.id, buildValuationData(caseItem)]),
);

export function getValuationData(caseId: string) {
  return valuationByCaseId.get(caseId) ?? null;
}

const defaultData = getValuationData(featuredDealId)!;

export const valuationScenarios = defaultData.scenarios;
export const waterfallData = defaultData.waterfall;
export const valuationDisclaimer = defaultData.disclaimer;
