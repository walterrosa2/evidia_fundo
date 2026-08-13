/**
 * Tabela legada de fatores por tempo de ação.
 *
 * DEPRECIADA como fonte do Valor Econômico Potencial — mantida apenas para comparação na
 * interface. A curva não deriva de índice algum: entre 3 e 8 anos o fator é igual ao número de
 * anos, e há um degrau de 9,3 para 11,0 entre 10 e 10,5 anos. Confrontada com a atualização real
 * (correção pelo índice do processo + juros de mora), superestimava os ativos entre 2,2× e 2,8×.
 *
 * O cálculo vigente está em `lib/judicialUpdate.ts`.
 */
export type EconomicPotentialFactor = { entrada: number; fator: number };

export const ECONOMIC_POTENTIAL_FACTORS: readonly EconomicPotentialFactor[] = [
  { entrada: 0, fator: 1 },
  { entrada: 0.5, fator: 1.3 },
  { entrada: 1, fator: 1.7 },
  { entrada: 1.5, fator: 2 },
  { entrada: 2, fator: 2.4 },
  { entrada: 2.5, fator: 2.7 },
  { entrada: 3, fator: 3 },
  { entrada: 3.5, fator: 3.5 },
  { entrada: 4, fator: 4 },
  { entrada: 4.5, fator: 4.5 },
  { entrada: 5, fator: 5 },
  { entrada: 5.5, fator: 5.5 },
  { entrada: 6, fator: 6 },
  { entrada: 6.5, fator: 6.5 },
  { entrada: 7, fator: 7 },
  { entrada: 7.5, fator: 7.5 },
  { entrada: 8, fator: 8 },
  { entrada: 8.5, fator: 8.2 },
  { entrada: 9, fator: 8.8 },
  { entrada: 9.5, fator: 9 },
  { entrada: 10, fator: 9.3 },
  { entrada: 10.5, fator: 11 },
  { entrada: 11, fator: 11.2 },
] as const;

export const FACTOR_ABOVE_ELEVEN_YEARS = 11.5;

/**
 * Deal Value como fração do Valor Econômico Potencial (relação 1:10).
 *
 * Revisada após a migração para o motor de atualização: com o VEP agora derivado de correção e
 * juros reais, os 10% produzem preços na mesma ordem de grandeza dos preços recomendados nos
 * cenários de valuation de cada caso — o que não ocorria com a tabela legada, cujo VEP inflado
 * gerava tickets várias vezes maiores que o preço-alvo do comitê.
 */
export const BASE_PURCHASE_PRICE_RATIO = 0.1;
