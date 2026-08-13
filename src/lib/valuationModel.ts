/**
 * Modelo de valuation derivado.
 *
 * Todos os números do bloco de preço passam a ser calculados a partir das etapas anteriores,
 * em vez de escritos à mão:
 *
 *   exposure ................ motor de atualização (`judicialUpdate`)
 *   taxa de recuperação ..... score probatório e risco de nulidade (parecer Nulidade360)
 *   probabilidade de êxito .. ataques do Red Team, ponderados por severidade
 *   ajustes de preço ........ os quatro indicadores do caso
 *   divergência técnica ..... quesitos "não conforme" do dossiê de provas
 *
 * Cada componente devolve a própria memória de cálculo, para que a tela possa mostrar a
 * procedência de cada valor — a checagem de coerência entre Caso, Nulidade360, Red Team e
 * Valuation deixa de depender de conferência manual.
 */

import type { JudicialUpdateResult } from "@/lib/judicialUpdate";

/** Peso de cada severidade na ponderação do risco adversarial. */
const SEVERITY_WEIGHT = { low: 0.5, moderate: 1, high: 2, critical: 3 } as const;

/** Fração do Valor Econômico Potencial usada como preço-base (relação 1:10 da mesa). */
const BASE_PRICE_RATIO = 0.1;

/** Sensibilidade de cada indicador sobre o preço-base. */
const SENSITIVITY = {
  /** Prêmio por robustez probatória acima do patamar neutro. */
  evidence: 0.5,
  /** Desconto proporcional ao risco de nulidade. */
  nullity: 0.4,
  /** Desconto proporcional ao risco adversarial ponderado. */
  adversarial: 0.3,
  /** Prêmio pela alavanca de acordo. */
  settlement: 0.15,
  /** Desconto pela divergência técnica entre as partes. */
  divergence: 0.2,
} as const;

/** Score probatório considerado neutro: acima dele há prêmio, abaixo há desconto. */
const NEUTRAL_EVIDENCE_SCORE = 70;

export type ValuationScenarioId = "conservative" | "base" | "aggressive";

/** Intensidade com que cada cenário aplica os riscos apurados. */
const SCENARIO_STRESS: Record<ValuationScenarioId, number> = {
  conservative: 1.35,
  base: 1,
  aggressive: 0.7,
};

export type RedTeamAttackInput = {
  title?: string;
  successProbability: number;
  severity: "low" | "moderate" | "high" | "critical";
  attackingSide: "claimant" | "defendant";
};

export type ValuationModelInput = {
  judicialUpdate: JudicialUpdateResult;
  legalScore: number;
  evidenceScore: number;
  nullityRisk: number;
  settlementLeverage: number;
  attacks: RedTeamAttackInput[];
  /** Quesitos do dossiê técnico, quando existe pipeline de provas para o caso. */
  technicalDivergence?: { nonCompliant: number; total: number };
};

export type PriceAdjustment = {
  id: "evidence" | "nullity" | "adversarial" | "settlement" | "divergence";
  label: string;
  /** Valor em reais. Positivo eleva o preço; negativo reduz. */
  amount: number;
  /** De onde veio o número. */
  source: string;
};

export type DerivedScenario = {
  id: ValuationScenarioId;
  label: string;
  /** Preço máximo que o ativo suporta neste cenário. */
  recommendedPrice: number;
  /** Recuperação bruta esperada caso a tese prevaleça. */
  expectedRecovery: number;
  /** Recuperação ponderada pela probabilidade de êxito. */
  riskAdjustedValue: number;
  probabilityOfSuccess: number;
  /** Múltiplo sobre o capital, já ponderado pelo risco. */
  roiMultiple: number;
};

export type DerivedValuation = {
  /** Exposure: débito atualizado pelo motor. */
  economicPotential: number;
  /** Preço-base antes dos ajustes (relação 1:10). */
  basePrice: number;
  /** Fração do exposure que se espera recuperar caso a tese prevaleça. */
  recoveryRate: number;
  recoveryRationale: string;
  /** Risco adversarial ponderado pela severidade dos ataques. */
  adversarialRisk: number;
  adversarialRationale: string;
  probabilityOfSuccess: number;
  adjustments: PriceAdjustment[];
  scenarios: DerivedScenario[];
};

/**
 * Risco adversarial: média das probabilidades de êxito dos ataques da defesa,
 * ponderada pela severidade de cada um.
 */
function computeAdversarialRisk(attacks: RedTeamAttackInput[]): {
  risk: number;
  rationale: string;
} {
  const defense = attacks.filter((attack) => attack.attackingSide === "defendant");
  if (defense.length === 0) {
    return { risk: 0, rationale: "Nenhum vetor de ataque da defesa mapeado." };
  }

  const totalWeight = defense.reduce(
    (total, attack) => total + SEVERITY_WEIGHT[attack.severity],
    0,
  );
  const weighted = defense.reduce(
    (total, attack) => total + attack.successProbability * SEVERITY_WEIGHT[attack.severity],
    0,
  );
  const risk = weighted / totalWeight;
  const strongest = defense.reduce((max, attack) =>
    attack.successProbability > max.successProbability ? attack : max,
  );

  return {
    risk,
    rationale:
      `Média de ${defense.length} vetores da defesa ponderada por severidade: ` +
      `${(risk * 100).toFixed(1)}%. Vetor mais forte: “${strongest.title ?? "ataque principal"}” ` +
      `com ${(strongest.successProbability * 100).toFixed(0)}%.`,
  };
}

