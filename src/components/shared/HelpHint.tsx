export function HelpHint({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex normal-case tracking-normal">
      <button
        type="button"
        aria-label={`Ajuda sobre ${label}`}
        className="grid size-4 place-items-center rounded-full border border-muted-foreground/50 text-[10px] font-semibold text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
