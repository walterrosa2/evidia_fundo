import { scoreToRisk, type RiskLevel, type Recommendation } from "@/lib/risk";
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
  rankingPosition: number;
  purchaseProfile: NonNullable<RealCaseDemo["purchaseProfile"]>;
  evidenceMapStatus: NonNullable<RealCaseDemo["evidenceMapStatus"]>;
  sourceFindingCount: number;
};

export const dealStatusLabel: Record<DealStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
  comite: "Comitê",
  rejeitado: "Rejeitado",
};

export const purchaseProfileLabel: Record<NonNullable<RealCaseDemo["purchaseProfile"]>, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  nao_recomendado: "Não recomendado",
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
  "case-eletromar-totvs": "Equipe EvidIA",
  "case-feb-sap": "M. Almeida",
  "case-paulo-gritti-matsuda": "R. Tavares",
};

const updatedByCase: Record<string, string> = {
  "case-eletromar-totvs": "2026-08-06",
  "case-feb-sap": "2026-07-31",
  "case-paulo-gritti-matsuda": "2026-03-03",
};

const statusByCase: Record<string, DealStatus> = {
  "case-eletromar-totvs": "comite",
  "case-feb-sap": "em_analise",
  "case-paulo-gritti-matsuda": "em_analise",
};

function toDeal(c: RealCaseDemo): Deal {
  const evidiaScore = Number((c.overallRiskScore ?? c.nullityRiskScore ?? 0).toFixed(2));
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
      c.dataStatus === "awaiting_documents"
        ? "moderado"
        : c.overallRiskLevel
          ? riskLevelMap[c.overallRiskLevel]
          : scoreToRisk(evidiaScore),
    economicPotential,
    recommendation: recommendationMap[c.recommendation],
    status: statusByCase[c.id] ?? statusByRole[c.portfolioRole],
    owner: ownerByCase[c.id] ?? "Equipe EvidIA",
    updatedAt: updatedByCase[c.id] ?? "2026-05-01",
    processNumber: c.processNumber,
    court: c.court,
    dataStatus: c.dataStatus,
    rankingPosition: c.rankingPosition ?? Number.MAX_SAFE_INTEGER,
    purchaseProfile: c.purchaseProfile ?? "moderado",
    evidenceMapStatus: c.evidenceMapStatus ?? "missing",
    sourceFindingCount: c.sourceFindingCount ?? c.findings.length,
  };
}

export const mockDeals: Deal[] = realCasesV2
  .map(toDeal)
  .sort((left, right) => left.rankingPosition - right.rankingPosition);

export const featuredDealId = "case-feb-sap";

// Re-exported for callers that need the mapping helpers
export { riskLevelMap };
