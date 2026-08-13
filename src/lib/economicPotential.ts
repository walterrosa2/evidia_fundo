/**
 * Valor Econômico Potencial (VEP).
 *
 * O fator de atualização passa a ser derivado do motor de atualização de débitos
 * (`judicialUpdate`), que aplica correção monetária pelo índice do caso e juros de mora
 * segundo o regime vigente em cada período. A tabela de fatores fixos anterior permanece
 * disponível apenas como comparativo — ela superestimava o ativo entre 2,2× e 2,8×, porque
 * não derivava de índice algum e continha degraus artificiais.
 */

import {
  ECONOMIC_POTENTIAL_FACTORS,
  BASE_PURCHASE_PRICE_RATIO,
  FACTOR_ABOVE_ELEVEN_YEARS,
} from "@/config/economicPotentialFactors";
import { calculateJudicialUpdate, type JudicialUpdateResult } from "@/lib/judicialUpdate";
import { MONETARY_INDEX_LABEL, type MonetaryIndex } from "@/config/monetaryIndices";

const MILLISECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const factorFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export type EconomicPotentialOrigin = "motor_judicial" | "tabela_legada" | "sem_dados";

export type EconomicPotentialCalculation = {
  valorBase: number;
  tempoAcaoAnos: number;
  fator: number;
  valorEconomicoPotencial: number;
  calculo: string;
  /** De onde veio o fator aplicado. */
  origem: EconomicPotentialOrigin;
  /** Descrição legível da origem, para o texto de ajuda e a memória de cálculo. */
  origemDescricao: string;
  indice?: MonetaryIndex;
  indiceLabel?: string;
  correcao?: number;
  juros?: number;
  dataInicial?: string;
  dataFinal?: string;
  /** Fator que a tabela legada produziria, para comparação. */
  fatorLegado?: number;
  /** Verdadeiro quando parte do período usa índices projetados. */
  possuiProjecao?: boolean;
};

/**
 * Fator da tabela legada, agora com interpolação linear entre os pontos.
 * A versão anterior era uma função degrau: 1,99 ano devolvia 2,0× e 2,00 ano devolvia 2,4×,
 * um salto de 20% por um dia de diferença.
 */
export function obterFator(valorEntrada: number): number {
  if (!Number.isFinite(valorEntrada)) {
    throw new TypeError("O valor de entrada deve ser um número válido.");
  }
  if (valorEntrada > 11) return FACTOR_ABOVE_ELEVEN_YEARS;

  const entrada = Math.max(0, valorEntrada);
  const pontos = ECONOMIC_POTENTIAL_FACTORS;

  for (let i = 0; i < pontos.length - 1; i += 1) {
    const atual = pontos[i];
    const proximo = pontos[i + 1];
    if (entrada >= atual.entrada && entrada <= proximo.entrada) {
      const intervalo = proximo.entrada - atual.entrada;
      if (intervalo <= 0) return atual.fator;
      const proporcao = (entrada - atual.entrada) / intervalo;
      return atual.fator + proporcao * (proximo.fator - atual.fator);
    }
  }
  return pontos[pontos.length - 1].fator;
}

export function calcularTempoAcaoEmAnos(dataInicio: string | Date, dataFim = new Date()): number {
  let inicio: Date;
  if (dataInicio instanceof Date) {
    inicio = dataInicio;
  } else if (typeof dataInicio === "string") {
    const s = dataInicio.trim();
    if (s.includes("/")) {
      const parts = s.split("/");
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        const [day, month, year] = parts;
        inicio = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`);
      } else {
        inicio = new Date(s);
      }
    } else {
      inicio = new Date(s.includes("T") ? s : `${s}T00:00:00`);
    }
  } else {
    inicio = new Date(dataInicio);
  }

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(dataFim.getTime())) {
    throw new TypeError("As datas informadas devem ser válidas.");
  }
  return Math.max(0, (dataFim.getTime() - inicio.getTime()) / MILLISECONDS_PER_YEAR);
}

/** Cálculo pela tabela legada. Mantido para comparação com o motor. */
export function calcularValorEconomicoPotencial(
  valorBase: number,
  tempoAcaoAnos: number,
): EconomicPotentialCalculation {
  if (!Number.isFinite(valorBase) || valorBase < 0) {
    throw new TypeError("O valor-base deve ser um número válido e não negativo.");
  }
  const fator = obterFator(tempoAcaoAnos);
  const valorEconomicoPotencial = valorBase * fator;
  return {
    valorBase,
    tempoAcaoAnos,
    fator,
    valorEconomicoPotencial,
    origem: valorBase > 0 ? "tabela_legada" : "sem_dados",
    origemDescricao:
      "Tabela de fatores por tempo de ação, sem vínculo com índice oficial. Mantida apenas para comparação.",
    fatorLegado: fator,
    calculo: `${numberFormatter.format(valorBase)} × ${factorFormatter.format(fator)} = ${numberFormatter.format(valorEconomicoPotencial)}`,
  };
}

/**
 * Cálculo a partir do resultado do motor de atualização de débitos.
 * O fator passa a ser o multiplicador efetivo de correção mais juros.
 */
export function calcularValorPotencialPorAtualizacao(
  resultado: JudicialUpdateResult,
  tempoAcaoAnos: number,
): EconomicPotentialCalculation {
  const { input } = resultado;
  const indiceLabel = MONETARY_INDEX_LABEL[input.index];

  return {
    valorBase: resultado.principal,
    tempoAcaoAnos,
    fator: resultado.multiple,
    valorEconomicoPotencial: resultado.total,
    origem: resultado.principal > 0 ? "motor_judicial" : "sem_dados",
    origemDescricao: `Correção monetária pelo índice ${indiceLabel} somada aos juros de mora do período, com transição para a taxa legal do art. 406 do Código Civil em 30/08/2024.`,
    indice: input.index,
    indiceLabel,
    correcao: resultado.correction,
    juros: resultado.interest,
    dataInicial: input.correctionStart,
    dataFinal: input.endDate,
    fatorLegado: obterFator(tempoAcaoAnos),
    possuiProjecao: resultado.hasProjection,
    calculo: `${numberFormatter.format(resultado.principal)} × ${factorFormatter.format(resultado.multiple)} = ${numberFormatter.format(resultado.total)}`,
  };
}

/** Compatibilidade: cálculo pela tabela legada a partir de um período. */
export function calcularValorPotencialPorPeriodo(
  valorBase: number,
  dataInicio: string | Date,
  dataFim = new Date(),
): EconomicPotentialCalculation {
  return calcularValorEconomicoPotencial(valorBase, calcularTempoAcaoEmAnos(dataInicio, dataFim));
}

export function calcularPrecoCompra(
  valorEconomicoPotencial: number,
  percentual = BASE_PURCHASE_PRICE_RATIO,
): number {
  if (!Number.isFinite(valorEconomicoPotencial) || valorEconomicoPotencial < 0) {
    throw new TypeError("O valor econômico potencial deve ser válido e não negativo.");
  }
  if (!Number.isFinite(percentual) || percentual < 0) {
    throw new TypeError("O percentual do preço de compra deve ser válido e não negativo.");
  }
  return valorEconomicoPotencial * percentual;
}

export { calculateJudicialUpdate };
