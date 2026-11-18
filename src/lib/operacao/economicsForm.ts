/**
 * Formulário dos demonstrativos: converte o que foi digitado no corpo da API.
 *
 * Só valida formato. As regras econômicas (soma das probabilidades, aprovação de
 * premissas, moeda, custo já incluído, grupo de dependência dos impactos, fonte
 * validada) são do servidor, que é quem calcula.
 */
import { parseDecimalInput, parsePercentInput } from "./money";
import type {
  AssumptionsIn,
  ComponentConfidence,
  CostIn,
  EconomicsRequest,
  ImpactAffects,
  ImpactIn,
  ImpactSourceType,
  PositionSide,
} from "./types";

export type CostDraft = {
  key: number;
  label: string;
  amount: string;
  /** Réu: custo já contido no desembolso informado (não é deduzido de novo). */
  included: boolean;
  source: string;
  responsible: string;
  confidence: ComponentConfidence;
};

export type ImpactDraft = {
  key: number;
  label: string;
  /** Mesma causa = mesmo grupo: o servidor aplica só um por dimensão. */
  group: string;
  affects: ImpactAffects;
  /** Valor com sinal (valor), custo adicional (custo) ou anos com sinal (prazo). */
  amount: string;
  /** "manual" ou `<tipo>:<id>` de uma fonte validada do dossiê. */
  source: string;
  responsible: string;
  confidence: ComponentConfidence;
};

export type ScenarioDraft = {
  key: number;
  label: string;
  amount: string;
  /** Autor: prazo até o recebimento, em anos a partir da data-base. */
  years: string;
  probability: string;
  source: string;
  responsible: string;
  confidence: ComponentConfidence;
  costs: CostDraft[];
  impacts: ImpactDraft[];
};

export type EconomicsDraft = {
  baseDate: string;
  rate: string;
  rateApprovedBy: string;
  probabilitiesApprovedBy: string;
  reference: string;
  referenceLabel: string;
  scenarios: ScenarioDraft[];
};

export type FieldErrors = Record<string, string>;

export const emptyCost = (key: number): CostDraft => ({
  key,
  label: "",
  amount: "",
  included: false,
  source: "",
  responsible: "",
  confidence: "",
});

export const emptyImpact = (key: number): ImpactDraft => ({
  key,
  label: "",
  group: "",
  affects: "value",
  amount: "",
  source: "manual",
  responsible: "",
  confidence: "",
});

export const emptyScenario = (key: number): ScenarioDraft => ({
  key,
  label: "",
  amount: "",
  years: "",
  probability: "",
  source: "",
  responsible: "",
  confidence: "",
  costs: [],
  impacts: [],
});

export const emptyDraft = (baseDate: string): EconomicsDraft => ({
  baseDate,
  rate: "",
  rateApprovedBy: "",
  probabilitiesApprovedBy: "",
  reference: "",
  referenceLabel: "",
  scenarios: [emptyScenario(1)],
});

const NOT_A_NUMBER = "Informe um número, por exemplo 1.000.000,00.";

/** Impacto sobre probabilidade ou contrato é só informativo: não leva número. */
export const impactNeedsNumber = (affects: ImpactAffects) =>
  affects === "value" || affects === "cost" || affects === "term";

