import { realCasesV2, documentedCasesV2 } from "@/data/v2";
import { mockDeals } from "@/data/mockDeals";
import { riskLabel, scoreToRisk } from "@/lib/risk";

const dealById = new Map(mockDeals.map((deal) => [deal.id, deal]));
const totalEconomicPotential = mockDeals.reduce(
  (total, deal) => total + deal.economicPotential.valorEconomicoPotencial,
  0,
);
const avgNullity =
  mockDeals.reduce((acc, deal) => acc + deal.evidiaScore, 0) / Math.max(1, mockDeals.length);
const averageEvidenceRisk = Math.round(avgNullity);

export const mockPortfolio = {
  dealsAnalyzed: realCasesV2.length,
  capitalUnderAnalysis: totalEconomicPotential,
  averageEvidenceRisk,
  averageEvidenceRiskLabel: riskLabel[scoreToRisk(averageEvidenceRisk)],
  hiddenOpportunitiesFound: mockDeals.reduce((acc, deal) => acc + deal.sourceFindingCount, 0),
  estimatedSavings: documentedCasesV2.reduce((acc, c) => {
    const deal = dealById.get(c.id);
    const monetaryScale =
      deal && c.valuation ? deal.potentialTicket / c.valuation.recommendedPrice : 1;
    return (
      acc +
      (c.valuation
        ? (c.valuation.initialReferencePrice - c.valuation.recommendedPrice) * monetaryScale
        : 0)
    );
  }, 0),
  averageAnalysisTime: "4h 20min",
  criticalDeals: mockDeals.filter(
    (deal) => deal.evidenceRisk === "alto" || deal.evidenceRisk === "critico",
  ).length,
  estimatedUpside: totalEconomicPotential,
};

const count = (level: (typeof mockDeals)[number]["evidenceRisk"]) =>
  mockDeals.filter((deal) => deal.evidenceRisk === level).length;

export const riskDistribution = [
  { name: "Baixo", value: count("baixo"), color: "var(--risk-low)" },
  { name: "Moderado", value: count("moderado"), color: "var(--risk-moderate)" },
  { name: "Alto", value: count("alto"), color: "var(--risk-high)" },
  { name: "Crítico", value: count("critico"), color: "var(--risk-critical)" },
];

export const financialExposure = mockDeals
  .filter((deal) => deal.economicPotential.valorEconomicoPotencial > 0)
  .map((deal) => ({
    risco: deal.name.split(" ×")[0].slice(0, 18),
    exposicao: Number((deal.economicPotential.valorEconomicoPotencial / 1_000_000).toFixed(2)),
  }));

export const recurringRisks = [
  { label: "Perícia sem exame direto de dados/campo", count: 2, severity: "critico" as const },
  { label: "Quesitos deferidos sem resposta conclusiva", count: 2, severity: "alto" as const },
  { label: "Metodologia indireta e causalidade disputada", count: 3, severity: "alto" as const },
  { label: "Documentação extemporânea das partes", count: 2, severity: "moderado" as const },
  { label: "Invasão do mérito jurídico pelo expert", count: 1, severity: "critico" as const },
];
