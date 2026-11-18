/** Apresentação do contraditório. Funções puras: estados e contagens vêm do servidor. */
import type { ScenarioSideView, SideStatus } from "./types";

export const sideStatusLabel: Record<SideStatus, string> = {
  not_analyzed: "Não analisado",
  running: "Em elaboração",
  partial: "Parcial",
  completed: "Concluído",
  failed: "Falhou",
  stale: "Desatualizado",
};

export const sideStatusClasses: Record<SideStatus, string> = {
  not_analyzed: "border-border text-muted-foreground",
  running: "border-primary/40 bg-primary/10 text-primary",
  partial: "border-risk-high/30 bg-risk-high/15 text-risk-high",
  completed: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  failed: "border-risk-critical/40 bg-risk-critical/15 text-risk-critical",
  stale: "border-gold/40 bg-gold/15 text-gold",
};

export const confidenceLabel = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
  not_assessed: "Não avaliado",
} as const;

/**
 * Resumo de um lado. Lado não analisado nunca recebe número: a ausência de argumentos não
 * é êxito nem risco zero.
 */
export function sideSummary(
  view: Pick<ScenarioSideView, "status" | "arguments_count" | "hypotheses_count">,
): string {
  if (view.status === "not_analyzed" || view.arguments_count == null) {
    return "Sem cenário analisado";
  }
  const total = view.arguments_count === 1 ? "1 argumento" : `${view.arguments_count} argumentos`;
  const hypotheses = view.hypotheses_count ?? 0;
  if (hypotheses === 0) return `${total}, todos com evidência no dossiê`;
  return `${total}, ${hypotheses} ainda como hipótese a validar`;
}
