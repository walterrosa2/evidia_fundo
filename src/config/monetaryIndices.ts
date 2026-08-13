/**
 * Séries de índices de correção monetária usadas pelo motor de atualização de débitos.
 *
 * ATENÇÃO — natureza dos dados:
 * As séries abaixo são calibradas pela variação anual oficial de cada índice e distribuídas
 * mensalmente pela taxa equivalente composta. Servem à demonstração do método de cálculo: o
 * resultado acompanha a ordem de grandeza de uma atualização real, mas não substitui a tabela
 * oficial do tribunal para uso processual.
 *
 * Anos posteriores a `LAST_OBSERVED_YEAR` são projeções e devem ser sinalizados na interface.
 */

export type MonetaryIndex = "TJSP" | "IPCA" | "IPCA_E" | "INPC" | "IGPM" | "SELIC";

export const MONETARY_INDEX_LABEL: Record<MonetaryIndex, string> = {
  TJSP: "Tabela Prática do TJSP",
  IPCA: "IPCA (IBGE)",
  IPCA_E: "IPCA-E (IBGE)",
  INPC: "INPC (IBGE)",
  IGPM: "IGP-M (FGV)",
  SELIC: "Taxa SELIC acumulada",
};

export const MONETARY_INDEX_NOTE: Record<MonetaryIndex, string> = {
  TJSP: "Índice de atualização adotado pelo Tribunal de Justiça de São Paulo. Acompanha o IPCA-E desde 2021.",
  IPCA: "Índice oficial de inflação. Adotado como correção legal das dívidas civis desde a Lei 14.905/2024.",
  IPCA_E: "Versão do IPCA com coleta antecipada, usual em condenações judiciais.",
  INPC: "Índice de preços ao consumidor com foco em faixas de renda mais baixas.",
  IGPM: "Índice da FGV com forte peso atacadista; mais volátil em choques cambiais.",
  SELIC:
    "Taxa básica acumulada. Quando aplicada isoladamente, já engloba correção e juros — não pode ser cumulada com outro índice.",
};

/** Último ano com variação observada. A partir daqui, os valores são projetados. */
export const LAST_OBSERVED_YEAR = 2025;

/** Variação percentual anual de cada índice (% ao ano). */
const ANNUAL_VARIATION: Record<MonetaryIndex, Record<number, number>> = {
  IPCA: {
    2008: 5.9,
    2009: 4.31,
    2010: 5.91,
    2011: 6.5,
    2012: 5.84,
    2013: 5.91,
    2014: 6.41,
    2015: 10.67,
    2016: 6.29,
    2017: 2.95,
    2018: 3.75,
    2019: 4.31,
    2020: 4.52,
    2021: 10.06,
    2022: 5.79,
    2023: 4.62,
    2024: 4.83,
    2025: 4.5,
    2026: 4.0,
    2027: 3.8,
    2028: 3.5,
  },
  IPCA_E: {
    2008: 6.32,
    2009: 3.99,
    2010: 6.4,
    2011: 6.19,
    2012: 5.78,
    2013: 5.76,
    2014: 6.46,
    2015: 10.71,
    2016: 6.58,
    2017: 3.0,
    2018: 3.86,
    2019: 3.91,
    2020: 4.23,
    2021: 10.42,
    2022: 5.93,
    2023: 4.72,
    2024: 4.71,
    2025: 4.6,
    2026: 4.0,
    2027: 3.8,
    2028: 3.5,
  },
  TJSP: {
    2008: 6.32,
    2009: 3.99,
    2010: 6.4,
    2011: 6.19,
    2012: 5.78,
    2013: 5.76,
    2014: 6.46,
    2015: 10.71,
    2016: 6.58,
    2017: 3.0,
    2018: 3.86,
    2019: 3.91,
    2020: 4.23,
    2021: 10.42,
    2022: 5.93,
    2023: 4.72,
    2024: 4.71,
    2025: 4.6,
    2026: 4.0,
    2027: 3.8,
    2028: 3.5,
  },
  INPC: {
    2008: 6.48,
    2009: 4.11,
    2010: 6.47,
    2011: 6.08,
    2012: 6.2,
    2013: 5.56,
    2014: 6.23,
    2015: 11.28,
    2016: 6.58,
    2017: 2.07,
    2018: 3.43,
    2019: 4.48,
    2020: 5.45,
    2021: 10.16,
    2022: 5.93,
    2023: 3.71,
    2024: 4.77,
    2025: 4.5,
    2026: 4.0,
    2027: 3.8,
    2028: 3.5,
  },
  IGPM: {
    2008: 9.81,
    2009: -1.72,
    2010: 11.32,
    2011: 5.1,
    2012: 7.82,
    2013: 5.51,
    2014: 3.69,
    2015: 10.54,
    2016: 7.17,
    2017: -0.52,
    2018: 7.54,
    2019: 7.3,
    2020: 23.14,
    2021: 17.78,
    2022: 5.45,
    2023: -3.18,
    2024: 6.54,
    2025: 3.0,
    2026: 3.5,
    2027: 3.5,
    2028: 3.5,
  },
  SELIC: {
    2008: 12.48,
    2009: 9.93,
    2010: 9.75,
    2011: 11.6,
    2012: 8.4,
    2013: 8.05,
    2014: 10.9,
    2015: 13.24,
    2016: 14.0,
    2017: 9.93,
    2018: 6.42,
    2019: 5.96,
    2020: 2.76,
    2021: 4.42,
    2022: 12.39,
    2023: 13.04,
    2024: 10.88,
    2025: 14.5,
    2026: 14.0,
    2027: 12.0,
    2028: 10.5,
  },
};

const FALLBACK_ANNUAL: Record<MonetaryIndex, number> = {
  IPCA: 4.0,
  IPCA_E: 4.0,
  TJSP: 4.0,
  INPC: 4.0,
  IGPM: 3.5,
  SELIC: 10.5,
};

/** Variação anual do índice no ano indicado, em pontos percentuais. */
export function annualVariation(index: MonetaryIndex, year: number): number {
  return ANNUAL_VARIATION[index][year] ?? FALLBACK_ANNUAL[index];
}

/** Taxa mensal equivalente composta derivada da variação anual. */
export function monthlyRate(index: MonetaryIndex, year: number): number {
  return (1 + annualVariation(index, year) / 100) ** (1 / 12) - 1;
}

/** Indica se a competência informada é projeção, e não variação observada. */
export function isProjected(year: number): boolean {
  return year > LAST_OBSERVED_YEAR;
}

/**
 * Taxa legal de juros do art. 406 do Código Civil na redação da Lei 14.905/2024:
 * SELIC deduzida do IPCA no mesmo período, com piso zero.
 */
export function legalInterestMonthlyRate(year: number): number {
  const selic = monthlyRate("SELIC", year);
  const ipca = monthlyRate("IPCA", year);
  return Math.max(0, selic - ipca);
}

/** Marco de vigência da Lei 14.905/2024, que alterou os arts. 389 e 406 do Código Civil. */
export const LAW_14905_EFFECTIVE_DATE = "2024-08-30";
