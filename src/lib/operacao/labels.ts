import type {
  ClaimNature,
  DocumentCategory,
  DocumentVersionOut,
  PositionSide,
  ReviewState,
} from "./types";

export const positionLabel: Record<PositionSide, string> = {
  claimant: "Autor",
  defendant: "Réu",
};

export const natureLabel: Record<ClaimNature, string> = {
  documentary_finding: "Constatação documental",
  attributed_allegation: "Alegação atribuída",
  analytical_inference: "Inferência analítica",
  human_conclusion: "Conclusão humana",
};

export const natureHelp: Record<ClaimNature, string> = {
  documentary_finding: "O que o documento registra, verificável na página citada.",
  attributed_allegation: "O que uma parte afirma. Permanece alegação até suporte adequado.",
  analytical_inference: "Conclusão derivada de premissas referenciadas.",
  human_conclusion: "Posição de um revisor, com autoria e histórico.",
};

export const reviewLabel: Record<ReviewState, string> = {
  pending: "Pendente",
  in_review: "Em revisão",
  validated: "Validada",
  discarded: "Descartada",
  contested: "Contestada",
  inconclusive: "Inconclusiva",
};

export const reviewClasses: Record<ReviewState, string> = {
  pending: "border-border bg-surface text-muted-foreground",
  in_review: "border-violet/30 bg-violet/15 text-violet",
  validated: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  discarded: "border-border bg-surface text-muted-foreground line-through",
  contested: "border-risk-high/30 bg-risk-high/15 text-risk-high",
  inconclusive: "border-gold/30 bg-gold/15 text-gold",
};

export const categoryLabel: Record<DocumentCategory, string> = {
  full_record: "Autos integrais",
  piece: "Peça avulsa",
  derived_report: "Relatório derivado",
  metadata: "Metadado",
};

export const versionStateLabel: Record<DocumentVersionOut["state"], string> = {
  stored: "Processado",
  needs_ocr: "Requer OCR",
  password_protected: "Protegido por senha",
};

export const gapStatusLabel = {
  open: "Em aberto",
  received: "Recebida",
  dismissed: "Dispensada",
} as const;

export const originLabel = (system: string): string =>
  system === "fixture-sintetica"
    ? "Fixture sintética"
    : system === "originacao-pipeline"
      ? "Originação"
      : system;

// Espaço não separável entre número e unidade (evita quebra de linha no meio).
const NBSP = String.fromCharCode(160);

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const integer = new Intl.NumberFormat("pt-BR");

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Não informado";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Não informado" : dateTime.format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${integer.format(bytes)}${NBSP}B`;
  if (bytes < 1024 * 1024) return `${integer.format(Math.round(bytes / 1024))}${NBSP}KB`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))}${NBSP}MB`;
}

export function formatPages(start: number | null, end: number | null): string {
  if (start == null) return "Sem página";
  return end != null && end !== start ? `p.${NBSP}${start}–${end}` : `p.${NBSP}${start}`;
}
