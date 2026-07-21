export const mockPortfolio = {
  dealsAnalyzed: 184,
  capitalUnderAnalysis: 6_240_000_000,
  averageEvidenceRisk: 62,
  hiddenOpportunitiesFound: 41,
  estimatedSavings: 312_000_000,
  averageAnalysisTime: "3h 12min",
  criticalDeals: 7,
  estimatedUpside: 894_000_000,
};

export const riskDistribution = [
  { name: "Baixo", value: 28, color: "var(--risk-low)" },
  { name: "Moderado", value: 54, color: "var(--risk-moderate)" },
  { name: "Alto", value: 76, color: "var(--risk-high)" },
  { name: "Crítico", value: 26, color: "var(--risk-critical)" },
];

export const financialExposure = [
  { risco: "Baixo", exposicao: 820 },
  { risco: "Moderado", exposicao: 1640 },
  { risco: "Alto", exposicao: 2380 },
  { risco: "Crítico", exposicao: 1400 },
];

export const recurringRisks = [
  { label: "Cadeia de custódia frágil", count: 62, severity: "alto" as const },
  { label: "Metodologia pericial inconsistente", count: 48, severity: "alto" as const },
  { label: "Documento citado não anexado", count: 41, severity: "moderado" as const },
  { label: "Contraditório insuficiente", count: 37, severity: "critico" as const },
  { label: "Sentença baseada em prova viciada", count: 19, severity: "critico" as const },
];
