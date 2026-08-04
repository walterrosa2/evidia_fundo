import { useEffect, useState } from "react";
import { ExternalLink, FileText, Maximize2, Upload, X } from "lucide-react";
import { HelpHint } from "@/components/shared/HelpHint";

type ViewerDocument = { name: string; url?: string; local?: boolean };

export function CaseDocumentViewer({
  sourceFiles,
  pages,
}: {
  sourceFiles: string[];
  pages: number;
}) {
  const initialName = sourceFiles[0]?.replace(/\.txt$/i, ".pdf") ?? "Autos do processo.pdf";
  const [document, setDocument] = useState<ViewerDocument>({ name: initialName });
  const [open, setOpen] = useState(false);

  useEffect(
    () => () => {
      if (document.local && document.url) URL.revokeObjectURL(document.url);
    },
    [document],
  );

  function selectPdf(file?: File) {
    if (!file) return;
    setDocument((current) => {
      if (current.local && current.url) URL.revokeObjectURL(current.url);
      return { name: file.name, url: URL.createObjectURL(file), local: true };
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Documentos do processo
          <HelpHint
            label="documentos do processo"
            text="Abra os autos sem sair da plataforma. PDFs adicionados localmente são exibidos pelo visualizador seguro do navegador."
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium transition hover:border-primary hover:text-primary">
          <Upload className="size-3.5" /> Adicionar PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(event) => selectPdf(event.target.files?.[0])}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-risk-critical/10 text-risk-critical">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{document.name}</div>
          <div className="text-xs text-muted-foreground">
            PDF · {pages.toLocaleString("pt-BR")} páginas indexadas
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Maximize2 className="size-3.5" /> <span className="hidden sm:inline">Visualizar</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização de ${document.name}`}
        >
          <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{document.name}</div>
              <div className="text-xs text-muted-foreground">
                Visualizador interno de documentos
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar documento"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </header>
          {document.url ? (
            <iframe title={document.name} src={document.url} className="min-h-0 flex-1 bg-white" />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
              <div className="w-full max-w-3xl rounded-sm bg-white p-10 text-slate-900 shadow-2xl sm:p-16">
                <div className="text-center text-xs uppercase tracking-[0.2em] text-slate-500">
                  Autos digitais consolidados
                </div>
                <h2 className="mt-8 text-center text-xl font-bold">Relatório processual EvidIA</h2>
                <p className="mt-8 text-sm leading-7">
                  Documento indexado para consulta interna. O conteúdo integral permanece vinculado
                  à fonte processual e pode ser substituído por um PDF real no botão “Adicionar
                  PDF”.
                </p>
                <div className="mt-8 rounded border border-slate-200 p-4 text-sm">
                  <strong>Páginas analisadas:</strong> {pages.toLocaleString("pt-BR")}
                  <br />
                  <strong>Status:</strong> indexado e disponível para análise
                </div>
                <div className="mt-10 flex items-center gap-2 text-xs text-slate-500">
                  <ExternalLink className="size-3.5" /> Prévia demonstrativa do arquivo-fonte
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
