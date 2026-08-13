/**
 * Textos de ajuda contextual, por campo.
 *
 * Centralizados para que o mesmo campo tenha a mesma explicação em qualquer tela.
 * Formato definido em `editorialGuide.ts`: o que é / como é calculado / como ler.
 * Objetivo: o demonstrador não precisa decorar a definição de nenhum indicador.
 */

export const FIELD_HELP = {
  // ---------------------------------------------------------------- Deal Flow
  caso: "O que é: o processo em análise, com ranking de atratividade e responsável pela avaliação. Como ler: o número antes do nome é a posição no pipeline, ordenada por atratividade de compra.",
  setor:
    "O que é: o segmento econômico do litígio. Como ler: concentração setorial no portfólio significa risco correlacionado — vários ativos expostos ao mesmo tipo de tese.",
  valorDaCausa:
    "O que é: o valor atribuído à causa na petição inicial. Como é obtido: extraído da capa dos autos. Como ler: é a base do cálculo de atualização, não o valor esperado de recuperação.",
  valorAtualizado:
    "O que é: o principal corrigido monetariamente e acrescido dos juros de mora até hoje. Como é calculado: índice adotado no processo sobre o principal, juros sobre o valor corrigido, com transição para a taxa legal do art. 406 do Código Civil em 30/08/2024. Como ler: é a base de exposure do ativo — clique para abrir a apuração mês a mês.",
  dealValue:
    "O que é: o preço-base de aquisição do ativo. Como é calculado: 10% do Valor Econômico Potencial, na relação 1:10 adotada pela mesa. Como ler: ponto de partida da negociação, antes dos ajustes do valuation por risco.",
  faseProcessual:
    "O que é: a fase corrente do processo, na escala de quinze etapas do rito. Como é definida: a partir do último andamento registrado nos autos. Como ler: quanto mais avançada, menor a duration remanescente até a liquidez.",
  score:
    "O que é: o score global de risco do parecer Nulidade360, de 0 a 100. Como é calculado: ponderação jurídico-pericial dos achados aceitos após revisão humana. Como ler: mede risco, não atratividade — score alto reduz o preço que o ativo suporta.",
  riscoJuridico:
    "O que é: a classificação do risco consolidado do caso. Como é definida: faixa correspondente ao score do parecer. Como ler: risco alto não invalida o ativo — reprecifica.",
  recomendacao:
    "O que é: a posição sugerida ao comitê. Como é definida: combinação do risco apurado com a assimetria entre preço e recuperação esperada. Como ler: avançar, reprecificar, negociar, revisar ou rejeitar.",
  statusDeal:
    "O que é: o estágio do ativo no funil de decisão do fundo. Como ler: indica de quem é a próxima ação — mesa, comitê ou jurídico.",
  perfilCompra:
    "O que é: o perfil de risco recomendado para a aquisição. Como é definido: cruzamento entre robustez probatória e risco de nulidade. Como ler: conservador admite ticket cheio; não recomendado exige desconto agressivo ou descarte.",
  mapaEvidencias:
    "O que é: o estado do vínculo entre os achados e o mapa de evidências extraído dos autos. Como ler: mapa pendente significa que o score não tem lastro documental rastreável linha a linha.",

  // ------------------------------------------------------------------ Scores
  scoreJuridico:
    "O que é: a consistência da tese jurídica, de 0 a 100. Como é calculado: aderência dos pedidos aos elementos do processo e à jurisprudência aplicável. Como ler: quanto maior, melhor — entra invertido no índice de criticidade.",
  scoreProbatorio:
    "O que é: a robustez do conjunto probatório, de 0 a 100. Como é calculado: força, cobertura e rastreabilidade das evidências mapeadas. Como ler: quanto maior, melhor — é o componente de maior peso depois da nulidade.",
  scoreNulidade:
    "O que é: o risco de invalidação ou perda de utilidade de atos e provas. Como é calculado: score global do parecer sobre os catorze pilares. Como ler: quanto maior, pior — responde por 40% do índice de criticidade.",
  scoreAcordo:
    "O que é: a alavanca disponível para composição, de 0 a 100. Como é calculado: exposição das partes ao risco, estágio processual e custo de litigar. Como ler: quanto maior, melhor — atenua a criticidade, mas não elimina o risco subjacente.",

  // --------------------------------------------------------------- Dashboard
  dealsAnalisados:
    "O que é: a quantidade de processos com análise concluída no portfólio. Como ler: base de comparação para todos os indicadores agregados desta tela.",
  valorSobAnalise:
    "O que é: a soma do valor atualizado de todos os processos em análise. Como ler: é o exposure bruto do portfólio, antes do haircut por risco.",
  riscoMedio:
    "O que é: a média dos scores de risco dos processos analisados. Como ler: média alta indica portfólio que depende de reprecificação para gerar retorno.",
  oportunidadesOcultas:
    "O que é: achados relevantes que não constavam da tese original do cedente. Como ler: são a fonte de assimetria — valor que o vendedor não precificou.",
  economiaEstimada:
    "O que é: a redução de preço obtida ao trazer para a negociação os riscos apurados. Como é calculado: diferença entre o preço de referência inicial e o preço recomendado. Como ler: é a métrica de retorno direto da diligência.",
  tempoAnalise:
    "O que é: o tempo médio entre a ingestão dos documentos e o parecer consolidado. Como ler: determina quantos ativos a mesa consegue avaliar por ciclo.",
  dealsAltoRisco:
    "O que é: processos classificados nas faixas alta ou crítica de risco. Como ler: exigem desconto agressivo ou descarte — concentram a maior parte da incerteza do portfólio.",
  valorPotencial:
    "O que é: a soma dos Valores Econômicos Potenciais do portfólio. Como ler: é o teto de recuperação bruta, não o valor esperado de recebimento.",

  // ------------------------------------------------------- Nulidade e achados
  documentosAnalisados:
    "O que é: o número de documentos já estruturados e auditados. Como é contado: arquivos processados pelo pipeline, incluindo autos e mapas de evidência. Como ler: cobertura baixa enfraquece qualquer score derivado.",
  blocosAuditados:
    "O que é: os agrupamentos temáticos usados para apresentar os achados. Como ler: é uma organização de leitura — a grade normativa da auditoria são os catorze pilares.",
  achadosAceitos:
    "O que é: os achados que sobreviveram à revisão humana e compõem o parecer. Como ler: não confundir com o total de evidências mapeadas, que é ordens de grandeza maior.",
  perguntaAchado:
    "O que é: a pergunta de auditoria que originou o achado. Como ler: cada pergunta cobre um risco específico de invalidação; a resposta é a inferência registrada.",
  statusAchado:
    "O que é: o desfecho da verificação. Como ler: indício encontrado e contradição interna sustentam tese; ausência relevante aponta prova que deveria existir e não está nos autos.",
  confianca:
    "O que é: o grau de certeza da inferência, de 0 a 100%. Como é calculado: qualidade e convergência das evidências que sustentam o achado. Como ler: confiança baixa exige validação humana antes de sustentar a conclusão em comitê.",
  paginaOrigem:
    "O que é: a página do documento processado onde a evidência foi localizada. Como ler: permite conferir a citação diretamente nos autos.",
  pilar:
    "O que é: uma das catorze frentes de invalidação processual auditadas pelo parecer. Como ler: pilar sem achado significa não avaliado — ausência de risco apurado, não ausência de risco.",
  forcaEvidencia:
    "O que é: a solidez do lastro documental do achado. Como ler: documento essencial ausente indica conclusão apoiada em lacuna, não em prova positiva.",
  suporteMapa:
    "O que é: se o achado está vinculado a linhas do mapa de evidências. Como ler: sem mapeamento significa que a rastreabilidade até o documento ainda não foi estabelecida.",
  valorEstrategico:
    "O que é: o peso do achado na estratégia processual. Como ler: valor crítico indica argumento capaz de alterar sozinho o desfecho.",
  riscoPreclusao:
    "O que é: o risco de perder a oportunidade de arguir o vício. Como ler: risco alto exige ação imediata — a tese pode não estar mais disponível depois.",
  deverViolado:
    "O que é: a obrigação processual descumprida. Como ler: é o que fundamenta juridicamente o pedido de invalidação.",
  atoAfetado:
    "O que é: o ato processual atingido pelo vício. Como ler: define a extensão da nulidade — um ato isolado ou toda a cadeia posterior.",
  prejuizo:
    "O que é: o dano concreto causado pelo vício. Como ler: sem demonstração de prejuízo não há nulidade, pelo princípio do pas de nullité sans grief.",
  nexoCausal:
    "O que é: a ligação entre o vício e o prejuízo. Como ler: é o elo que transforma uma irregularidade formal em nulidade arguível.",

  // ------------------------------------------------------------- Red Team
  provaColetada:
    "O que é: documento localizado nos autos e catalogado pelo agente de provas. Como ler: a referência de folha permite conferir o original.",
  tipoProva:
    "O que é: a natureza do documento. Como ler: contratos e pagamentos sustentam o dano material; apontamentos e horas internas sustentam o dimensionamento.",
  quesito:
    "O que é: pergunta técnica formulada pela autora para a perícia. Como ler: a resposta simulada mostra como a ré tende a respondê-la.",
  statusTecnico:
    "O que é: o resultado da verificação técnica de cada quesito. Como ler: não conforme indica ponto em que a ré diverge da autora — é onde a perícia será disputada.",
  taxaConformidade:
    "O que é: a proporção de quesitos em que a resposta simulada confirma a alegação da autora. Como é calculado: quesitos conformes divididos pelo total. Como ler: quanto menor, mais controvertida a matéria técnica.",
  exitoEstimado:
    "O que é: a probabilidade simulada de a linha de ataque prosperar. Como ler: ataques com alta probabilidade devem ser precificados como desconto, não ignorados.",

  // ------------------------------------------------------ Cálculo judicial
  competencia:
    "O que é: o mês de referência da atualização. Como ler: cada linha acumula o efeito dos meses anteriores.",
  indiceMes:
    "O que é: a variação do índice de correção naquele mês. Como ler: meses marcados como projeção usam estimativa, porque o índice oficial ainda não foi publicado.",
  fatorAcumulado:
    "O que é: o multiplicador de correção acumulado desde o termo inicial. Como ler: aplicado sobre o principal, resulta no valor corrigido da linha.",
  principalCorrigido:
    "O que é: o valor principal já atualizado pela inflação do período. Como ler: ainda não inclui juros de mora.",
  jurosAcumulados:
    "O que é: o percentual de juros de mora acumulado até a competência. Como é calculado: soma das taxas mensais no regime simples; capitalização no regime composto.",
  jurosValor:
    "O que é: os juros de mora em reais, apurados sobre o valor corrigido. Como ler: em processos longos, costuma superar a própria correção monetária.",
  subtotal:
    "O que é: principal corrigido somado aos juros da competência. Como ler: é o valor que o débito alcançaria se liquidado naquele mês.",
  regimeJuros:
    "O que é: a regra de juros vigente na competência. Como ler: até 29/08/2024 aplica-se a taxa convencionada ou 1% ao mês; a partir de 30/08/2024, a taxa legal do art. 406 do Código Civil (SELIC menos IPCA, com piso zero).",
  multiplicador:
    "O que é: quantas vezes o débito atualizado supera o principal original. Como ler: sintetiza o efeito combinado de correção, juros e tempo.",

  // ------------------------------------------------------ Investment Memo
  precoReferencia:
    "O que é: o preço inicialmente pedido pelo cedente. Como ler: a diferença para o preço recomendado é o ganho de negociação obtido pela diligência.",
  precoRecomendado:
    "O que é: o preço máximo que o ativo suporta após os ajustes por risco. Como ler: é o teto da proposta, não o alvo — a negociação deve partir abaixo dele.",

  // ---------------------------------------------------------- Configurações
  regiaoDados:
    "O que é: onde os documentos processados ficam armazenados. Como ler: relevante para requisitos contratuais de soberania de dados.",
  retencao:
    "O que é: por quanto tempo os documentos permanecem disponíveis após a análise. Como ler: deve acompanhar o prazo de guarda exigido pelo fundo.",
  auditoriaLogs:
    "O que é: o registro imutável de quem acessou ou alterou cada análise. Como ler: é o que sustenta a rastreabilidade perante o comitê e a auditoria externa.",
} as const;

export type FieldHelpKey = keyof typeof FIELD_HELP;
