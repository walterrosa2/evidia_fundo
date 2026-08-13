/**
 * Pareceres Nulidade360 — dados extraídos dos relatórios de auditoria jurídico-pericial.
 *
 * Gerado a partir dos arquivos `nulidade360_caso_*.docx` pelo script
 * `scripts/gerar_nulidade.py`. Cada achado preserva os campos do parecer original:
 * fundamento jurídico, dever violado, ato afetado, inferência, prejuízo, nexo causal,
 * impacto processual, estratégia, ação recomendada e evidências mapeadas — além dos
 * metadados de classificação (pilar, categoria, natureza do vício, nível de risco, score,
 * força da evidência, suporte no mapa, valor estratégico e risco de preclusão).
 *
 * NÃO EDITAR À MÃO: regenerar a partir dos pareceres.
 */

import type { RiskLevel } from "./mockRealCasesV2";

export type NullityPillarId =
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "P5"
  | "P6"
  | "P7"
  | "P8"
  | "P9"
  | "P10"
  | "P11"
  | "P12"
  | "P13"
  | "P14";

export interface NullityPillarCatalogEntry {
  id: NullityPillarId;
  name: string;
  scope: string;
}

/** Os 14 pilares auditados pelo Nulidade360. */
export const NULLITY_PILLARS: NullityPillarCatalogEntry[] = [
  {
    id: "P1",
    name: "Competência e Jurisdição",
    scope: "Incompetência absoluta, prevenção ignorada, distribuição, conexão e continência.",
  },
  {
    id: "P2",
    name: "Magistrado, Impedimento e Suspeição",
    scope: "Imparcialidade objetiva do juízo e tratamento simétrico das partes.",
  },
  {
    id: "P3",
    name: "Contraditório e Ampla Defesa",
    scope:
      "Intimações, oportunidade real de manifestação, decisão surpresa e indeferimento de prova.",
  },
  {
    id: "P4",
    name: "Produção da Prova",
    scope:
      "Origem, autenticidade e integridade da prova; produção unilateral e alteração do objeto.",
  },
  {
    id: "P5",
    name: "Nulidades Periciais",
    scope:
      "Qualificação do perito, cronograma, resposta a quesitos, limites do objeto e metodologia.",
  },
  {
    id: "P6",
    name: "Assistentes Técnicos",
    scope: "Conflito de interesse, vínculo econômico e influência indevida.",
  },
  {
    id: "P7",
    name: "Cadeia Decisória",
    scope: "Omissão de provas, quesitos, impugnações e contradições relevantes do laudo.",
  },
  {
    id: "P8",
    name: "Motivação e Fundamentação",
    scope:
      "Fundamentação aparente, genérica, contraditória ou sem enfrentamento dos argumentos centrais.",
  },
  {
    id: "P9",
    name: "Nulidades Recursais",
    scope:
      "Omissão persistente, negativa de prestação jurisdicional e vício em julgamento colegiado.",
  },
  {
    id: "P10",
    name: "Nulidades de Execução",
    scope: "Cálculo, liquidação, penhora, avaliação e perícia contábil sem contraditório.",
  },
  {
    id: "P11",
    name: "Governança Processual",
    scope: "Concentração de nomeações, critério dirigido e governança na escolha do perito.",
  },
  {
    id: "P12",
    name: "Nulidades Tecnológicas",
    scope:
      "Auditabilidade de prova digital, sistemas, algoritmos e IA; logs, autenticação e integridade.",
  },
  {
    id: "P13",
    name: "Violação de Normas Técnicas",
    scope: "Observância concreta das normas técnicas aplicáveis, e não citação decorativa.",
  },
  {
    id: "P14",
    name: "Descoberta Superveniente",
    scope:
      "Fato superveniente que compromete imparcialidade, prova, cadeia de custódia ou legitimidade.",
  },
];

export interface NullityEvidence {
  page: number;
  excerpt: string;
}

export interface NullityFinding {
  id: string;
  /** Número do quesito no parecer. */
  index: number;
  /** Pergunta de auditoria respondida pelo achado. */
  question: string;
  pillar: NullityPillarId;
  category: string;
  defectNature: string;
  riskLevel: RiskLevel;
  /** Score do achado (0–100). Nulo quando o parecer não o apurou. */
  score: number | null;
  evidenceStrength: string;
  evidenceMapSupport: string;
  strategicValue: string;
  preclusionRisk: string;
  legalBasis: string;
  breachedDuty: string;
  affectedAct: string;
  inference: string;
  prejudice: string;
  causalLink: string;
  proceduralImpact: string;
  strategy: string;
  recommendedAction: string;
  evidenceNotes: string;
  evidences: NullityEvidence[];
}

export interface NullityPillarScore {
  pillar: NullityPillarId;
  score: number;
  level: RiskLevel;
  findingCount: number;
}

export interface NullityReport {
  caseId: string;
  globalScore: number;
  globalLevel: RiskLevel;
  acceptedFindings: number;
  /** Texto da explicação do score, como consta do parecer. */
  scoreExplanation: string;
  weightedAverage: number;
  maxRisk: number;
  criticalFindings: number;
  affectedPillars: number;
  pillarScores: NullityPillarScore[];
  findings: NullityFinding[];
}

