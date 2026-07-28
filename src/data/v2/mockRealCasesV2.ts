/**
 * EvidIA Investor Suite V2
 * Dados demonstrativos baseados em processos judiciais reais e documentos públicos.
 *
 * IMPORTANTE:
 * - "source_fact": fato diretamente identificável no processo.
 * - "party_allegation": alegação de uma das partes, ainda sujeita a contraditório.
 * - "demo_inference": inferência criada para demonstrar a proposta da EvidIA.
 * - "simulated_metric": score, valuation ou probabilidade exclusivamente demonstrativos.
 *
 * Não tratar scores ou recomendações como parecer jurídico.
 */

export type EvidenceNature =
  | "source_fact"
  | "party_allegation"
  | "expert_statement"
  | "court_statement"
  | "demo_inference"
  | "simulated_metric";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export type FindingStatus =
  | "evidence_found"
  | "relevant_absence"
  | "internal_contradiction"
  | "document_cited_not_attached"
  | "inconclusive"
  | "not_applicable"
  | "requires_human_review";

export interface SourceReference {
  sourceFile: string;
  sourcePage: number;
  documentLabel: string;
  nature: EvidenceNature;
  excerpt?: string;
  notes?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  nature: EvidenceNature;
  source?: SourceReference;
}

export interface EvidenceItem {
  id: string;
  title: string;
  evidenceType:
    | "text_excerpt"
    | "relevant_absence"
    | "document_comparison"
    | "methodology_gap"
    | "temporal_inconsistency"
    | "procedural_event";
  summary: string;
  source: SourceReference;
  demoUse: string;
}

export interface AuditFinding {
  id: string;
  blockId: string;
  title: string;
  auditQuestion: string;
  status: FindingStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  thesisSide: "claimant" | "defendant" | "neutral";
  nature: EvidenceNature;
  evidenceIds: string[];
  inference: string;
  proceduralImpact: string;
  recommendedAction: string;
  includedInReport: boolean;
}

export interface AuditBlock {
  id: string;
  name: string;
  integrityScore: number;
  riskLevel: RiskLevel;
  summary: string;
  findingIds: string[];
}

export interface RedTeamAttack {
  id: string;
  title: string;
  attackingSide: "claimant" | "defendant";
  thesis: string;
  successProbability: number;
  severity: RiskLevel;
  sourceBasis: EvidenceNature;
  evidenceIds: string[];
  mitigation: string;
}

export interface DemoValuation {
  currency: "BRL";
  grossClaimValue: number;
  initialReferencePrice: number;
  recommendedPrice: number;
  scenarios: Array<{
    id: "conservative" | "base" | "aggressive";
    label: string;
    recommendedPrice: number;
    expectedRecovery: number;
    roiMultiple: number;
    probabilityOfSuccess: number;
  }>;
  adjustments: Array<{
    label: string;
    amount: number;
    direction: "positive" | "negative";
    nature: "simulated_metric";
    rationale: string;
  }>;
  disclaimer: string;
}

export interface RealCaseDemo {
  id: string;
  slug: string;
  dataStatus: "document_grounded" | "thesis_only" | "awaiting_documents";
  portfolioRole: "flagship" | "secondary" | "placeholder";
  displayName: string;
  processNumber?: string;
  court?: string;
  courtUnit?: string;
  actionType?: string;
  claimValue?: number;
  parties: {
    claimant: string;
    defendant: string;
  };
  sector: string;
  proceduralStage: string;
  executiveSummary: string;
  centralDemoThesis: string;
  opposingThesis: string;
  recommendation: "invest" | "reprice" | "hold" | "reject" | "human_review";
  legalScore: number;
  evidenceScore: number;
  nullityRiskScore: number;
  settlementLeverageScore: number;
  documentsAnalyzed: number;
  pagesAnalyzed: number;
  sourceFiles: string[];
  timeline: TimelineEvent[];
  evidences: EvidenceItem[];
  auditBlocks: AuditBlock[];
  findings: AuditFinding[];
  redTeam: RedTeamAttack[];
  valuation?: DemoValuation;
  demoNotice: string;
}

const febSource = "resultado_paginado_FEB x SAP_20260715-1629_20260716-0755_v2.txt";

const grittiSource = "resultado_PAULO GRITTI x MATSUDA_20260716-0806.txt";

