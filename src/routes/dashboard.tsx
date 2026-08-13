import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  DollarSign,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { Th } from "@/components/shared/TableHead";
import { FIELD_HELP } from "@/config/fieldHelp";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { formatCurrency } from "@/lib/formatters";
import {
  mockPortfolio,
  riskDistribution,
  financialExposure,
  recurringRisks,
} from "@/data/mockPortfolio";
import { mockDeals, purchaseProfileLabel } from "@/data/mockDeals";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell context="Dashboard executivo">
      <SectionHeader
        eyebrow="Visão executiva · Atlas Capital"
        title="Posição consolidada do portfólio litigioso"
        subtitle="Exposure agregado, risco probatório e distribuição dos ativos por recomendação. Os valores são atualizados até a data-base corrente."
        actions={
          <Link
            to="/deals"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" />
            Analisar novo deal
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Deals analisados"
          help={FIELD_HELP.dealsAnalisados}
          value={mockPortfolio.dealsAnalyzed}
          icon={Briefcase}
          accent="cyan"
          delta={{ value: "+12 vs mês anterior", positive: true }}
        />
        <MetricCard
          label="Valor econômico sob análise"
          help={FIELD_HELP.valorSobAnalise}
          value={formatCurrency(mockPortfolio.capitalUnderAnalysis, { compact: true })}
          icon={DollarSign}
          accent="violet"
          hint={`em ${mockPortfolio.dealsAnalyzed} ativos`}
        />
        <MetricCard
          label="Risco probatório médio"
          help={FIELD_HELP.riscoMedio}
          value={`${mockPortfolio.averageEvidenceRisk}/100`}
          icon={ShieldAlert}
          accent="risk-high"
          hint={`zona ${mockPortfolio.averageEvidenceRiskLabel}`}
        />
        <MetricCard
          label="Oportunidades ocultas"
          help={FIELD_HELP.oportunidadesOcultas}
          value={mockPortfolio.hiddenOpportunitiesFound}
          icon={Sparkles}
          accent="gold"
          delta={{ value: "+8 essa semana", positive: true }}
        />
        <MetricCard
          label="Economia estimada"
          help={FIELD_HELP.economiaEstimada}
          value={formatCurrency(mockPortfolio.estimatedSavings, { compact: true })}
          icon={TrendingUp}
          accent="risk-low"
          hint="reprecificações sugeridas"
        />
        <MetricCard
          label="Tempo médio de análise"
          help={FIELD_HELP.tempoAnalise}
          value={mockPortfolio.averageAnalysisTime}
          icon={Clock}
          accent="cyan"
          hint="vs 14 dias manual"
        />
        <MetricCard
          label="Deals de alto risco"
          help={FIELD_HELP.dealsAltoRisco}
          value={mockPortfolio.criticalDeals}
          icon={AlertTriangle}
          accent="risk-critical"
          hint="alto ou crítico · revisão humana"
        />
        <MetricCard
          label="Valor potencial estimado"
          help={FIELD_HELP.valorPotencial}
          value={formatCurrency(mockPortfolio.estimatedUpside, { compact: true })}
          icon={TrendingUp}
          accent="violet"
          hint="base temporal consolidada"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="text-sm font-semibold">Distribuição por risco probatório</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {mockPortfolio.dealsAnalyzed} deals · base atual
          </div>
          <div className="h-60 mt-4">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {riskDistribution.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {riskDistribution.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="text-muted-foreground">{d.value} deals</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold">Exposição financeira por risco</div>
              <div className="mt-1 text-xs text-muted-foreground">
                R$ milhões · valor econômico potencial
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Atualizado há 4 min</div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer>
              <BarChart data={financialExposure}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="risco" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, var(--cyan) 10%, transparent)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="exposicao" radius={[6, 6, 0, 0]} fill="var(--cyan)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold">Riscos recorrentes detectados</div>
          <div className="mt-1 text-xs text-muted-foreground">Top achados por frequência</div>
          <ul className="mt-4 space-y-3">
            {recurringRisks.map((r) => (
              <li key={r.label} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">em {r.count} deals</div>
                </div>
                <RiskBadge level={r.severity} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Casos recentes</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Ordenado por atratividade de compra
              </div>
            </div>
            <Link to="/deals" className="text-xs text-primary hover:underline">
              Ver deal flow completo →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <Th className="py-2" help={FIELD_HELP.caso}>
                    Caso
                  </Th>
                  <Th className="py-2" help={FIELD_HELP.dealValue}>
                    Deal Value
                  </Th>
                  <Th className="py-2" help={FIELD_HELP.score}>
                    Score
                  </Th>
                  <Th className="py-2" help={FIELD_HELP.riscoJuridico}>
                    Risco
                  </Th>
                </tr>
              </thead>
              <tbody>
                {mockDeals.slice(0, 5).map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/40">
                    <td className="py-3">
                      <Link to="/deals/$id" params={{ id: d.id }} className="hover:text-primary">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-primary">#{d.rankingPosition}</span>
                          <span>{d.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Perfil {purchaseProfileLabel[d.purchaseProfile]} · {d.proceduralPhase}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 tabular-nums">
                      {d.potentialTicket
                        ? formatCurrency(d.potentialTicket, { compact: true })
                        : "A confirmar"}
                    </td>
                    <td className="py-3 tabular-nums">
                      {d.dataStatus === "awaiting_documents" ? "—" : d.evidiaScore}
                    </td>
                    <td className="py-3">
                      <RiskBadge level={d.evidenceRisk} />
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
