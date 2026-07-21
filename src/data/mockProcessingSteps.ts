export type ProcessingStep = {
  id: string;
  label: string;
  detail: string;
};

export const processingSteps: ProcessingStep[] = [
  { id: "upload", label: "Upload recebido", detail: "Laudo pericial v3.2 — 412 páginas" },
  { id: "extract", label: "Texto extraído", detail: "OCR híbrido com correção semântica" },
  { id: "pages", label: "Páginas identificadas e indexadas", detail: "412 páginas, 38 anexos" },
  { id: "checklist", label: "Checklist Nulidade360 carregado", detail: "6 blocos, 142 perguntas" },
  { id: "b1", label: "Cadeia de custódia analisada", detail: "Bloco B1 — 7 achados" },
  { id: "b2", label: "Metodologia em análise", detail: "Bloco B2 — 5 achados" },
  { id: "b3", label: "Documentação analisada", detail: "Bloco B3 — 4 achados" },
  { id: "b4", label: "Contraditório analisado", detail: "Bloco B4 — 6 achados" },
  { id: "consolidate", label: "Consolidação de riscos", detail: "Score executivo computado" },
  { id: "summary", label: "Resultado executivo gerado", detail: "Recomendação: Reprecificar" },
  { id: "report", label: "Relatório montado", detail: "Investment Memo pronto" },
];