export const febSapCase: RealCaseDemo = {
  id: "case-feb-sap",
  slug: "federacao-espirita-brasileira-vs-sap",
  dataStatus: "document_grounded",
  portfolioRole: "flagship",
  displayName: "Federação Espírita Brasileira × SAP Brasil",
  processNumber: "1116020-53.2020.8.26.0100",
  court: "TJSP",
  courtUnit: "Foro Central Cível de São Paulo",
  actionType: "Rescisão contratual cumulada com ressarcimento de valores",
  claimValue: 683369.03,
  parties: {
    claimant: "Federação Espírita Brasileira — FEB",
    defendant: "SAP Brasil Ltda.",
  },
  sector: "Tecnologia / ERP",
  proceduralStage: "Fase pericial e debate sobre substituição do expert",
  executiveSummary:
    "Controvérsia sobre licenciamento e implantação de soluções SAP, utilidade econômica do sistema e responsabilidade técnica. A demonstração EvidIA concentra-se na aderência do trabalho pericial ao encargo judicial, na resposta aos quesitos, na análise dos backups e na separação entre conclusão técnica e mérito jurídico.",
  centralDemoThesis:
    "Risco de nulidade ou de perda de utilidade da prova pericial por descumprimento do encargo, não resposta a quesitos deferidos, análise infra petita e incursão em matéria jurídica.",
  opposingThesis:
    "A SAP sustenta que a implantação foi executada por terceiro, que o escopo pericial deve se limitar ao relacionamento contratual com a SAP e que os peritos nomeados possuem qualificação e imparcialidade.",
  recommendation: "human_review",
  legalScore: 67,
  evidenceScore: 48,
  nullityRiskScore: 86,
  settlementLeverageScore: 73,
  documentsAnalyzed: 1,
  pagesAnalyzed: 1594,
  sourceFiles: [febSource],
  timeline: [
    {
      date: "2020-12-02",
      title: "Ação distribuída",
      description:
        "A FEB formula pedido de rescisão e ressarcimento, atribuindo à causa o valor de R$ 683.369,03.",
      nature: "source_fact",
      source: {
        sourceFile: febSource,
        sourcePage: 42,
        documentLabel: "Petição inicial",
        nature: "source_fact",
      },
    },
    {
      date: "2022-06-07",
      title: "Laudo pericial juntado",
      description:
        "O laudo delimita o escopo e considera prejudicadas perguntas relacionadas à implantação.",
      nature: "expert_statement",
      source: {
        sourceFile: febSource,
        sourcePage: 1062,
        documentLabel: "Laudo pericial",
        nature: "expert_statement",
      },
    },
    {
      date: "2022-09-06",
      title: "Pedido de substituição do perito",
      description:
        "A FEB alega recusa de respostas, inconsistências e emissão de juízo sobre questões de mérito e direito.",
      nature: "party_allegation",
      source: {
        sourceFile: febSource,
        sourcePage: 1160,
        documentLabel: "Manifestação da FEB",
        nature: "party_allegation",
      },
    },
    {
      date: "2024-02-01",
      title: "Sentença anulada em segundo grau",
      description:
        "Documentos posteriores registram que o acórdão anulou a sentença e apontou desconformidade do primeiro laudo com a determinação judicial.",
      nature: "court_statement",
      source: {
        sourceFile: febSource,
        sourcePage: 1523,
        documentLabel: "Manifestação sobre a fase pericial",
        nature: "party_allegation",
        notes:
          "A tela deve apresentar a informação como referência processual documentada, sem reproduzir conclusão jurídica autônoma da EvidIA.",
      },
    },
    {
      date: "2025-05-05",
      title: "Novo pedido de substituição e perícia conjunta",
      description: "A FEB pede substituição dos experts e realização coordenada com ação conexa.",
      nature: "party_allegation",
      source: {
        sourceFile: febSource,
        sourcePage: 1524,
        documentLabel: "Petição da FEB",
        nature: "party_allegation",
      },
    },
    {
      date: "2025-07-31",
      title: "Contraditório da SAP",
      description:
        "A SAP se opõe à substituição e sustenta a qualificação e regularidade dos peritos.",
      nature: "party_allegation",
      source: {
        sourceFile: febSource,
        sourcePage: 1543,
        documentLabel: "Manifestação da SAP",
        nature: "party_allegation",
      },
    },
  ],
  evidences: [
    {
      id: "feb-ev-01",
      title: "Quesitos deferidos e não respondidos",
      evidenceType: "procedural_event",
      summary:
        "A FEB registra que todos os quesitos técnicos foram deferidos, mas o expert deixou de responder parte relevante deles.",
      source: {
        sourceFile: febSource,
        sourcePage: 1162,
        documentLabel: "Pedido de substituição do perito",
        nature: "party_allegation",
        excerpt: "todos os quesitos apresentados pelas partes referem-se à matéria técnica",
      },
      demoUse: "Mostrar alerta de completude do checklist e contador de perguntas sem resposta.",
    },
    {
      id: "feb-ev-02",
      title: "Backups não examinados",
      evidenceType: "methodology_gap",
      summary:
        "Manifestação processual reproduz conclusão de acórdão segundo a qual o laudo não examinou os backups indicados na determinação judicial.",
      source: {
        sourceFile: febSource,
        sourcePage: 1460,
        documentLabel: "Manifestação técnica-processual",
        nature: "court_statement",
        excerpt: "não tendo o perito examinado os backups",
      },
      demoUse: "Apresentar como requisito pericial não cumprido e evidência digital não auditada.",
    },
    {
      id: "feb-ev-03",
      title: "Delimitação unilateral do escopo",
      evidenceType: "methodology_gap",
      summary:
        "O laudo afirma que perguntas sobre implantação estavam prejudicadas por estarem fora do escopo definido pelo expert.",
      source: {
        sourceFile: febSource,
        sourcePage: 1062,
        documentLabel: "Laudo pericial",
        nature: "expert_statement",
        excerpt: "restando prejudicadas as respostas aos quesitos sobre estes temas",
      },
      demoUse: "Comparar escopo judicial, escopo executado e lacunas resultantes.",
    },
    {
      id: "feb-ev-04",
      title: "Incursão em mérito jurídico",
      evidenceType: "procedural_event",
      summary:
        "A FEB sustenta que o perito emitiu juízos sobre mérito, direito e litisconsórcio passivo.",
      source: {
        sourceFile: febSource,
        sourcePage: 1459,
        documentLabel: "Manifestação da FEB",
        nature: "party_allegation",
        excerpt: "não adentrar a méritos jurídicos de litisconsórcio passivo",
      },
      demoUse: "Exibir detector de fronteira entre análise técnica e conclusão jurídica.",
    },
    {
      id: "feb-ev-05",
      title: "Mais de vinte quesitos apontados como ignorados",
      evidenceType: "relevant_absence",
      summary:
        "Manifestação afirma que mais de vinte quesitos e pontos controvertidos teriam sido suprimidos.",
      source: {
        sourceFile: febSource,
        sourcePage: 1461,
        documentLabel: "Manifestação técnica-processual",
        nature: "party_allegation",
        excerpt: "mais de 20 quesitos por ele ignorados",
      },
      demoUse: "Painel de cobertura: respondido, parcial, prejudicado e não respondido.",
    },
    {
      id: "feb-ev-06",
      title: "Contraditório sobre qualificação e imparcialidade",
      evidenceType: "document_comparison",
      summary:
        "A SAP contesta os pedidos de substituição e sustenta que os peritos possuem qualificação técnica e idoneidade.",
      source: {
        sourceFile: febSource,
        sourcePage: 1543,
        documentLabel: "Manifestação da SAP",
        nature: "party_allegation",
        excerpt: "nenhuma das hipóteses do artigo 468 do CPC restou demonstrada",
      },
      demoUse:
        "Red Team deve mostrar a contraposição e reduzir a confiança de conclusões unilaterais.",
    },
  ],
  auditBlocks: [
    {
      id: "feb-b1",
      name: "Cumprimento do encargo pericial",
      integrityScore: 31,
      riskLevel: "critical",
      summary:
        "Indícios documentais de diferença entre o escopo deferido, as diligências esperadas e o trabalho executado.",
      findingIds: ["feb-f-01", "feb-f-02"],
    },
    {
      id: "feb-b2",
      name: "Quesitos e contraditório técnico",
      integrityScore: 35,
      riskLevel: "critical",
      summary:
        "Cobertura incompleta dos quesitos e controvérsia sobre respostas declaradas prejudicadas.",
      findingIds: ["feb-f-03", "feb-f-04"],
    },
    {
      id: "feb-b3",
      name: "Limites da atuação técnica",
      integrityScore: 46,
      riskLevel: "high",
      summary:
        "Risco de mistura entre inferência técnica, definição de responsabilidade e mérito jurídico.",
      findingIds: ["feb-f-05"],
    },
    {
      id: "feb-b4",
      name: "Imparcialidade e revisão humana",
      integrityScore: 58,
      riskLevel: "high",
      summary:
        "Alegações contrapostas exigem revisão humana e exposição equilibrada do contraditório.",
      findingIds: ["feb-f-06"],
    },
  ],
  findings: [
    {
      id: "feb-f-01",
      blockId: "feb-b1",
      title: "Diligência digital não executada",
      auditQuestion: "Os backups indicados na decisão judicial foram efetivamente examinados?",
      status: "relevant_absence",
      riskLevel: "critical",
      riskScore: 92,
      confidence: 0.93,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["feb-ev-02"],
      inference:
        "A ausência de exame dos backups pode comprometer a aderência da perícia ao objeto técnico deferido.",
      proceduralImpact:
        "Potencial necessidade de complementação, nova perícia ou redução da força probatória do laudo.",
      recommendedAction:
        "Solicitar comprovação das diligências digitais e matriz de rastreabilidade entre decisão, dados examinados e conclusões.",
      includedInReport: true,
    },
    {
      id: "feb-f-02",
      blockId: "feb-b1",
      title: "Escopo executado inferior ao escopo controvertido",
      auditQuestion:
        "A perícia respondeu integralmente aos pontos controvertidos fixados pelo juízo?",
      status: "requires_human_review",
      riskLevel: "high",
      riskScore: 84,
      confidence: 0.86,
      thesisSide: "neutral",
      nature: "demo_inference",
      evidenceIds: ["feb-ev-03", "feb-ev-06"],
      inference:
        "Existe divergência entre a delimitação adotada pelo expert e a compreensão da autora sobre o escopo deferido.",
      proceduralImpact:
        "Risco de laudo inconclusivo ou de controvérsia sobre a utilidade da prova.",
      recommendedAction:
        "Exibir lado a lado decisão de saneamento, quesitos deferidos, respostas e justificativas de prejudicialidade.",
      includedInReport: true,
    },
    {
      id: "feb-f-03",
      blockId: "feb-b2",
      title: "Quesitos técnicos sem resposta conclusiva",
      auditQuestion: "Todos os quesitos deferidos possuem resposta objetiva e fundamentada?",
      status: "relevant_absence",
      riskLevel: "critical",
      riskScore: 90,
      confidence: 0.91,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["feb-ev-01", "feb-ev-05"],
      inference:
        "A cobertura incompleta pode impedir o contraditório técnico efetivo e dificultar a valoração da prova.",
      proceduralImpact:
        "Complementação do laudo, esclarecimentos obrigatórios ou discussão de nulidade da prova.",
      recommendedAction:
        "Gerar tabela de cobertura dos quesitos e destacar os sem resposta, parciais ou declarados prejudicados.",
      includedInReport: true,
    },
    {
      id: "feb-f-04",
      blockId: "feb-b2",
      title: "Prejudicialidade declarada pelo próprio expert",
      auditQuestion:
        "A exclusão de quesitos decorreu de decisão judicial ou de interpretação do perito?",
      status: "requires_human_review",
      riskLevel: "high",
      riskScore: 81,
      confidence: 0.84,
      thesisSide: "neutral",
      nature: "demo_inference",
      evidenceIds: ["feb-ev-03", "feb-ev-06"],
      inference:
        "A legitimidade da redução do escopo depende da comparação com as decisões judiciais e o contraditório das partes.",
      proceduralImpact:
        "Pode alterar a validade das conclusões sobre responsabilidade e funcionamento do sistema.",
      recommendedAction:
        "Marcar para revisão jurídica humana antes de qualquer recomendação ao comitê.",
      includedInReport: true,
    },
    {
      id: "feb-f-05",
      blockId: "feb-b3",
      title: "Possível invasão do mérito jurídico",
      auditQuestion:
        "O laudo separa claramente constatação técnica de conclusão sobre responsabilidade jurídica?",
      status: "requires_human_review",
      riskLevel: "high",
      riskScore: 78,
      confidence: 0.76,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["feb-ev-04"],
      inference:
        "Atribuições sobre litisconsórcio, culpa ou legitimidade podem ultrapassar a função técnica do expert.",
      proceduralImpact:
        "Redução da confiabilidade do laudo e necessidade de expurgar conclusões jurídicas.",
      recommendedAction:
        "Classificar trechos por natureza: fato técnico, hipótese, inferência e conclusão jurídica.",
      includedInReport: true,
    },
    {
      id: "feb-f-06",
      blockId: "feb-b4",
      title: "Controvérsia bilateral sobre imparcialidade",
      auditQuestion:
        "Há base documental suficiente para afirmar impedimento ou suspeição do expert?",
      status: "inconclusive",
      riskLevel: "moderate",
      riskScore: 58,
      confidence: 0.62,
      thesisSide: "neutral",
      nature: "demo_inference",
      evidenceIds: ["feb-ev-06"],
      inference:
        "A existência de alegações e contra-alegações não permite conclusão automática de parcialidade.",
      proceduralImpact: "Decisão depende de avaliação judicial e revisão humana qualificada.",
      recommendedAction:
        "Não apresentar a substituição como resultado automático; exibir argumentos de ambas as partes.",
      includedInReport: true,
    },
  ],
  redTeam: [
    {
      id: "feb-rt-01",
      title: "Separação entre licenciamento e implantação",
      attackingSide: "defendant",
      thesis:
        "A implantação foi executada por empresa terceira; a responsabilidade da SAP deve ser limitada ao licenciamento e suporte contratados.",
      successProbability: 0.64,
      severity: "high",
      sourceBasis: "party_allegation",
      evidenceIds: ["feb-ev-03", "feb-ev-06"],
      mitigation:
        "Demonstrar documentalmente a indicação da parceira, a integração econômica do projeto e a utilidade nula das licenças sem implantação.",
    },
    {
      id: "feb-rt-02",
      title: "Preclusão e manutenção do perito",
      attackingSide: "defendant",
      thesis:
        "Os requisitos legais para substituição não foram comprovados e a questão já teria sido apreciada.",
      successProbability: 0.55,
      severity: "high",
      sourceBasis: "party_allegation",
      evidenceIds: ["feb-ev-06"],
      mitigation:
        "Distinguir fatos supervenientes, descumprimento do encargo e insuficiência da prova de alegações genéricas de suspeição.",
    },
    {
      id: "feb-rt-03",
      title: "Nulidade por descumprimento do encargo",
      attackingSide: "claimant",
      thesis:
        "A não análise dos backups e a ausência de respostas a quesitos deferidos tornam a prova incompleta e potencialmente imprestável.",
      successProbability: 0.78,
      severity: "critical",
      sourceBasis: "demo_inference",
      evidenceIds: ["feb-ev-01", "feb-ev-02", "feb-ev-05"],
      mitigation:
        "Complementação integral, inspeção dos backups, respostas objetivas e revisão por expert com experiência comprovada em ERP.",
    },
    {
      id: "feb-rt-04",
      title: "Expurgo de conclusões jurídicas do laudo",
      attackingSide: "claimant",
      thesis:
        "O expert ultrapassou a análise técnica ao formular conclusões sobre responsabilidade, escopo jurídico e litisconsórcio.",
      successProbability: 0.69,
      severity: "high",
      sourceBasis: "party_allegation",
      evidenceIds: ["feb-ev-04"],
      mitigation:
        "Reformular o laudo com separação explícita entre evidência técnica, inferência e matéria reservada ao juízo.",
    },
  ],
  valuation: {
    currency: "BRL",
    grossClaimValue: 683369.03,
    initialReferencePrice: 275000,
    recommendedPrice: 218000,
    scenarios: [
      {
        id: "conservative",
        label: "Conservador",
        recommendedPrice: 165000,
        expectedRecovery: 355000,
        roiMultiple: 1.55,
        probabilityOfSuccess: 0.52,
      },
      {
        id: "base",
        label: "Base",
        recommendedPrice: 218000,
        expectedRecovery: 515000,
        roiMultiple: 2.36,
        probabilityOfSuccess: 0.64,
      },
      {
        id: "aggressive",
        label: "Agressivo",
        recommendedPrice: 275000,
        expectedRecovery: 650000,
        roiMultiple: 2.36,
        probabilityOfSuccess: 0.73,
      },
    ],
    adjustments: [
      {
        label: "Risco de prova pericial incompleta",
        amount: 52000,
        direction: "negative",
        nature: "simulated_metric",
        rationale:
          "Desconto demonstrativo associado à necessidade de complementação ou repetição da perícia.",
      },
      {
        label: "Alavanca por sentença anteriormente anulada",
        amount: 28000,
        direction: "positive",
        nature: "simulated_metric",
        rationale: "Ajuste ilustrativo relacionado à reabertura da discussão probatória.",
      },
      {
        label: "Incerteza sobre responsabilidade SAP/KPIT",
        amount: 33000,
        direction: "negative",
        nature: "simulated_metric",
        rationale:
          "Desconto demonstrativo pela fragmentação contratual e teses de terceiro executor.",
      },
    ],
    disclaimer:
      "Valores de preço, probabilidade e ROI são simulações de produto e não constituem avaliação financeira, jurídica ou recomendação de investimento.",
  },
  demoNotice:
    "Caso baseado em documentos públicos reais. Scores, probabilidades, recomendações e valuation são exclusivamente simulados para demonstração da EvidIA.",
};

