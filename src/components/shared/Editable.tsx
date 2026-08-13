import { useEffect, useRef, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { useDemoEdit } from "@/contexts/useDemoEdit";
import { formatCurrency } from "@/lib/formatters";

type BaseProps = {
  /** Chave do override, no formato `<caso>.<campo>`. */
  overrideKey: string;
  /** Rótulo usado nos textos de acessibilidade. */
  label: string;
  className?: string;
};

/**
 * Valor numérico editável em modo demonstração.
 * Com o modo desligado, renderiza apenas o texto formatado — sem borda, cursor ou ícone.
 */
export function EditableValue({
  overrideKey,
  label,
  value,
  format = "currency",
  className,
}: BaseProps & {
  value: number;
  format?: "currency" | "compact" | "number" | "percent" | "score";
}) {
  const { enabled, resolve, setOverride, clearOverride, overrides } = useDemoEdit();
  const raw = resolve(overrideKey, String(value));
  const parsed = Number(raw);
  const effective = Number.isFinite(parsed) ? parsed : value;
  const isOverridden = overrideKey in overrides;

  const render = (n: number) => {
    switch (format) {
      case "compact":
        return formatCurrency(n, { compact: true });
      case "number":
        return n.toLocaleString("pt-BR");
      case "percent":
        return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
      case "score":
        return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      default:
        return formatCurrency(n);
    }
  };

  if (!enabled) return <span className={className}>{render(effective)}</span>;

  return (
    <InlineEditor
      label={label}
      display={render(effective)}
      initial={String(effective)}
      inputMode="decimal"
      isOverridden={isOverridden}
      onSave={(next) => {
        const parsedNext = Number(next.replace(",", "."));
        if (Number.isFinite(parsedNext)) setOverride(overrideKey, String(parsedNext));
      }}
      onReset={() => clearOverride(overrideKey)}
      className={className}
    />
  );
}

/** Texto editável em modo demonstração. */
export function EditableText({
  overrideKey,
  label,
  value,
  multiline = false,
  className,
}: BaseProps & { value: string; multiline?: boolean }) {
  const { enabled, resolve, setOverride, clearOverride, overrides } = useDemoEdit();
  const effective = resolve(overrideKey, value);
  const isOverridden = overrideKey in overrides;

  if (!enabled) return <span className={className}>{effective}</span>;

  return (
    <InlineEditor
      label={label}
      display={effective}
      initial={effective}
      multiline={multiline}
      isOverridden={isOverridden}
      onSave={(next) => setOverride(overrideKey, next)}
      onReset={() => clearOverride(overrideKey)}
      className={className}
    />
  );
}

function InlineEditor({
  label,
  display,
  initial,
  multiline,
  inputMode,
  isOverridden,
  onSave,
  onReset,
  className,
}: {
  label: string;
  display: string;
  initial: string;
  multiline?: boolean;
  inputMode?: "decimal" | "text";
  isOverridden: boolean;
  onSave: (value: string) => void;
  onReset: () => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(initial);
  }, [initial, editing]);

  function commit() {
    onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex w-full items-start gap-1.5 align-middle">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            rows={5}
            aria-label={`Editar ${label}`}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
            }}
            className="w-full rounded-md border border-primary/50 bg-surface p-2 text-sm outline-none"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            inputMode={inputMode}
            aria-label={`Editar ${label}`}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
            className="w-full min-w-0 rounded-md border border-primary/50 bg-surface px-2 py-1 text-sm outline-none"
          />
        )}
        <button
          type="button"
          onClick={commit}
          aria-label={`Salvar ${label}`}
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded text-risk-low hover:bg-secondary"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label={`Cancelar edição de ${label}`}
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-secondary"
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className={`group/edit inline-flex items-center gap-1 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Editar ${label}`}
        className={`inline-flex items-center gap-1 rounded px-1 -mx-1 text-left transition hover:bg-primary/10 ${
          isOverridden ? "underline decoration-primary decoration-dotted underline-offset-4" : ""
        }`}
      >
        {display}
        <Pencil className="size-3 shrink-0 text-primary opacity-0 transition group-hover/edit:opacity-100" />
      </button>
      {isOverridden && (
        <button
          type="button"
          onClick={onReset}
          aria-label={`Restaurar ${label}`}
          title="Restaurar valor original"
          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition hover:text-foreground group-hover/edit:opacity-100"
        >
          <RotateCcw className="size-3" />
        </button>
      )}
    </span>
  );
}
