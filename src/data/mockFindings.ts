import type { RiskLevel } from "@/lib/risk";

export type Block = {
  id: string;
  code: string;
  name: string;
  risk: RiskLevel;
  score: number;
  confidence: number;
  findingsCount: number;
  summary: string;
};

export const blocks: Block[] = [
  {
    id: "custodia",
    code: "B1",
    name: "Cadeia de Custódia",
    risk: "critico",
    score: 38,
    confidence: 92,
    findingsCount: 7,
    summary:
      "Rupturas documentais entre coleta de amostras e laudo final. Ausência de registro fotográfico de etapa crítica.",
  },
  {
    id: "metodologia",
    code: "B2",
    name: "Metodologia Pericial",
    risk: "alto",
    score: 52,
    confidence: 88,
    findingsCount: 5,
    summary:
      "Aplicação parcial de norma técnica. Parâmetros declarados divergem dos efetivamente utilizados.",
  },
  {
    id: "documentacao",
    code: "B3",
    name: "Documentação",
    risk: "moderado",
    score: 64,
    confidence: 90,
    findingsCount: 4,
    summary:
      "Três documentos centrais citados mas não anexados aos autos. Possível nulidade relativa.",
  },
  {
    id: "contraditorio",
    code: "B4",
    name: "Contraditório",
    risk: "alto",
    score: 47,
    confidence: 86,
    findingsCount: 6,
    summary:
      "Quesitos do assistente técnico da parte adversa não respondidos. Limitação ao princípio do contraditório.",
  },
  {
    id: "suspeicao",
    code: "B5",
    name: "Suspeição",
    risk: "moderado",
    score: 71,
    confidence: 81,
    findingsCount: 2,
    summary: "Indício de relação prévia entre perito nomeado e laboratório fornecedor.",
  },
  {
    id: "sentenca",
    code: "B6",
    name: "Sentença sobre prova viciada",
    risk: "alto",
    score: 49,
    confidence: 84,
    findingsCount: 3,
    summary:
      "Fundamentação da sentença ancorada predominantemente em laudo com fragilidades identificadas em B1 e B2.",
  },
];

export type FindingStatus =
  | "indicio_encontrado"
  | "ausencia_relevante"
  | "contradicao_interna"
  | "documento_citado_nao_anexado"
  | "inconclusivo";

export const findingStatusLabel: Record<FindingStatus, string> = {
  indicio_encontrado: "Indício encontrado",
  ausencia_relevante: "Ausência relevante",
  contradicao_interna: "Contradição interna",
  documento_citado_nao_anexado: "Documento não anexado",
  inconclusivo: "Inconclusivo",
};

export type Finding = {
  id: string;
  blockId: string;
  question: string;
  status: FindingStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  page?: number;
  evidenceType: string;
  excerpt?: string;
  absenceExplanation?: string;
  inference: string;
  proceduralImpact: string;
  recommendedAction: string;
  includedInReport: boolean;
};

