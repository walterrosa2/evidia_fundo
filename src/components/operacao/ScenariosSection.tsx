import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { api, ApiError, documentContentUrl, queryKeys } from "@/lib/operacao/api";
import { citableVersions, engineStatusLabel } from "@/lib/operacao/engines";
import { formatDateTime, formatPages, positionLabel } from "@/lib/operacao/labels";
import {
  confidenceLabel,
  sideStatusClasses,
  sideStatusLabel,
  sideSummary,
} from "@/lib/operacao/scenarios";
import type {
  OpportunityDetail,
  ParticipantOut,
  PleaOut,
  PositionSide,
  ScenarioRunOut,
  ScenarioSideView,
} from "@/lib/operacao/types";
import {
  EmptyState,
  ErrorNotice,
  FullscreenDetail,
  Help,
  inputClass,
  labelClass,
  Loading,
  Pill,
  primaryButton,
  secondaryButton,
  WithHelp,
} from "./primitives";

const optionClass = "bg-popover text-popover-foreground";

export function ScenariosSection({
  opportunity,
  canWrite,
  open,
  onOpen,
  onClose,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const pleas = useQuery({
    queryKey: queryKeys.pleas(opportunity.id),
    queryFn: () => api.pleas(opportunity.id),
  });

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
        Etapa 4 · Contraditório
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Contraditório Bilateral
        </h2>
        <Help topic="scenarios" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Autor e réu são simulados em cenários independentes, por participante e por pedido, sobre a
        mesma base de documentos. O lado simulado é o papel de quem argumenta, não a posição
        econômica avaliada nesta oportunidade ({positionLabel[opportunity.position_side]}).
      </p>
      <p className="mt-3 text-sm">
        Pedidos individualizados:{" "}
        <span className="font-medium tabular-nums">{pleas.data ? pleas.data.length : "…"}</span>
      </p>
      {pleas.isError && (
        <div className="mt-2">
          <ErrorNotice error={pleas.error} onRetry={() => pleas.refetch()} />
        </div>
      )}
      <WithHelp topic="scenariosPanel" className="mt-3">
        <button type="button" onClick={onOpen} className={secondaryButton}>
          <Scale aria-hidden="true" className="size-4" />
          Abrir Contraditório
        </button>
      </WithHelp>

      {open && (
        <FullscreenDetail eyebrow="Contraditório" title="Contraditório Bilateral" onBack={onClose}>
          <Workspace
            opportunity={opportunity}
            pleas={pleas.data ?? []}
            loading={pleas.isPending}
            canWrite={canWrite}
          />
        </FullscreenDetail>
      )}
    </section>
  );
}

function Workspace({
  opportunity,
  pleas,
  loading,
  canWrite,
}: {
  opportunity: OpportunityDetail;
  pleas: PleaOut[];
  loading: boolean;
  canWrite: boolean;
}) {
  const participants = useQuery({
    queryKey: queryKeys.participants(opportunity.id),
    queryFn: () => api.participants(opportunity.id),
  });
  const runs = useQuery({
    queryKey: queryKeys.scenarioRuns(opportunity.id),
    queryFn: () => api.scenarioRuns(opportunity.id),
  });
  const people = participants.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <p
        role="note"
        className="max-w-3xl rounded-md border border-border bg-surface px-3 py-2 text-sm"
      >
        Cenário não executado fica como “não analisado”: a ausência de argumentos não indica êxito
        nem risco zero. Argumento sem evidência no dossiê é hipótese a validar. Conclusões de um
        lado não entram como fatos no outro.
      </p>
      {canWrite && <NewPlea opportunity={opportunity} people={people} />}
      <div className="mt-6 space-y-6">
        {(loading || participants.isPending) && <Loading label="Carregando pedidos…" />}
        {!loading && pleas.length === 0 && (
          <EmptyState
            title="Nenhum pedido individualizado"
            description="Cadastre o pedido e quem o formula contra quem. Com vários autores ou réus, cada participante tem o próprio cenário."
          />
        )}
        {pleas.map((plea) => (
          <PleaCard
            key={plea.id}
            plea={plea}
            opportunity={opportunity}
            people={people}
            runs={(runs.data ?? []).filter((run) => run.plea_id === plea.id)}
            canWrite={canWrite}
          />
        ))}
      </div>
    </div>
  );
}

