import type { RiskLevel, Recommendation } from "@/lib/risk";
import { realCasesV2, type RealCaseDemo } from "@/data/v2";

export type DealStatus = "novo" | "em_analise" | "concluido" | "comite" | "rejeitado";

export type Deal = {
  id: string;
  name: string;
  sector: string;
  caseValue: number;
  potentialTicket: number;
  proceduralPhase: string;
  evidiaScore: number;
  evidenceRisk: RiskLevel;
  hiddenUpside: number;
  recommendation: Recommendation;
  status: DealStatus;
  owner: string;
  updatedAt: string;
  processNumber?: string;
  court?: string;
  dataStatus: RealCaseDemo["dataStatus"];
};

export const dealStatusLabel: Record<DealStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
  comite: "Comitê",
  rejeitado: "Rejeitado",
};

const riskLevelMap: Record<RealCaseDemo["auditBlocks"][number]["riskLevel"], RiskLevel> = {
  low: "baixo",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
};

const recommendationMap: Record<RealCaseDemo["recommendation"], Recommendation> = {
  invest: "avancar",
  reprice: "reprecificar",
  hold: "negociar",
  reject: "rejeitar",
  human_review: "reprecificar",
};

const statusByRole: Record<RealCaseDemo["portfolioRole"], DealStatus> = {
  flagship: "em_analise",
  secondary: "comite",
  placeholder: "novo",
};

const ownerByCase: Record<string, string> = {
  "case-feb-sap": "M. Almeida",
  "case-paulo-gritti-matsuda": "R. Tavares",
  "case-cobex-bradesco": "C. Bernardes",
  "case-cami-sankhya": "F. Khouri",
  "case-lagoa-xupe-nexa": "P. Setti",
};

const updatedByCase: Record<string, string> = {
  "case-feb-sap": "2026-07-31",
  "case-paulo-gritti-matsuda": "2026-03-03",
  "case-cobex-bradesco": "2026-05-10",
  "case-cami-sankhya": "2026-05-12",
  "case-lagoa-xupe-nexa": "2026-05-14",
};

function toRiskFromScore(score: number): RiskLevel {
  if (score >= 80) return "critico";
  if (score >= 60) return "alto";
  if (score >= 40) return "moderado";
  return "baixo";
}

function toDeal(c: RealCaseDemo): Deal {
  const evidiaScore = Math.round((c.legalScore + c.evidenceScore) / 2);
  const claim = c.claimValue ?? 0;
  const potential = c.valuation?.recommendedPrice ?? Math.round(claim * 0.3);
  const upside = c.valuation
    ? Math.max(0, c.valuation.scenarios[c.valuation.scenarios.length - 1].expectedRecovery - c.valuation.recommendedPrice)
    : 0;
  return {
    id: c.id,
    name: c.displayName,
    sector: c.sector,
    caseValue: claim,
    potentialTicket: potential,
    proceduralPhase: c.proceduralStage,
    evidiaScore,
    evidenceRisk: c.dataStatus === "awaiting_documents" ? "moderado" : toRiskFromScore(c.nullityRiskScore),
    hiddenUpside: upside,
    recommendation: recommendationMap[c.recommendation],
    status: statusByRole[c.portfolioRole],
    owner: ownerByCase[c.id] ?? "Equipe EvidIA",
    updatedAt: updatedByCase[c.id] ?? "2026-05-01",
    processNumber: c.processNumber,
    court: c.court,
    dataStatus: c.dataStatus,
  };
}

export const mockDeals: Deal[] = realCasesV2.map(toDeal);

export const featuredDealId = "case-feb-sap";

// Re-exported for callers that need the mapping helpers
export { riskLevelMap };
