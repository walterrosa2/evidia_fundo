import { describe, expect, it } from "vitest";
import { jobLabel, pagesCoverage, suggestionKey } from "./documents";

describe("cobertura de texto do documento", () => {
  const pages = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ page_no: i + 1, source: "native", char_count: 10 }));

  it("conta as páginas sem texto de um PDF", () => {
    expect(pagesCoverage({ page_count: 5, pages_with_text: pages(3) })).toEqual({
      withText: 3,
      total: 5,
      missing: 2,
    });
    expect(pagesCoverage({ page_count: 2, pages_with_text: pages(2) }).missing).toBe(0);
  });

  it("não afirma que falta texto quando o formato não tem paginação conhecida", () => {
    // Imagem ainda sem OCR: não se sabe quantas páginas faltam.
    expect(pagesCoverage({ page_count: null, pages_with_text: [] })).toEqual({
      withText: 0,
      total: null,
      missing: null,
    });
    expect(pagesCoverage({ page_count: null, pages_with_text: pages(1) }).missing).toBe(0);
  });
});

describe("rótulos", () => {
  it("diferencia trabalho na fila de trabalho em andamento", () => {
    expect(jobLabel({ kind: "ocr", status: "queued" })).toBe("OCR na fila");
    expect(jobLabel({ kind: "extract_text", status: "running" })).toBe(
      "Extração de texto em andamento",
    );
  });

  it("identifica a sugestão por página, natureza e texto", () => {
    const base = {
      text: "A autora alegou atraso.",
      nature: "attributed_allegation" as const,
      asserted_by: "",
      page_no: 2,
      excerpt: "x",
      confidence: 0.4,
      method: "rules" as const,
    };
    expect(suggestionKey(base)).toBe(suggestionKey({ ...base, confidence: 0.9 }));
    expect(suggestionKey(base)).not.toBe(suggestionKey({ ...base, page_no: 3 }));
  });
});
