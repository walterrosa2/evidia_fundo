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
import { HelpHint } from "@/components/shared/HelpHint";
import { FIELD_HELP } from "@/config/fieldHelp";
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
          subtitle="Os números só são exibidos quando há base documental suficiente para sustentar o cálculo de preço."
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
        subtitle="Cada fragilidade técnica apurada é convertida em ajuste de preço. O preço recomendado já incorpora o haircut por risco probatório e jurídico."
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
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Preço de referência atualizado
            <HelpHint label="Preço de referência atualizado" text={FIELD_HELP.precoReferencia} />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {formatCurrency(base.initialPurchasePrice, { compact: true })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.derived ? "10% do valor atualizado, antes dos ajustes" : "Base temporal aplicada"}
          </div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-violet/5 p-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary">
            Preço recomendado
            <HelpHint label="Preço recomendado" text={FIELD_HELP.precoRecomendado} />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-primary">
            {formatCurrency(base.recommendedPrice, { compact: true })}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-risk-low" /> Múltiplo ponderado{" "}
            {base.expectedROI.toFixed(1)}×
            {base.probabilityOfSuccess !== undefined && (
              <span> · êxito {(base.probabilityOfSuccess * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Valor atualizado
            <HelpHint label="Valor atualizado" text={FIELD_HELP.valorAtualizado} />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {formatCurrency(base.economicPotentialValue, { compact: true })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.derived ? "Motor de cálculo judicial" : "Valor da causa × fator temporal"}
          </div>
        </div>
      </div>

      {/* Procedência dos números, quando o valuation é derivado */}
      {data.derived && data.rationale && (
        <div className="mt-4 rounded-xl border border-border bg-surface/40 p-5">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            De onde vem cada número
            <HelpHint
              label="procedência do valuation"
              text="O que é: a origem de cada parâmetro usado no cálculo do preço. Como é montado: exposure vem do motor de atualização; taxa de recuperação e risco de nulidade vêm do parecer Nulidade360; probabilidade de êxito vem dos vetores do Red Team. Como ler: nenhum valor desta tela foi escrito à mão — todos derivam das etapas anteriores."
            />
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Exposure
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-foreground/85">
                {formatCurrency(base.economicPotentialValue, { compact: true })} apurados pelo motor
                de cálculo judicial, a partir do valor da causa corrigido e dos juros do período.
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Taxa de recuperação
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-foreground/85">
                {data.rationale.recovery}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Probabilidade de êxito
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-foreground/85">
                {data.rationale.adversarial}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            Waterfall — composição do preço (R$ milhões)
            <HelpHint
              label="waterfall de preço"
              text="O que é: a decomposição do caminho entre o Valor Econômico Potencial e o preço-base de aquisição. Como ler: cada barra é um ajuste por risco; a última é o ticket que a mesa pode oferecer."
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.derived
              ? "Do valor atualizado ao preço recomendado, um degrau por risco apurado"
              : "Do Valor Econômico Potencial ao preço-base de aquisição na relação 1:10"}
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
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            Drivers de ajuste
            <HelpHint
              label="drivers de ajuste"
              text="O que é: os fatores que deslocam o preço em relação ao valor de referência. Como ler: valores negativos reduzem o preço que o ativo suporta; a alavanca de acordo é o único componente que o eleva."
            />
          </div>
          {data.derived && data.adjustments ? (
            <ul className="mt-4 space-y-3">
              {data.adjustments.map((adjustment) => (
                <li key={adjustment.id} className="border-b border-border/60 pb-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{adjustment.label}</span>
                    <span
                      className="shrink-0 font-medium tabular-nums"
                      style={{
                        color: adjustment.amount >= 0 ? "var(--risk-low)" : "var(--risk-high)",
                      }}
                    >
                      {adjustment.amount > 0 ? "+" : ""}
                      {formatCurrency(adjustment.amount, { compact: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {adjustment.source}
                  </p>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-2 pt-1 text-sm font-semibold">
                <span>Efeito líquido</span>
                <span className="tabular-nums">
                  {formatCurrency(
                    data.adjustments.reduce((total, item) => total + item.amount, 0),
                    { compact: true },
                  )}
                </span>
              </li>
            </ul>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {[
                {
                  label: "Risco probatório",
                  value: base.evidenceRiskAdjustment,
                  color: "risk-high",
                },
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
          )}
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
            <div className="mt-1 text-xs text-muted-foreground">preço de entrada recomendado</div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <ScenarioLine
                help="O que é: o preço pedido pelo cedente antes da diligência. Como ler: é a referência contra a qual se mede o ganho de negociação."
                label="Inicial"
                value={scenario.initialPurchasePrice}
              />
              <ScenarioLine
                label="Ajuste probatório"
                help="O que é: o desconto ou prêmio decorrente da robustez da prova. Como ler: prova frágil reduz o preço que o ativo suporta."
                value={scenario.evidenceRiskAdjustment}
                color="text-risk-high"
              />
              <ScenarioLine
                label="Ajuste nulidades"
                help="O que é: o desconto decorrente do risco de invalidação de atos e provas. Como ler: é o componente que mais penaliza o preço em processos com laudo impugnado."
                value={scenario.nullityAdjustment}
                color="text-risk-critical"
              />
              <ScenarioLine
                label="Alavanca acordo"
                help="O que é: o prêmio decorrente da probabilidade de composição. Como ler: acordo provável antecipa o fluxo e reduz o custo de carrego."
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
  help,
}: {
  label: string;
  value: number;
  color?: string;
  positive?: boolean;
  help?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="inline-flex items-center gap-1.5">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </span>
      <span className={`tabular-nums ${color}`}>
        {positive && value > 0 ? "+" : ""}
        {formatCurrency(value, { compact: true })}
      </span>
    </div>
  );
}