export const pauloGrittiMatsudaCase: RealCaseDemo = {
  id: "case-paulo-gritti-matsuda",
  slug: "paulo-gritti-vs-matsuda",
  dataStatus: "document_grounded",
  portfolioRole: "secondary",
  displayName: "Paulo Renato Gritti × Matsuda",
  processNumber: "0804563-35.2017.8.10.0040",
  court: "TJMA",
  courtUnit: "1ª Vara Cível de Imperatriz",
  actionType: "Procedimento comum cível",
  claimValue: 63640,
  parties: {
    claimant: "Paulo Renato Gritti",
    defendant: "Com. Ind. Matsuda Imp. Exportadora Ltda.",
  },
  sector: "Agronegócio / Sementes",
  proceduralStage: "Impugnação ao laudo pericial e esclarecimentos do expert",
  executiveSummary:
    "Litígio sobre falha de germinação de sementes de capim Mombaça. O laudo judicial foi construído por análise documental, imagens de satélite, reuniões remotas e documentos das partes, sem vistoria direta do local no momento da perícia. A demonstração EvidIA explora risco metodológico, causalidade, temporalidade e assimetria na valoração dos documentos.",
  centralDemoThesis:
    "A perícia não presencial, realizada quase dez anos após os fatos, não teria base empírica suficiente para atribuir causalidade ao manejo e teria absorvido documentos da ré de forma mais favorável que os documentos do autor.",
  opposingThesis:
    "O lote estava em conformidade regulatória; a germinação parcial e a diferença entre semeadura a lanço e incorporação indicariam falha operacional e profundidade inadequada.",
  recommendation: "reprice",
  legalScore: 61,
  evidenceScore: 43,
  nullityRiskScore: 79,
  settlementLeverageScore: 66,
  documentsAnalyzed: 1,
  pagesAnalyzed: 333,
  sourceFiles: [grittiSource],
  timeline: [
    {
      date: "2017-05-04",
      title: "Ação distribuída",
      description: "Procedimento comum cível, com valor da causa de R$ 63.640,00.",
      nature: "source_fact",
      source: {
        sourceFile: grittiSource,
        sourcePage: 1,
        documentLabel: "Capa do processo PJe",
        nature: "source_fact",
      },
    },
    {
      date: "2018-04-17",
      title: "Impugnação de documentos da ré",
      description:
        "O autor questiona relatório técnico e ficha de atendimento produzidos meses após o plantio.",
      nature: "party_allegation",
      source: {
        sourceFile: grittiSource,
        sourcePage: 203,
        documentLabel: "Pontos controvertidos",
        nature: "party_allegation",
      },
    },
    {
      date: "2025-06-23",
      title: "Início da perícia virtual",
      description:
        "O laudo registra perícia virtual, reuniões remotas e dispensa de vistoria in loco.",
      nature: "expert_statement",
      source: {
        sourceFile: grittiSource,
        sourcePage: 41,
        documentLabel: "Laudo pericial",
        nature: "expert_statement",
      },
    },
    {
      date: "2025-08-05",
      title: "Laudo pericial juntado",
      description:
        "O expert conclui que a falha decorreu do manejo e da profundidade da semeadura, não da qualidade das sementes.",
      nature: "expert_statement",
      source: {
        sourceFile: grittiSource,
        sourcePage: 54,
        documentLabel: "Conclusão do laudo",
        nature: "expert_statement",
      },
    },
    {
      date: "2025-10-27",
      title: "Impugnação ao laudo",
      description:
        "O autor apresenta parecer assistencial e questiona a metodologia remota, o uso do NDVI e a conclusão causal.",
      nature: "party_allegation",
      source: {
        sourceFile: grittiSource,
        sourcePage: 8,
        documentLabel: "Impugnação ao laudo",
        nature: "party_allegation",
      },
    },
    {
      date: "2026-03-03",
      title: "Expert intimado para esclarecimentos",
      description: "O juízo determina manifestação do perito sobre a impugnação ao laudo.",
      nature: "court_statement",
      source: {
        sourceFile: grittiSource,
        sourcePage: 6,
        documentLabel: "Despacho",
        nature: "court_statement",
      },
    },
  ],
  evidences: [
    {
      id: "pg-ev-01",
      title: "Perícia virtual sem vistoria in loco",
      evidenceType: "methodology_gap",
      summary:
        "O próprio laudo informa que a perícia ocorreu virtualmente e que a vistoria presencial foi dispensada.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 41,
        documentLabel: "Laudo pericial",
        nature: "expert_statement",
        excerpt: "sendo dispensada pelas partes processuais e perito, a vistoria in loco",
      },
      demoUse:
        "Mostrar alerta de limitação empírica e diferença entre dano observado e causa comprovada.",
    },
    {
      id: "pg-ev-02",
      title: "Metodologia documental e geoespacial",
      evidenceType: "methodology_gap",
      summary: "O trabalho usou documentos, imagens de satélite, oitivas e software de apoio.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 41,
        documentLabel: "Metodologia do laudo",
        nature: "expert_statement",
        excerpt: "análises e interpretações técnica de documentos, geoprocessamento de imagens",
      },
      demoUse: "Classificar o método como indireto e exigir limites de inferência causal.",
    },
    {
      id: "pg-ev-03",
      title: "Ausência de análise contemporânea do solo",
      evidenceType: "relevant_absence",
      summary:
        "Petição informa inexistência de análise química e física do solo à época dos fatos.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 56,
        documentLabel: "Manifestação do autor",
        nature: "party_allegation",
        excerpt: "inexiste análise química e física do solo",
      },
      demoUse: "Exibir lacuna probatória crítica na matriz de causalidade.",
    },
    {
      id: "pg-ev-04",
      title: "Relatório da ré produzido meses depois",
      evidenceType: "temporal_inconsistency",
      summary:
        "Documento técnico da Matsuda foi elaborado mais de cinco meses após o período de plantio, segundo manifestação do autor.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 203,
        documentLabel: "Pontos controvertidos",
        nature: "party_allegation",
        excerpt: "realizado após 166 dias do início",
      },
      demoUse: "Destacar distância temporal entre evento, inspeção e documento.",
    },
    {
      id: "pg-ev-05",
      title: "Contradições em documentos da ré",
      evidenceType: "document_comparison",
      summary:
        "A manifestação compara referências a solo molhado, solo arenoso e boas condições de preparo.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 208,
        documentLabel: "Pontos controvertidos",
        nature: "party_allegation",
        excerpt: "solo encontrava-se molhado... solo estava arenoso",
      },
      demoUse: "Ativar visualização comparativa de documentos e detector de contradições.",
    },
    {
      id: "pg-ev-06",
      title: "NDVI demonstra dano, mas causalidade é controvertida",
      evidenceType: "methodology_gap",
      summary:
        "A impugnação sustenta que imagens de satélite mostram falha de estabelecimento, mas não identificam sua causa.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 9,
        documentLabel: "Impugnação ao laudo",
        nature: "party_allegation",
        excerpt: "a prova do dano, e não a prova da sua causa",
      },
      demoUse: "Separar visualmente detecção de evento, hipótese causal e conclusão.",
    },
    {
      id: "pg-ev-07",
      title: "Conclusão judicial baseada em manejo",
      evidenceType: "procedural_event",
      summary:
        "O laudo atribui o problema à profundidade inadequada em solo arenoso e à forma de semeadura.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 54,
        documentLabel: "Conclusão do laudo",
        nature: "expert_statement",
        excerpt: "os prejuízos alegados decorrem de falhas operacionais no plantio",
      },
      demoUse: "Usar como tese principal da defesa no Red Team.",
    },
    {
      id: "pg-ev-08",
      title: "Germinação parcial e vigor da semente",
      evidenceType: "document_comparison",
      summary:
        "A impugnação contrapõe o conceito de vigor ao uso da germinação parcial como evidência de qualidade do lote.",
      source: {
        sourceFile: grittiSource,
        sourcePage: 10,
        documentLabel: "Impugnação ao laudo",
        nature: "party_allegation",
        excerpt:
          "germinação irregular observada é... sintoma de um lote de sementes de baixo vigor",
      },
      demoUse: "Exibir controvérsia técnica com duas hipóteses concorrentes.",
    },
  ],
  auditBlocks: [
    {
      id: "pg-b1",
      name: "Perícia direta e contemporaneidade",
      integrityScore: 29,
      riskLevel: "critical",
      summary:
        "A prova foi produzida anos após o evento e sem inspeção direta do cenário original.",
      findingIds: ["pg-f-01", "pg-f-02"],
    },
    {
      id: "pg-b2",
      name: "Metodologia e causalidade",
      integrityScore: 41,
      riskLevel: "high",
      summary:
        "Imagens e documentos demonstram alteração da vegetação, mas a causa permanece disputada.",
      findingIds: ["pg-f-03", "pg-f-04"],
    },
    {
      id: "pg-b3",
      name: "Documentação da ré",
      integrityScore: 47,
      riskLevel: "high",
      summary: "Documentos extemporâneos e alegadas contradições exigem valoração comparativa.",
      findingIds: ["pg-f-05", "pg-f-06"],
    },
    {
      id: "pg-b4",
      name: "Hipóteses agronômicas concorrentes",
      integrityScore: 52,
      riskLevel: "high",
      summary: "Manejo/profundidade e baixo vigor aparecem como explicações alternativas.",
      findingIds: ["pg-f-07"],
    },
  ],
  findings: [
    {
      id: "pg-f-01",
      blockId: "pg-b1",
      title: "Ausência de perícia direta",
      auditQuestion:
        "Houve inspeção presencial capaz de reproduzir ou verificar as condições originais?",
      status: "relevant_absence",
      riskLevel: "critical",
      riskScore: 94,
      confidence: 0.97,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-01"],
      inference:
        "A falta de inspeção direta limita a capacidade de diferenciar qualidade da semente, manejo, solo, clima e pragas.",
      proceduralImpact:
        "Risco de conclusão causal excessiva em relação à base empírica disponível.",
      recommendedAction:
        "Exigir que o relatório separe fatos observados, fatos narrados e hipóteses técnicas.",
      includedInReport: true,
    },
    {
      id: "pg-f-02",
      blockId: "pg-b1",
      title: "Evento não reproduzível e ausência de dados do solo",
      auditQuestion: "Existem medições químicas, físicas e de umidade contemporâneas ao plantio?",
      status: "relevant_absence",
      riskLevel: "critical",
      riskScore: 91,
      confidence: 0.9,
      thesisSide: "neutral",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-03"],
      inference:
        "Sem dados contemporâneos do solo, a atribuição da causa ao manejo ou ao insumo permanece vulnerável.",
      proceduralImpact:
        "Pode justificar classificação inconclusiva ou necessidade de prova complementar indireta.",
      recommendedAction:
        "Marcar causalidade como inconclusiva e mapear quais documentos poderiam reduzir a incerteza.",
      includedInReport: true,
    },
    {
      id: "pg-f-03",
      blockId: "pg-b2",
      title: "NDVI usado além do limite diagnóstico",
      auditQuestion: "As imagens de satélite comprovam apenas o dano ou também sua causa?",
      status: "requires_human_review",
      riskLevel: "high",
      riskScore: 85,
      confidence: 0.88,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-02", "pg-ev-06"],
      inference:
        "O NDVI pode sustentar falha de estabelecimento, mas não isola, por si só, a variável causal.",
      proceduralImpact: "Risco de confundir correlação espacial/temporal com causalidade técnica.",
      recommendedAction: "Exibir badge 'dano observado' separado de 'causa não comprovada'.",
      includedInReport: true,
    },
    {
      id: "pg-f-04",
      blockId: "pg-b2",
      title: "Conclusão causal com base indireta",
      auditQuestion:
        "A conclusão sobre profundidade inadequada possui medição direta ou se apoia em relatos?",
      status: "requires_human_review",
      riskLevel: "high",
      riskScore: 82,
      confidence: 0.8,
      thesisSide: "neutral",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-07"],
      inference: "A conclusão sobre manejo depende de relatos e inferências posteriores ao evento.",
      proceduralImpact:
        "Pode reduzir a força probatória da conclusão ou exigir explicitação de incerteza.",
      recommendedAction:
        "Apresentar árvore de hipóteses causais com pesos e evidências favoráveis/contrárias.",
      includedInReport: true,
    },
    {
      id: "pg-f-05",
      blockId: "pg-b3",
      title: "Documento defensivo extemporâneo",
      auditQuestion:
        "O relatório técnico da ré foi produzido em tempo adequado para observar as condições do plantio?",
      status: "requires_human_review",
      riskLevel: "high",
      riskScore: 79,
      confidence: 0.86,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-04"],
      inference:
        "A distância temporal pode reduzir a capacidade do relatório de reconstruir as condições existentes no plantio.",
      proceduralImpact:
        "Necessidade de ponderação do valor probatório e comparação com dados independentes.",
      recommendedAction:
        "Exibir timeline entre plantio, visita técnica, emissão do documento e juntada processual.",
      includedInReport: true,
    },
    {
      id: "pg-f-06",
      blockId: "pg-b3",
      title: "Contradições internas na documentação",
      auditQuestion:
        "Os documentos da ré são coerentes quanto a umidade, textura e condição de preparo do solo?",
      status: "internal_contradiction",
      riskLevel: "high",
      riskScore: 76,
      confidence: 0.81,
      thesisSide: "claimant",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-05"],
      inference:
        "Referências divergentes podem enfraquecer a narrativa causal baseada exclusivamente na documentação defensiva.",
      proceduralImpact:
        "Revisão do peso atribuído aos documentos e possível necessidade de esclarecimentos.",
      recommendedAction: "Abrir comparação sincronizada dos trechos contraditórios.",
      includedInReport: true,
    },
    {
      id: "pg-f-07",
      blockId: "pg-b4",
      title: "Germinação parcial admite hipóteses concorrentes",
      auditQuestion:
        "A germinação parcial exclui defeito do lote ou também é compatível com baixo vigor?",
      status: "inconclusive",
      riskLevel: "high",
      riskScore: 72,
      confidence: 0.69,
      thesisSide: "neutral",
      nature: "demo_inference",
      evidenceIds: ["pg-ev-07", "pg-ev-08"],
      inference:
        "O mesmo fato é usado para sustentar explicações opostas: falha de manejo e baixo vigor.",
      proceduralImpact:
        "A plataforma deve evitar conclusão binária e destacar necessidade de validação técnica especializada.",
      recommendedAction: "Mostrar matriz de hipóteses concorrentes e grau de suporte de cada uma.",
      includedInReport: true,
    },
  ],
  redTeam: [
    {
      id: "pg-rt-01",
      title: "Conformidade regulatória do lote",
      attackingSide: "defendant",
      thesis:
        "O termo de conformidade, o registro no MAPA e a germinação parcial afastam defeito intrínseco das sementes.",
      successProbability: 0.69,
      severity: "high",
      sourceBasis: "expert_statement",
      evidenceIds: ["pg-ev-07"],
      mitigation:
        "Diferenciar conformidade de lote, germinação laboratorial, vigor em campo e cadeia de rastreabilidade das sacas efetivamente plantadas.",
    },
    {
      id: "pg-rt-02",
      title: "Falha de manejo e profundidade",
      attackingSide: "defendant",
      thesis:
        "A área semeada a lanço germinou, enquanto a área incorporada falhou; a causa provável seria profundidade inadequada em solo arenoso.",
      successProbability: 0.72,
      severity: "high",
      sourceBasis: "expert_statement",
      evidenceIds: ["pg-ev-07"],
      mitigation:
        "Questionar ausência de medição direta da profundidade, lapso temporal e inexistência de dados contemporâneos do solo.",
    },
    {
      id: "pg-rt-03",
      title: "Inaptidão da perícia remota para causalidade",
      attackingSide: "claimant",
      thesis:
        "A perícia virtual e documental não poderia reconstruir, anos depois, as variáveis agronômicas necessárias para afirmar a causa da falha.",
      successProbability: 0.76,
      severity: "critical",
      sourceBasis: "demo_inference",
      evidenceIds: ["pg-ev-01", "pg-ev-03", "pg-ev-06"],
      mitigation:
        "Limitar a conclusão a achados observáveis, declarar incertezas e usar análise causal multivariável.",
    },
    {
      id: "pg-rt-04",
      title: "Valoração assimétrica de documentos",
      attackingSide: "claimant",
      thesis:
        "O laudo rejeita documento do autor por ser tardio, mas aproveita relatório da ré também extemporâneo para sustentar germinação parcial e manejo.",
      successProbability: 0.7,
      severity: "high",
      sourceBasis: "demo_inference",
      evidenceIds: ["pg-ev-04", "pg-ev-05", "pg-ev-07"],
      mitigation:
        "Aplicar critérios uniformes de contemporaneidade, autoria, independência, metodologia e verificabilidade.",
    },
  ],
  valuation: {
    currency: "BRL",
    grossClaimValue: 63640,
    initialReferencePrice: 22000,
    recommendedPrice: 14500,
    scenarios: [
      {
        id: "conservative",
        label: "Conservador",
        recommendedPrice: 9000,
        expectedRecovery: 21000,
        roiMultiple: 1.45,
        probabilityOfSuccess: 0.39,
      },
      {
        id: "base",
        label: "Base",
        recommendedPrice: 14500,
        expectedRecovery: 39000,
        roiMultiple: 2.69,
        probabilityOfSuccess: 0.56,
      },
      {
        id: "aggressive",
        label: "Agressivo",
        recommendedPrice: 19500,
        expectedRecovery: 57000,
        roiMultiple: 2.92,
        probabilityOfSuccess: 0.67,
      },
    ],
    adjustments: [
      {
        label: "Perícia sem exame direto",
        amount: 4500,
        direction: "positive",
        nature: "simulated_metric",
        rationale:
          "Ajuste demonstrativo pela vulnerabilidade metodológica do laudo contrário ao autor.",
      },
      {
        label: "Ausência de prova laboratorial contemporânea",
        amount: 7000,
        direction: "negative",
        nature: "simulated_metric",
        rationale: "Desconto pela dificuldade de comprovar defeito intrínseco do lote.",
      },
      {
        label: "Hipóteses causais concorrentes",
        amount: 5000,
        direction: "negative",
        nature: "simulated_metric",
        rationale:
          "Desconto pela coexistência de explicações plausíveis sobre manejo, solo e vigor.",
      },
    ],
    disclaimer:
      "Valores de preço, probabilidade e ROI são simulações de produto e não constituem avaliação financeira, jurídica ou recomendação de investimento.",
  },
  demoNotice:
    "Caso baseado em documentos públicos reais. Scores, probabilidades, recomendações e valuation são exclusivamente simulados para demonstração da EvidIA.",
};

