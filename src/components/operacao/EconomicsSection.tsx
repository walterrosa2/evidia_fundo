import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { api, queryKeys } from "@/lib/operacao/api";
import { downloadBlob } from "@/lib/operacao/download";
import { formatDateTime, positionLabel } from "@/lib/operacao/labels";
import { formatMoney, formatPercent, formatYears } from "@/lib/operacao/money";
import type {
  CalculationRunOut,
  ClaimantStatement,
  ComponentConfidence,
  DefendantStatement,
  ImpactOut,
  OpportunityDetail,
  PositionSide,
  StatementStep,
  Undefinable,
} from "@/lib/operacao/types";
import type { TableState } from "@/lib/operacao/tableState";
import { DataTable } from "./DataTable";
import { EconomicsForm } from "./EconomicsForm";
import {
  EmptyState,
  ErrorNotice,
  FullscreenDetail,
  Help,
  labelClass,
  Loading,
  Pill,
  secondaryButton,
  TableFrame,
  tdClass,
  thClass,
} from "./primitives";

type Statement = ClaimantStatement | DefendantStatement;

const sideTitle: Record<PositionSide, string> = {
  claimant: "Recebimento do Autor",
  defendant: "Redução de Passivo do Réu",
};

const unweightedReason: Record<string, string> = {
  probabilities_not_provided: "as probabilidades dos cenários não foram informadas",
  probabilities_not_approved: "as probabilidades informadas não têm responsável pela aprovação",
  heuristic_score_is_not_probability:
    "há apenas um score heurístico, que não é convertido em probabilidade",
};