export const eletromarNullityReport: NullityReport = {
  caseId: "case-eletromar-totvs",
  globalScore: 46.73,
  globalLevel: "moderate",
  acceptedFindings: 20,
  scoreExplanation:
    "Score calculado por ponderacao juridico-pericial: media ponderada 24.2, maior risco 99.29, 0 achado(s) critico(s) e 4 pilar(es) afetado(s).",
  weightedAverage: 24.2,
  maxRisk: 99.29,
  criticalFindings: 0,
  affectedPillars: 4,
  pillarScores: [
    { pillar: "P3", score: 45.21, level: "moderate", findingCount: 3 },
    { pillar: "P4", score: 4.32, level: "low", findingCount: 1 },
    { pillar: "P7", score: 2.92, level: "low", findingCount: 1 },
    { pillar: "P8", score: 2.33, level: "low", findingCount: 1 },
  ],
  findings: [
    {
      id: "el-n01",
      index: 1,
      question:
        "Ha indicios de incompetencia absoluta, prevencao ignorada ou julgamento por orgao sem competencia legal?",
      pillar: "P1",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "",
      inference:
        "Os documentos apresentados não indicam qualquer indício de incompetência absoluta, prevenção ignorada ou julgamento por órgão sem competência legal. A distribuição e o trâmite processual parecem regulares.",
      prejudice: "Não há prejuízo à defesa ou ao processo.",
      causalLink: "Não aplicável.",
      proceduralImpact: "Não há impacto procedimental a ser considerado.",
      strategy: "Nenhuma ação necessária.",
      recommendedAction: "Nenhuma ação recomendada.",
      evidenceNotes:
        "Nenhum documento relacionado à análise de competência foi identificado como relevante.",
      evidences: [],
    },
    {
      id: "el-n02",
      index: 2,
      question:
        "A distribuicao, conexao, continencia ou prevencao foi enfrentada de forma adequada?",
      pillar: "P1",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "",
      inference:
        "A análise da documentação, incluindo a certidão de distribuição (fls. 1), indica que o processo foi distribuído de forma regular. Não há evidências de conexão, continência ou prevenção que tenham sido ignoradas ou tratadas de forma inadequada.",
      prejudice: "Não há prejuízo à defesa ou ao processo.",
      causalLink: "Não aplicável.",
      proceduralImpact: "Não há impacto procedimental a ser considerado.",
      strategy: "Nenhuma ação necessária.",
      recommendedAction: "Nenhuma ação recomendada.",
      evidenceNotes:
        "Nenhum documento específico sobre conexão, continência ou prevenção foi mapeado.",
      evidences: [],
    },
    {
      id: "el-n03",
      index: 3,
      question: "Ha elementos documentais de impedimento ou suspeicao do magistrado?",
      pillar: "P2",
      category: "Imparcialidade Judicial",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Imparcialidade do Juiz",
      affectedAct: "Processo Judicial",
      inference:
        "Nao foram apresentados nos autos quaisquer indicios que sugiram impedimento ou suspeicao do magistrado.",
      prejudice: "Nao ha indicativo de prejuizo a defesa ou ao resultado processual.",
      causalLink: "Ausencia de fatos que demonstrem vulneracao a imparcialidade.",
      proceduralImpact: "Nao ha impacto procedimental a ser considerado neste momento.",
      strategy: "Nao ha necessidade de atuacao juridica.",
      recommendedAction: "Monitorar futuras manifestacoes processuais.",
      evidenceNotes:
        "O analise se baseou exclusivamente nos documentos fornecidos, os quais nao contem informacoes sobre impedimento ou suspeicao do magistrado.",
      evidences: [],
    },
    {
      id: "el-n04",
      index: 4,
      question: "A decisao revela parcialidade objetiva ou tratamento assimetrico das partes?",
      pillar: "P2",
      category: "Imparcialidade Judicial",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Imparcialidade do Juiz",
      affectedAct: "Processo Judicial",
      inference:
        "A ausência de uma decisão judicial no bloco analisado impede a avaliação de parcialidade objetiva ou tratamento assimetrico das partes.",
      prejudice: "Impossivel avaliar prejuizo sem a analise da decisao judicial.",
      causalLink: "A ausencia da decisao judicial impede a conclusao sobre eventual parcialidade.",
      proceduralImpact: "Nao ha impacto procedimental a ser considerado neste momento.",
      strategy: "Aguardar a juntada de decisao para analise posterior.",
      recommendedAction: "Analisar as decisões judiciais quando estas forem juntadas ao processo.",
      evidenceNotes:
        "O analise se baseou exclusivamente nos documentos fornecidos, os quais nao contem decisao judicial para analise de parcialidade.",
      evidences: [],
    },
    {
      id: "el-n05",
      index: 5,
      question:
        "As partes foram intimadas e tiveram oportunidade real de participar das diligencias e se manifestar sobre o laudo?",
      pillar: "P3",
      category: "Nulidade Relativa",
      defectNature: "inconclusivo",
      riskLevel: "moderate",
      score: 60.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "Art. 5º, LV, CF/88, Art. 7º, VIII, Lei nº 8.666/93, Art. 9º, 10º, 11º, CPC/2015",
      breachedDuty: "Dever de informar e oportunizar manifestação (Contraditório)",
      affectedAct:
        "Processo como um todo, especialmente a fase de produção de prova e manifestação sobre laudo",
      inference:
        "A ausência de comprovação de intimações específicas para participação em diligências ou para manifestação sobre o laudo pericial pode indicar que as partes não tiveram oportunidade real de exercer o contraditório substancial, configurando um potencial cerceamento de defesa.",
      prejudice:
        "A ausência de comprovação das intimações impede a verificação se as partes tiveram ciência e oportunidade de se manifestar sobre o laudo pericial e eventuais diligências, o que pode ter comprometido a defesa e a correta formação da convicção judicial.",
      causalLink:
        "A falta de elementos nos autos que demonstrem as intimações e a consequente oportunidade de manifestação das partes viola o princípio do contraditório, podendo levar à invalidação dos atos processuais subsequentes e da própria decisão judicial.",
      proceduralImpact:
        "Violação ao princípio do contraditório e da ampla defesa, podendo gerar nulidade processual se comprovado o prejuízo.",
      strategy: "Impugnação com pedido de nulidade e reabertura de prazo para manifestação.",
      recommendedAction:
        "Requerer a juntada aos autos de todas as intimações expedidas às partes e seus procuradores, com comprovação de recebimento e prazos para manifestação sobre o laudo pericial e eventuais diligências.",
      evidenceNotes:
        "O laudo pericial ainda não foi juntado, e a análise se baseia nos documentos processuais genéricos que não detalham as intimações.",
      evidences: [],
    },
    {
      id: "el-n06",
      index: 6,
      question:
        "Houve decisao surpresa, indeferimento imotivado de prova ou julgamento antecipado indevido?",
      pillar: "P3",
      category: "inconclusivo",
      defectNature: "inconclusivo",
      riskLevel: "moderate",
      score: 50.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "Art. 5º, LV, CF/88, Art. 370, 371, 475, CPC/2015",
      breachedDuty: "Dever de fundamentação das decisões e dever de permitir a produção de provas",
      affectedAct: "Decisão judicial (sentença)",
      inference:
        "A ausência de informações sobre pedidos de prova e decisões que os indeferiram, ou sobre a existência de julgamento antecipado, impossibilita a conclusão sobre a ocorrência de decisão surpresa ou cerceamento de defesa por indeferimento imotivado de prova. No entanto, a ausência de tais elementos nos documentos analisados levanta a possibilidade de que tais discussões não tenham ocorrido ou não foram devidamente documentadas, o que, por si só, não configura vício, mas requer atenção para a fase decisória.",
      prejudice:
        "A falta de fundamentação em decisões de indeferimento de provas ou a ocorrência de julgamento antecipado indevido pode ter privado as partes da oportunidade de produzir provas essenciais para o deslinde da causa, comprometendo o direito de defesa.",
      causalLink:
        "A ausência de registro de pedidos de prova e de decisões fundamentadas, ou a ocorrência de julgamento antecipado sem a devida análise das provas requeridas, viola o contraditório e a ampla defesa, podendo levar à nulidade da decisão.",
      proceduralImpact:
        "Potencial cerceamento de defesa se provas relevantes foram indeferidas sem motivação ou se a parte foi impedida de produzir provas necessárias à sua defesa.",
      strategy:
        "Análise aprofundada da sentença e das movimentações processuais para verificar a existência de pedidos de prova e a fundamentação das decisões judiciais.",
      recommendedAction:
        "Verificar nos autos principais se houve pedidos de produção de provas, manifestações sobre o indeferimento de provas e se a sentença foi proferida sem a devida análise ou produção de provas requeridas e pertinentes.",
      evidenceNotes:
        "A análise se baseia na ausência de documentos nos trechos fornecidos que comprovem ou refutem a ocorrência de decisões surpresa, indeferimento imotivado de prova ou julgamento antecipado indevido.",
      evidences: [],
    },
    {
      id: "el-n07",
      index: 7,
      question: "A prova documental possui origem, autenticidade e integridade verificaveis?",
      pillar: "P4",
      category: "Fragilidade probatória",
      defectNature: "fragilidade_tecnica",
      riskLevel: "low",
      score: 30.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "moderado",
      preclusionRisk: "baixo",
      legalBasis: "Art. 422 do Código Civil, Art. 373, I do Código de Processo Civil",
      breachedDuty: "Dever de boa-fé e lealdade processual",
      affectedAct: "Prova documental e testemunhal (gravações)",
      inference:
        "A ausência de métodos robustos para verificar a origem, autenticidade e integridade dos documentos, especialmente as gravações e transcrições, bem como os contratos e e-mails, pode fragilizar a prova, abrindo margem para questionamentos sobre sua fidedignidade. No entanto, a fase processual (laudo juntado) e a natureza dos documentos (contratos, e-mails) tornam a exigência de metadados complexa, mas não impossível.",
      prejudice:
        "A falta de comprovação robusta da autenticidade e integridade dos documentos pode levar à desconsideração dessas provas pelo juízo, enfraquecendo a argumentação das partes que delas se valem e, consequentemente, prejudicando o resultado da demanda.",
      causalLink:
        "A ausência de elementos que garantam a origem e integridade dos documentos (metadados, originais, validação técnica) cria uma dúvida razoável sobre sua fidedignidade, o que, se acolhido pelo juízo, prejudica a força probatória e a consequente decisão favorável à parte que apresentou tais provas.",
      proceduralImpact:
        "A fragilidade na comprovação da integridade e autenticidade documental pode ser utilizada como argumento para impugnar a força probatória dos elementos apresentados, comprometendo a defesa da parte que se beneficia dessas provas.",
      strategy:
        "Impugnação da prova documental e/ou solicitação de perícia técnica para atestar a autenticidade.",
      recommendedAction:
        "Solicitar esclarecimentos sobre a origem e integridade das provas documentais e audiovisuais, e, se possível, a exibição dos originais ou métodos de validação técnica.",
      evidenceNotes:
        "A análise se baseou nos documentos fornecidos no corpo do texto, como contratos, e-mails e transcrições de áudio. Não houve mapeamento específico de evidências para este item.",
      evidences: [],
    },
    {
      id: "el-n08",
      index: 8,
      question:
        "Houve producao unilateral, contradita ignorada, inspecao sem ciencia ou alteracao do objeto da prova?",
      pillar: "P3",
      category: "Nulidade relativa",
      defectNature: "irregularidade_simples",
      riskLevel: "moderate",
      score: 70.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis:
        "Art. 5º, LVI, da Constituição Federal, Art. 369 do Código de Processo Civil, Art. 413 do Código de Processo Civil",
      breachedDuty: "Dever de respeitar o contraditório",
      affectedAct: "Produção de prova (gravação de áudio e sua juntada aos autos)",
      inference:
        "A gravação de conversas, especialmente quando realizada por uma das partes sem o consentimento ou ciência da outra parte no momento da gravação, pode ser considerada prova unilateral. Embora contenha confissões das Rés, sua admissibilidade pode ser questionada sob o prisma do contraditório e da legalidade. A ausência de atas ou registros formais da produção dessa prova (gravação) impede a verificação se o contraditório foi respeitado.",
      prejudice:
        "A utilização de prova obtida unilateralmente, sem a devida garantia do contraditório para a parte contrária, pode resultar na sua desconsideração pelo juízo. Isso prejudica a parte que se valeu dessa prova, pois pode ter um argumento central enfraquecido, impactando diretamente o resultado da decisão.",
      causalLink:
        "A produção de uma gravação sem a ciência ou consentimento das partes envolvidas no momento da captação, e sua posterior juntada aos autos sem que estas tenham tido oportunidade de se manifestar sobre sua admissibilidade ou conteúdo durante a fase de produção probatória, configura um cerceamento ao contraditório, podendo levar à nulidade da prova.",
      proceduralImpact:
        "A admissibilidade da gravação como prova pode ser contestada pelas rés sob o argumento de violação ao contraditório e à ampla defesa, caso não demonstrem ter tido oportunidade de se manifestar sobre sua produção ou conteúdo no momento oportuno. Isso pode levar à desconsideração da prova.",
      strategy:
        "Impugnar a validade da prova de áudio por violação ao contraditório e requerer sua desconsideração. Subsidiariamente, pleitear a produção de provas em sentido contrário.",
      recommendedAction:
        "Impugnar a gravação como prova ilícita ou inadmissível por violação ao contraditório, ou, subsidiariamente, requerer que as rés sejam intimadas para se manifestarem sobre o conteúdo da gravação e sua admissibilidade.",
      evidenceNotes:
        "A análise se baseou nos trechos textuais que descrevem a gravação de uma reunião e sua posterior transcrição, indicando confissões das rés. Não houve mapeamento específico de evidências para este item.",
      evidences: [
        {
          page: 27,
          excerpt:
            "II.1 - DAS CONVERSAS HAVIDAS ENTRE O SÓCIO DA AUTORA E OS SRS. JONKEL MAGALHÃES e LEONARDO SHESSARENKO - DA JK Gestão Empresarial (Totvs Cuiabá): Além disso, em reunião realizada nas dependências da Autora, sendo a primeira ocorrida no dia 05.02.2013, entre o representante legal da Autora, Sr. Osvaldo Martinello e o diretor da ré JK Gestão Empresarial, Sr. JONKEL, gravada na ocasião, consta como prova irrefutável, DIANTE DA CONFISSÃO VÁLIDA E EFICAZ QUANDO AO INADIMPLEMENTO DAS RÉS. A gravação de ambas as conversas consta no DVD em anexo, bem como suas degravações (doc. 10 em anexo). Página 11",
        },
        {
          page: 31,
          excerpt:
            'Página 11/13 documento n° 10.1 anexo: -Reconhecimento acerca do prazo contratado para implantação do projeto: 6 a 8 meses; do problema no desenvolvimento e implantação do projeto envolvendo solidariamente as 02 requeridas; total desconhecimento do estágio do desenvolvimento do projeto, a ponto de solicitar data para levantamento e constatação: "Osvaldo" - É, nós pagamos no início a licença, aí o senhor me deu carência de 6 a 8 meses, alguma coisa assim, nessa manutenção, na presunção de que nesse tempo nós instalaria o sistema. "JONKEL" - Exatamente, era nossa meta, exatamente ééé, então, assi',
        },
      ],
    },
    {
      id: "el-n09",
      index: 9,
      question:
        "O perito apresenta impedimento, suspeição, conflito de interesse ou qualificacao incompatavel com o objeto?",
      pillar: "P5",
      category: "inconclusivo",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "pericia",
      inference:
        "A ausência de qualquer menção a um perito ou a um laudo pericial nos documentos analisados impede a verificação de impedimentos, suspeições ou qualificações incompatíveis com o objeto da perícia.",
      prejudice:
        "Sem a comprovação da existência de perícia e do perito, não se pode aferir qualquer prejuízo à defesa ou ao contraditório relacionado a esses aspectos.",
      causalLink:
        "A ausência de documentos que comprovem a realização de perícia e a identidade do perito impede a conexão entre um eventual vício e o prejuízo processual.",
      proceduralImpact:
        "Sem informações sobre a existência de uma perícia ou do perito, não é possível avaliar eventuais vícios relacionados à sua pessoa ou qualificações, o que impacta a análise de conformidade processual.",
      strategy:
        "Solicitar a juntada de documentos que comprovem a existência e os detalhes de eventual perícia realizada, se aplicável ao caso.",
      recommendedAction:
        "Requerer a juntada de documentos que comprovem a realização de perícia, a nomeação do perito e seu currículo, caso tenha havido tal prova no processo.",
      evidenceNotes:
        "Os documentos analisados não contêm informações sobre a realização de perícia ou a identidade de um perito.",
      evidences: [],
    },
    {
      id: "el-n10",
      index: 10,
      question:
        "O procedimento pericial teve cronograma, diligencias regulares, resposta a quesitos e limites do objeto respeitados?",
      pillar: "P5",
      category: "inconclusivo",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "pericia",
      inference:
        "A completa ausência de documentos relacionados a uma perícia (laudo, quesitos, atas, etc.) sugere que, caso tenha havido perícia, suas peças essenciais não foram fornecidas para análise.",
      prejudice:
        "Sem acesso aos documentos periciais, não é possível determinar se houve prejuízo à defesa, ao contraditório ou à correta formação da convicção judicial.",
      causalLink:
        "A inexistência de documentos periciais impede a ligação entre um vício procedimental e um prejuízo processual.",
      proceduralImpact:
        "A falta de acesso a qualquer documento relativo a uma perícia impede a verificação de sua regularidade procedimental, a resposta a quesitos e o respeito aos limites do objeto pericial, comprometendo a análise da prova.",
      strategy:
        "Requerer a apresentação de todos os documentos relativos à perícia judicial, caso tenha ocorrido.",
      recommendedAction:
        "Solicitar a juntada do laudo pericial, dos quesitos formulados, das respostas apresentadas e de eventuais atas ou documentos que detalhem o procedimento pericial.",
      evidenceNotes:
        "Os documentos analisados não contêm qualquer informação sobre a realização de perícia, incluindo laudo, quesitos ou atas de diligências.",
      evidences: [],
    },
    {
      id: "el-n11",
      index: 11,
      question:
        "A metodologia possui validacao cientifica, repetibilidade, rastreabilidade, margem de erro e precisao suficientes?",
      pillar: "P5",
      category: "inconclusivo",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "pericia",
      inference:
        "A ausência de qualquer documento que descreva a metodologia de uma suposta perícia impede a análise de sua adequação científica e técnica.",
      prejudice:
        "Sem informações sobre a metodologia pericial, não se pode determinar se houve prejuízo à defesa ou à validade da prova.",
      causalLink:
        "A ausência de dados sobre a metodologia pericial impossibilita a conexão entre um vício técnico e um prejuízo processual.",
      proceduralImpact:
        "A falta de informações sobre a metodologia pericial impede a verificação de sua robustez técnica e científica, o que pode comprometer a confiabilidade da prova e a fundamentação da decisão judicial.",
      strategy:
        "Se houver perícia, requerer a juntada do laudo e de toda a documentação que comprove a metodologia utilizada.",
      recommendedAction:
        "Caso tenha havido perícia, solicitar a apresentação do laudo pericial e de documentos que detalhem a metodologia utilizada, incluindo literatura, validação, testes, parâmetros, margem de erro e repetibilidade.",
      evidenceNotes:
        "Os documentos analisados não fornecem qualquer informação sobre a metodologia de uma perícia.",
      evidences: [],
    },
    {
      id: "el-n12",
      index: 12,
      question:
        "Ha conflito, vinculo economico ou influencia indevida envolvendo assistente tecnico, perito ou escritorio?",
      pillar: "P6",
      category: "Imparcialidade do Assistente Técnico",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: 5.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "Art. 429 do Código de Processo Civil",
      breachedDuty: "Dever de imparcialidade do assistente técnico",
      affectedAct: "Atuação do assistente técnico",
      inference:
        "Não foram encontrados elementos nos documentos que indiquem conflito de interesse, vínculo econômico ou influência indevida envolvendo assistentes técnicos, peritos ou escritórios de advocacia que atuaram no processo.",
      prejudice:
        "A ausência de evidências de conflito ou influência indevida não gera prejuízo à defesa ou à lisura processual, pois a imparcialidade é presumida na ausência de indícios em contrário.",
      causalLink: "Não há nexo causal entre um vício não identificado e um prejuízo processual.",
      proceduralImpact:
        "Não há impacto processual identificado relacionado a esta questão, pois não foram detectados indícios de comprometimento da imparcialidade dos atuantes na produção da prova pericial.",
      strategy:
        "Nenhuma medida é necessária neste momento, pois não foram encontrados indícios de irregularidade.",
      recommendedAction:
        "Manter a vigilância quanto a eventuais elementos que possam surgir futuramente, mas, com base nos documentos atuais, nenhuma ação específica é recomendada.",
      evidenceNotes:
        "O documento analisado (petição inicial e demais peças processuais até a juntada do laudo) não contém informações sobre a atuação de assistentes técnicos, nem sobre potenciais conflitos de interesse com peritos ou escritórios.",
      evidences: [],
    },
    {
      id: "el-n13",
      index: 13,
      question:
        "A decisao omitiu provas, quesitos, impugnacoes ou contradicoes relevantes do laudo?",
      pillar: "P7",
      category: "negativa_de_prestacao_jurisdicional",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 15.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "Art. 489, §1º, IV, do CPC",
      breachedDuty: "fundamentacao",
      affectedAct: "decisao",
      inference:
        "A ausência da decisão judicial impede a verificação de potenciais omissões e a análise da cadeia decisória, que deveria ter considerado os elementos probatórios e argumentativos apresentados pelas partes.",
      prejudice:
        "A decisão judicial pode ter se baseado em premissas incompletas ou falhas, comprometendo a justiça da decisão e o direito de defesa da parte que teve seus argumentos ou provas ignorados.",
      causalLink:
        "A omissão de elementos essenciais na fundamentação da decisão, se confirmada após a análise do documento faltante, cria um nexo direto com a falha na cadeia decisória e no dever de fundamentação.",
      proceduralImpact:
        "A falta de análise completa da decisão judicial pode levar à perda de argumentos para nulidade decisória ou negativa de prestação jurisdicional em fases recursais.",
      strategy:
        "Caso a análise da sentença confirme a omissão, deve-se interpor recurso apropriado (apelação ou embargos de declaração, dependendo da fase) com o argumento de nulidade decisória por negativa de prestação jurisdicional.",
      recommendedAction:
        "Analisar a decisão judicial (sentença) para verificar se houve omissão de provas, quesitos, impugnações ou contradições relevantes do laudo pericial.",
      evidenceNotes:
        "A análise não identificou correlação com o mapa de evidências, pois a ausência do documento principal (sentença) impede a avaliação do cumprimento do checklist.",
      evidences: [],
    },
    {
      id: "el-n14",
      index: 14,
      question:
        "A decisao apresenta fundamentacao aparente, generica, contraditoria ou sem enfrentamento de argumentos centrais?",
      pillar: "P8",
      category: "Nulidade de Fundamentação",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 10.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "Art. 489 do CPC, Art. 93, IX da CF",
      breachedDuty: "Dever de Fundamentação",
      affectedAct: "Decisão Judicial",
      inference:
        "A análise da fundamentação da decisão judicial não pode ser realizada, pois o documento fornecido não contém o decisório judicial. Para aferir a conformidade da decisão com o dever de fundamentação, seria necessária a análise da sentença ou acórdão proferido nos autos.",
      prejudice:
        "A falta de fundamentação adequada ou a fundamentação genérica ou aparente impede o jurisdicionado de compreender as razões que levaram à decisão, cerceando o direito de impugná-la de forma eficaz.",
      causalLink:
        "A ausência da decisão judicial no material analisado impede a verificação do cumprimento do dever de fundamentação, não sendo possível constatar vícios ou sua ausência.",
      proceduralImpact:
        "A impossibilidade de analisar a fundamentação da decisão impede a identificação de vícios que poderiam ser alegados em recurso ou em sede de embargos de declaração, comprometendo a defesa quanto a este aspecto.",
      strategy:
        "Aguardar o fornecimento da decisão judicial para análise e, se for o caso, interpor recurso (apelação, embargos de declaração) ou arguir nulidade.",
      recommendedAction:
        "Analisar a decisão judicial (sentença, acórdão ou embargos de declaração) para verificar se há fundamentação aparente, genérica, contraditória ou sem enfrentamento de argumentos centrais.",
      evidenceNotes:
        "A análise de fundamentação da decisão judicial é inconclusiva, pois o material fornecido contém apenas a petição inicial e movimentações processuais, mas não a decisão judicial em si.",
      evidences: [],
    },
    {
      id: "el-n15",
      index: 15,
      question:
        "Ha omissao persistente, negativa de prestacao jurisdicional ou vicio em julgamento colegiado?",
      pillar: "P9",
      category: "Nulidade Recursais",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "Recurso",
      inference:
        "Não há indícios de omissão persistente, negativa de prestação jurisdicional ou vício em julgamento colegiado na fase recursal com base nos documentos apresentados.",
      prejudice: "Sem indícios de nulidade recursal, não há prejuízo a ser analisado.",
      causalLink: "Não aplicável, pois não há vício identificado.",
      proceduralImpact:
        "Sem ocorrência de nulidades recursais, não há impacto processual a ser considerado nesta análise.",
      strategy: "Não aplicável.",
      recommendedAction:
        "A ausência de documentos recursais impede a análise deste item. Recomenda-se a análise de documentos das fases recursais, caso existam, para verificar a ocorrência de nulidades.",
      evidenceNotes:
        "A análise não encontrou informações relevantes no mapa de evidências para este item, pois não há documentos ou menções a fases recursais.",
      evidences: [],
    },
    {
      id: "el-n16",
      index: 16,
      question:
        "Ha calculo, liquidacao, penhora, avaliacao ou pericia contabil sem contraditorio ou tecnicamente inadequada?",
      pillar: "P10",
      category: "Nulidades de Execucao",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Nao aplicavel",
      affectedAct: "Nao aplicavel",
      inference:
        "Não há elementos nos documentos fornecidos que indiquem a ocorrência de cálculo, liquidação, penhora, avaliação ou perícia contábil na fase de execução que seja tecnicamente inadequada ou sem o devido contraditório.",
      prejudice: "Inexistente na fase atual.",
      causalLink:
        "Não há relação de causalidade entre os documentos analisados e a ocorrência de nulidades na fase de execução.",
      proceduralImpact:
        "Inexistente, pois a fase processual não comporta a análise de vícios em atos executórios.",
      strategy:
        "Aguardar o momento processual oportuno para análise de eventuais vícios na fase de execução.",
      recommendedAction:
        "Acompanhar o desenvolvimento processual para análise de eventuais nulidades na fase de execução, caso esta venha a ocorrer.",
      evidenceNotes:
        "A análise para este item não é aplicável, pois a fase processual é de conhecimento e os documentos apresentados são relacionados à petição inicial e aos contratos discutidos, não havendo elementos sobre a fase de execução.",
      evidences: [],
    },
    {
      id: "el-n17",
      index: 17,
      question:
        "Ha indicios concretos de concentracao de nomeacoes, criterio dirigido ou violacao de governanca na escolha do perito?",
      pillar: "P11",
      category: "conhecimento_inconclusivo",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "governança_processual",
      affectedAct: "nomeacao_do_perito",
      inference:
        "A ausência de documentos ou menções sobre a nomeação de peritos impede a análise da existência de concentração de nomeações, critérios dirigidos ou violação de governança na escolha de peritos.",
      prejudice:
        "A ausência de informações sobre a nomeação de peritos impede a verificação de eventuais vícios que possam comprometer a imparcialidade do processo e a validade da prova pericial, caso venha a ser produzida.",
      causalLink:
        "A falta de documentos sobre a nomeação de peritos impede a análise sobre a observância das regras de governança na escolha, o que, se falha, poderia gerar nulidade.",
      proceduralImpact:
        "Impossibilidade de aferir a existência de vícios na escolha do perito, o que poderia comprometer a imparcialidade e a regularidade processual.",
      strategy:
        "Diligência para obter os documentos necessários à análise, caso haja perícia nos autos. Se não houver perícia, o item se torna inaplicável.",
      recommendedAction:
        "Requerer a juntada de documentos que comprovem os critérios de nomeação de peritos, histórico de nomeações e cadastro de peritos, caso haja perícia nos autos.",
      evidenceNotes:
        "A análise não pôde ser realizada pois os documentos fornecidos não contêm informações sobre nomeação de peritos, critérios de escolha ou histórico de nomeações.",
      evidences: [],
    },
    {
      id: "el-n18",
      index: 18,
      question:
        "A prova digital, sistema, algoritmo ou IA usados no caso sao auditaveis e preservam logs, autenticacao e integridade?",
      pillar: "P12",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "",
      inference:
        "Não há indícios de que provas digitais, sistemas, algoritmos ou IA tenham sido utilizados de forma a comprometer sua auditabilidade, integridade ou preservação de logs. Portanto, não se vislumbra risco de nulidade tecnológica neste aspecto.",
      prejudice: "",
      causalLink: "",
      proceduralImpact:
        "Sem o uso de tais tecnologias ou a sua não demonstração como elemento probatório central, não há impacto processual decorrente de sua alegada falta de auditabilidade ou integridade.",
      strategy: "",
      recommendedAction:
        "Não há recomendação de ação específica, visto que o item não se aplica ao caso com base nos documentos analisados.",
      evidenceNotes:
        "A análise não encontrou evidências ou menções a sistemas, algoritmos ou IA que necessitassem de auditoria tecnológica, logs, autenticação ou integridade como prova no litígio.",
      evidences: [],
    },
    {
      id: "el-n19",
      index: 19,
      question:
        "Normas tecnicas aplicaveis foram observadas de modo concreto, e nao apenas citadas de forma decorativa?",
      pillar: "P13",
      category: "Conformidade com Normas Técnicas",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Não aplicável",
      affectedAct: "Não aplicável",
      inference:
        "Não foram encontrados elementos nos documentos que indicassem que normas técnicas aplicáveis foram citadas de forma meramente decorativa ou que não foram observadas. A análise se baseou nos documentos fornecidos e na ausência de elementos que sugerissem o contrário.",
      prejudice:
        "Não há prejuízo processual identificado, uma vez que não foram detectadas violações a normas técnicas que pudessem invalidar provas ou atos processuais.",
      causalLink: "Não há nexo causal entre um vício não identificado e um prejuízo processual.",
      proceduralImpact:
        "Nenhum impacto processual identificado, pois não há indícios de descumprimento de normas técnicas aplicáveis que pudessem comprometer a validade da prova ou o rito processual.",
      strategy: "Não aplicável",
      recommendedAction:
        "Manter a vigilância sobre a observância de normas técnicas em fases posteriores do processo, caso surjam elementos que demandem análise mais aprofundada.",
      evidenceNotes:
        "A análise se baseou nos documentos fornecidos e na ausência de elementos que sugerissem o descumprimento de normas técnicas.",
      evidences: [],
    },
    {
      id: "el-n20",
      index: 20,
      question:
        "Ha fato superveniente documentado que comprometa imparcialidade, prova, cadeia de custodia ou legitimidade da decisao?",
      pillar: "P14",
      category: "nao_aplicavel",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "nao_aplicavel",
      affectedAct: "nao_aplicavel",
      inference:
        "Não foram encontrados fatos supervenientes documentados nos autos que comprometam a imparcialidade, a prova, a cadeia de custódia ou a legitimidade da decisão judicial.",
      prejudice: "Não há prejuízo identificado.",
      causalLink: "Não aplicável, pois não há vício ou fato superveniente identified.",
      proceduralImpact:
        "Não há impacto processual a ser considerado, visto que não foram identificados riscos relevantes.",
      strategy: "Nenhuma medida processual necessária.",
      recommendedAction: "Não há recomendação específica, pois o risco é inexistente.",
      evidenceNotes:
        "A ausência de documentos que indiquem fatos supervenientes impeditivos à análise do bloco P14.",
      evidences: [],
    },
  ],
};

