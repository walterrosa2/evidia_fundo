/**
 * Apresentação da diligência de vínculos. Funções puras: a janela, os cruzamentos e os
 * impedimentos vêm prontos do servidor; aqui só há rótulos e redação.
 */
import type {
  IdentifierType,
  OccurrenceKind,
  OccurrenceState,
  ParticipantRole,
  RecurrenceOut,
  Relation,
  RoleSide,
  SearchOut,
} from "./types";

export const roleLabel: Record<ParticipantRole, string> = {
  court_expert: "Perito do juízo",
  party_assistant: "Assistente técnico",
  lawyer: "Advogado",
  judge: "Magistrado",
  party: "Parte",
  other: "Outro",
};

export const sideLabel: Record<RoleSide, string> = {
  claimant: "Autor",
  defendant: "Réu",
  court: "Juízo",
  none: "Não se aplica",
};

export const identifierLabel: Record<IdentifierType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  oab: "OAB",
  crea: "CREA",
  professional_registry: "Registro profissional",
  source_id: "Identificador na fonte",
  other: "Outro",
};

export const relationLabel: Record<Relation, string> = {
  expert_lawyer: "Profissional e advogado",
  expert_party: "Profissional e parte",
  expert_judge: "Profissional e magistrado",
  expert_attribution: "Profissional e atribuição",
  expert_disciplinary: "Profissional e procedimento disciplinar",
};

export const occurrenceKindLabel: Record<OccurrenceKind, string> = {
  cooccurrence: "Coocorrência em processo",
  qualification: "Qualificação profissional",
  disciplinary: "Procedimento disciplinar",
  social: "Material de rede social",
  other: "Outra",
};

export const occurrenceStateLabel: Record<OccurrenceState, string> = {
  candidate: "Candidata",
  identity_pending: "Identidade pendente",
  identity_confirmed: "Identidade confirmada",
  evidence_collected: "Evidência coletada",
  in_review: "Em revisão",
  validated: "Validada",
  discarded: "Descartada",
  inconclusive: "Inconclusiva",
  contested: "Contestada",
  forwarded_legal: "Encaminhada à avaliação jurídica",
};

export const occurrenceStateClasses: Record<OccurrenceState, string> = {
  candidate: "border-border text-muted-foreground",
  identity_pending: "border-risk-high/30 bg-risk-high/15 text-risk-high",
  identity_confirmed: "border-primary/40 bg-primary/10 text-primary",
  evidence_collected: "border-primary/40 bg-primary/10 text-primary",
  in_review: "border-primary/40 bg-primary/10 text-primary",
  validated: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  discarded: "border-border text-muted-foreground",
  inconclusive: "border-gold/40 bg-gold/15 text-gold",
  contested: "border-risk-high/30 bg-risk-high/15 text-risk-high",
  forwarded_legal: "border-risk-low/30 bg-risk-low/15 text-risk-low",
};

export const timingLabel = {
  in_window: "Dentro da janela",
  out_of_window: "Fora da janela",
  undated: "Sem data",
} as const;

export const proceedingLabel: Record<string, string> = {
  ongoing: "Em andamento",
  archived: "Arquivado",
  acquitted: "Absolvição",
  sanction_in_force: "Sanção vigente",
  sanction_served: "Sanção já cumprida",
};

export const qualificationLabel = {
  covered: "Registro cobria a data do fato",
  not_covered: "Registro não cobria a data do fato",
  unknown: "Não é possível afirmar: início de vigência do registro desconhecido",
} as const;

const dayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

/** Data sem hora (AAAA-MM-DD) no formato brasileiro, sem deslocamento de fuso. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "Sem data";
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? iso : dayFormat.format(parsed);
}

/**
 * Redação neutra da recorrência: contagem e base. Sem base consultada, só a contagem — a
 * tela nunca qualifica a frequência.
 */
export function recurrenceText(item: Pick<RecurrenceOut, "count" | "universe">): string {
  const processes = item.count === 1 ? "1 processo" : `${item.count} processos`;
  if (item.universe == null) return `${processes} na janela; sem base para avaliar frequência`;
  const base =
    item.universe === 1 ? "1 processo consultado" : `${item.universe} processos consultados`;
  return `${processes} de ${base} com atuação datada na janela`;
}

export function searchStatusText(search: Pick<SearchOut, "status" | "results_count">): string {
  if (search.status === "failed") return "Não foi possível consultar";
  if (search.status === "no_results") return "Consulta feita, nada encontrado nesta cobertura";
  return search.results_count === 1 ? "1 registro" : `${search.results_count} registros`;
}
