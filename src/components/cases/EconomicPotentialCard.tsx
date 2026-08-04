import { Calculator, Clock3, TrendingUp } from "lucide-react";
import type { EconomicPotentialCalculation } from "@/lib/economicPotential";
import { formatCurrency } from "@/lib/formatters";
import { HelpHint } from "@/components/shared/HelpHint";

const decimalFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function EconomicPotentialCard({
  calculation,
}: {
  calculation: EconomicPotentialCalculation;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-primary/30 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-primary/5 px-6 py-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-primary" />
            Valor Econômico Potencial
            <HelpHint
              label="valor econômico potencial"
              text="Valor informado da ação multiplicado pelo fator correspondente ao tempo decorrido desde a distribuição."
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Valores ocultos da ação atualizados pelo tempo processual
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Resultado</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-risk-low">
            {formatCurrency(calculation.valorEconomicoPotencial)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-3">
        <Metric label="Valor informado na ação" value={formatCurrency(calculation.valorBase)} />
        <Metric
          label="Tempo da ação"
          value={`${decimalFormatter.format(calculation.tempoAcaoAnos)} anos`}
          icon={<Clock3 className="size-3.5" />}
        />
        <Metric label="Fator aplicado" value={`${decimalFormatter.format(calculation.fator)}×`} />
      </div>

      <div className="mx-6 mb-6 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Calculator className="size-3.5" /> Memória de cálculo
        </div>
        <div className="mt-2 text-sm font-medium tabular-nums">
          R$ {calculation.calculo.replace(" = ", " = R$ ")}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold tabular-nums">
        {icon}
        {value}
      </div>
    </div>
  );
}
