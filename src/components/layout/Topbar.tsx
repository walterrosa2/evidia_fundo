import { Bell, Search, ChevronDown } from "lucide-react";

export function Topbar({ context }: { context?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-6 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border border-border bg-surface px-2 py-1 font-medium text-foreground">
          Fundo Atlas
        </span>
        {context && (
          <>
            <span className="opacity-50">/</span>
            <span>{context}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm w-72">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="Buscar caso, deal ou achado..."
            className="bg-transparent outline-none placeholder:text-muted-foreground/70 w-full"
          />
          <kbd className="hidden lg:inline text-[10px] text-muted-foreground border border-border rounded px-1">
            ⌘K
          </kbd>
        </div>
        <button className="relative grid size-9 place-items-center rounded-md border border-border bg-surface hover:bg-secondary transition">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-risk-critical" />
        </button>
        <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 hover:bg-secondary transition">
          <div className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-violet to-cyan text-[11px] font-semibold text-background">
            MA
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-sm font-medium">M. Almeida</div>
            <div className="text-[10px] text-muted-foreground">Sócio · Atlas</div>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
