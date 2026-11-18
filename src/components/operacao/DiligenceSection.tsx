import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { api, ApiError, queryKeys } from "@/lib/operacao/api";
import {
  formatDay,
  identifierLabel,
  occurrenceKindLabel,
  occurrenceStateClasses,
  occurrenceStateLabel,
  proceedingLabel,
  qualificationLabel,
  recurrenceText,
  relationLabel,
  roleLabel,
  searchStatusText,
  sideLabel,
  timingLabel,
} from "@/lib/operacao/diligence";
import { downloadBlob } from "@/lib/operacao/download";
import { formatDateTime } from "@/lib/operacao/labels";
import type {
  IdentifierType,
  OccurrenceKind,
  OccurrenceOut,
  OccurrenceSheet,
  OccurrenceState,
  OpportunityDetail,
  ParticipantOut,
  ParticipantRole,
  RoleSide,
  SubjectCrosscheck,
} from "@/lib/operacao/types";
import { DiligenceFileImport } from "./DiligenceFileImport";
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

type Tab = "participantes" | "cruzamentos" | "ocorrencias";
const TABS: [Tab, string][] = [
  ["participantes", "Participantes"],
  ["cruzamentos", "Cruzamentos"],
  ["ocorrencias", "Ocorrências"],
];
const ROLES = Object.keys(roleLabel) as ParticipantRole[];
const SIDES = Object.keys(sideLabel) as RoleSide[];
const ID_TYPES: IdentifierType[] = ["cpf", "cnpj", "oab", "crea", "professional_registry"];
const KINDS = Object.keys(occurrenceKindLabel) as OccurrenceKind[];
const STATES = Object.keys(occurrenceStateLabel) as OccurrenceState[];
const optionClass = "bg-popover text-popover-foreground";

function useRefresh(opportunityId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.participants(opportunityId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.crosscheck(opportunityId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.occurrences(opportunityId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tables });
  };
}

export function DiligenceSection({
  opportunity,
  canWrite,
  canReview,
  openTab,
  onOpen,
  onClose,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  canReview: boolean;
  /** Aba aberta em tela inteira, ou nulo. */
  openTab: string | null;
  onOpen: (tab: Tab) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const participants = useQuery({
    queryKey: queryKeys.participants(opportunity.id),
    queryFn: () => api.participants(opportunity.id),
  });
  const occurrences = useQuery({
    queryKey: queryKeys.occurrences(opportunity.id),
    queryFn: () => api.occurrences(opportunity.id),
  });
  const tab = TABS.find(([key]) => key === openTab)?.[0] ?? null;
  const validated = occurrences.data?.filter((o) => o.state === "validated").length ?? 0;

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
        Etapa 3 · Diligência de vínculos
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Vínculos e Qualificação Técnica
        </h2>
        <Help topic="diligence" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Cruza peritos e assistentes com advogados, partes e magistrados nos cinco anos anteriores à
        data de referência. Aparecer no mesmo processo é coocorrência: não prova amizade,
        contratação ou parcialidade.
      </p>
      <dl className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
        <div>
          <dt className={labelClass}>Participantes</dt>
          <dd className="mt-1 text-sm tabular-nums">
            {participants.data ? participants.data.length : "…"}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Ocorrências</dt>
          <dd className="mt-1 text-sm tabular-nums">
            {occurrences.data ? occurrences.data.length : "…"}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Ocorrências validadas</dt>
          <dd className="mt-1 text-sm tabular-nums">{occurrences.data ? validated : "…"}</dd>
        </div>
      </dl>
      {(participants.isError || occurrences.isError) && (
        <div className="mt-3">
          <ErrorNotice
            error={participants.error ?? occurrences.error}
            onRetry={() => {
              participants.refetch();
              occurrences.refetch();
            }}
          />
        </div>
      )}
      <WithHelp topic="diligencePanel" className="mt-4">
        <button type="button" onClick={() => onOpen("participantes")} className={secondaryButton}>
          <Search aria-hidden="true" className="size-4" />
          Abrir Diligência
        </button>
      </WithHelp>

      {tab && (
        <FullscreenDetail
          eyebrow="Diligência de vínculos"
          title="Vínculos e Qualificação"
          onBack={onClose}
        >
          <div className="mx-auto max-w-6xl">
            <div role="tablist" aria-label="Partes da diligência" className="flex flex-wrap gap-2">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`diligencia-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls={`diligencia-painel-${key}`}
                  onClick={() => onOpen(key)}
                  className={`min-h-10 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              O que há em cada aba
              <Help topic="diligenceTabs" align="left" side="bottom" />
            </p>
            <div
              role="tabpanel"
              id={`diligencia-painel-${tab}`}
              aria-labelledby={`diligencia-tab-${tab}`}
              className="mt-6"
            >
              {tab === "participantes" && (
                <ParticipantsTab
                  opportunity={opportunity}
                  participants={participants.data ?? []}
                  loading={participants.isPending}
                  canWrite={canWrite}
                  canReview={canReview}
                />
              )}
              {tab === "participantes" && canWrite && (
                <DiligenceFileImport
                  opportunity={opportunity}
                  participants={participants.data ?? []}
                />
              )}
              {tab === "cruzamentos" && <CrosscheckTab opportunity={opportunity} />}
              {tab === "ocorrencias" && (
                <OccurrencesTab
                  opportunity={opportunity}
                  participants={participants.data ?? []}
                  occurrences={occurrences.data ?? []}
                  loading={occurrences.isPending}
                  canWrite={canWrite}
                  canReview={canReview}
                />
              )}
            </div>
          </div>
        </FullscreenDetail>
      )}
    </section>
  );
}