function NewPlea({
  opportunity,
  people,
}: {
  opportunity: OpportunityDetail;
  people: ParticipantOut[];
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [claimants, setClaimants] = useState<string[]>([]);
  const [defendants, setDefendants] = useState<string[]>([]);
  const create = useMutation({
    mutationFn: () =>
      api.createPlea(opportunity.id, {
        title: title.trim(),
        claimant_participant_ids: claimants,
        defendant_participant_ids: defendants,
      }),
    onSuccess: () => {
      setTitle("");
      setClaimants([]);
      setDefendants([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.pleas(opportunity.id) });
    },
  });
  const toggle = (list: string[], set: (next: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  if (people.length < 2) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Para cadastrar um pedido, registre antes os participantes (autor e réu) em Vínculos e
        Qualificação Técnica.
      </p>
    );
  }
  const group = (
    legend: string,
    list: string[],
    set: (next: string[]) => void,
    other: string[],
  ) => (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="mt-1.5 max-h-40 space-y-0.5 overflow-auto rounded-md border border-border p-2">
        {people.map((person) => (
          <label
            key={person.id}
            className={`flex min-h-9 items-center gap-2 rounded px-2 text-sm ${
              other.includes(person.id) ? "opacity-50" : "cursor-pointer hover:bg-secondary/40"
            }`}
          >
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={list.includes(person.id)}
              disabled={other.includes(person.id)}
              onChange={() => toggle(list, set, person.id)}
            />
            <span className="min-w-0 truncate">{person.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form
      aria-label="Cadastrar pedido"
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim().length >= 3 && claimants.length && defendants.length) create.mutate();
      }}
      className="mt-4 rounded-xl border border-border bg-card p-4"
    >
      <label htmlFor={`${id}-title`} className={labelClass}>
        Pedido
      </label>
      <input
        id={`${id}-title`}
        type="text"
        autoComplete="off"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Ex.: indenização por atraso na entrega…"
        className={inputClass}
      />
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {group("Quem pede (autores)", claimants, setClaimants, defendants)}
        {group("Contra quem (réus)", defendants, setDefendants, claimants)}
      </div>
      <div aria-live="polite" className="mt-2">
        {create.isError && <ErrorNotice error={create.error} />}
      </div>
      <button
        type="submit"
        disabled={
          create.isPending || title.trim().length < 3 || !claimants.length || !defendants.length
        }
        className={`${primaryButton} mt-3`}
      >
        {create.isPending ? "Cadastrando…" : "Cadastrar Pedido"}
      </button>
    </form>
  );
}

function PleaCard({
  plea,
  opportunity,
  people,
  runs,
  canWrite,
}: {
  plea: PleaOut;
  opportunity: OpportunityDetail;
  people: ParticipantOut[];
  runs: ScenarioRunOut[];
  canWrite: boolean;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const name = (participantId: string) =>
    people.find((p) => p.id === participantId)?.name ?? "Participante";
  const comparison = useQuery({
    queryKey: queryKeys.pleaComparison(plea.id),
    queryFn: () => api.pleaComparison(plea.id),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.scenarioRuns(opportunity.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.pleaComparison(plea.id) });
  };
  const [who, setWho] = useState("");
  const [method, setMethod] = useState<"manual" | "model">("manual");
  const side: PositionSide | null = plea.claimant_participant_ids.includes(who)
    ? "claimant"
    : plea.defendant_participant_ids.includes(who)
      ? "defendant"
      : null;
  const create = useMutation({
    mutationFn: () =>
      api.createScenarioRun(plea.id, {
        participant_id: who,
        simulated_side: side as PositionSide,
        method,
      }),
    onSuccess: () => {
      setWho("");
      refresh();
    },
  });
  const notConfigured =
    create.error instanceof ApiError && create.error.code === "llm_not_configured";

  return (
    <article
      aria-label={`Pedido ${plea.title}`}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="break-words text-base font-semibold">{plea.title}</h3>
      <p className="mt-1 break-words text-sm text-muted-foreground">
        Autores: {plea.claimant_participant_ids.map(name).join(", ")} · Réus:{" "}
        {plea.defendant_participant_ids.map(name).join(", ")}
      </p>

      <h4 className={`${labelClass} mt-4`}>Comparação dos dois lados</h4>
      {comparison.isPending && <Loading label="Carregando comparação…" />}
      {comparison.isError && (
        <ErrorNotice error={comparison.error} onRetry={() => comparison.refetch()} />
      )}
      {comparison.data && (
        <>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <SideBox view={comparison.data.claimant} name={name} />
            <SideBox view={comparison.data.defendant} name={name} />
          </div>
          <p className="mt-3 text-sm">
            {comparison.data.comparable ? (
              <>
                Os dois lados estão concluídos sobre a versão atual do dossiê. Documentos citados
                pelos dois:{" "}
                <span className="tabular-nums">{comparison.data.common_sources.length}</span>.
              </>
            ) : (
              <span className="text-muted-foreground">Comparação indisponível.</span>
            )}
          </p>
          {comparison.data.limitations.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {comparison.data.limitations.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {canWrite && (
        <form
          aria-label={`Criar cenário para ${plea.title}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (side) create.mutate();
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <label htmlFor={`${id}-who`} className={labelClass}>
              Participante a defender
            </label>
            <select
              id={`${id}-who`}
              value={who}
              onChange={(event) => setWho(event.target.value)}
              className={inputClass}
            >
              <option value="" className={optionClass}>
                Selecione…
              </option>
              {plea.claimant_participant_ids.map((pid) => (
                <option key={pid} value={pid} className={optionClass}>
                  {name(pid)} (autor)
                </option>
              ))}
              {plea.defendant_participant_ids.map((pid) => (
                <option key={pid} value={pid} className={optionClass}>
                  {name(pid)} (réu)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-method`} className={labelClass}>
              Como montar
            </label>
            <select
              id={`${id}-method`}
              value={method}
              onChange={(event) => setMethod(event.target.value as "manual" | "model")}
              className={inputClass}
            >
              <option value="manual" className={optionClass}>
                Registrar argumentos
              </option>
              <option value="model" className={optionClass}>
                Gerar com modelo
              </option>
            </select>
          </div>
          <button type="submit" disabled={create.isPending || !side} className={secondaryButton}>
            {create.isPending ? "Criando…" : "Criar Cenário"}
          </button>
        </form>
      )}
      <div aria-live="polite" className="mt-2">
        {create.isError &&
          (notConfigured ? (
            <p className="text-sm text-muted-foreground">
              Modelo de linguagem não configurado neste ambiente. O cenário pode ser montado
              registrando os argumentos.
            </p>
          ) : (
            <ErrorNotice error={create.error} />
          ))}
      </div>

      <h4 className={`${labelClass} mt-4`}>Cenários</h4>
      {runs.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Nenhum cenário criado.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {runs.map((run) => (
            <RunBlock
              key={run.id}
              run={run}
              plea={plea}
              opportunity={opportunity}
              name={name}
              canWrite={canWrite}
              onChange={refresh}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function SideBox({ view, name }: { view: ScenarioSideView; name: (id: string) => string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          Lado do {positionLabel[view.side].toLowerCase()}
        </span>
        <Pill className={sideStatusClasses[view.status]}>{sideStatusLabel[view.status]}</Pill>
      </div>
      <p className="mt-1 text-sm">{sideSummary(view)}</p>
      {view.participants.length > 1 && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {view.participants.map((item) => (
            <li key={item.participant_id}>
              {name(item.participant_id)}: {sideStatusLabel[item.status]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RunBlock({
  run,
  plea,
  opportunity,
  name,
  canWrite,
  onChange,
}: {
  run: ScenarioRunOut;
  plea: PleaOut;
  opportunity: OpportunityDetail;
  name: (id: string) => string;
  canWrite: boolean;
  onChange: () => void;
}) {
  const id = useId();
  const editable = canWrite && run.source === "manual" && run.status === "running";
  const targets =
    run.simulated_side === "claimant"
      ? plea.defendant_participant_ids
      : plea.claimant_participant_ids;
  const options = citableVersions(opportunity.documents);
  const [against, setAgainst] = useState(targets[0] ?? "");
  const [hypothesis, setHypothesis] = useState("");
  const [versionId, setVersionId] = useState("");
  const [page, setPage] = useState("");
  const [excerpt, setExcerpt] = useState("");

  const add = useMutation({
    mutationFn: () =>
      api.addScenarioArgument(run.id, {
        against,
        hypothesis: hypothesis.trim(),
        citations:
          versionId && page
            ? [
                {
                  document_version_id: versionId,
                  page_start: Number(page),
                  excerpt: excerpt.trim(),
                },
              ]
            : [],
      }),
    onSuccess: () => {
      setHypothesis("");
      setVersionId("");
      setPage("");
      setExcerpt("");
      onChange();
    },
  });
  const complete = useMutation({
    mutationFn: () => api.completeScenarioRun(run.id),
    onSuccess: onChange,
  });

  return (
    <section
      aria-label={`Cenário de ${name(run.participant_id)}`}
      className="rounded-md border border-border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{name(run.participant_id)}</span>
        <Pill className="border-border text-muted-foreground">
          Lado simulado: {positionLabel[run.simulated_side]}
        </Pill>
        <Pill className="border-border text-muted-foreground">
          {editable ? "Em elaboração" : engineStatusLabel[run.status]}
        </Pill>
        {run.is_mock && <Pill className="border-gold/40 bg-gold/15 text-gold">Modo simulado</Pill>}
        {run.stale && (
          <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">Desatualizado</Pill>
        )}
        <span className="text-xs text-muted-foreground">
          {run.source === "model" ? "gerado por modelo" : "registrado por pessoa"} ·{" "}
          <span className="tabular-nums">{formatDateTime(run.created_at)}</span>
        </span>
      </div>
      {run.limitations.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {run.limitations.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}

      {run.arguments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhum argumento registrado.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {run.arguments.map((item) => (
            <li key={item.id} className="rounded-md border border-border/70 px-3 py-2 text-sm">
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  className={
                    item.status === "supported"
                      ? "border-risk-low/30 bg-risk-low/15 text-risk-low"
                      : "border-gold/40 bg-gold/15 text-gold"
                  }
                >
                  {item.status === "supported" ? "Com evidência" : "Hipótese a validar"}
                </Pill>
                <Pill className="border-border text-muted-foreground">
                  Contra: {name(item.against)}
                </Pill>
                <Pill className="border-border text-muted-foreground">
                  Suporte: {confidenceLabel[item.confidence]}
                </Pill>
              </div>
              <p className="mt-2 break-words">{item.hypothesis}</p>
              {/* Vários argumentos e afirmações citam a mesma página: a posição entra na chave. */}
              {item.citations.map((citation, index) => (
                <p
                  key={`${citation.document_version_id}-${citation.page_start}-${index}`}
                  className="mt-1 text-xs"
                >
                  <span className="tabular-nums">
                    {formatPages(citation.page_start, citation.page_end ?? null)}
                  </span>{" "}
                  <a
                    href={documentContentUrl(citation.document_version_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Abrir original
                  </a>
                </p>
              ))}
              {item.pendencies.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-risk-high">
                  {item.pendencies.map((pendency, index) => (
                    <li key={`${pendency.code}-${index}`}>{pendency.message}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      {editable && (
        <form
          aria-label={`Registrar argumento de ${name(run.participant_id)}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (hypothesis.trim().length >= 3 && against) add.mutate();
          }}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-hyp`} className={labelClass}>
              Argumento
            </label>
            <textarea
              id={`${id}-hyp`}
              rows={2}
              value={hypothesis}
              onChange={(event) => setHypothesis(event.target.value)}
              placeholder="Ex.: o atraso é reconhecido na própria contestação…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-against`} className={labelClass}>
              Contra quem
            </label>
            <select
              id={`${id}-against`}
              value={against}
              onChange={(event) => setAgainst(event.target.value)}
              className={inputClass}
            >
              {targets.map((pid) => (
                <option key={pid} value={pid} className={optionClass}>
                  {name(pid)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-doc`} className={labelClass}>
              Documento que sustenta (opcional)
            </label>
            <select
              id={`${id}-doc`}
              value={versionId}
              onChange={(event) => setVersionId(event.target.value)}
              className={inputClass}
            >
              <option value="" className={optionClass}>
                Sem documento (ficará como hipótese)
              </option>
              {options.map((option) => (
                <option key={option.id} value={option.id} className={optionClass}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {versionId && (
            <>
              <div>
                <label htmlFor={`${id}-page`} className={labelClass}>
                  Página do arquivo
                </label>
                <input
                  id={`${id}-page`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={page}
                  onChange={(event) => setPage(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${id}-excerpt`} className={labelClass}>
                  Trecho citado (opcional)
                </label>
                <input
                  id={`${id}-excerpt`}
                  type="text"
                  autoComplete="off"
                  value={excerpt}
                  onChange={(event) => setExcerpt(event.target.value)}
                  placeholder="Cópia literal de um trecho da página…"
                  className={inputClass}
                />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <div aria-live="polite">
              {add.isError && <ErrorNotice error={add.error} />}
              {complete.isError && <ErrorNotice error={complete.error} />}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={add.isPending || hypothesis.trim().length < 3}
                className={secondaryButton}
              >
                {add.isPending ? "Registrando…" : "Registrar Argumento"}
              </button>
              <button
                type="button"
                disabled={complete.isPending}
                onClick={() => complete.mutate()}
                className={primaryButton}
              >
                {complete.isPending ? "Concluindo…" : "Concluir Cenário"}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
