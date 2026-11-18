/**
 * Ajuda contextual das telas operacionais: seções, abas, botões e campos.
 *
 * A ajuda das COLUNAS de tabela vem do servidor (`backend/evidia/services/table_help.py`).
 * Aqui fica o que é da tela. Três formatos, sempre em três linhas:
 * - campo:  o que é / como é calculado / como ler   (guia editorial do projeto)
 * - tela:   o que é / como funciona / como ler
 * - ação:   o que faz / quando usar / o que muda
 *
 * Regras do texto: terceira pessoa; todo número diz de onde vem; o que é simulado, alegado
 * ou não homologado é dito como tal. Rótulos (`label`) não repetem o texto de botões da
 * tela, para não confundir leitores de tela nem a busca por nome.
 */

export type HelpEntry = { label: string; text: string };

const field = (what: string, how: string, read: string) =>
  `O que é: ${what}\nComo é calculado: ${how}\nComo ler: ${read}`;
const screen = (what: string, works: string, read: string) =>
  `O que é: ${what}\nComo funciona: ${works}\nComo ler: ${read}`;
const action = (does: string, when: string, effect: string) =>
  `O que faz: ${does}\nQuando usar: ${when}\nO que muda: ${effect}`;

export const HELP = {
  // ------------------------------------------------------------------ etapas
  stages: {
    label: "as etapas da avaliação",
    text: screen(
      "As seis etapas do trabalho sobre o ativo: entrada, estruturação, motores, contraditório, avaliação econômica e decisão.",
      "O estado de cada etapa é calculado pelo servidor a partir do dossiê. A etapa aberta fica no endereço da página e o caso é o mesmo em todas.",
      "“Desatualizada” indica resultado anterior à versão atual dos documentos. “Parcial” e “Falhou” nunca significam ausência de problema.",
    ),
  },
  snapshot: {
    label: "o retrato da origem",
    text: screen(
      "O que a originação informava sobre o caso em cada importação.",
      "Cada importação gera uma versão com hash do conteúdo; diferença de CNJ ou de partes vira conflito a revisar, sem substituir o valor anterior.",
      "É metadado e relatório derivado, não cópia dos autos. A lacuna de autos integrais é declarada em toda importação.",
    ),
  },
  gaps: {
    label: "as lacunas do dossiê",
    text: screen(
      "Peças citadas ou esperadas que não estão no dossiê.",
      "Surgem na importação ou por registro de quem analisa; cada uma pode ser marcada como recebida ou reaberta.",
      "Lacuna em aberto é ponto cego. Documento ausente não equivale a ausência de irregularidade.",
    ),
  },
  // ------------------------------------------------------------ estruturação
  documents: {
    label: "os documentos do dossiê",
    text: screen(
      "Os arquivos que sustentam a análise, com versão, hash e contagem real de páginas.",
      "O original é guardado como veio. Nova versão não apaga a anterior, mas deixa desatualizado o que foi feito sobre ela.",
      "Só documento com texto por página pode ser citado por trecho; digitalizado depende de OCR.",
    ),
  },
  originReports: {
    label: "os relatórios da originação",
    text: action(
      "Busca o estudo e o dossiê em PDF que a originação gera para o processo e os guarda como documentos.",
      "Quando o caso veio da originação e ainda não há esses relatórios no dossiê.",
      "Entram como relatório derivado: não são autos, não liberam o parecer integral e repetir a busca não cria fonte nova.",
    ),
  },
  claims: {
    label: "as afirmações do dossiê",
    text: screen(
      "Enunciados rastreáveis: cada um com natureza, documento, página e estado de revisão.",
      "São registrados por pessoa ou sugeridos por regra ou modelo e aceitos por pessoa. Validar é ato de revisor, com histórico.",
      "Alegação de parte continua alegação. “Validada” significa revisada por responsável, não verdade reconhecida em juízo.",
    ),
  },
  bulkReview: {
    label: "o encaminhamento em lote",
    text: action(
      "Passa as afirmações selecionadas de pendente para em revisão.",
      "Quando um conjunto de afirmações está pronto para o revisor.",
      "Só as pendentes mudam; o servidor confere cada uma e registra histórico. Validar e descartar continuam individuais, porque exigem fundamento.",
    ),
  },
  suggestions: {
    label: "as sugestões de afirmação",
    text: action(
      "Propõe afirmações a partir das páginas escolhidas, por regras locais ou pelo modelo de linguagem.",
      "Para acelerar a leitura de uma peça. Por regras não usa IA; com modelo consome API paga quando o modelo real está ligado.",
      "Nada é gravado até o registro por pessoa. Todo trecho é conferido contra a página; em peça de parte, o que o modelo chama de constatação entra como alegação.",
    ),
  },
  tableToolbar: {
    label: "os controles da tabela",
    text: screen(
      "Visões salvas, escolha e ordem de colunas, filtros por coluna, seleção e exportação.",
      "Filtro, ordenação e paginação são resolvidos no servidor, sobre todos os registros. Valores da mesma coluna combinam por OU; colunas diferentes, por E.",
      "A exportação confere de novo o que o usuário pode ver. Visão salva é pessoal e nunca amplia permissão.",
    ),
  },
  // ----------------------------------------------------------------- motores
  engines: {
    label: "a auditoria de nulidades",
    text: screen(
      "Auditoria do documento pelo motor Nulidade360, por blocos temáticos, sob a ótica de um dos lados.",
      "A Evidia envia o texto, acompanha a execução e confere a página e o trecho de cada citação contra o documento. Pedido idêntico não é reenviado.",
      "Achado é saída de motor, nasce pendente e depende de revisão. Bloco que falha deixa a análise parcial; índice de risco não é probabilidade.",
    ),
  },
  startAudit: {
    label: "o início da auditoria",
    text: action(
      "Envia o documento escolhido ao motor para o lado confirmado.",
      "Com o documento em texto vigente e o lado definido. Em modo real, cada execução consome API paga.",
      "Cria uma execução registrada antes do envio. O mapa de evidências, se escolhido, chega ao motor antes da análise.",
    ),
  },
  findingsTable: {
    label: "a tabela de resultados do motor",
    text: action(
      "Reúne em uma tabela os achados de todas as execuções deste dossiê.",
      "Para filtrar por bloco, revisão, evidência ou índice de risco, e comparar execuções.",
      "Não altera nada. De cada linha se chega à execução que gerou o achado.",
    ),
  },
  engineReport: {
    label: "o relatório gerado pelo motor",
    text: action(
      "Baixa o documento .docx que o próprio motor monta sobre a execução.",
      "Quando houver achados aceitos no motor; sem isso, o motor não gera o relatório.",
      "É leitura: nada entra no dossiê. Relatório de execução simulada leva a marca no nome do arquivo.",
    ),
  },
  p4: {
    label: "provas, quesitos e respostas",
    text: screen(
      "Mapeamento de provas, quesitos e respostas técnicas produzido pelo P4.",
      "A Evidia não executa o P4: prepara o texto de entrada, registra o pedido e lê o relatório gerado por quem tem autorização.",
      "A página vem da referência em texto livre do P4 e é conferida contra o documento analisado. Item sem página fica com pendência.",
    ),
  },
  p4Request: {
    label: "a preparação do P4",
    text: action(
      "Registra o pedido de execução e fixa o texto de entrada, uma página por marcador.",
      "Antes de alguém executar o P4 fora da Evidia. O documento precisa ter texto por página.",
      "O pedido fica aguardando execução externa e é fechado pela importação do relatório correspondente.",
    ),
  },
  p4Import: {
    label: "a leitura do relatório do P4",
    text: action(
      "Lê a planilha do P4 já recebida no dossiê e grava provas, quesitos e respostas.",
      "Com o relatório enviado como documento e conhecido o documento que o P4 analisou.",
      "Cria uma execução importada, com limitações declaradas. Repetir o mesmo relatório não duplica itens.",
    ),
  },
  p4Items: {
    label: "a tabela de itens do P4",
    text: action(
      "Mostra em tabela todos os itens importados do P4.",
      "Para localizar itens por etapa, bloco, tipo de prova ou pendência.",
      "Não altera nada.",
    ),
  },
  diligence: {
    label: "a diligência de vínculos",
    text: screen(
      "Cruzamento de peritos e assistentes com advogados, partes e magistrados em outros processos.",
      "Usa os participantes cadastrados e as consultas registradas, na janela de cinco anos anterior à data de referência, contada pela data do ato.",
      "Aparecer no mesmo processo é coocorrência. Não prova amizade, contratação nem parcialidade, e vínculo isolado não gera nulidade.",
    ),
  },
  diligencePanel: {
    label: "o painel de vínculos",
    text: action(
      "Abre participantes, cruzamentos e ocorrências em tela inteira.",
      "Para cadastrar pessoas e papéis, consultar fontes e revisar ocorrências.",
      "Não altera nada ao abrir.",
    ),
  },
  diligenceTabs: {
    label: "as abas da diligência",
    text: screen(
      "Três partes do trabalho: Participantes, Cruzamentos e Ocorrências.",
      "Participantes: pessoas, identificadores e papéis por processo. Cruzamentos: coocorrências e recorrência na janela de cinco anos. Ocorrências: fichas para revisão.",
      "Homônimos ficam separados até decisão de revisor. Ocorrência nasce candidata e só é validada com identidade e fonte.",
    ),
  },
  sourceFile: {
    label: "a consulta em fonte real",
    text: action(
      "Registra o resultado de uma consulta feita por pessoa autorizada em tribunal, conselho ou fornecedor, a partir de planilha do dossiê.",
      "Quando não há conector para a fonte. A planilha é a prova da coleta.",
      "Os vínculos entram como candidatos. A cobertura é a declarada por quem consultou; planilha com linha inválida é recusada inteira.",
    ),
  },
  // ------------------------------------------------------------ contraditório
  scenarios: {
    label: "o contraditório bilateral",
    text: screen(
      "Os argumentos de autor e réu para cada pedido, sobre a mesma versão das evidências.",
      "Cada cenário é de um participante e de um lado. Argumento com evidência cita página do dossiê; sem evidência fica como hipótese a validar.",
      "Lado não analisado não recebe valor substituto: ausência de ataque não é êxito. A comparação não depende da posição econômica avaliada.",
    ),
  },
  scenariosPanel: {
    label: "o painel do contraditório",
    text: action(
      "Abre pedidos, cenários e comparação em tela inteira.",
      "Para individualizar pedidos e registrar ou gerar os cenários de cada lado.",
      "Não altera nada ao abrir. Cenário gerado por modelo é rotulado e depende de revisão.",
    ),
  },
  // ----------------------------------------------------------------- economia
  economics: {
    label: "os demonstrativos econômicos",
    text: screen(
      "Recebimento do autor e redução de passivo do réu, calculados em separado e sem contrato.",
      "O servidor calcula em decimal, por cenário, com memória de cada componente. Impactos da mesma causa não se somam.",
      "Metodologia não homologada. Preço, retorno do investidor e remuneração ficam não definidos, o que não equivale a zero.",
    ),
  },
  sideTabs: {
    label: "os dois demonstrativos",
    text: screen(
      "Escolha do lado a calcular: recebimento do autor ou redução de passivo do réu.",
      "Um lado por execução. O demonstrativo do réu parte de uma exposição de referência informada.",
      "Um demonstrativo nunca é derivado do outro por subtração. Redução de passivo é economia do cliente, não receita.",
    ),
  },
  discountRate: {
    label: "a taxa de desconto",
    text: field(
      "Taxa anual usada para trazer valores futuros à data-base.",
      "Informada como premissa, com o responsável que a aprovou. Valor presente = valor / (1 + taxa) ^ anos.",
      "Sem taxa aprovada não há valor presente. É premissa distinta da probabilidade.",
    ),
  },
  probabilitiesApproval: {
    label: "a aprovação das probabilidades",
    text: field(
      "Responsável que aprovou as probabilidades dos cenários.",
      "Informado junto das premissas; as probabilidades de cenários excludentes devem somar 1.",
      "Sem responsável os cenários saem sem ponderação. Score heurístico nunca é usado como probabilidade.",
    ),
  },
  referenceExposure: {
    label: "a exposição de referência",
    text: field(
      "Valor contra o qual a redução de passivo é medida.",
      "Informado como premissa, com o que representa. Não é deduzido do demonstrativo do autor.",
      "Redução bruta = exposição de referência menos desembolso do cenário.",
    ),
  },
  grossReceipt: {
    label: "o recebimento bruto",
    text: field(
      "Valor bruto que o autor receberia no cenário, na moeda e data-base informadas.",
      "Informado como premissa, com fonte, responsável e confiança.",
      "Dele saem os custos e os impactos de valor para chegar ao recebimento líquido.",
    ),
  },
  disbursement: {
    label: "o desembolso do cenário",
    text: field(
      "Quanto o réu desembolsaria no cenário.",
      "Informado como premissa. Custo já contido nele não é deduzido de novo.",
      "A redução de passivo é a exposição de referência menos este valor e os custos ainda não incluídos.",
    ),
  },
  impacts: {
    label: "os impactos do cenário",
    text: field(
      "Ajuste do cenário motivado por achado, vínculo ou afirmação.",
      "Impactos da mesma causa recebem o mesmo grupo: por grupo e dimensão, só o de maior efeito entra na conta. Fonte do dossiê precisa estar validada.",
      "Impacto sobre probabilidade ou contrato fica apenas registrado. Os não aplicados aparecem na memória, com o motivo.",
    ),
  },
  netReceipt: {
    label: "o recebimento líquido",
    text: field(
      "O que o autor receberia no cenário depois de custos e impactos.",
      "Recebimento bruto, mais ou menos impactos de valor, menos custos. Cada componente está na memória de cálculo.",
      "Valor na data-base do demonstrativo; o valor presente só existe com taxa aprovada. Metodologia não homologada.",
    ),
  },
  netReduction: {
    label: "a redução líquida",
    text: field(
      "Quanto o passivo do réu diminuiria no cenário em relação à exposição de referência.",
      "Exposição de referência menos o desembolso e os custos ainda não incluídos nele.",
      "É economia do cliente, não receita. Valor negativo indica cenário pior que a referência e é preservado.",
    ),
  },
  scenariosTable: {
    label: "os cenários calculados",
    text: screen(
      "Todos os cenários de todas as execuções, inclusive as desatualizadas.",
      "Mostra os valores gravados em cada execução, sem recálculo. De cada linha se chega à memória.",
      "Execução desatualizada continua consultável, mas não representa os documentos atuais.",
    ),
  },
  emitMemo: {
    label: "a emissão do memorando",
    text: action(
      "Gera uma versão do memorando a partir do demonstrativo vigente.",
      "Depois de um cálculo que deva seguir para decisão. Demonstrativo desatualizado não gera memorando.",
      "Cria um retrato imutável, com as limitações do momento. A decisão sobre ele é da etapa 6.",
    ),
  },
  exportCalc: {
    label: "a exportação do demonstrativo",
    text: action(
      "Gera planilha CSV com componentes, impactos e sensibilidade do demonstrativo.",
      "Para conferir os números fora da tela ou anexá-los a um parecer.",
      "Não altera nada. Os números são os gravados; “não definido” é preservado e não vira zero.",
    ),
  },
  // ------------------------------------------------------------------ decisão
  decision: {
    label: "a etapa de decisão",
    text: screen(
      "Pendências das etapas anteriores e memorandos emitidos, com a decisão do responsável.",
      "Cada versão do memorando recebe uma única decisão, de revisor, com fundamento obrigatório. Mudança no dossiê deixa as versões desatualizadas.",
      "Memorando aprovado registra quem respondeu por ele. Não homologa a metodologia nem define contrato.",
    ),
  },
  memoDecision: {
    label: "a decisão sobre o memorando",
    text: action(
      "Registra aprovação ou devolução da versão, com fundamento.",
      "Quando o responsável concluiu a leitura do memorando vigente.",
      "A decisão é definitiva para a versão; para mudar, emite-se nova versão. Aprovar conclui a etapa 6.",
    ),
  },
} satisfies Record<string, HelpEntry>;

export type HelpTopic = keyof typeof HELP;
