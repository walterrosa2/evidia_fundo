import { featuredDealId, mockDeals } from "@/data/mockDeals";
import { formatCurrency } from "@/lib/formatters";

export type PipelineStageData = {
  id: string;
  order: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  status: "input" | "processing" | "analysis" | "decision" | "output";
  metrics: { label: string; value: string }[];
  items: string[];
  result: string;
  destination: string;
  destinationLabel: string;
};

export const pipelineCase = {
  name: "Federação Espírita Brasileira × SAP Brasil",
  process: "1116020-53.2020.8.26.0100",
  court: "TJSP",
  sector: "Tecnologia / ERP",
  claimValue: "R$ 683.369,03",
  pages: "1.594 páginas",
};

const pipelineDeal = mockDeals.find((deal) => deal.id === featuredDealId)!;
const pipelineValuation = {
  economicPotential: formatCurrency(pipelineDeal.economicPotential.valorEconomicoPotencial),
  referencePrice: formatCurrency(pipelineDeal.potentialTicket * (275 / 218)),
  recommendedPrice: formatCurrency(pipelineDeal.potentialTicket),
  conservativeROI:
    pipelineDeal.economicPotential.valorEconomicoPotencial /
    (pipelineDeal.potentialTicket * (165 / 218)),
  baseROI: pipelineDeal.economicPotential.valorEconomicoPotencial / pipelineDeal.potentialTicket,
  aggressiveROI:
    pipelineDeal.economicPotential.valorEconomicoPotencial /
    (pipelineDeal.potentialTicket * (275 / 218)),
};

export const pipelineStages: PipelineStageData[] = [
  {
    id: "entrada",
    order: 1,
    title: "Entrada do ativo litigioso",
    shortDescription: "O fundo seleciona a oportunidade e reúne os documentos disponíveis.",
    fullDescription:
      "A EvidIA recebe processos completos, laudos, documentos complementares e dados estratégicos do deal.",
    status: "input",
    metrics: [{ label: "Volume demonstrativo", value: pipelineCase.pages }],
    items: [
      "Processo judicial",
      "Laudo pericial",
      "Contratos",
      "Petições",
      "Decisões",
      "Provas digitais",
    ],
    result: "Dossiê inicial do ativo",
    destination: "/deals",
    destinationLabel: "Abrir Deal Flow",
  },
  {
    id: "estrutura",
    order: 2,
    title: "Estruturação e rastreabilidade",
    shortDescription: "Cada documento é organizado por página, data, parte, tipo e relevância.",
    fullDescription:
      "OCR, classificação, linha do tempo e mapa de evidências preservam a proveniência de cada informação.",
    status: "processing",
    metrics: [
      { label: "Exemplo", value: "Página 1.460" },
      { label: "Confiança", value: "93%" },
    ],
    items: ["OCR e extração", "Classificação documental", "Linha do tempo", "Mapa de evidências"],
    result: "Base documental pesquisável",
    destination: "/nulidade360/evidencias",
    destinationLabel: "Abrir Evidências",
  },
  {
    id: "inteligencia",
    order: 3,
    title: "Motores de inteligência EvidIA",
    shortDescription: "Prova, metodologia, procedimento e revisão humana analisados em conjunto.",
    fullDescription:
      "Os motores separam fatos, alegações e inferências, identificando lacunas e itens que exigem validação especializada.",
    status: "analysis",
    metrics: [
      { label: "Risco de nulidade", value: "86/100" },
      { label: "Evidências", value: "24 relevantes" },
    ],
    items: ["Nulidade360", "Inteligência probatória", "Análise metodológica", "Revisão humana"],
    result: "Mapa explicável de riscos",
    destination: "/nulidade360",
    destinationLabel: "Abrir Nulidade360",
  },
  {
    id: "red-team",
    order: 4,
    title: "Red Team Jurídico",
    shortDescription: "A tese é testada como se a EvidIA defendesse a parte contrária.",
    fullDescription:
      "A plataforma procura destruir a própria tese antes que o mercado o faça e sugere mitigações.",
    status: "analysis",
    metrics: [
      { label: "Probabilidade simulada", value: "64%" },
      { label: "Severidade", value: "Alta" },
    ],
    items: ["Tese do investidor", "Tese adversária", "Mitigações", "Risco residual"],
    result: "Tese fortalecida ou rejeitada",
    destination: "/red-team",
    destinationLabel: "Abrir Red Team",
  },
  {
    id: "valuation",
    order: 5,
    title: "Valuation probatório",
    shortDescription: "Riscos jurídicos e probatórios são traduzidos em impacto financeiro.",
    fullDescription:
      "A EvidIA conecta risco jurídico, risco probatório, nulidade e alavanca de acordo ao preço recomendado.",
    status: "decision",
    metrics: [
      { label: "Valor econômico potencial", value: pipelineValuation.economicPotential },
      { label: "Preço recomendado", value: pipelineValuation.recommendedPrice },
    ],
    items: [
      `Referência · ${pipelineValuation.referencePrice}`,
      `Conservador · ROI ${pipelineValuation.conservativeROI.toFixed(1).replace(".", ",")}x`,
      `Base · ROI ${pipelineValuation.baseROI.toFixed(1).replace(".", ",")}x`,
      `Agressivo · ROI ${pipelineValuation.aggressiveROI.toFixed(1).replace(".", ",")}x`,
    ],
    result: "Cenários financeiros comparáveis",
    destination: "/valuation",
    destinationLabel: "Abrir Valuation",
  },
  {
    id: "resultado",
    order: 6,
    title: "Decisão apoiada por evidências",
    shortDescription: "O comitê recebe risco, tese, impacto e diligências numa visão consolidada.",
    fullDescription:
      "A recomendação permanece explicável, rastreável e sujeita à decisão do investidor.",
    status: "output",
    metrics: [
      { label: "Recomendação simulada", value: "Reprecificar" },
      { label: "Alavanca de acordo", value: "73/100" },
    ],
    items: ["Investir", "Reprecificar", "Aguardar", "Rejeitar"],
    result: "Investment Memo e relatório executivo",
    destination: "/relatorios/investment-memo",
    destinationLabel: "Abrir Investment Memo",
  },
];

export const intelligenceModules = [
  ["Nulidade360", "Falhas procedimentais e vícios metodológicos", "86/100"],
  ["Inteligência probatória", "Trechos, ausências, contradições e custódia", "24 evidências"],
  ["Análise metodológica", "Adequação, reprodução e suficiência do método", "6 lacunas"],
  ["Revisão humana", "Validação especializada de fatos e inferências", "9 itens"],
] as const;

export const outputs = [
  "Dashboard executivo",
  "Mapa de evidências",
  "Análise Nulidade360",
  "Red Team Jurídico",
  "Valuation probatório",
  "Investment Memo",
  "Relatório executivo",
];

export const governancePillars = [
  ["Proveniência documental", "Cada conclusão ligada à fonte original."],
  ["Fato × alegação", "Naturezas documentais explicitamente separadas."],
  ["Rastreabilidade por página", "Origem verificável em todos os achados."],
  ["Validação humana", "Nenhuma decisão jurídica é automatizada."],
] as const;
