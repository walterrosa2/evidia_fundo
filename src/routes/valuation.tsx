import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { valuationScenarios, waterfallData } from "@/data/mockValuation";
import { formatCurrency } from "@/lib/formatters";

export const Route = createFileRoute("/valuation")({
  component: Valuation,
});

function Valuation() {
  const base = valuationScenarios.find((s) => s.id === "base")!;

  return (
    <AppShell context="Valuation Probatório">
      <SectionHeader
        eyebrow="Valuation probatório · Fundo Atlas × Energia Delta"
        title="O risco probatório muda o preço"
        subtitle="A EvidIA traduz fragilidades técnicas em ajuste financeiro. Cenários conservador, base e agressivo orientam preço de entrada."
        actions={
          <Link to="/relatorios/investment-memo" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Gerar Investment Memo <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Preço inicial</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatCurrency(base.initialPurchasePrice, { compact: true })}</div>
          <div className="mt-1 text-xs text-muted-foreground">Proposta original</div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-violet/5 p-6">
          <div className="text-[11px] uppercase tracking-wider text-primary">Preço recomendado · base</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-primary">{formatCurrency(base.recommendedPrice, { compact: true })}</div>
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3.5 text-risk-low" /> ROI esperado {base.expectedROI.toFixed(1)}×
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor da causa</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatCurrency(base.grossClaimValue, { compact: true })}</div>
          <div className="mt-1 text-xs text-muted-foreground">Reclamação total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Waterfall — composição do preço (R$ milhões)</div>
          <div className="h-80 mt-4">
            <ResponsiveContainer>
              <BarChart data={waterfallData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--cyan) 10%, transparent)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {waterfallData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Drivers de ajuste</div>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { k: "Risco probatório", v: base.evidenceRiskAdjustment, c: "risk-high" },
              { k: "Nulidades exploráveis", v: base.nullityAdjustment, c: "risk-critical" },
              { k: "Alavanca de acordo", v: base.settlementLeverageAdjustment, c: "risk-low" },
              { k: "Incerteza residual", v: -4_000_000, c: "risk-moderate" },
            ].map((d) => (
              <li key={d.k} className="flex items-center justify-between">
                <span>{d.k}</span>
                <span className="tabular-nums font-medium" style={{ color: `var(--${d.c})` }}>
                  {d.v >= 0 ? "+" : ""}{formatCurrency(d.v, { compact: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {valuationScenarios.map((s) => (
          <div key={s.id} className={`rounded-xl border bg-card p-6 ${s.name === "Base" ? "border-primary/40" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{s.name}</div>
              <div className="text-[11px] text-muted-foreground">ROI {s.expectedROI.toFixed(1)}×</div>
            </div>
            <div className="mt-4 text-3xl font-semibold tabular-nums">{formatCurrency(s.recommendedPrice, { compact: true })}</div>
            <div className="text-xs text-muted-foreground mt-1">preço de entrada recomendado</div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Inicial</span><span className="tabular-nums">{formatCurrency(s.initialPurchasePrice, { compact: true })}</span></div>
              <div className="flex justify-between"><span>Ajuste probatório</span><span className="tabular-nums text-risk-high">{formatCurrency(s.evidenceRiskAdjustment, { compact: true })}</span></div>
              <div className="flex justify-between"><span>Ajuste nulidades</span><span className="tabular-nums text-risk-critical">{formatCurrency(s.nullityAdjustment, { compact: true })}</span></div>
              <div className="flex justify-between"><span>Alavanca acordo</span><span className="tabular-nums text-risk-low">+{formatCurrency(s.settlementLeverageAdjustment, { compact: true })}</span></div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground text-center">
        * Cenários ilustrativos. Não constituem promessa de retorno nem recomendação de investimento.
      </p>
    </AppShell>
  );
}
