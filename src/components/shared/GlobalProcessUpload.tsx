import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Upload, X } from "lucide-react";

export function GlobalProcessUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function closeDialog() {
    setOpen(false);
    setSubmitted(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_36px_rgba(0,210,220,0.24)] transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Upload className="size-4" />
        <span className="hidden sm:inline">Upload do processo</span>
        <span className="sm:hidden">Upload</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-process-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="upload-process-title" className="text-xl font-semibold">
                  Upload do processo
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Envie os autos em PDF para iniciar a organização e a análise EvidIA.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar upload"
                onClick={closeDialog}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {submitted ? (
              <div className="mt-6 rounded-xl border border-risk-low/30 bg-risk-low/10 p-5 text-center">
                <CheckCircle2 className="mx-auto size-8 text-risk-low" />
                <div className="mt-3 font-semibold">Processo recebido</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  O arquivo entrou na fila de estruturação e rastreabilidade.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-6 flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary/5 p-6 text-center transition hover:border-primary hover:bg-primary/10"
                >
                  <FileUp className="size-8 text-primary" />
                  <span className="mt-3 text-sm font-medium">
                    {file ? file.name : "Selecionar arquivo PDF"}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">PDF de até 50 MB</span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={!file}
                  onClick={() => setSubmitted(true)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enviar e iniciar análise
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
