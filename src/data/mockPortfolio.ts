import { realCasesV2, documentedCasesV2 } from "@/data/v2";

const totalClaim = realCasesV2.reduce((acc, c) => acc + (c.claimValue ?? 0), 0);
const criticalCount = documentedCasesV2.reduce(
  (acc, c) => acc + c.findings.filter((f) => f.riskLevel === "critical").length,
  0,
);
const avgNullity =
  documentedCasesV2.reduce((acc, c) => acc + c.nullityRiskScore, 0) /
  Math.max(1, documentedCasesV2.length);

export const mockPortfolio = {
  dealsAnalyzed: realCasesV2.length,
  capitalUnderAnalysis: totalClaim,
  averageEvidenceRisk: Math.round(avgNullity),
  hiddenOpportunitiesFound: documentedCasesV2.reduce((acc, c) => acc + c.evidences.length, 0),
  estimatedSavings: documentedCasesV2.reduce(
    (acc, c) =>
      acc + (c.valuation ? c.valuation.initialReferencePrice - c.valuation.recommendedPrice : 0),
    0,
  ),
  averageAnalysisTime: "4h 20min",
  criticalDeals: criticalCount,
  estimatedUpside: documentedCasesV2.reduce(
    (acc, c) =>
      acc +
      (c.valuation
        ? c.valuation.scenarios[c.valuation.scenarios.length - 1].expectedRecovery -
          c.valuation.recommendedPrice
        : 0),
    0,
  ),
};

// Distribution based on documented findings' risk levels
const findingsAll = documentedCasesV2.flatMap((c) => c.findings);
const count = (lvl: string) => findingsAll.filter((f) => f.riskLevel === lvl).length;

export const riskDistribution = [
  { name: "Baixo", value: count("low"), color: "var(--risk-low)" },
  { name: "Moderado", value: count("moderate"), color: "var(--risk-moderate)" },
  { name: "Alto", value: count("high"), color: "var(--risk-high)" },
  { name: "Crítico", value: count("critical"), color: "var(--risk-critical)" },
];

export const financialExposure = realCasesV2
  .filter((c) => c.claimValue)
  .map((c) => ({
    risco: c.displayName.split(" ×")[0].slice(0, 18),
    exposicao: Math.round((c.claimValue ?? 0) / 1000),
  }));

export const recurringRisks = [
  { label: "Perícia sem exame direto de dados/campo", count: 2, severity: "critico" as const },
  { label: "Quesitos deferidos sem resposta conclusiva", count: 2, severity: "alto" as const },
  { label: "Metodologia indireta e causalidade disputada", count: 3, severity: "alto" as const },
  { label: "Documentação extemporânea das partes", count: 2, severity: "moderado" as const },
  { label: "Invasão do mérito jurídico pelo expert", count: 1, severity: "critico" as const },
];
