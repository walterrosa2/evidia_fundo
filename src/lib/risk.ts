export type RiskLevel = "baixo" | "moderado" | "alto" | "critico";

export const riskLabel: Record<RiskLevel, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export const riskClasses: Record<RiskLevel, string> = {
  baixo: "bg-risk-low/15 text-risk-low border-risk-low/30",
  moderado: "bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30",
  alto: "bg-risk-high/15 text-risk-high border-risk-high/30",
  critico: "bg-risk-critical/15 text-risk-critical border-risk-critical/30",
};

export const riskColor: Record<RiskLevel, string> = {
  baixo: "var(--risk-low)",
  moderado: "var(--risk-moderate)",
  alto: "var(--risk-high)",
  critico: "var(--risk-critical)",
};

export const scoreToRisk = (score: number): RiskLevel => {
  if (score >= 80) return "baixo";
  if (score >= 60) return "moderado";
  if (score >= 40) return "alto";
  return "critico";
};

export const recommendationLabel = {
  avancar: "Avançar",
  reprecificar: "Reprecificar",
  negociar: "Negociar",
  rejeitar: "Rejeitar",
  revisar: "Revisão humana",
} as const;

export type Recommendation = keyof typeof recommendationLabel;

export const recommendationClasses: Record<Recommendation, string> = {
  avancar: "bg-risk-low/15 text-risk-low border-risk-low/30",
  reprecificar: "bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30",
  negociar: "bg-cyan/15 text-cyan border-cyan/30",
  rejeitar: "bg-risk-critical/15 text-risk-critical border-risk-critical/30",
  revisar: "bg-violet/15 text-violet border-violet/30",
};
