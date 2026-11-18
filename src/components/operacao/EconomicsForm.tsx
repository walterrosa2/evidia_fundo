import { useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api, queryKeys } from "@/lib/operacao/api";
import {
  buildEconomicsRequest,
  emptyCost,
  emptyDraft,
  emptyImpact,
  emptyScenario,
  impactNeedsNumber,
  type CostDraft,
  type EconomicsDraft,
  type FieldErrors,
  type ImpactDraft,
  type ScenarioDraft,
} from "@/lib/operacao/economicsForm";
import type { ComponentConfidence, ImpactAffects, PositionSide } from "@/lib/operacao/types";
import {
  ErrorNotice,
  Help,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "./primitives";

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const affectsOptions: { value: ImpactAffects; label: string }[] = [
  { value: "value", label: "Valor" },
  { value: "cost", label: "Custo adicional" },
  { value: "term", label: "Prazo" },
  { value: "probability", label: "Probabilidade (informativo)" },
  { value: "contract", label: "Condição contratual (informativo)" },
];

const impactAmountCopy: Record<ImpactAffects, { label: string; placeholder: string }> = {
  value: { label: "Variação (R$, com sinal)", placeholder: "Ex.: -100.000,00…" },
  cost: { label: "Custo adicional (R$)", placeholder: "Ex.: 20.000,00…" },
  term: { label: "Variação do prazo (anos)", placeholder: "Ex.: 1 ou -0,5…" },
  probability: { label: "Sem valor", placeholder: "" },
  contract: { label: "Sem valor", placeholder: "" },
};

function ConfidenceSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ComponentConfidence;
  onChange: (value: ComponentConfidence) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as ComponentConfidence)}
      className={inputClass}
    >
      <option value="">Não declarada</option>
      <option value="low">Baixa</option>
      <option value="medium">Média</option>
      <option value="high">Alta</option>
    </select>
  );
}

const sideCopy = {
  claimant: {
    tab: "Recebimento do Autor",
    amount: "Recebimento bruto",
    costs: "Custos do cenário",
    submit: "Calcular Recebimento do Autor",
  },
  defendant: {
    tab: "Redução de Passivo do Réu",
    amount: "Desembolso no cenário",
    costs: "Custos incrementais",
    submit: "Calcular Redução de Passivo",
  },
} as const;

/**
 * Entrada de premissas dos demonstrativos. Um lado por execução: autor e réu são
 * independentes e um nunca é derivado do outro por subtração (D1).
 */