export function deriveValuation(input: ValuationModelInput): DerivedValuation {
  const economicPotential = input.judicialUpdate.total;
  const basePrice = economicPotential * BASE_PRICE_RATIO;

  // --- Taxa de recuperação: quanto do exposure se converte em recebimento ---------------
  // A robustez probatória define o teto; o risco de nulidade corrói metade do seu valor,
  // porque nulidade não elimina a tese — devolve o processo a uma fase anterior.
  const recoveryRate = (input.evidenceScore / 100) * (1 - input.nullityRisk / 200);
  const recoveryRationale =
    `Score probatório ${input.evidenceScore.toFixed(0)}/100 reduzido pelo risco de nulidade ` +
    `${input.nullityRisk.toFixed(2)} (impacto de meia proporção): ` +
    `${(recoveryRate * 100).toFixed(1)}% do valor atualizado.`;

  // --- Probabilidade de êxito: complemento do risco adversarial -------------------------
  const { risk: adversarialRisk, rationale: adversarialRationale } = computeAdversarialRisk(
    input.attacks,
  );
  const probabilityOfSuccess = Math.max(0, Math.min(1, 1 - adversarialRisk));

  // --- Divergência técnica do dossiê de provas ------------------------------------------
  const divergence = input.technicalDivergence
    ? input.technicalDivergence.nonCompliant / Math.max(1, input.technicalDivergence.total)
    : 0;

  // --- Ajustes sobre o preço-base --------------------------------------------------------
  const adjustments: PriceAdjustment[] = [
    {
      id: "evidence",
      label: "Robustez probatória",
      amount:
        basePrice * ((input.evidenceScore - NEUTRAL_EVIDENCE_SCORE) / 100) * SENSITIVITY.evidence,
      source: `Score probatório ${input.evidenceScore.toFixed(0)} contra o patamar neutro de ${NEUTRAL_EVIDENCE_SCORE}.`,
    },
    {
      id: "nullity",
      label: "Risco de nulidade",
      amount: -basePrice * (input.nullityRisk / 100) * SENSITIVITY.nullity,
      source: `Score global do parecer Nulidade360: ${input.nullityRisk.toFixed(2)}.`,
    },
    {
      id: "adversarial",
      label: "Exposição adversarial",
      amount: -basePrice * adversarialRisk * SENSITIVITY.adversarial,
      source: adversarialRationale,
    },
    {
      id: "settlement",
      label: "Alavanca de acordo",
      amount: basePrice * (input.settlementLeverage / 100) * SENSITIVITY.settlement,
      source: `Potencial de acordo ${input.settlementLeverage.toFixed(0)}/100.`,
    },
  ];

  if (input.technicalDivergence && input.technicalDivergence.total > 0) {
    adjustments.push({
      id: "divergence",
      label: "Divergência técnica",
      amount: -basePrice * divergence * SENSITIVITY.divergence,
      source:
        `${input.technicalDivergence.nonCompliant} de ${input.technicalDivergence.total} quesitos ` +
        `respondidos como não conformes pela ré (${(divergence * 100).toFixed(1)}%).`,
    });
  }

  // --- Cenários: variam a intensidade com que os riscos são aplicados --------------------
  const scenarios: DerivedScenario[] = (
    ["conservative", "base", "aggressive"] as ValuationScenarioId[]
  ).map((id) => {
    const stress = SCENARIO_STRESS[id];
    const price = adjustments.reduce(
      (total, adjustment) =>
        total + (adjustment.amount < 0 ? adjustment.amount * stress : adjustment.amount / stress),
      basePrice,
    );

    // Cenário adverso também comprime a recuperação e a probabilidade de êxito.
    const scenarioRecoveryRate = Math.max(0, Math.min(1, recoveryRate / stress));
    const scenarioProbability = Math.max(0, Math.min(1, 1 - adversarialRisk * stress));
    const expectedRecovery = economicPotential * scenarioRecoveryRate;
    const riskAdjustedValue = expectedRecovery * scenarioProbability;
    const recommendedPrice = Math.max(0, price);

    return {
      id,
      label: id === "conservative" ? "Conservador" : id === "base" ? "Base" : "Agressivo",
      recommendedPrice,
      expectedRecovery,
      riskAdjustedValue,
      probabilityOfSuccess: scenarioProbability,
      roiMultiple: recommendedPrice > 0 ? riskAdjustedValue / recommendedPrice : 0,
    };
  });

  return {
    economicPotential,
    basePrice,
    recoveryRate,
    recoveryRationale,
    adversarialRisk,
    adversarialRationale,
    probabilityOfSuccess,
    adjustments,
    scenarios,
  };
}
