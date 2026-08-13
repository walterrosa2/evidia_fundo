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

import type { MonetaryIndex } from "@/config/monetaryIndices";
import type { InterestType, PenaltyBase } from "@/lib/judicialUpdate";

export type EvidenceNature =
  | "source_fact"
  | "party_allegation"
  | "expert_statement"
  | "court_statement"
  | "demo_inference"
  | "simulated_metric";

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type PurchaseProfile = "conservador" | "moderado" | "nao_recomendado";
export type EvidenceMapStatus = "linked" | "available_unlinked" | "missing";

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

/** Tipo do ato processual, usado para ícone, cor e filtro na timeline. */
export type ProceduralActType =
  | "distribuicao"
  | "citacao"
  | "contestacao"
  | "replica"
  | "saneamento"
  | "pericia_nomeacao"
  | "pericia_quesitos"
  | "pericia_diligencia"
  | "pericia_laudo"
  | "pericia_impugnacao"
  | "pericia_esclarecimento"
  | "audiencia"
  | "despacho"
  | "decisao"
  | "sentenca"
  | "recurso"
  | "acordao"
  | "peticao"
  | "extrajudicial"
  | "contrato"
  | "analise_evidia";

/** Quem praticou o ato. Permite ler a iniciativa processual ao longo do tempo. */
export type ProceduralActor =
  "juizo" | "autora" | "re" | "perito" | "assistente" | "terceiro" | "evidia";

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  nature: EvidenceNature;
  source?: SourceReference;
  actType?: ProceduralActType;
  actor?: ProceduralActor;
  /** Número da fase em `lib/proceduralPhases`. */
  phase?: number;
  /** Marcos estruturam a leitura; atos ordinários compõem a cronologia completa. */
  relevance?: "marco" | "ordinario";
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

/**
 * Parâmetros de atualização do débito, por caso.
 * A data-base do cálculo é sempre a data corrente — por isso não consta aqui.
 */
export interface JudicialCalculationParams {
  /** Valor principal na data do termo inicial da correção. */
  principal: number;
  /** Termo inicial da correção monetária (desembolso ou evento danoso). */
  correctionStart: string;
  /** Termo inicial dos juros de mora (citação, nas obrigações contratuais). */
  interestStart: string;
  index: MonetaryIndex;
  /** Taxa mensal aplicada antes da Lei 14.905/2024, em % ao mês. */
  legacyInterestRate: number;
  interestType: InterestType;
  penalty?: { rate: number; base: PenaltyBase };
  attorneyFees?: number;
  /** Base normativa e origem documental dos parâmetros. */
  basis: string;
}