export function EconomicsForm({
  opportunityId,
  defaultSide,
}: {
  opportunityId: string;
  defaultSide: PositionSide;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const nextKey = useRef(2);
  const [side, setSide] = useState<PositionSide>(defaultSide);
  const [draft, setDraft] = useState<EconomicsDraft>(() => emptyDraft(today()));
  const [errors, setErrors] = useState<FieldErrors>({});

  const run = useMutation({
    mutationFn: (body: Parameters<typeof api.runCalculation>[1]) =>
      api.runCalculation(opportunityId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.calculations(opportunityId) }),
  });

  const sources = useQuery({
    queryKey: queryKeys.impactSources(opportunityId),
    queryFn: () => api.impactSources(opportunityId),
  });

  const copy = sideCopy[side];
  const patch = (changes: Partial<EconomicsDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const patchScenario = (key: number, changes: Partial<ScenarioDraft>) =>
    setDraft((d) => ({
      ...d,
      scenarios: d.scenarios.map((s) => (s.key === key ? { ...s, ...changes } : s)),
    }));
  const patchCost = (scenario: ScenarioDraft, key: number, changes: Partial<CostDraft>) =>
    patchScenario(scenario.key, {
      costs: scenario.costs.map((c) => (c.key === key ? { ...c, ...changes } : c)),
    });

  const patchImpact = (scenario: ScenarioDraft, key: number, changes: Partial<ImpactDraft>) =>
    patchScenario(scenario.key, {
      impacts: scenario.impacts.map((i) => (i.key === key ? { ...i, ...changes } : i)),
    });

  const field = (name: string) => ({
    id: `${id}-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="mt-1 text-xs text-risk-critical">
        {errors[name]}
      </p>
    ) : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = buildEconomicsRequest(side, draft);
    if (result.errors) {
      setErrors(result.errors);
      // Leva o foco ao primeiro campo com problema.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    setErrors({});
    run.mutate(result.body);
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div role="tablist" aria-label="Lado do demonstrativo" className="flex flex-wrap gap-1.5">
        {(["claimant", "defendant"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={side === value}
            onClick={() => {
              setSide(value);
              setErrors({});
            }}
            className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              side === value
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-secondary"
            }`}
          >
            {sideCopy[value].tab}
          </button>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        Um lado por cálculo
        <Help topic="sideTabs" align="left" side="bottom" />
      </p>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Premissas</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`${id}-baseDate`} className={labelClass}>
              Data-base
            </label>
            <input
              {...field("baseDate")}
              type="date"
              value={draft.baseDate}
              onChange={(event) => patch({ baseDate: event.target.value })}
              className={inputClass}
            />
            {fieldError("baseDate")}
          </div>
          <div>
            <label
              htmlFor={`${id}-rate`}
              className={`${labelClass} inline-flex items-center gap-1.5`}
            >
              Taxa de desconto (% a.a.)
              <Help topic="discountRate" />
            </label>
            <input
              {...field("rate")}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft.rate}
              onChange={(event) => patch({ rate: event.target.value })}
              placeholder="Ex.: 15…"
              className={inputClass}
            />
            {fieldError("rate")}
          </div>
          <div>
            <label htmlFor={`${id}-rateApprovedBy`} className={labelClass}>
              Taxa aprovada por
            </label>
            <input
              {...field("rateApprovedBy")}
              type="text"
              autoComplete="off"
              value={draft.rateApprovedBy}
              onChange={(event) => patch({ rateApprovedBy: event.target.value })}
              placeholder="Nome do responsável…"
              className={inputClass}
            />
            {fieldError("rateApprovedBy")}
          </div>
          <div>
            <label
              htmlFor={`${id}-probabilitiesApprovedBy`}
              className={`${labelClass} inline-flex items-center gap-1.5`}
            >
              Probabilidades aprovadas por
              <Help topic="probabilitiesApproval" align="right" />
            </label>
            <input
              {...field("probabilitiesApprovedBy")}
              type="text"
              autoComplete="off"
              value={draft.probabilitiesApprovedBy}
              onChange={(event) => patch({ probabilitiesApprovedBy: event.target.value })}
              placeholder="Nome do responsável…"
              className={inputClass}
            />
          </div>
          {side === "defendant" && (
            <>
              <div>
                <label
                  htmlFor={`${id}-reference`}
                  className={`${labelClass} inline-flex items-center gap-1.5`}
                >
                  Exposição de referência (R$)
                  <Help topic="referenceExposure" />
                </label>
                <input
                  {...field("reference")}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.reference}
                  onChange={(event) => patch({ reference: event.target.value })}
                  placeholder="Ex.: 1.000.000,00…"
                  className={`${inputClass} tabular-nums`}
                />
                {fieldError("reference")}
              </div>
              <div className="sm:col-span-1 lg:col-span-3">
                <label htmlFor={`${id}-referenceLabel`} className={labelClass}>
                  O que a referência representa
                </label>
                <input
                  id={`${id}-referenceLabel`}
                  type="text"
                  autoComplete="off"
                  maxLength={300}
                  value={draft.referenceLabel}
                  onChange={(event) => patch({ referenceLabel: event.target.value })}
                  placeholder="Ex.: Pedido atualizado na data-base…"
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>
      </fieldset>

      <div className="mt-6 space-y-4">
        {draft.scenarios.map((scenario, index) => {
          const at = `scenarios.${index}`;
          return (
            <fieldset key={scenario.key} className="rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">Cenário {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={side === "claimant" ? "" : "lg:col-span-2"}>
                  <label htmlFor={`${id}-${at}.label`} className={labelClass}>
                    Nome do cenário
                  </label>
                  <input
                    {...field(`${at}.label`)}
                    type="text"
                    autoComplete="off"
                    maxLength={200}
                    value={scenario.label}
                    onChange={(event) => patchScenario(scenario.key, { label: event.target.value })}
                    placeholder={side === "claimant" ? "Ex.: Procedência total…" : "Ex.: Acordo…"}
                    className={inputClass}
                  />
                  {fieldError(`${at}.label`)}
                </div>
                <div>
                  <label
                    htmlFor={`${id}-${at}.amount`}
                    className={`${labelClass} inline-flex items-center gap-1.5`}
                  >
                    {copy.amount} (R$)
                    <Help topic={side === "claimant" ? "grossReceipt" : "disbursement"} />
                  </label>
                  <input
                    {...field(`${at}.amount`)}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={scenario.amount}
                    onChange={(event) =>
                      patchScenario(scenario.key, { amount: event.target.value })
                    }
                    placeholder="Ex.: 700.000,00…"
                    className={`${inputClass} tabular-nums`}
                  />
                  {fieldError(`${at}.amount`)}
                </div>
                {side === "claimant" && (
                  <div>
                    <label htmlFor={`${id}-${at}.years`} className={labelClass}>
                      Prazo (anos)
                    </label>
                    <input
                      {...field(`${at}.years`)}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={scenario.years}
                      onChange={(event) =>
                        patchScenario(scenario.key, { years: event.target.value })
                      }
                      placeholder="Ex.: 2…"
                      className={`${inputClass} tabular-nums`}
                    />
                    {fieldError(`${at}.years`)}
                  </div>
                )}
                <div>
                  <label htmlFor={`${id}-${at}.probability`} className={labelClass}>
                    Probabilidade (%)
                  </label>
                  <input
                    {...field(`${at}.probability`)}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={scenario.probability}
                    onChange={(event) =>
                      patchScenario(scenario.key, { probability: event.target.value })
                    }
                    placeholder="Opcional…"
                    className={`${inputClass} tabular-nums`}
                  />
                  {fieldError(`${at}.probability`)}
                </div>
                <div className="lg:col-span-2">
                  <label htmlFor={`${id}-${at}.source`} className={labelClass}>
                    Fonte do valor
                  </label>
                  <input
                    id={`${id}-${at}.source`}
                    type="text"
                    autoComplete="off"
                    maxLength={300}
                    value={scenario.source}
                    onChange={(event) =>
                      patchScenario(scenario.key, { source: event.target.value })
                    }
                    placeholder="Ex.: Cálculo do contador, fls. 210…"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-${at}.responsible`} className={labelClass}>
                    Responsável pelo valor
                  </label>
                  <input
                    id={`${id}-${at}.responsible`}
                    type="text"
                    autoComplete="off"
                    maxLength={200}
                    value={scenario.responsible}
                    onChange={(event) =>
                      patchScenario(scenario.key, { responsible: event.target.value })
                    }
                    placeholder="Nome…"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-${at}.confidence`} className={labelClass}>
                    Confiança no valor
                  </label>
                  <ConfidenceSelect
                    id={`${id}-${at}.confidence`}
                    value={scenario.confidence}
                    onChange={(confidence) => patchScenario(scenario.key, { confidence })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className={labelClass}>{copy.costs}</p>
                {scenario.costs.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Nenhum custo informado.</p>
                )}
                <ul className="mt-2 space-y-3">
                  {scenario.costs.map((cost, costIndex) => {
                    const costAt = `${at}.costs.${costIndex}`;
                    return (
                      <li
                        key={cost.key}
                        className="grid gap-3 rounded-md border border-border/60 bg-surface/40 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]"
                      >
                        <div>
                          <label htmlFor={`${id}-${costAt}.label`} className={labelClass}>
                            Custo
                          </label>
                          <input
                            {...field(`${costAt}.label`)}
                            type="text"
                            autoComplete="off"
                            maxLength={200}
                            value={cost.label}
                            onChange={(event) =>
                              patchCost(scenario, cost.key, { label: event.target.value })
                            }
                            placeholder="Ex.: Perícia…"
                            className={inputClass}
                          />
                          {fieldError(`${costAt}.label`)}
                        </div>
                        <div>
                          <label htmlFor={`${id}-${costAt}.amount`} className={labelClass}>
                            Valor (R$)
                          </label>
                          <input
                            {...field(`${costAt}.amount`)}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={cost.amount}
                            onChange={(event) =>
                              patchCost(scenario, cost.key, { amount: event.target.value })
                            }
                            placeholder="Ex.: 50.000,00…"
                            className={`${inputClass} tabular-nums`}
                          />
                          {fieldError(`${costAt}.amount`)}
                        </div>
                        <div>
                          <label htmlFor={`${id}-${costAt}.source`} className={labelClass}>
                            Fonte da estimativa
                          </label>
                          <input
                            id={`${id}-${costAt}.source`}
                            type="text"
                            autoComplete="off"
                            maxLength={300}
                            value={cost.source}
                            onChange={(event) =>
                              patchCost(scenario, cost.key, { source: event.target.value })
                            }
                            placeholder="Ex.: Proposta do perito…"
                            className={inputClass}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            aria-label={`Remover custo ${costIndex + 1} do cenário ${index + 1}`}
                            onClick={() =>
                              patchScenario(scenario.key, {
                                costs: scenario.costs.filter((c) => c.key !== cost.key),
                              })
                            }
                            className={`${secondaryButton} px-2.5`}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                        <div>
                          <label htmlFor={`${id}-${costAt}.responsible`} className={labelClass}>
                            Responsável
                          </label>
                          <input
                            id={`${id}-${costAt}.responsible`}
                            type="text"
                            autoComplete="off"
                            maxLength={200}
                            value={cost.responsible}
                            onChange={(event) =>
                              patchCost(scenario, cost.key, { responsible: event.target.value })
                            }
                            placeholder="Nome…"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${id}-${costAt}.confidence`} className={labelClass}>
                            Confiança
                          </label>
                          <ConfidenceSelect
                            id={`${id}-${costAt}.confidence`}
                            value={cost.confidence}
                            onChange={(confidence) => patchCost(scenario, cost.key, { confidence })}
                          />
                        </div>
                        {side === "defendant" && (
                          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
                            <input
                              type="checkbox"
                              className="size-4 accent-[var(--primary)]"
                              checked={cost.included}
                              onChange={(event) =>
                                patchCost(scenario, cost.key, { included: event.target.checked })
                              }
                            />
                            Já está contido no desembolso informado (não deduzir de novo)
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className={`${labelClass} mt-5 inline-flex items-center gap-1.5`}>
                  Impactos de achados e vínculos
                  <Help topic="impacts" />
                </p>
                {scenario.impacts.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Nenhum impacto informado.</p>
                )}
                <ul className="mt-2 space-y-3">
                  {scenario.impacts.map((impact, impactIndex) => {
                    const impactAt = `${at}.impacts.${impactIndex}`;
                    const needsNumber = impactNeedsNumber(impact.affects);
                    return (
                      <li
                        key={impact.key}
                        className="grid gap-3 rounded-md border border-border/60 bg-surface/40 p-3 sm:grid-cols-2 lg:grid-cols-4"
                      >
                        <div className="lg:col-span-2">
                          <label htmlFor={`${id}-${impactAt}.label`} className={labelClass}>
                            Impacto
                          </label>
                          <input
                            {...field(`${impactAt}.label`)}
                            type="text"
                            autoComplete="off"
                            maxLength={200}
                            value={impact.label}
                            onChange={(event) =>
                              patchImpact(scenario, impact.key, { label: event.target.value })
                            }
                            placeholder="Ex.: Nulidade da citação reduz o valor…"
                            className={inputClass}
                          />
                          {fieldError(`${impactAt}.label`)}
                        </div>
                        <div>
                          <label htmlFor={`${id}-${impactAt}.group`} className={labelClass}>
                            Causa (grupo de dependência)
                          </label>
                          <input
                            {...field(`${impactAt}.group`)}
                            type="text"
                            autoComplete="off"
                            maxLength={80}
                            value={impact.group}
                            onChange={(event) =>
                              patchImpact(scenario, impact.key, { group: event.target.value })
                            }
                            placeholder="Ex.: citação…"
                            className={inputClass}
                          />
                          {fieldError(`${impactAt}.group`)}
                        </div>
                        <div>
                          <label htmlFor={`${id}-${impactAt}.affects`} className={labelClass}>
                            Incide em
                          </label>
                          <select
                            id={`${id}-${impactAt}.affects`}
                            value={impact.affects}
                            onChange={(event) =>
                              patchImpact(scenario, impact.key, {
                                affects: event.target.value as ImpactAffects,
                              })
                            }
                            className={inputClass}
                          >
                            {affectsOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`${id}-${impactAt}.amount`} className={labelClass}>
                            {impactAmountCopy[impact.affects].label}
                          </label>
                          <input
                            {...field(`${impactAt}.amount`)}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            disabled={!needsNumber}
                            value={needsNumber ? impact.amount : ""}
                            onChange={(event) =>
                              patchImpact(scenario, impact.key, { amount: event.target.value })
                            }
                            placeholder={impactAmountCopy[impact.affects].placeholder}
                            className={`${inputClass} tabular-nums disabled:opacity-50`}
                          />
                          {fieldError(`${impactAt}.amount`)}
                        </div>
                        <div>
                          <label htmlFor={`${id}-${impactAt}.source`} className={labelClass}>
                            Fonte no dossiê
                          </label>
                          <select
                            id={`${id}-${impactAt}.source`}
                            value={impact.source}
                            onChange={(event) =>
                              patchImpact(scenario, impact.key, { source: event.target.value })
                            }
                            className={inputClass}
                          >
                            <option value="manual">Premissa manual (sem fonte)</option>
                            {(sources.data ?? []).map((source) => (
                              <option
                                key={`${source.type}:${source.id}`}
                                value={`${source.type}:${source.id}`}
                              >
                                {source.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Só aparecem fontes já validadas por pessoa.
                          </p>
                        </div>
                        <div>
                          <label htmlFor={`${id}-${impactAt}.responsible`} className={labelClass}>
                            Responsável
                          </label>
                          <input
                            id={`${id}-${impactAt}.responsible`}
                            type="text"
                            autoComplete="off"
                            maxLength={200}
                            value={impact.responsible}
                            onChange={(event) =>
                              patchImpact(scenario, impact.key, { responsible: event.target.value })
                            }
                            placeholder="Nome…"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${id}-${impactAt}.confidence`} className={labelClass}>
                            Confiança
                          </label>
                          <ConfidenceSelect
                            id={`${id}-${impactAt}.confidence`}
                            value={impact.confidence}
                            onChange={(confidence) =>
                              patchImpact(scenario, impact.key, { confidence })
                            }
                          />
                        </div>
                        <div className="flex items-end sm:col-span-2 lg:col-span-4">
                          <button
                            type="button"
                            className={secondaryButton}
                            onClick={() =>
                              patchScenario(scenario.key, {
                                impacts: scenario.impacts.filter((i) => i.key !== impact.key),
                              })
                            }
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                            Remover Impacto {impactIndex + 1} do Cenário {index + 1}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() =>
                      patchScenario(scenario.key, {
                        costs: [...scenario.costs, emptyCost(nextKey.current++)],
                      })
                    }
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Adicionar Custo
                  </button>
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() =>
                      patchScenario(scenario.key, {
                        impacts: [...scenario.impacts, emptyImpact(nextKey.current++)],
                      })
                    }
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Adicionar Impacto
                  </button>
                  {draft.scenarios.length > 1 && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() =>
                        patch({ scenarios: draft.scenarios.filter((s) => s.key !== scenario.key) })
                      }
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Remover Cenário {index + 1}
                    </button>
                  )}
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={secondaryButton}
          onClick={() =>
            patch({ scenarios: [...draft.scenarios, emptyScenario(nextKey.current++)] })
          }
        >
          <Plus aria-hidden="true" className="size-4" />
          Adicionar Cenário
        </button>
        <button type="submit" disabled={run.isPending} className={primaryButton}>
          {run.isPending ? (
            <>
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Calculando…
            </>
          ) : (
            copy.submit
          )}
        </button>
      </div>

      <div aria-live="polite" className="mt-3">
        {Object.keys(errors).length > 0 && (
          <p className="text-sm text-risk-critical">
            Revise os campos destacados antes de calcular.
          </p>
        )}
        {run.isError && <ErrorNotice error={run.error} />}
        {run.isSuccess && (
          <p className="text-sm text-risk-low">
            Demonstrativo calculado e registrado. O resultado aparece logo acima.
          </p>
        )}
      </div>
    </form>
  );
}