export function buildEconomicsRequest(
  side: PositionSide,
  draft: EconomicsDraft,
): { body: EconomicsRequest; errors: null } | { body: null; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const money = (field: string, raw: string, required = true): string | null => {
    if (!raw.trim()) {
      if (required) errors[field] = "Campo obrigatório.";
      return null;
    }
    const parsed = parseDecimalInput(raw);
    if (parsed === null) errors[field] = NOT_A_NUMBER;
    return parsed;
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.baseDate)) errors.baseDate = "Informe a data-base.";

  const assumptions: AssumptionsIn = { base_date: draft.baseDate };
  if (draft.rate.trim()) {
    const rate = parsePercentInput(draft.rate);
    if (rate === null) errors.rate = "Informe o percentual ao ano, por exemplo 15.";
    else assumptions.discount_rate = rate;
    if (!draft.rateApprovedBy.trim()) {
      errors.rateApprovedBy = "A taxa de desconto exige o responsável que a aprovou.";
    } else {
      assumptions.discount_rate_approved_by = draft.rateApprovedBy.trim();
    }
  }
  if (draft.probabilitiesApprovedBy.trim()) {
    assumptions.probabilities_approved_by = draft.probabilitiesApprovedBy.trim();
  }

  const scenarios = draft.scenarios.map((scenario, index) => {
    const at = `scenarios.${index}`;
    if (!scenario.label.trim()) errors[`${at}.label`] = "Dê um nome ao cenário.";
    const amount = money(`${at}.amount`, scenario.amount);

    let probability: string | null = null;
    if (scenario.probability.trim()) {
      probability = parsePercentInput(scenario.probability);
      if (probability === null) errors[`${at}.probability`] = "Informe o percentual, de 0 a 100.";
    }
    let years: string | null = null;
    if (side === "claimant" && scenario.years.trim()) {
      years = parseDecimalInput(scenario.years);
      if (years === null || years.startsWith("-")) {
        errors[`${at}.years`] = "Informe o prazo em anos, por exemplo 2 ou 1,5.";
      }
    }

    const costs: CostIn[] = scenario.costs.map((cost, costIndex) => {
      const costAt = `${at}.costs.${costIndex}`;
      if (!cost.label.trim()) errors[`${costAt}.label`] = "Descreva o custo.";
      const value = money(`${costAt}.amount`, cost.amount);
      return {
        label: cost.label.trim(),
        amount: value ?? "0",
        source: cost.source.trim(),
        responsible: cost.responsible.trim(),
        confidence: cost.confidence,
        ...(side === "defendant" ? { included_in_disbursement: cost.included } : {}),
      };
    });

    const impacts: ImpactIn[] = scenario.impacts.map((impact, impactIndex) => {
      const impactAt = `${at}.impacts.${impactIndex}`;
      if (!impact.label.trim()) errors[`${impactAt}.label`] = "Descreva o impacto.";
      if (!impact.group.trim()) {
        errors[`${impactAt}.group`] = "Informe a causa (grupo de dependência).";
      }
      let value: string | null = null;
      if (impactNeedsNumber(impact.affects)) {
        value = money(`${impactAt}.amount`, impact.amount);
        if (value !== null && impact.affects === "cost" && value.startsWith("-")) {
          errors[`${impactAt}.amount`] = "Custo adicional não pode ser negativo.";
        }
      }
      const [sourceType, ...sourceId] = impact.source.split(":");
      const manual = sourceType === "manual" || sourceId.length === 0;
      return {
        id: `i${impactIndex + 1}`,
        label: impact.label.trim(),
        dependency_group: impact.group.trim(),
        affects: impact.affects,
        amount: impact.affects === "term" ? null : value,
        years: impact.affects === "term" ? value : null,
        source_type: manual ? "manual" : (sourceType as ImpactSourceType),
        source_id: manual ? null : sourceId.join(":"),
        responsible: impact.responsible.trim(),
        confidence: impact.confidence,
      };
    });

    return {
      id: `c${index + 1}`,
      label: scenario.label.trim(),
      amount,
      probability,
      years,
      costs,
      impacts,
      source: scenario.source.trim(),
      responsible: scenario.responsible.trim(),
      confidence: scenario.confidence,
    };
  });

  const reference = side === "defendant" ? money("reference", draft.reference) : null;

  if (Object.keys(errors).length > 0) return { body: null, errors };

  if (side === "claimant") {
    return {
      errors: null,
      body: {
        claimant: {
          assumptions,
          scenarios: scenarios.map((s) => ({
            id: s.id,
            label: s.label,
            gross_receipt: s.amount as string,
            years_from_base: s.years,
            probability: s.probability,
            costs: s.costs,
            impacts: s.impacts,
            source: s.source,
            responsible: s.responsible,
            confidence: s.confidence,
          })),
        },
      },
    };
  }
  return {
    errors: null,
    body: {
      defendant: {
        assumptions,
        reference_exposure: reference as string,
        reference_label: draft.referenceLabel.trim(),
        scenarios: scenarios.map((s) => ({
          id: s.id,
          label: s.label,
          disbursement: s.amount as string,
          probability: s.probability,
          incremental_costs: s.costs,
          impacts: s.impacts,
          source: s.source,
          responsible: s.responsible,
          confidence: s.confidence,
        })),
      },
    },
  };
}
