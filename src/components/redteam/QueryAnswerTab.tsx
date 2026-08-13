import { useMemo, useState } from "react";
import { ChevronDown, MessageSquareQuote, Scale } from "lucide-react";
import {
  TECHNICAL_STATUS_LABEL,
  type TechnicalQuery,
  type TechnicalStatus,
} from "@/data/v2/evidenceDossier";

const STATUS_COLOR: Record<TechnicalStatus, string> = {
  compliant: "var(--risk-low)",
  non_compliant: "var(--risk-critical)",
  partially_compliant: "var(--risk-moderate)",
  inconclusive: "var(--muted-foreground)",
};

export function QueryAnswerTab({ queries }: { queries: TechnicalQuery[] }) {
  const [status, setStatus] = useState<TechnicalStatus | "todos">("todos");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<TechnicalStatus, number>();
    for (const item of queries) map.set(item.status, (map.get(item.status) ?? 0) + 1);
    return map;
  }, [queries]);

  const visible = useMemo(
    () => queries.filter((item) => (status === "todos" ? true : item.status === status)),
    [queries, status],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatus("todos")}
          aria-pressed={status === "todos"}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${
            status === "todos"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos <span className="tabular-nums opacity-70">{queries.length}</span>
        </button>
        {(
          ["non_compliant", "partially_compliant", "compliant", "inconclusive"] as TechnicalStatus[]
        ).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            aria-pressed={status === item}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${
              status === item
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
              style={{ background: STATUS_COLOR[item] }}
            />
            {TECHNICAL_STATUS_LABEL[item]}{" "}
            <span className="tabular-nums opacity-70">{counts.get(item) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {visible.length} de {queries.length} quesitos · resposta simulada da ré
      </div>

      <div className="mt-3 space-y-2">
        {visible.map((query) => {
          const open = openId === query.id;
          const color = STATUS_COLOR[query.status];
          return (
            <article
              key={query.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : query.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/25"
              >
                <span
                  className="mt-1 h-full w-1 shrink-0 self-stretch rounded-full"
                  style={{ background: color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      Bloco {query.block}
                    </span>
                    <span
                      className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ borderColor: `${color}55`, color }}
                    >
                      {TECHNICAL_STATUS_LABEL[query.status]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-snug">{query.question}</p>
                  {!open && query.answer && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {query.answer}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={`mt-1 size-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="border-t border-border">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary">
                      <MessageSquareQuote className="size-3" /> Resposta simulada da ré
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                      {query.answer}
                    </p>
                  </div>

                  {query.rationale && (
                    <div className="border-t border-border bg-surface/50 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Scale className="size-3" /> Fundamentação técnica
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                        {query.rationale}
                      </p>
                    </div>
                  )}

                  {query.notes && (
                    <div className="border-t border-border px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Ressalva do agente
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {query.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
