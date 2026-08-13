/**
 * Motor de atualização de débitos judiciais.
 *
 * Ordem de operações (padrão forense):
 *   principal → × fator de correção monetária → + juros de mora sobre o corrigido
 *             → + multa → + honorários → total
 *
 * Regime de juros aplicado a dívidas civis entre particulares:
 *   • até 29/08/2024 — taxa convencionada ou legal anterior (usualmente 1% ao mês, simples),
 *     nos termos do art. 406 do CC em sua redação original c/c art. 161, §1º, do CTN;
 *   • desde 30/08/2024 — taxa legal do novo art. 406 do CC (Lei 14.905/2024): SELIC deduzida
 *     do IPCA do mesmo período, com piso zero.
 *
 * Termos iniciais são independentes: a correção costuma correr do desembolso ou do evento
 * danoso, enquanto os juros correm da citação (art. 405 do CC) nas obrigações contratuais.
 */

import {
  LAW_14905_EFFECTIVE_DATE,
  isProjected,
  legalInterestMonthlyRate,
  monthlyRate,
  type MonetaryIndex,
} from "@/config/monetaryIndices";

export type InterestType = "simple" | "compound";
export type PenaltyBase = "with_interest" | "without_interest";

export type JudicialUpdateInput = {
  /** Valor principal, na data do termo inicial da correção. */
  principal: number;
  /** Termo inicial da correção monetária (ISO `YYYY-MM-DD`). */
  correctionStart: string;
  /** Termo inicial dos juros de mora (ISO `YYYY-MM-DD`). */
  interestStart: string;
  /** Data-base do cálculo (ISO `YYYY-MM-DD`). */
  endDate: string;
  index: MonetaryIndex;
  /** Taxa mensal aplicada antes da Lei 14.905/2024, em % ao mês. */
  legacyInterestRate: number;
  interestType: InterestType;
  /** Aplica a taxa legal (SELIC − IPCA) a partir de 30/08/2024. */
  applyLegalRateAfterReform: boolean;
  penalty?: { rate: number; base: PenaltyBase };
  /** Honorários de sucumbência, em % sobre o valor apurado. */
  attorneyFees?: number;
};

export type MonthlyLine = {
  /** Competência no formato `YYYY-MM`. */
  competence: string;
  /** Fração do mês efetivamente considerada (1 = mês cheio). */
  monthFraction: number;
  /** Taxa de correção do mês, já ajustada pela fração. */
  indexRate: number;
  /** Fator de correção acumulado desde o termo inicial. */
  correctionFactor: number;
  /** Principal corrigido ao fim da competência. */
  correctedValue: number;
  /** Taxa de juros do mês, já ajustada pela fração. */
  interestRate: number;
  /** Percentual de juros acumulado até a competência. */
  accumulatedInterestRate: number;
  /** Juros apurados até a competência. */
  interestValue: number;
  /** Corrigido + juros. */
  subtotal: number;
  regime: "legacy" | "reform";
  projected: boolean;
};