export interface RealCaseDemo {
  id: string;
  slug: string;
  dataStatus: "document_grounded" | "thesis_only" | "awaiting_documents";
  portfolioRole: "flagship" | "secondary" | "placeholder";
  rankingPosition?: number;
  purchaseProfile?: PurchaseProfile;
  displayName: string;
  processNumber?: string;
  court?: string;
  courtUnit?: string;
  actionType?: string;
  claimValue?: number;
  /** Data de distribuição da ação. Base do tempo processual — nunca inferir da timeline. */
  filingDate?: string;
  judicialCalculation?: JudicialCalculationParams;
  /**
   * Origem dos números do valuation.
   * `derived` calcula preço, probabilidade e recuperação a partir do motor de atualização, dos
   * scores do parecer e dos vetores do Red Team. `curated` usa os valores escritos no bloco
   * `valuation` deste caso.
   */
  valuationMode?: "derived" | "curated";
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
  legalScore: number | null;
  evidenceScore: number | null;
  nullityRiskScore: number | null;
  settlementLeverageScore: number | null;
  overallRiskScore?: number;
  overallRiskLevel?: RiskLevel;
  sourceFindingCount?: number;
  evidenceMapStatus?: EvidenceMapStatus;
  evidenceMapRowCount?: number;
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

const eletromarSource = "resultado_paginado_ELETROMAR  X TOTVS_20260805-1016_20260805-1409.txt";

export const febSapCase: RealCaseDemo = {
  id: "case-feb-sap",
  slug: "federacao-espirita-brasileira-vs-sap",
  dataStatus: "document_grounded",
  portfolioRole: "flagship",
  rankingPosition: 2,
  purchaseProfile: "moderado",
  displayName: "Federação Espírita Brasileira × SAP Brasil",
  processNumber: "1116020-53.2020.8.26.0100",
  court: "TJSP",
  courtUnit: "Foro Central Cível de São Paulo",
  actionType: "Rescisão contratual cumulada com ressarcimento de valores",
  claimValue: 683369.03,
  filingDate: "2020-12-02",
  judicialCalculation: {
    principal: 683369.03,
    correctionStart: "2016-03-31",
    interestStart: "2021-02-01",
    index: "TJSP",
    legacyInterestRate: 1,
    interestType: "simple",
    basis:
      "Correção desde o desembolso das três parcelas de licenciamento pagas no primeiro trimestre de 2016 (fls. 5); juros de mora da citação, na forma do art. 405 do CC. Transição para a taxa legal do art. 406 do CC em 30/08/2024.",
  },
  parties: {
    claimant: "Federação Espírita Brasileira — FEB",
    defendant: "SAP Brasil Ltda.",
  },
  sector: "Tecnologia / ERP",
  proceduralStage: "Fase pericial e debate sobre substituição do expert",
  executiveSummary:
    "Pedido de rescisão e restituição de R$ 683.369,03 pagos em licenças SAP cujo projeto de implantação não entrou em operação. A base probatória é documental e forte quanto ao desembolso — notas fiscais das três parcelas de 2016 —, mas a prova técnica sobre a utilidade do sistema está comprometida: o laudo delimitou o próprio escopo, declarou prejudicados os quesitos sobre implantação e, segundo manifestação da autora, deixou de examinar os backups indicados pelo juízo e de responder a mais de vinte quesitos deferidos. A principal alavanca é a anulação da sentença em segundo grau, que reabriu a fase probatória; o principal risco é a tese de que a implantação coube a terceiro, restringindo a responsabilidade da SAP ao licenciamento. Assimetria favorável no cenário de perícia refeita com escopo integral, desfavorável se a delimitação atual for mantida. Recomendação: revisão humana antes de precificar — o valor depende de decisão ainda pendente sobre a substituição dos peritos.",
  centralDemoThesis:
    "Risco de nulidade ou de perda de utilidade da prova pericial por descumprimento do encargo, não resposta a quesitos deferidos, análise infra petita e incursão em matéria jurídica.",
  opposingThesis:
    "A SAP sustenta que a implantação foi executada por terceiro, que o escopo pericial deve se limitar ao relacionamento contratual com a SAP e que os peritos nomeados possuem qualificação e imparcialidade.",
  recommendation: "human_review",
  overallRiskScore: 51.88,
  overallRiskLevel: "moderate",
  sourceFindingCount: 20,
  evidenceMapStatus: "available_unlinked",
  evidenceMapRowCount: 743,
  legalScore: 67,
  evidenceScore: 48,
  // Score global do parecer nulidade360_caso_17: 51,88 (moderado), 20 achados aceitos,
  // 7 pilares afetados, sendo P13 crítico (100,0).
  nullityRiskScore: 51.88,
  settlementLeverageScore: 73,
  documentsAnalyzed: 1,
  pagesAnalyzed: 1594,
  sourceFiles: [febSource],
  timeline: [
    {
      date: "2016-01-31",
      title: "Aquisição das licenças SAP ECC",
      description:
        "A FEB paga R$ 683.369,03 em três parcelas iguais de R$ 227.789,68 nos três primeiros meses de 2016, referentes ao Contrato de Licença para Pequenas e Médias Empresas. Esse é o principal cuja restituição se pleiteia.",
      nature: "source_fact",
      actType: "contrato",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: febSource,
        sourcePage: 5,
        documentLabel: "Petição inicial — notas fiscais 1159, 1199 e 1240",
        nature: "source_fact",
        excerpt: "totalizando R$683.369,03, pagos em três parcelas iguais de R$227.789,68",
      },
    },
    {
      date: "2016-08-18",
      title: "Terceiro assume a análise do sistema contratado",
      description:
        "Diante da inércia da parceira de implantação, empresa concorrente passa a analisar o sistema e apresenta relatório — elemento que a autora usa para demonstrar a inoperância da solução.",
      nature: "party_allegation",
      actType: "extrajudicial",
      actor: "autora",
      phase: 1,
      relevance: "ordinario",
      source: {
        sourceFile: febSource,
        sourcePage: 1191,
        documentLabel: "Relatório de terceiro sobre o sistema",
        nature: "party_allegation",
      },
    },
    {
      date: "2016-12-19",
      title: "Ajuizamento da ação conexa de rescisão",
      description:
        "A FEB ajuíza ação anterior de rescisão contratual envolvendo o mesmo projeto de implantação. A existência de duas demandas conexas com as fornecedoras no polo passivo sustentará, adiante, o pedido de perícia coordenada.",
      nature: "source_fact",
      actType: "distribuicao",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: febSource,
        sourcePage: 1451,
        documentLabel: "Petição sobre conexão de processos",
        nature: "party_allegation",
      },
    },
    {
      date: "2020-12-02",
      title: "Distribuição desta ação",
      description:
        "Ação de rescisão contratual cumulada com ressarcimento distribuída ao Foro Central Cível de São Paulo, protocolada às 18h02, com valor da causa de R$ 683.369,03 e pedido de conexão.",
      nature: "source_fact",
      actType: "distribuicao",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: febSource,
        sourcePage: 42,
        documentLabel: "Petição inicial",
        nature: "source_fact",
      },
    },
    {
      date: "2022-04-27",
      title: "Manifestação técnica sobre o projeto de implantação",
      description:
        "Juntada de manifestação detalhando o escopo do ERP contratado e as responsabilidades entre licenciante e implantadora.",
      nature: "party_allegation",
      actType: "peticao",
      actor: "autora",
      phase: 6,
      relevance: "ordinario",
      source: {
        sourceFile: febSource,
        sourcePage: 915,
        documentLabel: "Manifestação técnica",
        nature: "party_allegation",
      },
    },
    {
      date: "2022-06-07",
      title: "Laudo pericial juntado",
      description:
        "O laudo delimita o escopo por conta própria e declara prejudicadas as perguntas relacionadas à implantação, por considerá-las fora do objeto que o expert fixou.",
      nature: "expert_statement",
      actType: "pericia_laudo",
      actor: "perito",
      phase: 7,
      relevance: "marco",
      source: {
        sourceFile: febSource,
        sourcePage: 1062,
        documentLabel: "Laudo pericial",
        nature: "expert_statement",
        excerpt: "restando prejudicadas as respostas aos quesitos sobre estes temas",
      },
    },
    {
      date: "2022-09-06",
      title: "Pedido de substituição do perito",
      description:
        "A FEB alega recusa de respostas a quesitos deferidos, inconsistências metodológicas e emissão de juízo sobre mérito, direito e litisconsórcio passivo.",
      nature: "party_allegation",
      actType: "pericia_impugnacao",
      actor: "autora",
      phase: 8,
      relevance: "marco",
      source: {
        sourceFile: febSource,
        sourcePage: 1160,
        documentLabel: "Manifestação da FEB",
        nature: "party_allegation",
        excerpt: "todos os quesitos apresentados pelas partes referem-se à matéria técnica",
      },
    },
    {
      date: "2023-04-17",
      title: "Nova manifestação sobre a prova pericial",
      description:
        "Juntada de peça que consolida as críticas ao laudo, incluindo a alegação de que mais de vinte quesitos teriam sido ignorados e de que os backups não foram examinados.",
      nature: "party_allegation",
      actType: "pericia_impugnacao",
      actor: "autora",
      phase: 8,
      relevance: "ordinario",
      source: {
        sourceFile: febSource,
        sourcePage: 1460,
        documentLabel: "Manifestação técnico-processual",
        nature: "party_allegation",
        excerpt: "não tendo o perito examinado os backups",
      },
    },
    {
      date: "2024-02-01",
      title: "Sentença anulada em segundo grau",
      description:
        "Documentos posteriores registram que o acórdão anulou a sentença e apontou desconformidade do primeiro laudo com a determinação judicial. A anulação reabre a fase probatória e é o principal vetor de valor do ativo.",
      nature: "court_statement",
      actType: "acordao",
      actor: "juizo",
      phase: 11,
      relevance: "marco",
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
      description:
        "A FEB pede a substituição dos experts e a realização da prova de forma coordenada com a ação conexa, para evitar conclusões divergentes sobre o mesmo projeto.",
      nature: "party_allegation",
      actType: "pericia_nomeacao",
      actor: "autora",
      phase: 5,
      relevance: "marco",
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
        "A SAP se opõe à substituição, sustenta a qualificação e a idoneidade dos peritos e afirma que nenhuma das hipóteses do art. 468 do CPC foi demonstrada.",
      nature: "party_allegation",
      actType: "peticao",
      actor: "re",
      phase: 5,
      relevance: "marco",
      source: {
        sourceFile: febSource,
        sourcePage: 1543,
        documentLabel: "Manifestação da SAP",
        nature: "party_allegation",
        excerpt: "nenhuma das hipóteses do artigo 468 do CPC restou demonstrada",
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
  rankingPosition: 3,
  purchaseProfile: "nao_recomendado",
  displayName: "Paulo Renato Gritti × Matsuda",
  processNumber: "0804563-35.2017.8.10.0040",
  court: "TJMA",
  courtUnit: "1ª Vara Cível de Imperatriz",
  actionType: "Procedimento comum cível",
  claimValue: 63640,
  filingDate: "2017-05-04",
  judicialCalculation: {
    principal: 63640,
    correctionStart: "2016-11-01",
    interestStart: "2017-08-01",
    index: "INPC",
    legacyInterestRate: 1,
    interestType: "simple",
    basis:
      "Correção desde a safra em que se verificou a falha de estabelecimento da pastagem; juros de mora da citação. INPC adotado por ser o índice usual do TJMA em indenizações cíveis. Transição para a taxa legal em 30/08/2024.",
  },
  parties: {
    claimant: "Paulo Renato Gritti",
    defendant: "Com. Ind. Matsuda Imp. Exportadora Ltda.",
  },
  sector: "Agronegócio / Sementes",
  proceduralStage: "Impugnação ao laudo pericial e esclarecimentos do expert",
  executiveSummary:
    "Indenização de R$ 63.640,00 por falha de estabelecimento de pastagem atribuída a lote de sementes de capim Mombaça. O ativo é pequeno e o risco é alto: o parecer aponta 80,8 de score de nulidade, com onze pilares afetados. A prova pericial foi produzida quase nove anos após os fatos, de forma virtual, com vistoria in loco dispensada, sem análise de solo contemporânea e apoiada em imagens de satélite — que demonstram o dano, mas não isolam sua causa. O laudo conclui por falha de manejo, e a impugnação do assistente sustenta baixo vigor do lote; o mesmo fato sustenta as duas explicações. Há ainda valoração assimétrica de documentos extemporâneos, aceitos da ré e rejeitados do autor. Assimetria desfavorável: exposure baixo, mas causalidade inconclusiva e esclarecimentos periciais ainda pendentes desde março de 2026. Recomendação: reprecificar para baixo ou aguardar a manifestação do expert.",
  centralDemoThesis:
    "A perícia não presencial, realizada quase dez anos após os fatos, não teria base empírica suficiente para atribuir causalidade ao manejo e teria absorvido documentos da ré de forma mais favorável que os documentos do autor.",
  opposingThesis:
    "O lote estava em conformidade regulatória; a germinação parcial e a diferença entre semeadura a lanço e incorporação indicariam falha operacional e profundidade inadequada.",
  recommendation: "reprice",
  overallRiskScore: 80.8,
  overallRiskLevel: "high",
  sourceFindingCount: 19,
  evidenceMapStatus: "missing",
  evidenceMapRowCount: 0,
  legalScore: 61,
  evidenceScore: 43,
  // Score global do parecer nulidade360_caso_18: 80,8 (alto), 19 achados aceitos,
  // 11 pilares afetados, 6 deles críticos (P3, P4, P5, P7, P8, P12, P13).
  nullityRiskScore: 80.8,
  settlementLeverageScore: 66,
  documentsAnalyzed: 1,
  pagesAnalyzed: 333,
  sourceFiles: [grittiSource],
  timeline: [
    {
      date: "2016-08-20",
      title: "Relatório técnico da ré, 166 dias após o plantio",
      description:
        "Departamento técnico da Matsuda emite relatório assinado por engenheiro agrônomo. O autor sustenta que o documento foi produzido mais de cinco meses após o início do plantio, o que compromete sua aptidão para reconstruir as condições de campo.",
      nature: "party_allegation",
      actType: "extrajudicial",
      actor: "re",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 251,
        documentLabel: "Relatório técnico Matsuda — doc. 06",
        nature: "party_allegation",
        excerpt: "Em 20 de Agosto de 2016",
      },
    },
    {
      date: "2017-05-04",
      title: "Distribuição da ação",
      description:
        "Procedimento comum cível distribuído à 1ª Vara Cível de Imperatriz/MA, valor da causa de R$ 63.640,00. A inicial é instruída com laudo técnico, notas fiscais Matsuda e Tagrosal e comprovantes de pagamento.",
      nature: "source_fact",
      actType: "distribuicao",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 1,
        documentLabel: "Capa do processo PJe",
        nature: "source_fact",
      },
    },
    {
      date: "2017-05-08",
      title: "Despacho inicial",
      description: "Juízo determina o processamento do feito e a designação de audiência.",
      nature: "court_statement",
      actType: "despacho",
      actor: "juizo",
      phase: 1,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 5,
        documentLabel: "Movimentação PJe",
        nature: "source_fact",
      },
    },
    {
      date: "2017-05-26",
      title: "Citação da ré",
      description:
        "Matsuda é citada, com advertência do prazo de contestação e da possibilidade de réplica em 15 dias.",
      nature: "source_fact",
      actType: "citacao",
      actor: "juizo",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 306,
        documentLabel: "Mandado de citação",
        nature: "source_fact",
      },
    },
    {
      date: "2017-06-28",
      title: "Contestação da Matsuda",
      description:
        "A ré apresenta contestação acompanhada do relatório técnico (doc. 06) e da ficha de atendimento ao cliente (doc. 07), sustentando conformidade regulatória do lote e falha operacional no plantio.",
      nature: "party_allegation",
      actType: "contestacao",
      actor: "re",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 250,
        documentLabel: "Contestação",
        nature: "party_allegation",
      },
    },
    {
      date: "2017-07-26",
      title: "Autor argui revelia e impugna documentos",
      description:
        "Petição sustenta que a ré protocolou documentos sem a peça de contestação em si, e impugna os documentos técnicos juntados.",
      nature: "party_allegation",
      actType: "peticao",
      actor: "autora",
      phase: 1,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 249,
        documentLabel: "Revelia e impugnação de documentos",
        nature: "party_allegation",
      },
    },
    {
      date: "2017-08-17",
      title: "Audiência de conciliação",
      description: "Realizada audiência, sem composição entre as partes.",
      nature: "court_statement",
      actType: "audiencia",
      actor: "juizo",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 245,
        documentLabel: "Ata de audiência",
        nature: "court_statement",
      },
    },
    {
      date: "2017-09-22",
      title: "Juízo reabre prazo para réplica",
      description:
        "Revogada a situação de segredo de justiça, com reabertura do prazo de quinze dias para a autora replicar à contestação.",
      nature: "court_statement",
      actType: "despacho",
      actor: "juizo",
      phase: 2,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 242,
        documentLabel: "Despacho",
        nature: "court_statement",
      },
    },
    {
      date: "2017-10-09",
      title: "Réplica à contestação",
      description: "A autora impugna a defesa e os documentos técnicos apresentados pela ré.",
      nature: "party_allegation",
      actType: "replica",
      actor: "autora",
      phase: 2,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 217,
        documentLabel: "Réplica à contestação",
        nature: "party_allegation",
      },
    },
    {
      date: "2018-04-16",
      title: "Requerimento de produção de provas",
      description: "As partes especificam as provas que pretendem produzir.",
      nature: "party_allegation",
      actType: "peticao",
      actor: "autora",
      phase: 3,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 203,
        documentLabel: "Petição de produção de provas",
        nature: "party_allegation",
      },
    },
    {
      date: "2018-04-17",
      title: "Rol de testemunhas e pontos controvertidos",
      description:
        "A autora fixa os pontos controvertidos e aponta contradições nos documentos da ré quanto a umidade, textura do solo e condição de preparo.",
      nature: "party_allegation",
      actType: "saneamento",
      actor: "autora",
      phase: 3,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 203,
        documentLabel: "Rol de testemunhas e pontos controvertidos",
        nature: "party_allegation",
        excerpt: "realizado após 166 dias do início",
      },
    },
    {
      date: "2019-01-25",
      title: "Pedido de impulsionamento do feito",
      description:
        "Após nove meses sem movimentação relevante, a autora requer o prosseguimento do processo.",
      nature: "party_allegation",
      actType: "peticao",
      actor: "autora",
      phase: 3,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 197,
        documentLabel: "Pedido de impulsionamento",
        nature: "party_allegation",
      },
    },
    {
      date: "2019-03-28",
      title: "Decisão de saneamento e deferimento da perícia",
      description: "O juízo delimita a controvérsia e defere a produção de prova pericial.",
      nature: "court_statement",
      actType: "saneamento",
      actor: "juizo",
      phase: 3,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 197,
        documentLabel: "Decisão",
        nature: "court_statement",
      },
    },
    {
      date: "2021-04-27",
      title: "Nomeação do perito judicial",
      description:
        "Despacho acompanhado do currículo do perito nomeado. Entre o deferimento da prova e a nomeação decorrem mais de dois anos.",
      nature: "court_statement",
      actType: "pericia_nomeacao",
      actor: "juizo",
      phase: 5,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Despacho de nomeação e currículo do perito",
        nature: "court_statement",
      },
    },
    {
      date: "2021-09-27",
      title: "Apresentação de quesitos",
      description:
        "Matsuda e o assistente técnico apresentam os quesitos a serem respondidos pela perícia.",
      nature: "party_allegation",
      actType: "pericia_quesitos",
      actor: "re",
      phase: 5,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Manifestação de quesitos",
        nature: "party_allegation",
      },
    },
    {
      date: "2022-06-14",
      title: "Controvérsia sobre honorários periciais",
      description:
        "As partes se manifestam sobre a verba honorária do perito, questionando sua proporcionalidade.",
      nature: "party_allegation",
      actType: "peticao",
      actor: "re",
      phase: 5,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 159,
        documentLabel: "Manifestação sobre verba honorária pericial",
        nature: "party_allegation",
      },
    },
    {
      date: "2022-12-05",
      title: "Juízo reduz os honorários por desproporcionalidade",
      description:
        "Decisão considera a verba apresentada pelo perito desproporcional ao trabalho, ao tempo de execução, à natureza e ao valor da causa, e a arbitra em patamar inferior.",
      nature: "court_statement",
      actType: "decisao",
      actor: "juizo",
      phase: 5,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 159,
        documentLabel: "Decisão sobre honorários periciais",
        nature: "court_statement",
        excerpt: "revela-se desproporcional",
      },
    },
    {
      date: "2023-03-15",
      title: "Destituição do encargo de perito",
      description:
        "O perito nomeado é destituído do encargo, o que reabre a fase de nomeação e alonga a duration do processo.",
      nature: "court_statement",
      actType: "pericia_nomeacao",
      actor: "juizo",
      phase: 5,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Destituição do encargo de perito",
        nature: "court_statement",
      },
    },
    {
      date: "2024-01-11",
      title: "Novos honorários periciais",
      description: "O perito substituto apresenta proposta de honorários.",
      nature: "expert_statement",
      actType: "pericia_nomeacao",
      actor: "perito",
      phase: 5,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Honorários periciais",
        nature: "expert_statement",
      },
    },
    {
      date: "2024-04-23",
      title: "Depósito dos honorários pela ré",
      description: "Comprovante de depósito juntado, liberando o início dos trabalhos periciais.",
      nature: "source_fact",
      actType: "pericia_nomeacao",
      actor: "re",
      phase: 5,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Comprovante de depósito — honorários",
        nature: "source_fact",
      },
    },
    {
      date: "2025-04-16",
      title: "Data de início da perícia",
      description:
        "Fixado o início dos trabalhos, oito anos após a distribuição e cerca de nove anos após os fatos discutidos.",
      nature: "court_statement",
      actType: "pericia_diligencia",
      actor: "juizo",
      phase: 6,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Ato ordinatório — início da perícia",
        nature: "court_statement",
      },
    },
    {
      date: "2025-06-23",
      title: "Perícia realizada de forma virtual",
      description:
        "O laudo registra que os trabalhos ocorreram por reuniões remotas e que a vistoria in loco foi dispensada pelas partes e pelo perito.",
      nature: "expert_statement",
      actType: "pericia_diligencia",
      actor: "perito",
      phase: 6,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 41,
        documentLabel: "Metodologia do laudo pericial",
        nature: "expert_statement",
        excerpt: "sendo dispensada pelas partes processuais e perito, a vistoria in loco",
      },
    },
    {
      date: "2025-07-04",
      title: "Perito solicita documentos às partes",
      description:
        "Requisição de documentação complementar para suprir a ausência de exame direto do local.",
      nature: "expert_statement",
      actType: "pericia_diligencia",
      actor: "perito",
      phase: 6,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 4,
        documentLabel: "Solicitação de documentos",
        nature: "expert_statement",
      },
    },
    {
      date: "2025-07-08",
      title: "Ré junta relatório de visita, termo de conformidade e rastreabilidade do lote",
      description:
        "Matsuda apresenta o relatório de visita técnica, o termo de conformidade do lote 0052-2016, a rastreabilidade do lote e vinte notas fiscais de transferência entre filiais.",
      nature: "party_allegation",
      actType: "pericia_diligencia",
      actor: "re",
      phase: 6,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 2,
        documentLabel: "Documentos juntados pela ré à perícia",
        nature: "party_allegation",
      },
    },
    {
      date: "2025-07-11",
      title: "Autor responde aos requerimentos do perito",
      description: "Juntada de certidões e manifestos de assinatura solicitados pelo expert.",
      nature: "party_allegation",
      actType: "pericia_diligencia",
      actor: "autora",
      phase: 6,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 1,
        documentLabel: "Petição de resposta aos requerimentos do perito",
        nature: "party_allegation",
      },
    },
    {
      date: "2025-08-05",
      title: "Laudo pericial juntado",
      description:
        "O expert conclui que os prejuízos decorrem de falhas operacionais no plantio — profundidade inadequada em solo arenoso —, e não da qualidade das sementes.",
      nature: "expert_statement",
      actType: "pericia_laudo",
      actor: "perito",
      phase: 7,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 54,
        documentLabel: "Conclusão do laudo pericial",
        nature: "expert_statement",
        excerpt: "os prejuízos alegados decorrem de falhas operacionais no plantio",
      },
    },
    {
      date: "2025-10-27",
      title: "Impugnação ao laudo com parecer assistencial",
      description:
        "O autor junta laudo técnico pericial de assistente e ART, questionando a metodologia remota, o alcance diagnóstico do NDVI e a inferência causal sobre o manejo.",
      nature: "party_allegation",
      actType: "pericia_impugnacao",
      actor: "assistente",
      phase: 8,
      relevance: "marco",
      source: {
        sourceFile: grittiSource,
        sourcePage: 9,
        documentLabel: "Impugnação ao laudo e parecer assistencial",
        nature: "party_allegation",
        excerpt: "a prova do dano, e não a prova da sua causa",
      },
    },
    {
      date: "2025-12-02",
      title: "Termo de juntada",
      description: "Formalizada a juntada das manifestações sobre o laudo.",
      nature: "source_fact",
      actType: "peticao",
      actor: "juizo",
      phase: 8,
      relevance: "ordinario",
      source: {
        sourceFile: grittiSource,
        sourcePage: 1,
        documentLabel: "Termo",
        nature: "source_fact",
      },
    },
    {
      date: "2026-03-03",
      title: "Perito intimado a prestar esclarecimentos",
      description:
        "O juízo determina que o expert se manifeste sobre a impugnação. Enquanto os esclarecimentos não são prestados, a causalidade permanece controvertida e o ativo não tem preço firme.",
      nature: "court_statement",
      actType: "pericia_esclarecimento",
      actor: "juizo",
      phase: 8,
      relevance: "marco",
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

export const eletromarTotvsCase: RealCaseDemo = {
  id: "case-eletromar-totvs",
  slug: "eletromar-vs-totvs",
  dataStatus: "document_grounded",
  portfolioRole: "flagship",
  rankingPosition: 1,
  purchaseProfile: "conservador",
  displayName: "ELETROMAR × TOTVS",
  processNumber: "0020448-92.2017.8.26.0100",
  court: "TJSP · TJMT",
  courtUnit:
    "40ª Vara Cível do Foro Central João Mendes Jr. (TJSP) — origem: 2ª Vara Cível de Lucas do Rio Verde (TJMT)",
  actionType: "Ação Ordinária de Rescisão Contratual c/c Devolução de Quantias e Indenização",
  claimValue: 876383.3,
  filingDate: "2013-06-17",
  // Preço, probabilidade de êxito e recuperação são calculados a partir do valor atualizado pelo
  // motor, dos scores do parecer e dos vetores do Red Team — e não escritos à mão.
  valuationMode: "derived",
  judicialCalculation: {
    principal: 876383.3,
    correctionStart: "2013-06-17",
    interestStart: "2013-08-01",
    index: "TJSP",
    legacyInterestRate: 1,
    interestType: "simple",
    basis:
      "O valor de R$ 876.383,30 já corresponde aos pagamentos atualizados até o ajuizamento (fls. 20), razão pela qual a correção corre da distribuição em 17/06/2013. Juros de mora da citação, na forma do art. 405 do CC. Tabela Prática do TJSP a partir da redistribuição ao Foro Central. Transição para a taxa legal do art. 406 do CC em 30/08/2024.",
  },
  parties: {
    claimant: "ELETROMAR MÓVEIS E ELETRODOMÉSTICOS LTDA",
    defendant: "TOTVS S.A. / JK GESTÃO EMPRESARIAL",
  },
  sector: "Tecnologia / ERP",
  proceduralStage: "Laudo Pericial Juntado · Perícia Atesta Inadimplemento de Implantação",
  executiveSummary:
    "Litígio sobre implantação ineficaz do ERP TOTVS na ELETROMAR, com pedido de rescisão de três contratos coligados — cessão de direito de uso (CDU), serviços mensais (SMS) e serviços complementares de implantação (SCS) — e restituição de R$ 876.383,30 já atualizados na inicial, acrescidos de indenização por inscrição em cadastro de restrição durante a fase de implantação. O núcleo probatório é forte e documental: contratos e propostas comerciais conjuntas, comprovantes de pagamento e degravação de reuniões em que representantes da parceira de implantação reconhecem falha técnica e consumo de horas muito acima da previsão contratual de 4.000 horas. O laudo pericial de 20/04/2022 foi impugnado por ambas as rés em outubro do mesmo ano, o que mantém aberta a discussão sobre a extensão do inadimplemento. Perfil conservador: exposure moderado, base probatória ampla (2.737 evidências mapeadas) e risco de nulidade moderado, concentrado em contraditório e produção de prova.",
  centralDemoThesis:
    "Rescisão por inadimplemento técnico comprovado em perícia judicial, com devolução de valores pagos por contratos de software e serviços coligados, além de reparação por inclusão indevida no Serasa.",
  opposingThesis:
    "Defesa da TOTVS baseada na efetiva disponibilização de licenças de uso e alegação de ausência de responsabilidade solidária em relação à empresa parceira de implantação (Art. 265 CC).",
  recommendation: "invest",
  overallRiskScore: 46.73,
  overallRiskLevel: "moderate",
  sourceFindingCount: 20,
  evidenceMapStatus: "linked",
  evidenceMapRowCount: 2737,
  legalScore: 88.5,
  evidenceScore: 92.0,
  // Score global do parecer nulidade360_caso_19: 46,73 (moderado), 20 achados aceitos,
  // 4 pilares afetados (P3, P4, P7, P8), nenhum crítico.
  nullityRiskScore: 46.73,
  settlementLeverageScore: 85.0,
  documentsAnalyzed: 3,
  pagesAnalyzed: 2779,
  sourceFiles: [
    eletromarSource,
    "evidencias_ELETROMAR X TOTVS.xlsx",
    "overview_contexto_global_SAC_ELETROMAR_X_TOTVS.xlsx",
  ],
  timeline: [
    {
      date: "2010-04-12",
      title: "Contrato de Atendimento Personalizado",
      description:
        "Firmado com a JK Assessoria Empresarial (Cuiabá/MT), juntado como doc. 03 da inicial. Compõe, com o Contrato de Cessão de Direito de Uso (registro nº 1.901.975) e as propostas comerciais 445575 e 44542/44545, o conjunto de instrumentos coligados discutidos na ação.",
      nature: "source_fact",
      actType: "contrato",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 20,
        documentLabel: "Petição inicial — relação de instrumentos contratuais",
        nature: "source_fact",
      },
    },
    {
      date: "2013-01-15",
      title: "Cobrança de mensalidades e inclusão em cadastro de restrição",
      description:
        "Títulos de manutenção (SMS) processados para cobrança durante a fase de implantação. A troca de e-mails entre a autora e executivos da TOTVS e da JK registra a inclusão no Serasa e a negociação de sua retirada: “haverá a retirada do Serasa”, “basta me informar a data em que será quitada, que solicitarei a prorrogação do título”.",
      nature: "source_fact",
      actType: "extrajudicial",
      actor: "re",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 189,
        documentLabel: "E-mails TOTVS/JK e boletos de cobrança",
        nature: "source_fact",
        excerpt: "Conforme combinado ontem a noite haverá a retirada do Serasa",
      },
    },
    {
      date: "2013-02-05",
      title: "Reunião gravada com o diretor da parceira de implantação",
      description:
        "Reunião na sede da autora entre seu representante legal e o diretor da JK Gestão Empresarial, gravada e degravada (doc. 10). A autora sustenta que o registro contém reconhecimento do prazo contratado, da falha de implantação e do desconhecimento do estágio do projeto.",
      nature: "party_allegation",
      actType: "extrajudicial",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 27,
        documentLabel: "Degravação de reunião — doc. 10.1",
        nature: "party_allegation",
        excerpt: "a previsão era 4.000 horas no total",
      },
    },
    {
      date: "2013-06-17",
      title: "Ajuizamento na comarca de origem",
      description:
        "Ação distribuída na 2ª Vara Cível de Lucas do Rio Verde/MT (autos 2865-24.2013.811.0045), com valor da causa de R$ 876.383,30, pleiteando rescisão dos contratos coligados, restituição dos valores pagos e indenização.",
      nature: "source_fact",
      actType: "distribuicao",
      actor: "autora",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 2,
        documentLabel: "Capa do processo — TJMT",
        nature: "source_fact",
      },
    },
    {
      date: "2017-04-18",
      title: "Autuação na 40ª Vara Cível do Foro Central de São Paulo",
      description:
        "Processo autuado sob o nº 0020448-92.2017.8.26.0100, classe Procedimento Comum, distribuição livre às 16h09. A partir daqui o feito passa a tramitar no TJSP.",
      nature: "source_fact",
      actType: "distribuicao",
      actor: "juizo",
      phase: 1,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 1,
        documentLabel: "Capa de autuação — TJSP",
        nature: "source_fact",
        excerpt: "Distribuição Livre - 18/04/2017 16:09:00",
      },
    },
    {
      date: "2019-03-27",
      title: "Perito nomeado apresenta proposta de honorários",
      description:
        "O perito judicial Márcio Paiva (computação forense e perícia digital) apresenta estimativa de honorários e despesas de diligência.",
      nature: "expert_statement",
      actType: "pericia_nomeacao",
      actor: "perito",
      phase: 5,
      relevance: "ordinario",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 1771,
        documentLabel: "Petição do perito judicial",
        nature: "expert_statement",
      },
    },
    {
      date: "2019-06-13",
      title: "Honorários periciais fixados em R$ 36.120,00",
      description:
        "O perito apresenta o valor com base na tabela IBAPE vigente e informa que ao final serão entregues o Laudo Pericial e o Relatório das Atividades Periciais.",
      nature: "expert_statement",
      actType: "pericia_nomeacao",
      actor: "perito",
      phase: 5,
      relevance: "ordinario",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 1830,
        documentLabel: "Proposta de honorários periciais",
        nature: "expert_statement",
      },
    },
    {
      date: "2019-08-16",
      title: "Juízo delimita o objeto da perícia e os quesitos",
      description:
        "Decisão determina a revisão dos honorários considerando a prova deferida às fls. 1.288/1.289 e os quesitos apresentados pelas partes, com posterior conclusão para eventual alteração do perito e homologação.",
      nature: "court_statement",
      actType: "pericia_quesitos",
      actor: "juizo",
      phase: 5,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 1831,
        documentLabel: "Decisão sobre honorários e quesitos",
        nature: "court_statement",
      },
    },
    {
      date: "2022-04-20",
      title: "Laudo pericial protocolado",
      description:
        "O perito Márcio Paiva protocola o laudo pericial após a fase de diligências sobre o ambiente computacional e os instrumentos contratuais.",
      nature: "expert_statement",
      actType: "pericia_laudo",
      actor: "perito",
      phase: 7,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 2106,
        documentLabel: "Laudo pericial judicial",
        nature: "expert_statement",
        excerpt: "laudo pericial protocolado pelo ilustre perito Sr. Márcio Paiva em 20/04/2022",
      },
    },
    {
      date: "2022-06-23",
      title: "Assistente técnico aponta vistoria pendente",
      description:
        "Manifestação registra que o ambiente computacional completo da requerente ainda não havia sido vistoriado e aguarda a continuação dos trabalhos periciais — ponto que sustenta discussão sobre a completude da prova técnica.",
      nature: "party_allegation",
      actType: "pericia_diligencia",
      actor: "assistente",
      phase: 6,
      relevance: "ordinario",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 2320,
        documentLabel: "Manifestação de assistente técnico",
        nature: "party_allegation",
      },
    },
    {
      date: "2022-10-17",
      title: "JK Gestão impugna o laudo pericial",
      description:
        "Manifestação da corré sobre o laudo, protocolada às 20h23 sob o nº WJMJ22418530558.",
      nature: "party_allegation",
      actType: "pericia_impugnacao",
      actor: "re",
      phase: 8,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 2110,
        documentLabel: "Manifestação JK Gestão — laudo pericial",
        nature: "party_allegation",
      },
    },
    {
      date: "2022-10-18",
      title: "TOTVS impugna o laudo pericial",
      description:
        "Manifestação da corré TOTVS sobre o laudo, protocolada em 19/10/2022 sob o nº WJMJ22418692000. Com as duas impugnações, a extensão do inadimplemento reconhecido pela perícia permanece controvertida.",
      nature: "party_allegation",
      actType: "pericia_impugnacao",
      actor: "re",
      phase: 8,
      relevance: "marco",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 2156,
        documentLabel: "Manifestação TOTVS — laudo pericial",
        nature: "party_allegation",
      },
    },
    {
      date: "2026-08-05",
      title: "Extração do mapa de evidências EvidIA",
      description:
        "Auditados 2.737 pontos de prova nos autos, consolidando o Overview Global SAC e o parecer Nulidade360 com score de risco moderado (46,73).",
      nature: "demo_inference",
      actType: "analise_evidia",
      actor: "evidia",
      phase: 8,
      relevance: "ordinario",
    },
  ],
  evidences: [
    {
      id: "ev-eletro-01",
      title: "Reconhecimento de estouro de horas em degravação de reunião",
      evidenceType: "text_excerpt",
      summary:
        "Degravação de reunião gravada na sede da autora registra representantes da parceira de implantação afirmando que a previsão contratual era de 4.000 horas (“foram 4.024 horas”) e que já haviam sido consumidas mais de 8.000 horas de projeto sem entrada em produção. Trata-se de declaração das rés, não de conclusão pericial.",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 31,
        documentLabel: "Degravação de reunião — doc. 10.1",
        nature: "party_allegation",
        excerpt: "a previsão era 4.000 horas no total",
        notes:
          "A tela deve apresentar como declaração colhida em gravação juntada pela autora, sujeita a contraditório — não como conclusão do laudo pericial.",
      },
      demoUse:
        "Sustenta o inadimplemento por admissão da parte contrária, com força independente do laudo.",
    },
    {
      id: "ev-eletro-02",
      title: "E-mails da TOTVS negociando a retirada do Serasa",
      evidenceType: "text_excerpt",
      summary:
        "Correspondência entre a autora e executivos da TOTVS e da JK confirma a inclusão em cadastro de restrição por títulos de manutenção e a negociação de sua baixa durante a fase de implantação: “haverá a retirada do Serasa”; “basta me informar a data em que será quitada, que solicitarei a prorrogação do título”.",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 189,
        documentLabel: "E-mails TOTVS/JK — cobrança e Serasa",
        nature: "source_fact",
        excerpt: "Conforme combinado ontem a noite haverá a retirada do Serasa",
      },
      demoUse: "Fundamenta o pedido indenizatório com prova documental produzida pela própria ré.",
    },
    {
      id: "ev-eletro-03",
      title: "Contratos coligados de cessão de uso e prestação de serviços",
      evidenceType: "document_comparison",
      summary:
        "A inicial relaciona o Contrato de Cessão de Direito de Uso (registro nº 1.901.975), o Contrato de Atendimento Personalizado de 12/04/2010 e as propostas comerciais 445575 (SCS) e combo 44542/44545, demonstrando a interdependência entre licença e implantação.",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 20,
        documentLabel: "Petição inicial — instrumentos contratuais",
        nature: "source_fact",
        excerpt: "de Registro de Títulos e documentos de São Paulo-SP, sob o nº 1.901.975",
      },
      demoUse: "Refuta a tese de fracionamento contratual e de isenção de responsabilidade.",
    },
    {
      id: "ev-eletro-04",
      title: "Dossiê de ações de terceiros contra TOTVS e JK",
      evidenceType: "document_comparison",
      summary:
        "Os autos incorporam consultas processuais e decisões de outros litígios movidos por clientes distintos contra a TOTVS e a JK Gestão, com objeto semelhante — rescisão contratual por falha de implantação e restrição de crédito. É prova de padrão de conduta, e não ato deste processo.",
      source: {
        sourceFile: eletromarSource,
        sourcePage: 493,
        documentLabel: "Consultas processuais e decisão em ação de terceiro",
        nature: "source_fact",
        notes:
          "Não confundir com movimentação destes autos: as páginas 480–520 tratam de processos de outras partes, juntados como prova de conduta reiterada.",
      },
      demoUse: "Reduz a força da tese de caso isolado e amplia a alavanca de acordo.",
    },
  ],
  auditBlocks: [
    {
      id: "block-eletro-1",
      name: "Adimplemento Técnico e Aceite Formal",
      integrityScore: 92,
      riskLevel: "low",
      summary:
        "Laudo pericial conclusivo demonstrando que a implantação não atingiu o estado operacional e carece de termo de aceite.",
      findingIds: ["find-eletro-1"],
    },
    {
      id: "block-eletro-2",
      name: "Validade das Cobranças e Negativação",
      integrityScore: 95,
      riskLevel: "low",
      summary:
        "Prova documental irrefutável de cobrança de manutenção SMS e negativação sobre sistema não homologado.",
      findingIds: ["find-eletro-2"],
    },
    {
      id: "block-eletro-3",
      name: "Solidariedade e Coligação Contratual",
      integrityScore: 78,
      riskLevel: "moderate",
      summary:
        "Jurisprudência sólida sobre contratos coligados de software, mitigando a alegação da TOTVS de separação da parceira de implantação.",
      findingIds: ["find-eletro-3"],
    },
  ],
  findings: [
    {
      id: "find-eletro-1",
      blockId: "block-eletro-1",
      title: "Projeto Inacabado e Falta de Homologação",
      auditQuestion: "O projeto de ERP foi formalmente entregue e homologado com termo de aceite?",
      status: "evidence_found",
      riskLevel: "low",
      riskScore: 12,
      confidence: 0.88,
      thesisSide: "claimant",
      nature: "party_allegation",
      evidenceIds: ["ev-eletro-01"],
      inference:
        "O inadimplemento é sustentado por admissão das próprias rés em reunião gravada, o que reduz a dependência exclusiva do laudo pericial — hoje impugnado por ambas as corrés.",
      proceduralImpact:
        "Fundamenta a rescisão com devolução dos pagamentos mesmo em cenário de desconstituição parcial do laudo.",
      recommendedAction:
        "Sustentar a tese em dois pilares independentes: admissão em degravação e conclusão pericial, para não concentrar o risco em uma única prova.",
      includedInReport: true,
    },
    {
      id: "find-eletro-2",
      blockId: "block-eletro-2",
      title: "Cobrança Prematura e Dano Moral in Re Ipsa",
      auditQuestion:
        "Houve negativação indevida da empresa cedente antes da conclusão dos serviços?",
      status: "evidence_found",
      riskLevel: "low",
      riskScore: 10,
      confidence: 0.98,
      thesisSide: "claimant",
      nature: "source_fact",
      evidenceIds: ["ev-eletro-02"],
      inference:
        "Negativação injustificada gera dever de indenizar independentemente de prova de dano patrimonial específico.",
      proceduralImpact: "Elevada probabilidade de êxito no pleito de danos morais corporativos.",
      recommendedAction:
        "Destacar a data da negativação em cotejo com os e-mails de paralisação do projeto.",
      includedInReport: true,
    },
    {
      id: "find-eletro-3",
      blockId: "block-eletro-3",
      title: "Interdependência dos Contratos Coligados",
      auditQuestion: "Os contratos de licença (CDU) e implantação (SCS) constituem operação única?",
      status: "evidence_found",
      riskLevel: "moderate",
      riskScore: 35,
      confidence: 0.85,
      thesisSide: "claimant",
      nature: "source_fact",
      evidenceIds: ["ev-eletro-03"],
      inference: "Software sem implantação funcional não possui utilidade econômica isolada.",
      proceduralImpact:
        "Derruba a preliminar de ilegitimidade passiva e afasta a divisão isolada de responsabilidades.",
      recommendedAction:
        "Reforçar a doutrina de redes contratuais e fornecimento conjunto de soluções de TI.",
      includedInReport: true,
    },
  ],
  redTeam: [
    {
      id: "red-eletro-1",
      title: "Tese de Ausência de Responsabilidade Solidária (Art. 265 CC)",
      attackingSide: "defendant",
      thesis:
        "A TOTVS argumenta que faturava apenas licenças de uso e que a culpa pelo atraso na implantação é exclusiva da parceira de serviços JK.",
      successProbability: 0.35,
      severity: "moderate",
      sourceBasis: "party_allegation",
      evidenceIds: ["ev-eletro-03"],
      mitigation:
        "Apresentar as propostas comerciais conjuntas que comprovam que a aquisição do software foi condicionada à oferta de serviços integrados.",
    },
    {
      id: "red-eletro-2",
      title: "Alegação de Disponibilização Efetiva do Software",
      attackingSide: "defendant",
      thesis:
        "Argumento de que os códigos-fonte e sistemas foram instalados nos servidores da Eletromar, gerando dever de pagar as mensalidades de licença.",
      successProbability: 0.2,
      severity: "low",
      sourceBasis: "party_allegation",
      evidenceIds: ["ev-eletro-01"],
      mitigation:
        "O laudo pericial demonstrou que a instalação física não equivale a funcionamento operacional sem as rotinas customizadas contratadas.",
    },
    {
      id: "red-eletro-3",
      title: "Desconstituição do laudo pericial",
      attackingSide: "defendant",
      thesis:
        "As duas corrés impugnaram o laudo em outubro de 2022, e o assistente técnico da autora registrou que o ambiente computacional completo não chegou a ser vistoriado. A defesa pode sustentar que a prova técnica é incompleta e pleitear complementação ou nova perícia.",
      successProbability: 0.42,
      severity: "high",
      sourceBasis: "party_allegation",
      evidenceIds: ["ev-eletro-01"],
      mitigation:
        "Ancorar o inadimplemento na admissão colhida em degravação e na prova documental de cobrança, que independem do laudo; subsidiariamente, requerer complementação com vistoria integral do ambiente.",
    },
  ],
  valuation: {
    currency: "BRL",
    grossClaimValue: 876383.3,
    initialReferencePrice: 620000,
    recommendedPrice: 512000,
    scenarios: [
      {
        id: "conservative",
        label: "Conservador",
        recommendedPrice: 402000,
        expectedRecovery: 980000,
        roiMultiple: 2.44,
        probabilityOfSuccess: 0.66,
      },
      {
        id: "base",
        label: "Base",
        recommendedPrice: 512000,
        expectedRecovery: 1420000,
        roiMultiple: 2.77,
        probabilityOfSuccess: 0.78,
      },
      {
        id: "aggressive",
        label: "Agressivo",
        recommendedPrice: 620000,
        expectedRecovery: 1780000,
        roiMultiple: 2.87,
        probabilityOfSuccess: 0.85,
      },
    ],
    adjustments: [
      {
        label: "Admissão das rés em degravação",
        amount: 94000,
        direction: "positive",
        nature: "simulated_metric",
        rationale:
          "Prêmio demonstrativo pela existência de reconhecimento do inadimplemento por representantes das rés, com força independente do laudo pericial.",
      },
      {
        label: "Prova documental da restrição de crédito",
        amount: 61000,
        direction: "positive",
        nature: "simulated_metric",
        rationale:
          "Ajuste pela correspondência produzida pela própria ré confirmando a inscrição e a negociação de sua retirada, que sustenta o pedido indenizatório.",
      },
      {
        label: "Laudo impugnado pelas duas corrés",
        amount: 78000,
        direction: "negative",
        nature: "simulated_metric",
        rationale:
          "Desconto pela possibilidade de complementação ou repetição da perícia, com alongamento da duration e custo de carrego adicional.",
      },
      {
        label: "Discussão sobre solidariedade TOTVS/JK",
        amount: 45000,
        direction: "negative",
        nature: "simulated_metric",
        rationale:
          "Desconto pelo risco de reconhecimento parcial de responsabilidade, restringindo a recuperação ao patrimônio da parceira de implantação.",
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

export const realCasesV2: RealCaseDemo[] = [eletromarTotvsCase, febSapCase, pauloGrittiMatsudaCase];

export const documentedCasesV2 = realCasesV2.filter(
  (item) => item.dataStatus === "document_grounded",
);

export const caseBySlugV2 = Object.fromEntries(
  realCasesV2.map((item) => [item.slug, item]),
) as Record<string, RealCaseDemo>;
