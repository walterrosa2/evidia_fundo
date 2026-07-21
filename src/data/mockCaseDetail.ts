import { featuredDealId, mockDeals } from "./mockDeals";
import { febSapCase } from "@/data/v2";

const deal = mockDeals.find((d) => d.id === featuredDealId)!;
const source = febSapCase;

export const caseDetail = {
  ...deal,
  executiveSummary: source.executiveSummary,
  caseNumber: source.processNumber ?? "",
  court: `${source.court ?? ""} — ${source.courtUnit ?? ""}`.trim(),
  thesis: source.centralDemoThesis,
  documentsAnalyzed: source.documentsAnalyzed,
  pagesAnalyzed: source.pagesAnalyzed,
  legalScore: source.legalScore,
  evidenceScore: source.evidenceScore,
  nullityScore: source.nullityRiskScore,
  settlementPotential: source.settlementLeverageScore,
  timeline: source.timeline.map((t) => ({
    date: t.date,
    label: t.title,
  })),
  modulesApplied: [
    {
      id: "nulidade360",
      name: "Nulidade360",
      status: "Concluído",
      findings: source.findings.length,
    },
    {
      id: "red-team",
      name: "Red Team Jurídico",
      status: "Concluído",
      findings: source.redTeam.length,
    },
    {
      id: "valuation",
      name: "Valuation Probatório",
      status: source.valuation ? "Concluído" : "Em fila",
      findings: source.valuation?.adjustments.length ?? 0,
    },
    {
      id: "comportamental",
      name: "Análise comportamental",
      status: "Em fila",
      findings: 0,
    },
  ],
  demoNotice: source.demoNotice,
};
