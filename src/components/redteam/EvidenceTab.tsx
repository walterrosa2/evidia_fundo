import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import {
  EVIDENCE_CATEGORY_LABEL,
  type CollectedEvidence,
  type EvidenceCategory,
} from "@/data/v2/evidenceDossier";

const CATEGORY_COLOR: Record<EvidenceCategory, string> = {
  contracts: "var(--cyan)",
  payments: "var(--risk-low)",
  penalties: "var(--risk-high)",
  service_orders: "var(--violet)",
  internal_hours: "var(--gold)",
  losses: "var(--risk-critical)",
  travel_expenses: "var(--muted-foreground)",
};

export function EvidenceTab({ evidences }: { evidences: CollectedEvidence[] }) {
  const [category, setCategory] = useState<EvidenceCategory | "todas">("todas");
  const [term, setTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<EvidenceCategory, number>();
    for (const item of evidences) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [evidences]);

  const visible = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase("pt-BR");
    return evidences
      .filter((item) => (category === "todas" ? true : item.category === category))
      .filter((item) =>
        needle
          ? `${item.summary} ${item.content} ${item.reference}`
              .toLocaleLowerCase("pt-BR")
              .includes(needle)
          : true,
      );
  }, [evidences, category, term]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por conteúdo, resumo ou folha"
            aria-label="Buscar provas"
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setCategory("todas")}
          aria-pressed={category === "todas"}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${
            category === "todas"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          Todas <span className="tabular-nums opacity-70">{evidences.length}</span>
        </button>
        {counts.map(([cat, count]) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            aria-pressed={category === cat}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${
              category === cat
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
              style={{ background: CATEGORY_COLOR[cat] }}
            />
            {EVIDENCE_CATEGORY_LABEL[cat]} <span className="tabular-nums opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {visible.length} de {evidences.length} provas coletadas
      </div>

      <div className="mt-3 space-y-2">
        {visible.map((evidence) => {
          const open = openId === evidence.id;
          return (
            <article
              key={evidence.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : evidence.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/25"
              >
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLOR[evidence.category] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                    <span
                      className="rounded border px-1.5 py-0.5"
                      style={{
                        borderColor: `${CATEGORY_COLOR[evidence.category]}55`,
                        color: CATEGORY_COLOR[evidence.category],
                      }}
                    >
                      {EVIDENCE_CATEGORY_LABEL[evidence.category]}
                    </span>
                    <span className="tabular-nums">Bloco {evidence.block}</span>
                    {evidence.reference && (
                      <span className="tabular-nums">· {evidence.reference}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-snug">{evidence.summary}</p>
                </div>
              </button>
              {open && evidence.content && (
                <div className="border-t border-border bg-surface/50 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <FileText className="size-3" /> Trecho do documento
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground/85">
                    {evidence.content}
                  </p>
                </div>
              )}
            </article>
          );
        })}
        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma prova corresponde ao filtro.
          </div>
        )}
      </div>
    </div>
  );
}
