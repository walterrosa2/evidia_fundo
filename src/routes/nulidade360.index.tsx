import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShieldAlert, FileSearch, AlertOctagon, Activity } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { blocks } from "@/data/mockFindings";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/nulidade360/")({
  component: Nulidade360,
});

function Nulidade360() {
  return (
    <AppShell context="Nulidade360">
      <SectionHeader
        eyebrow="Módulo EvidIA · Auditoria pericial"
        title="Nulidade360"
        subtitle="Audite laudos, perícias e provas técnicas por blocos. Detecte nulidades, fragilidades probatórias e riscos antes do aporte."
        actions={
          <Link
            to="/nulidade360/nova-analise"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" /> Nova análise de laudo
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Laudos analisados" value={73} icon={FileSearch} accent="cyan" />
        <MetricCard label="Análises em andamento" value={4} icon={Activity} accent="violet" />
        <MetricCard
          label="Nulidades críticas"
          value={11}
          icon={AlertOctagon}
          accent="risk-critical"
        />
        <MetricCard
          label="Score médio"
          value="58/100"
          icon={ShieldAlert}
          accent="risk-high"
          hint="zona Alto"
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Mapa de risco por bloco</div>
        <div className="mt-1 text-xs text-muted-foreground">Caso destacado: {caseDetail.name}</div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {blocks.map((b) => (
            <Link
              key={b.id}
              to="/nulidade360/blocos"
              className="block rounded-lg border border-border bg-surface p-4 hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {b.code}
                </div>
                <RiskBadge level={b.risk} />
              </div>
              <div className="mt-2 font-medium">{b.name}</div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Score <b className="text-foreground">{b.score}</b>
                </span>
                <span>Conf. {b.confidence}%</span>
                <span>{b.findingsCount} achados</span>
              </div>
              <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${b.score}%`,
                    background: `var(--risk-${b.risk === "critico" ? "critical" : b.risk === "alto" ? "high" : b.risk === "moderado" ? "moderate" : "low"})`,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="text-sm font-semibold">Análises recentes</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface/40 border-b border-border">
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-medium">Caso</th>
              <th className="px-6 py-3 font-medium">Laudo</th>
              <th className="px-6 py-3 font-medium">Score</th>
              <th className="px-6 py-3 font-medium">Risco</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                c: caseDetail.name,
                l: "Laudo pericial principal",
                s: caseDetail.evidenceScore,
                r: "alto" as const,
                st: "Concluído",
              },
              {
                c: "Banco Orion × Sigma",
                l: "Laudo contábil v1.4",
                s: 64,
                r: "alto" as const,
                st: "Em revisão",
              },
              {
                c: "Construtora Aurora × Norte",
                l: "Laudo de engenharia v2.0",
                s: 41,
                r: "critico" as const,
                st: "Concluído",
              },
              {
                c: "Vega × Helios",
                l: "Laudo geológico v1.1",
                s: 78,
                r: "moderado" as const,
                st: "Em fila",
              },
            ].map((row, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-secondary/30">
                <td className="px-6 py-3">{row.c}</td>
                <td className="px-6 py-3 text-muted-foreground">{row.l}</td>
                <td className="px-6 py-3 tabular-nums">{row.s}</td>
                <td className="px-6 py-3">
                  <RiskBadge level={row.r} />
                </td>
                <td className="px-6 py-3 text-muted-foreground">{row.st}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
