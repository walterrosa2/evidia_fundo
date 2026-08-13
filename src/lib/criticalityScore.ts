/**
 * Hierarquia de criticidade do ativo.
 *
 * Até a versão anterior, a criticidade exibida vinha do nível global do parecer, enquanto o
 * rodapé do card afirmava que ela combinava nulidades, robustez probatória, risco jurídico e
 * potencial de acordo — o texto não correspondia ao cálculo. A composição abaixo passa a ser
 * efetivamente aplicada.
 *
 * Todos os termos são expressos como risco (quanto maior, pior). Os dois indicadores que a
 * plataforma mede como qualidade — probatório e jurídico — entram invertidos, e o potencial de
 * acordo atua como mitigador, também invertido.
 */

import type { RiskLevel } from "@/lib/risk";

export type CriticalityInput = {
  /** Risco de nulidade (0–100, quanto maior pior). Origem: score global do parecer Nulidade360. */
  nullityRisk: number | null;
  /** Robustez probatória (0–100, quanto maior melhor). */
  evidenceScore: number | null;
  /** Consistência jurídica da tese (0–100, quanto maior melhor). */
  legalScore: number | null;
  /** Alavanca de composição (0–100, quanto maior melhor para o detentor). */
  settlementLeverage: number | null;
};

export type CriticalityComponent = {
  id: "nullity" | "evidence" | "legal" | "settlement";
  label: string;
  /** Peso do componente na composição. */
  weight: number;
  /** Valor original do indicador, como exibido nos cartões de score. */
  rawValue: number;
  /** Valor já convertido para escala de risco. */
  riskValue: number;
  /** Pontos que o componente adiciona ao índice final. */
  contribution: number;
  /** Explica a conversão aplicada. */
  direction: "direct" | "inverted";
};

export type CriticalityResult = {
  /** Índice consolidado de criticidade (0–100). */
  score: number;
  level: RiskLevel;
  components: CriticalityComponent[];
  /** Falso quando algum indicador não está disponível. */
  complete: boolean;
};

export const CRITICALITY_WEIGHTS = {
  nullity: 0.4,
  evidence: 0.3,
  legal: 0.2,
  settlement: 0.1,
} as const;

/** Limites inferiores de cada faixa de criticidade. */
export const CRITICALITY_THRESHOLDS = {
  moderado: 30,
  alto: 55,
  critico: 75,
} as const;

export function criticalityLevel(score: number): RiskLevel {
  if (score >= CRITICALITY_THRESHOLDS.critico) return "critico";
  if (score >= CRITICALITY_THRESHOLDS.alto) return "alto";
  if (score >= CRITICALITY_THRESHOLDS.moderado) return "moderado";
  return "baixo";
}

export function calculateCriticality(input: CriticalityInput): CriticalityResult {
  const complete =
    input.nullityRisk !== null &&
    input.evidenceScore !== null &&
    input.legalScore !== null &&
    input.settlementLeverage !== null;

  const nullity = input.nullityRisk ?? 0;
  const evidence = input.evidenceScore ?? 0;
  const legal = input.legalScore ?? 0;
  const settlement = input.settlementLeverage ?? 0;

  const components: CriticalityComponent[] = [
    {
      id: "nullity",
      label: "Risco de nulidade",
      weight: CRITICALITY_WEIGHTS.nullity,
      rawValue: nullity,
      riskValue: nullity,
      contribution: CRITICALITY_WEIGHTS.nullity * nullity,
      direction: "direct",
    },
    {
      id: "evidence",
      label: "Fragilidade probatória",
      weight: CRITICALITY_WEIGHTS.evidence,
      rawValue: evidence,
      riskValue: 100 - evidence,
      contribution: CRITICALITY_WEIGHTS.evidence * (100 - evidence),
      direction: "inverted",
    },
    {
      id: "legal",
      label: "Fragilidade jurídica",
      weight: CRITICALITY_WEIGHTS.legal,
      rawValue: legal,
      riskValue: 100 - legal,
      contribution: CRITICALITY_WEIGHTS.legal * (100 - legal),
      direction: "inverted",
    },
    {
      id: "settlement",
      label: "Baixa alavanca de acordo",
      weight: CRITICALITY_WEIGHTS.settlement,
      rawValue: settlement,
      riskValue: 100 - settlement,
      contribution: CRITICALITY_WEIGHTS.settlement * (100 - settlement),
      direction: "inverted",
    },
  ];

  const score = components.reduce((total, component) => total + component.contribution, 0);

  return {
    score: Number(score.toFixed(2)),
    level: criticalityLevel(score),
    components,
    complete,
  };
}

/** Texto do campo de ajuda, no formato "o que é / como é calculado / como ler". */
export const CRITICALITY_HELP =
  "O que é: o índice consolidado de risco do ativo, na escala de 0 a 100. " +
  "Como é calculado: 40% risco de nulidade (score do parecer Nulidade360) + 30% fragilidade probatória (100 − score probatório) + 20% fragilidade jurídica (100 − score jurídico) + 10% baixa alavanca de acordo (100 − potencial de acordo). " +
  "Faixas: abaixo de 30 baixo, 30 a 55 moderado, 55 a 75 alto, 75 ou mais crítico. " +
  "Como ler: os dois primeiros componentes concentram 70% do peso, porque nulidade e prova são o que efetivamente destrói valor; o potencial de acordo apenas atenua, já que não elimina o risco subjacente.";
