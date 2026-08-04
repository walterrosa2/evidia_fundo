import type { RiskLevel } from "@/lib/risk";
import {
  febSapCase,
  type AuditFinding,
  type FindingStatus as V2FindingStatus,
  type RiskLevel as V2Risk,
} from "@/data/v2";

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

const riskMap: Record<V2Risk, RiskLevel> = {
  low: "baixo",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
};

export const blocks: Block[] = febSapCase.auditBlocks.map((b, i) => ({
  id: b.id,
  code: `B${i + 1}`,
  name: b.name,
  risk: riskMap[b.riskLevel],
  score: b.integrityScore,
  confidence: Math.round(
    (febSapCase.findings
      .filter((f) => f.blockId === b.id)
      .reduce((acc, f) => acc + f.confidence, 0) /
      Math.max(1, febSapCase.findings.filter((f) => f.blockId === b.id).length)) *
      100,
  ),
  findingsCount: b.findingIds.length,
  summary: b.summary,
}));

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

const statusMap: Record<V2FindingStatus, FindingStatus> = {
  evidence_found: "indicio_encontrado",
  relevant_absence: "ausencia_relevante",
  internal_contradiction: "contradicao_interna",
  document_cited_not_attached: "documento_citado_nao_anexado",
  inconclusive: "inconclusivo",
  not_applicable: "inconclusivo",
  requires_human_review: "inconclusivo",
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

function toFinding(f: AuditFinding): Finding {
  const primaryEv = febSapCase.evidences.find((e) => e.id === f.evidenceIds[0]);
  return {
    id: f.id,
    blockId: f.blockId,
    question: f.auditQuestion,
    status: statusMap[f.status],
    riskLevel: riskMap[f.riskLevel],
    riskScore: f.riskScore,
    confidence: Math.round(f.confidence * 100),
    page: primaryEv?.source.sourcePage,
    evidenceType: primaryEv?.title ?? f.title,
    excerpt: primaryEv?.source.excerpt,
    absenceExplanation: f.status === "relevant_absence" ? primaryEv?.summary : undefined,
    inference: f.inference,
    proceduralImpact: f.proceduralImpact,
    recommendedAction: f.recommendedAction,
    includedInReport: f.includedInReport,
  };
}

export const mockFindings: Finding[] = febSapCase.findings.map(toFinding);