// ------------------------------------------------------------- participantes

function ParticipantsTab({
  opportunity,
  participants,
  loading,
  canWrite,
  canReview,
}: {
  opportunity: OpportunityDetail;
  participants: ParticipantOut[];
  loading: boolean;
  canWrite: boolean;
  canReview: boolean;
}) {
  const id = useId();
  const refresh = useRefresh(opportunity.id);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"person" | "company">("person");
  const [idType, setIdType] = useState<IdentifierType | "">("");
  const [idValue, setIdValue] = useState("");
  const [uf, setUf] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createParticipant(opportunity.id, {
        name: name.trim(),
        kind,
        identifiers:
          idType && idValue.trim()
            ? [
                {
                  type: idType,
                  value: idValue.trim(),
                  uf: uf.trim() ? uf.trim().toUpperCase() : null,
                },
              ]
            : [],
      }),
    onSuccess: () => {
      setName("");
      setIdValue("");
      setUf("");
      refresh();
    },
  });

  return (
    <div>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Fichas com o mesmo nome nunca são unidas automaticamente. Só um identificador idêntico (CPF,
        CNPJ, OAB, registro profissional) indica a mesma pessoa; unir fichas é decisão de revisor,
        com motivo.
      </p>
      {canWrite && (
        <form
          aria-label="Cadastrar participante"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) create.mutate();
          }}
          className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.5fr)_auto] lg:items-end"
        >
          <div>
            <label htmlFor={`${id}-name`} className={labelClass}>
              Nome
            </label>
            <input
              id={`${id}-name`}
              type="text"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: perito nomeado no processo…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-kind`} className={labelClass}>
              Tipo
            </label>
            <select
              id={`${id}-kind`}
              value={kind}
              onChange={(event) => setKind(event.target.value as "person" | "company")}
              className={inputClass}
            >
              <option value="person" className={optionClass}>
                Pessoa
              </option>
              <option value="company" className={optionClass}>
                Empresa
              </option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-idtype`} className={labelClass}>
              Identificador
            </label>
            <select
              id={`${id}-idtype`}
              value={idType}
              onChange={(event) => setIdType(event.target.value as IdentifierType | "")}
              className={inputClass}
            >
              <option value="" className={optionClass}>
                Não informado
              </option>
              {ID_TYPES.map((value) => (
                <option key={value} value={value} className={optionClass}>
                  {identifierLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-idvalue`} className={labelClass}>
              Número
            </label>
            <input
              id={`${id}-idvalue`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={idValue}
              disabled={!idType}
              onChange={(event) => setIdValue(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-uf`} className={labelClass}>
              UF
            </label>
            <input
              id={`${id}-uf`}
              type="text"
              autoComplete="off"
              maxLength={2}
              value={uf}
              disabled={!idType}
              onChange={(event) => setUf(event.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending || name.trim().length < 2}
            className={primaryButton}
          >
            {create.isPending ? "Cadastrando…" : "Cadastrar Participante"}
          </button>
        </form>
      )}
      <div aria-live="polite" className="mt-2">
        {create.isError && <ErrorNotice error={create.error} />}
      </div>

      <div className="mt-4 space-y-4">
        {loading && <Loading label="Carregando participantes…" />}
        {!loading && participants.length === 0 && (
          <EmptyState
            title="Nenhum participante cadastrado"
            description="Cadastre perito, assistentes, advogados, magistrado e partes a partir dos documentos do dossiê."
          />
        )}
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            all={participants}
            opportunity={opportunity}
            canWrite={canWrite}
            canReview={canReview}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantCard({
  participant,
  all,
  opportunity,
  canWrite,
  canReview,
}: {
  participant: ParticipantOut;
  all: ParticipantOut[];
  opportunity: OpportunityDetail;
  canWrite: boolean;
  canReview: boolean;
}) {
  const id = useId();
  const refresh = useRefresh(opportunity.id);
  const [cnj, setCnj] = useState(opportunity.process.cnj ?? "");
  const [role, setRole] = useState<ParticipantRole>("court_expert");
  const [side, setSide] = useState<RoleSide>("none");
  const [eventDate, setEventDate] = useState("");
  const [basis, setBasis] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [mergeReason, setMergeReason] = useState("");

  const addRole = useMutation({
    mutationFn: () =>
      api.addRole(participant.id, { cnj: cnj.trim(), role, side, event_date: eventDate || null }),
    onSuccess: () => {
      setEventDate("");
      refresh();
    },
  });
  const removeRole = useMutation({ mutationFn: api.deleteRole, onSuccess: refresh });
  const search = useMutation({
    mutationFn: () => api.runDiligenceSearch(opportunity.id, participant.id),
    onSuccess: refresh,
  });
  const confirm = useMutation({
    mutationFn: () =>
      api.updateParticipant(participant.id, {
        identity_status: "confirmed",
        identity_note: basis.trim(),
      }),
    onSuccess: () => {
      setBasis("");
      refresh();
    },
  });
  const merge = useMutation({
    mutationFn: () => api.mergeParticipant(participant.id, mergeInto, mergeReason.trim()),
    onSuccess: refresh,
  });

  const isExpert = participant.roles.some(
    (r) => r.role === "court_expert" || r.role === "party_assistant",
  );
  const homonyms = all.filter((other) => participant.homonym_ids.includes(other.id));
  const notConfigured =
    search.error instanceof ApiError && search.error.code === "diligence_not_configured";

  return (
    <article
      aria-label={`Participante ${participant.name}`}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold">{participant.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill
              className={
                participant.identity_status === "confirmed"
                  ? "border-risk-low/30 bg-risk-low/15 text-risk-low"
                  : "border-risk-high/30 bg-risk-high/15 text-risk-high"
              }
            >
              {participant.identity_status === "confirmed"
                ? "Identidade confirmada"
                : "Identidade não confirmada"}
            </Pill>
            <Pill className="border-border text-muted-foreground">
              {participant.kind === "company" ? "Empresa" : "Pessoa"}
            </Pill>
            {participant.identifiers.map((item) => (
              <Pill
                key={`${item.type}-${item.value}`}
                className="border-border text-muted-foreground"
              >
                <span translate="no">
                  {identifierLabel[item.type]} {item.value}
                  {item.uf ? `/${item.uf}` : ""}
                </span>
              </Pill>
            ))}
          </div>
          {participant.identity_note && (
            <p className="mt-2 break-words text-xs text-muted-foreground">
              Base da confirmação: {participant.identity_note}
            </p>
          )}
        </div>
        {canWrite && isExpert && (
          <button
            type="button"
            disabled={search.isPending}
            onClick={() => search.mutate()}
            className={secondaryButton}
          >
            <Search aria-hidden="true" className="size-4" />
            {search.isPending ? "Consultando…" : "Consultar Fonte"}
          </button>
        )}
      </div>

      {homonyms.length > 0 && (
        <p
          role="note"
          className="mt-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
        >
          Possível homônimo de outra ficha com o mesmo nome ({homonyms.length}). As fichas não foram
          unidas: não há identificador em comum.
        </p>
      )}
      <div aria-live="polite" className="mt-2">
        {search.isSuccess && (
          <p className="text-sm text-muted-foreground">
            {searchStatusText(search.data)}
            {search.data.coverage ? ` · ${search.data.coverage}` : ""}
          </p>
        )}
        {search.isError &&
          (notConfigured ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma fonte de diligência configurada neste ambiente.
            </p>
          ) : (
            <ErrorNotice error={search.error} />
          ))}
      </div>

      <h4 className={`${labelClass} mt-4`}>Atuações em processos</h4>
      {participant.roles.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Nenhuma atuação registrada.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60 rounded-md border border-border">
          {participant.roles.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            >
              <span className="font-medium">{roleLabel[item.role]}</span>
              {item.side !== "none" && (
                <span className="text-muted-foreground">{sideLabel[item.side]}</span>
              )}
              <span className="tabular-nums" translate="no">
                {item.cnj}
              </span>
              <span className="text-muted-foreground">
                {item.event_date ? formatDay(item.event_date) : "Ato sem data"}
                {item.event_label ? ` · ${item.event_label}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.source_kind === "connector"
                  ? "fonte consultada"
                  : item.source_kind === "dossier"
                    ? "documento do dossiê"
                    : "registro manual"}
              </span>
              {canWrite && (
                <button
                  type="button"
                  disabled={removeRole.isPending}
                  onClick={() => removeRole.mutate(item.id)}
                  aria-label={`Remover atuação de ${participant.name} em ${item.cnj}`}
                  className="ml-auto rounded px-2 py-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form
          aria-label={`Registrar atuação de ${participant.name}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (cnj.trim()) addRole.mutate();
          }}
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] lg:items-end"
        >
          <div>
            <label htmlFor={`${id}-cnj`} className={labelClass}>
              Processo (CNJ)
            </label>
            <input
              id={`${id}-cnj`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={cnj}
              onChange={(event) => setCnj(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-role`} className={labelClass}>
              Papel
            </label>
            <select
              id={`${id}-role`}
              value={role}
              onChange={(event) => setRole(event.target.value as ParticipantRole)}
              className={inputClass}
            >
              {ROLES.map((value) => (
                <option key={value} value={value} className={optionClass}>
                  {roleLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-side`} className={labelClass}>
              Lado
            </label>
            <select
              id={`${id}-side`}
              value={side}
              onChange={(event) => setSide(event.target.value as RoleSide)}
              className={inputClass}
            >
              {SIDES.map((value) => (
                <option key={value} value={value} className={optionClass}>
                  {sideLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-date`} className={labelClass}>
              Data do ato
            </label>
            <input
              id={`${id}-date`}
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={addRole.isPending || !cnj.trim()}
            className={secondaryButton}
          >
            {addRole.isPending ? "Registrando…" : "Registrar Atuação"}
          </button>
        </form>
      )}
      <div aria-live="polite" className="mt-2">
        {addRole.isError && <ErrorNotice error={addRole.error} />}
        {removeRole.isError && <ErrorNotice error={removeRole.error} />}
      </div>

      {canReview && (
        <details className="mt-4">
          <summary className="cursor-pointer rounded text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Identidade e união de fichas
          </summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {participant.identity_status !== "confirmed" && (
              <form
                aria-label={`Confirmar identidade de ${participant.name}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  confirm.mutate();
                }}
              >
                <label htmlFor={`${id}-basis`} className={labelClass}>
                  Com base em que a identidade foi confirmada
                </label>
                <input
                  id={`${id}-basis`}
                  type="text"
                  autoComplete="off"
                  value={basis}
                  onChange={(event) => setBasis(event.target.value)}
                  placeholder="Ex.: CREA conferido na certidão juntada…"
                  className={inputClass}
                />
                <div aria-live="polite">
                  {confirm.isError && <ErrorNotice error={confirm.error} />}
                </div>
                <button
                  type="submit"
                  disabled={confirm.isPending}
                  className={`${secondaryButton} mt-2`}
                >
                  Confirmar Identidade
                </button>
              </form>
            )}
            {all.length > 1 && (
              <form
                aria-label={`Unir a ficha de ${participant.name} a outra`}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (mergeInto && mergeReason.trim().length >= 3) merge.mutate();
                }}
              >
                <label htmlFor={`${id}-merge`} className={labelClass}>
                  Unir esta ficha a
                </label>
                <select
                  id={`${id}-merge`}
                  value={mergeInto}
                  onChange={(event) => setMergeInto(event.target.value)}
                  className={inputClass}
                >
                  <option value="" className={optionClass}>
                    Selecione…
                  </option>
                  {all
                    .filter((other) => other.id !== participant.id)
                    .map((other) => (
                      <option key={other.id} value={other.id} className={optionClass}>
                        {other.name}
                      </option>
                    ))}
                </select>
                <label htmlFor={`${id}-reason`} className={`${labelClass} mt-2 block`}>
                  Motivo da união
                </label>
                <input
                  id={`${id}-reason`}
                  type="text"
                  autoComplete="off"
                  value={mergeReason}
                  onChange={(event) => setMergeReason(event.target.value)}
                  placeholder="Ex.: mesmo CPF na procuração…"
                  className={inputClass}
                />
                <div aria-live="polite">{merge.isError && <ErrorNotice error={merge.error} />}</div>
                <button
                  type="submit"
                  disabled={merge.isPending || !mergeInto || mergeReason.trim().length < 3}
                  className={`${secondaryButton} mt-2`}
                >
                  Unir Fichas
                </button>
              </form>
            )}
          </div>
        </details>
      )}
    </article>
  );
}