export const mockFindings: Finding[] = [
  {
    id: "f-001",
    blockId: "custodia",
    question: "A cadeia de custódia da amostra A-17 foi preservada integralmente?",
    status: "contradicao_interna",
    riskLevel: "critico",
    riskScore: 18,
    confidence: 94,
    page: 47,
    evidenceType: "Trecho textual",
    excerpt:
      "“A amostra A-17 foi recebida em 12/03 sem lacre íntegro, sendo recondicionada pelo auxiliar sem nova selagem oficial.”",
    inference:
      "Há quebra documental entre coleta e análise. A reposição do lacre por terceiro não autorizado compromete a integridade probatória.",
    proceduralImpact:
      "Nulidade técnica do laudo quanto à amostra A-17. Argumento direto para impugnação pericial.",
    recommendedAction: "Marcar para relatório e fundamentar nulidade parcial.",
    includedInReport: true,
  },
  {
    id: "f-002",
    blockId: "custodia",
    question: "Existe registro fotográfico da etapa de transporte das amostras?",
    status: "ausencia_relevante",
    riskLevel: "alto",
    riskScore: 32,
    confidence: 88,
    page: 51,
    evidenceType: "Ausência relevante",
    absenceExplanation:
      "A norma técnica exige registro visual de etapas críticas; o laudo apresenta apenas tabela descritiva.",
    inference:
      "A ausência impede verificação independente da integridade da amostra durante o transporte.",
    proceduralImpact: "Reduz peso probatório do laudo em sede recursal.",
    recommendedAction: "Solicitar documento complementar à parte autora.",
    includedInReport: true,
  },
  {
    id: "f-003",
    blockId: "metodologia",
    question: "A norma ABNT NBR 15847 foi aplicada conforme declarado?",
    status: "indicio_encontrado",
    riskLevel: "alto",
    riskScore: 36,
    confidence: 91,
    page: 88,
    evidenceType: "Trecho textual",
    excerpt:
      "“Adotou-se método análogo, com adaptações de parâmetros de temperatura e tempo de ensaio.”",
    inference:
      "Adaptação não justificada tecnicamente. Afasta a conformidade declarada com a norma.",
    proceduralImpact: "Permite ataque ao mérito da conclusão pericial.",
    recommendedAction: "Aceitar achado e incluir em red team.",
    includedInReport: true,
  },
  {
    id: "f-004",
    blockId: "documentacao",
    question: "Os anexos B-3, B-4 e B-7 citados no laudo estão presentes nos autos?",
    status: "documento_citado_nao_anexado",
    riskLevel: "moderado",
    riskScore: 55,
    confidence: 96,
    page: 102,
    evidenceType: "Documento citado não anexado",
    inference:
      "Três anexos referenciados como base de cálculo não foram juntados, impedindo conferência.",
    proceduralImpact: "Argumento de cerceamento de defesa em sede de contraditório.",
    recommendedAction: "Solicitar juntada dos anexos.",
    includedInReport: false,
  },
  {
    id: "f-005",
    blockId: "contraditorio",
    question: "Os quesitos do assistente técnico da requerida foram respondidos?",
    status: "ausencia_relevante",
    riskLevel: "alto",
    riskScore: 41,
    confidence: 89,
    page: 134,
    evidenceType: "Ausência relevante",
    absenceExplanation:
      "Quesitos 4, 7 e 11 da requerida não constam de resposta do perito oficial.",
    inference:
      "Violação ao contraditório técnico. Suficiente para pleitear nova perícia.",
    proceduralImpact: "Forte argumento para anulação parcial do feito.",
    recommendedAction: "Marcar para relatório e red team.",
    includedInReport: true,
  },
  {
    id: "f-006",
    blockId: "sentenca",
    question: "A sentença fundamenta-se predominantemente no laudo questionado?",
    status: "indicio_encontrado",
    riskLevel: "alto",
    riskScore: 44,
    confidence: 87,
    page: 188,
    evidenceType: "Trecho textual",
    excerpt:
      "“Acolho integralmente as conclusões do laudo pericial, que constituem prova bastante para o deslinde.”",
    inference:
      "Decisão monocrática ancorada quase exclusivamente em prova com fragilidades em B1 e B2.",
    proceduralImpact:
      "Vetor estrutural para Recurso Especial: sentença baseada em prova viciada.",
    recommendedAction: "Marcar para relatório como achado crítico.",
    includedInReport: true,
  },
  {
    id: "f-007",
    blockId: "suspeicao",
    question: "Há vínculo prévio entre perito nomeado e laboratório fornecedor?",
    status: "indicio_encontrado",
    riskLevel: "moderado",
    riskScore: 58,
    confidence: 78,
    page: 22,
    evidenceType: "Trecho textual",
    excerpt:
      "“Conforme currículo lattes, o perito atuou como consultor técnico do laboratório X entre 2019-2022.”",
    inference:
      "Vínculo recente pode caracterizar suspeição relativa nos termos do art. 148 do CPC.",
    proceduralImpact: "Argumento subsidiário, dependente de prova adicional.",
    recommendedAction: "Editar e revisar enquadramento.",
    includedInReport: false,
  },
];
