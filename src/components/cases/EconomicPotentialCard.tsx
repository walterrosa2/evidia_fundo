import { Calculator, Clock3, TrendingUp, ArrowRight, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { EconomicPotentialCalculation } from "@/lib/economicPotential";
import { formatCurrency } from "@/lib/formatters";
import { HelpHint } from "@/components/shared/HelpHint";
import { FIELD_HELP } from "@/config/fieldHelp";

const decimalFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const factorFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function formatDate(iso?: string) {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function EconomicPotentialCard({
  calculation,
  caseId,
}: {
  calculation: EconomicPotentialCalculation;
  caseId?: string;
}) {
  const hasConfirmedInputs = calculation.valorBase > 0;
  const fromEngine = calculation.origem === "motor_judicial";

  return (
    <section className="mt-6 rounded-xl border border-primary/30 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-primary/5 px-6 py-5 rounded-t-xl">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-primary" />
            Valor Econômico Potencial
            <HelpHint
              label="valor econômico potencial"
              text="O que é: o valor do pedido atualizado até a data de hoje. Como é calculado: o principal é corrigido pelo índice adotado no processo e sobre o valor corrigido incidem os juros de mora do período, com transição para a taxa legal do art. 406 do Código Civil a partir de 30/08/2024. Como ler: é o teto de recuperação bruta antes de haircut por risco — não é o valor esperado de recebimento."
              align="left"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {fromEngine
              ? `Correção por ${calculation.indiceLabel} somada aos juros de mora, desde ${formatDate(calculation.dataInicial)}`
              : "Valor do pedido atualizado pelo tempo processual"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Resultado</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-risk-low">
            {hasConfirmedInputs
              ? formatCurrency(calculation.valorEconomicoPotencial)
              : "A confirmar"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Principal"
          help={FIELD_HELP.valorDaCausa}
          value={hasConfirmedInputs ? formatCurrency(calculation.valorBase) : "A confirmar"}
        />
        <Metric
          label="Correção monetária"
          help={FIELD_HELP.indiceMes}
          value={
            fromEngine && calculation.correcao !== undefined
              ? formatCurrency(calculation.correcao)
              : "—"
          }
          hint={calculation.indiceLabel}
        />
        <Metric
          label="Juros de mora"
          help={FIELD_HELP.jurosValor}
          value={
            fromEngine && calculation.juros !== undefined ? formatCurrency(calculation.juros) : "—"
          }
          hint={
            hasConfirmedInputs
              ? `${decimalFormatter.format(calculation.tempoAcaoAnos)} anos de ação`
              : undefined
          }
          icon={<Clock3 className="size-3.5" />}
        />
        <Metric
          label="Multiplicador"
          help={FIELD_HELP.multiplicador}
          value={hasConfirmedInputs ? `${factorFormatter.format(calculation.fator)}×` : "Pendente"}
          hint={
            fromEngine && calculation.fatorLegado
              ? `tabela anterior: ${factorFormatter.format(calculation.fatorLegado)}×`
              : undefined
          }
        />
      </div>

      <div className="mx-6 mb-6 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Calculator className="size-3.5" /> Memória de cálculo
          </div>
          {caseId && fromEngine && (
            <Link
              to="/calculo-judicial"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Abrir memória completa <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
        <div className="mt-2 text-sm font-medium tabular-nums">
          {hasConfirmedInputs
            ? `R$ ${calculation.calculo.replace(" = ", " = R$ ")}`
            : "Cálculo disponível após confirmar o valor e a data de distribuição."}
        </div>
        {hasConfirmedInputs && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {calculation.origemDescricao}
          </p>
        )}
        {calculation.possuiProjecao && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-risk-moderate">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            Parte do período usa índices projetados; o valor será revisado quando as competências
            forem publicadas.
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
  hint,
  help,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  help?: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </div>
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold tabular-nums">
        {icon}
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
