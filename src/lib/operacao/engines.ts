/**
 * Apresentação das execuções de motor. Funções puras: nada aqui decide estado, cobertura
 * ou risco — isso vem pronto do servidor.
 */
import type {
  DocumentOut,
  EngineBlock,
  EngineRunOut,
  EngineRunStatus,
  SupportStrength,
} from "./types";

export const engineStatusLabel: Record<EngineRunStatus, string> = {
  queued: "Na fila",
  running: "Em andamento",
  partial: "Parcial",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

export const engineStatusClasses: Record<EngineRunStatus, string> = {
  queued: "border-border text-muted-foreground",
  running: "border-primary/40 bg-primary/10 text-primary",
  partial: "border-risk-high/30 bg-risk-high/15 text-risk-high",
  completed: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  failed: "border-risk-critical/40 bg-risk-critical/15 text-risk-critical",
  cancelled: "border-border text-muted-foreground",
};

export const supportLabel: Record<SupportStrength, string> = {
  strong: "Forte",
  moderate: "Moderada",
  weak: "Fraca",
  not_assessed: "Não avaliada",
};

export const isRunActive = (run: Pick<EngineRunOut, "status">): boolean =>
  run.status === "queued" || run.status === "running";

export function blockSummary(blocks: EngineBlock[]): {
  total: number;
  completed: number;
  incomplete: number;
} {
  const completed = blocks.filter((block) => block.status === "completed").length;
  return { total: blocks.length, completed, incomplete: blocks.length - completed };
}

const TEXT_EXTENSIONS = [".txt", ".md"];

export type SimulableVersion = { id: string; label: string };

/**
 * Versões que o modo simulado pode receber: vigentes, processadas e em texto. O servidor
 * confere de novo; esta lista só evita oferecer o que seria recusado.
 */
/** Planilhas vigentes do dossiê que podem ser entregues ao motor como mapa de evidências. */
export function spreadsheetVersions(documents: DocumentOut[]): SimulableVersion[] {
  return documents.flatMap((document) =>
    document.versions
      .filter((version) => version.is_current && version.filename.toLowerCase().endsWith(".xlsx"))
      .map((version) => ({
        id: version.id,
        label: `${document.title} · v${version.version_no} · ${version.filename}`,
      })),
  );
}

export function simulableVersions(documents: DocumentOut[]): SimulableVersion[] {
  return documents.flatMap((document) =>
    document.versions
      .filter(
        (version) =>
          version.is_current &&
          version.state === "stored" &&
          TEXT_EXTENSIONS.some((ext) => version.filename.toLowerCase().endsWith(ext)),
      )
      .map((version) => ({
        id: version.id,
        label: `${document.title} · v${version.version_no} · ${version.filename}`,
      })),
  );
}

export type CitableVersion = { id: string; label: string; pageCount: number | null };

/** Versões vigentes do dossiê, que um revisor pode citar como origem de um achado. */
export function citableVersions(documents: DocumentOut[]): CitableVersion[] {
  return documents.flatMap((document) =>
    document.versions
      .filter((version) => version.is_current)
      .map((version) => ({
        id: version.id,
        label: `${document.title} · v${version.version_no}${
          version.page_count != null ? ` · ${version.page_count} p.` : ""
        }`,
        pageCount: version.page_count,
      })),
  );
}

/** Bloqueios de validação que não são pendências de evidência do próprio achado. */
export function extraBlockers<T extends { code: string; message: string }>(
  blockers: T[],
  pendencies: { code: string; message: string }[],
): T[] {
  return blockers.filter(
    (blocker) => !pendencies.some((p) => p.code === blocker.code && p.message === blocker.message),
  );
}
