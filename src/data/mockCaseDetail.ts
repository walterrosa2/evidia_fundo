import { featuredDealId, mockDeals } from "./mockDeals";

const deal = mockDeals.find((d) => d.id === featuredDealId)!;

export const caseDetail = {
  ...deal,
  executiveSummary:
    "Ativo litigioso com tese sólida de violação tarifária na geração de energia, sustentada por laudo pericial extenso. A análise EvidIA identificou fragilidades estruturais em cadeia de custódia e contraditório que afetam a probabilidade de êxito em sede recursal e justificam reprecificação para entrada com margem de segurança ampliada.",
  caseNumber: "0034567-89.2022.8.26.0100",
  court: "TJSP — 2ª Câmara de Direito Público",
  thesis:
    "Indenização por aplicação indevida de bandeira tarifária extraordinária em contratos de longo prazo, com pedido subsidiário de revisão.",
  documentsAnalyzed: 412,
  legalScore: 78,
  evidenceScore: 52,
  nullityScore: 38,
  settlementPotential: 62,
  timeline: [
    { date: "2022-03-14", label: "Distribuição da ação" },
    { date: "2023-01-08", label: "Contestação apresentada" },
    { date: "2023-09-22", label: "Perícia técnica concluída" },
    { date: "2024-06-12", label: "Sentença de procedência parcial" },
    { date: "2025-02-04", label: "Acórdão de manutenção" },
    { date: "2025-11-19", label: "Recurso Especial admitido" },
  ],
  modulesApplied: [
    { id: "nulidade360", name: "Nulidade360", status: "Concluído", findings: 27 },
    { id: "red-team", name: "Red Team Jurídico", status: "Concluído", findings: 4 },
    { id: "valuation", name: "Valuation Probatório", status: "Concluído", findings: 3 },
    { id: "comportamental", name: "Análise comportamental", status: "Em fila", findings: 0 },
  ],
};
