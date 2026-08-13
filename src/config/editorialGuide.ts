/**
 * Guia editorial da plataforma.
 *
 * O leitor é o profissional que avalia processos para um fundo: precisa medir risco e potencial
 * de retorno, e defender a conclusão perante um comitê de investimento. O texto deve ser frio,
 * técnico e explicativo — nem laudo hermético, nem material de produto.
 *
 * Regras aplicadas em toda a interface:
 *
 * 1. Terceira pessoa. Nunca "seu caso", "seu portfólio", "você pode".
 * 2. Sem instrução de navegação em texto analítico. Orientação de uso vira dica discreta,
 *    separada do conteúdo que descreve o ativo.
 * 3. Sem autoelogio de produto. A plataforma não "reduz erro" nem "traduz fragilidades":
 *    ela apura, mede, classifica e recomenda.
 * 4. Toda afirmação fecha em consequência — risco, impacto no preço ou ação recomendada.
 * 5. Números declaram origem e unidade. Score sempre com a escala; valor sempre com a data-base.
 * 6. Campos de ajuda seguem o formato "o que é / como é calculado / como ler".
 * 7. A separação entre fato do processo, alegação de parte, inferência e métrica simulada é
 *    explícita — nunca se apresenta simulação como constatação.
 */

/** Vocabulário esperado pelo comitê, para uso consistente entre telas. */
export const FUND_GLOSSARY = {
  exposure: "Valor em risco no ativo, medido pelo débito atualizado.",
  duration: "Tempo decorrido desde a distribuição até o último ato processual.",
  haircut: "Desconto aplicado sobre a recuperação bruta em razão do risco apurado.",
  carryCost: "Custo de manter a posição enquanto o processo não se encerra.",
  weightedSuccess: "Probabilidade de êxito ponderada pelos vetores de ataque mapeados.",
  stressScenario: "Cenário em que os principais riscos identificados se concretizam.",
  recoveryThesis: "Caminho pelo qual o fundo espera converter a tese em recebimento.",
} as const;

/** Formato padrão dos campos de ajuda. */
export function buildHelpText(parts: { what: string; how: string; read: string }): string {
  return `O que é: ${parts.what} Como é calculado: ${parts.how} Como ler: ${parts.read}`;
}