export const febNullityReport: NullityReport = {
  caseId: "case-feb-sap",
  globalScore: 51.88,
  globalLevel: "moderate",
  acceptedFindings: 20,
  scoreExplanation:
    "Score calculado por ponderacao juridico-pericial: media ponderada 31.25, maior risco 100.0, 1 achado(s) critico(s) e 7 pilar(es) afetado(s).",
  weightedAverage: 31.25,
  maxRisk: 100.0,
  criticalFindings: 1,
  affectedPillars: 7,
  pillarScores: [
    { pillar: "P3", score: 28.12, level: "low", findingCount: 2 },
    { pillar: "P4", score: 49.69, level: "moderate", findingCount: 2 },
    { pillar: "P5", score: 3.09, level: "low", findingCount: 3 },
    { pillar: "P6", score: 3.33, level: "low", findingCount: 1 },
    { pillar: "P7", score: 41.3, level: "moderate", findingCount: 1 },
    { pillar: "P12", score: 34.24, level: "moderate", findingCount: 1 },
    { pillar: "P13", score: 100.0, level: "critical", findingCount: 1 },
  ],
  findings: [
    {
      id: "feb-n01",
      index: 1,
      question:
        "Ha indicios de incompetencia absoluta, prevencao ignorada ou julgamento por orgao sem competencia legal?",
      pillar: "P1",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "",
      inference:
        "Não foram encontrados indícios de incompetência absoluta, prevenção ignorada ou julgamento por órgão sem competência legal com base nos documentos analisados.",
      prejudice: "Não há prejuízo processual decorrente de incompetência ou jurisdição inadequada.",
      causalLink:
        "Ausência de evidências que conectem um vício de competência ou jurisdição a qualquer prejuízo processual.",
      proceduralImpact:
        "Nenhum impacto processual identificado quanto à competência ou jurisdição.",
      strategy: "Não aplicável.",
      recommendedAction: "Não há necessidade de ação.",
      evidenceNotes:
        "Não houve mapeamento de evidências, pois o item foi classificado como sem risco.",
      evidences: [],
    },
    {
      id: "feb-n02",
      index: 2,
      question:
        "A distribuicao, conexao, continencia ou prevencao foi enfrentada de forma adequada?",
      pillar: "P1",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "",
      inference:
        "Não foram identificados problemas na distribuição, conexão, continência ou prevenção do feito com base nos documentos apresentados.",
      prejudice:
        "Não há prejuízo decorrente de má distribuição, conexão, continência ou prevenção.",
      causalLink:
        "Ausência de evidências que conectem vícios de distribuição, conexão, continência ou prevenção a prejuízos processuais.",
      proceduralImpact:
        "Não há impacto processual identificado em relação à distribuição, conexão, continência ou prevenção.",
      strategy: "Não aplicável.",
      recommendedAction: "Não há necessidade de ação.",
      evidenceNotes:
        "Não houve mapeamento de evidências, pois o item foi classificado como sem risco.",
      evidences: [],
    },
    {
      id: "feb-n03",
      index: 3,
      question: "Ha elementos documentais de impedimento ou suspeicao do magistrado?",
      pillar: "P2",
      category: "nao_se_aplica",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "nao_violado",
      affectedAct: "nao_afetado",
      inference: "Ausencia de indicativos de impedimento ou suspeicao do magistrado.",
      prejudice:
        "Inexistencia de prejuizo processual decorrente de impedimento ou suspeicao do magistrado.",
      causalLink: "Nao ha nexo causal entre um vicio inexistente e qualquer prejuizo.",
      proceduralImpact:
        "Nao identificado impacto processual decorrente de impedimento ou suspeicao do magistrado.",
      strategy: "Nao aplicavel.",
      recommendedAction: "Nao ha recomendacao de acao processual ou medida adicional.",
      evidenceNotes:
        "A analise se baseou nos documentos fornecidos para o bloco, nao havendo menção a quaisquer fatos ou documentos que pudessem indicar impedimento ou suspeicao do magistrado.",
      evidences: [],
    },
    {
      id: "feb-n04",
      index: 4,
      question: "A decisao revela parcialidade objetiva ou tratamento assimetrico das partes?",
      pillar: "P2",
      category: "nao_se_aplica",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "nao_violado",
      affectedAct: "nao_afetado",
      inference: "Não há decisão judicial nos documentos fornecidos para análise de parcialidade.",
      prejudice:
        "Não é possível analisar o prejuízo, pois a análise de parcialidade objetiva em decisões judiciais não pode ser feita com base em petição inicial.",
      causalLink:
        "Não há nexo causal, pois a análise se refere a um documento que não permite a verificação do quesito.",
      proceduralImpact:
        "Impossibilidade de avaliar a presença de parcialidade objetiva ou tratamento assimetrico das partes, pois o documento analisado é uma petição inicial e não uma decisão judicial.",
      strategy:
        "Analisar as decisões judiciais para verificar a ocorrência de parcialidade ou tratamento assimetrico.",
      recommendedAction:
        "Recomenda-se a análise das decisões judiciais para verificar eventual parcialidade.",
      evidenceNotes:
        "O texto fornecido é uma petição inicial, não uma decisão judicial. Portanto, não há evidências mapeadas ou presentes que permitam avaliar a imparcialidade do magistrado na forma de uma decisão.",
      evidences: [],
    },
    {
      id: "feb-n05",
      index: 5,
      question:
        "As partes foram intimadas e tiveram oportunidade real de participar das diligencias e se manifestar sobre o laudo?",
      pillar: "P3",
      category: "Nulidade Relativa",
      defectNature: "irregularidade_simples",
      riskLevel: "high",
      score: 90.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis:
        "Art. 5º, LV, da Constituição Federal, Art. 7º, VIII, da Lei 8.666/93 (analogia), Art. 9º, 10º, 476, CPC",
      breachedDuty: "Dever de dar ciência e oportunidade de manifestação (Contraditório)",
      affectedAct: "Atos processuais de diligências e manifestação sobre prova pericial",
      inference:
        "A ausência de menção a intimações e oportunidades de manifestação sobre diligências ou laudos na petição inicial sugere que tais atos podem não ter ocorrido ou não foram registrados de forma acessível no trecho fornecido. Sem a comprovação de intimações e prazos, o contraditório pode ter sido violado.",
      prejudice:
        "A ausência de intimação ou oportunidade de manifestação sobre diligências ou laudos periciais impede a parte de influenciar na produção da prova ou de apresentar seus argumentos técnicos, comprometendo seu direito de defesa e a busca pela verdade real.",
      causalLink:
        "A falta de comprovação de intimações e prazos para manifestação sobre o laudo pericial, caso confirmada, impede o exercício do contraditório, viciando o ato processual e potencialmente a decisão dele decorrente.",
      proceduralImpact:
        "Violação do contraditório e da ampla defesa, podendo gerar nulidade processual se comprovada a ausência de intimação ou oportunidade de manifestação.",
      strategy:
        "Impugnação e pedido de reabertura de prazo para manifestação sobre o laudo pericial.",
      recommendedAction:
        "Requerer a juntada aos autos de todas as intimações relativas às diligências periciais e aos prazos para manifestação sobre o laudo, bem como as respectivas manifestações das partes.",
      evidenceNotes:
        "O trecho analisado (petição inicial) não contém informações sobre intimações para diligências periciais ou prazos para manifestação sobre o laudo. A análise de contraditório e ampla defesa requer a verificação dos autos processuais para comprovar se tais atos ocorreram.",
      evidences: [],
    },
    {
      id: "feb-n06",
      index: 6,
      question:
        "Houve decisao surpresa, indeferimento imotivado de prova ou julgamento antecipado indevido?",
      pillar: "P3",
      category: "Nulidade Relativa",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 30.0,
      evidenceStrength: "fraca",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "moderado",
      preclusionRisk: "moderado",
      legalBasis: "Art. 10, CPC, Art. 5º, LV, CF",
      breachedDuty: "Dever de fundamentação das decisões e de oportunizar a produção de provas",
      affectedAct: "Decisão judicial",
      inference:
        "Sem a análise das decisões judiciais, não é possível determinar se houve cerceamento de defesa por indeferimento imotivado de provas, julgamento antecipado indevido ou decisão surpresa.",
      prejudice:
        "O indeferimento imotivado de prova ou uma decisão surpresa podem cercear a defesa da parte, impedindo-a de produzir elementos essenciais para o deslinde da causa e, consequentemente, influenciar negativamente o resultado do julgamento.",
      causalLink:
        "A ausência de fundamentação em um indeferimento de prova ou em uma decisão que não foi previamente debatida pelas partes viola o contraditório e a ampla defesa, constituindo um vício processual.",
      proceduralImpact:
        "Potencial cerceamento de defesa caso se verifique decisão surpresa ou indeferimento imotivado de provas relevantes.",
      strategy: "Avaliar preliminar recursal de cerceamento de defesa e nulidade da sentença.",
      recommendedAction:
        "Analisar as decisões judiciais e a sentença para verificar a ocorrência de indeferimento de provas ou decisão surpresa.",
      evidenceNotes:
        "A petição inicial não contém informações sobre indeferimento de provas ou decisões surpresa. A análise requer a consulta às decisões judiciais e à sentença.",
      evidences: [],
    },
    {
      id: "feb-n07",
      index: 7,
      question: "A prova documental possui origem, autenticidade e integridade verificaveis?",
      pillar: "P4",
      category: "fragilidade_tecnica",
      defectNature: "fragilidade_tecnica",
      riskLevel: "moderate",
      score: 70.0,
      evidenceStrength: "moderada",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "moderado",
      preclusionRisk: "baixo",
      legalBasis: "Art. 425, CPC",
      breachedDuty: "Dever de apresentar prova idônea e verificável.",
      affectedAct: "Produção da Prova Documental",
      inference:
        "A análise dos documentos citados na petição inicial (DOC. 1, 4, 5, 7, 8, 9, 13, 15, 16, 17, 18, 19) sugere que a parte autora buscou comprovar suas alegações por meio de contratos, propostas, notas fiscais, comprovantes de pagamento e comunicações. A assinatura digital da petição inicial garante a origem do documento principal, mas a integridade e autenticidade dos demais documentos anexos dependem de conferência posterior, não sendo possível afirmar categoricamente que todos são autênticos e íntegros apenas com base no material apresentado.",
      prejudice:
        "A fragilidade na comprovação da autenticidade e integridade dos documentos pode levar à sua desconsideração como prova, enfraquecendo a fundamentação da decisão judicial e a capacidade da parte autora de comprovar suas alegações.",
      causalLink:
        "A ausência de mecanismos robustos de verificação da autenticidade e integridade dos documentos (como hashes ou originais) dificulta a sua plena aceitação como prova idônea, gerando insegurança jurídica e potencial prejuízo à parte que os apresentou.",
      proceduralImpact:
        "A falta de comprovação robusta da autenticidade e integridade de documentos chave pode fragilizar a prova, abrindo margem para impugnação e eventual desconsideração judicial, comprometendo a força probatória das alegações da parte autora.",
      strategy:
        "Impugnação da prova documental, solicitando a apresentação de elementos que comprovem a autenticidade e integridade dos documentos, ou, subsidiariamente, a desconsideração dos documentos duvidosos.",
      recommendedAction:
        "Requerer a exibição dos documentos originais ou a apresentação de certificados de autenticidade/hashes para os documentos mais relevantes (contratos, propostas, notas fiscais), a fim de atestar sua integridade e origem.",
      evidenceNotes: "Não há mapa de evidências disponível para esta análise.",
      evidences: [
        {
          page: 1,
          excerpt:
            "FEDERAÇÃO ESPÍRITA BRASILEIRA (FEB), inscrita no CNPJ sob o nº. 33.644.857/0001-01, com sede no SGAN 603, conjunto F, Av. L2 Norte, Brasília (DF), CEP 70.830-106, telefone (61) 2101-6161, neste ato representada por seu Presidente, Jorge Godinho Barreto Nery, Identidade nº 194952 – Ministério da Defesa, inscrito no CPF sob o nº 449.003.098-34, representada nos termos de seus atos constitutivos e por seus procuradores, conforme instrumento de mandato e substabelecimento anexos (DOC. 1), com endereço Av. Diário de Notícias, nº 200/2105 - Edifício Cristal Tower - Bairro Cristal - Porto Alegre/RS -",
        },
        {
          page: 8,
          excerpt:
            "No dia 21 de dezembro de 2015 foi celebrado um CONTRATO DE LICENÇA PARA PEQUENAS E MÉDIAS EMPRESAS (DOC. 4) que tem como partes a KPIT, como revendedora autorizada da SAP e a FEB, como licenciada, fazendo referência à SAP BRASIL LTDA. como detentora de todos os direitos, tangíveis e intangíveis, sobre o software de propriedade da SAP AG.",
        },
        {
          page: 9,
          excerpt:
            "Dentre promessa e obrigações assumidas pelas rés na proposta técnica (fl. 12 do DOC. 5), destacam-se: 3.1 SAP HYBRIS",
        },
        {
          page: 11,
          excerpt:
            "Dentre esses valores, as parcelas de 1 a 3, que correspondem a um total de R$ 487.500,00 (quatrocentos e oitenta e sete mil e quinhentos reais) já foram quitados à demandada KPIT (DOC. 7 – Notas Fiscais n. 1284, 1328 e 1375 e respectivos comprovantes de depósitos e DARF's).",
        },
        {
          page: 11,
          excerpt:
            "Ainda, à demandada SAP BRASIL LTDA. foi paga a quantia de R$ 118.843,15 (cento e dezoito mil, oitocentos e quarenta e três reais e quinze centavos), referentes ao serviço de MANUTENÇÃO (DOC. 8 – Nota fiscal n. 121011), bem como o pagamento de R$ 127.367,68 que foram depositados em juízo junto ao já mencionado processo n.º 0077328-70.2018.8.26.0100, que tramita na 34ª Vara Cível do Foro",
        },
        {
          page: 13,
          excerpt:
            "Embora tenha recebido retorno de sua solicitação, cerca de dois meses após o requerimento de devolução, o retorno se mostrou insuficiente, haja vista que todas as opções ofertadas pela SAP davam conta de aumento ou manutenção de valores a pagar por conta da FEB, mesmo com a devolução integral das licenças. (DOC. 09 – E-mails devolução Licenças)",
        },
        {
          page: 14,
          excerpt:
            'A KPIT ainda tentou justificar a sua incompetência com a necessidade de contratação por parte da FEB de um serviço chamado AddMark (DOC. 13 - AddMark), que tão somente com este poderia finalizar a implementação de toda a "solução" oferecida, no que parece, no mínimo, com uma venda casada.',
        },
        {
          page: 16,
          excerpt:
            "Assim, cansada de promessas, atrasos, esquivas e da falta de profissionalismo e comprometimento por parte da Ré, aliada a extrema necessidade de ter o software funcionando nos moldes daquilo que a Demandada se propôs a entregar (e não o fez), não restou à Autora outra alternativa que não buscar no mercado outro fornecedor para a conclusão dos serviços, a Fusion Informática Ltda., CNPJ/MF n.º 13.224.486/0001-93 – (DOC. 15 e 16), em vista da incapacidade e descumprimento das obrigações (pela Demandada).",
        },
        {
          page: 17,
          excerpt:
            "Assim, mediante a proposta apresentada pela Empresa Vert, em conjunto com a garantia de solução apresentada pela SAP, novamente a FEB, na mais sincera tentativa de resolver todos os problemas, efetuou a contratação da Vert. (DOC. 19)",
        },
        {
          page: 19,
          excerpt:
            "Por indicação da SAP, a FEB, ainda na expectativa de solucionar os problemas, e amparada na credibilidade que atribuía à SAP, novamente acreditou nos argumentos da Ré, e contatou a Vert para solicitação de orçamento. (DOC. 18 – Propostas Vert).",
        },
        {
          page: 19,
          excerpt:
            "Assim, mediante a proposta apresentada pela Empresa Vert, em conjunto com a garantia de solução apresentada pela SAP, novamente a FEB, na mais sincera tentativa de resolver todos os problemas, efetuou a contratação da Vert. (DOC. 19)",
        },
        {
          page: 7,
          excerpt:
            "SAP Partner Finder | SAP ← → C www.sap.com/partners/search/index.html SAP United States Newsletter Community Free Trials Log On Join Us Search +1-877-727-1127, ext. 11160 Industries & Solutions > Training & Education > Events Products > About SAP Customer Testimonials > Our Partners Visit the press room on the SAP News Center Partner Finder Become an SAP Partner Company Name kpit Partner Type All Partner Types Solution Focus All Categories All Solutions SAP Solution Authorized SAP Recognized Expertise Industry All Industries SAP Recognized Expertise KPIT Technologies solucoes em Informatica Lt",
        },
      ],
    },
    {
      id: "feb-n08",
      index: 8,
      question:
        "Houve producao unilateral, contradita ignorada, inspecao sem ciencia ou alteracao do objeto da prova?",
      pillar: "P4",
      category: "nulidade_relativa",
      defectNature: "nulidade_relativa",
      riskLevel: "moderate",
      score: 60.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "moderado",
      legalBasis: "Art. 5º, LV, CF, Art. 7º, CPC",
      breachedDuty: "Contraditório e Ampla Defesa.",
      affectedAct: "Produção da Prova",
      inference:
        "A ausência de registros sobre a forma de produção de provas específicas, como inspeções ou diligências, sugere que elas podem ter ocorrido de forma unilateral ou sem a devida ciência e participação das partes, o que seria uma violação ao contraditório.",
      prejudice:
        "A ausência de oportunidade de contraditório na produção de provas, caso tenha ocorrido, compromete a validade e a imparcialidade dessas provas, podendo influenciar indevidamente a decisão judicial e prejudicar o direito de defesa.",
      causalLink:
        "A falta de registro de ciência das partes e de sua participação na produção de provas indica a possibilidade de unilateralidade, o que, se confirmado, viola o princípio do contraditório e pode levar à invalidação da prova.",
      proceduralImpact:
        "A ausência de provas concretas sobre a forma de produção de provas pode caracterizar violação ao contraditório, caso estas tenham ocorrido unilateralmente, fragilizando a prova e gerando nulidade relativa.",
      strategy:
        "Impugnar a prova produzida unilateralmente ou sem ciência, requerendo sua desconsideração ou a realização de nova produção probatória com observância do contraditório.",
      recommendedAction:
        "Verificar se houve produção de provas (perícias, vistorias, inspeções) sem a devida intimação e oportunidade de manifestação das partes. Caso afirmativo, requerer a desconsideração da prova ou a sua renovação.",
      evidenceNotes: "Não há mapa de evidências disponível para esta análise.",
      evidences: [],
    },
    {
      id: "feb-n09",
      index: 9,
      question:
        "O perito apresenta impedimento, suspeição, conflito de interesse ou qualificação incompatível com o objeto?",
      pillar: "P5",
      category: "Nulidade Potencial",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 20.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "moderado",
      preclusionRisk: "baixo",
      legalBasis: "CPC, art. 145, 147, CPC, art. 148",
      breachedDuty: "Dever de imparcialidade e qualificação técnica",
      affectedAct: "Nomeação do perito",
      inference:
        "A ausência de informações sobre o perito impede a análise de sua qualificação e potenciais impedimentos ou suspeições, o que, em tese, poderia comprometer a imparcialidade e a validade do laudo pericial.",
      prejudice:
        "Sem a análise da qualificação e potenciais impedimentos do perito, a parte pode ter tido comprometido o direito de impugnar a nomeação ou a atuação do profissional, afetando a confiança na prova técnica produzida.",
      causalLink:
        "A falta de apresentação de documentos essenciais sobre o perito impede a verificação de sua idoneidade e imparcialidade, o que constitui um requisito para a validade da perícia.",
      proceduralImpact:
        "A falta de dados sobre o perito impossibilita a verificação de sua idoneidade e imparcialidade, o que poderia ser utilizado para impugnação.",
      strategy: "Impugnação da perícia após a juntada de documentos comprobatórios.",
      recommendedAction:
        "Requerer a juntada do currículo do perito, decisão de nomeação e eventuais declarações sobre vínculos ou interesses.",
      evidenceNotes:
        "A análise não se baseou em evidências mapeadas, pois os documentos referentes ao perito não foram localizados ou fornecidos.",
      evidences: [],
    },
    {
      id: "feb-n10",
      index: 10,
      question:
        "O procedimento pericial teve cronograma, diligencias regulares, resposta a quesitos e limites do objeto respeitados?",
      pillar: "P5",
      category: "Nulidade Potencial",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 15.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "alto",
      legalBasis: "CPC, art. 460, CPC, art. 470, CPC, art. 158",
      breachedDuty: "Dever de observância do procedimento legal e dos quesitos",
      affectedAct: "Procedimento pericial",
      inference:
        "A ausência desses documentos impede a verificação se o perito atuou dentro dos limites do objeto pericial, se respondeu a todos os quesitos, se houve cronograma e se as diligências foram regulares.",
      prejudice:
        "A falta de comprovação do cumprimento do procedimento pericial e da resposta aos quesitos pode gerar insegurança quanto à fidedignidade do laudo e à ampla defesa, uma vez que não se pode aferir se todas as questões relevantes foram abordadas.",
      causalLink:
        "A ausência de documentos que comprovem o procedimento pericial (termo de nomeação, quesitos, atas) impede a verificação do respeito aos limites do objeto, à resposta dos quesitos e à regularidade das diligências, configurando um vício processual.",
      proceduralImpact:
        "A impossibilidade de verificar o cumprimento do procedimento pericial compromete a análise da regularidade da prova técnica e a possibilidade de impugnação baseada em vícios procedimentais.",
      strategy:
        "Impugnação do laudo pericial ou requerimento de esclarecimentos/complementação após a juntada dos documentos faltantes.",
      recommendedAction:
        "Solicitar a juntada do termo de nomeação do perito, dos quesitos apresentados pelas partes e de eventuais atas de diligências.",
      evidenceNotes:
        "A análise não se baseou em evidências mapeadas, pois os documentos referentes ao procedimento pericial não foram localizados ou fornecidos.",
      evidences: [],
    },
    {
      id: "feb-n11",
      index: 11,
      question:
        "A metodologia possui validação científica, repetibilidade, rastreabilidade, margem de erro e precisão suficientes?",
      pillar: "P5",
      category: "Nulidade Potencial",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 10.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "CPC, art. 473",
      breachedDuty: "Dever de fundamentação técnica e metodológica",
      affectedAct: "Laudo pericial",
      inference:
        "A ausência de descrição e comprovação da metodologia impede a análise de sua validade científica, repetibilidade, rastreabilidade, margem de erro e precisão, o que pode indicar uma fragilidade técnica ou científica na prova produzida.",
      prejudice:
        "A falta de descrição da metodologia e de comprovação de sua validade científica e técnica compromete a confiabilidade da prova pericial, podendo levar a uma decisão judicial baseada em premissas incorretas.",
      causalLink:
        "A ausência de apresentação da metodologia e de comprovação de sua validade científica, repetibilidade, rastreabilidade, margem de erro e precisão impede a verificação da qualidade técnica e científica da perícia, configurando um vício na produção da prova.",
      proceduralImpact:
        "Sem a descrição da metodologia, a parte não consegue avaliar a sua adequação técnica e científica, o que limita a capacidade de impugnar o laudo por vícios técnicos.",
      strategy:
        "Impugnação do laudo pericial por fragilidade técnica e científica, requerendo complementação ou nova perícia.",
      recommendedAction:
        "Requerer a juntada do laudo pericial e de toda a documentação técnica que descreva a metodologia utilizada, incluindo normas técnicas aplicáveis, validação científica, e dados sobre repetibilidade, rastreabilidade e margem de erro.",
      evidenceNotes:
        "A análise não se baseou em evidências mapeadas, pois os documentos referentes à metodologia pericial não foram localizados ou fornecidos.",
      evidences: [],
    },
    {
      id: "feb-n12",
      index: 12,
      question:
        "Ha conflito, vinculo economico ou influencia indevida envolvendo assistente tecnico, perito ou escritorio?",
      pillar: "P6",
      category: "ausencia_documental",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 30.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "CPC, Art. 145, §1º e §2º",
      breachedDuty: "dever de imparcialidade",
      affectedAct: "pericia",
      inference:
        "A ausência de elementos que apontem para conflito de interesse entre perito, assistente técnico e as partes, bem como a falta de documentos que comprovem ou refutem tais vínculos, torna a análise deste item inconclusiva.",
      prejudice:
        "A ausência de análise detalhada sobre os vínculos entre perito, assistentes e partes pode impedir a identificação de parcialidade, o que pode comprometer a confiança na prova pericial produzida.",
      causalLink:
        "A ausência de documentos e informações solicitadas no checklist impede a verificação de potenciais conflitos, o que leva à conclusão de que a imparcialidade não pôde ser plenamente aferida.",
      proceduralImpact:
        "A falta de comprovação de potenciais conflitos de interesse ou influências indevidas pode fragilizar a argumentação da parte que busca demonstrar a imparcialidade da prova pericial, caso haja alegações nesse sentido.",
      strategy: "Impugnação e solicitação de esclarecimentos.",
      recommendedAction:
        "Solicitar a juntada de documentos que comprovem a inexistência de vínculos ou, em caso de alegação pela parte contrária, que permitam a análise de potenciais conflitos.",
      evidenceNotes:
        "Nao ha evidencias mapeadas que se relacionem diretamente com a analise de conflitos de interesse entre peritos e assistentes tecnicos, pois o documento analisado se trata de uma peticao inicial que nao aborda tais questoes.",
      evidences: [],
    },
    {
      id: "feb-n13",
      index: 13,
      question:
        "A decisao omitiu provas, quesitos, impugnacoes ou contradicoes relevantes do laudo?",
      pillar: "P7",
      category: "Omissao_Decisoria",
      defectNature: "nulidade_relativa",
      riskLevel: "high",
      score: 75.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "moderado",
      legalBasis: "Art. 489, §1º, IV, CPC",
      breachedDuty: "Dever de fundamentação e de análise probatória",
      affectedAct: "Decisão judicial",
      inference:
        "Sem a análise da decisão judicial proferida após a juntada do laudo pericial, não é possível determinar se o juiz considerou ou ignorou provas, quesitos, impugnações ou contradições relevantes apresentadas no laudo, o que impacta diretamente a cadeia decisória e a fundamentação da decisão.",
      prejudice:
        "A omissão de análise de provas, quesitos ou impugnações relevantes pode levar a uma decisão desfavorável à parte, pois seus argumentos ou evidências podem não ter sido considerados, comprometendo o direito de defesa e a justiça da decisão.",
      causalLink:
        "A omissão na decisão judicial em relação a elementos probatórios ou argumentativos relevantes apresentados no laudo pericial e nas manifestações das partes constitui a base para um potencial vício decisório, que, se demonstrado, pode levar à anulação da decisão.",
      proceduralImpact:
        "A ausência da decisão judicial impede a verificação de uma possível omissão de análise de elementos probatórios relevantes, comprometendo a análise da fundamentação decisória e a cadeia de formação do convencimento do julgador.",
      strategy:
        "Impugnação em recurso (apelação ou embargos de declaração, conforme o caso) alegando nulidade da decisão por ausência de fundamentação e/ou violação ao contraditório, ou, em casos extremos, ação rescisória.",
      recommendedAction:
        "Solicitar a sentença ou demais decisões judiciais proferidas após a juntada do laudo pericial para verificar a adequada consideração de todos os elementos probatórios e defensivos.",
      evidenceNotes:
        "A análise foi realizada com base nos documentos fornecidos, que incluem a petição inicial. Contudo, a peça fundamental para esta análise, a sentença ou decisão judicial, está ausente, impossibilitando a verificação do cumprimento do checklist.",
      evidences: [],
    },
    {
      id: "feb-n14",
      index: 14,
      question:
        "A decisao apresenta fundamentacao aparente, generica, contraditoria ou sem enfrentamento de argumentos centrais?",
      pillar: "P8",
      category: "fundamentacao",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "Art. 489, CPC",
      breachedDuty: "Fundamentação",
      affectedAct: "Decisão Judicial",
      inference:
        "Não foi possível analisar a fundamentação da decisão judicial pois o documento fornecido é a petição inicial, não a decisão.",
      prejudice:
        "A falta de fundamentação adequada em uma decisão judicial pode comprometer o direito de defesa e a certeza jurídica das partes.",
      causalLink:
        "A ausência da decisão judicial impede a análise de sua fundamentação, impossibilitando a identificação de potenciais vícios.",
      proceduralImpact:
        "A ausência de análise da decisão judicial impede a verificação de vícios de fundamentação que poderiam ser alegados em recurso ou em momentos processuais posteriores.",
      strategy:
        "Aguardar a juntada da decisão judicial para realizar a análise de fundamentação e, se necessário, interpor recurso ou embargos de declaração.",
      recommendedAction:
        "Analisar a decisão judicial quando disponível para verificar se atende aos requisitos de fundamentação, contraditório e ampla defesa.",
      evidenceNotes:
        "A análise deste item não foi possível pois a decisão judicial (sentença ou acórdão) não foi fornecida. O documento analisado é a petição inicial.",
      evidences: [],
    },
    {
      id: "feb-n15",
      index: 15,
      question:
        "Ha omissao persistente, negativa de prestacao jurisdicional ou vicio em julgamento colegiado?",
      pillar: "P9",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "recurso",
      inference:
        "Não foram encontrados indícios de omissão persistente, negativa de prestação jurisdicional ou vício em julgamento colegiado com base nos documentos apresentados. A fase processual descrita é de 'laudo juntado', o que sugere que a fase recursal ainda não foi plenamente explorada ou que não há elementos nos documentos fornecidos que apontem para tais nulidades.",
      prejudice: "Não aplicável, pois não há indícios de vício na fase recursal.",
      causalLink: "Não aplicável, pois não há vício a ser relacionado com prejuízo.",
      proceduralImpact:
        "Sem a identificação de vícios recursais, não há impacto procedimental a ser destacado nesta fase. A análise se limita ao escopo dos documentos apresentados.",
      strategy:
        "Avaliar embargos, recurso especial/extraordinário ou medida cabível, caso sejam identificados vícios em momento processual posterior.",
      recommendedAction:
        "Recomenda-se a análise dos documentos recursais (acórdãos, embargos de declaração, recursos, certidões) em momento processual oportuno para verificar a existência de nulidades.",
      evidenceNotes:
        "A análise não se baseou em evidências mapeadas, pois a fase processual atual ('laudo juntado') e os documentos fornecidos não contêm informações sobre a fase recursal, que é o foco deste item do checklist.",
      evidences: [],
    },
    {
      id: "feb-n16",
      index: 16,
      question:
        "Ha calculo, liquidacao, penhora, avaliacao ou pericia contabil sem contraditorio ou tecnicamente inadequada?",
      pillar: "P10",
      category: "Nao se aplica",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Nao se aplica",
      affectedAct: "Nao se aplica",
      inference:
        "Não há indícios de nulidades na fase de execução, pois o material fornecido se limita à petição inicial e ao contexto fático anterior à execução.",
      prejudice:
        "Não há prejuízo a ser analisado na fase de execução, pois os atos executórios não foram apresentados.",
      causalLink: "Não se aplica.",
      proceduralImpact:
        "Não se vislumbra impacto procedimental na fase de execução, visto que esta não se iniciou ou não foi apresentada no material analisado.",
      strategy:
        "Na fase de execução, caso surjam irregularidades, as medidas adequadas seriam a impugnação ao cumprimento de sentença, embargos à execução, ou outros recursos cabíveis.",
      recommendedAction:
        "Avaliar a fase de execução quando esta for apresentada, verificando a existência de cálculos, liquidações, penhoras, avaliações ou perícias contábeis e a observância do contraditório e das normas técnicas aplicáveis.",
      evidenceNotes:
        "A análise não encontrou elementos relacionados à fase de execução nos documentos fornecidos, que se concentram na petição inicial e no contexto fático.",
      evidences: [],
    },
    {
      id: "feb-n17",
      index: 17,
      question:
        "Ha indicios concretos de concentracao de nomeacoes, criterio dirigido ou violacao de governanca na escolha do perito?",
      pillar: "P11",
      category: "sem_risco_identificado",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "NAO_APLICAVEL",
      affectedAct: "NAO_APLICAVEL",
      inference:
        "A análise da governança processual na escolha do perito não pôde ser realizada por ausência de documentos pertinentes no material fornecido. A petição inicial não contém informações que permitam inferir sobre concentração de nomeações, critério dirigido ou violação de governança na escolha de um perito.",
      prejudice:
        "A impossibilidade de analisar a governança na nomeação do perito impede a identificação de possíveis vícios que poderiam comprometer a imparcialidade ou a legalidade da prova pericial.",
      causalLink:
        "A ausência de documentos que evidenciem a escolha do perito e o histórico de suas nomeações impede a verificação de possíveis irregularidades, deixando a questão em aberto.",
      proceduralImpact:
        "A ausência de análise sobre a governança na nomeação do perito pode comprometer a avaliação de potenciais vícios de imparcialidade ou conformidade do processo pericial.",
      strategy:
        "Intimar as partes para que apresentem documentos referentes à nomeação e histórico do perito, caso a fase processual ainda permita tal providência.",
      recommendedAction:
        "Analisar documentos processuais posteriores, como decisões de nomeação de perito, histórico de nomeações, cadastro de peritos e eventuais manifestações sobre a escolha do profissional, se houver.",
      evidenceNotes:
        "O material analisado é a petição inicial da ação judicial e não contém informações sobre a nomeação de peritos.",
      evidences: [],
    },
    {
      id: "feb-n18",
      index: 18,
      question:
        "A prova digital, sistema, algoritmo ou IA usados no caso sao auditaveis e preservam logs, autenticacao e integridade?",
      pillar: "P12",
      category: "Nulidade Tecnológica Potencial",
      defectNature: "fragilidade_tecnica",
      riskLevel: "moderate",
      score: 50.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "moderado",
      preclusionRisk: "baixo",
      legalBasis:
        "Art. 5º, LIV e LV, CF/88, Art. 370, CPC/2015, Art. 473, CPC/2015, Lei Geral de Proteção de Dados (LGPD)",
      breachedDuty:
        "Dever de garantir a rastreabilidade, autenticidade e integridade de provas digitais e sistemas.",
      affectedAct: "Prova digital",
      inference:
        "A ausência de informações sobre a auditabilidade, logs, autenticação e integridade de sistemas ou provas digitais no documento analisado (petição inicial) impede a verificação de sua regularidade técnica. Dada a natureza da questão e a ausência de elementos probatórios sobre o uso e controle de tecnologia, há um indicativo de fragilidade.",
      prejudice:
        "A falta de transparência e auditabilidade sobre a tecnologia utilizada pode impedir que as partes compreendam e contestem a validade e a confiabilidade de provas digitais, comprometendo o direito à ampla defesa e o devido processo legal.",
      causalLink:
        "A ausência de evidências sobre a auditabilidade e integridade dos sistemas ou provas digitais, conforme exigido pela legislação e boas práticas, cria uma fragilidade probatória que pode levar à invalidação ou desconsideração de tais elementos, impactando o resultado do julgamento.",
      proceduralImpact:
        "A falta de demonstração da auditabilidade, integridade e rastreabilidade de provas digitais ou sistemas pode comprometer a validade e a confiabilidade destas como elementos probatórios, impactando a capacidade das partes de exercerem o contraditório e a ampla defesa sobre tais elementos.",
      strategy: "Impugnação e requerimento de esclarecimentos técnicos/perícia.",
      recommendedAction:
        "Requerer a apresentação de documentação comprobatória sobre a auditabilidade, logs, autenticação e integridade dos sistemas ou provas digitais eventualmente utilizados no processo. Caso aplicável, sugerir perícia técnica para análise.",
      evidenceNotes:
        "O documento analisado é a petição inicial, que não contém informações sobre o uso de tecnologias específicas que demandem análise de auditabilidade, logs, autenticidade ou integridade. Portanto, não há evidências mapeadas relacionadas a esta questão.",
      evidences: [],
    },
    {
      id: "feb-n19",
      index: 19,
      question:
        "Normas tecnicas aplicaveis foram observadas de modo concreto, e nao apenas citadas de forma decorativa?",
      pillar: "P13",
      category: "Nulidade Pericial / Fragilidade Probatória",
      defectNature: "fragilidade_tecnica",
      riskLevel: "critical",
      score: 95.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "alto",
      legalBasis:
        "Art. 473 do Código de Processo Civil, Normas técnicas setoriais aplicáveis (ex: ABNT, ISO, IBAPE, etc.)",
      breachedDuty: "Dever de observância de normas técnicas",
      affectedAct: "Produção da prova pericial (potencialmente)",
      inference:
        "A ausência de qualquer menção a normas técnicas aplicáveis no documento analisado, que é uma peça processual e não um laudo pericial ou relatório técnico, impossibilita a verificação de seu cumprimento. Isso levanta um questionamento sobre a observância de requisitos técnicos essenciais que deveriam estar presentes em um contexto pericial.",
      prejudice:
        "A ausência de observância de normas técnicas pode comprometer a confiabilidade e a validade da prova pericial ou auditoria, impactando diretamente a capacidade de as partes exercerem sua defesa e o juízo formar sua convicção com base em elementos tecnicamente sólidos.",
      causalLink:
        "A falta de documentos que demonstrem a observância de normas técnicas aplicáveis resulta na impossibilidade de verificar a adequação metodológica e a validade do trabalho técnico, gerando fragilidade probatória e potencial nulidade.",
      proceduralImpact:
        "A falta de comprovação da observância de normas técnicas aplicáveis, especialmente em um contexto onde tais normas são cruciais para a validade e confiabilidade de uma prova pericial ou auditoria, pode comprometer a força probatória e a fundamentação de decisões judiciais baseadas em tais elementos. Se o laudo pericial, por exemplo, não foi apresentado ou não demonstrou aderência a normas técnicas, sua validade pode ser questionada.",
      strategy: "Impugnação da prova técnica e/ou pedido de esclarecimentos ou nova perícia.",
      recommendedAction:
        "Solicitar a juntada de laudo pericial ou relatório técnico que aborde as normas técnicas aplicáveis ao caso concreto, demonstrando sua observância. Caso o documento em análise seja a única prova técnica, requer-se a impugnação da sua validade por ausência de fundamentação técnica e aderência normativa.",
      evidenceNotes:
        "O documento analisado é uma petição inicial e não contém informações sobre normas técnicas periciais ou auditoria.",
      evidences: [],
    },
    {
      id: "feb-n20",
      index: 20,
      question:
        "Ha fato superveniente documentado que comprometa imparcialidade, prova, cadeia de custodia ou legitimidade da decisao?",
      pillar: "P14",
      category: "Nao Aplicavel",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Nao Aplicavel",
      affectedAct: "Nao Aplicavel",
      inference:
        "Com base nos documentos fornecidos, não há indícios de fatos supervenientes que comprometam a imparcialidade, a prova, a cadeia de custódia ou a legitimidade da decisão judicial. A documentação apresentada refere-se à fase de contratação e implementação de softwares, com alegações de descumprimento contratual e falhas na prestação de serviços. Estes fatos, embora relevantes para o mérito da causa, não configuram 'descoberta superveniente' no sentido de eventos posteriores que alterem a validade de atos processuais já consolidados ou que demandem nova análise probatória sob uma nova perspectiva.",
      prejudice: "Não há prejuízo processual identificado em relação à descoberta superveniente.",
      causalLink: "Não há nexo causal entre um fato superveniente e um vício processual.",
      proceduralImpact: "Não identificado.",
      strategy: "Não aplicável.",
      recommendedAction: "Não aplicável.",
      evidenceNotes:
        "A análise foi realizada com base nos documentos fornecidos e não foram identificados fatos supervenientes que se enquadrem na definição de risco para esta categoria.",
      evidences: [],
    },
  ],
};

