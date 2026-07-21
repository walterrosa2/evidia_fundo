import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { blocks, mockFindings, findingStatusLabel } from "@/data/mockFindings";
import { Check, Edit, Trash2, BookmarkPlus, FileQuestion } from "lucide-react";

export const Route = createFileRoute("/nulidade360/blocos")({
  component: Blocos,
});

function Blocos() {
  const [activeId, setActiveId] = useState(blocks[0].id);
  const active = blocks.find((b) => b.id === activeId)!;
  const findings = mockFindings.filter((f) => f.blockId === activeId);

  return (
    <AppShell context="Nulidade360 · Blocos">
      <SectionHeader
        eyebrow="Análise detalhada"
        title="Análise por blocos"
        subtitle="Cada bloco representa uma dimensão técnica do laudo. Achados, evidências e impacto processual são auditáveis."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside className="rounded-xl border border-border bg-card p-2 self-start">
          {blocks.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveId(b.id)}
              className={`w-full text-left rounded-md px-3 py-2.5 mb-1 transition ${
                activeId === b.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.code}</span>
                <RiskBadge level={b.risk} />
              </div>
              <div className="text-sm font-medium mt-0.5">{b.name}</div>
              <div className="text-[11px] text-muted-foreground">{b.findingsCount} achados</div>
            </button>
          ))}
        </aside>

        <div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{active.code}</div>
                <h2 className="text-xl font-semibold tracking-tight">{active.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-3xl">{active.summary}</p>
              </div>
              <RiskBadge level={active.risk} />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Pill k="Score" v={`${active.score}/100`} />
              <Pill k="Confiança" v={`${active.confidence}%`} />
              <Pill k="Achados" v={active.findingsCount.toString()} />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 border-b border-border">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Pergunta / achado</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Risco</th>
                  <th className="px-4 py-3 font-medium">Conf.</th>
                  <th className="px-4 py-3 font-medium">Pág.</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {findings.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground"><FileQuestion className="size-5 mx-auto mb-1" />Nenhum achado neste bloco para o caso atual.</td></tr>
                )}
                {findings.map((f) => (
                  <tr key={f.id} className="border-b border-border/40 align-top hover:bg-secondary/30">
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-medium">{f.question}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{f.inference}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{findingStatusLabel[f.status]}</td>
                    <td className="px-4 py-3"><RiskBadge level={f.riskLevel} /></td>
                    <td className="px-4 py-3 tabular-nums">{f.confidence}%</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{f.page ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ActionBtn icon={Check} label="Aceitar" />
                        <ActionBtn icon={Edit} label="Editar" />
                        <ActionBtn icon={BookmarkPlus} label="Relatório" />
                        <ActionBtn icon={Trash2} label="Descartar" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Pill({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1.5">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label }: { icon: typeof Check; label: string }) {
  return (
    <button title={label} className="grid size-7 place-items-center rounded-md border border-border bg-surface hover:bg-secondary text-muted-foreground hover:text-foreground transition">
      <Icon className="size-3.5" />
    </button>
  );
}
