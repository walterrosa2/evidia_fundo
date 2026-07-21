export type RedTeamAttack = {
  id: string;
  title: string;
  vector: string;
  successProbability: number;
  severity: "moderado" | "alto" | "critico";
  mitigation: string;
};

export const redTeamAttacks: RedTeamAttack[] = [
  {
    id: "rt-001",
    title: "Impugnação total do laudo por quebra de custódia",
    vector: "Argumenta nulidade absoluta com base na ausência de lacre da amostra A-17.",
    successProbability: 68,
    severity: "critico",
    mitigation:
      "Antecipar com contraprova documental do laboratório receptor e parecer técnico assistente.",
  },
  {
    id: "rt-002",
    title: "Pedido de nova perícia por violação ao contraditório",
    vector: "Sustenta que quesitos 4, 7 e 11 não foram respondidos.",
    successProbability: 74,
    severity: "alto",
    mitigation: "Provocar complementação pericial preventiva antes do julgamento.",
  },
  {
    id: "rt-003",
    title: "Arguição de suspeição do perito",
    vector: "Vínculo prévio com laboratório fornecedor.",
    successProbability: 41,
    severity: "moderado",
    mitigation: "Mapear declaração de imparcialidade nos autos e currículo público.",
  },
  {
    id: "rt-004",
    title: "Ataque ao mérito pela adaptação metodológica",
    vector: "Alega afastamento da norma ABNT sem justificativa técnica.",
    successProbability: 58,
    severity: "alto",
    mitigation: "Encomendar parecer técnico defendendo a equivalência metodológica.",
  },
];

export const hiddenVulnerabilities = [
  "Sentença ancorada quase exclusivamente em laudo com fragilidades estruturais.",
  "Anexos B-3, B-4 e B-7 ausentes — risco de cerceamento de defesa.",
  "Inexistência de registro fotográfico na cadeia de custódia.",
];

export const investmentThesisImpact =
  "Os ataques mapeados reduzem em ~22% a probabilidade de êxito sem mitigação. Com as ações recomendadas, o caso retorna à zona de upside qualificado, justificando reprecificação ao invés de rejeição.";