export const grittiNullityReport: NullityReport = {
  caseId: "case-paulo-gritti-matsuda",
  globalScore: 80.8,
  globalLevel: "high",
  acceptedFindings: 19,
  scoreExplanation:
    "Score calculado por ponderacao juridico-pericial: media ponderada 72.57, maior risco 100.0, 0 achado(s) critico(s) e 11 pilar(es) afetado(s).",
  weightedAverage: 72.57,
  maxRisk: 100.0,
  criticalFindings: 0,
  affectedPillars: 11,
  pillarScores: [
    { pillar: "P2", score: 1.37, level: "low", findingCount: 1 },
    { pillar: "P3", score: 100.0, level: "critical", findingCount: 1 },
    { pillar: "P4", score: 100.0, level: "critical", findingCount: 2 },
    { pillar: "P5", score: 86.37, level: "critical", findingCount: 3 },
    { pillar: "P7", score: 100.0, level: "critical", findingCount: 1 },
    { pillar: "P8", score: 100.0, level: "critical", findingCount: 1 },
    { pillar: "P9", score: 53.19, level: "moderate", findingCount: 1 },
    { pillar: "P10", score: 1.27, level: "low", findingCount: 1 },
    { pillar: "P11", score: 1.05, level: "low", findingCount: 1 },
    { pillar: "P12", score: 100.0, level: "critical", findingCount: 1 },
    { pillar: "P13", score: 100.0, level: "critical", findingCount: 1 },
  ],
  findings: [
    {
      id: "pg-n01",
      index: 1,
      question:
        "Ha indicios de incompetencia absoluta, prevencao ignorada ou julgamento por orgao sem competencia legal?",
      pillar: "P1",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: 5.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "nao_aplicavel",
      inference:
        "Não foram identificados elementos nos documentos fornecidos que sugiram incompetência absoluta, prevenção ignorada ou julgamento por órgão sem competência legal.",
      prejudice: "Não há prejuízo processual a ser analisado.",
      causalLink: "Não há nexo causal a ser estabelecido.",
      proceduralImpact: "Nenhum impacto processual identificado.",
      strategy: "Nenhuma estratégia de remediação necessária.",
      recommendedAction: "Nenhuma ação recomendada.",
      evidenceNotes:
        "A análise se baseou nos documentos fornecidos, e estes não contêm informações sobre incompetência.",
      evidences: [],
    },
    {
      id: "pg-n02",
      index: 2,
      question:
        "A distribuicao, conexao, continencia ou prevencao foi enfrentada de forma adequada?",
      pillar: "P1",
      category: "",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: 10.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "nao_aplicavel",
      inference:
        "Não foram identificados nos documentos analisados elementos que indiquem que a distribuição, conexão, continência ou prevenção do feito foram tratadas de forma inadequada.",
      prejudice: "Não há prejuízo processual a ser analisado.",
      causalLink: "Não há nexo causal a ser estabelecido.",
      proceduralImpact: "Não há impacto processual aparente relacionado a estes pontos.",
      strategy: "Nenhuma estratégia de remediação necessária.",
      recommendedAction: "Nenhuma ação recomendada com base nas informações disponíveis.",
      evidenceNotes:
        "A análise se baseou nos documentos fornecidos. As movimentações processuais listadas não indicam controvérsia ou decisão sobre conexão, prevenção ou continência que possa ter sido tratada de forma inadequada.",
      evidences: [],
    },
    {
      id: "pg-n03",
      index: 3,
      question: "Ha elementos documentais de impedimento ou suspeicao do magistrado?",
      pillar: "P2",
      category: "ausencia_de_prova",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 10.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "Art. 144 e 145 do CPC",
      breachedDuty: "Dever de imparcialidade do magistrado",
      affectedAct: "Magistrado",
      inference:
        "A ausencia de indicios documentais de impedimento ou suspeicao do magistrado leva a conclusao de inconclusividade quanto a este item especifico, sem, contudo, descartar a possibilidade de existencia de tais fatos no processo.",
      prejudice:
        "A ausencia de documentos que comprovem ou infirmem a imparcialidade do magistrado impede a avaliacao de possivel prejuizo a defesa ou ao devido processo legal.",
      causalLink:
        "A inexistencia de documentacao que vincule o magistrado a alguma das partes ou a interesse na causa impede a configuracao de nulidade.",
      proceduralImpact:
        "A falta de provas concretas de impedimento ou suspeicao limita a argumentacao quanto a imparcialidade do julgador, nao permitindo a propositura de incidente especifico neste momento.",
      strategy:
        "Requerer acesso a informacoes ou documentos que possam comprovar ou refutar a suspeicao, caso surjam indicios posteriores.",
      recommendedAction:
        "Monitorar o andamento processual e as futuras decisoes para identificar possiveis indicios de parcialidade objetiva ou subjetiva.",
      evidenceNotes:
        "Nao ha mapeamento de evidencias especificas sobre impedimento ou suspeicao do magistrado.",
      evidences: [],
    },
    {
      id: "pg-n04",
      index: 4,
      question: "A decisao revela parcialidade objetiva ou tratamento assimetrico das partes?",
      pillar: "P2",
      category: "sem_risco_identificado",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: 5.0,
      evidenceStrength: "fraca",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "Art. 489, §1º, III do CPC",
      breachedDuty: "Dever de imparcialidade",
      affectedAct: "Decisao judicial",
      inference:
        "As decisoes e termos analisados indicam o seguimento regular do processo, com a concessao de prazos para manifestacao das partes e a devida conclusao dos autos para apreciacao da juiza. Nao ha elementos que sugiram tratamento assimetrico ou favorecimento a uma das partes.",
      prejudice:
        "Nao ha prejuizo a ser analisado, uma vez que nao foram identificados elementos que indiquem parcialidade objetiva ou tratamento assimetrico das partes.",
      causalLink: "Nao se aplica, pois nao houve vicio identificado.",
      proceduralImpact:
        "A ausencia de indicios de parcialidade objetiva ou tratamento assimetrico das partes preserva a regularidade processual e a imparcialidade do julgador.",
      strategy: "Nao aplicavel.",
      recommendedAction:
        "Nao ha acao recomendada, pois nao foram identificados indicios de parcialidade objetiva.",
      evidenceNotes:
        "Nao ha mapeamento de evidencias especificas sobre a decisao judicial em relacao a parcialidade.",
      evidences: [
        {
          page: 6,
          excerpt:
            "Intime-se o perito para se manifestar sobre a impugnacao ao laudo pericial no prazo do art. 477, § 2º, CPC. Após, voltem-me conclusos. Intimem-se. Cumpra-se. SERVE ESTE COMO MANDADO/CARTA/OFÍCIO. Imperatriz, data registrada no sistema. CYNARA ELISA GAMA FREIRE Juíza Titular da 1ª Vara Cível",
        },
        {
          page: 7,
          excerpt:
            "Nesta data faço conclusos os presentes autos ao Gabinete da Juíza de Direito Cynara Elisa Gama Freire titular da 1ª Vara Cível da Comarca de Imperatriz – MA. Imperatriz, 2 de dezembro de 2025. CLEBER SILVA SANTOS Técnico Judiciário",
        },
      ],
    },
    {
      id: "pg-n05",
      index: 5,
      question:
        "As partes foram intimadas e tiveram oportunidade real de participar das diligencias e se manifestar sobre o laudo?",
      pillar: "P3",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 80.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "Art. 5º, LV, CF/88, Art. 7º, 9º, 10º, CPC",
      breachedDuty: "Dever de garantir o contraditório e a ampla defesa.",
      affectedAct: "Laudo Pericial",
      inference:
        "A parte autora apresentou impugnação ao laudo pericial com parecer técnico assistencial, apontando falhas metodológicas (perícia virtual, uso inadequado de NDVI, desconsideração do conceito de vigor de sementes) e pedindo a desconsideração do laudo. Isso indica que, embora intimada, a parte não concordou com a perícia e buscou demonstrar sua fragilidade, exercendo seu direito de defesa. A questão principal reside na adequação da metodologia pericial e na forma como os quesitos foram respondidos, o que pode ter limitado a capacidade de comprovação dos fatos alegados.",
      prejudice:
        "A utilização de um laudo pericial com falhas metodológicas e sem considerar adequadamente os argumentos técnicos da parte autora pode levar a uma decisão judicial desfavorável, pois a prova base seria falha e não refletiria a realidade dos fatos. Isso compromete a isonomia processual e a justiça da decisão.",
      causalLink:
        "A falha na metodologia do laudo pericial, se confirmada, gera o prejuízo à parte autora, pois pode embasar uma decisão judicial errônea que prejudique seus direitos, e a sua capacidade de defender-se plenamente é comprometida pela falta de uma prova técnica confiável e imparcial.",
      proceduralImpact:
        "A existência de uma impugnação fundamentada ao laudo pericial, com contraprova técnica, levanta dúvidas sobre a higidez probatória e pode influenciar a decisão judicial. Se a perícia for considerada falha, a parte que a impugnou pode ter seu direito de defesa efetivado.",
      strategy: "Impugnação ao laudo, com pedido de desconsideração ou realização de nova perícia.",
      recommendedAction:
        "Impugnar o laudo pericial, demonstrando as falhas técnicas e a ausência de oportunidade real de participação ou manifestação sobre pontos cruciais da perícia, caso os argumentos do parecer assistencial não sejam acolhidos.",
      evidenceNotes:
        "O achado se baseia na impugnação ao laudo pericial apresentada pela parte autora, a qual critica a metodologia e as conclusões do perito judicial.",
      evidences: [
        {
          page: 1,
          excerpt:
            "PAULO RENATO GRITTI, já qualificado nos autos, por seus advogados, vem, respeito- a um laudo técnico.",
        },
        {
          page: 2,
          excerpt:
            'O perito judicial, ao dispensar a vistoria e se valer de uma "perícia virtual", não produziu prova técnica, mas apenas uma opinião baseada em ilações, o que contamina de morte todo o seu trabalho.',
        },
        {
          page: 3,
          excerpt:
            'O PTA é categórico: "AS IMAGENS DE SATÉ- LITE, NESTE CASO, SERVEM APENAS PARA CONSTATAR O QUE O AUTOR JÁ ALEGA DESDE A INICIAL: QUE A PASTAGEM NÃO SE ESTABEবিশ. ELAS SÃO A PROVA DO DANO, E NÃO A PROVA DA SUA CAUSA."',
        },
        {
          page: 3,
          excerpt:
            "A conclusão do perito de que a germinação parcial isenta a semente é tecnicamente invertida. Conforme o PTA, é JUSTAMENTE ESSA GERMINAÇÃO FA- LHA E DESUNIFORME QUE APONTA PARA UM PROBLEMA INTRÍNSECO AO INSUMO FORNECIDO PELA RÉ.",
        },
        {
          page: 4,
          excerpt:
            "Este laudo não pode, sob nenhuma hipótese, servir de base para uma decisão ju- dicial justa. Ele representa um risco real de grave erro judiciário, ao validar uma conclusão técnica insustentável em prejuízo do autor.",
        },
      ],
    },
    {
      id: "pg-n06",
      index: 6,
      question: "A prova documental possui origem, autenticidade e integridade verificáveis?",
      pillar: "P4",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 80.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "moderado",
      legalBasis: "Art. 373, I do CPC, Art. 473 do CPC",
      breachedDuty: "Dever de apresentar prova idônea e fundamentada.",
      affectedAct: "Laudo Pericial",
      inference:
        "A impugnação ao laudo pericial, com a apresentação de parecer técnico assistencial, aponta para a fragilidade da metodologia e conclusões do perito judicial. A ausência de metadados ou validação técnica dos documentos que compõem a prova pericial reforça a dúvida sobre sua integridade e origem.",
      prejudice:
        "A fragilidade probatória compromete a capacidade de defesa da parte autora, que pode ter suas alegações desconsideradas com base em um laudo viciado. A decisão judicial pode ser proferida com base em premissas técnicas equivocadas.",
      causalLink:
        "A falta de clareza e fundamentação técnica no laudo, aliada à metodologia questionada e à ausência de comprovação de integridade, gera dúvida sobre sua validade como prova, o que pode levar à sua desconsideração e prejudicar a análise fática do litígio.",
      proceduralImpact:
        "O laudo pericial, ao apresentar fragilidades metodológicas e conclusivas apontadas por parecer técnico assistencial, e sem comprovação de integridade e origem, pode ter sua força probatória mitigada ou desconsiderada, impactando a decisão judicial.",
      strategy: "Impugnação ao laudo pericial e pedido de nova perícia.",
      recommendedAction:
        "Impugnar o laudo pericial, requerendo a desconsideração de suas conclusões e/ou a realização de nova perícia com metodologia adequada e que atenda aos requisitos de integridade e rastreabilidade.",
      evidenceNotes:
        "O laudo pericial foi impugnado pela parte autora, que apresentou parecer técnico assistencial com críticas à metodologia e conclusões do perito judicial. A impugnação alega que o laudo é tecnicamente falho, especulativo e tendencioso.",
      evidences: [
        {
          page: 8,
          excerpt:
            'A análise conjunta do laudo pericial e do parecer técnico assistencial em anexo deixa claro que o trabalho do perito judicial é imprestável como meio de prova. Ele é: • Tecnicamente falho: Baseado em metodologia remota inadequada e que ignora conceitos agronômicos basilares. • Especulativo: Fundado em "ilações" e "suposições", e não em dados em- píricos verificáveis. • Tendencioso: Adota acriticamente a narrativa da ré, conferindo-lhe um verniz técnico que ela não possui.',
        },
        {
          page: 13,
          excerpt:
            "O perito do Réu afirma apenas a existência da possibilidade de a germinação ter ocorrida mas sem a emergência. Deixou, pois, de afirmar conclusivamente o que de fato ocorreu no presente caso, que foi de fato, a falta de vigor.",
        },
      ],
    },
    {
      id: "pg-n07",
      index: 7,
      question:
        "Houve produção unilateral, contradita ignorada, inspeção sem ciência ou alteração do objeto da prova?",
      pillar: "P4",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 85.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "alto",
      legalBasis: "Art. 369 do CPC, Art. 473 do CPC, Art. 5º, LV da CF",
      breachedDuty: "Dever de garantir o contraditório e a produção probatória adequada.",
      affectedAct: "Laudo Pericial",
      inference:
        "A parte autora, em sua impugnação ao laudo pericial, alega que o perito judicial realizou uma perícia virtual, dispensando a vistoria in loco, o que configura uma produção probatória unilateral e inadequada. Além disso, aponta que o perito ignorou conceitos técnicos essenciais, como o 'vigor' da semente, e utilizou de forma leviana dados de satélite. Tais alegações, se procedentes, indicam vícios na produção da prova.",
      prejudice:
        "A produção unilateral da prova e a alegação de ignorância de conceitos técnicos essenciais prejudicam a análise fática do caso e podem levar a uma decisão judicial desprovida de fundamentação técnica robusta, em detrimento da parte autora.",
      causalLink:
        "A realização de uma perícia virtual sem a devida vistoria in loco e a suposta ignorância de conceitos técnicos relevantes configuram uma falha na produção da prova, que, se confirmada, compromete a sua validade e a possibilidade de a parte autora exercer plenamente seu direito ao contraditório e à ampla defesa.",
      proceduralImpact:
        "A produção unilateral da prova, com a ausência de vistoria in loco e a suposta ignorância de conceitos técnicos relevantes, compromete o contraditório e a ampla defesa, pois a parte autora não teve a oportunidade de influenciar a coleta de dados de forma efetiva e de refutar as conclusões com base em elementos concretos.",
      strategy:
        "Impugnação ao laudo pericial com pedido de nulidade e realização de nova perícia com vistoria in loco.",
      recommendedAction:
        "Requerer a nulidade da prova pericial, com base na sua produção unilateral e na violação do contraditório, e solicitar a realização de nova perícia com vistoria in loco.",
      evidenceNotes:
        "A parte autora impugnou o laudo pericial, alegando que o perito realizou uma 'perícia virtual' sem vistoria in loco, o que configura produção unilateral da prova e violação do contraditório. Além disso, alega que o perito ignorou conceitos técnicos essenciais, como o 'vigor' da semente.",
      evidences: [
        {
          page: 8,
          excerpt:
            'O perito judicial, ao dispensar a vistoria e se valer de uma "perícia virtual", não produziu prova técnica, mas apenas uma opinião baseada em ilações, o que contamina de morte todo o seu trabalho.',
        },
        {
          page: 9,
          excerpt:
            'O perito judicial utiliza as imagens de satélite de forma leviana, induzindo o juízo a crer que a diferença de vegetação observada remotamente comprova o "erro de manejo". Isso é uma falácia técnica. O PTA é categórico: "AS IMAGENS DE SATÉ- LITE, NESTE CASO, SERVEM APENAS PARA CONSTATAR O QUE O AUTOR JÁ ALEGA DESDE A INICIAL: QUE A PASTAGEM NÃO SE ESTABEবিশ. ELAS SÃO A PROVA DO DANO, E NÃO A PROVA DA SUA CAUSA."',
        },
        {
          page: 10,
          excerpt:
            "O PTA refuta essa conclusão de forma demolidora, introduzindo o conceito técnico de VIGOR, que foi completamente igno- rado pelo perito judicial.",
        },
      ],
    },
    {
      id: "pg-n08",
      index: 8,
      question:
        "O procedimento pericial teve cronograma, diligencias regulares, resposta a quesitos e limites do objeto respeitados?",
      pillar: "P5",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 80.0,
      evidenceStrength: "moderada",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "Art. 479 do CPC",
      breachedDuty:
        "Dever de diligência e imparcialidade do perito, dever de fundamentação técnica",
      affectedAct: "Laudo Pericial",
      inference:
        "A parte autora impugna o laudo pericial, alegando que a ausência de vistoria in loco e a utilização de metodologia remota (NDVI) tornaram a perícia inviável e baseada em ilações, comprometendo sua validade técnica e procedimental.",
      prejudice:
        "A ausência de vistoria in loco e a metodologia questionável podem levar a conclusões equivocadas, comprometendo a correta apuração dos fatos e a formação da convicção do juiz, prejudicando o direito de defesa e a busca pela verdade real.",
      causalLink:
        "A alegada falha na realização da perícia (ausência de vistoria in loco e metodologia inadequada) pode gerar um laudo imprestável, que, se utilizado como base para a decisão, causaria prejuízo à parte que teve seu direito de defesa cerceado.",
      proceduralImpact:
        "A falta de diligências regulares (vistoria in loco) e a metodologia inadequada podem comprometer a fidedignidade do laudo pericial, que é um meio de prova importante na decisão judicial. Isso pode afetar o direito de defesa e a correta apuração dos fatos.",
      strategy: "Impugnação do laudo e pedido de complementação/esclarecimentos.",
      recommendedAction:
        "Requerer esclarecimentos ao perito sobre a impossibilidade de vistoria in loco e a justificativa para a metodologia remota utilizada. Caso as explicações não sejam satisfatórias, pugnar por nova perícia.",
      evidenceNotes:
        "A análise se baseou na impugnação apresentada pela parte autora (ID 164115864), que contesta a metodologia e a ausência de vistoria in loco.",
      evidences: [
        {
          page: 1,
          excerpt:
            'Conforme já aduzido, o ponto de partida para a total invalidação do laudo judicial é a confissão do próprio perito sobre a inutilidade de uma vistoria in loco, uma vez que as condições fáticas foram "completamente modificadas ou extintas". O Parecer Técnico Assistencial (doravante "PTA") ratifica e aprofunda essa crí- tica, ao afirmar que "A REALIZAÇÃO DE UMA PERÍCIA NÃO PRESENCIAL, PARA AVALIAÇÃO DE UMA CULTURA AGRÍCOLA JÁ EXTINTA HÁ ANOS, É TECNICA- MENTE INVIÁVEL E TEMERÁRIA". O PTA esclarece que a determinação da causa da má germinação de uma pastagem é uma análise multifatorial complexa,',
        },
        {
          page: 2,
          excerpt:
            'O perito judicial, ao dispensar a vistoria e se valer de uma "perícia virtual", não produziu prova técnica, mas apenas uma opinião baseada em ilações, o que contamina de morte todo o seu trabalho.',
        },
      ],
    },
    {
      id: "pg-n09",
      index: 9,
      question:
        "A metodologia possui validação científica, repetibilidade, rastreabilidade, margem de erro e precisão suficientes?",
      pillar: "P5",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 90.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "baixo",
      legalBasis: "Art. 473 do CPC, Normas Técnicas de Agronomia",
      breachedDuty: "Dever de diligência técnica, dever de fundamentação científica",
      affectedAct: "Laudo Pericial",
      inference:
        "A parte autora, através de seu assistente técnico, contesta a metodologia empregada pelo perito judicial (análise remota por NDVI) e a desconsideração de conceitos agronômicos essenciais (vigor da semente), argumentando que tais falhas tornam o laudo cientificamente inadequado e conclusões especulativas.",
      prejudice:
        "A utilização de metodologia cientificamente questionável e a omissão de conceitos técnicos essenciais resultam em um laudo que não reflete a realidade fática, podendo levar a uma decisão judicial errônea e ao prejuízo da parte.",
      causalLink:
        "A falha na metodologia científica e técnica do laudo pericial (uso inadequado do NDVI, desconsideração do vigor da semente) pode resultar em conclusões errôneas, que, se acolhidas pelo juiz, prejudicam a correta apuração dos fatos e a justiça da decisão.",
      proceduralImpact:
        "A utilização de metodologia cientificamente inadequada e a desconsideração de conceitos técnicos relevantes podem levar a um laudo pericial falho, que, se aceito pelo juízo, comprometerá a decisão judicial e o direito de defesa.",
      strategy: "Impugnação técnica do laudo e pedido de nova perícia com metodologia adequada.",
      recommendedAction:
        "Requerer ao perito que justifique cientificamente a adoção da metodologia NDVI para diagnóstico causal e que explique a consideração (ou ausência) do conceito de 'vigor' da semente em sua análise. Se a justificativa for insatisfatória, requerer nova perícia com metodologia adequada.",
      evidenceNotes:
        "A análise se baseou na impugnação apresentada pela parte autora (ID 164115864), que detalha as inadequações científicas e metodológicas do laudo pericial, incluindo a crítica ao uso do NDVI e a desconsideração do conceito de vigor da semente.",
      evidences: [
        {
          page: 2,
          excerpt:
            'O perito judicial, ao dispensar a vistoria e se valer de uma "perícia virtual", não produziu prova técnica, mas apenas uma opinião baseada em ilações, o que contamina de morte todo o seu trabalho.',
        },
        {
          page: 2,
          excerpt:
            'O pilar da "análise virtual" do perito foi o uso de geoprocessamento de imagens de satélite (NDVI). O PTA desmascara a inadequação dessa ferramenta para o caso concreto. O NDVI (Índice de Vegetação por Diferença Normalizada) é uma ferramenta que mede a "vitaliciedade" ou o "vigor" da vegetação em uma área, mas NÃO É CAPAZ DE DIAGNOSTICAR A CAUSA DE UMA EVENTUAL FALHA. Conforme aponta o PTA, o NDVI pode mostrar que uma área tem menos vege- tação que outra, mas é CIENTIFICAMENTE IMPOSSÍVEL que essa ferramenta, por si só, determine se a falha ocorreu por: • Sementes de má qualidade (baixo vigor,',
        },
        {
          page: 3,
          excerpt:
            "O PTA refuta essa conclusão de forma demolidora, introduzindo o conceito técnico de VIGOR, que foi completamente ignorado pelo perito judicial. • Germinação vs. Vigor: O PTA esclarece que o teste de germinação (apre- sentado no Termo de Conformidade da ré) é feito em condições ideais de laboratório. O vigor, por outro lado, é a capacidade da semente de germi- nar e emergir em condições de campo, que são sempre mais adversas. Um lote de sementes pode ter um bom índice de germinação em laboratório, mas baixo vigor, o que o torna incapaz de se estabelecer adequadamente no campo. • A Explicação Té",
        },
      ],
    },
    {
      id: "pg-n10",
      index: 10,
      question:
        "O perito apresenta impedimento, suspeição, conflito de interesse ou qualificação incompatível com o objeto?",
      pillar: "P5",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "moderate",
      score: 60.0,
      evidenceStrength: "moderada",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "moderado",
      preclusionRisk: "baixo",
      legalBasis: "Art. 145 do CPC, Art. 468 do CPC",
      breachedDuty: "Dever de imparcialidade do perito",
      affectedAct: "Perícia",
      inference:
        "Embora não haja indícios formais de impedimento ou suspeição, a alegação de que o perito judicial agiu de forma 'leviana' e adotou 'acriticamente a narrativa da ré' pode sugerir um viés ou uma falta de imparcialidade na condução da perícia, impactando a confiança na atuação do expert.",
      prejudice:
        "A alegação de tendenciosidade pode minar a confiança no laudo pericial, dificultando a formação de convicção judicial e potencialmente levando a uma decisão desfavorável à parte que se sente prejudicada pela parcialidade do expert.",
      causalLink:
        "Se o perito de fato adotou a narrativa da ré de forma acrítica, sua imparcialidade pode estar comprometida, o que invalida o laudo como prova técnica confiável e pode levar a uma decisão judicial baseada em premissas equivocadas.",
      proceduralImpact:
        "A percepção de tendenciosidade ou falta de imparcialidade do perito pode abalar a credibilidade do laudo pericial, comprometendo a sua utilização como meio de prova e, consequentemente, a justa decisão da causa.",
      strategy: "Impugnação ao laudo com alegação de tendenciosidade e pedido de esclarecimentos.",
      recommendedAction:
        "Avaliar a pertinência das alegações de tendenciosidade e solicitar ao perito que preste esclarecimentos sobre sua independência e a fundamentação técnica que o levou a adotar a narrativa da ré, se for o caso. Considerar a possibilidade de arguír suspeição, caso haja elementos concretos.",
      evidenceNotes:
        "A análise se baseou na impugnação apresentada pela parte autora (ID 164115864), que alega que o perito adotou acriticamente a narrativa da ré, sugerindo tendenciosidade.",
      evidences: [
        {
          page: 3,
          excerpt:
            'O perito judicial utiliza as imagens de satélite de forma leviana, induzindo o juízo a crer que a diferença de vegetação observada remotamente comprova o "erro de manejo". Isso é uma falácia técnica. O PTA é categórico: "AS IMAGENS DE SATÉ- LITE, NESTE CASO, SERVEM APENAS PARA CONSTATAR O QUE O AUTOR JÁ ALEGA DESDE A INICIAL: QUE A PASTAGEM NÃO SE ESTABE বিশুদ্ধ. ELAS SÃO A PROVA DO DANO, E NÃO A PROVA DA SUA CAUSA."',
        },
        {
          page: 3,
          excerpt:
            'A análise conjunta do laudo pericial e do parecer técnico assistencial em anexo deixa claro que o trabalho do perito judicial é imprestável como meio de prova. Ele é: • Tecnicamente falho: Baseado em metodologia remota inadequada e que ignora conceitos agronômicos basilares. • Especulativo: Fundado em "ilações" e "suposições", e não em dados em- píricos verificáveis. • Tendencioso: Adota acriticamente a narrativa da ré, conferindo-lhe um verniz técnico que ela não possui.',
        },
      ],
    },
    {
      id: "pg-n11",
      index: 11,
      question:
        "Ha conflito, vinculo economico ou influencia indevida envolvendo assistente tecnico, perito ou escritorio?",
      pillar: "P6",
      category: "sem_risco_identificado",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: 1.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "Nenhum",
      affectedAct: "Nenhum",
      inference:
        "Não foram encontrados elementos nos autos que sugiram conflito de interesses, vínculo econômico ou influência indevida entre o perito judicial e os assistentes técnicos. A atuação do assistente técnico da parte autora, conforme manifestado na impugnação, foca em aspectos técnicos da perícia, sem indicar qualquer relação imprópria com o perito judicial.",
      prejudice:
        "Não há prejuízo processual identificado em relação a este ponto, pois não foram encontrados indícios de irregularidades.",
      causalLink: "Não aplicável, pois não há vício identificado.",
      proceduralImpact:
        "A ausência de indícios de irregularidades na atuação dos assistentes técnicos não gera, neste momento, impacto processual direto. No entanto, a atuação técnica do assistente, ao levantar questionamentos sobre o laudo, pode influenciar a convicção do juízo.",
      strategy: "Nenhum",
      recommendedAction:
        "Monitorar a atuação dos assistentes técnicos e a interação com o perito judicial, caso surjam elementos que indiquem potencial conflito de interesses ou influência indevida.",
      evidenceNotes: "Não houve mapeamento de evidências pois o achado é pela ausência de risco.",
      evidences: [],
    },
    {
      id: "pg-n12",
      index: 12,
      question:
        "A decisao omitiu provas, quesitos, impugnacoes ou contradicoes relevantes do laudo?",
      pillar: "P7",
      category: "negativa_de_prestacao_jurisdicional",
      defectNature: "nulidade_relativa",
      riskLevel: "high",
      score: 80.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "moderado",
      legalBasis: "Art. 489, § 1º, IV, do CPC, Art. 1.022, II, do CPC, Art. 5º, LV, da CF",
      breachedDuty: "dever_de_fundamentacao",
      affectedAct: "decisao",
      inference:
        "Há um indício de que a decisão judicial (despacho de ID 173644984) pode ter omitido a análise da impugnação ao laudo pericial apresentada pela parte autora (ID 164115864), a qual contém argumentos técnicos robustos e contestações diretas à metodologia e conclusões do laudo pericial.",
      prejudice:
        "A parte autora teve sua defesa prejudicada pela ausência de análise específica de seus argumentos de impugnação ao laudo pericial. A decisão, ao não abordar os pontos levantados, falha em seu dever de fundamentação, o que pode levar à manutenção de uma decisão equivocada baseada em prova técnica questionável, cerceando a ampla defesa.",
      causalLink:
        "O despacho judicial, ao se limitar a intimar o perito sobre a impugnação sem analisar o seu mérito, não cumpre o dever de fundamentação e não garante o contraditório substancial sobre a prova pericial, impactando diretamente a justiça da decisão.",
      proceduralImpact:
        "A omissão na análise da impugnação ao laudo pericial, especialmente quando esta aponta fragilidades técnicas e metodológicas relevantes, compromete o contraditório e a ampla defesa, pois a parte autora não teve seus argumentos técnicos devidamente considerados e rebatidos pela decisão judicial. Isso pode levar a uma decisão baseada em prova viciada ou incompleta.",
      strategy: "impugnacao_recursal",
      recommendedAction:
        "Impugnar a decisão, destacando a ausência de análise da impugnação ao laudo pericial e dos argumentos técnicos apresentados pelo assistente técnico, requerendo que o juízo se manifeste expressamente sobre os pontos levantados.",
      evidenceNotes:
        "Não foi possível mapear evidências específicas para este achado, pois ele se baseia na ausência de análise de um documento (impugnação ao laudo) por parte da decisão judicial.",
      evidences: [],
    },
    {
      id: "pg-n13",
      index: 13,
      question:
        "A decisao apresenta fundamentacao aparente, generica, contraditoria ou sem enfrentamento de argumentos centrais?",
      pillar: "P8",
      category: "fundamentacao_decisoria",
      defectNature: "irregularidade_simples",
      riskLevel: "high",
      score: 85.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis: "Art. 489, §1º, II, CPC",
      breachedDuty: "dever de fundamentacao",
      affectedAct: "laudo pericial",
      inference:
        "A parte autora, por meio de seu parecer técnico assistencial, contesta veementemente a metodologia e as conclusões do laudo pericial judicial. Argumenta-se que a perícia não presencial, baseada em imagens de satélite (NDVI), é inadequada para determinar a causa da falha na germinação das sementes, pois desconsidera fatores essenciais analisáveis apenas in loco e na época dos fatos. Além disso, sustenta-se que o laudo judicial ignorou o conceito técnico de 'vigor' da semente, que, segundo a parte autora, explica a germinação parcial e irregular observada. A impugnação sugere que o laudo judicial é especulativo e falho tecnicamente, não podendo servir de base para a decisão.",
      prejudice:
        "A decisão judicial, ao se basear em um laudo pericial impugnado por falhas metodológicas e técnicas graves, pode carecer de fundamentação idônea, comprometendo o direito de defesa da parte prejudicada pela prova considerada e, consequentemente, a justiça da decisão.",
      causalLink:
        "A utilização de um laudo pericial que não enfrenta os argumentos centrais da impugnação e que se baseia em metodologia questionável, sem a devida análise crítica pelo juízo, pode levar a uma decisão desprovida de fundamentação robusta, violando o dever legal de motivação das decisões judiciais.",
      proceduralImpact:
        "A existência de uma impugnação robusta, baseada em parecer técnico assistencial, que contesta a metodologia e as conclusões do laudo pericial, levanta dúvidas sobre a confiabilidade da prova técnica produzida. Se o juiz se basear em um laudo pericial que foi tecnicamente refutado, a decisão poderá carecer de fundamentação adequada, pois estaria baseada em prova deficiente ou inadequada.",
      strategy: "Avaliar embargos, preliminar recursal ou nulidade por fundamentação deficiente.",
      recommendedAction:
        "Requerer que o juiz analise detidamente a impugnação ao laudo pericial e o parecer técnico assistencial, confrontando-os com as conclusões do laudo judicial. Caso entenda que as críticas são procedentes, pode ser necessária a reiteração da perícia com metodologia adequada, a oitiva do perito para esclarecimentos sobre os pontos de divergência técnica, ou a desconsideração do laudo pericial, baseando a decisão nos demais elementos dos autos.",
      evidenceNotes:
        "A análise se baseou na impugnação ao laudo pericial (ID 164115864) e no parecer técnico assistencial anexado (ID 156436095), que contestam a metodologia e as conclusões do laudo pericial judicial.",
      evidences: [
        {
          page: 1,
          excerpt:
            "BG ADVOGADOS SO ASSOCIADOS AO JUÍZO DE DIREITO DA 1ª VARA CÍVEL DA COMARCA DE IMPERATRIZ ES- TADO DO MARANHÃO Ref.: Processo nº 0044412-52.2020.8.27.2729 PAULO RENATO GRITTI, já qualificado nos autos, por seus advogados, vem, respeito- samente, perante Vossa Excelência, apresentar IMPUGNAÇÃO AO LAUDO PERI- CIAL DE ID 156436094, robustecendo seus argumentos com as conclusões do Parecer Técnico Assistencial anexado, o que faz com base nos seguintes fundamentos fáticos e jurídicos: 1 DA PREMISSA EQUIVOCADA: A CONFISSÃO DA IMPOSSIBILIDADE E A METODO- LOGIA INADEQUADA Conforme já aduzido, o ponto d",
        },
        {
          page: 2,
          excerpt:
            'O perito judicial utiliza as imagens de satélite de forma leviana, induzindo o juízo a crer que a diferença de vegetação observada remotamente comprova o "erro de manejo". Isso é uma falácia técnica. O PTA é categórico: "AS IMAGENS DE SATÉ- LITE, NESTE CASO, SERVEM APENAS PARA CONSTATAR O QUE O AUTOR JÁ ALEGA DESDE A INICIAL: QUE A PASTAGEM NÃO SE ESTABE বিশুদ্ধ. ELAS SÃO A PROVA DO DANO, E NÃO A PROVA DA SUA CAUSA." 3 A FALÁCIA DA GERMINAÇÃO PARCIAL E A DESCONSIDERAÇÃO DO "VIGOR" DA SEMENTE O argumento central do perito para isentar a semente é que a germinação parcial comprovaria a qualidade',
        },
        {
          page: 14,
          excerpt:
            "C – Quase toda semente sofre algum tipo de dormência antes de germinar inclusive as de capim Mombaça, objeto dessa lide. As sementes de capim-mombaça (Panicum maximum cv. Mombaça) também sofrem de dormência. A dormência é uma característica natural que impede que as sementes germinem imediatamente após a colheita, funcionando como um mecanismo de defesa da espécie. Uma vez germinada, necessita de vigor para crescer. Quanto a isso, segundo a EMBRAPA de forma suscinta, podemos afirmar que “dormência é a dificuldade para germinar e vigor é a energia para que o embrião germinado se desenvolva até",
        },
      ],
    },
    {
      id: "pg-n14",
      index: 14,
      question:
        "Ha omissao persistente, negativa de prestacao jurisdicional ou vicio em julgamento colegiado?",
      pillar: "P9",
      category: "nulidade_relativa",
      defectNature: "inconclusivo",
      riskLevel: "moderate",
      score: 60.0,
      evidenceStrength: "moderada",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "alto",
      preclusionRisk: "baixo",
      legalBasis:
        "Art. 489, § 1º, IV do CPC - Ausência de fundamentação, Art. 1.022, II do CPC - Embargos de Declaração (omissão)",
      breachedDuty: "fundamentação",
      affectedAct: "decisao",
      inference:
        "A parte autora apresentou uma impugnação detalhada ao laudo pericial, com um parecer técnico assistencial que aponta falhas significativas na metodologia e conclusão do perito judicial. Se essa impugnação não for devidamente analisada e fundamentada pelo juízo, especialmente em caso de recurso posterior, pode configurar omissão ou negativa de prestação jurisdicional, violando o dever de fundamentação.",
      prejudice:
        "A ausência de fundamentação adequada sobre a impugnação ao laudo pericial pode levar a uma decisão judicial desprovida de base sólida, comprometendo a defesa da parte e a correta aplicação do direito, além de criar um vício passível de anulação em sede recursal.",
      causalLink:
        "A falta de análise e fundamentação sobre os argumentos técnicos apresentados na impugnação ao laudo pericial pela parte autora pode levar o juízo a proferir uma decisão que ignore tais vícios, configurando omissão e violando o dever de fundamentação. Isso, por sua vez, pode ser alegado como nulidade em eventual recurso.",
      proceduralImpact:
        "A ausência de análise aprofundada dos argumentos da impugnação ao laudo pericial pode levar a uma decisão judicial baseada em prova técnica viciada, comprometendo a justiça da decisão. Em sede recursal, pode gerar um fundamento para a interposição de embargos de declaração ou outros recursos, com alegação de nulidade por omissão.",
      strategy:
        "Avaliar a decisão judicial para verificar se os argumentos da impugnação foram abordados. Caso contrário, interpor Embargos de Declaração para sanar a omissão. Se a questão recursal já estiver finda, considerar a interposição de recurso cabível para anular a decisão por vício de fundamentação.",
      recommendedAction:
        "Verificar se os argumentos da impugnação ao laudo pericial e do parecer técnico assistencial foram devidamente considerados e fundamentados na decisão judicial. Caso contrário, considerar a interposição de Embargos de Declaração para sanar a omissão, ou, em caso de recurso posterior, alegar a nulidade.",
      evidenceNotes:
        "A análise se baseia nos documentos de impugnação ao laudo pericial (ID 164115864), termo de conclusão (ID 167321936) e despacho intimando o perito (ID 2603031911041890000160741181), os quais indicam a existência de debates técnicos sobre a prova pericial que, se não devidamente resolvidos em decisão, podem gerar omissão.",
      evidences: [
        {
          page: 8,
          excerpt:
            "BG ADVOGADOS SO ASSOCIADOS AO JUÍZO DE DIREITO DA 1ª VARA CÍVEL DA COMARCA DE IMPERATRIZ ES- TADO DO MARANHÃO Ref.: Processo nº 0044412-52.2020.8.27.2729 PAULO RENATO GRITTI, já qualificado nos autos, por seus advogados, vem, respeito- samente, perante Vossa Excelência, apresentar IMPUGNAÇÃO AO LAUDO PERI- CIAL DE ID 156436094, robustecendo seus argumentos com as conclusões do Parecer Técnico Assistencial anexado, o que faz com base nos seguintes fundamentos fáticos e jurídicos: 1 DA PREMISSA EQUIVOCADA: A CONFISSÃO DA IMPOSSIBILIDADE E A METODO- LOGIA INADEQUADA Conforme já aduzido, o ponto d",
        },
        {
          page: 11,
          excerpt:
            '4 CONCLUSÃO FINAL: UM LAUDO IMPRESTÁVEL E A NECESSIDADE DE SEU TOTAL DESCARTE 9. A análise conjunta do laudo pericial e do parecer técnico assistencial em anexo deixa claro que o trabalho do perito judicial é imprestável como meio de prova. Ele é: • Tecnicamente falho: Baseado em metodologia remota inadequada e que ignora conceitos agronômicos basilares. • Especulativo: Fundado em "ilações" e "suposições", e não em dados em- píricos verificáveis. • Tendencioso: Adota acriticamente a narrativa da ré, conferindo-lhe um verniz técnico que ela não possui. Endereço: Rua João Lisboa, 1281, Centro, I',
        },
        {
          page: 7,
          excerpt:
            "TERMO DE CONCLUSÃO Nesta data faço conclusos os presentes autos ao Gabinete da Juíza de Direito Cynara Elisa Gama Freire titular da 1ª Vara Cível da Comarca de Imperatriz – MA. Imperatriz, 2 de dezembro de 2025. CLEBER SILVA SANTOS Técnico Judiciário",
        },
        {
          page: 6,
          excerpt:
            "DESPACHO Intime-se o perito para se manifestar sobre a impugnação ao laudo pericial no prazo do art. 477, § 2º, CPC. Após, voltem-me conclusos. Intimem-se. Cumpra-se. SERVE ESTE COMO MANDADO/CARTA/OFÍCIO. Imperatriz, data registrada no sistema. CYNARA ELISA GAMA FREIRE Juíza Titular da 1ª Vara Cível",
        },
      ],
    },
    {
      id: "pg-n15",
      index: 15,
      question:
        "Ha calculo, liquidacao, penhora, avaliacao ou pericia contabil sem contraditorio ou tecnicamente inadequada?",
      pillar: "P10",
      category: "nao_identificada",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 10.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "",
      affectedAct: "nao_aplicavel",
      inference:
        "Não há elementos nos documentos fornecidos que permitam avaliar a existência de cálculos, liquidação, penhora, avaliação ou perícia contábil sem contraditório ou tecnicamente inadequada na fase de execução.",
      prejudice:
        "Sem a análise de documentos específicos da fase de execução, não é possível determinar se houve prejuízo à parte representada.",
      causalLink:
        "A ausência de documentos relevantes para a análise impede a conexão entre um potencial vício e um prejuízo processual.",
      proceduralImpact:
        "A ausência de análise sobre nulidades na fase de execução impede a identificação de eventuais vícios que possam prejudicar a parte representada nesta fase processual.",
      strategy: "Apresentar documentos da fase de execução para análise.",
      recommendedAction:
        "É necessário apresentar documentos e informações relativas à fase de execução para que a análise possa ser realizada.",
      evidenceNotes:
        "A análise se baseou nos documentos fornecidos e no texto de alguns atos processuais. Não foram encontrados documentos que permitissem a análise de nulidades na fase de execução.",
      evidences: [],
    },
    {
      id: "pg-n16",
      index: 16,
      question:
        "Ha indicios concretos de concentracao de nomeacoes, criterio dirigido ou violacao de governanca na escolha do perito?",
      pillar: "P11",
      category: "Não aplicável",
      defectNature: "inconclusivo",
      riskLevel: "low",
      score: 10.0,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "baixo",
      legalBasis: "",
      breachedDuty:
        "Dever de garantir a governança processual e a imparcialidade na escolha de peritos.",
      affectedAct: "Nomeação do perito",
      inference:
        "A ausência de informações sobre o histórico de nomeações, critérios de escolha ou cadastro do perito impede a análise quanto a possíveis irregularidades na governança processual e potencial direcionamento ou concentração de nomeações. Sem esses dados, não é possível afirmar ou negar a existência de tais riscos.",
      prejudice:
        "A ausência de análise sobre a governança na escolha do perito pode ocultar vícios que comprometeriam a imparcialidade e a isenção da prova pericial, afetando o direito de defesa e a justa solução da lide.",
      causalLink:
        "A falta de documentos e informações impede a análise direta sobre a existência de irregularidades na escolha do perito, tornando inconclusivo o julgamento sobre a violação da governança processual.",
      proceduralImpact:
        "A falta de informações sobre a governança na nomeação do perito impede a verificação de potenciais vícios que poderiam comprometer a imparcialidade e a regularidade do processo pericial, impactando a confiança na prova produzida.",
      strategy: "Requerimento de diligência para obtenção de documentos complementares.",
      recommendedAction:
        "Solicitar ao juízo a apresentação de informações sobre os critérios de nomeação do perito, bem como o histórico de nomeações realizadas, para verificar a existência de concentração ou direcionamento. Caso o perito seja de cadastro, solicitar cópia do mesmo.",
      evidenceNotes:
        "A análise baseou-se na ausência de documentos que comprovem ou refutem a concentração de nomeações ou critério dirigido na escolha do perito, conforme a descrição do checklist P11.Q1. Não foram encontrados nos documentos disponíveis (petições, despachos, laudos, termos de conclusão) elementos que permitam aferir a governança na nomeação do perito.",
      evidences: [],
    },
    {
      id: "pg-n17",
      index: 17,
      question:
        "A prova digital, sistema, algoritmo ou IA usados no caso sao auditaveis e preservam logs, autenticacao e integridade?",
      pillar: "P12",
      category: "Nulidade Relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 80.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "baixo",
      legalBasis:
        "Art. 375 do CPC - O juiz aplicará as regras de experiência comum subministradas pela observação do que mais torpe ou mais conforme aos usos do lugar não pode ser aplicado ao caso.",
      breachedDuty: "Dever de produzir prova técnica confiável e auditável",
      affectedAct: "Laudo pericial",
      inference:
        "A ausência de logs, metadados, documentação do sistema ou certificações de integridade para a análise de imagens de satélite (NDVI) utilizada na perícia sugere que a prova digital pode não ser auditável, comprometendo sua integridade e confiabilidade. A impugnação da parte autora reforça essa fragilidade, ao alegar que o método é inapropriado e não conclusivo quanto à causa do problema.",
      prejudice:
        "A utilização de prova digital sem a devida comprovação de auditabilidade, integridade e rastreabilidade compromete a segurança jurídica e o devido processo legal. A parte sucumbente pode ter seu direito cerceado por uma decisão fundamentada em prova viciada, sem possibilidade de efetiva fiscalização técnica.",
      causalLink:
        "A falta de auditabilidade e integridade da prova digital (análise de NDVI) impede a verificação da sua correção e confiabilidade, o que, por sua vez, pode levar a uma decisão judicial baseada em premissas incorretas, prejudicando a parte que teve sua defesa comprometida pela impossibilidade de contestar adequadamente a prova técnica.",
      proceduralImpact:
        "O laudo pericial, base tecnológica da decisão, pode ser considerado imprestável por falta de auditabilidade e integridade da prova digital, fragilizando a fundamentação da decisão judicial e comprometendo o direito de defesa.",
      strategy: "Impugnação / Esclarecimentos",
      recommendedAction:
        "Requerer ao perito a apresentação de logs, metadados, documentação técnica do sistema de análise de NDVI e certificações de integridade para comprovar a auditabilidade e a confiabilidade da prova. Subsidiariamente, solicitar nova perícia com metodologia que permita a auditabilidade e a rastreabilidade dos dados.",
      evidenceNotes:
        "O achado se baseia na impugnação apresentada pela parte autora e na ausência de elementos nos autos que demonstrem a auditabilidade e integridade da prova digital utilizada na perícia, não havendo mapeamento específico no contexto.",
      evidences: [
        {
          page: 1,
          excerpt:
            'O perito judicial, ao dispensar a vistoria e se valer de uma "perícia virtual", não produziu prova técnica, mas apenas uma opinião baseada em ilações, o que contamina de morte todo o seu trabalho. 2 A ANÁLISE REMOTA POR NDVI: UMA FERRAMENTA IMPRÓPRIA PARA O DIAGNÓSTICO CAUSAL O pilar da "análise virtual" do perito foi o uso de geoprocessamento de imagens de satélite (NDVI). O PTA desmascara a inadequação dessa ferramenta para o caso concreto. O NDVI (Índice de Vegetação por Diferença Normalizada) é uma ferramenta que mede a "vitaliciedade" ou o "vigor" da vegetação em uma área, mas NÃO É CAPAZ',
        },
        {
          page: 1,
          excerpt:
            'O perito judicial, ao dispensar a vistoria e se valer de uma "perícia virtual", não produziu prova técnica, mas apenas uma opinião baseada em ilações, o que contamina de morte todo o seu trabalho. 2 A ANÁLISE REMOTA POR NDVI: UMA FERRAMENTA IMPRÓPRIA PARA O DIAGNÓSTICO CAUSAL O pilar da "análise virtual" do perito foi o uso de geoprocessamento de imagens de satélite (NDVI). O PTA desmascara a inadequação dessa ferramenta para o caso concreto. O NDVI (Índice de Vegetação por Diferença Normalizada) é uma ferramenta que mede a "vitaliciedade" ou o "vigor" da vegetação em uma área, mas NÃO É CAPAZ',
        },
      ],
    },
    {
      id: "pg-n18",
      index: 18,
      question:
        "Normas técnicas aplicaveis foram observadas de modo concreto, e nao apenas citadas de forma decorativa?",
      pillar: "P13",
      category: "nulidade_relativa",
      defectNature: "fragilidade_tecnica",
      riskLevel: "high",
      score: 90.0,
      evidenceStrength: "forte",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "critico",
      preclusionRisk: "alto",
      legalBasis: "Art. 473, § 1º, do Código de Processo Civil (CPC)",
      breachedDuty: "dever de fundamentação técnica e metodológica adequada",
      affectedAct: "laudo pericial",
      inference:
        "A impugnação ao laudo pericial, embasada em parecer técnico assistencial, sugere que o perito judicial aplicou metodologia inadequada (análise remota via NDVI) e desconsiderou conceitos técnicos cruciais (vigor da semente), em desacordo com as boas práticas e normas técnicas aplicáveis à agronomia, o que pode comprometer a validade e confiabilidade do laudo.",
      prejudice:
        "O laudo pericial, ao se basear em metodologia questionável e ignorar conceitos técnicos relevantes, pode levar a uma conclusão equivocada sobre a causa da falha na germinação das sementes. Isso prejudica a parte autora, que pode ter seu pedido indeferido com base em uma prova falha, ou a parte ré, caso a conclusão erroneamente aponte sua responsabilidade.",
      causalLink:
        "A inadequação da metodologia e a desconsideração de normas técnicas e conceitos agronômicos pelo perito resultaram em um laudo tecnicamente falho, o que compromete sua capacidade de servir como prova idônea e, consequentemente, pode influenciar indevidamente a decisão judicial, gerando prejuízo às partes.",
      proceduralImpact:
        "A metodologia falha e a desconsideração de conceitos técnicos podem levar a uma conclusão errônea do laudo pericial, comprometendo a análise fática e jurídica do caso e, consequentemente, a decisão judicial. O princípio do contraditório pode ser afetado caso a parte não consiga refutar adequadamente um laudo tecnicamente deficiente.",
      strategy: "Impugnação ao laudo pericial e pedido de desconsideração ou esclarecimentos.",
      recommendedAction:
        "Requerer ao juiz a desconsideração do laudo pericial em virtude da sua fragilidade técnica e metodológica, com base nas alegações do parecer técnico assistencial. Subsidiariamente, solicitar esclarecimentos detalhados ao perito sobre a aplicação das normas técnicas e a consideração dos conceitos de 'vigor' e 'germinação', ou, em último caso, requerer nova perícia com profissional especializado e com metodologia adequada.",
      evidenceNotes:
        "A análise se baseou na impugnação ao laudo pericial, que cita um parecer técnico assistencial, confrontando a metodologia do perito judicial com princípios técnicos agronômicos e o uso de ferramentas como NDVI.",
      evidences: [
        {
          page: 9,
          excerpt:
            'O perito judicial utiliza as imagens de satélite de forma leviana, induzindo o juízo a crer que a diferença de vegetação observada remotamente comprova o "erro de manejo". Isso é uma falácia técnica. O PTA é categórico: "AS IMAGENS DE SATÉLITE, NESTE CASO, SERVEM APENAS PARA CONSTATAR O QUE O AUTOR JÁ ALEGA DESDE A INICIAL: QUE A PASTAGEM NÃO SE ESTABE বিশুদ্ধ. ELAS SÃO A PROVA DO DANO, E NÃO A PROVA DA SUA CAUSA."',
        },
        {
          page: 10,
          excerpt:
            "O PTA refuta essa conclusão de forma demolidora, introduzindo o conceito técnico de VIGOR, que foi completamente ignorado pelo perito judicial. • Germinação vs. Vigor: O PTA esclarece que o teste de germinação (apresentado no Termo de Conformidade da ré) é feito em condições ideais de laboratório. O vigor, por outro lado, é a capacidade da semente de germinar e emergir em condições de campo, que são sempre mais adversas. Um lote de sementes pode ter um bom índice de germinação em laboratório, mas baixo vigor, o que o torna incapaz de se estabelecer adequadamente no campo. • A Explicação Técnic",
        },
      ],
    },
    {
      id: "pg-n19",
      index: 19,
      question:
        "Ha fato superveniente documentado que comprometa imparcialidade, prova, cadeia de custodia ou legitimidade da decisao?",
      pillar: "P14",
      category: "nao_se_aplica",
      defectNature: "nao_aplicavel",
      riskLevel: "low",
      score: null,
      evidenceStrength: "documento_essencial_ausente",
      evidenceMapSupport: "sem_mapeamento",
      strategicValue: "baixo",
      preclusionRisk: "nao_aplicavel",
      legalBasis: "",
      breachedDuty: "nao_violado",
      affectedAct: "nao_afetado",
      inference:
        "A análise do bloco não revelou a existência de fatos supervenientes com potencial para comprometer a integridade do processo ou a decisão judicial.",
      prejudice:
        "Sem a identificação de fatos supervenientes, não há prejuízo a ser analisado sob esta ótica.",
      causalLink:
        "Não identificado nexo causal entre fatos supervenientes e prejuízos processuais.",
      proceduralImpact: "Não há impacto processual imediato decorrente de fatos supervenientes.",
      strategy: "",
      recommendedAction:
        "Acompanhar a evolução processual para identificar eventuais fatos supervenientes que possam surgir.",
      evidenceNotes:
        "O bloco analisado (Descoberta Superveniente) não apresentou achados relevantes que necessitem de mapeamento de evidências.",
      evidences: [],
    },
  ],
};

export const nullityReports: NullityReport[] = [
  eletromarNullityReport,
  febNullityReport,
  grittiNullityReport,
];

export function getNullityReport(caseId: string): NullityReport | undefined {
  return nullityReports.find((report) => report.caseId === caseId);
}
