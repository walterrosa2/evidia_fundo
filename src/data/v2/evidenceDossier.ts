/**
 * Dossiê de provas, quesitos e respostas simuladas — pipeline de evidências (P4).
 *
 * Gerado a partir de `relatorio_final.xlsx` pelo script `scripts/gerar_evidencias_ts.py`.
 * As respostas representam o parecer técnico simulado da ré aos quesitos formulados pela
 * autora, com o status de conformidade apurado pelo agente e a justificativa que o sustenta.
 *
 * NÃO EDITAR À MÃO: regenerar a partir do relatório.
 */

export type EvidenceCategory =
  | "contracts"
  | "payments"
  | "penalties"
  | "service_orders"
  | "internal_hours"
  | "losses"
  | "travel_expenses";

export type TechnicalStatus =
  "compliant" | "non_compliant" | "partially_compliant" | "inconclusive";

export const EVIDENCE_CATEGORY_LABEL: Record<EvidenceCategory, string> = {
  contracts: "Contratos",
  payments: "Pagamentos",
  penalties: "Multas contratuais",
  service_orders: "Apontamentos e OSs",
  internal_hours: "Horas internas",
  losses: "Perdas diretas e indiretas",
  travel_expenses: "Reembolsos e viagens",
};

export const TECHNICAL_STATUS_LABEL: Record<TechnicalStatus, string> = {
  compliant: "Conforme",
  non_compliant: "Não conforme",
  partially_compliant: "Parcialmente conforme",
  inconclusive: "Inconclusivo",
};

export interface CollectedEvidence {
  id: string;
  block: number;
  category: EvidenceCategory;
  /** Por que a prova importa para a tese. */
  summary: string;
  /** Referência de folha nos autos. */
  reference: string;
  /** Trecho transcrito do documento. */
  content: string;
}

export interface TechnicalQuery {
  id: string;
  block: number;
  /** Quesito formulado pela autora. */
  question: string;
  /** Resposta técnica simulada da ré. */
  answer: string;
  status: TechnicalStatus;
  /** Fundamentação da resposta, com referências de folha. */
  rationale: string;
  /** Ressalvas do agente sobre o alcance da resposta. */
  notes: string;
}

export interface EvidenceDossier {
  caseId: string;
  evidences: CollectedEvidence[];
  queries: TechnicalQuery[];
}

