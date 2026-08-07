import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ProceduralPhaseBadge } from "@/components/cases/ProceduralPhaseBadge";
import {
  mockDeals,
  dealStatusLabel,
  purchaseProfileLabel,
  type DealStatus,
} from "@/data/mockDeals";
import { formatCurrency } from "@/lib/formatters";
import { recommendationLabel, recommendationClasses } from "@/lib/risk";

export const Route = createFileRoute("/deals/")({
  component: DealFlow,
});

const filters = [
  { id: "todos", label: "Todos" },
  { id: "perfil_conservador", label: "Perfil conservador" },
  { id: "risco_critico", label: "Risco alto/crítico" },
  { id: "em_analise", label: "Em análise" },
  { id: "comite", label: "Recomendados p/ comitê" },
  { id: "rejeitados", label: "Rejeitados" },
] as const;

const evidenceMapLabel = {
  linked: "Evidências vinculadas",
  available_unlinked: "Mapa não vinculado",
  missing: "Mapa pendente",
} as const;

function DealFlow() {
  const [active, setActive] = useState<(typeof filters)[number]["id"]>("todos");

  const filtered = mockDeals.filter((d) => {
    if (active === "todos") return true;
    if (active === "perfil_conservador") return d.purchaseProfile === "conservador";
    if (active === "risco_critico")
      return d.evidenceRisk === "alto" || d.evidenceRisk === "critico";
    if (active === "em_analise") return d.status === "em_analise";
    if (active === "comite") return d.status === "comite";
    if (active === "rejeitados") return d.status === "rejeitado";
    return true;
  });

  const statusClasses: Record<DealStatus, string> = {
    novo: "bg-cyan/15 text-cyan border-cyan/30",
    em_analise: "bg-violet/15 text-violet border-violet/30",
    concluido: "bg-risk-low/15 text-risk-low border-risk-low/30",
    comite: "bg-gold/15 text-gold border-gold/30",
    rejeitado: "bg-risk-critical/15 text-risk-critical border-risk-critical/30",
  };

  return (
    <AppShell context="Deal Flow">
      <SectionHeader
        eyebrow={`Pipeline · ${mockDeals.length} deals ativos`}
        title="Deal Flow Litigioso"
        subtitle="Oportunidades ordenadas por atratividade de compra. O risco jurídico continua sendo exibido na direção correta: quanto maior, pior o ativo."
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={active === f.id}
            onClick={() => setActive(f.id)}
            className={`rounded-md border px-3 py-1.5 text-xs transition ${
              active === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-surface/40 border-b border-border">
                <th className="px-4 py-3 font-medium">Caso</th>
                <th className="px-4 py-3 font-medium">Setor</th>
                <th className="px-4 py-3 font-medium">Valor da causa</th>
                <th className="px-4 py-3 font-medium">Deal Value</th>
                <th className="px-4 py-3 font-medium">Fase processual</th>
                <th className="px-4 py-3 font-medium text-center">Score</th>
                <th className="px-4 py-3 font-medium">Risco jurídico</th>
                <th className="px-4 py-3 font-medium">Valor potencial</th>
                <th className="px-4 py-3 font-medium">Recomendação</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border/40 hover:bg-secondary/30 transition"
                >
                  <td className="px-4 py-3">
                    <Link to="/deals/$id" params={{ id: d.id }} className="hover:text-primary">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-primary">#{d.rankingPosition}</span>
                        <span>{d.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{d.owner}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-primary">
                          Perfil {purchaseProfileLabel[d.purchaseProfile]}
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                          {evidenceMapLabel[d.evidenceMapStatus]}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.sector}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {d.caseValue ? formatCurrency(d.caseValue, { compact: true }) : "A confirmar"}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {d.potentialTicket
                      ? formatCurrency(d.potentialTicket, { compact: true })
                      : "A confirmar"}
                  </td>
                  <td className="px-4 py-3">
                    <ProceduralPhaseBadge description={d.proceduralPhase} />
                  </td>
                  <td className="px-4 py-3 text-center font-semibold tabular-nums">
                    {d.evidiaScore}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={d.evidenceRisk} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-risk-low">
                    {d.economicPotential.valorEconomicoPotencial
                      ? formatCurrency(d.economicPotential.valorEconomicoPotencial, {
                          compact: true,
                        })
                      : "A confirmar"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${recommendationClasses[d.recommendation]}`}
                    >
                      {recommendationLabel[d.recommendation]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusClasses[d.status]}`}
                    >
                      {dealStatusLabel[d.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
