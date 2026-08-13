/**
 * Blocos e achados exibidos nos módulos de nulidade.
 *
 * Até a versão anterior este arquivo derivava sempre de `febSapCase`, de modo que as telas de
 * bloco e de resultado mostravam os achados do FEB independentemente do processo selecionado.
 * Agora tudo é resolvido por caso.
 */

import type { RiskLevel } from "@/lib/risk";
import {
  febSapCase,
  realCasesV2,
  type AuditFinding,
  type FindingStatus as V2FindingStatus,
  type RealCaseDemo,
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

function resolveCase(caseId?: string): RealCaseDemo {
  if (!caseId) return febSapCase;
  return realCasesV2.find((item) => item.id === caseId) ?? febSapCase;
}

export function getBlocks(caseId?: string): Block[] {
  const source = resolveCase(caseId);
  return source.auditBlocks.map((block, index) => {
    const blockFindings = source.findings.filter((finding) => finding.blockId === block.id);
    const confidence =
      blockFindings.length > 0
        ? Math.round(
            (blockFindings.reduce((total, finding) => total + finding.confidence, 0) /
              blockFindings.length) *
              100,
          )
        : 0;

    return {
      id: block.id,
      code: `B${index + 1}`,
      name: block.name,
      risk: riskMap[block.riskLevel],
      score: block.integrityScore,
      confidence,
      findingsCount: block.findingIds.length,
      summary: block.summary,
    };
  });
}

function toFinding(finding: AuditFinding, source: RealCaseDemo): Finding {
  const primaryEvidence = source.evidences.find((item) => item.id === finding.evidenceIds[0]);
  return {
    id: finding.id,
    blockId: finding.blockId,
    question: finding.auditQuestion,
    status: statusMap[finding.status],
    riskLevel: riskMap[finding.riskLevel],
    riskScore: finding.riskScore,
    confidence: Math.round(finding.confidence * 100),
    page: primaryEvidence?.source.sourcePage,
    evidenceType: primaryEvidence?.title ?? finding.title,
    excerpt: primaryEvidence?.source.excerpt,
    absenceExplanation:
      finding.status === "relevant_absence" ? primaryEvidence?.summary : undefined,
    inference: finding.inference,
    proceduralImpact: finding.proceduralImpact,
    recommendedAction: finding.recommendedAction,
    includedInReport: finding.includedInReport,
  };
}

export function getFindings(caseId?: string): Finding[] {
  const source = resolveCase(caseId);
  return source.findings.map((finding) => toFinding(finding, source));
}

/** Compatibilidade com telas que ainda não recebem o caso selecionado. */
export const blocks: Block[] = getBlocks();
export const mockFindings: Finding[] = getFindings();
