import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Calculator, Scale, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { HelpHint } from "@/components/shared/HelpHint";
import { Th } from "@/components/shared/TableHead";
import { FIELD_HELP } from "@/config/fieldHelp";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { formatCurrency } from "@/lib/formatters";
import { MONETARY_INDEX_LABEL, MONETARY_INDEX_NOTE } from "@/config/monetaryIndices";
import type { MonthlyLine } from "@/lib/judicialUpdate";

export const Route = createFileRoute("/calculo-judicial")({
  component: CalculoJudicial,
});

const pct = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});
const factor = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function formatDate(iso?: string) {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatCompetence(competence: string) {
  const [year, month] = competence.split("-");
  return `${month}/${year}`;
}

function CalculoJudicial() {
  const { selectedDeal, selectedCase } = useCaseSelection();
  const [showAllMonths, setShowAllMonths] = useState(false);

  const result = selectedDeal.judicialUpdate;
  const params = selectedCase.judicialCalculation;

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.schedule
      .filter((line) => line.competence.endsWith("-12") || line === result.schedule.at(-1))
      .map((line) => ({
        label: formatCompetence(line.competence),
        Principal: result.principal,
        Correção: line.correctedValue - result.principal,
        Juros: line.interestValue,
      }));
  }, [result]);

  const yearlyRows = useMemo(() => {
    if (!result) return [];
    const byYear = new Map<string, MonthlyLine>();
    for (const line of result.schedule) byYear.set(line.competence.slice(0, 4), line);
    return [...byYear.values()];
  }, [result]);

  if (!result || !params) {
    return (
      <AppShell context={`Cálculo judicial · ${selectedDeal.name}`}>
        <SectionHeader
          eyebrow={`Atualização do débito · ${selectedDeal.name}`}
          title="Memória de cálculo"
          subtitle="A atualização depende de parâmetros declarados no processo: principal, termos iniciais de correção e juros, e índice aplicável."
        />
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
            <Calculator className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Parâmetros de cálculo não informados</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Este processo ainda não teve o valor principal e os termos iniciais confirmados nos
            autos. Sem esses elementos, qualquer atualização seria arbitrária.
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

  const rows = showAllMonths ? result.schedule : yearlyRows;
  const composition = [
    { label: "Principal", value: result.principal, color: "var(--cyan)" },
    { label: "Correção monetária", value: result.correction, color: "var(--violet)" },
    { label: "Juros de mora", value: result.interest, color: "var(--gold)" },
    ...(result.penalty > 0
      ? [{ label: "Multa", value: result.penalty, color: "var(--risk-moderate)" }]
      : []),
    ...(result.attorneyFees > 0
      ? [{ label: "Honorários", value: result.attorneyFees, color: "var(--risk-high)" }]
      : []),
  ];

  return (
    <AppShell context={`Cálculo judicial · ${selectedDeal.name}`}>
      <SectionHeader
        eyebrow={`Atualização do débito · ${selectedDeal.name}`}
        title="Memória de cálculo"
        subtitle="Demonstração linha a linha da atualização do principal: correção monetária pelo índice do processo, juros de mora do período e transição de regime pela Lei 14.905/2024."
        actions={
          <Link
            to="/deals/$id"
            params={{ id: selectedDeal.id }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm hover:border-primary/40 hover:text-primary"
          >
            Abrir o caso <ArrowRight className="size-4" />
          </Link>
        }
      />

      {/* Resultado consolidado */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-primary/30 bg-card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Valor atualizado até {formatDate(result.input.endDate)}
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-risk-low">
                {formatCurrency(result.total)}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                Multiplicador
                <HelpHint label="multiplicador" text={FIELD_HELP.multiplicador} align="right" />
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {result.multiple.toFixed(2)}×
              </div>
            </div>
          </div>

          {/* Barra de composição */}
          <div className="mt-6 flex h-3 overflow-hidden rounded-full border border-border">
            {composition.map((part) => (
              <div
                key={part.label}
                style={{ width: `${(part.value / result.total) * 100}%`, background: part.color }}
                title={`${part.label}: ${formatCurrency(part.value)}`}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {composition.map((part) => (
              <div key={part.label} className="flex items-start gap-2">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: part.color }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {part.label}
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {formatCurrency(part.value)}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {((part.value / result.total) * 100).toFixed(1)}% do total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parâmetros de entrada */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Scale className="size-4 text-primary" /> Parâmetros aplicados
            <HelpHint
              label="parâmetros de cálculo"
              text="O que é: os elementos que o juízo considera para liquidar o débito. Como é definido: principal e termos iniciais vêm dos autos; o índice segue a praxe do tribunal. Como ler: alterar qualquer termo inicial desloca todo o cálculo."
            />
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <Param
              help={FIELD_HELP.valorDaCausa}
              label="Principal"
              value={formatCurrency(params.principal)}
            />
            <Param label="Correção desde" value={formatDate(params.correctionStart)} />
            <Param label="Juros desde" value={formatDate(params.interestStart)} />
            <Param
              help={FIELD_HELP.indiceMes}
              label="Índice"
              value={MONETARY_INDEX_LABEL[params.index]}
            />
            <Param
              label="Juros até 29/08/2024"
              value={`${params.legacyInterestRate}% a.m. ${params.interestType === "simple" ? "simples" : "compostos"}`}
            />
            <Param label="Juros desde 30/08/2024" value="SELIC − IPCA (taxa legal)" />
            {params.penalty && (
              <Param
                label="Multa"
                value={`${params.penalty.rate}% ${params.penalty.base === "with_interest" ? "sobre principal + juros" : "sobre o corrigido"}`}
              />
            )}
            {params.attorneyFees && <Param label="Honorários" value={`${params.attorneyFees}%`} />}
            <Param
              label="Meses de correção"
              value={`${Math.round(result.correctionMonths)} meses`}
            />
            <Param label="Meses de juros" value={`${Math.round(result.interestMonths)} meses`} />
          </dl>
        </div>
      </div>

      {/* Base normativa */}
      <div className="mt-4 rounded-xl border border-border bg-surface/40 p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Base normativa e origem dos parâmetros
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{params.basis}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {MONETARY_INDEX_NOTE[params.index]} A ordem de apuração segue a praxe forense: o principal
          é corrigido pelo índice, os juros de mora incidem sobre o valor corrigido e, havendo multa
          e honorários, aplicam-se em seguida.
        </p>
        {result.hasProjection && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-risk-moderate">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            Competências marcadas como projetadas usam estimativa de índice: as variações oficiais
            do período ainda não foram publicadas.
          </p>
        )}
      </div>

      {/* Evolução */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Evolução do débito</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Composição acumulada ao fim de cada exercício
        </div>
        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Area
                type="monotone"
                dataKey="Principal"
                stackId="1"
                stroke="var(--cyan)"
                fill="var(--cyan)"
                fillOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="Correção"
                stackId="1"
                stroke="var(--violet)"
                fill="var(--violet)"
                fillOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="Juros"
                stackId="1"
                stroke="var(--gold)"
                fill="var(--gold)"
                fillOpacity={0.35}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <div className="text-sm font-semibold">Demonstrativo</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {showAllMonths
                ? `${result.schedule.length} competências mensais`
                : `${yearlyRows.length} exercícios · fechamento de cada ano`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAllMonths((value) => !value)}
            aria-pressed={showAllMonths}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs transition hover:border-primary/40 hover:text-primary"
          >
            {showAllMonths ? "Ver por exercício" : "Ver mês a mês"}
          </button>
        </div>
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-border bg-surface/95 backdrop-blur">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <Th help={FIELD_HELP.competencia}>Competência</Th>
                <Th align="right" help={FIELD_HELP.indiceMes}>
                  Índice do mês
                </Th>
                <Th align="right" help={FIELD_HELP.fatorAcumulado}>
                  Fator acumulado
                </Th>
                <Th align="right" help={FIELD_HELP.principalCorrigido}>
                  Principal corrigido
                </Th>
                <Th align="right" help={FIELD_HELP.jurosAcumulados}>
                  Juros acum.
                </Th>
                <Th align="right" help={FIELD_HELP.jurosValor}>
                  Juros (R$)
                </Th>
                <Th align="right" help={FIELD_HELP.subtotal}>
                  Subtotal
                </Th>
                <Th help={FIELD_HELP.regimeJuros}>Regime</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((line) => (
                <tr
                  key={line.competence}
                  className="border-b border-border/40 transition hover:bg-secondary/30"
                >
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatCompetence(line.competence)}
                    {line.projected && (
                      <span className="ml-2 rounded border border-risk-moderate/30 bg-risk-moderate/10 px-1.5 py-0.5 text-[10px] text-risk-moderate">
                        projeção
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {pct.format(line.indexRate)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {factor.format(line.correctionFactor)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCurrency(line.correctedValue)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {pct.format(line.accumulatedInterestRate)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCurrency(line.interestValue)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatCurrency(line.subtotal)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        line.regime === "reform"
                          ? "border-cyan/30 bg-cyan/10 text-cyan"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {line.regime === "reform" ? "Lei 14.905" : "art. 406 anterior"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Demonstrativo gerado para fins de análise de investimento. As séries de índices são
        calibradas pela variação anual oficial e distribuídas mensalmente pela taxa equivalente
        composta — servem para dimensionar exposure, não substituem a tabela oficial do tribunal
        para uso processual.
      </p>
    </AppShell>
  );
}

function Param({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </dt>
      <dd className="text-right text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