const confidenceLabel: Record<ComponentConfidence, string> = {
  "": "Não declarada",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const affectsLabel: Record<ImpactOut["affects"], string> = {
  value: "Valor",
  cost: "Custo",
  term: "Prazo",
  probability: "Probabilidade",
  contract: "Condição contratual",
};

const notAppliedReason: Record<string, string> = {
  same_dependency_group: "Mesma causa de outro impacto já aplicado",
  probability_is_an_approved_assumption:
    "Probabilidade é premissa aprovada por pessoa; fica como informação",
  contract_not_defined: "Contrato não definido",
  no_discounting_in_this_statement: "Este demonstrativo não desconta no tempo",
};

const sensitivityParameter: Record<string, string> = {
  gross_receipt: "Recebimento bruto",
  disbursement: "Desembolso",
  years: "Prazo",
  discount_rate: "Taxa de desconto",
};

const formatBaseDate = (iso: string) => iso.split("-").reverse().join("/");

/** Resultado principal e valor presente de um cenário, qualquer que seja o lado. */
function scenarioFigures(statement: Statement, scenarioId: string) {
  if (statement.side === "claimant") {
    const scenario = statement.scenarios.find((s) => s.id === scenarioId);
    return scenario
      ? {
          scenario,
          resultLabel: "Recebimento líquido",
          result: scenario.net_receipt,
          presentValue: scenario.net_present_value,
        }
      : null;
  }
  const scenario = statement.scenarios.find((s) => s.id === scenarioId);
  return scenario
    ? {
        scenario,
        resultLabel: "Redução líquida de passivo",
        result: scenario.net_reduction,
        presentValue: null,
      }
    : null;
}

function Money({ value, currency }: { value: string; currency: string }) {
  return (
    <span className={`tabular-nums ${value.startsWith("-") ? "text-risk-high" : ""}`}>
      {formatMoney(value, currency)}
    </span>
  );
}

function NotDefined({ field }: { field: Undefinable }) {
  return (
    <span className="text-muted-foreground">
      Não definido
      <span className="sr-only">
        {" "}
        ({field.reason === "contract_not_defined" ? "contrato não definido" : field.reason})
      </span>
    </span>
  );
}

export function EconomicsSection({
  opportunity,
  canWrite,
  openDetail,
  onOpenDetail,
  onCloseDetail,
  tableState,
  onTableState,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  /** `<execução>:<lado>:<cenário>` do valor aberto em tela inteira. */
  openDetail: string | null;
  onOpenDetail: (detail: string) => void;
  onCloseDetail: () => void;
  tableState: TableState;
  onTableState: (next: TableState, options?: { replace?: boolean }) => void;
}) {
  const titleId = useId();
  const runs = useQuery({
    queryKey: queryKeys.calculations(opportunity.id),
    queryFn: () => api.calculations(opportunity.id),
  });

  const [runId, side, ...rest] = openDetail?.split(":") ?? [];
  const scenarioId = rest.join(":");
  const openRun = runs.data?.find((run) => run.id === runId) ?? null;
  const openStatement =
    openRun && (side === "claimant" || side === "defendant") ? openRun.result[side] : null;
  const figures = openStatement ? scenarioFigures(openStatement, scenarioId) : null;

  const latest = runs.data?.[0];

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
        Etapa 5 · Avaliação econômica
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Demonstrativos Econômicos
        </h2>
        <Help topic="economics" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Recebimento do autor e redução de passivo do réu são calculados em separado, sem contrato:
        preço, retorno do investidor e remuneração permanecem não definidos. Cada valor abre a
        memória de cálculo.
      </p>
      <p
        role="note"
        className="mt-3 max-w-3xl rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
      >
        <span className="font-medium">Metodologia não homologada.</span> Os números decorrem apenas
        das premissas informadas abaixo. Não são preço, proposta nem recomendação.
      </p>

      <div className="mt-4">
        {runs.isPending && <Loading label="Carregando demonstrativos…" />}
        {runs.isError && <ErrorNotice error={runs.error} onRetry={() => runs.refetch()} />}
        {runs.data && runs.data.length === 0 && (
          <EmptyState
            title="Nenhum demonstrativo calculado"
            description={
              canWrite
                ? "Informe as premissas e os cenários abaixo. Nada é estimado automaticamente."
                : "Seu acesso permite consultar demonstrativos; o cálculo é reservado a analistas e revisores."
            }
          />
        )}
        {latest && <RunCard run={latest} onOpen={onOpenDetail} canWrite={canWrite} />}
      </div>

      {runs.data && runs.data.length > 0 && (
        <>
          <div className="mt-8 flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">Cenários Calculados</h3>
            <Help topic="scenariosTable" />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Todos os cenários de todas as execuções, inclusive as desatualizadas. Os valores são os
            gravados em cada execução; abrir a memória mostra como foram obtidos.
          </p>
          <div className="mt-3">
            <DataTable
              tableKey="calculation_scenarios"
              scopeId={opportunity.id}
              label="Cenários calculados"
              noun={{ one: "cenário", many: "cenários" }}
              state={tableState}
              onStateChange={onTableState}
              actionsWidth={170}
              rowActions={(row) => (
                <button
                  type="button"
                  className={secondaryButton}
                  aria-label={`Abrir memória do cenário ${String(row.values.scenario ?? "")}`}
                  onClick={() => onOpenDetail(row.refs?.detail ?? row.id)}
                >
                  Abrir Memória
                </button>
              )}
              emptyState={
                <EmptyState
                  title="Nenhum cenário com esses filtros"
                  description="Ajuste ou limpe os filtros para ver os cenários calculados."
                />
              }
            />
          </div>
        </>
      )}

      {canWrite && (
        <>
          <h3 className="mt-8 text-base font-semibold tracking-tight">Novo Demonstrativo</h3>
          <EconomicsForm opportunityId={opportunity.id} defaultSide={opportunity.position_side} />
        </>
      )}

      {openDetail && runs.data && (
        <FullscreenDetail
          eyebrow={
            openStatement ? `Memória de cálculo · ${sideTitle[openStatement.side]}` : "Memória"
          }
          title={figures ? figures.scenario.label : "Memória de Cálculo"}
          onBack={onCloseDetail}
        >
          {openRun && openStatement && figures ? (
            <CalculationMemory run={openRun} statement={openStatement} scenarioId={scenarioId} />
          ) : (
            <EmptyState
              title="Valor não encontrado"
              description="Esta execução ou cenário não existe mais neste dossiê. Volte e abra o valor novamente."
            />
          )}
        </FullscreenDetail>
      )}
    </section>
  );
}