// --------------------------------------------------------------- cruzamentos

function CrosscheckTab({ opportunity }: { opportunity: OpportunityDetail }) {
  const result = useQuery({
    queryKey: queryKeys.crosscheck(opportunity.id),
    queryFn: () => api.crosscheck(opportunity.id),
  });
  if (result.isPending) return <Loading label="Calculando cruzamentos…" />;
  if (result.isError) return <ErrorNotice error={result.error} onRetry={() => result.refetch()} />;
  const data = result.data;

  return (
    <div>
      <p className="text-sm">
        Janela de cinco anos:{" "}
        <span className="font-medium tabular-nums">
          {formatDay(data.window_start)} a {formatDay(data.window_end)}
        </span>{" "}
        <span className="text-muted-foreground">(inclusiva; fuso {data.timezone})</span>
      </p>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        A data que conta é a do ato ou atuação. Evento fora da janela e evento sem data aparecem na
        lista, mas não entram na contagem de recorrência.
      </p>
      {data.limitations.length > 0 && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
          <h3 className="font-medium">Limites desta leitura</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {data.limitations.map((text) => (
              <li key={text} className="break-words">
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.subjects.length === 0 && (
        <div className="mt-4">
          <EmptyState
            title="Nenhum perito ou assistente com atuação registrada"
            description="Cadastre o profissional e registre sua atuação no processo para cruzar com advogados, partes e magistrados."
          />
        </div>
      )}
      <div className="mt-5 space-y-6">
        {data.subjects.map((subject) => (
          <SubjectBlock key={subject.participant_id} subject={subject} />
        ))}
      </div>
    </div>
  );
}

function SubjectBlock({ subject }: { subject: SubjectCrosscheck }) {
  return (
    <article
      aria-label={`Cruzamentos de ${subject.name}`}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="break-words text-base font-semibold">{subject.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {subject.roles_in_dossier.map((r) => roleLabel[r]).join(" · ")}
        {subject.identity_status !== "confirmed" && " · identidade não confirmada"}
      </p>

      <h4 className={`${labelClass} mt-4`}>Recorrência na janela</h4>
      {subject.recurrences.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhuma coocorrência datada dentro da janela.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60 rounded-md border border-border">
          {subject.recurrences.map((item) => (
            <li key={`${item.other_participant_id}-${item.relation}`} className="px-3 py-2 text-sm">
              <span className="font-medium">{item.other_name}</span>{" "}
              <span className="text-muted-foreground">· {relationLabel[item.relation]}</span>
              <p className="tabular-nums">{recurrenceText(item)}</p>
              {item.expected && (
                <p className="text-xs text-muted-foreground">
                  Relação esperada: assistente técnico é de confiança da parte que o indicou.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <h4 className={`${labelClass} mt-4`}>Coocorrências</h4>
      {subject.cooccurrences.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Nenhuma coocorrência registrada.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60 rounded-md border border-border">
          {subject.cooccurrences.map((item) => (
            <li
              key={`${item.subject_role_id}-${item.other_role_id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            >
              <span className="font-medium">{item.other_name}</span>
              <span className="text-muted-foreground">{relationLabel[item.relation]}</span>
              <span className="tabular-nums" translate="no">
                {item.cnj}
              </span>
              <span className="tabular-nums">{formatDay(item.event_date)}</span>
              <Pill
                className={
                  item.timing === "in_window"
                    ? "border-border text-foreground"
                    : "border-border text-muted-foreground"
                }
              >
                {timingLabel[item.timing]}
              </Pill>
              {item.filed_before_window && (
                <span className="text-xs text-muted-foreground">
                  processo distribuído antes da janela; conta a data do ato
                </span>
              )}
              {item.expected && (
                <span className="text-xs text-muted-foreground">relação esperada</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h4 className={`${labelClass} mt-4`}>Fontes consultadas</h4>
      {subject.searches.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhuma fonte externa consultada para este profissional.
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {subject.searches.map((search) => (
            <li key={search.id} className="rounded-md border border-border px-3 py-2">
              <span className="font-medium" translate="no">
                {search.connector}
              </span>{" "}
              ·{" "}
              <span className={search.status === "failed" ? "text-risk-high" : ""}>
                {searchStatusText(search)}
              </span>{" "}
              · <span className="tabular-nums">{formatDateTime(search.created_at)}</span>
              {search.coverage && (
                <p className="mt-1 break-words text-muted-foreground">
                  Cobertura: {search.coverage}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// --------------------------------------------------------------- ocorrências

function OccurrencesTab({
  opportunity,
  participants,
  occurrences,
  loading,
  canWrite,
  canReview,
}: {
  opportunity: OpportunityDetail;
  participants: ParticipantOut[];
  occurrences: OccurrenceOut[];
  loading: boolean;
  canWrite: boolean;
  canReview: boolean;
}) {
  const id = useId();
  const refresh = useRefresh(opportunity.id);
  const [kind, setKind] = useState<OccurrenceKind>("cooccurrence");
  const [subject, setSubject] = useState("");
  const [related, setRelated] = useState("");
  const [factDate, setFactDate] = useState("");
  const [url, setUrl] = useState("");
  const [found, setFound] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createOccurrence(opportunity.id, {
        kind,
        subject_participant_id: subject,
        related_participant_id: related || null,
        cnj: opportunity.process.cnj ?? "",
        fact_date: factDate || null,
        source_url: url.trim(),
        sheet: { what_found: found.trim() },
      }),
    onSuccess: () => {
      setFound("");
      setUrl("");
      setFactDate("");
      refresh();
    },
  });
  const exportFile = useMutation({
    mutationFn: () => api.exportDiligence(opportunity.id),
    onSuccess: (blob) => downloadBlob(blob, "diligencia.csv"),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Toda ocorrência nasce candidata. Material não validado não entra como acusação nem como
          desconto no preço. Hash confere a integridade da cópia, não a verdade do conteúdo.
        </p>
        <button
          type="button"
          disabled={exportFile.isPending || occurrences.length === 0}
          onClick={() => exportFile.mutate()}
          className={secondaryButton}
        >
          <Download aria-hidden="true" className="size-4" />
          {exportFile.isPending ? "Gerando…" : "Exportar Dossiê (CSV)"}
        </button>
      </div>
      {exportFile.isError && (
        <div className="mt-2">
          <ErrorNotice error={exportFile.error} />
        </div>
      )}

      {canWrite && (
        <form
          aria-label="Registrar ocorrência"
          onSubmit={(event) => {
            event.preventDefault();
            if (subject && found.trim()) create.mutate();
          }}
          className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label htmlFor={`${id}-kind`} className={labelClass}>
              Tipo de ocorrência
            </label>
            <select
              id={`${id}-kind`}
              value={kind}
              onChange={(event) => setKind(event.target.value as OccurrenceKind)}
              className={inputClass}
            >
              {KINDS.map((value) => (
                <option key={value} value={value} className={optionClass}>
                  {occurrenceKindLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-subject`} className={labelClass}>
              Profissional
            </label>
            <select
              id={`${id}-subject`}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={inputClass}
            >
              <option value="" className={optionClass}>
                Selecione…
              </option>
              {participants.map((p) => (
                <option key={p.id} value={p.id} className={optionClass}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-related`} className={labelClass}>
              Relacionado (opcional)
            </label>
            <select
              id={`${id}-related`}
              value={related}
              onChange={(event) => setRelated(event.target.value)}
              className={inputClass}
            >
              <option value="" className={optionClass}>
                Nenhum
              </option>
              {participants
                .filter((p) => p.id !== subject)
                .map((p) => (
                  <option key={p.id} value={p.id} className={optionClass}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-date`} className={labelClass}>
              Data do fato
            </label>
            <input
              id={`${id}-date`}
              type="date"
              value={factDate}
              onChange={(event) => setFactDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="lg:col-span-2">
            <label htmlFor={`${id}-url`} className={labelClass}>
              Endereço da fonte original
            </label>
            <input
              id={`${id}-url`}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor={`${id}-found`} className={labelClass}>
              O que foi encontrado
            </label>
            <textarea
              id={`${id}-found`}
              rows={2}
              value={found}
              onChange={(event) => setFound(event.target.value)}
              placeholder="Ex.: o perito e o magistrado atuaram no mesmo processo em 2023…"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <div aria-live="polite">{create.isError && <ErrorNotice error={create.error} />}</div>
            <button
              type="submit"
              disabled={create.isPending || !subject || !found.trim()}
              className={primaryButton}
            >
              {create.isPending ? "Registrando…" : "Registrar Ocorrência"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {loading && <Loading label="Carregando ocorrências…" />}
        {!loading && occurrences.length === 0 && (
          <EmptyState
            title="Nenhuma ocorrência registrada"
            description="Registre o que foi encontrado, com fonte. A ficha separa o que isso permite afirmar do que não permite."
          />
        )}
        {occurrences.map((item) => (
          <OccurrenceCard
            key={item.id}
            occurrence={item}
            opportunityId={opportunity.id}
            canReview={canReview}
          />
        ))}
      </div>
    </div>
  );
}

const SHEET_FIELDS: [keyof OccurrenceSheet, string][] = [
  ["what_found", "O que foi encontrado"],
  ["allows_to_state", "O que isso permite afirmar"],
  ["does_not_allow", "O que isso não permite afirmar"],
  ["missing_to_verify", "O que falta verificar"],
  ["possible_impact", "Possível impacto se confirmado"],
  ["contrary_evidence", "Evidência contrária"],
  ["alternative_hypothesis", "Hipótese alternativa"],
];
const SOCIAL_FIELDS: [keyof OccurrenceSheet, string][] = [
  ["author_attributed", "Autoria atribuída"],
  ["content_date", "Data do conteúdo"],
  ["relevance_justification", "Justificativa de relevância"],
];
const LEGAL_FIELDS: [keyof OccurrenceSheet, string][] = [
  ["affected_act", "Ato ou prova afetado"],
  ["legal_basis", "Fundamento aplicável"],
  ["prejudice", "Prejuízo"],
  ["causal_nexus", "Nexo"],
  ["timeliness", "Tempestividade e preclusão"],
  ["possible_remedy", "Providência possível"],
];

function OccurrenceCard({
  occurrence,
  opportunityId,
  canReview,
}: {
  occurrence: OccurrenceOut;
  opportunityId: string;
  canReview: boolean;
}) {
  const id = useId();
  const refresh = useRefresh(opportunityId);
  const [state, setState] = useState<OccurrenceState>(occurrence.state);
  const [sheet, setSheet] = useState<OccurrenceSheet>(occurrence.sheet);
  const [comment, setComment] = useState("");
  const review = useMutation({
    mutationFn: () =>
      api.reviewOccurrence(occurrence.id, { state, sheet, comment: comment.trim() }),
    onSuccess: () => {
      setComment("");
      refresh();
    },
  });
  const blockers =
    review.error instanceof ApiError && review.error.code === "validation_blocked"
      ? ((review.error.details?.blockers as { code: string; message: string }[] | undefined) ?? [])
      : [];
  const fields = [...SHEET_FIELDS, ...(occurrence.kind === "social" ? SOCIAL_FIELDS : [])];
  const text = (key: keyof OccurrenceSheet) => String(sheet[key] ?? "");

  return (
    <article
      aria-label={`Ocorrência: ${occurrence.sheet.what_found.slice(0, 80) || occurrence.subject_name}`}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap gap-1.5">
        <Pill className={occurrenceStateClasses[occurrence.state]}>
          {occurrenceStateLabel[occurrence.state]}
        </Pill>
        <Pill className="border-border text-muted-foreground">
          {occurrenceKindLabel[occurrence.kind]}
        </Pill>
        <Pill className="border-border text-muted-foreground">
          {timingLabel[occurrence.timing]}
        </Pill>
        {occurrence.expected_relation && (
          <Pill className="border-border text-muted-foreground">Relação esperada</Pill>
        )}
        {occurrence.kind === "disciplinary" && (
          <Pill
            className={
              occurrence.is_current_sanction
                ? "border-risk-high/30 bg-risk-high/15 text-risk-high"
                : "border-border text-muted-foreground"
            }
          >
            {occurrence.is_current_sanction
              ? "Sanção vigente"
              : `Sem sanção vigente${
                  occurrence.sheet.proceeding_status
                    ? ` · ${proceedingLabel[occurrence.sheet.proceeding_status]}`
                    : ""
                }`}
          </Pill>
        )}
      </div>
      <h3 className="mt-3 break-words text-base font-semibold">
        {occurrence.subject_name}
        {occurrence.related_name ? ` · ${occurrence.related_name}` : ""}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Fato: <span className="tabular-nums">{formatDay(occurrence.fact_date)}</span> · coleta:{" "}
        <span className="tabular-nums">{formatDateTime(occurrence.collected_at)}</span>
        {occurrence.source_url && (
          <>
            {" "}
            ·{" "}
            <a
              href={occurrence.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              fonte original
            </a>
          </>
        )}
      </p>
      {occurrence.qualification_status && (
        <p className="mt-2 text-sm">{qualificationLabel[occurrence.qualification_status]}.</p>
      )}

      {!canReview ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <div key={key} className="min-w-0">
              <dt className={labelClass}>{label}</dt>
              <dd className="mt-1 break-words text-sm">{text(key) || "Não informado"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <form
          aria-label={`Revisar ocorrência de ${occurrence.subject_name}`}
          onSubmit={(event) => {
            event.preventDefault();
            review.mutate();
          }}
          className="mt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`${id}-${key}`} className={labelClass}>
                  {label}
                </label>
                <textarea
                  id={`${id}-${key}`}
                  rows={2}
                  value={text(key)}
                  onChange={(event) => setSheet({ ...sheet, [key]: event.target.value })}
                  className={inputClass}
                />
              </div>
            ))}
            {occurrence.kind === "disciplinary" && (
              <div>
                <label htmlFor={`${id}-proceeding`} className={labelClass}>
                  Estado do procedimento
                </label>
                <select
                  id={`${id}-proceeding`}
                  value={sheet.proceeding_status}
                  onChange={(event) =>
                    setSheet({
                      ...sheet,
                      proceeding_status: event.target.value as OccurrenceSheet["proceeding_status"],
                    })
                  }
                  className={inputClass}
                >
                  <option value="" className={optionClass}>
                    Não informado
                  </option>
                  {Object.entries(proceedingLabel).map(([value, label]) => (
                    <option key={value} value={value} className={optionClass}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {occurrence.kind === "qualification" && (
              <div>
                <label htmlFor={`${id}-registry`} className={labelClass}>
                  Início de vigência do registro
                </label>
                <input
                  id={`${id}-registry`}
                  type="date"
                  value={sheet.registry_valid_from}
                  onChange={(event) =>
                    setSheet({ ...sheet, registry_valid_from: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
            )}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer rounded text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Avaliação jurídica
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {LEGAL_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`${id}-${key}`} className={labelClass}>
                    {label}
                  </label>
                  <textarea
                    id={`${id}-${key}`}
                    rows={2}
                    value={text(key)}
                    onChange={(event) => setSheet({ ...sheet, [key]: event.target.value })}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </details>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <label htmlFor={`${id}-state`} className={labelClass}>
                Situação
              </label>
              <select
                id={`${id}-state`}
                value={state}
                onChange={(event) => setState(event.target.value as OccurrenceState)}
                className={inputClass}
              >
                {STATES.map((value) => (
                  <option key={value} value={value} className={optionClass}>
                    {occurrenceStateLabel[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-comment`} className={labelClass}>
                Fundamento da revisão
              </label>
              <input
                id={`${id}-comment`}
                type="text"
                autoComplete="off"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Obrigatório para validar ou descartar…"
                className={inputClass}
              />
            </div>
          </div>
          <div aria-live="polite" className="mt-2">
            {review.isError &&
              (blockers.length > 0 ? (
                <div
                  role="alert"
                  className="rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm"
                >
                  <p className="font-medium">A ocorrência não pode avançar ainda:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {blockers.map((blocker) => (
                      <li key={blocker.code}>{blocker.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ErrorNotice error={review.error} />
              ))}
            {review.isSuccess && <p className="text-sm text-risk-low">Revisão registrada.</p>}
          </div>
          <button type="submit" disabled={review.isPending} className={`${secondaryButton} mt-2`}>
            {review.isPending ? "Registrando…" : "Registrar Revisão"}
          </button>
        </form>
      )}

      {occurrence.validation_blockers.length > 0 && (
        <div className="mt-4">
          <h4 className={labelClass}>Pendências para validar</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-risk-high">
            {occurrence.validation_blockers.map((blocker) => (
              <li key={blocker.code}>{blocker.message}</li>
            ))}
          </ul>
        </div>
      )}
      {occurrence.reviews.length > 0 && (
        <div className="mt-4">
          <h4 className={labelClass}>Histórico de revisão</h4>
          <ol className="mt-2 space-y-1.5 text-sm">
            {[...occurrence.reviews].reverse().map((entry) => (
              <li key={entry.id} className="rounded-md border border-border px-3 py-2">
                <span className="font-medium">{entry.reviewer_name}</span>{" "}
                <span className="tabular-nums text-muted-foreground">
                  {formatDateTime(entry.created_at)}
                </span>{" "}
                · {occurrenceStateLabel[entry.before.state ?? "candidate"]} →{" "}
                <span className="font-medium">
                  {occurrenceStateLabel[entry.after.state ?? "candidate"]}
                </span>
                {entry.comment && (
                  <p className="mt-1 break-words text-muted-foreground">{entry.comment}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
