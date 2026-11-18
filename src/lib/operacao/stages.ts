/**
 * Etapas da jornada (RF15). O estado de cada etapa vem do servidor; aqui ficam apenas
 * rótulos, a leitura do parâmetro `etapa` e o destino das URLs antigas.
 */
import type { StageStatus } from "./types";

export const STAGE_COUNT = 6;

export const stageStatusLabel: Record<StageStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  partial: "Parcial",
  waiting_document: "Aguardando documento",
  waiting_review: "Aguardando revisão",
  completed: "Concluída",
  stale: "Desatualizada",
  failed: "Falhou",
};

/** Classes do selo por estado. O texto do estado sempre acompanha a cor. */
export const stageStatusTone: Record<StageStatus, string> = {
  not_started: "border-border text-muted-foreground",
  in_progress: "border-primary/40 bg-primary/10 text-primary",
  partial: "border-gold/40 bg-gold/10 text-gold",
  waiting_document: "border-gold/40 bg-gold/10 text-gold",
  waiting_review: "border-gold/40 bg-gold/10 text-gold",
  completed: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  stale: "border-risk-high/30 bg-risk-high/15 text-risk-high",
  failed: "border-risk-critical/40 bg-risk-critical/10 text-risk-critical",
};

/** `etapa` da URL: número de 1 a 6; qualquer outra coisa é a visão completa. */
export function parseStage(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(number) && number >= 1 && number <= STAGE_COUNT ? number : undefined;
}

/**
 * Etapa operacional correspondente a um endereço da demonstração.
 * As telas antigas continuam sendo a demonstração; só há redirecionamento quando o
 * endereço traz uma oportunidade operacional (`?oportunidade=<id>`).
 */
const LEGACY_STAGE: [prefix: string, stage: number][] = [
  ["/deals", 1],
  ["/nulidade360", 3],
  ["/red-team", 4],
  ["/valuation", 5],
  ["/calculo-judicial", 5],
  ["/relatorios", 6],
];

const OPPORTUNITY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function legacyStageTarget(
  pathname: string,
  opportunity: unknown,
): { id: string; etapa: number } | null {
  if (typeof opportunity !== "string" || !OPPORTUNITY_ID.test(opportunity)) return null;
  const match = LEGACY_STAGE.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match ? { id: opportunity, etapa: match[1] } : null;
}