export type JudicialUpdateResult = {
  principal: number;
  correction: number;
  interest: number;
  penalty: number;
  attorneyFees: number;
  total: number;
  /** Multiplicador total sobre o principal. */
  multiple: number;
  /** Meses decorridos na correção. */
  correctionMonths: number;
  /** Meses decorridos nos juros. */
  interestMonths: number;
  schedule: MonthlyLine[];
  /** Verdadeiro quando parte do período depende de índices projetados. */
  hasProjection: boolean;
  input: JudicialUpdateInput;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Data inválida: ${value}`);
  }
  return parsed;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Fração do mês coberta pelo intervalo [start, end] dentro da competência informada. */
function coveredFraction(year: number, month: number, start: Date, end: Date): number {
  const total = daysInMonth(year, month);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, total);

  if (end < monthStart || start > monthEnd) return 0;

  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;
  const days = Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
  return Math.min(1, Math.max(0, days / total));
}

/** Taxa de juros mensal vigente na competência, conforme o regime aplicável. */
function interestRateFor(
  year: number,
  month: number,
  input: JudicialUpdateInput,
): { rate: number; regime: "legacy" | "reform" } {
  const reformDate = parseDate(LAW_14905_EFFECTIVE_DATE);
  const competenceEnd = new Date(year, month, daysInMonth(year, month));
  const underReform = input.applyLegalRateAfterReform && competenceEnd >= reformDate;

  if (underReform) {
    return { rate: legalInterestMonthlyRate(year), regime: "reform" };
  }
  return { rate: input.legacyInterestRate / 100, regime: "legacy" };
}

export function calculateJudicialUpdate(input: JudicialUpdateInput): JudicialUpdateResult {
  if (!Number.isFinite(input.principal) || input.principal < 0) {
    throw new TypeError("O valor principal deve ser um número não negativo.");
  }

  const correctionStart = parseDate(input.correctionStart);
  const interestStart = parseDate(input.interestStart);
  const endDate = parseDate(input.endDate);

  if (endDate < correctionStart) {
    throw new RangeError(
      "A data-base do cálculo não pode ser anterior ao termo inicial da correção.",
    );
  }

  const schedule: MonthlyLine[] = [];
  let correctionFactor = 1;
  let accumulatedInterestRate = 0;
  let compoundInterestFactor = 1;
  let correctionMonths = 0;
  let interestMonths = 0;
  let hasProjection = false;

  const cursor = new Date(correctionStart.getFullYear(), correctionStart.getMonth(), 1);

  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const correctionFraction = coveredFraction(year, month, correctionStart, endDate);
    const interestFraction = coveredFraction(year, month, interestStart, endDate);

    if (correctionFraction > 0) {
      const rate = monthlyRate(input.index, year) * correctionFraction;
      correctionFactor *= 1 + rate;
      correctionMonths += correctionFraction;
      if (isProjected(year)) hasProjection = true;

      const { rate: baseInterest, regime } = interestRateFor(year, month, input);
      const appliedInterest = interestFraction > 0 ? baseInterest * interestFraction : 0;

      if (interestFraction > 0) {
        interestMonths += interestFraction;
        if (input.interestType === "compound") {
          compoundInterestFactor *= 1 + appliedInterest;
          accumulatedInterestRate = compoundInterestFactor - 1;
        } else {
          accumulatedInterestRate += appliedInterest;
        }
      }

      const correctedValue = input.principal * correctionFactor;
      const interestValue = correctedValue * accumulatedInterestRate;

      schedule.push({
        competence: `${year}-${String(month + 1).padStart(2, "0")}`,
        monthFraction: correctionFraction,
        indexRate: rate,
        correctionFactor,
        correctedValue,
        interestRate: appliedInterest,
        accumulatedInterestRate,
        interestValue,
        subtotal: correctedValue + interestValue,
        regime,
        projected: isProjected(year),
      });
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  const correctedValue = input.principal * correctionFactor;
  const correction = correctedValue - input.principal;
  const interest = correctedValue * accumulatedInterestRate;

  const penaltyBase =
    input.penalty?.base === "without_interest" ? correctedValue : correctedValue + interest;
  const penalty = input.penalty ? penaltyBase * (input.penalty.rate / 100) : 0;

  const feesBase = correctedValue + interest + penalty;
  const attorneyFees = input.attorneyFees ? feesBase * (input.attorneyFees / 100) : 0;

  const total = correctedValue + interest + penalty + attorneyFees;

  return {
    principal: input.principal,
    correction,
    interest,
    penalty,
    attorneyFees,
    total,
    multiple: input.principal > 0 ? total / input.principal : 0,
    correctionMonths,
    interestMonths,
    schedule,
    hasProjection,
    input,
  };
}

/**
 * Multiplicador de atualização entre duas datas, com os parâmetros civis usuais.
 * Alimenta o Valor Econômico Potencial, substituindo a tabela de fatores fixos.
 */
export function updateMultiple(
  correctionStart: string,
  endDate: string,
  index: MonetaryIndex = "TJSP",
): number {
  return calculateJudicialUpdate({
    principal: 1,
    correctionStart,
    interestStart: correctionStart,
    endDate,
    index,
    legacyInterestRate: 1,
    interestType: "simple",
    applyLegalRateAfterReform: true,
  }).multiple;
}
