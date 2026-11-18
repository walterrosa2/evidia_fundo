import { HelpHint } from "@/components/shared/HelpHint";
import { HELP, type HelpTopic } from "@/lib/operacao/help";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, FlaskConical, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/operacao/api";

export const inputClass =
  "mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60";

export const labelClass = "text-xs uppercase tracking-wider text-muted-foreground";

export const primaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

/** Marca persistente de dado sintético (P02): acompanha o registro em toda tela. */
export function SyntheticBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold ${className}`}
      title="Registro criado a partir de fixture sintética; não representa processo real."
    >
      <FlaskConical aria-hidden="true" className="size-3" />
      Dado sintético
    </span>
  );
}

export function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      {label}
    </div>
  );
}

/**
 * Falha operacional: mostra o que ocorreu e o próximo passo. Não há conteúdo
 * substituto — a tela não recorre a dados da demonstração.
 */
export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError?.message ?? "Ocorreu um erro inesperado. Tente novamente.";
  return (
    <div
      role="alert"
      className="rounded-xl border border-risk-critical/40 bg-risk-critical/10 p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-risk-critical" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{message}</p>
          {apiError && (
            <p className="mt-1 break-words text-xs text-muted-foreground" translate="no">
              Código: {apiError.code}
              {apiError.correlationId ? ` · Rastreio: ${apiError.correlationId}` : ""}
            </p>
          )}
          {onRetry && (
            <button type="button" onClick={onRetry} className={`${secondaryButton} mt-3`}>
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Tabela densa: altura limitada à janela, cabeçalho fixo e rolagem horizontal sempre
 * alcançável na base do próprio contêiner, sem precisar chegar ao último registro.
 */
export function TableFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        // `relative`: elementos em posição absoluta (rótulos só para leitor de tela)
        // ficam contidos no recorte da rolagem em vez de alargar a página.
        className="relative max-h-[calc(100vh-240px)] overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[15] [&_thead_th]:bg-surface-elevated"
      >
        {children}
      </div>
    </div>
  );
}

export const thClass =
  "whitespace-nowrap border-b border-border px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
export const tdClass = "px-4 py-3 align-top";

/**
 * Detalhamento em tela inteira (100vw × 100vh) com “← Voltar” no topo.
 * Renderizado em portal no body, acima de qualquer contêiner com overflow.
 */
export function FullscreenDetail({
  title,
  eyebrow,
  onBack,
  children,
}: {
  title: string;
  eyebrow?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    backRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      // Devolve o foco a quem abriu o detalhe sem deslocar a página (AC18).
      previous?.focus?.({ preventScroll: true });
    };
  }, [onBack]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[9000] flex h-screen w-screen flex-col bg-background"
    >
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-surface/60 px-4 py-3 sm:px-6">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </button>
        <div className="min-w-0">
          {eyebrow && (
            <div className="truncate text-[11px] uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </div>
          )}
          <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-6 sm:px-6">
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Ajuda contextual de um tópico da operação (textos em `lib/operacao/help.ts`). */
export function Help({
  topic,
  align,
  side,
}: {
  topic: HelpTopic;
  align?: "left" | "center" | "right";
  side?: "top" | "bottom";
}) {
  const entry = HELP[topic];
  return <HelpHint label={entry.label} text={entry.text} align={align} side={side} />;
}

/** Botão ou controle acompanhado da ajuda do tópico, sem aninhar um botão no outro. */
export function WithHelp({
  topic,
  className = "",
  children,
}: {
  topic: HelpTopic;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      {children}
      <Help topic={topic} />
    </span>
  );
}
