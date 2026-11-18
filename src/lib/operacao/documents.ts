/** Apresentação de texto, OCR e sugestões de um documento. Funções puras. */
import type { ClaimSuggestionOut, DocumentTextOut, JobOut } from "./types";

export const textSourceLabel: Record<string, string> = {
  none: "Sem texto",
  native: "Texto do próprio PDF",
  text: "Arquivo de texto",
  ocr: "OCR (leitura aproximada)",
  mixed: "PDF e OCR",
};

const JOB_KIND: Record<string, string> = {
  ocr: "OCR",
  extract_text: "Extração de texto",
};

export function jobLabel(job: Pick<JobOut, "kind" | "status">): string {
  const kind = JOB_KIND[job.kind] ?? job.kind;
  return job.status === "queued" ? `${kind} na fila` : `${kind} em andamento`;
}

/**
 * Quantas páginas têm texto. `missing` é nulo quando o formato não tem paginação conhecida:
 * nesse caso não se afirma que falta nem que não falta.
 */
export function pagesCoverage(data: Pick<DocumentTextOut, "page_count" | "pages_with_text">): {
  withText: number;
  total: number | null;
  missing: number | null;
} {
  const withText = data.pages_with_text.length;
  if (data.page_count == null) {
    return { withText, total: null, missing: withText === 0 ? null : 0 };
  }
  return { withText, total: data.page_count, missing: Math.max(0, data.page_count - withText) };
}

export const suggestionKey = (item: ClaimSuggestionOut): string =>
  `${item.page_no}|${item.nature}|${item.text}`;
