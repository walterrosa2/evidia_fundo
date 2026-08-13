import { useRef, useState } from "react";
import { Download, PencilRuler, RotateCcw, Upload } from "lucide-react";
import { useDemoEdit } from "@/contexts/useDemoEdit";

export function DemoEditPanel() {
  const { enabled, setEnabled, count, resetAll, exportOverrides, importOverrides } = useDemoEdit();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2600);
  }

  function handleExport() {
    const blob = new Blob([exportOverrides()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evidia-demo-ajustes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`${count} ajuste(s) exportado(s).`);
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      notify(
        importOverrides(text)
          ? "Ajustes importados."
          : "Arquivo inválido: esperado um objeto JSON de pares campo/valor.",
      );
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <PencilRuler className="size-4 text-primary" /> Demonstração
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="demo-edit-toggle" className="text-sm font-medium">
            Modo edição
          </label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Permite ajustar valores e textos diretamente nas telas durante a apresentação. Os
            ajustes ficam neste navegador e não alteram os dados de origem. Com o modo desligado,
            nenhum indício de edição aparece na interface.
          </p>
        </div>
        <button
          id="demo-edit-toggle"
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            enabled ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-background transition-all ${
              enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {count === 0 ? (
            "Nenhum campo ajustado."
          ) : (
            <>
              <b className="text-foreground tabular-nums">{count}</b>{" "}
              {count === 1 ? "campo ajustado" : "campos ajustados"}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={count === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="size-3.5" /> Exportar
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs transition hover:border-primary/40 hover:text-primary"
          >
            <Upload className="size-3.5" /> Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
            aria-label="Importar ajustes de demonstração"
          />
          <button
            type="button"
            onClick={() => {
              resetAll();
              notify("Valores originais restaurados.");
            }}
            disabled={count === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs transition hover:border-risk-high/40 hover:text-risk-high disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" /> Restaurar originais
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
          {message}
        </div>
      )}
    </div>
  );
}
