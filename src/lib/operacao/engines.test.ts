import { describe, expect, it } from "vitest";
import { blockSummary, isRunActive, simulableVersions } from "./engines";
import type { DocumentOut, DocumentVersionOut, EngineBlock } from "./types";

const version = (extra: Partial<DocumentVersionOut>): DocumentVersionOut => ({
  id: "v",
  document_id: "d",
  version_no: 1,
  sha256: "0".repeat(64),
  filename: "laudo.txt",
  media_type: "text/plain",
  size_bytes: 10,
  page_count: null,
  state: "stored",
  origin: "upload",
  obtained_at: "2026-11-17T12:00:00Z",
  uploaded_by: "u",
  is_current: true,
  text_source: "text",
  text_pages: 1,
  ...extra,
});

const document = (title: string, versions: DocumentVersionOut[]): DocumentOut => ({
  id: title,
  title,
  doc_type: "laudo_pericial",
  category: "piece",
  current_version_no: 1,
  created_at: "2026-11-17T12:00:00Z",
  versions,
});

describe("documentos que o modo simulado pode receber", () => {
  it("oferece só versões vigentes, processadas e em texto", () => {
    const options = simulableVersions([
      document("Laudo", [
        version({ id: "antiga", is_current: false }),
        version({ id: "vigente", version_no: 2, filename: "Laudo-V2.TXT" }),
      ]),
      document("Notas", [version({ id: "md", filename: "notas.md" })]),
      // PDF exigiria a análise paga; protegido por senha não foi processado.
      document("Inicial", [version({ id: "pdf", filename: "inicial.pdf" })]),
      document("Fechado", [version({ id: "senha", state: "password_protected" })]),
    ]);
    expect(options.map((option) => option.id)).toEqual(["vigente", "md"]);
    expect(options[0].label).toBe("Laudo · v2 · Laudo-V2.TXT");
  });
});

describe("resumo da execução", () => {
  const block = (key: string, status: EngineBlock["status"]): EngineBlock => ({
    key,
    label: key,
    status,
    message: "",
  });

  it("conta bloco falho e pulado como não concluído", () => {
    expect(
      blockSummary([block("P1", "completed"), block("P2", "failed"), block("P3", "skipped")]),
    ).toEqual({ total: 3, completed: 1, incomplete: 2 });
    expect(blockSummary([])).toEqual({ total: 0, completed: 0, incomplete: 0 });
  });

  it("só fila e andamento pedem acompanhamento", () => {
    expect(isRunActive({ status: "queued" })).toBe(true);
    expect(isRunActive({ status: "running" })).toBe(true);
    for (const status of ["partial", "completed", "failed", "cancelled"] as const) {
      expect(isRunActive({ status })).toBe(false);
    }
  });
});

describe("revisão de achado", () => {
  it("lista como origem citável só as versões vigentes, de qualquer formato", async () => {
    const { citableVersions } = await import("./engines");
    const options = citableVersions([
      document("Inicial", [
        version({ id: "antiga", is_current: false }),
        version({ id: "pdf", version_no: 2, filename: "inicial.pdf", page_count: 12 }),
      ]),
      document("Laudo", [version({ id: "txt" })]),
    ]);
    expect(options).toEqual([
      { id: "pdf", label: "Inicial · v2 · 12 p.", pageCount: 12 },
      { id: "txt", label: "Laudo · v1", pageCount: null },
    ]);
  });

  it("separa impedimentos da execução das pendências de evidência do achado", async () => {
    const { extraBlockers } = await import("./engines");
    const pending = { code: "evidence_pending", message: "Sem citação." };
    const mock = { code: "mock_run", message: "Modo simulado." };
    expect(extraBlockers([pending, mock], [pending])).toEqual([mock]);
    expect(extraBlockers([pending], [pending])).toEqual([]);
  });
});