function ExportButton({ run }: { run: CalculationRunOut }) {
  const exportRun = useMutation({
    mutationFn: () => api.exportCalculation(run.id),
    onSuccess: (blob) => downloadBlob(blob, `demonstrativo-${run.id.slice(0, 8)}.csv`),
  });
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-2">
        <Help topic="exportCalc" align="right" />
        <button
          type="button"
          className={secondaryButton}
          disabled={exportRun.isPending}
          onClick={() => exportRun.mutate()}
        >
          <Download aria-hidden="true" className="size-4" />
          {exportRun.isPending ? "Gerando…" : "Exportar CSV"}
        </button>
      </span>
      <span aria-live="polite" className="text-xs text-risk-critical">
        {exportRun.isError && "Não foi possível exportar. Tente novamente."}
      </span>
    </span>
  );
}

function MemoButton({ run }: { run: CalculationRunOut }) {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => api.createMemo(run.opportunity_id, { calculation_run_id: run.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memos(run.opportunity_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stages(run.opportunity_id) });
    },
  });
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className={secondaryButton}
        disabled={create.isPending}
        onClick={() => create.mutate()}
      >
        <FileText aria-hidden="true" className="size-4" />
        {create.isPending ? "Emitindo…" : "Emitir Memorando"}
      </button>
      <span aria-live="polite" className="text-xs">
        {create.isError && (
          <span className="text-risk-critical">Não foi possível emitir. Tente novamente.</span>
        )}
        {create.isSuccess && (
          <span className="text-risk-low">
            Memorando v{create.data.version} emitido. A decisão fica na etapa 6.
          </span>
        )}
      </span>
    </span>
  );
}

function RunBadges({ run }: { run: CalculationRunOut }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <Pill className="border-border text-muted-foreground">
        Fórmula <span translate="no">&nbsp;{run.formula_version}</span>
      </Pill>
      <Pill className="border-border text-muted-foreground">Dossiê v{run.dossier_version}</Pill>
      <Pill className="border-gold/40 bg-gold/10 text-gold">Não homologado</Pill>
      {run.stale && (
        <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">Desatualizado</Pill>
      )}
    </span>
  );
}

function RunCard({
  run,
  onOpen,
  canWrite,
}: {
  run: CalculationRunOut;
  onOpen: (detail: string) => void;
  canWrite: boolean;
}) {
  const statements = [run.result.claimant, run.result.defendant].filter(
    (statement): statement is Statement => statement !== null,
  );
  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Calculado em <span className="tabular-nums">{formatDateTime(run.created_at)}</span>
          </p>
          <div className="mt-2">
            <RunBadges run={run} />
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {canWrite && !run.stale && (
            <span className="inline-flex items-center pt-2">
              <Help topic="emitMemo" align="right" />
            </span>
          )}
          {canWrite && !run.stale && <MemoButton run={run} />}
          <ExportButton run={run} />
        </div>
      </div>
      {run.stale && (
        <p className="mt-3 rounded-md border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm">
          {run.stale_reason ?? "O dossiê mudou depois deste cálculo"}. O resultado continua
          consultável, mas não reflete os documentos atuais; calcule novamente.
        </p>
      )}
      {statements.map((statement) => (
        <StatementSummary
          key={statement.side}
          statement={statement}
          onOpen={(scenarioId) => onOpen(`${run.id}:${statement.side}:${scenarioId}`)}
        />
      ))}
    </article>
  );
}