export const thesisOnlyCaseSeeds: RealCaseDemo[] = [
  {
    id: "case-cobex-bradesco",
    slug: "cobex-vs-bradesco",
    dataStatus: "awaiting_documents",
    portfolioRole: "placeholder",
    displayName: "Cobex × Bradesco",
    parties: { claimant: "Cobex", defendant: "Bradesco" },
    sector: "Financeiro",
    proceduralStage: "A confirmar",
    executiveSummary:
      "Caso reservado para demonstração de nulidade processual, erro interpretativo do juízo, julgamento sem exame técnico adequado e impacto sobre lucros cessantes.",
    centralDemoThesis: "Nulidade e esvaziamento ou redução do quantum debeatur.",
    opposingThesis: "Defesa baseada em redução do quantum, causalidade e necessidade de perícia.",
    recommendation: "human_review",
    legalScore: 0,
    evidenceScore: 0,
    nullityRiskScore: 0,
    settlementLeverageScore: 0,
    documentsAnalyzed: 0,
    pagesAnalyzed: 0,
    sourceFiles: [],
    timeline: [],
    evidences: [],
    auditBlocks: [],
    findings: [],
    redTeam: [],
    demoNotice:
      "Placeholder de tese. Não exibir como caso documentado até o recebimento dos autos.",
  },
  {
    id: "case-cami-sankhya",
    slug: "cami-tecnologia-vs-sankhya",
    dataStatus: "awaiting_documents",
    portfolioRole: "placeholder",
    displayName: "Cami Tecnologia × Sankhya",
    parties: { claimant: "Cami Tecnologia", defendant: "Sankhya" },
    sector: "Tecnologia / ERP",
    proceduralStage: "A confirmar",
    executiveSummary:
      "Caso reservado para demonstração da imprescindibilidade de perícia e incapacidade técnica do expert.",
    centralDemoThesis:
      "Nulidade absoluta por incapacidade técnica do perito e insuficiência da prova.",
    opposingThesis: "Defesa da suficiência do laudo e da qualificação do expert.",
    recommendation: "human_review",
    legalScore: 0,
    evidenceScore: 0,
    nullityRiskScore: 0,
    settlementLeverageScore: 0,
    documentsAnalyzed: 0,
    pagesAnalyzed: 0,
    sourceFiles: [],
    timeline: [],
    evidences: [],
    auditBlocks: [],
    findings: [],
    redTeam: [],
    demoNotice:
      "Placeholder de tese. Não exibir como caso documentado até o recebimento dos autos.",
  },
  {
    id: "case-lagoa-xupe-nexa",
    slug: "lagoa-do-xupe-vs-nexa-mineradora",
    dataStatus: "awaiting_documents",
    portfolioRole: "placeholder",
    displayName: "Lagoa do Xupé × Nexa Mineradora",
    parties: { claimant: "Lagoa do Xupé", defendant: "Nexa Mineradora" },
    sector: "Mineração / Ambiental",
    proceduralStage: "A confirmar",
    executiveSummary:
      "Caso reservado para vícios formais de nomeação, falhas metodológicas, cadeia de custódia e uso de documento extemporâneo.",
    centralDemoThesis: "Nulidades do rito, vícios metodológicos e falha de checagem probatória.",
    opposingThesis:
      "Regularidade da nomeação, confiabilidade metodológica e admissibilidade dos documentos.",
    recommendation: "human_review",
    legalScore: 0,
    evidenceScore: 0,
    nullityRiskScore: 0,
    settlementLeverageScore: 0,
    documentsAnalyzed: 0,
    pagesAnalyzed: 0,
    sourceFiles: [],
    timeline: [],
    evidences: [],
    auditBlocks: [],
    findings: [],
    redTeam: [],
    demoNotice:
      "Placeholder de tese. Não exibir como caso documentado até o recebimento dos autos.",
  },
];

export const realCasesV2: RealCaseDemo[] = [
  febSapCase,
  pauloGrittiMatsudaCase,
  ...thesisOnlyCaseSeeds,
];

export const documentedCasesV2 = realCasesV2.filter(
  (item) => item.dataStatus === "document_grounded",
);

export const caseBySlugV2 = Object.fromEntries(
  realCasesV2.map((item) => [item.slug, item]),
) as Record<string, RealCaseDemo>;
