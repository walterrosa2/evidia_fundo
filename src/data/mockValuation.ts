import { featuredDealId, mockDeals } from "@/data/mockDeals";
import { realCasesV2, type RealCaseDemo } from "@/data/v2";
import { getEvidenceDossier } from "@/data/v2/evidenceDossier";
import { calcularPrecoCompra, calcularValorPotencialPorPeriodo } from "@/lib/economicPotential";
import { deriveValuation, type PriceAdjustment } from "@/lib/valuationModel";

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
  /** Probabilidade de êxito do cenário, quando o valuation é derivado. */
  probabilityOfSuccess?: number;
  /** Recuperação bruta esperada caso a tese prevaleça. */
  expectedRecovery?: number;
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
  /** Verdadeiro quando os números vêm do modelo derivado, e não de valores curados. */
  derived: boolean;
  /** Ajustes com a procedência de cada um. Apenas no modo derivado. */
  adjustments?: PriceAdjustment[];
  /** Memória de cálculo dos parâmetros globais. Apenas no modo derivado. */
  rationale?: { recovery: string; adversarial: string; recoveryRate: number };
};

const nameMap = {
  conservative: "Conservador",
  base: "Base",
  aggressive: "Agressivo",
} as const;

const toMillions = (value: number) => Number((value / 1_000_000).toFixed(4));
const normalizeMonetaryValue = (value: number) => (Math.abs(value) < 0.005 ? 0 : value);

const ADJUSTMENT_FILL: Record<PriceAdjustment["id"], string> = {
  evidence: "var(--risk-low)",
  nullity: "var(--risk-critical)",
  adversarial: "var(--risk-high)",
  settlement: "var(--cyan)",
  divergence: "var(--risk-moderate)",
};

/**
 * Valuation derivado das etapas anteriores.
 *
 * Usa o exposure do motor de atualização, os scores do parecer e os vetores do Red Team.
 * Nenhum preço é escrito à mão, e cada ajuste carrega a própria procedência.
 */
function buildDerivedValuation(source: RealCaseDemo): ValuationData | null {
  const deal = mockDeals.find((item) => item.id === source.id);
  if (!deal?.judicialUpdate) return null;

  const dossier = getEvidenceDossier(source.id);
  const technicalDivergence = dossier
    ? {
        nonCompliant: dossier.queries.filter((query) => query.status === "non_compliant").length,
        total: dossier.queries.length,
      }
    : undefined;

  const model = deriveValuation({
    judicialUpdate: deal.judicialUpdate,
    legalScore: source.legalScore ?? 0,
    evidenceScore: source.evidenceScore ?? 0,
    nullityRisk: source.nullityRiskScore ?? 0,
    settlementLeverage: source.settlementLeverageScore ?? 0,
    attacks: source.redTeam.map((attack) => ({
      title: attack.title,
      successProbability: attack.successProbability,
      severity: attack.severity,
      attackingSide: attack.attackingSide,
    })),
    technicalDivergence,
  });

  const findAdjustment = (id: PriceAdjustment["id"]) =>
    normalizeMonetaryValue(model.adjustments.find((item) => item.id === id)?.amount ?? 0);

  const scenarios: ValuationScenario[] = model.scenarios.map((scenario) => ({
    id: scenario.id,
    name: nameMap[scenario.id],
    claimValue: source.claimValue ?? 0,
    economicPotentialValue: model.economicPotential,
    initialPurchasePrice: model.basePrice,
    evidenceRiskAdjustment: findAdjustment("evidence"),
    nullityAdjustment: findAdjustment("nullity"),
    settlementLeverageAdjustment: findAdjustment("settlement"),
    recommendedPrice: scenario.recommendedPrice,
    expectedROI: scenario.roiMultiple,
    probabilityOfSuccess: scenario.probabilityOfSuccess,
    expectedRecovery: scenario.expectedRecovery,
  }));

  // Waterfall: do exposure ao preço recomendado, um degrau por ajuste apurado.
  const baseScenario = model.scenarios.find((scenario) => scenario.id === "base")!;
  const structuralDiscount = model.economicPotential - model.basePrice;

  const waterfall: WaterfallItem[] = [
    {
      name: "Valor atualizado",
      base: 0,
      value: toMillions(model.economicPotential),
      displayValue: model.economicPotential,
      fill: "var(--cyan)",
    },
    {
      name: "Deságio estrutural",
      base: toMillions(model.basePrice),
      value: toMillions(structuralDiscount),
      displayValue: -structuralDiscount,
      fill: "var(--muted-foreground)",
    },
  ];

  let running = model.basePrice;
  for (const adjustment of model.adjustments) {
    const next = running + adjustment.amount;
    waterfall.push({
      name: adjustment.label,
      base: toMillions(Math.min(running, next)),
      value: toMillions(Math.abs(adjustment.amount)),
      displayValue: adjustment.amount,
      fill: ADJUSTMENT_FILL[adjustment.id],
    });
    running = next;
  }

  waterfall.push({
    name: "Preço recomendado",
    base: 0,
    value: toMillions(baseScenario.recommendedPrice),
    displayValue: baseScenario.recommendedPrice,
    fill: "var(--violet)",
  });

  return {
    scenarios,
    waterfall,
    derived: true,
    adjustments: model.adjustments,
    rationale: {
      recovery: model.recoveryRationale,
      adversarial: model.adversarialRationale,
      recoveryRate: model.recoveryRate,
    },
    disclaimer:
      "Preço, probabilidade de êxito e recuperação são derivados do valor atualizado pelo motor de " +
      "cálculo, dos scores do parecer Nulidade360 e dos vetores mapeados no Red Team. São simulações " +
      "de produto e não constituem avaliação financeira, jurídica ou recomendação de investimento.",
  };
}

/** Caminho legado: valores curados no próprio caso, reescalados para a relação 1:10. */
function buildCuratedValuation(source: RealCaseDemo): ValuationData | null {
  const valuation = source.valuation;
  if (!valuation) return null;

  const filingDate =
    source.filingDate ?? source.timeline[0]?.date ?? new Date().toISOString().slice(0, 10);
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
    probabilityOfSuccess: scenario.probabilityOfSuccess,
    expectedRecovery: scenario.expectedRecovery,
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

  return { scenarios, waterfall, disclaimer: valuation.disclaimer, derived: false };
}

function buildValuationData(source: RealCaseDemo): ValuationData | null {
  if (source.valuationMode === "derived") {
    return buildDerivedValuation(source) ?? buildCuratedValuation(source);
  }
  return buildCuratedValuation(source);
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