function valueButton(label: string) {
  return {
    "aria-label": label,
    className:
      "rounded px-1 py-0.5 text-right font-medium underline decoration-primary/50 decoration-dotted underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  };
}

function StatementSummary({
  statement,
  onOpen,
}: {
  statement: Statement;
  onOpen: (scenarioId: string) => void;
}) {
  const currency = statement.currency;
  const isClaimant = statement.side === "claimant";
  const expected = isClaimant
    ? statement.weighted.expected_net_receipt
    : statement.weighted.expected_net_reduction;
  const expectedPresent = isClaimant ? statement.weighted.expected_net_present_value : null;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-base font-semibold tracking-tight">{sideTitle[statement.side]}</h4>
        <p className="text-xs text-muted-foreground">
          Data-base <span className="tabular-nums">{formatBaseDate(statement.base_date)}</span> ·{" "}
          {currency}
          {statement.discount_rate && (
            <> · desconto de {formatPercent(statement.discount_rate)} a.a.</>
          )}
        </p>
      </div>

      {!isClaimant && (
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">Exposição de referência:</span>{" "}
          <Money value={statement.reference_exposure} currency={currency} />
          {statement.reference_label && (
            <span className="text-muted-foreground"> — {statement.reference_label}</span>
          )}
        </p>
      )}

      <div className="mt-3">
        <TableFrame label={`Cenários — ${sideTitle[statement.side]}`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th scope="col" className={thClass}>
                  Cenário
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Probabilidade
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  {isClaimant ? "Recebimento Bruto" : "Desembolso"}
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  {isClaimant ? "Custos" : "Redução Bruta"}
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  <span className="inline-flex items-center gap-1.5">
                    {isClaimant ? "Recebimento Líquido" : "Redução Líquida"}
                    <Help
                      topic={isClaimant ? "netReceipt" : "netReduction"}
                      align="right"
                      side="bottom"
                    />
                  </span>
                </th>
                {isClaimant && (
                  <th scope="col" className={`${thClass} text-right`}>
                    Valor Presente
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {statement.scenarios.map((scenario) => {
                const figures = scenarioFigures(statement, scenario.id)!;
                return (
                  <tr key={scenario.id} className="border-b border-border/40">
                    <td className={`${tdClass} max-w-[280px] break-words`}>{scenario.label}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {scenario.probability === null ? (
                        <span className="text-muted-foreground">Não informada</span>
                      ) : (
                        formatPercent(scenario.probability)
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Money
                        value={
                          "gross_receipt" in scenario
                            ? scenario.gross_receipt
                            : scenario.disbursement
                        }
                        currency={currency}
                      />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Money
                        value={
                          "total_costs" in scenario
                            ? scenario.total_costs
                            : scenario.gross_reduction
                        }
                        currency={currency}
                      />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => onOpen(scenario.id)}
                        {...valueButton(
                          `Abrir memória de cálculo de ${figures.resultLabel.toLowerCase()} do cenário ${scenario.label}`,
                        )}
                      >
                        <Money value={figures.result} currency={currency} />
                      </button>
                    </td>
                    {isClaimant && (
                      <td className={`${tdClass} text-right`}>
                        {figures.presentValue === null ? (
                          <span className="text-muted-foreground">Sem taxa aprovada</span>
                        ) : (
                          <Money value={figures.presentValue} currency={currency} />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableFrame>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <dt className={labelClass}>Valor ponderado pelos cenários</dt>
          <dd className="mt-1 text-sm">
            {statement.weighted.available && expected !== null ? (
              <>
                <Money value={expected} currency={currency} />
                {expectedPresent !== null && (
                  <span className="text-muted-foreground">
                    {" "}
                    · valor presente <Money value={expectedPresent} currency={currency} />
                  </span>
                )}
                <span className="block text-xs text-muted-foreground">
                  Probabilidades aprovadas por {statement.probabilities_approved_by}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Não ponderado:{" "}
                {unweightedReason[statement.weighted.reason ?? ""] ??
                  "sem probabilidades aprovadas"}
                .
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Preço · Retorno do investidor</dt>
          <dd className="mt-1 text-sm">
            <NotDefined field={statement.contract.price} />
          </dd>
        </div>
        <div>
          <dt className={labelClass}>
            {isClaimant ? "Remuneração contratual" : "Receita da Evidia"}
          </dt>
          <dd className="mt-1 text-sm">
            <NotDefined
              field={isClaimant ? statement.contract.contractual_fee : statement.evidia_revenue}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}

const signLabel: Record<StatementStep["sign"], string> = {
  "+": "Soma",
  "-": "Subtrai",
  info: "Informativo",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

function CalculationMemory({
  run,
  statement,
  scenarioId,
}: {
  run: CalculationRunOut;
  statement: Statement;
  scenarioId: string;
}) {
  const figures = scenarioFigures(statement, scenarioId)!;
  const { scenario } = figures;
  const currency = statement.currency;
  const steps = scenario.steps ?? [];
  const hasPresentValue = steps.some((step) => step.present_value !== null);
  const isClaimant = statement.side === "claimant";

  const limitations = [
    "A metodologia econômica não está homologada: o resultado depende inteiramente das premissas informadas.",
    "Contrato não definido: preço, retorno do investidor e remuneração não fazem parte deste cálculo e não são tratados como zero.",
    !isClaimant &&
      "A redução de passivo é economia estimada do cliente; não é registrada como receita da Evidia.",
    scenario.probability === null
      ? "O cenário não tem probabilidade informada; não se presume êxito de 100%."
      : !statement.weighted.available &&
        `Valor ponderado indisponível: ${unweightedReason[statement.weighted.reason ?? ""] ?? "sem probabilidades aprovadas"}.`,
    statement.heuristic_score_ignored &&
      "Um score heurístico foi informado e ignorado: score não é probabilidade.",
    statement.discount_rate === null && "Sem taxa de desconto aprovada, não há valor presente.",
    ...(run.result.limitations
      ? run.result.limitations
          .filter((item) => item.code === "no_adversarial_analysis")
          .map((item) => item.message)
      : [
          "Execução anterior aos impactos e à sensibilidade (fórmula " +
            run.formula_version +
            "): calcule novamente para vê-los.",
        ]),
  ].filter((item): item is string => typeof item === "string");
  const impacts = scenario.impacts ?? [];
  const sensitivity = scenario.sensitivity ?? [];
  const hasOwnership = steps.some((step) => step.responsible || step.confidence);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={labelClass}>{figures.resultLabel}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              <Money value={figures.result} currency={currency} />
            </p>
            {figures.presentValue !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                Valor presente: <Money value={figures.presentValue} currency={currency} />
              </p>
            )}
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isClaimant
                ? "Quanto o autor receberia neste cenário depois dos custos informados, na data-base."
                : "Quanto o passivo do réu diminuiria neste cenário em relação à exposição de referência, depois dos custos ainda não incluídos no desembolso."}
            </p>
          </div>
          <ExportButton run={run} />
        </div>
        <div className="mt-4">
          <RunBadges run={run} />
        </div>
        {run.stale && (
          <p className="mt-3 rounded-md border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm">
            {run.stale_reason ?? "O dossiê mudou depois deste cálculo"}. A memória mostra o que foi
            calculado na versão {run.dossier_version} do dossiê.
          </p>
        )}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Posição">{positionLabel[statement.side]}</Fact>
          <Fact label="Cenário">{scenario.label}</Fact>
          <Fact label="Moeda e data-base">
            {currency} · <span className="tabular-nums">{formatBaseDate(statement.base_date)}</span>
          </Fact>
          <Fact label="Probabilidade do cenário">
            {scenario.probability === null ? "Não informada" : formatPercent(scenario.probability)}
          </Fact>
          <Fact label="Taxa de desconto">
            {statement.discount_rate === null
              ? "Não definida"
              : `${formatPercent(statement.discount_rate)} a.a. · aprovada por ${statement.discount_rate_approved_by}`}
          </Fact>
          <Fact label="Probabilidades aprovadas por">
            {statement.probabilities_approved_by ?? "Sem aprovação registrada"}
          </Fact>
          <Fact label="Arredondamento">{statement.rounding}</Fact>
          <Fact label="Calculado em">
            <span className="tabular-nums">{formatDateTime(run.created_at)}</span>
          </Fact>
        </dl>
      </section>

      <section>
        <h3 className="text-base font-semibold tracking-tight">Fórmula e Componentes</h3>
        <p className="mt-1 text-sm text-muted-foreground">{scenario.formula}.</p>
        {"present_value_formula" in scenario && scenario.present_value_formula && (
          <p className="mt-1 text-sm text-muted-foreground">{scenario.present_value_formula}.</p>
        )}
        {steps.length === 0 ? (
          <p className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
            Esta execução é anterior à memória detalhada (fórmula{" "}
            <span translate="no">{run.formula_version}</span>). Calcule novamente para ver cada
            componente; os totais acima permanecem os registrados.
          </p>
        ) : (
          <div className="mt-3">
            <TableFrame label="Componentes do cálculo">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>
                      Operação
                    </th>
                    <th scope="col" className={thClass}>
                      Componente
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      Valor
                    </th>
                    {hasPresentValue && (
                      <>
                        <th scope="col" className={`${thClass} text-right`}>
                          Prazo
                        </th>
                        <th scope="col" className={`${thClass} text-right`}>
                          Valor Presente
                        </th>
                      </>
                    )}
                    <th scope="col" className={thClass}>
                      Fonte
                    </th>
                    {hasOwnership && (
                      <>
                        <th scope="col" className={thClass}>
                          Responsável
                        </th>
                        <th scope="col" className={thClass}>
                          Confiança
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, index) => (
                    <tr key={`${step.key}-${index}`} className="border-b border-border/40">
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span aria-hidden="true" className="mr-1.5 inline-block w-3 font-mono">
                          {step.sign === "+" ? "+" : step.sign === "-" ? "−" : "·"}
                        </span>
                        {signLabel[step.sign]}
                      </td>
                      <td className={`${tdClass} break-words`}>
                        {step.label}
                        {step.sign === "info" && (
                          <span className="block text-xs text-muted-foreground">
                            Já contido no desembolso: não é deduzido de novo.
                          </span>
                        )}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <Money value={step.amount} currency={currency} />
                      </td>
                      {hasPresentValue && (
                        <>
                          <td className={`${tdClass} text-right tabular-nums`}>
                            {step.years === null ? "—" : formatYears(step.years)}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {step.present_value === null ? (
                              "—"
                            ) : (
                              <Money value={step.present_value} currency={currency} />
                            )}
                          </td>
                        </>
                      )}
                      <td className={`${tdClass} break-words text-muted-foreground`}>
                        {step.source || "Não informada"}
                      </td>
                      {hasOwnership && (
                        <>
                          <td className={`${tdClass} break-words`}>
                            {step.responsible || (
                              <span className="text-muted-foreground">Não informado</span>
                            )}
                          </td>
                          <td className={tdClass}>{confidenceLabel[step.confidence ?? ""]}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-surface/60 font-semibold">
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <span aria-hidden="true" className="mr-1.5 inline-block w-3 font-mono">
                        =
                      </span>
                      Resultado
                    </td>
                    <td className={tdClass}>{figures.resultLabel}</td>
                    <td className={`${tdClass} text-right`}>
                      <Money value={figures.result} currency={currency} />
                    </td>
                    {hasPresentValue && (
                      <>
                        <td className={tdClass} />
                        <td className={`${tdClass} text-right`}>
                          {figures.presentValue !== null && (
                            <Money value={figures.presentValue} currency={currency} />
                          )}
                        </td>
                      </>
                    )}
                    <td className={tdClass} />
                    {hasOwnership && (
                      <>
                        <td className={tdClass} />
                        <td className={tdClass} />
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </TableFrame>
          </div>
        )}
      </section>

      {impacts.length > 0 && (
        <section>
          <h3 className="text-base font-semibold tracking-tight">Impactos Informados</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Impactos com a mesma causa não se somam: dentro de um grupo e de uma dimensão, entra
            apenas o de maior efeito. Os demais ficam registrados com o motivo.
          </p>
          <div className="mt-3">
            <TableFrame label="Impactos do cenário">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr>
                    {["Impacto", "Causa (Grupo)", "Incide em"].map((head) => (
                      <th key={head} scope="col" className={thClass}>
                        {head}
                      </th>
                    ))}
                    <th scope="col" className={`${thClass} text-right`}>
                      Tamanho
                    </th>
                    {["Situação", "Fonte", "Responsável", "Confiança"].map((head) => (
                      <th key={head} scope="col" className={thClass}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {impacts.map((impact) => (
                    <tr key={impact.id} className="border-b border-border/40">
                      <td className={`${tdClass} max-w-[260px] break-words`}>{impact.label}</td>
                      <td className={`${tdClass} break-words`}>{impact.dependency_group}</td>
                      <td className={tdClass}>{affectsLabel[impact.affects]}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {impact.affects === "term" && impact.years !== null ? (
                          formatYears(impact.years)
                        ) : impact.amount !== null ? (
                          <Money value={impact.amount} currency={currency} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${tdClass} max-w-[240px] break-words`}>
                        {impact.applied ? (
                          <Pill className="border-risk-low/30 bg-risk-low/15 text-risk-low">
                            Aplicado
                          </Pill>
                        ) : (
                          <>
                            <Pill className="border-border text-muted-foreground">
                              Não aplicado
                            </Pill>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {notAppliedReason[impact.not_applied_reason ?? ""] ??
                                impact.not_applied_reason}
                            </span>
                          </>
                        )}
                      </td>
                      <td className={`${tdClass} max-w-[260px] break-words text-muted-foreground`}>
                        {impact.source.label || "Premissa manual"}
                      </td>
                      <td className={`${tdClass} break-words`}>
                        {impact.responsible || (
                          <span className="text-muted-foreground">Não informado</span>
                        )}
                      </td>
                      <td className={tdClass}>{confidenceLabel[impact.confidence]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableFrame>
          </div>
        </section>
      )}

      {sensitivity.length > 0 && (
        <section>
          <h3 className="text-base font-semibold tracking-tight">Sensibilidade</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Cada linha muda uma única premissa e mantém as demais. Calculado pelo servidor com a
            mesma fórmula do resultado.
          </p>
          <div className="mt-3">
            <TableFrame label="Sensibilidade do cenário">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>
                      Premissa
                    </th>
                    <th scope="col" className={thClass}>
                      Variação
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      {figures.resultLabel}
                    </th>
                    {figures.presentValue !== null && (
                      <th scope="col" className={`${thClass} text-right`}>
                        Valor Presente
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.map((row) => {
                    const result = row.net_receipt ?? row.net_reduction;
                    return (
                      <tr
                        key={`${row.parameter}${row.change}`}
                        className="border-b border-border/40"
                      >
                        <td className={tdClass}>
                          {sensitivityParameter[row.parameter] ?? row.parameter}
                        </td>
                        <td className={`${tdClass} tabular-nums`}>{row.change}</td>
                        <td className={`${tdClass} text-right`}>
                          {result === undefined ? (
                            "—"
                          ) : (
                            <Money value={result} currency={currency} />
                          )}
                        </td>
                        {figures.presentValue !== null && (
                          <td className={`${tdClass} text-right`}>
                            {row.net_present_value ? (
                              <Money value={row.net_present_value} currency={currency} />
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableFrame>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold tracking-tight">
            Campos que Dependem de Contrato
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Fact label="Preço">
              <NotDefined field={statement.contract.price} />
            </Fact>
            <Fact label="Retorno do investidor">
              <NotDefined field={statement.contract.investor_return} />
            </Fact>
            <Fact label="Remuneração contratual">
              <NotDefined field={statement.contract.contractual_fee} />
            </Fact>
            {statement.side === "defendant" && (
              <Fact label="Receita da Evidia">
                <NotDefined field={statement.evidia_revenue} />
              </Fact>
            )}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            “Não definido” indica ausência de contrato. Não equivale a zero.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold tracking-tight">Limitações e Campos Ausentes</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
            {limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
