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

export const BASE_PURCHASE_PRICE_RATIO = 0.1;
