import { febSapCase } from "@/data/v2";

export type RedTeamAttack = {
  id: string;
  title: string;
  vector: string;
  successProbability: number;
  severity: "moderado" | "alto" | "critico";
  mitigation: string;
  attackingSide: "claimant" | "defendant";
};

const sevMap = {
  low: "moderado",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
} as const;

export const redTeamAttacks: RedTeamAttack[] = febSapCase.redTeam.map((r) => ({
  id: r.id,
  title: r.title,
  vector: r.thesis,
  successProbability: Math.round(r.successProbability * 100),
  severity: sevMap[r.severity],
  mitigation: r.mitigation,
  attackingSide: r.attackingSide,
}));

export const hiddenVulnerabilities = febSapCase.findings
  .filter((f) => f.riskLevel === "critical" || f.riskLevel === "high")
  .slice(0, 3)
  .map((f) => f.inference);

export const investmentThesisImpact =
  "Os ataques mapeados destacam a controvérsia sobre cumprimento do encargo pericial e limites da atuação técnica. Com complementação probatória e revisão humana das conclusões, o caso permanece dentro da faixa de reprecificação recomendada.";
