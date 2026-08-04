export type ProceduralPhase = {
  number: number;
  label: string;
};

export const proceduralPhases: ProceduralPhase[] = [
  { number: 1, label: "Petição inicial" },
  { number: 2, label: "Réplica" },
  { number: 3, label: "Saneamento" },
  { number: 4, label: "Pré-perícia" },
  { number: 5, label: "Início da perícia" },
  { number: 6, label: "Durante a perícia" },
  { number: 7, label: "Laudo nos autos" },
  { number: 8, label: "Impugnação ao laudo" },
  { number: 9, label: "Alegações finais" },
  { number: 10, label: "Sentença proferida" },
  { number: 11, label: "Recurso de apelação" },
  { number: 12, label: "Sustentação oral" },
  { number: 13, label: "Admissibilidade do REsp / STJ" },
  { number: 14, label: "Trânsito em julgado" },
  { number: 15, label: "Liquidação / cumprimento de sentença" },
];

const phaseMatchers: Array<{ phase: number; patterns: RegExp[] }> = [
  { phase: 15, patterns: [/liquida[cç][aã]o/, /cumprimento de senten[cç]a/] },
  { phase: 14, patterns: [/tr[aâ]nsito em julgado/] },
  { phase: 13, patterns: [/admissibilidade/, /resp\b/, /recurso especial/, /\bstj\b/] },
  { phase: 12, patterns: [/sustenta[cç][aã]o oral/] },
  { phase: 11, patterns: [/apela[cç][aã]o/] },
  { phase: 10, patterns: [/senten[cç]a/] },
  { phase: 9, patterns: [/alega[cç][oõ]es finais/] },
  { phase: 8, patterns: [/impugna[cç][aã]o ao laudo/, /esclarecimentos do expert/] },
  { phase: 7, patterns: [/laudo nos autos/, /laudo pericial juntado/] },
  { phase: 6, patterns: [/durante a per[ií]cia/, /fase pericial/, /per[ií]cia em andamento/] },
  { phase: 5, patterns: [/in[ií]cio da per[ií]cia/, /nomea[cç][aã]o do perito/] },
  { phase: 4, patterns: [/pr[eé]-per[ií]cia/] },
  { phase: 3, patterns: [/saneamento/, /decis[aã]o saneadora/] },
  { phase: 2, patterns: [/r[eé]plica/] },
  { phase: 1, patterns: [/peti[cç][aã]o inicial/, /distribui[cç][aã]o/] },
];

export function classifyProceduralPhase(description: string): ProceduralPhase | null {
  const normalized = description.toLocaleLowerCase("pt-BR");
  const match = phaseMatchers.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(normalized)),
  );

  return match ? (proceduralPhases[match.phase - 1] ?? null) : null;
}
