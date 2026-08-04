import type { RiskLevel, Recommendation } from "@/lib/risk";
import { realCasesV2, type RealCaseDemo } from "@/data/v2";
import {
  calcularValorPotencialPorPeriodo,
  calcularPrecoCompra,
  type EconomicPotentialCalculation,
} from "@/lib/economicPotential";

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
  economicPotential: EconomicPotentialCalculation;
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
  human_review: "revisar",
};

const statusByRole: Record<RealCaseDemo["portfolioRole"], DealStatus> = {
  flagship: "em_analise",
  secondary: "comite",
  placeholder: "novo",
};

const ownerByCase: Record<string, string> = {
  "case-feb-sap": "M. Almeida",
  "case-paulo-gritti-matsuda": "R. Tavares",
};

const updatedByCase: Record<string, string> = {
  "case-feb-sap": "2026-07-31",
  "case-paulo-gritti-matsuda": "2026-03-03",
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
  const filingDate = c.timeline[0]?.date ?? new Date().toISOString().slice(0, 10);
  const economicPotential = calcularValorPotencialPorPeriodo(claim, filingDate);
  const potential = calcularPrecoCompra(economicPotential.valorEconomicoPotencial);
  return {
    id: c.id,
    name: c.displayName,
    sector: c.sector,
    caseValue: claim,
    potentialTicket: potential,
    proceduralPhase: c.proceduralStage,
    evidiaScore,
    evidenceRisk:
      c.dataStatus === "awaiting_documents" ? "moderado" : toRiskFromScore(c.nullityRiskScore),
    economicPotential,
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
