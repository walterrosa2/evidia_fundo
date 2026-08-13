import { featuredDealId, mockDeals } from "./mockDeals";
import { realCasesV2 } from "@/data/v2";

export function getCaseDetail(id: string) {
  const deal = mockDeals.find((item) => item.id === id);
  const source = realCasesV2.find((item) => item.id === id);
  if (!deal || !source) return null;

  const completed = source.dataStatus === "document_grounded";
  return {
    ...deal,
    executiveSummary: source.executiveSummary,
    caseNumber: source.processNumber ?? "Processo não informado",
    court: [source.court, source.courtUnit].filter(Boolean).join(" — ") || "Tribunal não informado",
    thesis: source.centralDemoThesis,
    documentsAnalyzed: source.documentsAnalyzed,
    pagesAnalyzed: source.pagesAnalyzed,
    sourceFiles: source.sourceFiles,
    legalScore: source.legalScore,
    evidenceScore: source.evidenceScore,
    nullityScore: source.nullityRiskScore,
    settlementPotential: source.settlementLeverageScore,
    overallRiskScore: source.overallRiskScore ?? source.nullityRiskScore,
    purchaseProfile: source.purchaseProfile,
    evidenceMapStatus: source.evidenceMapStatus,
    evidenceMapRowCount: source.evidenceMapRowCount ?? 0,
    timeline: source.timeline.map((item) => ({
      date: item.date,
      label: item.title,
    })),
    /** Cronologia completa, com tipo de ato, autor, fase e referência de página. */
    proceduralTimeline: source.timeline,
    modulesApplied: [
      {
        id: "nulidade360",
        name: "Nulidade360",
        status: completed ? "Concluído" : "Aguardando documentos",
        findings: source.sourceFindingCount ?? source.findings.length,
      },
      {
        id: "red-team",
        name: "Red Team Jurídico",
        status: completed ? "Concluído" : "Em fila",
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
}

export const caseDetail = getCaseDetail(featuredDealId)!;