export const eletromarDossier: EvidenceDossier = {
  caseId: "case-eletromar-totvs",
  evidences: [
    {
      id: "ev-001",
      block: 1,
      category: "contracts",
      summary:
        "Identifica formalmente o principal contrato entre as partes, crucial para o objeto da ação.",
      reference: "fls. 20",
      content:
        "Contrato de Cessão de Direito de Uso de Software e prestação de serviços registrado no 10º Oficial Av. Paraná, 169-S - Centro - CEP 78.455-000 - Lucas do Rio Verde - MT - Fone/Fax: (65) 3549-1339 / 3549-1180 / 3549-1574 E-mail: nalberti@inexa.com.br / cbasso@inexa.com.br / jusianebasso@hotmail.com --- [ Página: 20 ] --- -5- fls. 20 AB Alberti & Basso ESCRITÓRIO DE ADVOCACIA Noeli Alberti - OAB/MT 4.061 Cristiano Alcides Basso - OAB/MT 6.252 Jusiane R. Basso - OAB/MT 10.319 de Registro de Títulos e documentos de São Paulo-SP, sob o nº 1.901.975 (doc. 02 em anexo);",
    },
    {
      id: "ev-002",
      block: 1,
      category: "contracts",
      summary:
        "Documenta um contrato de atendimento personalizado, que complementa a relação de serviços contratados.",
      reference: "fls. 20",
      content:
        "contrato de Atendimento Personalizado firmado em 12 de abril de 2010 (doc. 03 em anexo);",
    },
    {
      id: "ev-003",
      block: 1,
      category: "contracts",
      summary:
        "Identifica as propostas comerciais que detalham os serviços complementares de software e cessão de direito de uso, fundamentais para definir o escopo do projeto.",
      reference: "fls. 20",
      content:
        "Proposta Comercial nº 445575 (doc. 04) (Serviços Complementares de Software -SCS), e proposta comercial combo - 44542, 44543, 44544 e 44545 (doc. 05).",
    },
    {
      id: "ev-004",
      block: 1,
      category: "payments",
      summary:
        "Indica a continuidade das cobranças de serviços mensais de software (SMS), apesar da não utilização, suportado por documentos de pagamento.",
      reference: "fls. 25",
      content:
        "vem sendo exigido pagamento mensal de aproximadamente R$ 5.400,00, conforme comprovantes de pagamento em anexo, doc. 06 e 07, c/c docs. 02 e 05.",
    },
    {
      id: "ev-005",
      block: 1,
      category: "payments",
      summary:
        "Evidencia uma cobrança específica da TOTVS S.A. e a ameaça de restrição de crédito, corroborando a alegação de cobranças indevidas por serviços não prestados.",
      reference: "fls. 25",
      content:
        "O documento 07 incluso compreende ao boleto de cobrança da TOTVS S.A de R$ 5.681,65 por suporte técnico, manutenção e outros serviços de tecnologia e informática cujo vencimento está previsto para 06/06/2013 com menção de que em 10 (dez) dias do vencimento, diante do não pagamento, haverá a inscrição em cadastro de proteção ao crédito!",
    },
    {
      id: "ev-006",
      block: 1,
      category: "service_orders",
      summary:
        "Fornece prova documental do estado de não-conclusão do projeto de implantação, crucial para a alegação de inadimplemento contratual.",
      reference: "fls. 26",
      content:
        "Contudo, o documento 08 incluso evidencia o status atual do projeto: os sistemas adquiridos estão incompletos, sequer a fase de implantação foi concluída!",
    },
    {
      id: "ev-007",
      block: 1,
      category: "service_orders",
      summary:
        "Registra a comunicação eletrônica que comprova o descumprimento contratual e as tentativas de resolução amigável por parte da autora.",
      reference: "fls. 27",
      content:
        "As tentativas referidas e o descumprimento contratual resta evidente e comprovado pelos e-mails trocados entre a autora e as rés. São inúmeros, onde há Av. Paraná, 169-S - Centro - CEP 78.455-000 - Lucas do Rio Verde - MT - Fone/Fax: (65) 3549-1339/3549-1180/3549-1574 E-mail: nalberti@inexa.com.br/cbasso@inexa.com.br/jusianebasso@hotmail.com --- [ Página: 27 ] --- AB Alberti & Basso ESCRITÓRIO DE ADVOCACIA Noeli Alberti - OAB/MT 4.061 Cristiano Alcides Basso - OAB/MT 6.252 Jusiane R. Basso - OAB/MT 10.319 confissão e evidencia de que o INADIMPLEMENTO É LATENTE POR PARTE DAS RÉS. Alguns destes e-mails estes que constam em anexo, doc. 09.",
    },
    {
      id: "ev-008",
      block: 1,
      category: "service_orders",
      summary:
        "Oferece prova irrefutável (degravações) das conversas onde há reconhecimento de prazos e problemas na implantação do projeto.",
      reference: "fls. 28",
      content:
        "A gravação de ambas as conversas consta no DVD em anexo, bem como suas degravações (doc. 10 em anexo).",
    },
    {
      id: "ev-009",
      block: 1,
      category: "internal_hours",
      summary:
        "Revela um desvio significativo das horas de trabalho planejadas, indicando ineficiência ou subdimensionamento inicial do projeto pelas rés, impactando custos e prazos.",
      reference: "fls. 31",
      content:
        '"Osvaldo" - a previsão era 4.000 horas no total, era, era uma coisa assim 4.000 horas. "Jonkel" - por tal foi aqui oh, foram 4.024 horas. "Osvaldo" - Isso exatamente, dai nós fechamos em cima disso. "Jonkel" - 4.024 horas, eu já indenizei a mais. "Osvaldo"- já fez 6.000? "Jonkel" - 6.200 horas (sem compreensão), eu to a 154% do que eu, entedeu? Vendeu quase o dobro e eu vo gasta! "Osvaldo" - Tu vai gasta muito mais ainda. " JONKEL" - Eu sei, eu vo gasta mais aqui pra termina esse projeto, eu to calculando mais umas 2.000 horas',
    },
    {
      id: "ev-010",
      block: 1,
      category: "internal_hours",
      summary:
        "Confirma o elevado número de horas já dedicadas ao projeto, reforçando a alegação de gastos excessivos sem a devida conclusão.",
      reference: "fls. 33",
      content: "LEONARDO: já foram exploradas mais de 8.000 horas do projeto...",
    },
    {
      id: "ev-011",
      block: 1,
      category: "internal_hours",
      summary:
        "Detalha o planejamento futuro de horas e recursos necessários para a conclusão do projeto, servindo como base para avaliar a viabilidade e o tempo restante.",
      reference: "fls. 34",
      content:
        "LEONARDO: a questão é essas 2.208 horas, elas vão representar, trazendo 3 analistas aqui, em tempo integral, consumindo, em média, aí 10 horas de trabalho dia, que vai dar 168/ 170 horas mês, 4.4 meses, claro que isso é uma matemática, dá pra gente ter um noção do trabalho né... porém. não necessariamente que vem estará o Edson mais 2 analistas, são 3 analistas. Porque o Edson tem uma vantagem, ele além de administrar, de gerir o projeto, ele participa e ele implanta. A diferença do Edson com os demais coordenadores é isso. O coordenador ele não tem conhecimento, muitas vezes do negócio, deveria ter tão profundo. O Edson tem, esse é um ponto positivo, aí que é a chave do sucesso de minha visão para o projeto. Então é não necessariamente, eu terei 3 analistas tempo integral do projeto para cumprir os 4 meses de projeto mais um de acompanhamento, ou 3 meses e Av. Paraná, 169-S - Centro - CEP 78.455-000 - Lucas do Rio Verde - MT - Fone/Fax: (65) 3549-1339/3549-1180/3549-1574 E-mail: nalberti@inexa.com.br / cbasso@inexa.com.br / jusianebasso@hotmail.com 25 --- [ Página: 34 ] --- - 19 - fls. 34 26 AB Alberti & Basso ESCRITÓRIO DE ADVOCACIA Noeli Alberti - OAB/MT 4.061 Cristiano Alcides ",
    },
    {
      id: "ev-012",
      block: 1,
      category: "contracts",
      summary:
        "Demonstra a formalização da interpelação da autora às rés, buscando o cumprimento contratual antes da ação judicial, em conformidade com o Contrato de Cessão do Direito de Uso.",
      reference: "fls. 34",
      content:
        "Foi então que, sem suportar mais essa situação de descumprimento das rés, que a autora promoveu a notificação extrajudicial das requeridas para interpelá-las, exigindo o cumprimento do contrato no prazo de 30 dias, conforme notificações, com cópia inclusa (doc. 11).",
    },
    {
      id: "ev-013",
      block: 1,
      category: "losses",
      summary:
        "Estabelece o valor total dos danos materiais alegados pela autora, sendo a base para o pedido de restituição de valores.",
      reference: "fls. 40",
      content:
        "• A Autora inegavelmente sofreu prejuízos concretos em razão do abusivo descumprimento contratual pelas Requeridas, danos que se traduziram em R$ 876.383,30, conforme bem demonstrado no item seguinte.",
    },
    {
      id: "ev-014",
      block: 1,
      category: "payments",
      summary:
        "Sintetiza o montante total reivindicado pela autora referente aos pagamentos efetuados e atualizados, que são objeto da ação de restituição.",
      reference: "fls. 43",
      content:
        "Por conta disso, requer, a título de danos materiais, sejam condenadas as rés a restituírem à autora todos os valores pagos, que atualizados somam R$ 876.383,30, acrescido dos juros e atualização monetária do desembolso até o efetivo pagamento, conforme consta no item seguinte.",
    },
    {
      id: "ev-015",
      block: 1,
      category: "payments",
      summary:
        "Comprova os pagamentos iniciais pela licença e uso do software e serviços relacionados, apresentando valores originais e atualizados, fundamental para o cálculo da restituição.",
      reference: "fls. 43",
      content:
        "5.1 - LICENÇA E USO DE PRODUTOS SOFTWARE (CDU) e SERVIÇO DE ATUALIZAÇÃO E SUPORTE TÉCNICO: Conforme consta nos docs. 02 c/c. doc. 05 - item 5 - valores e condições de pagamento - cessão direito de uso de software (CDU), no valor de R$ 153.135,05, da seguinte forma: R$ 36.448,10 em 06.08.2011; R$ 38.895,65 em 06.09.2011; R$ 38.895,65 em 06.10.2011 e R$ 38.895,65 em 07.11.2011, conforme comprovantes de pagamento em anexo, doc. 06 e 12.1. Valores estes que atualizados até a presente data com juros moratórios e correção monetária pelo INPC, perfazem o montante de R$ 203.990,58 (duzentos e três mil, novecentos e noventa reais, cinqüenta e oito centavos), conforme espelho de atualização em anexo no doc. 06 e 12.1.",
    },
    {
      id: "ev-016",
      block: 1,
      category: "payments",
      summary:
        "Comprova os pagamentos recorrentes por serviços mensais de software, incluindo seus valores originais e atualizados, corroborando a alegação de cobrança por serviços não usufruídos.",
      reference: "fls. 44",
      content:
        "O pagamento total feito foi de R$ 26.797,03 em 05 parcelas, a saber: em 09.04.2012 no valor de R$ 5.058,75; em 20.08.2012 no valor de R$ 5.428,08; em 17.09.2012 no valor de R$ 5.428,08; em 06.11.2012 no valor de R$ 5.441,06; e em 08.04.2013 no valor de R$ 5.441,06, conforme evidenciam os documentos 12.2 em anexo, sob pena de, se não efetuado, ter a autora título levado a protesto. Circunstância que seria, extremamente nefastas as suas atividades, cessão linhas de créditos ou mesmo aquisição de produtos junto aos fornecedores, sem considerar o abalo moral respectivo. Porquanto, a violação do contrato, da norma, enfim, abusividade da cobrança dos encargos mensais a título de atualização e suporte técnico de utilização em sistemas, decorre da cobrança, ou seja, da exigência do direito de receber, sem haver sido adimplida a obrigação de implantar adequadamente, de modo a propiciar a utilização dos referidos sistemas. Assim, atualizando-se monetariamente, e acrescendo os juros legais já mencionados, o montante acima corresponde à quantia de R$ 30.259,29 (trinta mil, duzentos e cinqüenta e nove reais e vinte e nove centavos), conforme espelho de atualização em anexo no doc. 12.2.",
    },
    {
      id: "ev-017",
      block: 1,
      category: "payments",
      summary:
        "Documenta os pagamentos substanciais para a implantação e treinamento, evidenciando o investimento da autora em um projeto que não foi concluído.",
      reference: "Pág. 45",
      content:
        'A título de serviços de implantação com treinamento da equipe de usuários prevista no item "5" do CONTRATO de proposta nº 4454575 (doc. 04 em anexo), a autora pagou o valor de R$ 384.484,64 da seguinte forma: R$ 48.060,58 em 10.08.2011; R$ 48.060,58 em 12.09.2011; R$ 48.060,58 em 10.10.2011; R$ 48.060,58 em 10.11.2011; R$ 48.060,58 em 12.12.2011; R$ 51.210,00 em 10.01.2012; R$ 44.911,16 em 10.02.2012; e R$ 48.060,58 em 12.03.2012, conforme comprovantes em anexo, doc. 12.3. Valor este que atualizado até a presente data perfaz o montante de R$ 498.539,47 (quatrocentos e noventa e oito mil, quinhentos e trinta e nove reais, quarenta e sete centavos), conforme espelho de atualização em anexo no doc. 12.3.',
    },
    {
      id: "ev-018",
      block: 2,
      category: "travel_expenses",
      summary:
        "Demonstra os custos adicionais incorridos pela autora com despesas de viagem dos profissionais das rés, que somam um valor significativo e estão incluídos no pedido de restituição.",
      reference: "Pág. 45-46",
      content:
        'Ainda para a implantação com treinamento da equipe de usuários prevista no item "5" do CONTRATO de proposta nº 4454575 (doc. 04 em anexo), a autora efetuou o pagamento das despesas de viagens dos profissionais contratados pelas rés, conforme previsto no referido contrato cujo valor total foi de R$ 57.328,00 da seguinte forma: R$ 14.332,00 em 20.09.2011; R$ 7.166,00 em 10.10.2011; R$ 7.166,00 em 10.11.2011; R$ 7.166,00 em 12.12.2011; R$ 7.166,00 em 10.01.2012; R$ 7.166,00 em 10.02.2012; e R$ 7.166,00 em 09.03.2012, conforme comprovantes em anexo, doc. 12.4. Valor este que atualizado até a presente data perfaz o montante de R$ 74.135,77 (setenta e quatro mil, cento e trinta e cinco reais, setenta e sete centavos), conforme espelho de atualização em anexo no doc. 12.4.',
    },
    {
      id: "ev-019",
      block: 2,
      category: "payments",
      summary:
        "Evidencia os pagamentos realizados para a modalidade de treinamento a distância, reforçando a extensão dos investimentos da autora no projeto.",
      reference: "fls. 46",
      content:
        "5.3 - PAGAMENTOS EFETUADOS A TÍTULO DE TREINAMENTO E- LEARNING- ITEM 05 DO CONTRATO n° 445542, 445543, 445544, 445545: A título de disponibilização de treinamento e-learning, ou seja, on line, do documento 05 incluso, a autora pagou às rés o valor de R$ 2.459,87 da seguinte forma: R$ 265,68 em 09.04.2012; R$ 265,68 em 06.07.2012; R$ 279,21 em 06.08.2012; R$ 279,21 em 06.09.2012; R$ 266,23 em 08.10.2012; R$ 279,21 em 06.11.2012; R$ 279,21 em 06.12.2012; R$279,21 em 07.01.2013; e R$ 266,23 em 06.02.2013, conforme comprovantes anexados como documento 12.5. Valor este que atualizado até a presente data perfaz o montante de R$ 2.779,35 (dois mil, setecentos e setenta e nove reais, trinta e cinco centavos), conforme espelho de atualização em anexo no documento 12.5.",
    },
    {
      id: "ev-020",
      block: 2,
      category: "payments",
      summary:
        "Comprova o investimento da autora na infraestrutura de banco de dados necessária para o sistema, com valores originais e atualizados.",
      reference: "fls. 4739",
      content:
        "5.4 - PAGAMENTOS EFETUADOS A TÍTULO DE AQUISIÇÃO DE BANCO DE DADOS: ITEM 05 DO CONTRATO n° 445575: A título de aquisição de banco de dados para suporte do sistema a ser implantado, conforme evidencia o documento 04, item 1.1 em apenso, a autora pagou às rés o valor de R$ 19.594,59 da seguinte forma: R$ 7.072,62 em 05.09.2011; R$ 6.261,00 em 03.10.2011; e R$ 6.260,97 em 03.11.2011 conforme comprovantes em anexo, doc. 12.6. Valor este que atualizado até a presente data perfaz o montante de R$ 26.004,57 (vinte e seis mil, quatro reais, cinquenta e sete centavos), conforme espelho de atualização em anexo no doc. 12.6.",
    },
    {
      id: "ev-021",
      block: 2,
      category: "payments",
      summary:
        "Evidencia o gasto da autora com a infraestrutura de hardware (servidores) para o sistema, com os valores originais e atualizados do investimento.",
      reference: "fls. 47-48",
      content:
        "5.5 - DOS PAGAMENTOS EFETUADOS A TÍTULO DE COMPRA DE SERVIDORES PARA USO DE INSTALAÇÃO DO PROGRAMA TOTVS: ITEM 09 DO DOC 02 em anexo: A título de aquisição de banco de dados para suporte do sistema a ser implantado, a autora pagou o valor de R$ 20.727,42 da seguinte forma: R$ 3.454,57 em 22.09.2011; R$ 3.454,57 em 24.10.2011; R$ 3.454,57 em 22.11.2011; R$ 3.454,57 em 22.12.2011; R$ 3.454,57 em 23.01.2012; e R$ 3.454,57 em 22.02.2012, conforme comprovantes em anexo, doc. 12.7 Valor este que atualizado até a presente data perfaz o montante de R$ 26.715,40 (vinte e seis mil, setecentos e quinze reais e quarenta centavos), conforme espelho de atualização em anexo no doc. 12.7.",
    },
    {
      id: "ev-022",
      block: 2,
      category: "payments",
      summary:
        "Comprova o custo das licenças de sistema operacional, uma condição contratual específica, e inclui os valores originais e atualizados.",
      reference: "fls. 48",
      content:
        '5.6 - PAGAMENTO PARA AQUISIÇÃO DE 02 LICENÇAS DO SISTEMA OPERACIONAL DOS SERVIDORES: ITEM 09 DO DOC 02 ANEXADO: Quando da contratação, ficou acordado a condição de que o software da Ré deveria rodar via sistema operacional "linux". Esta foi uma das condições do negócio. Para que tal condição fosse concretizada a Autora necessitou adquirir licenças de suporte profissional da empresa Suse Linux que distribui o software Suse Linux Enterprise, ou seja, uma customização do software "linux" direcionada ao uso em servidores corporativos. A título de aquisição das 02 licenças de suporte do sistema operacional dos servidores, a autora pagou às rés o valor de R$ 3.272,52 da seguinte forma: - R$ 1.665,28 em 16.11.2011; e R$ 1.607,24 em 16.12.2011, conforme comprovantes em anexo, doc. 12.8. Valor este que atualizado até a presente data perfaz o montante de R$ 4.230,25 (quatro mil, duzentos e trinta reais, vinte e cinco centavos), conforme espelho de atualização em anexo no doc. 12.8.',
    },
    {
      id: "ev-023",
      block: 2,
      category: "payments",
      summary:
        "Documenta o pagamento pelos serviços de instalação e configuração essenciais para o funcionamento do sistema, com os valores originais e atualizados.",
      reference: "Pág. 49",
      content:
        "5.7 - VALOR DESTINADO A AQUISIÇÃO DE SERVIÇO PAGO PARA INSTALAÇÃO E CONFIGURAÇÃO DOS SERVIDORES: ITEM 09 DO DOC. 02 ANEXADO: A título de instalação e configuração de 02 licenças do sistema operacional dos servidores e do sistema de banco de dados, a autora pagou o valor de R$ 7.680,00 em 16.01.2012, conforme comprovante em anexo, doc. 12.9. Valor este que atualizado até a presente data perfaz o montante de R$ 9.728,62 (nove mil, setecentos e vinte e oito reais, sessenta e dois centavos), conforme espelho de atualização em anexo no doc. 12.8.",
    },
    {
      id: "ev-024",
      block: 2,
      category: "payments",
      summary:
        "Sintetiza o valor total dos pagamentos realizados pela autora e o montante atualizado, representando o valor integral da restituição pleiteada.",
      reference: "Pág. 49",
      content:
        "5.8 - TOTAL PAGO PELA AUTORA E SUA ATUALIZAÇÃO: O total pago pela autora e consignado nos itens anteriores foi de R$ 675.479,12 (seiscentos e setenta e cinco mil, quatrocentos e setenta e nove reais e doze centavos. Valor este que atualizado perfaz o montante de R$ 876.383,30 (oitocentos e setenta e seis mil, trezentos e oitenta e três reais e trinta centavos).",
    },
    {
      id: "ev-025",
      block: 2,
      category: "payments",
      summary:
        "O trecho aponta o 'documento 07' (boleto de cobrança, conforme contexto) como prova de cobrança indevida, relevante para a alegação de inadimplemento contratual por parte das rés e o pedido de tutela antecipada contra a negativação.",
      reference: "fls. 51",
      content:
        "o documento 07 incluso, comprova a atitude das Requeridas em exigir pagamento indevido, registrando inclusive, a hipótese de se o mesmo não se efetivar no vencimento, o nome da Autora, por iniciativa das requeridas, ser incluído (negativado) no serviço de proteção ao crédito!",
    },
    {
      id: "ev-026",
      block: 2,
      category: "payments",
      summary:
        "Os e-mails servem como evidência contextual da cobrança indevida por serviços (SMS) não prestados devido à falha na implantação do sistema, reforçando o argumento da Autora sobre o inadimplemento contratual das rés.",
      reference: "fls. 51",
      content:
        "Inclusive os e-mails carre ados como documento 09 apenso a esta inicial, comprovam, que as Requeridas, já atuaram em tal sentido, mesmo diante do reconhecimento de que o sistema não estaria implantado, logo, o valor a título de SMS não poderia ser exigido.",
    },
    {
      id: "ev-027",
      block: 2,
      category: "payments",
      summary:
        "Este trecho reafirma a existência de boletos de cobrança de R$ 5.332,23 ('doc. 07') referentes a pagamentos mensais por serviços (SMS) que a Autora alega não terem sido cumpridos pelas rés, sendo uma evidência direta da disputa sobre pagamentos.",
      reference: "fls. 55",
      content:
        "As rés insistem na cobrança mensal de R$ 5.332,23, conforme boletos acostados no doc. 07 em anexo, embora NÃO tenham cumprido sua parte.",
    },
    {
      id: "ev-028",
      block: 2,
      category: "losses",
      summary:
        "A afirmação de que a Autora está há mais de um ano sem um sistema operacional devido à falha das rés configura uma perda indireta de produtividade e capacidade de gestão, sendo relevante para a quantificação dos danos materiais.",
      reference: "fls. 58",
      content:
        "E, a necessidade da autora de melhor gerir e conduzir seu negócio, já submetido aos efeitos nefastos da falta grave, do dolo das Rés, estando há mais de 01 ano, de sua estimativa sem operar sistema que atenda suas atuais necessidades empresariais.",
    },
    {
      id: "ev-029",
      block: 2,
      category: "service_orders",
      summary:
        "O 'documento de nº 08' (Status atual do projeto) é uma evidência crucial sobre o andamento e a conclusão (ou falta dela) das etapas de implantação do sistema, essencial para determinar o inadimplemento contratual.",
      reference: "fls. 61",
      content:
        "O Sr. perito ratifica o documento de nº 08 juntado com a petição inicial pela autora no que se refere à implantação e não implantação lá relacionadas?",
    },
    {
      id: "ev-030",
      block: 2,
      category: "payments",
      summary:
        "Este valor representa a soma total dos pagamentos efetuados pela Autora às rés, conforme detalhado nos 'DOCUMENTOS-CHAVE', sendo a base para o pedido de danos materiais e a principal evidência financeira do caso.",
      reference: "fls. 65",
      content:
        "condenação solidária das requeridas a restituírem os valores desembolsados pela Autora, devidamente acrescido de juros e corrigidos monetariamente desde a propositura desta ação, que somados e atualizados até esta data, importam em R$ 876.383,30.",
    },
    {
      id: "ev-031",
      block: 2,
      category: "contracts",
      summary:
        "Este documento é o Contrato Social consolidado da Autora, fundamental para identificar as partes, o objeto social e a estrutura da empresa no processo.",
      reference: "fls. 69",
      content: "TRIGÉSIMA SEXTA ALTERAÇÃO CONTRATUAL E CONSOLIDAÇÃO DO CONTRATO SOCIAL",
    },
    {
      id: "ev-032",
      block: 2,
      category: "contracts",
      summary:
        "Detalhe da alteração contratual que corrige informações cadastrais de uma filial, demonstrando a estrutura empresarial da Autora.",
      reference: "fls. 71",
      content:
        "CLÁUSULA PRIMEIRA: Por ter sido grafado incorretamente, o endereço da Filial 22, CNPJ: 32.951.535/0023-40, Nire 51.900.264.430, o qual, após a devida correção, passa a ser: Rua Elisa Bortoloso Luciano, n° 2306, bairro Jardim Novo Estado, na cidade de Sinop, Estado de Mato Grosso, CEP 78553-679.",
    },
    {
      id: "ev-033",
      block: 2,
      category: "contracts",
      summary:
        "Esta cláusula detalha a criação de uma nova filial e a alocação de capital, fornecendo informações sobre a estrutura e recursos da Autora, parte do contrato social consolidado.",
      reference: "fls. 71",
      content:
        'CLÁUSULA SEGUNDA: Rerratificam os sócios, a Cláusula Quinta, da TRIGÉSIMA QUINTA ALTERAÇÃO CONTRATUAL da sociedade, arquivada na JUCEMAT sob o n° 20120915626, de 15/08/2012, que devidamente corrigida e alterada, passa a vigorar com a seguinte redação: " CLÁUSULA QUINTA - Fica criada a Filial n° 39, da Sociedade, estabelecida na Avenida Gaspar Dutra n° 917, Centro, na cidade de Cláudia, Estado de Mato Grosso, CEP 78.540-000, que explorará a mesma atividade econômica da Matriz, exceto quanto à atuação como Central de Compras e Distribuição, para a qual, fica destacado, do capital da Matriz, a cifra de R$ 10.000,00 (dez mil reais), para fins e efeitos fiscais."',
    },
    {
      id: "ev-034",
      block: 2,
      category: "contracts",
      summary:
        "Esta cláusula detalha a criação de mais uma filial e a alocação de capital, fornecendo informações sobre a estrutura e recursos da Autora, parte do contrato social consolidado.",
      reference: "fls. 71",
      content:
        'CLÁUSULA TERCEIRA: Rerratificam os sócios, a Cláusula Sexta, da TRIGÉSIMA QUINTA ALTERAÇÃO CONTRATUAL da sociedade, arquivada na JUCEMAT sob o n° 20120915626, de 15/08/2012, que devidamente corrigida e alterada, passa a vigorar com a seguinte redação: " CLÁUSULA SEXTA - Fica criada a Filial n° 40, da Sociedade, estabelecida na Avenida Brasil n° 369, Centro, na cidade de Campo Verde, Estado de Mato Grosso, CEP. 78840-000, que explorará a mesma atividade econômica da Matriz, exceto quanto à atuação como Central de Compras e Distribuição, para a qual, fica destacado, do capital da Matriz, a cifra de R$ 10.000,00 (dez mil reais), para fins e efeitos fiscais."',
    },
    {
      id: "ev-035",
      block: 3,
      category: "contracts",
      summary:
        "Detalhes de registro das filiais com seus respectivos NIREs e CNPJs, corroborando a existência e estrutura da Autora, conforme estabelecido no contrato social.",
      reference: "fls. 71",
      content:
        "CLÁUSULA QUARTA: Submetidas a registro, as Filiais supramencionadas, foram devidamente aprovadas pela Junta Comercial do Estado de Mato Grosso e pela Receita Federal do Brasil, da seguinte forma: Filial n° 39 - Avenida Gaspar Dutra n° 917, Centro, na cidade de Cláudia, Estado de Mato Grosso, CEP 78540-000, NIRE: 51 9 00 361958, inscrita no CNPJ. Sob o n° 32.951.535/0040-40; Filial n° 40 - Avenida Brasil n° 369, Centro, na cidade de Campo Verde, Estado de Mato Grosso, CEP. 78840-000, NIRE: 51 9 00 361940, inscrita no CNPJ. Sob o n° 32.951.535/0041-21.",
    },
    {
      id: "ev-036",
      block: 3,
      category: "contracts",
      summary:
        "Este é o Contrato Social consolidado da Autora, documento primário que define a constituição, os sócios, objeto social e dados de registro da empresa, essencial para o reconhecimento formal da parte autora no processo.",
      reference: "fls. 72",
      content:
        "ELETROMAR MÓVEIS E ELETRODOMÉSTICOS LTDA CNPJ: 32.951.535/0001-34 NIRE: 51.200.301.545 CONSOLIDAÇÃO DO CONTRATO SOCIAL OSVALDO MARTINELLO, brasileiro, casado sob Regime de Comunhão Parcial de Bens, empresário, residente e domiciliado, na Rua Chapecó, nº 368-E, Centro, na cidade de Lucas do Rio Verde/MT, CEP 78455-000, filho de Valdemiro Martinello e de Eraides Gobatto Martinello, natural de Vitorino/PR, nascido em 06/08/1957, portador da Cédula de Identidade, RG nº 12/R-563.570 SSP/SC, inscrito no CPF sob nº 003.693.218-39;CLODOALDO MARTINELLO, brasileiro, casado pelo Regime de Comunhão Parcial de Bens, empresário, residente e domiciliado na Rua Paranapanema, 1.616-S, Bairro Alvorada, na cidade de Lucas do Rio Verde/MT, CEP 78455-000 natural de São Lourenço d' Oeste/SC, nascido em 17.06.1971, filho de Valdemiro Martinello e Eraydes Gobatto Martinello, portador da Cédula de Identidade RG nº 17/R-",
    },
    {
      id: "ev-037",
      block: 3,
      category: "contracts",
      summary:
        "A listagem das filiais com seus identificadores (CNPJ, NIRE) faz parte do Contrato Social consolidado, fornecendo um panorama da extensão operacional da Autora.",
      reference: "fls. 75",
      content:
        "CLÁUSULA QUINTA: A Sociedade possui as seguintes filiais: Filial 01 - CNPJ: 32.951.535/0002-15, NIRE nº 51.900.120.128 - Av. Goiás, 80- S - Bairro Menino Deus – na cidade de Lucas do Rio Verde/MT, CEP:78455-000; Filial 02 - CNPJ: 32.951.535/0003-04, NIRE nº 51.900.120.136 - Av. Mato Grosso nº 467, Centro, na Cidade de São José do Rio Claro, Estado de Mato Grosso, CEP: 78435-000;",
    },
    {
      id: "ev-038",
      block: 3,
      category: "contracts",
      summary:
        "Este trecho detalha a estrutura corporativa da Eletromar, listando suas filiais e o capital social de R$ 22.025.000,00, além da participação acionária dos sócios. É uma evidência da estrutura legal e financeira da autora, fundamental para entender a entidade contratante.",
      reference: "Pág. 76, Pág. 77",
      content:
        "CNPJ: 32.951.535/0019-63, NIRE n° 51.900.264.391 - Av. Natalino João Brescansin, 975, Centro, na Cidade de Sorriso, Estado de Mato Grosso, CEP. 78890-000; ... CLÁUSULA SEXTA - O capital social é de R$ 22.025.000,00 (vinte e dois milhões e vinte e cinco mil reais), representado por 22.025.000 (vinte e dois milhões e vinte e cinco mil) quotas de R$ 1,00 (um real) cada uma, totalmente subscritas e integralizadas, na prevista, com bens, reservas de lucros e moeda corrente nacional, que ficam distribuídas conforme demonstrativo abaixo:",
    },
    {
      id: "ev-039",
      block: 3,
      category: "contracts",
      summary:
        "Estabelece as regras para a gestão e transferência de participação societária da Eletromar, e a formalização do documento com assinaturas e autenticação cartorária, validando o contrato social da empresa.",
      reference: "Pág. 78, Pág. 79, Pág. 80, Pág. 81",
      content:
        "CLÁUSULA SÉTIMA - As quotas da sociedade são indivisíveis e não poderão ser cedidas ou transferidas a terceiros sem o consentimento expresso dos demais sócios, aos quais fica assegurado em igualdade de condições, prazo e preço, o direito de preferência para aquisição. ... Lucas do Rio Verde (MT), 12 de setembro de 2012. L.R.VERDE OSVALDO MARTINELLO P/P CLODOALDO MARTINELLO L.R.VERDE ... RECONHECIMENTO DE FIRMA Reconheço por Autenticidade a(s) firma(s) de: OSVALDO MARTINELLO Termo: 220450 Selp. Digital. ADU 50888Cod.: 22 Lucas do Rio Verde-MT, 13 de setembro de 2012.",
    },
    {
      id: "ev-040",
      block: 3,
      category: "contracts",
      summary:
        "Este trecho apresenta o contrato principal que fundamenta a ação, sendo uma evidência direta do acordo entre as partes sobre o licenciamento de software e serviços. Sua existência é central para o caso.",
      reference: "Pág. 84",
      content:
        "DOCUMENTO 02: Contrato de Cessão de Direito de Uso de Software e prestação de serviços registrado no 10° Oficial de Registro de Títulos e Documentos de São Paulo-SP, sob o nº 1.901.975",
    },
    {
      id: "ev-041",
      block: 3,
      category: "contracts",
      summary:
        "Este é o núcleo do contrato principal, definindo os termos e o escopo dos serviços de licenciamento de software e prestação de serviços da TOTVS para a Contratante, essencial para avaliar o cumprimento das obrigações.",
      reference: "Pág. 85",
      content:
        "CONTRATO DE CESSÃO DE DIREITO DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS 1. DEFINIÇÕES ATUALIZAÇÕES: alterações e melhorias introduzidas no Software, as quais antecedem o lançamento de uma nova Versão. CDU: licença (i) pela licença não-exclusiva, não- transferível, limitada ou ilimitada, conforme definido na Proposta; ... 2. OBJETO 2.1. Este Contrato tem por objeto a CDU e a prestação de Serviços pela TOTVS à Contratante, conforme previsto na Proposta(s).",
    },
    {
      id: "ev-042",
      block: 3,
      category: "penalties",
      summary:
        "Define as penalidades financeiras por atraso nos pagamentos, relevante para o cálculo de valores devidos em caso de inadimplência.",
      reference: "Pág. 85",
      content:
        "Em hipótese de qualquer pagamento em atraso, ao valor devido será acrescido a multa de 2% (dois por cento), além dos juros de mora por dia de atraso.",
    },
    {
      id: "ev-043",
      block: 3,
      category: "travel_expenses",
      summary:
        "Especifica a responsabilidade da Contratante pelas despesas de viagem dos profissionais da TOTVS, que podem ser pagas diretamente ou reembolsadas. Fundamental para justificar os valores reclamados pela autora como 'despesas de viagens'.",
      reference: "Pág. 86",
      content:
        "Quando houver despesas de viagem, tais como passagens aéreas, táxi, combustível, pedágio, hospedagem e alimentação dos profissionais que executarão os Serviços serão custeadas diretamente pela Contratante ou reembolsadas, mediante apresentação de comprovantes, quando os serviços forem realizados em localidade distinta daquela em que se situa a TOTVS ou a Unidade pertencente à Rede de Distribuição TOTVS que foi contratada para a prestação dos serviços.",
    },
    {
      id: "ev-044",
      block: 3,
      category: "contracts",
      summary:
        "Descreve a modalidade de licenciamento do software, estabelecendo as condições de uso e a validade da licença. Essencial para entender os direitos e obrigações da Contratante em relação ao software.",
      reference: "Pág. 86",
      content:
        "4. LICENÇA DE SOFTWARE 4.1. Mediante o pagamento do Preço, será concedida à Contratante a CDU, apenas em formato de Código Compilado, de acordo com este Contrato e a Proposta, A CDU será válida por prazo indeterminado, salvo disposição em contrário na Proposta.",
    },
    {
      id: "ev-045",
      block: 3,
      category: "service_orders",
      summary:
        "Especifica que serviços adicionais como implantação e treinamento são complementares e dependem de propostas aceitas. Isso é relevante para identificar a base de futuras Ordens de Serviço (OSs) e apontamentos de produtividade.",
      reference: "Pág. 87",
      content:
        "7. SERVIÇOS COMPLEMENTARES DE SOFTWARE (SCS) 7.1. Quaisquer serviços que não estejam previstos acima, inclusive, mas não se limitando, Serviços de Implantação, Suporte Local, Fábrica de Software e Treinamento, poderão ser contratados pela Contratante mediante solicitação à TOTVS e aceite da Proposta.",
    },
    {
      id: "ev-046",
      block: 3,
      category: "internal_hours",
      summary:
        "Indica que serviços adicionais ou fora do escopo inicial serão faturados por hora, estabelecendo uma base de cálculo para a remuneração de horas de trabalho de colaboradores da TOTVS. Isso é relevante para cálculos de custos e produtividade.",
      reference: "Pág. 87",
      content:
        "Caso os SCS sejam executados sem o aceite da Proposta respectiva, ou ainda, caso sejam executados SCS fora do escopo da Proposta respectiva, mas sempre mediante solicitação da Contratante, estes serão cobrados à parte, em base horária, de acordo com os termos e condições deste Contrato e com a tabela de preços vigente.",
    },
    {
      id: "ev-047",
      block: 3,
      category: "losses",
      summary:
        "Estabelece as limitações de responsabilidade da TOTVS em relação a perdas e danos, o que é crucial para avaliar a extensão dos danos materiais reivindicados pela autora.",
      reference: "Pág. 88",
      content:
        "10. LIMITACÃO DE RESPONSABILIDADE 10.1. Nenhuma das partes será responsável por lucros cessantes e quaisquer perdas e danos indiretos havidos pela outra. 10.2. A TONS não responderá por perdas e danos decorrentes da perda de dados ou informações da Contratante.",
    },
    {
      id: "ev-048",
      block: 3,
      category: "penalties",
      summary:
        "Define as condições e o valor da multa por rescisão antecipada ou sem cumprimento do aviso prévio, fundamental para determinar possíveis indenizações em caso de quebra contratual.",
      reference: "Pág. 89",
      content:
        "13. pkA20 EXRMINO 13.1. Este Contrato vigerá por prazo Indeterminado, mas qualquer das partes poderá resili-lo, a qualquer tempo, mediante notificação estrita com antecedência de 180 dias. Caso a denunciante não respeite esse prazo, pagará multa correspondente ao somatório dos seguintes itenv (i) 6 vezes g Preço de SMS vigente; (o) 6 vezes o Preço de RA. vigente; e (11i) metade do Preço de SCS com relação aos SCS contratados e ainda não executados na data da denúncia.",
    },
    {
      id: "ev-049",
      block: 3,
      category: "penalties",
      summary:
        "Prevê uma multa específica pela rescisão decorrente de infração às condições de licenciamento do software, importante para calcular penalidades em caso de uso indevido do software.",
      reference: "Pág. 89",
      content:
        "13 3. Caso a rescisão deste Contrato decorra de infração ao disposto na Cláusula 4, a Contratante pagará multa igual ao Preço de CDU avençado.",
    },
    {
      id: "ev-050",
      block: 3,
      category: "penalties",
      summary:
        "Define uma multa a ser paga pela parte que contratar funcionários ou prestadores de serviço da outra parte durante ou até 12 meses após o término do contrato, no valor total pago a esse profissional nos 6 meses anteriores à rescisão.",
      reference: "Pág. 88",
      content:
        "Aquele que desrespeitar esta cláusula pagará multa equivalente ao valor total pago ao funcionario ou ao prestador de serviço em questão nos 6 (seis) meses anteriores b rescisão do contrato de trabalho ou de prestação de serviços.",
    },
    {
      id: "ev-051",
      block: 3,
      category: "contracts",
      summary:
        "Identificação do Contrato de Cessão de Direito de Uso de Software e Prestação de Serviços.",
      reference: "Pág. 89",
      content: "CONTRATO DE CESSÃO DE DIREITO DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS",
    },
    {
      id: "ev-052",
      block: 4,
      category: "contracts",
      summary:
        "Confirma o registro do contrato em 01 de outubro de 2009 no 10º Cartório de Registro de Títulos e Documentos de São Paulo, com identificação dos signatários da TOTVS.",
      reference: "Pág. 89",
      content:
        "Este Contrato encontra-se registrado no 10º Cartório de Registro de Títulos e Documentos da Capital de São Paulo. São Paulo, 01 de outubro de 2009 TOTVS S.A. Laércio José de Lucena Cosentino TOTVS S.A. Marcelo Rehder Monteiro 100.K.1.U. MICHOFILME No.1.901.475 fls. 89",
    },
    {
      id: "ev-053",
      block: 4,
      category: "contracts",
      summary:
        "Detalhes do registro do Contrato de Cessão de Direito de Uso de Software e Prestação de Serviços sob nº 1.901.975, datado de 02 de outubro de 2009, para conservação e autenticação.",
      reference: "Pág. 90",
      content:
        "fls. 82 * OFICIAL DE REGISTRO DE TITULOS DOCUMENTOS DA CAPITAL - SAO PAULO RUA XV DE NOVEMBRO, N. 244 - 60. ANDAR TELEFONES: 3104-8434 E 3105-6483 (FAX) APRESENTADO HOJE, PROTOCOLADO E REGIS- TRADO EM MICROFILME SOB No. 1.901.975 COM A FINALIDADE DE CONSERVACAO, AUTEN- TICACAO DE DADOS, CONTEUDO E FORMA, DE ACORDO COM A FACULDADE PREVISTA NO AR- TIGO 127, VII DA LEI N.6.015/73 E ITEM 02 CAPITULO XIX DAS NORMAS DE SERVICO DA CORREGEDORIA GERAL DA JUSTICA, PRO- VIMENTO 58/89, QUE DETERMINA SEJA FEITA MENCAD EXPRESSA DESSA CIRCUNSTANCIА. SAO PAULO, 02 DE OUTUBRO DE 2009.",
    },
    {
      id: "ev-054",
      block: 4,
      category: "payments",
      summary:
        "Detalhe dos custos de R$ 70,32 para o registro do contrato, incluindo emolumentos e taxas para diversas entidades.",
      reference: "Pág. 90",
      content:
        "Emolumentos...: R$**********43.95 Estado........: R$**********12.52 Cart.Prev.....: R$**********9.23 Registro Civil: R$**********2.31 Trib. Justica.: R$**********2.31 Total.........: R$**********70.32",
    },
    {
      id: "ev-055",
      block: 4,
      category: "contracts",
      summary:
        "Referência ao Contrato de Atendimento Personalizado, parte dos documentos chave do processo.",
      reference: "Pág. 91",
      content: "DOCUMENTO 03: contrato de Atendimento Personalizado",
    },
    {
      id: "ev-056",
      block: 4,
      category: "contracts",
      summary:
        "Referência à Proposta Comercial nº 445575, detalhando serviços complementares de software (SCS).",
      reference: "Pág. 92",
      content: "DOCUMENTO 04: Proposta Comercial nº 445575",
    },
    {
      id: "ev-057",
      block: 4,
      category: "contracts",
      summary:
        "Dados cadastrais da empresa JK Assessoria Empresarial Ltda, uma das rés do processo, como contratada nos serviços de atendimento personalizado.",
      reference: "Pág. 93",
      content:
        "CONTRATADA: JK ASSESSORIA EMPRESARIAL LTDA, pessoa jurídica de direito privado, com sede Rua Joaquim Murinho, 588, Bairro Centro Sul, Cuiabá-MT, CEP 78020-290, inscrita no CNPJ/MF sob o nº 08.399.581/0001-98 e Inscrição Estadual [ILEGÍVEL].",
    },
    {
      id: "ev-058",
      block: 4,
      category: "service_orders",
      summary:
        "Descreve a Ordem de Serviço como um documento essencial para o acompanhamento, faturamento e comprovação de serviços prestados, registrando horário, horas, descrição e translado.",
      reference: "Pág. 93",
      content:
        "Ordem de serviço: É o documento, em que duas vias, ou eletrônico em uma via, que tem por finalidade o acompanhamento dos serviços da CONTRATADA servindo de base para o faturamento da comprovação do serviço prestados. Contém o horário, número de horas, a descrição do serviço e o translado para atendimento;",
    },
    {
      id: "ev-059",
      block: 4,
      category: "penalties",
      summary:
        "Estabelece uma multa de 20% sobre a média mensal dos serviços dos últimos 3 meses para a parte que descumprir qualquer cláusula do contrato.",
      reference: "Pág. 93",
      content:
        "Cláusula 6ª - as partes resolvem de comum acordo fixar a multa de 20% (vinte por cento), calculada sobre a média mensal do valor dos serviços prestados nos últimos 03 (três) meses, à parte que infringir qualquer das cláusulas do presente Contrato.",
    },
    {
      id: "ev-060",
      block: 4,
      category: "penalties",
      summary:
        "Define uma multa de 2% e juros de mora diários para pagamentos atrasados, detalhando as consequências e ações da Contratada em caso de atraso.",
      reference: "Pág. 93",
      content:
        "Na hipótese de qualquer pagamento em atraso, ao valor devido será acrescida a multa de 2% (dois por cento), em conformidade com legislação vigente, além dos juros de mora por dia de atraso. Após 04 (quatro) dias de atraso, a CONTRATADA tomará as medidas cabíveis para o recebimento do montante devido, responsabilizando a CONTRATANTE pelo pagamento da multa, juros de mora, despesas da cobrança inclusive de protesto, e honorários advocatícios. Após 15 (quinze) dias corridos de atraso, a CONTRATADA poderá interromper os serviços.",
    },
    {
      id: "ev-061",
      block: 4,
      category: "penalties",
      summary:
        "Impõe multa equivalente a 6 remunerações ou pagamentos mensais caso a Contratante contrate funcionários ou credenciados da TOTVS sem autorização prévia por escrito.",
      reference: "Pág. 93",
      content:
        "i) A CONTRATANTE se compromete a não contratar funcionários ou credenciados da TOTVS, exceto com prévia liberação por escrito, caso contrário estará sujeita a aplicação de uma multa equivalente a 06 (seis) remunerações ou pagamentos mensais efetuados pelos TOTVS ao funcionário ou ao credenciado, enquanto credenciados.",
    },
    {
      id: "ev-062",
      block: 4,
      category: "contracts",
      summary:
        "Confirma a data de formalização do Contrato de Atendimento Personalizado (12 de abril de 2010) e a identidade do representante da JK Assessoria Empresarial Ltda.",
      reference: "Pág. 93",
      content:
        "Cuiabá, 12 de abril de 2010. JK ASSESSORIA EMPRESARIAL LTDA JOAQUIM JONKEL MADALHÃES MELO CPF: 535.674.801-97 RG: 544.608 SSP/MS",
    },
    {
      id: "ev-063",
      block: 4,
      category: "contracts",
      summary:
        "Apresenta a Proposta Comercial SCS para a Eletromar Móveis e Eletrodomésticos Ltda, emitida em 10/05/11, com informações sobre o cliente e a equipe responsável da TOTVS.",
      reference: "Pág. 94",
      content:
        "TOTVS: Proposta Comercial Serviços Complementares de Software (SCS) Proposta Nº: 445575 Cliente: 014469 - ELETROMAR MOVEIS E ELETRODOMESTICOS LTDA Gerente Responsável: T00497 - ROBSON FERREIRA DA COSTA Executivo de AR: T03734 - JOAO PAULO GOMES Arquiteto de Solução: T03940 - LEONARDO PARDO DE CASTRO Data emissão: 10/05/11 Oportunidade de Venda: 220056 Modalidade: Tradicional",
    },
    {
      id: "ev-064",
      block: 4,
      category: "contracts",
      summary:
        "Fornece informações cadastrais, de contato e endereços de ambas as partes envolvidas na Proposta Comercial, estabelecendo suas identidades e dados fiscais para o contrato.",
      reference: "Pág. 96",
      content:
        '1 - Qualificação Contratante ("Cliente"): Razão Social: ELETROMAR MOVEIS E ELETRODOMESTICOS LTDA Nome Fantasia: ELETROMOVEIS MARTINELLO Logradouro: ROD MT 449 Bairro: ZONA INDUSTRIAL 02 Cidade: LUCAS DO RIO VERDE Estado: MT CEP: 78455000 País: BRASIL CNPJ/MF: 32951535000134 Inscrição Estadual: 13069911-0 Inscrição Municipal: ISENTO Código CNAE: 4753-9/00 Telefone: 65 - 5491331 Fax: 65 - 5491331 Contato: OSVALDO MARTINELLO Cargo do Contato: DIRETOR E-mail do Contato: osvaldo@martinello.com.br Endereço de Cobrança: Logradouro: ROD MT 449 Bairro: ZONA INDUSTRIAL 02 Cidade: LUCAS DO RIO VERDE Estado: MT CEP: 78455000 Telefone: 65 - 5491331 Fax: 65 - 5491331 Contato: OSVALDO MARTINELLO Cargo do Contato: DIRETOR E-mail do Contato: osvaldo@martinello.com.br País: Brasil Contratada ("TOTVS"): Razão Social: JK GESTAO EMPRESARIAL LTDA Logradouro: RUA JOAQUIM MURTINHO, 588 Cidade: CUIABA Estado: MT CEP: 78020290 País: BRASIL CNPJ/MF: 36970937000137 Inscrição Estadual: TOTVS: Proposta Comercial',
    },
    {
      id: "ev-065",
      block: 4,
      category: "internal_hours",
      summary:
        "Estima 5 meses para implantação e 2 meses de acompanhamento, especificando a quantidade de consultores e a duração de suas alocações para diferentes fases do projeto.",
      reference: "Pág. 98",
      content:
        "Equipe Técnica: Para a implantação do projeto, serão necessários 05 (cinco) meses. Após a implantação haverá o período de acompanhamento de 02 (dois) meses. Neste período de acompanhamento feito no local da empresa, 03 (três) consultores no mínimo, ou quantos forem necessários, acompanharão nas 02 (duas) primeiras semanas, e 02 (dois) consultores farão acompanhamento nas 06 (seis) semanas seguintes. A TOTVS disponibilizará na empresa, 01 (um) consultor para apoio no fechamento contábil por 04 (quatro) semanas.",
    },
    {
      id: "ev-066",
      block: 4,
      category: "internal_hours",
      summary:
        "Detalha que o atendimento personalizado para suporte é tarifado por hora trabalhada, com alocação de profissionais conforme demanda do cliente, servindo como base para cálculo de custos e remuneração de colaboradores.",
      reference: "Pág. 99",
      content:
        "Suporte Local (Atendimento Personalizado): São os serviços de suporte realizados nas instalações do cliente para atendimento sob demanda de forma adicional para complemento de implantação, desenvolvimento ou treinamento específico ou resolução de dúvidas a qualquer instante pela TOTVS ou sua rede de franqueados sempre que solicitados. Este serviço é tarifado com base no valor hora previamente acordado entre as partes. Consiste em um atendimento personalizado e será efetuado conforme solicitação do cliente, pela alocação de profissionais com base em horas trabalhadas.",
    },
    {
      id: "ev-067",
      block: 4,
      category: "contracts",
      summary:
        "Especifica os diversos processos e módulos do sistema TOTVS que fazem parte do escopo do projeto, incluindo Nota Fiscal Eletrônica, processos contábeis, de compras, RH, estoque, faturamento, entre outros.",
      reference: "Pág. 100",
      content:
        "Proposta de serviços NFE - NOTA FISCAL ELETRONICA - SEFAZ PROCESSO CONTABIL PROCESSO DE COMPRAS PROCESSO DE CONTROLE DE GESTAO DE PESSOAL PROCESSO DE CONTROLE DE PONTO ELETRONICO PROCESSO DE ESTOQUE PROCESSO DE FATURAMENTO PROCESSO DE FIELD SERVICE PROCESSO DE FATURAMENTO/OMS PROCESSO DE PATRIMONIO PROCESSO FINANCEIRO PROCESSO TRIBUTARIO SPED FISCAL SPED CONTABIL SPED PIS/COFINS PERSONALIZAÇÕES O Escopo Detalhado está descrito no tópico Anexo, desta Proposta Comercial.",
    },
    {
      id: "ev-068",
      block: 4,
      category: "payments",
      summary:
        "Detalhamento financeiro do projeto, com custo total de R$ 409.680,00 para implantação e treinamento, dividido em 8 parcelas mensais, e a discriminação das horas e taxas para suporte e coordenação.",
      reference: "Pág. 101",
      content:
        "5 - Preços e Condições de Pagamento Serviços de Implantação COM TREINAMENTO DA EQUIPE DE USUÁRIOS (42): Profissionais Horas Estimadas Taxa Horária (R$) Subtotal (R$) 2010067-2 HORA SUPORTE 3.358,70 100 335.870 2010095-6 HORA COORD.DE IMPLANTACAO 671,00 110 73.810 Condições de Pagamento: Preço Total Implantação e treinamento R$ 409.680,00 Valor da Parcela Vencimento R$ 51.210,00 20/07/11 R$ 51.210,00 20/08/11 R$ 51.210,00 20/09/11 R$ 51.210,00 20/10/11 R$ 51.210,00 20/11/11 R$ 51.210,00 20/12/11 R$ 51.210,00 20/01/12 R$ 51.210,00 20/02/12",
    },
  ],
  queries: [
    {
      id: "q-001",
      block: 1,
      question:
        "O sistema SMS foi utilizado pela Autora? Se o sistema SMS teria como ser utilizado pela Autora, atendendo os fins para que foi contratado antes de concluída a implantação do projeto? (fls. 60)",
      answer:
        "O sistema SMS não foi utilizado pela Autora. Embora o contrato previsse a cobrança dos serviços SMS independentemente da conclusão da implantação (SCS), a ausência de conclusão da fase de implantação do projeto impediu a utilização efetiva do sistema, e, consequentemente, dos serviços de suporte e atualização para os fins contratados.",
      status: "non_compliant",
      rationale:
        "Conforme evidenciado em fls. 25, 'o sistema seguinte de prestação de serviços mensais (SMS) não vem sendo utilizado'. A Autora alega que 'a não prestação do serviço, o que impede o exercício do direito de uso, ocasionado pelo descumprimento contratual atinente à falta da adequada instalação, implementação/customização do projeto (sistema) pelas rés' (fls. 25). O documento 08 (fls. 26) reforça que 'os sistemas adquiridos estão incompletos, sequer a fase de implantação foi concluída!'. Embora a Cláusula 6.2 do Contrato de Cessão de Direito de Uso de Software e Prestação de Serviços (fls. 87) estabeleça que 'tanto os SMS, como o SLA serão devidos e cobrados independentemente do andamento ou da conclusão dos SCS', a não conclusão da implantação do software inviabiliza o atendimento dos fins para os quais o SMS foi contratado, que é o suporte a um sistema funcional.",
      notes:
        "A interpretação da cláusula contratual sobre a independência da cobrança do SMS em relação à conclusão do SCS é um ponto central da disputa. Tecnicamente, se o sistema base não está operacional, o suporte (SMS) perde sua finalidade prática para o usuário.",
    },
    {
      id: "q-002",
      block: 1,
      question:
        "Diga se a ré JK GESTÃO EMPRESARIAL LTDA (TOTVS CUIABÁ-MT) utilizou-se do referido serviço enquanto realizava os trabalhos de implantação? (fls. 60)",
      answer:
        "Não há evidências diretas nos documentos analisados que comprovem que a ré JK GESTÃO EMPRESARIAL LTDA utilizou-se especificamente do serviço SMS contratado pela Autora enquanto realizava os trabalhos de implantação nas dependências da Autora. Há indicação de que a JK utilizava sistemas TOTVS para suas próprias operações.",
      status: "inconclusive",
      rationale:
        "A degravação de fls. 28 registra a fala de Jonkel (representante da JK): 'meu sistema financeiro eu uso o sistema da Totvs, tudo que eu faço, os impostos...'. Esta declaração indica que a JK utilizava sistemas TOTVS para suas próprias atividades internas. Contudo, não há menção explícita de que os consultores da JK tenham utilizado o serviço SMS *da Autora* para auxiliar nos trabalhos de implantação *na Autora*, conforme questionado. O quesito em fls. 60 apenas solicita ao perito que investigue 'chamadas efetuadas pelos consultores das Requeridas envolvidos no projeto ao suporte técnico da Totvs, registrado dentro do sistema da mesma', mas não apresenta o resultado dessa investigação como evidência de uso.",
      notes:
        "A ausência de evidência direta não significa que o fato não ocorreu, mas que não pode ser confirmado com base nos documentos fornecidos para esta análise.",
    },
    {
      id: "q-003",
      block: 1,
      question:
        "Essa utilização pelos consultores da ré JK retrata a ausência de habilidade/conhecimento técnico do sistema a ser implantado, sim ou não? (fls. 61)",
      answer:
        "Sim, a utilização de serviços de suporte pelos consultores da ré JK durante a implantação, se comprovada, retrataria a ausência de habilidade/conhecimento técnico adequado do sistema a ser implantado. Independentemente da comprovação de tal utilização, há outras evidências que apontam para a ausência de qualificação técnica da equipe da ré.",
      status: "compliant",
      rationale:
        "A degravação de fls. 30 menciona a 'Paralisação dos trabalhos pela totvs, por 90 dias, pela ausência de qualificação técnica para solucionar problemas técnicos de implantação'. Jonkel, representante da JK, admitiu 'falha nossa demais' e assumiu 'as falha nossa toda' (fls. 31-32). Leonardo, outro representante, reconheceu que 'o coordenador ele não tem conhecimento, muitas vezes do negócio, deveria ter tão profundo' (fls. 33) e que 'ERRAMOS' (fls. 34). Tais admissões indicam uma deficiência generalizada de conhecimento técnico e habilidade na equipe de implantação, o que seria corroborado pela necessidade de recorrer a suporte externo para o sistema que deveriam estar implantando.",
      notes:
        "A questão é hipotética ('Essa utilização... retrata'), mas o contexto probatório do processo já estabelece a premissa de deficiência técnica da equipe da ré.",
    },
    {
      id: "q-004",
      block: 1,
      question:
        "Considerando que a Autora contratou o software com a condição de que este rodaria em sistema operacional 'Linux', conforme fls. 47, o sistema adquirido das rés foi efetivamente implementado em sua totalidade no ambiente Linux da Autora, incluindo a utilização das licenças de suporte profissional da Suse Linux Enterprise adquiridas? Em caso negativo, quais foram os impedimentos técnicos? (fls. 47, 61)",
      answer:
        "Não, o sistema adquirido das rés não foi efetivamente implementado em sua totalidade no ambiente Linux da Autora, e as licenças de suporte profissional da Suse Linux Enterprise adquiridas pela Autora não foram utilizadas para o sistema TOTVS RM. O impedimento técnico principal foi a incompatibilidade do produto TOTVS RM com o sistema operacional Linux.",
      status: "non_compliant",
      rationale:
        "A Autora, de fato, contratou o software com a condição de que rodaria em Linux e adquiriu licenças de suporte profissional da Suse Linux Enterprise (fls. 47). Contudo, o documento técnico em fls. 497 afirma que 'não existe nenhuma menção à linha TOTVS RM ser suportado pela plataforma Linux, somente pela plataforma Windows, o que demonstra que para o sistema ser instalado e implantado em qualquer empresa é necessário a plataforma Windows'. O mesmo documento comprova que 'o sistema TOTVS RM foi instalado na Requerente no ambiente Windows'. Portanto, o impedimento técnico foi a ausência de suporte do software TOTVS RM para o ambiente Linux, contrariando a condição contratual.",
      notes:
        "Esta incompatibilidade fundamental representa uma falha crítica na fase de planejamento e especificação do projeto, impactando diretamente a viabilidade da implantação conforme as condições acordadas.",
    },
    {
      id: "q-005",
      block: 1,
      question: "Qual foi o escopo contratado do projeto? (fls. 61)",
      answer:
        "O escopo contratado do projeto compreendia a Cessão de Direito de Uso (CDU) de Software, serviços mensais de software (SMS), e Serviços Complementares de Software (SCS), que incluíam implantação, suporte local, fábrica de software e treinamento. Especificamente, o macro escopo do projeto ELETROMAR MÓVEIS E ELETRODOMÉSTICOS LTDA, baseado nos módulos padrão da família SOFTWARE, abrangia os seguintes processos e personalizações: NFE - NOTA FISCAL ELETRÔNICA - SEFAZ, PROCESSO CONTÁBIL, PROCESSO DE COMPRAS, PROCESSO DE CONTROLE DE GESTÃO DE PESSOAL, PROCESSO DE CONTROLE DE PONTO ELETRÔNICO, PROCESSO DE ESTOQUE, PROCESSO DE FATURAMENTO, PROCESSO DE FIELD SERVICE, PROCESSO DE FATURAMENTO/OMS, PROCESSO DE PATRIMÔNIO, PROCESSO FINANCEIRO, PROCESSO TRIBUTÁRIO, SPED FISCAL, SPED CONTÁBIL, SPED PIS/COFINS e PERSONALIZAÇÕES.",
      status: "compliant",
      rationale:
        "O escopo é detalhado em diversos documentos contratuais. As fls. 21 e 22 do processo descrevem o objeto do contrato como 'CDU de Software', 'Serviços mensais SMS' e 'Serviços de SCS - Serviços complementares de software, os quais compreendem, dentre outros, os serviços de implantação, suporte local, fábrica de Software e treinamento'. A lista mais abrangente dos módulos e processos está no 'Macro escopo' da Proposta Comercial, conforme fls. 100.",
      notes:
        "O escopo também previa a importação de dados do sistema atual para rotinas descritas, integração entre TOTVS e o software próprio da Martinello via TOTVS ESB, e treinamento para 42 usuários em duas fases (fls. 100).",
    },
    {
      id: "q-006",
      block: 1,
      question:
        "Se ele foi totalmente atingido/implantado? Qual a porcentagem? O Sr. perito ratifica o documento de nº 08 juntado com a petição inicial pela autora no que se refere à implantação e não implantação lá relacionadas? (fls. 26, 61)",
      answer:
        "Não, o projeto não foi totalmente atingido/implantado. O perito constatou que, das 426 rotinas previstas, apenas 158 apresentaram 'início de implantação', o que corresponde a aproximadamente 37,09%. O perito ratifica, em essência, o documento de nº 08, que evidencia a não conclusão da fase de implantação.",
      status: "non_compliant",
      rationale:
        "O documento 08 (fls. 26) já indicava que 'os sistemas adquiridos estão incompletos, sequer a fase de implantação foi concluída!'. Esta constatação é corroborada pelas degravações, onde Leonardo (representante da ré) afirma que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32). O laudo pericial, conforme fls. 1973 e fls. 2488, detalha que 'Das 426 (quatrocentos e vinte e seis) rotinas... em 158 (cento e cinquenta e oito) foram encontradas informações no banco de dados demonstrando que ocorreu ao menos um início de implantação. Nas demais 268 (duzentos e sessenta e oito) rotinas não foram encontradas informações no banco de dados que mostrem suas implantações.' A porcentagem de rotinas com início de implantação é de (158/426) * 100 ≈ 37,09%.",
      notes:
        "A ratificação do documento 08 pelo perito é implícita na medida em que suas conclusões técnicas confirmam o estado de não-conclusão do projeto.",
    },
    {
      id: "q-007",
      block: 1,
      question:
        "Na hipótese da resposta anterior constatar que a implantação do projeto não se ultimou, informe com dados e suporte nos fatos técnicos apurados, quais as causas e responsabilidades da sua não conclusão, considerando as admissões de falhas por parte dos representantes das rés, conforme degravações de fls. 31-32 e fls. 34? (fls. 31-32, 34, 61)",
      answer:
        "A não conclusão da implantação do projeto deve-se a uma combinação de fatores, incluindo subdimensionamento inicial do projeto, falhas na gestão de tempo e recursos, ausência de qualificação técnica da equipe das rés para solucionar problemas complexos, e incompatibilidade técnica fundamental do software com o ambiente contratado pela Autora. A responsabilidade recai sobre as rés, conforme suas próprias admissões.",
      status: "compliant",
      rationale:
        "As degravações revelam que a previsão inicial de 4.000 horas para o projeto foi amplamente superada, com mais de 8.000 horas já exploradas e uma projeção de mais 2.000 horas para conclusão (fls. 31, 33), indicando um grave subdimensionamento e má gestão. Jonkel (representante da JK) admitiu 'falha nossa demais' e assumiu 'as falha nossa toda' (fls. 31-32). Leonardo (representante da TOTVS/JK) também reconheceu que 'ERRAMOS' (fls. 34) e que 'o coordenador ele não tem conhecimento, muitas vezes do negócio, deveria ter tão profundo' (fls. 33). Além disso, houve uma paralisação de 90 dias devido à 'ausência de qualificação técnica para solucionar problemas técnicos de implantação', especificamente um problema relacionado ao ICMS (fls. 30). Outro fator técnico crucial foi a incompatibilidade do sistema TOTVS RM com o ambiente Linux contratado pela Autora, sendo o software suportado apenas em Windows (fls. 497).",
      notes:
        "As admissões dos representantes das rés são provas contundentes da responsabilidade pela não conclusão do projeto, somadas às evidências de problemas técnicos e de gestão.",
    },
    {
      id: "q-008",
      block: 1,
      question:
        "Houve integração do sistema TOTVS com o utilizado pela Autora? Especifique, relacionando os pontos que foram e os que não foram implantados; Se nenhuma etapa foi concluída, indique o estágio e o obstáculo técnico onde foi paralisado o trabalho. (fls. 61)",
      answer:
        "A integração do sistema TOTVS com o software próprio da Autora foi prevista no escopo do projeto, a ser realizada via TOTVS ESB. Contudo, não há evidências de que essa integração tenha sido concluída ou efetivamente colocada em produção. O projeto como um todo não foi finalizado, com 'nada em produção', e foi paralisado por obstáculos técnicos e falta de qualificação.",
      status: "non_compliant",
      rationale:
        "A Proposta Comercial (fls. 100) estabelece que 'SERÁ PREVISTA UMA INTEGRAÇÃO ENTRE A TOTVS E O SOFTWARE PROPRIO DA MARTINELLO ATRAVES DA FERRAMENTA TOTVS ESB'. No entanto, Leonardo (representante da ré) declarou que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32), o que indica que a integração não foi concluída para uso operacional. Embora 158 de 426 rotinas tenham tido 'início de implantação' (fls. 1973), não há especificação de quais delas se referem a pontos de integração. O trabalho foi paralisado por problemas como a 'ausência de qualificação técnica para solucionar problemas técnicos de implantação' relacionados ao ICMS (fls. 30) e a incompatibilidade do TOTVS RM com o sistema operacional Linux (fls. 497), que afetaram a implantação geral e, consequentemente, a integração.",
      notes:
        "A falta de conclusão do projeto como um todo impede a efetivação da integração, mesmo que algumas etapas preliminares pudessem ter sido iniciadas.",
    },
    {
      id: "q-009",
      block: 1,
      question:
        "Para cada um dos módulos listados no macro escopo do projeto (NFE - NOTA FISCAL ELETRONICA - SEFAZ, PROCESSO CONTABIL, PROCESSO DE COMPRAS, PROCESSO DE CONTROLE DE GESTAO DE PESSOAL, PROCESSO DE CONTROLE DE PONTO ELETRONICO, PROCESSO DE ESTOQUE, PROCESSO DE FATURAMENTO, PROCESSO DE FIELD SERVICE, PROCESSO DE FATURAMENTO/OMS, PROCESSO DE PATRIMONIO, PROCESSO FINANCEIRO, PROCESSO TRIBUTARIO, SPED FISCAL, SPED CONTABIL, SPED PIS/COFINS e PERSONALIZAÇÕES, conforme fls. 100), o Sr. Perito pode atestar se a implantação foi concluída e se estão em pleno funcionamento no ambiente da Autora? (fls. 100)",
      answer:
        "Não é possível atestar que a implantação de cada um dos módulos listados no macro escopo foi concluída e que estão em pleno funcionamento no ambiente da Autora. Pelo contrário, as evidências indicam que o projeto não foi concluído e que não havia nada em produção.",
      status: "non_compliant",
      rationale:
        "O macro escopo do projeto, listado em fls. 100, inclui todos os módulos mencionados. Contudo, Leonardo (representante da ré) afirmou categoricamente que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32). O laudo pericial também aponta que, das 426 rotinas, apenas 158 tiveram 'início de implantação', e as demais 268 não mostraram implantação (fls. 1973, 2488). Esta constatação geral de não-conclusão e ausência de produção se estende a todos os módulos do projeto, sem que haja detalhamento específico sobre o pleno funcionamento de qualquer módulo individualmente.",
      notes:
        "A ausência de produção e a baixa porcentagem de rotinas com início de implantação são indicadores claros de que os módulos não estavam em pleno funcionamento.",
    },
    {
      id: "q-010",
      block: 1,
      question:
        "Dentro do escopo contratado, indique ou estime quanto tempo levaria para ser implantado o projeto, considerando que a Autora colocaria à disposição funcionários com conhecimento total do sistema em uso, sendo um deles programador do sistema utilizado? Especifique em horas técnicas, número de profissionais com respectivos níveis (consultor, programador, etc.) seriam necessários? (fls. 61-62)",
      answer:
        "A previsão inicial para a implantação do projeto era de 4.000 horas e um prazo de 6 a 7 meses. No entanto, após o consumo de mais de 8.000 horas, foi estimada a necessidade de mais 2.208 horas para a conclusão, o que representaria um esforço conjunto de 4 a 5 meses, com a alocação de 3 a 5 analistas, incluindo um analista sênior/coordenador com profundo conhecimento do negócio.",
      status: "partially_compliant",
      rationale:
        "A previsão inicial era de '4.000 horas no total' (fls. 31) e um prazo estimado de '06/07 meses, contados de JULHO de 2011' (fls. 25-26). Contudo, já foram 'exploradas mais de 8.000 horas do projeto' (fls. 33). Para a conclusão, Leonardo (representante da ré) estimou '2.208 horas' adicionais, que 'vão representar... 4.4 meses' ou '4 a 5 meses de projeto', com a necessidade de '3 analistas' em tempo integral, podendo variar para '4 ou 5 pessoas aqui dentro' em determinados momentos (fls. 34). Ele destacou a importância de um 'analista sênior nosso' como Edson, que 'além de administrar, de gerir o projeto, ele participa e ele implanta' e tem 'conhecimento... tão profundo' do negócio, em contraste com outros coordenadores (fls. 33-34). Não há uma especificação detalhada do número e níveis de profissionais *necessários para o plano inicial de 4.000 horas e 6-7 meses*.",
      notes:
        "A estimativa de recursos e tempo para a conclusão do projeto é baseada em um cenário de recuperação, após o projeto já ter extrapolado significativamente as previsões iniciais, e não reflete o planejamento original para as dimensões e prazo contratados.",
    },
    {
      id: "q-011",
      block: 1,
      question:
        "Em quais sistemas operacionais operam os softwares adquiridos da totvs? Especifique em cada setor. (fls. 62)",
      answer:
        "Os softwares adquiridos da TOTVS, especificamente a linha TOTVS RM, operam em sistemas operacionais Windows Server 2003 ou Windows Server 2008. Não há menção de suporte para Linux para esta linha de produtos. Não foi especificado nos documentos analisados se há diferentes sistemas operacionais para cada setor da Autora.",
      status: "compliant",
      rationale:
        "O documento técnico em fls. 497, sob o título 'Portabilidade para Servidor de Aplicação', detalha os 'Requisitos de Software' para o produto TOTVS RM, indicando 'Windows 2003 Server' e 'Windows 2008 Server' como sistemas operacionais suportados. O mesmo documento afirma: 'Importante - não existe nenhuma menção à linha TOTVS RM ser suportado pela plataforma Linux, somente pela plataforma Windows, o que demonstra que para o sistema ser instalado e implantado em qualquer empresa é necessário a plataforma Windows.' Não há informações nos autos que especifiquem sistemas operacionais distintos para cada setor da Autora.",
      notes:
        "A incompatibilidade com Linux foi um ponto crítico, dado que a Autora havia contratado o software com a condição de rodar nesse ambiente.",
    },
    {
      id: "q-012",
      block: 1,
      question:
        "Iniciou-se a importação de dados de um sistema para o outro? Ele foi concluído? Se não, qual foi a razão? Divergência ou ausência de dados/informações de um sistema para o outro? Explique. (fls. 62)",
      answer:
        "Sim, a importação de dados foi prevista para rotinas específicas do escopo do projeto. No entanto, não há evidências de que tenha sido concluída. A razão principal para a não conclusão está ligada à falha geral na implantação do projeto, que não resultou em 'nada em produção'. A proposta também excluía a responsabilidade da TOTVS por corrigir ou otimizar dados de origem, o que poderia ser uma causa de problemas.",
      status: "non_compliant",
      rationale:
        "A Proposta Comercial (fls. 100) prevê 'a importação de dados do sistema atual? SIM, PARA ROTINAS DESCRITAS NO ESCOPO'. Contudo, Leonardo (representante da ré) declarou que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32), o que implica que a importação não foi concluída para uso efetivo. O laudo pericial indicou que apenas 158 de 426 rotinas tiveram 'início de implantação' (fls. 1973), sugerindo que a importação, se iniciada, não foi abrangente ou finalizada. A Proposta Comercial (fls. 98) também estabelece que a TOTVS não considerava inclusa na oferta 'Corrigir, filtrar ou otimizar os dados dos sistemas atuais a serem inseridos para o Software, até mesmo depois da migração ou digitação', o que poderia ser uma causa de impedimento caso houvesse problemas nos dados de origem, embora não haja evidência direta de 'divergência ou ausência de dados/informações' como a razão específica da não conclusão.",
      notes:
        "A falta de conclusão da implantação do sistema como um todo é o principal fator que impede a conclusão e validação da importação de dados.",
    },
    {
      id: "q-013",
      block: 1,
      question:
        "A importação de dados da movimentação de contas a receber e contas a pagar, a movimentação dos dados dos clientes, dos fornecedores, foi realizada? Especifique o que foi e o que não foi realizado. (fls. 62)",
      answer:
        "A importação de dados da movimentação de contas a receber e contas a pagar, bem como dos dados de clientes e fornecedores, não foi concluída para uso em produção. Embora o módulo financeiro tenha tido alguma parametrização, ele não foi implementado.",
      status: "non_compliant",
      rationale:
        "A Proposta Comercial (fls. 100) previa a importação de dados para rotinas do escopo, que incluíam 'PROCESSO FINANCEIRO' (fls. 100) e 'Contas a Receber' (fls. 312). No entanto, Leonardo (representante da ré) afirmou que 'o financeiro, não foi implementado, mas já tem toda uma parametrização...' (fls. 33). A declaração de 'nada em produção' (fls. 32) para o projeto como um todo reforça que a importação desses dados críticos não foi finalizada para uso operacional. Não há especificação detalhada nos documentos sobre o que foi ou não foi realizado especificamente para cada categoria de dados (contas a receber/pagar, clientes, fornecedores), além da não implementação geral do módulo financeiro.",
      notes:
        "A parametrização sem a implementação completa e a colocação em produção indica que os dados, se importados, não foram validados para o ambiente operacional.",
    },
    {
      id: "q-014",
      block: 1,
      question:
        "A integração dos sistemas de frente de loja utilizado pela autora e o sistema adquirido foi concluído? Especifique o que foi e o que não foi realizado. (fls. 62)",
      answer:
        "Não, a integração dos sistemas de frente de loja utilizado pela Autora e o sistema adquirido não foi concluída. O projeto como um todo não resultou em 'nada em produção'.",
      status: "non_compliant",
      rationale:
        "A Proposta Comercial (fls. 100) previa 'uma integração entre a TOTVS e o software próprio da Martinello através da ferramenta TOTVS ESB', o que incluiria, presumivelmente, os sistemas de frente de loja. Contudo, Leonardo (representante da ré) declarou que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32). O laudo pericial indicou que apenas 158 de 426 rotinas tiveram 'início de implantação' (fls. 1973), mas não especifica quais delas se referem à integração de frente de loja. A ausência de produção geral do sistema implica que esta integração específica não foi finalizada ou validada para uso operacional. Não há detalhes sobre o que foi ou não foi realizado especificamente para esta integração.",
      notes:
        "A não conclusão da implantação do sistema adquirido inviabiliza a integração funcional com outros sistemas da Autora, como os de frente de loja.",
    },
    {
      id: "q-015",
      block: 1,
      question:
        "Há erros de parametrização que impedem o fechamento da folha de pagamento? (fls. 62)",
      answer:
        "Sim, há fortes indícios de problemas de parametrização ou implementação no módulo de folha de pagamento que impediam seu funcionamento adequado, incluindo o fechamento da folha.",
      status: "compliant",
      rationale:
        "Jonkel (representante da ré) afirmou que o 'módulo de folha de pagamento... vamo precisa fazer isso aqui de novo' (fls. 29), o que sugere que o trabalho anterior estava incorreto ou incompleto, provavelmente devido a erros de parametrização ou falhas na implementação. Além disso, a declaração de Leonardo de que 'não temos nada em produção' (fls. 32) para o projeto como um todo reforça que o módulo de folha de pagamento não estava funcional.",
      notes:
        "A necessidade de 'fazer de novo' o módulo de folha de pagamento é uma admissão clara de que o trabalho realizado anteriormente não era satisfatório para as operações da Autora.",
    },
    {
      id: "q-016",
      block: 1,
      question:
        "Os prepostos indicados pelas rés que trabalharam no projeto junto a Autora mantinham qualificação técnica para desenvolver o projeto? (fls. 62)",
      answer:
        "Não, os prepostos indicados pelas rés que trabalharam no projeto não mantinham qualificação técnica adequada para desenvolver o projeto em sua totalidade, conforme admitido pelos próprios representantes das rés e evidenciado pela paralisação dos trabalhos.",
      status: "non_compliant",
      rationale:
        "A degravação de fls. 30 menciona uma 'Paralisação dos trabalhos pela totvs, por 90 dias, pela ausência de qualificação técnica para solucionar problemas técnicos de implantação'. Jonkel (representante da JK) admitiu 'falha nossa demais' e assumiu 'as falha nossa toda' (fls. 31-32). Leonardo (representante da TOTVS/JK) explicitou que 'o coordenador ele não tem conhecimento, muitas vezes do negócio, deveria ter tão profundo' (fls. 33), contrastando com a qualificação de um analista sênior como Edson. Essas declarações indicam uma deficiência na qualificação técnica e no conhecimento de negócio da equipe alocada para o projeto.",
      notes:
        "A falta de qualificação técnica foi um fator determinante para os atrasos e a não conclusão do projeto.",
    },
    {
      id: "q-017",
      block: 1,
      question: "Definir tecnicamente o que se considera ou o que é 'customização'? (fls. 62)",
      answer:
        "Tecnicamente, 'customização' refere-se ao desenvolvimento de funcionalidades ou modificações no produto de software padrão para atender a necessidades específicas e únicas de um cliente, que vão além das especificações originais do software e da legislação aplicável. Este processo é geralmente realizado por uma Fábrica de Software ou desenvolvedores especializados e é cobrado separadamente.",
      status: "compliant",
      rationale:
        "A Cláusula 5.4 do Contrato de Cessão de Direito de Uso de Software e Prestação de Serviços (fls. 87) define que 'Necessidades específicas da Contratante poderão ser atendidas... com customizações, as quais serão cobradas separadamente.' A Proposta Comercial (fls. 98), na seção 'Fábrica de Software', descreve que 'A Fábrica de Software é responsável pelo desenvolvimento de 'customizações' do produto padrão e em outras tecnologias de acordo a necessidades dos seus clientes.' Jonkel (representante da ré) também diferencia 'implantações' de 'customizações', sendo estas últimas 'o desenvolvimento que fico um cara que quase 1 ano, que é aquele Adriano Guedis, fazendo aquele trabalho' (fls. 29).",
      notes:
        "A customização implica em alteração do código-fonte ou adição de novas lógicas ao sistema padrão, diferentemente da parametrização, que ajusta o sistema por meio de configurações existentes.",
    },
    {
      id: "q-018",
      block: 1,
      question:
        "Levando em consideração o conceito técnico de 'customização', informe o Sr. Perito se houve procedimento de customização solicitada pela Autora, cujo trabalhos de implantação tenham sido iniciados. (fls. 62-63)",
      answer:
        "Sim, houve procedimentos de customização solicitados pela Autora, e os trabalhos de implantação relacionados a essas customizações foram iniciados.",
      status: "compliant",
      rationale:
        "A Proposta Comercial (fls. 100) inclui 'PERSONALIZAÇÕES' no macro escopo do projeto, indicando que rotinas não contempladas no sistema padrão foram identificadas e destacadas para customização. Jonkel (representante da ré) mencionou que 'tem os customizações, que é o desenvolvimento que fico um cara que quase 1 ano, que é aquele Adriano Guedis, fazendo aquele trabalho' (fls. 29), o que confirma que o trabalho de desenvolvimento para customizações foi iniciado e teve uma duração considerável.",
      notes:
        "Embora os trabalhos tenham sido iniciados, as customizações não resultaram em 'nada em produção' (fls. 32), indicando que não foram concluídas ou validadas para uso efetivo.",
    },
    {
      id: "q-019",
      block: 1,
      question:
        "Se eventual 'customização' foi realizada? Especifique no que consistiu mediante a hipótese do programa (projeto) não ter sido implantado. (fls. 63)",
      answer:
        "Embora os trabalhos de customização tenham sido iniciados e um desenvolvedor tenha atuado por quase um ano nessas atividades, não há evidências nos documentos analisados que especifiquem quais customizações foram 'realizadas' ou em que consistiram, especialmente considerando que o projeto como um todo não foi implantado e não resultou em 'nada em produção'.",
      status: "inconclusive",
      rationale:
        "Jonkel (representante da ré) mencionou que 'tem os customizações, que é o desenvolvimento que fico um cara que quase 1 ano, que é aquele Adriano Guedis, fazendo aquele trabalho' (fls. 29). A Proposta Comercial (fls. 100) lista 'PERSONALIZAÇÕES' como parte do escopo. Contudo, Leonardo (representante da ré) declarou que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32). O laudo pericial indicou que apenas 158 de 426 rotinas tiveram 'início de implantação' (fls. 1973), mas não detalha quais dessas rotinas correspondem a customizações específicas ou o conteúdo delas.",
      notes:
        "A ausência de detalhamento sobre as customizações efetivamente concluídas ou o seu conteúdo técnico impede uma resposta precisa, apesar da comprovação de que houve esforço de desenvolvimento.",
    },
    {
      id: "q-020",
      block: 1,
      question:
        "Considerando o sistema de informática utilizado pela Autora e aquele padrão da TOTVS, no processo executado pela Autora para dar entrada das notas fiscais, haveria maior demora no processo se utilizado o sistema padrão da TOTVS frente ao utilizado pela Autora? E nos trabalhos atinentes ao setor de compras? (fls. 63)",
      answer:
        "Os documentos analisados não contêm informações ou uma avaliação técnica comparativa que permita determinar se haveria maior demora no processo de entrada de notas fiscais ou nos trabalhos do setor de compras ao utilizar o sistema padrão da TOTVS em comparação com o sistema anteriormente utilizado pela Autora. O sistema TOTVS não foi colocado em produção, o que impede tal comparação baseada em uso real.",
      status: "inconclusive",
      rationale:
        "O projeto de implantação do sistema TOTVS não foi concluído, e Leonardo (representante da ré) afirmou que 'não resultaram em absolutamente nada em produção né... não temos nada em produção. isto é fato...' (fls. 32). Sem o sistema em operação, não é possível realizar uma análise de desempenho ou eficiência comparativa entre os dois sistemas para os processos de entrada de notas fiscais e compras. A Proposta Comercial (fls. 100) lista 'NFE - NOTA FISCAL ELETRONICA - SEFAZ' e 'PROCESSO DE COMPRAS' como módulos do escopo, mas não há dados de performance.",
      notes:
        "Qualquer avaliação sobre a eficiência comparativa dos sistemas seria especulativa sem dados de uso em ambiente de produção.",
    },
    {
      id: "q-021",
      block: 1,
      question:
        "Qual a solução foi oferecida pela totvs para solucionar tal quadro (quesito 20)? Isso implicaria em redução de quanto tempo de trabalho para se ultimar o trabalho, considerando que a totvs disponibilizou apenas 01 analista tal atuação? (fls. 63)",
      answer:
        "Não foi oferecida uma solução específica pela TOTVS para o quadro de eventual demora nos processos de entrada de notas fiscais ou compras (quesito 20). No entanto, para a conclusão geral do projeto, após os atrasos, foi proposta uma reestruturação que envolveria 2.208 horas adicionais de trabalho, a serem realizadas por 3 a 5 analistas em um período de 4 a 5 meses. A premissa de que a TOTVS disponibilizou apenas 01 analista para tal atuação específica não é confirmada nos documentos.",
      status: "inconclusive",
      rationale:
        "Não há nos documentos analisados uma solução específica para a questão da demora nos processos de entrada de notas fiscais ou compras. A solução apresentada por Leonardo (representante da ré) em fls. 34 refere-se à conclusão do projeto como um todo: 'a questão é essas 2.208 horas, elas vão representar, trazendo 3 analistas aqui, em tempo integral... 4.4 meses... Necessariamente, num determinado momento do projeto eu preciso ta com 4 ou 5 pessoas aqui dentro'. Esta estimativa de tempo e recursos é para 'resgata o projeto e a gente consegue conclui efetivamente'. Não há informação que corrobore a disponibilização de 'apenas 01 analista' para a atuação específica mencionada no quesito.",
      notes:
        "A solução apresentada visava a recuperação e conclusão do projeto de forma abrangente, e não a otimização de processos específicos que não chegaram a ser implementados em produção.",
    },
    {
      id: "q-022",
      block: 1,
      question:
        "Houve o treinamento dos prepostos, líderes do processo e usuários chaves? (fls. 63)",
      answer:
        "Sim, houve treinamento para prepostos, líderes de processo e usuários chaves, conforme o plano de treinamento em duas fases. No entanto, o perito constatou que o treinamento foi realizado para 7 dos 42 funcionários previstos.",
      status: "partially_compliant",
      rationale:
        "A Proposta Comercial (fls. 98) detalha o plano de treinamento: 'O treinamento de E-learning para os 42 usuários será feito em duas fases. Na primeira fase será feita capacitação presencial dos usuários chaves e líderes de processo e em uma segunda fase o treinamento dos usuários finais através do treinamento E-learning.' O perito, em fls. 91 e fls. 2488, identificou e listou os 'usuários-chave' que receberam treinamento para processos específicos, totalizando 7 dos 42 funcionários. Isso indica que a primeira fase de treinamento para usuários chaves e líderes de processo foi iniciada e parcialmente realizada.",
      notes:
        "A realização parcial do treinamento, atingindo apenas uma fração dos usuários previstos, pode ter contribuído para a dificuldade na adoção e operação do sistema.",
    },
    {
      id: "q-023",
      block: 1,
      question:
        "Quantos consultores, quantos analistas, enfim especifique o Sr. Perito o número e a capacitação técnica dos colaboradores que deveriam ter para implantar o projeto nas dimensões contratadas e no prazo estabelecido no contrato? (fls. 63)",
      answer:
        "Os documentos analisados não especificam o número exato e a capacitação técnica dos colaboradores que *deveriam ter sido* alocados para implantar o projeto nas dimensões e prazo *originalmente contratados*. Há apenas uma previsão inicial de 4.000 horas para o projeto e um prazo de 6 a 7 meses, sem detalhamento da equipe para este período.",
      status: "inconclusive",
      rationale:
        "A previsão inicial do projeto era de 4.000 horas (fls. 31) e um prazo de 6 a 7 meses (fls. 25-26). Contudo, os documentos não detalham a composição da equipe (número de consultores, analistas, programadores e seus respectivos níveis de capacitação) que seria necessária para cumprir este plano inicial. As informações sobre a equipe (3 a 5 analistas, incluindo um sênior como Edson) e horas (2.208) referem-se à estimativa para a *conclusão* do projeto após os atrasos e problemas (fls. 34), e não ao planejamento original.",
      notes:
        "A ausência de um plano de recursos detalhado para a fase inicial do projeto dificulta a avaliação da adequação da equipe alocada desde o início.",
    },
    {
      id: "q-024",
      block: 1,
      question:
        "Informar com base nas subsídios apurados, quantos e qual a capacitação técnica daqueles disponibilizados pela Totvs? (fls. 63)",
      answer:
        "Os documentos não fornecem um número exato de todos os profissionais disponibilizados pela TOTVS ao longo do projeto. Contudo, as evidências apontam para deficiências na capacitação técnica da equipe, com exceção de alguns profissionais.",
      status: "partially_compliant",
      rationale:
        "As degravações indicam que houve 'ausência de qualificação técnica para solucionar problemas técnicos de implantação' (fls. 30), o que levou a uma paralisação de 90 dias. Leonardo (representante da ré) afirmou que 'o coordenador ele não tem conhecimento, muitas vezes do negócio, deveria ter tão profundo', destacando Edson como um analista sênior com profundo conhecimento (fls. 33, 34). Jonkel (representante da JK) também mencionou 'Maicon' e 'outros analistas' (fls. 29), mas sem detalhar suas qualificações ou o número total de profissionais. A informação disponível é mais qualitativa sobre a falta de capacitação do que quantitativa sobre o número total de profissionais e suas qualificações individuais.",
      notes:
        "A falta de um registro formal e detalhado da equipe alocada e suas qualificações impede uma resposta completa e precisa a este quesito.",
    },
    {
      id: "q-025",
      block: 1,
      question:
        "Qual a data da última atualização realizada pela totvs no servidor da autora? (fls. 63)",
      answer:
        "Os documentos analisados não contêm a data da última atualização realizada pela TOTVS no servidor da Autora.",
      status: "inconclusive",
      rationale:
        "Não há qualquer menção ou registro nos 'Quesitos a serem respondidos (JSON)', 'Evidências disponíveis (JSON)' ou 'Contexto adicional (bloco do processo)' que informe a data da última atualização realizada pela TOTVS no servidor da Autora.",
      notes:
        "Esta informação seria crucial para avaliar a manutenção e o suporte contínuo do sistema, mas não está presente nos autos.",
    },
    {
      id: "q-026",
      block: 1,
      question:
        "O problema relacionado ao ICMS, mencionado na degravação de fls. 30, foi um obstáculo técnico que paralisou os trabalhos de implantação do projeto por 90 dias? Em caso afirmativo, qual a natureza técnica desse problema e qual a responsabilidade das rés em sua resolução? (fls. 30)",
      answer:
        "Sim, o problema relacionado ao ICMS foi um obstáculo técnico que paralisou os trabalhos de implantação do projeto por 90 dias. A natureza técnica do problema está ligada à necessidade de adequação do software a requisitos tributários específicos do ICMS, e a paralisação ocorreu devido à 'ausência de qualificação técnica' da equipe das rés para solucioná-lo. A responsabilidade pela resolução recai sobre as rés, conforme o contrato.",
      status: "compliant",
      rationale:
        "Jonkel (representante da JK) afirmou: 'Sabe o que que foi, seu Osvaldo, aquele negócio do ICMS, o senhor me coloco uma coisa, se não resolve, eu digo assim, se não resolve, eu não resolve o negocio do ICMS nem piso aqui...' (fls. 30). Osvaldo (representante da Autora) confirmou a paralisação: 'nós vamo pra 90 dias sem produção' (fls. 30). A causa da paralisação foi explicitamente atribuída à 'ausência de qualificação técnica para solucionar problemas técnicos de implantação' (fls. 30). A natureza técnica do problema envolve a correta implementação das regras de ICMS no software. A Cláusula 5.2 do Contrato (fls. 86) estabelece que a TOTVS é responsável por 'adaptá-lo às mudanças da Legislação havidas, as quais interfiram na sua utilização', incluindo 'Leis Tributárias'. Embora a Cláusula 5.4 (fls. 87) mencione que 'atendimento de questões tributárias de municípios com menos de 500.000 habitantes' ou 'alterações na legislação... de caráter específico' poderiam ser customizações cobradas separadamente, a paralisação por falta de qualificação para resolver o problema indica uma falha na responsabilidade geral de implantação e suporte.",
      notes:
        "A incapacidade da equipe de implantação em resolver um problema tributário crítico como o ICMS demonstra uma lacuna significativa na sua expertise, impactando diretamente o cronograma do projeto.",
    },
    {
      id: "q-027",
      block: 1,
      question:
        "Considerando a previsão inicial de 4.000 horas para o projeto e a constatação de mais de 8.000 horas já exploradas, com uma projeção de mais 2.000 horas para conclusão, conforme degravações de fls. 31 e 33, qual a avaliação técnica sobre a gestão de tempo e recursos pelas rés e o impacto no cronograma e custo do projeto? (fls. 31, 33)",
      answer:
        "A gestão de tempo e recursos pelas rés foi tecnicamente deficiente e ineficaz. A previsão inicial de 4.000 horas foi drasticamente subestimada, com mais de 8.000 horas já consumidas e uma projeção adicional de 2.208 horas para conclusão, totalizando mais de 10.000 horas. Isso resultou em um impacto severo no cronograma, que se estendeu de uma previsão de 6-7 meses para mais de um ano, com mais 4-5 meses adicionais necessários, e um aumento substancial nos custos do projeto.",
      status: "non_compliant",
      rationale:
        "A previsão inicial do projeto era de '4.000 horas no total' (fls. 31). No entanto, Jonkel (representante da JK) mencionou 6.200 horas já gastas e uma projeção de 'mais umas 2.000 horas' para terminar (fls. 31). Leonardo (representante da TOTVS/JK) confirmou que 'já foram exploradas mais de 8.000 horas do projeto...' e projetou '2.208 horas' adicionais para a conclusão, estimando '4 a 5 meses de projeto' (fls. 33, 34). A previsão inicial de prazo era de '06/07 meses' (fls. 25-26), mas 'transcorridos mais de 01 ano' o projeto não foi ultimado (fls. 26). Essa discrepância massiva entre o planejado e o executado, com o dobro das horas já consumidas e ainda mais necessárias, demonstra uma falha crítica na gestão de tempo e recursos, resultando em atrasos prolongados e custos significativamente elevados para a Autora, que pagou R$ 876.383,30 (fls. 40, 43) por um projeto não concluído.",
      notes:
        "A má gestão é corroborada pelas admissões de 'falha nossa demais' (fls. 31-32) e 'ERRAMOS' (fls. 34) pelos representantes das rés, além da 'ausência de qualificação técnica' (fls. 30) que contribuiu para a ineficiência.",
    },
    {
      id: "q-028",
      block: 1,
      question:
        "Preste todas as informações que tenha por pertinente ao esclarecimento dos fatos. (fls. 64)",
      answer:
        "O projeto de implantação do software TOTVS na Autora, Eletromar Móveis e Eletrodomésticos Ltda., foi caracterizado por um descumprimento contratual significativo por parte das rés, TOTVS S/A e JK Gestão Empresarial Ltda., resultando na não conclusão da implantação e na impossibilidade de uso do sistema pela Autora. As principais causas incluem um severo subdimensionamento do projeto (4.000 horas iniciais vs. mais de 10.000 horas totais projetadas), falhas na gestão de tempo e recursos, e a ausência de qualificação técnica da equipe das rés para resolver problemas críticos, como a questão do ICMS, que paralisou o projeto por 90 dias. Além disso, houve uma incompatibilidade fundamental entre o software TOTVS RM e o sistema operacional Linux, que era uma condição contratual da Autora, levando à instalação em ambiente Windows. Embora treinamentos e customizações tenham sido iniciados, não resultaram em um sistema funcional em produção. A Autora efetuou pagamentos substanciais, totalizando R$ 876.383,30 (atualizados), por um serviço não entregue, e foi indevidamente cobrada por serviços mensais (SMS) que não pôde utilizar. A responsabilidade das rés é corroborada por admissões de falhas de seus próprios representantes.",
      status: "compliant",
      rationale:
        "As informações são compiladas de diversas evidências e trechos do 'TEXTO DE ENTRADA' e 'Contexto adicional'. O subdimensionamento e horas gastas são de fls. 31 e 33. A ausência de qualificação técnica e o problema do ICMS são de fls. 30, 31-32, 33 e 34. A incompatibilidade Linux/Windows é de fls. 47 e 497. A não utilização do SMS e cobranças indevidas são de fls. 25. Os valores pagos pela Autora são de fls. 40, 43-47. A não conclusão e 'nada em produção' são de fls. 26 e 32. O treinamento parcial é de fls. 91, 98 e 2488. A previsão de integração e customizações é de fls. 100 e 29.",
      notes:
        "Este resumo visa consolidar os pontos críticos apurados, destacando as falhas contratuais e técnicas que impediram o sucesso do projeto e geraram prejuízos à Autora.",
    },
    {
      id: "q-029",
      block: 2,
      question:
        "O contrato de cessão de direito de uso de software e prestação de serviços (fls. 128) e as propostas comerciais (nº 44542, 44543, 445544, 445545 e 445575) estabeleciam a obrigação das rés de implantar um sistema TOTVS Protheus funcional e adequado às necessidades da autora?",
      answer:
        "Sim, o contrato de cessão de direito de uso de software e prestação de serviços, juntamente com as propostas comerciais, estabeleciam a obrigação das rés de implantar um sistema TOTVS Protheus funcional e adequado às necessidades da autora, incluindo personalizações e integrações específicas.",
      status: "compliant",
      rationale:
        "O 'Contrato de Cessão de Direito de Uso de Software e Prestação de Serviços' (fls. 128) e as 'Propostas Comerciais' (nº 44542, 44543, 445544, 445545 e 445575, conforme fls. 144) regem a contratação. O 'Contexto adicional' indica que as funcionalidades dos módulos 'devem ser implantadas conforme descrito nas fls. 100 a 116'. Adicionalmente, as 'PERSONALIZAÇÕES' e 'INTEGRAÇÃO TOTVS X SIST (SISTEMA PROPRIO MARTINELLO)' detalhadas nas fls. 124 demonstram a intenção de adequar o sistema às necessidades específicas da autora. A menção recorrente de que a Autora 'não pôde usufruir a contento do sistema como fora contratado' (fls. 129, 130, 132) reforça a expectativa de um sistema funcional e adequado.",
      notes:
        "A documentação contratual e as propostas comerciais delineiam um escopo de implantação que vai além da mera entrega de licenças, abrangendo a operacionalização e customização do sistema para atender aos requisitos da Autora.",
    },
    {
      id: "q-030",
      block: 2,
      question:
        "A Metodologia de Implantação TOTVS (MIT), descrita nas fls. 103, foi integralmente seguida pelas rés, garantindo a execução de todas as fases e atividades previstas para a implantação do sistema?",
      answer:
        "Não, a Metodologia de Implantação TOTVS (MIT) não foi integralmente seguida pelas rés, e a execução de todas as fases e atividades previstas para a implantação do sistema não foi garantida, resultando em um projeto incompleto e não funcional.",
      status: "non_compliant",
      rationale:
        "A 'Metodologia de Implantação TOTVS - MIT' é descrita nas fls. 103. Contudo, o 'DOCUMENTO 08: status atual' (fls. 169) afirma categoricamente que 'o projeto está incompleto, sequer a fase de implantação foi concluída'. As descrições da Martinello nas fls. 172-176 e 180-181 detalham inúmeras pendências e falhas em diversos módulos e personalizações, como 'Há erros de parametrização, o que impede o fechamento da folha' (fls. 172) e 'Módulo está sendo testado, pois foram solicitadas algumas alterações recentemente que não foram aplicadas e sem elas não pode entrar em funcionamento' (fls. 174). Além disso, problemas de 'LENTIDÃO NAS IMPORTAÇÕES' e 'RM APRESENTANDO LENTIDÃO ACIMA DO ESPERADO' (fls. 183) indicam que o sistema não estava operacional conforme o esperado. O e-mail de Osvaldo Martinello (fls. 198) também menciona que 'Nosso projeto esta atrazado na implantação, por esta razão obviamente não estamos usufruindo do sistema'.",
      notes:
        "A não conclusão do projeto e a persistência de falhas operacionais e de parametrização demonstram que as fases críticas da MIT, como execução e encerramento, não foram adequadamente finalizadas.",
    },
    {
      id: "q-031",
      block: 2,
      question:
        "A Matriz de Responsabilidades (MIT034), preconizada pela Metodologia de Implantação TOTVS, foi apresentada nos autos, permitindo identificar claramente as responsabilidades de cada parte na implantação do projeto, conforme fls. 116?",
      answer:
        "Não, a Matriz de Responsabilidades (MIT034) não foi apresentada nos autos, impossibilitando a clara identificação das responsabilidades de cada parte na implantação do projeto.",
      status: "non_compliant",
      rationale:
        "Conforme o 'Contexto adicional', referenciando as fls. 116 dos autos, 'não é possível asseverar a relação de responsabilidades pois a Matriz de Responsabilidades (MIT034), preconizada pela Metodologia de Implantação Totvs, não foi observada nos autos'.",
      notes:
        "A ausência deste documento crucial dificulta a atribuição formal de responsabilidades pelas falhas e atrasos na implantação do sistema.",
    },
    {
      id: "q-032",
      block: 2,
      question:
        "As funcionalidades dos módulos listadas nas fls. 100 a 116, incluindo Gestão de Pessoal (GPE/RM), Estoque, Faturamento, Compras, Financeiro, Tributário, SPED Fiscal, SPED Contábil e SPED PIS/COFINS, foram integralmente implantadas e estão operacionais no sistema fornecido pelas rés?",
      answer:
        "Não, as funcionalidades dos módulos listadas nas fls. 100 a 116 não foram integralmente implantadas e não estavam operacionais no sistema fornecido pelas rés, apresentando diversas pendências e falhas.",
      status: "non_compliant",
      rationale:
        "O 'DOCUMENTO 08: status atual' (fls. 169) indica que 'o projeto está incompleto, sequer a fase de implantação foi concluída'. As descrições da Martinello (fls. 172-176) detalham falhas específicas por módulo: no 'PROCESSO DE GESTÃO DE PESSOAL (RM)', há 'erros de parametrização, o que impede o fechamento da folha' (fls. 172); no 'PROCESSO DE PONTO ELETRÔNICO (RM)', 'Pontos não estão sendo importados corretamente' (fls. 173); no 'PROCESSO DE GESTÃO DE ASSISTÊNCIA TÉCNICA', o módulo 'ainda não foi testado, pois está faltando campos e dados corretos para efetuar estes testes' (fls. 174); no 'PROCESSO DE PATRIMÔNIO (ATIVO FIXO)', 'pouco foi visto deste módulo, necessitando maior acompanhamento' (fls. 175). Para o 'PROCESSO DE LIVROS FISCAIS', embora a TOTVS afirme parametrização, a Martinello reporta 'problemas nas importações, o que impossibilita testes reais' (fls. 178). Além disso, problemas gerais como 'LENTIDÃO NAS IMPORTAÇÕES' e 'RM APRESENTANDO LENTIDÃO ACIMA DO ESPERADO' (fls. 183) comprometem a operacionalidade de múltiplos módulos.",
      notes:
        "A falta de operacionalidade e a incompletude dos módulos essenciais, conforme detalhado pela Autora, impediram o uso satisfatório do sistema, impactando diretamente as operações empresariais.",
    },
    {
      id: "q-033",
      block: 2,
      question:
        "As personalizações e desenvolvimentos específicos solicitados pela autora, conforme detalhado nas fls. 124 e 180-181, foram concluídos e integrados ao sistema TOTVS Protheus?",
      answer:
        "Não, a maioria das personalizações e desenvolvimentos específicos solicitados pela autora, conforme detalhado nas fls. 124 e 180-181, não foram concluídos e integrados ao sistema TOTVS Protheus.",
      status: "non_compliant",
      rationale:
        "As 'PERSONALIZAÇÕES' solicitadas pela autora estão listadas nas fls. 124. O 'DOCUMENTO 08: status atual' (fls. 180-181) categoriza essas personalizações em 'ENTREGUES' e 'PENDENTES'. Das personalizações listadas como 'ENTREGUES', apenas 'PRECIFICACÃO DE PRODUTOS' é marcada como 'ok'. Todas as demais, como 'CENTRAL DE COMPRAS – FORMULA DE DISTRIBUIÇÃO', 'CONTROLE DE TABLOIDE', 'CONTROLE DE COMISSÃO/COTAS', 'CONTROLE DE BONIFICAÇÃO', 'META DE VENDAS – CADASTROS', 'RELATÓRIO DE GIRO MARTINELLO', 'CONTROLE DE PROTEÇÃO DE PREÇO – VENDA DE CELULAR', 'CONTROLE DE MIX POR LOJA' e 'RELATÓRIO DE SEPARAÇÃO PARA CARGA/EXPEDIÇÃO', são explicitamente marcadas como 'não concluído'. A seção 'PENDENTES' (fls. 180-181) lista uma vasta gama de itens, incluindo 'SISPPAG – FOLHA DE PAGAMENTOS BANCO DO BRASIL', 'CONCILIAÇÃO BANCÁRIA BANCO DO BRASIL', 'CONCILIAÇÃO CARTÃO DE CRÉDITO – CIELO', 'RELATÓRIO DE INVENTÁRIO CONSOLIDADO', 'CONCLUSÃO DO MÓDULO DO RH', entre outros, confirmando a não conclusão e integração.",
      notes:
        "A ausência de conclusão da maioria das personalizações e desenvolvimentos específicos demonstra uma falha substancial na entrega do sistema conforme as necessidades acordadas da Autora.",
    },
    {
      id: "q-034",
      block: 2,
      question:
        "O sistema TOTVS Protheus foi homologado para o sistema operacional da autora, e os problemas de lentidão nas importações e no módulo RM, bem como a falta de campos em telas HTML, foram solucionados pelas rés, conforme fls. 183?",
      answer:
        "Não, o sistema TOTVS Protheus não foi homologado para o sistema operacional da autora, e os problemas de lentidão nas importações e no módulo RM, bem como a falta de campos em telas HTML, não foram solucionados pelas rés.",
      status: "non_compliant",
      rationale:
        "O 'DOCUMENTO 08: status atual' (fls. 183) declara expressamente que 'PROTHEUS NÃO FOI HOMOLOGADO PARA O NOSSO SISTEMA OPERACIONAL'. O mesmo documento aponta que 'CLIENTE HTML APRESENTA PROBLEMAS, AONDE FALTAM CAMPOS EM ALGUMAS TELAS DO SISTEMA, NÃO FOI APRESENTADO SOLUÇÃO ATÉ O MOMENTO', indicando a persistência do problema e a ausência de solução. Adicionalmente, são listados 'LENTIDÃO NAS IMPORTAÇÕES' e 'RM APRESENTANDO LENTIDÃO ACIMA DO ESPERADO', sem qualquer indicação de que tais problemas tenham sido resolvidos.",
      notes:
        "A falta de homologação e a persistência de problemas críticos de desempenho e funcionalidade em interfaces essenciais comprometem fundamentalmente a usabilidade e a estabilidade do sistema para a Autora.",
    },
    {
      id: "q-035",
      block: 2,
      question:
        "O 'DOCUMENTO 08: status atual' (fls. 169) e as descrições da Martinello nas fls. 172-176 e 180-181 comprovam que o projeto de implantação do sistema TOTVS Protheus estava incompleto e com diversas pendências, impedindo o uso satisfatório pela autora?",
      answer:
        "Sim, o 'DOCUMENTO 08: status atual' (fls. 169) e as descrições da Martinello nas fls. 172-176 e 180-181 comprovam de forma inequívoca que o projeto de implantação do sistema TOTVS Protheus estava incompleto e com diversas pendências, impedindo o uso satisfatório pela autora.",
      status: "compliant",
      rationale:
        "O 'DOCUMENTO 08: status atual' (fls. 169) declara que 'o projeto está incompleto, sequer a fase de implantação foi concluída'. As descrições detalhadas da Martinello (fls. 172-176) apontam inúmeras falhas e pendências em módulos como Gestão de Pessoal ('erros de parametrização, o que impede o fechamento da folha', fls. 172), Ponto Eletrônico ('Pontos não estão sendo importados corretamente', fls. 173), e Gestão de Assistência Técnica ('Módulo ainda não foi testado, pois está faltando campos e dados corretos', fls. 174). A seção de 'PERSONALIZAÇÕES' (fls. 180-181) lista a maioria dos itens como 'não concluído' ou 'PENDENTES'. A conclusão de que a Autora 'não pôde usufruir a contento do sistema como fora contratado' (fls. 129, 130, 132) é uma consequência direta da incompletude e das pendências documentadas.",
      notes:
        "A consistência das informações entre o documento de status e as descrições detalhadas da Autora reforça a comprovação do inadimplemento contratual e da inviabilidade de uso do sistema.",
    },
    {
      id: "q-036",
      block: 2,
      question:
        "Os e-mails trocados entre a autora e as rés (documento 09, fls. 184-198) demonstram que a autora reiteradamente comunicou o atraso na implantação do sistema e a impossibilidade de utilizá-lo a contento?",
      answer:
        "Sim, os e-mails trocados entre a autora e as rés (documento 09, fls. 184-198) demonstram que a autora reiteradamente comunicou o atraso na implantação do sistema e a impossibilidade de utilizá-lo a contento.",
      status: "compliant",
      rationale:
        "O 'DOCUMENTO 09: E-mails trocados entre a autora e a rés' (fls. 184) é apresentado como prova de 'INADIMPLEMENTO É LATENTE POR PARTE DAS RÉS'. Em 22 de janeiro de 2013, Osvaldo Martinello enviou um e-mail a Jonkel Magalhães Melo (fls. 185-186) afirmando: 'estamos com nosso projeto andando a dezoito meses em sem solução'. Em 1º de novembro de 2012, Osvaldo Martinello comunicou (fls. 191): 'estar pagando por algo que não estamos usando, ocasionado pelo atraso da implantação do projeto'. Em 1º de outubro de 2012, ele reiterou (fls. 194): 'definitivamente não mais pagaremos por serviços não fornecidos... até a conclusão dos trabalhos de implantação do seu sistema'. Já em 2 de abril de 2012, Osvaldo Martinello havia informado (fls. 198): 'Nosso projeto esta atrazado na implantação, por esta razão obviamente não estamos usufruindo do sistema'.",
      notes:
        "A cronologia e o teor dos e-mails evidenciam uma comunicação contínua e persistente da Autora sobre os problemas de atraso e não utilização do sistema, desde os estágios iniciais da implantação.",
    },
    {
      id: "q-037",
      block: 2,
      question:
        "As rés, por meio de seus representantes, reconheceram o atraso na implantação do projeto e a não utilização do sistema pela autora, conforme evidenciado nos e-mails (fls. 194, 197)?",
      answer:
        "Sim, as rés, por meio de seus representantes, reconheceram implicitamente o atraso na implantação do projeto e a não utilização do sistema pela autora, conforme evidenciado nos e-mails.",
      status: "compliant",
      rationale:
        "Em e-mail de 2 de outubro de 2012 (fls. 194), Jonkel Magalhães (CEO da Unidade TOTVS Mato Grosso, Rondônia e Acre) respondeu às reclamações da Autora afirmando: 'o que mais desejo e fazer a entrega de todo o projeto e estamos quase no fim'. Embora não seja uma admissão direta de atraso, a frase 'estamos quase no fim' em resposta a um projeto de 18 meses sem solução (fls. 185) implica reconhecimento do status prolongado. Mais explicitamente, em 9 de abril de 2012 (fls. 197), Robson Costa (representante da TOTVS) informou: 'O Jonkel e Leonardo negociou junto a TOTVS mais 3 meses de carência para a mensalidade do sistema. Obrigado pela compreensão, e estaremos acelerando os passos rumo a entrega do projeto e satisfação de vocês'. A concessão de carência e o compromisso de 'acelerar os passos rumo a entrega do projeto' são claros indicativos do reconhecimento do atraso e da insatisfação da Autora com a não utilização do sistema.",
      notes:
        "O reconhecimento do atraso e da não utilização do sistema pelas rés, manifestado através da negociação de carências e do compromisso de acelerar a entrega, corrobora as alegações da Autora.",
    },
    {
      id: "q-038",
      block: 2,
      question:
        "As cobranças mensais de Serviços Mensais de Software de Tecnologia (SMS), no valor de R$ 5.332,23 (doc. 07, fls. 160) e R$ 5.403,41 (fls. 201), foram emitidas e exigidas pelas rés mesmo diante do reconhecimento de que o sistema não estava implantado e não podia ser usufruído pela autora?",
      answer:
        "Sim, as cobranças mensais de Serviços Mensais de Software de Tecnologia (SMS) foram emitidas e exigidas pelas rés, mesmo diante do reconhecimento de que o sistema não estava implantado e não podia ser usufruído pela autora.",
      status: "compliant",
      rationale:
        "O 'DOCUMENTO 07: BOLETO DE COBRANÇA' (fls. 160) comprova a emissão de cobrança no valor de R$ 5.332,23 com vencimento em 06/06/2013, referente a 'Contrato de manutencao SMS'. Similarmente, as fls. 201 apresentam um RPS no valor de R$ 5.403,41, com vencimento em 06/04/2012, também para 'Contrato de manutenção SMS'. A Autora alega nas fls. 55 que 'As rés insistem na cobrança mensal de R$ 5.332,23... embora NÃO tenham cumprido sua parte'. Os e-mails confirmam o conhecimento das rés sobre a situação: em 2 de abril de 2012, Osvaldo Martinello solicitou a suspensão da cobrança, pois 'Nosso projeto esta atrazado na implantação, por esta razão obviamente não estamos usufruindo do sistema' (fls. 198). Em resposta, Robson Costa (fls. 197) informou que 'O Jonkel e Leonardo negociou junto a TOTVS mais 3 meses de carência para a mensalidade do sistema', o que demonstra que as cobranças estavam sendo realizadas e que a situação de não uso era conhecida e motivou a negociação de carência.",
      notes:
        "A continuidade das cobranças de SMS, mesmo com o projeto em atraso e o sistema não usufruído, e a negociação de carências, indicam uma postura das rés de exigir pagamentos por serviços que não estavam sendo plenamente entregues.",
    },
    {
      id: "q-039",
      block: 2,
      question:
        "A ameaça de negativação do nome da autora em serviços de proteção ao crédito, conforme e-mails (fls. 191, 192, 193) e o documento 07 (fls. 51, 160), ocorreu em razão da recusa da autora em pagar por serviços de SMS não usufruídos?",
      answer:
        "Sim, a ameaça de negativação do nome da autora em serviços de proteção ao crédito ocorreu em razão da recusa da autora em pagar por serviços de SMS não usufruídos, conforme evidenciado nos e-mails e no documento 07.",
      status: "compliant",
      rationale:
        "O e-mail de Osvaldo Martinello de 1º de novembro de 2012 (fls. 191) expressa claramente: 'O que está em jogo aqui não é o valor da mensalidade, mas sim estar pagando por algo que não estamos usando, ocasionado pelo atraso da implantação do projeto'. Ele também roga 'não deixar protestar este título' e pede orientação para pagamento 'sem que seja no serasa'. Ricardo Massaru Tanaka (TOTVS) respondeu no mesmo dia (fls. 191): 'Com relação à retirada do Serasa basta me informar a data em que será quitada, que solicitarei a prorrogação do título', confirmando a iminência da negativação. Romo Martinello, em 31 de outubro de 2012 (fls. 192), encaminhou um 'comunicado do Serasa... sobre a inclusão da Eletromar pela Totvs, é da parcela que venceu no dia 06/10/12'. O 'documento 07' (fls. 51) aponta que as requeridas 'exigir pagamento indevido, registrando inclusive, a hipótese de se o mesmo não se efetivar no vencimento, o nome da Autora... ser incluído (negativado) no serviço de proteção ao crédito!'. O próprio boleto de cobrança (fls. 160) contém a instrução: 'Após 10 dias do vencimento o débito será inscrito automaticamente em cadastro de proteção ao crédito'.",
      notes:
        "A documentação comprova que a negativação foi uma medida coercitiva das rés para forçar o pagamento de mensalidades de SMS, mesmo diante da contestação da Autora sobre a ausência de contraprestação integral dos serviços.",
    },
    {
      id: "q-040",
      block: 2,
      question:
        "Os pagamentos realizados pela autora, totalizando R$ 675.479,12 (atualizado para R$ 876.383,30, fls. 49, 65), incluindo despesas de viagens (Pág. 45-46), treinamento e-learning (fls. 46), aquisição de banco de dados (fls. 4739), compra de servidores (fls. 47-48), licenças de sistema operacional (fls. 48) e serviços de instalação/configuração (Pág. 49), foram efetuados em conformidade com o contrato, mas sem a contraprestação integral e satisfatória das rés?",
      answer:
        "Sim, os pagamentos realizados pela autora, totalizando R$ 675.479,12 (atualizado para R$ 876.383,30), foram efetuados em conformidade com o contrato, porém sem a contraprestação integral e satisfatória das rés.",
      status: "compliant",
      rationale:
        "O total pago pela autora é de R$ 675.479,12, atualizado para R$ 876.383,30 (fls. 49, 65). As evidências detalham os pagamentos específicos: 'despesas de viagens dos profissionais contratados pelas rés, conforme previsto no referido contrato' (Pág. 45-46); 'treinamento e-learning... do documento 05 incluso' (fls. 46); 'aquisição de banco de dados para suporte do sistema a ser implantado, conforme evidencia o documento 04, item 1.1 em apenso' (fls. 4739); 'compra de servidores para uso de instalação do programa TOTVS: ITEM 09 DO DOC 02 em anexo' (fls. 47-48); 'aquisição de 02 licenças do sistema operacional dos servidores... ficou acordado a condição de que o software da Ré deveria rodar via sistema operacional \"linux\"' (fls. 48); e 'instalação e configuração de 02 licenças do sistema operacional dos servidores e do sistema de banco de dados' (Pág. 49). A conformidade dos pagamentos com o contrato é estabelecida por essas referências. A ausência de contraprestação integral e satisfatória é comprovada pela incompletude do projeto (fls. 169), as inúmeras pendências e falhas nos módulos e personalizações (fls. 172-176, 180-181), a falta de homologação e problemas de desempenho (fls. 183), e a impossibilidade de uso a contento do sistema pela autora, conforme reiteradamente comunicado (fls. 185-198).",
      notes:
        "A Autora cumpriu integralmente suas obrigações financeiras e de infraestrutura, enquanto as rés falharam na entrega de um sistema funcional e completo, conforme o escopo contratado.",
    },
    {
      id: "q-041",
      block: 2,
      question:
        "A autora arcou com a aquisição de 02 (dois) servidores para o banco de dados e para a aplicação Protheus, conforme recomendação da Proposta Comercial (fls. 118), e com as licenças do sistema operacional 'linux' (fls. 48), cumprindo sua parte na provisão da infraestrutura necessária?",
      answer:
        "Sim, a autora arcou com a aquisição de 02 (dois) servidores para o banco de dados e para a aplicação Protheus, conforme recomendação da Proposta Comercial, e com as licenças do sistema operacional 'linux', cumprindo sua parte na provisão da infraestrutura necessária.",
      status: "compliant",
      rationale:
        "A 'Proposta Comercial – Serviços Complementares de Software (SCS)' (fls. 118) continha a 'recomendação que a Autora adquira 02 (dois) servidores sendo um para o banco de dados e o outro para a aplicação – Protheus'. A evidência '5.5 - DOS PAGAMENTOS EFETUADOS A TÍTULO DE COMPRA DE SERVIDORES PARA USO DE INSTALAÇÃO DO PROGRAMA TOTVS' (fls. 47-48) comprova que 'a autora pagou o valor de R$ 20.727,42' pela aquisição dos servidores. Adicionalmente, a evidência '5.6 - PAGAMENTO PARA AQUISIÇÃO DE 02 LICENÇAS DO SISTEMA OPERACIONAL DOS SERVIDORES' (fls. 48) demonstra que 'a autora pagou às rés o valor de R$ 3.272,52' pelas licenças, e que 'ficou acordado a condição de que o software da Ré deveria rodar via sistema operacional \"linux\"'. O pagamento para 'instalação e configuração de 02 licenças do sistema operacional dos servidores e do sistema de banco de dados' (Pág. 49) reforça o cumprimento da provisão de infraestrutura.",
      notes:
        "A Autora demonstrou diligência ao prover a infraestrutura recomendada e acordada, evidenciando seu compromisso com a implantação do sistema.",
    },
    {
      id: "q-042",
      block: 2,
      question:
        "A autora está há mais de um ano sem operar um sistema que atenda às suas necessidades empresariais, resultando em perdas na gestão e condução do negócio, conforme alegado nas fls. 58?",
      answer:
        "Sim, a autora alegou estar há mais de um ano sem operar um sistema que atenda às suas necessidades empresariais, resultando em perdas na gestão e condução do negócio, e essa alegação é corroborada pelas comunicações e o status do projeto.",
      status: "compliant",
      rationale:
        "A alegação da autora nas fls. 58, sob o título 'PERDAS DIRETAS OU INDIRETAS', é que está 'há mais de 01 ano, de sua estimativa sem operar sistema que atenda suas atuais necessidades empresariais'. Esta afirmação é corroborada por e-mails, como o de Osvaldo Martinello de 22 de janeiro de 2013 (fls. 185-186), que menciona: 'estamos com nosso projeto andando a dezoito meses em sem solução'. Considerando que o negócio foi firmado em julho de 2011 (fls. 128, 144), 18 meses depois (janeiro de 2013) excede significativamente um ano. A comunicação de 1º de novembro de 2012 (fls. 191) também indica que o sistema não estava sendo usado pela autora: 'quem esta até aqui usando o \"sistema\" é unicamente os técnicos da própria Totvs'. O 'DOCUMENTO 08: status atual' (fls. 169) confirma que 'o projeto está incompleto, sequer a fase de implantação foi concluída', o que impede o uso satisfatório do sistema.",
      notes:
        "A prolongada inoperância de um sistema adequado, conforme a linha do tempo e o status do projeto, sugere um impacto significativo nas operações e na capacidade de gestão da Autora.",
    },
    {
      id: "q-043",
      block: 2,
      question:
        "A distinção entre os módulos TOTVS | Gestão de Pessoal - GPE (Protheus) e a linha RM, e a ausência de referência à linha RM ou eventual integração entre os sistemas Protheus e RM na Proposta Comercial (fls. 104), impactaram a correta implantação do módulo de Gestão de Pessoal para a autora?",
      answer:
        "Sim, a distinção entre os módulos TOTVS | Gestão de Pessoal - GPE (Protheus) e a linha RM, e a ausência de referência à linha RM ou eventual integração entre os sistemas Protheus e RM na Proposta Comercial (fls. 104), impactaram a correta implantação do módulo de Gestão de Pessoal para a autora.",
      status: "compliant",
      rationale:
        "O 'Contexto adicional' (fls. 104) esclarece que 'às fls.103 da mesma Proposta há indicações que apontam para o módulo Totvs | Gestão de Pessoal - GPE e não ao módulo RM', e que 'a linha RM se trata de um sistema apartado e independente do sistema Protheus e na Proposta Comercial – Serviços Complementares de Software (SCS) não há qualquer referência a linha RM ou eventual integração entre os sistemas Protheus e RM'. Contudo, as descrições da Martinello (fls. 172-173) referem-se explicitamente ao 'PROCESSO DE GESTÃO DE PESSOAL (RM)' e 'PROCESSO DE PONTO ELETRÔNICO (RM)', indicando que a linha RM foi de fato parte da implantação. Nestes módulos, são reportados 'erros de parametrização, o que impede o fechamento da folha' (fls. 172), 'problemas no fechamento da folha, tendo pendências de parametrização e diferenças de cálculos diversos' (fls. 173), e 'RM APRESENTANDO LENTIDÃO ACIMA DO ESPERADO' (fls. 183). A discrepância entre o que foi proposto (GPE Protheus) e o que foi implementado (RM), juntamente com os problemas operacionais e de parametrização encontrados na linha RM, demonstra um impacto negativo na correta implantação do módulo de Gestão de Pessoal.",
      notes:
        "A divergência entre o escopo contratual e a execução, aliada às falhas técnicas no módulo RM, gerou complexidades e impedimentos para a plena funcionalidade da gestão de pessoal da Autora.",
    },
  ],
};

export const evidenceDossiers: EvidenceDossier[] = [eletromarDossier];

export function getEvidenceDossier(caseId: string): EvidenceDossier | undefined {
  return evidenceDossiers.find((dossier) => dossier.caseId === caseId);
}
