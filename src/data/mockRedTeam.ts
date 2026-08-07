import { featuredDealId } from "@/data/mockDeals";
import { realCasesV2 } from "@/data/v2";

export type RedTeamAttack = {
  id: string;
  title: string;
  vector: string;
  successProbability: number;
  severity: "moderado" | "alto" | "critico";
  mitigation: string;
  attackingSide: "claimant" | "defendant";
};

export type RedTeamData = {
  attacks: RedTeamAttack[];
  hiddenVulnerabilities: string[];
  investmentThesisImpact: string;
  available: boolean;
};

const severityMap = {
  low: "moderado",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
} as const;

export function getRedTeamData(caseId: string): RedTeamData {
  const source = realCasesV2.find((caseItem) => caseItem.id === caseId) ?? realCasesV2[0];
  const attacks = source.redTeam.map((attack) => ({
    id: attack.id,
    title: attack.title,
    vector: attack.thesis,
    successProbability: Math.round(attack.successProbability * 100),
    severity: severityMap[attack.severity],
    mitigation: attack.mitigation,
    attackingSide: attack.attackingSide,
  }));
  const hiddenVulnerabilities = source.findings
    .filter((finding) => finding.riskLevel === "critical" || finding.riskLevel === "high")
    .slice(0, 3)
    .map((finding) => finding.inference);

  return {
    attacks,
    hiddenVulnerabilities,
    available: attacks.length > 0,
    investmentThesisImpact:
      attacks.length > 0
        ? `${source.centralDemoThesis} Os ataques mapeados devem ser incorporados à decisão de preço e à revisão humana.`
        : `O Red Team ainda não foi consolidado para este processo. ${source.demoNotice}`,
  };
}

const defaultData = getRedTeamData(featuredDealId);

export const redTeamAttacks = defaultData.attacks;
export const hiddenVulnerabilities = defaultData.hiddenVulnerabilities;
export const investmentThesisImpact = defaultData.investmentThesisImpact;
