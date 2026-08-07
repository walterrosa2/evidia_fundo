import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp, Calculator } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { getValuationData, type WaterfallItem } from "@/data/mockValuation";
import { formatCurrency } from "@/lib/formatters";

type WaterfallTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: WaterfallItem }>;
};

function WaterfallTooltip({ active, payload }: WaterfallTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-foreground">{item.name}</div>
      <div className="mt-1 tabular-nums text-foreground">
        {item.displayValue > 0 && item.base > 0 ? "+" : ""}
        {formatCurrency(item.displayValue)}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/valuation")({
  component: Valuation,
});

function Valuation() {
  const { selectedDeal, selectedCase } = useCaseSelection();
  const data = getValuationData(selectedDeal.id);

  if (!data) {
    return (
      <AppShell context={`Valuation · ${selectedDeal.name}`}>
        <SectionHeader
          eyebrow={`Valuation probatório · ${selectedDeal.name}`}
          title="O risco probatório muda o preço"
          subtitle="Troque o processo no seletor acima. Os números só são exibidos quando existe base documental suficiente para o cálculo."
        />
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
            <Calculator className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Valuation ainda não calculado</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            {selectedCase.demoNotice} Confirme o valor da causa e a data de distribuição para
            liberar os cenários financeiros deste processo.
          </p>
          <Link
            to="/deals/$id"
            params={{ id: selectedDeal.id }}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm hover:border-primary/40 hover:text-primary"
          >
            Voltar ao caso <ArrowRight className="size-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const base = data.scenarios.find((scenario) => scenario.id === "base")!;

  return (
    <AppShell context={`Valuation · ${selectedDeal.name}`}>
      <SectionHeader
        eyebrow={`Valuation probatório · ${selectedDeal.name}`}
        title="O risco probatório muda o preço"
        subtitle="A EvidIA traduz fragilidades técnicas em ajuste financeiro. Troque o processo acima para comparar a análise de cada ativo."
        actions={
          <Link
            to="/relatorios/investment-memo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Gerar Investment Memo <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Preço de referência atualizado
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {formatCurrency(base.initialPurchasePrice, { compact: true })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Base temporal aplicada</div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-violet/5 p-6">
          <div className="text-[11px] uppercase tracking-wider text-primary">
            Deal Value · Base 1:10
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-primary">
            {formatCurrency(base.recommendedPrice, { compact: true })}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-risk-low" /> Múltiplo potencial{" "}
            {base.expectedROI.toFixed(1)}×
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Valor econômico potencial
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {formatCurrency(base.economicPotentialValue, { compact: true })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Valor da causa × fator temporal</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="text-sm font-semibold">Waterfall — composição do preço (R$ milhões)</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Do Valor Econômico Potencial ao preço-base de aquisição na relação 1:10
          </div>
          <div className="mt-4 h-80">
            <ResponsiveContainer>
              <BarChart data={data.waterfall}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, var(--cyan) 10%, transparent)" }}
                  content={<WaterfallTooltip />}
                />
                <Bar dataKey="base" stackId="waterfall" fill="transparent" />
                <Bar dataKey="value" stackId="waterfall" radius={[6, 6, 6, 6]}>
                  {data.waterfall.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Drivers de ajuste</div>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { label: "Risco probatório", value: base.evidenceRiskAdjustment, color: "risk-high" },
              {
                label: "Nulidades exploráveis",
                value: base.nullityAdjustment,
                color: "risk-critical",
              },
              {
                label: "Alavanca de acordo",
                value: base.settlementLeverageAdjustment,
                color: "risk-low",
              },
            ].map((driver) => (
              <li key={driver.label} className="flex items-center justify-between">
                <span>{driver.label}</span>
                <span
                  className="tabular-nums font-medium"
                  style={{ color: `var(--${driver.color})` }}
                >
                  {driver.value > 0 ? "+" : ""}
                  {formatCurrency(driver.value, { compact: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`rounded-xl border bg-card p-6 ${scenario.name === "Base" ? "border-primary/40" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{scenario.name}</div>
              <div className="text-[11px] text-muted-foreground">
                ROI {scenario.expectedROI.toFixed(1)}×
              </div>
            </div>
            <div className="mt-4 text-3xl font-semibold tabular-nums">
              {formatCurrency(scenario.recommendedPrice, { compact: true })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              preço de entrada recomendado · base 1:10
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <ScenarioLine label="Inicial" value={scenario.initialPurchasePrice} />
              <ScenarioLine
                label="Ajuste probatório"
                value={scenario.evidenceRiskAdjustment}
                color="text-risk-high"
              />
              <ScenarioLine
                label="Ajuste nulidades"
                value={scenario.nullityAdjustment}
                color="text-risk-critical"
              />
              <ScenarioLine
                label="Alavanca acordo"
                value={scenario.settlementLeverageAdjustment}
                color="text-risk-low"
                positive
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">* {data.disclaimer}</p>
    </AppShell>
  );
}

function ScenarioLine({
  label,
  value,
  color = "",
  positive = false,
}: {
  label: string;
  value: number;
  color?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`tabular-nums ${color}`}>
        {positive && value > 0 ? "+" : ""}
        {formatCurrency(value, { compact: true })}
      </span>
    </div>
  );
}
