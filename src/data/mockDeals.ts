import type { RiskLevel, Recommendation } from "@/lib/risk";

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
  hiddenUpside: number;
  recommendation: Recommendation;
  status: DealStatus;
  owner: string;
  updatedAt: string;
};

export const dealStatusLabel: Record<DealStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
  comite: "Comitê",
  rejeitado: "Rejeitado",
};

export const mockDeals: Deal[] = [
  {
    id: "atlas-energia-delta",
    name: "Fundo Atlas × Energia Delta",
    sector: "Energia",
    caseValue: 482_000_000,
    potentialTicket: 96_000_000,
    proceduralPhase: "Recurso Especial",
    evidiaScore: 72,
    evidenceRisk: "alto",
    hiddenUpside: 38_000_000,
    recommendation: "reprecificar",
    status: "em_analise",
    owner: "M. Almeida",
    updatedAt: "2026-05-18",
  },
  {
    id: "aurora-norte",
    name: "Construtora Aurora × Consórcio Norte",
    sector: "Infraestrutura",
    caseValue: 318_000_000,
    potentialTicket: 64_000_000,
    proceduralPhase: "Sentença 1ª instância",
    evidiaScore: 58,
    evidenceRisk: "critico",
    hiddenUpside: 22_500_000,
    recommendation: "negociar",
    status: "comite",
    owner: "R. Tavares",
    updatedAt: "2026-05-15",
  },
  {
    id: "xpto-beta",
    name: "Credores XPTO × Grupo Industrial Beta",
    sector: "Recuperação Judicial",
    caseValue: 1_240_000_000,
    potentialTicket: 180_000_000,
    proceduralPhase: "Plano aprovado",
    evidiaScore: 81,
    evidenceRisk: "moderado",
    hiddenUpside: 92_000_000,
    recommendation: "avancar",
    status: "novo",
    owner: "C. Bernardes",
    updatedAt: "2026-05-20",
  },
  {
    id: "orion-sigma",
    name: "Banco Orion × Recuperanda Sigma",
    sector: "Financeiro",
    caseValue: 670_000_000,
    potentialTicket: 120_000_000,
    proceduralPhase: "Habilitação de crédito",
    evidiaScore: 64,
    evidenceRisk: "alto",
    hiddenUpside: 31_000_000,
    recommendation: "reprecificar",
    status: "em_analise",
    owner: "F. Khouri",
    updatedAt: "2026-05-19",
  },
  {
    id: "prisma-valesul",
    name: "Fundo Prisma × Operadora ValeSul",
    sector: "Logística",
    caseValue: 215_000_000,
    potentialTicket: 38_000_000,
    proceduralPhase: "Apelação",
    evidiaScore: 44,
    evidenceRisk: "critico",
    hiddenUpside: 8_000_000,
    recommendation: "rejeitar",
    status: "rejeitado",
    owner: "J. Lima",
    updatedAt: "2026-05-10",
  },
  {
    id: "vega-helios",
    name: "Vega Capital × Helios Mineração",
    sector: "Mineração",
    caseValue: 890_000_000,
    potentialTicket: 145_000_000,
    proceduralPhase: "Acórdão TJ",
    evidiaScore: 76,
    evidenceRisk: "moderado",
    hiddenUpside: 54_000_000,
    recommendation: "avancar",
    status: "comite",
    owner: "P. Setti",
    updatedAt: "2026-05-17",
  },
  {
    id: "norte-zenit",
    name: "Norte Asset × Zenit Telecom",
    sector: "Telecom",
    caseValue: 412_000_000,
    potentialTicket: 78_000_000,
    proceduralPhase: "Liquidação de sentença",
    evidiaScore: 69,
    evidenceRisk: "alto",
    hiddenUpside: 27_000_000,
    recommendation: "negociar",
    status: "em_analise",
    owner: "A. Nunes",
    updatedAt: "2026-05-16",
  },
  {
    id: "delta-petrobeta",
    name: "Delta Litig × Petrobeta Refino",
    sector: "Óleo & Gás",
    caseValue: 1_580_000_000,
    potentialTicket: 240_000_000,
    proceduralPhase: "Pericial técnica",
    evidiaScore: 85,
    evidenceRisk: "baixo",
    hiddenUpside: 132_000_000,
    recommendation: "avancar",
    status: "concluido",
    owner: "M. Almeida",
    updatedAt: "2026-05-13",
  },
];

export const featuredDealId = "atlas-energia-delta";
