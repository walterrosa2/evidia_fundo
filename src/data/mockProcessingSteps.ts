import { febSapCase } from "@/data/v2";

export type ProcessingStep = {
  id: string;
  label: string;
  detail: string;
};

const blocks = febSapCase.auditBlocks;

export const processingSteps: ProcessingStep[] = [
  {
    id: "upload",
    label: "Documentos recebidos",
    detail: `${febSapCase.sourceFiles[0] ?? "Autos digitais"} — ${febSapCase.pagesAnalyzed} páginas`,
  },
  { id: "extract", label: "Texto extraído", detail: "OCR híbrido com correção semântica" },
  {
    id: "pages",
    label: "Páginas identificadas e indexadas",
    detail: `${febSapCase.pagesAnalyzed} páginas, ${febSapCase.evidences.length} trechos de referência`,
  },
  {
    id: "checklist",
    label: "Checklist Nulidade360 carregado",
    detail: `${blocks.length} blocos, ${febSapCase.findings.length} perguntas auditadas`,
  },
  ...blocks.map((b, i) => ({
    id: `block-${i + 1}`,
    label: `${b.name} analisado`,
    detail: `Bloco B${i + 1} — ${b.findingIds.length} achados`,
  })),
  { id: "consolidate", label: "Consolidação de riscos", detail: "Score executivo computado" },
  {
    id: "summary",
    label: "Resultado executivo gerado",
    detail: "Recomendação: Revisão humana obrigatória",
  },
  { id: "report", label: "Relatório montado", detail: "Investment Memo pronto" },
];
