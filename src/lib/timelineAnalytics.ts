/**
 * Métricas derivadas da cronologia processual.
 *
 * Traduzem a timeline em indicadores que o analista usa para dimensionar duration, custo de
 * carrego e risco de alongamento: tempo total, tempo desde o último ato, maior intervalo sem
 * movimentação e distribuição da iniciativa entre as partes.
 */

import type { ProceduralActType, ProceduralActor, TimelineEvent } from "@/data/v2";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.2425;

export const ACT_TYPE_LABEL: Record<ProceduralActType, string> = {
  distribuicao: "Distribuição",
  citacao: "Citação",
  contestacao: "Contestação",
  replica: "Réplica",
  saneamento: "Saneamento",
  pericia_nomeacao: "Nomeação do perito",
  pericia_quesitos: "Quesitos",
  pericia_diligencia: "Diligência pericial",
  pericia_laudo: "Laudo pericial",
  pericia_impugnacao: "Impugnação ao laudo",
  pericia_esclarecimento: "Esclarecimentos",
  audiencia: "Audiência",
  despacho: "Despacho",
  decisao: "Decisão",
  sentenca: "Sentença",
  recurso: "Recurso",
  acordao: "Acórdão",
  peticao: "Petição",
  extrajudicial: "Fato extrajudicial",
  contrato: "Instrumento contratual",
  analise_evidia: "Análise EvidIA",
};

export const ACTOR_LABEL: Record<ProceduralActor, string> = {
  juizo: "Juízo",
  autora: "Autora",
  re: "Ré",
  perito: "Perito",
  assistente: "Assistente técnico",
  terceiro: "Terceiro",
  evidia: "EvidIA",
};

/** Agrupa tipos de ato em famílias, para cor e filtro. */
export const ACT_FAMILY: Record<
  ProceduralActType,
  "postulatoria" | "pericial" | "decisoria" | "contexto"
> = {
  distribuicao: "postulatoria",
  citacao: "postulatoria",
  contestacao: "postulatoria",
  replica: "postulatoria",
  peticao: "postulatoria",
  saneamento: "decisoria",
  despacho: "decisoria",
  decisao: "decisoria",
  sentenca: "decisoria",
  recurso: "decisoria",
  acordao: "decisoria",
  audiencia: "decisoria",
  pericia_nomeacao: "pericial",
  pericia_quesitos: "pericial",
  pericia_diligencia: "pericial",
  pericia_laudo: "pericial",
  pericia_impugnacao: "pericial",
  pericia_esclarecimento: "pericial",
  extrajudicial: "contexto",
  contrato: "contexto",
  analise_evidia: "contexto",
};

export const FAMILY_COLOR: Record<"postulatoria" | "pericial" | "decisoria" | "contexto", string> =
  {
    postulatoria: "var(--cyan)",
    pericial: "var(--violet)",
    decisoria: "var(--gold)",
    contexto: "var(--muted-foreground)",
  };

export type TimelineGap = {
  from: string;
  to: string;
  days: number;
  afterTitle: string;
};

export type TimelineMetrics = {
  /** Total de eventos na cronologia. */
  total: number;
  /** Eventos classificados como marco. */
  milestones: number;
  /** Anos decorridos entre a distribuição e o último ato. */
  durationYears: number | null;
  /** Dias desde o último ato registrado. */
  daysSinceLastAct: number | null;
  /** Data do primeiro ato judicial (distribuição). */
  filingDate: string | null;
  /** Data do último ato. */
  lastActDate: string | null;
  /** Maior intervalo sem movimentação. */
  longestGap: TimelineGap | null;
  /** Quantidade de atos por ator. */
  byActor: Array<{ actor: ProceduralActor; count: number }>;
  /** Quantidade de atos periciais. */
  expertActs: number;
};

function toDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

export function calculateTimelineMetrics(
  events: TimelineEvent[],
  /** Data de distribuição declarada no caso. Evita contar ações conexas anteriores. */
  declaredFilingDate?: string,
  referenceDate = new Date(),
): TimelineMetrics {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return {
      total: 0,
      milestones: 0,
      durationYears: null,
      daysSinceLastAct: null,
      filingDate: null,
      lastActDate: null,
      longestGap: null,
      byActor: [],
      expertActs: 0,
    };
  }

  // A duration conta da distribuição desta ação — não de fatos extrajudiciais anteriores nem de
  // ações conexas ajuizadas antes, que também aparecem na cronologia como contexto.
  const filing =
    (declaredFilingDate ? sorted.find((event) => event.date === declaredFilingDate) : undefined) ??
    sorted.find((event) => event.actType === "distribuicao") ??
    sorted[0];
  const last = sorted[sorted.length - 1];

  const durationYears =
    (toDate(last.date).getTime() - toDate(filing.date).getTime()) / (MS_PER_DAY * DAYS_PER_YEAR);
  const daysSinceLastAct = Math.floor(
    (referenceDate.getTime() - toDate(last.date).getTime()) / MS_PER_DAY,
  );

  let longestGap: TimelineGap | null = null;
  const judicial = sorted.filter((event) => event.date >= filing.date);
  for (let i = 1; i < judicial.length; i += 1) {
    const days = Math.floor(
      (toDate(judicial[i].date).getTime() - toDate(judicial[i - 1].date).getTime()) / MS_PER_DAY,
    );
    if (!longestGap || days > longestGap.days) {
      longestGap = {
        from: judicial[i - 1].date,
        to: judicial[i].date,
        days,
        afterTitle: judicial[i - 1].title,
      };
    }
  }

  const actorCount = new Map<ProceduralActor, number>();
  for (const event of sorted) {
    if (!event.actor) continue;
    actorCount.set(event.actor, (actorCount.get(event.actor) ?? 0) + 1);
  }

  return {
    total: sorted.length,
    milestones: sorted.filter((event) => event.relevance === "marco").length,
    durationYears,
    daysSinceLastAct,
    filingDate: filing.date,
    lastActDate: last.date,
    longestGap,
    byActor: [...actorCount.entries()]
      .map(([actor, count]) => ({ actor, count }))
      .sort((a, b) => b.count - a.count),
    expertActs: sorted.filter((event) => ACT_FAMILY[event.actType ?? "peticao"] === "pericial")
      .length,
  };
}
