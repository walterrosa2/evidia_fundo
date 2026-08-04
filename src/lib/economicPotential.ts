import {
  ECONOMIC_POTENTIAL_FACTORS,
  BASE_PURCHASE_PRICE_RATIO,
  FACTOR_ABOVE_ELEVEN_YEARS,
} from "@/config/economicPotentialFactors";

const MILLISECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const factorFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export type EconomicPotentialCalculation = {
  valorBase: number;
  tempoAcaoAnos: number;
  fator: number;
  valorEconomicoPotencial: number;
  calculo: string;
};

export function obterFator(valorEntrada: number): number {
  if (!Number.isFinite(valorEntrada)) {
    throw new TypeError("O valor de entrada deve ser um número válido.");
  }
  if (valorEntrada > 11) return FACTOR_ABOVE_ELEVEN_YEARS;

  const entradaNormalizada = Math.max(0, valorEntrada);
  let fator = ECONOMIC_POTENTIAL_FACTORS[0].fator;
  for (const item of ECONOMIC_POTENTIAL_FACTORS) {
    if (item.entrada > entradaNormalizada) break;
    fator = item.fator;
  }
  return fator;
}

export function calcularTempoAcaoEmAnos(dataInicio: string | Date, dataFim = new Date()): number {
  const inicio = dataInicio instanceof Date ? dataInicio : new Date(`${dataInicio}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(dataFim.getTime())) {
    throw new TypeError("As datas informadas devem ser válidas.");
  }
  return Math.max(0, (dataFim.getTime() - inicio.getTime()) / MILLISECONDS_PER_YEAR);
}

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
    calculo: `${numberFormatter.format(valorBase)} × ${factorFormatter.format(fator)} = ${numberFormatter.format(valorEconomicoPotencial)}`,
  };
}

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
