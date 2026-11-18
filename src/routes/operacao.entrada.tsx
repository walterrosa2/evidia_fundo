import { useId, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { OperationalShell } from "@/components/operacao/OperationalShell";
import {
  EmptyState,
  ErrorNotice,
  inputClass,
  labelClass,
  Loading,
  Pill,
  primaryButton,
  secondaryButton,
  SyntheticBadge,
  TableFrame,
  tdClass,
  thClass,
} from "@/components/operacao/primitives";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { api, queryKeys } from "@/lib/operacao/api";
import { formatDateTime, originLabel, positionLabel } from "@/lib/operacao/labels";
import type { CandidateOut, PositionSide } from "@/lib/operacao/types";

export const Route = createFileRoute("/operacao/entrada")({
  head: () => ({ meta: [{ title: "Nova entrada — Operação EvidIA" }] }),
  component: () => (
    <OperationalShell context="Nova entrada">
      <Entry />
    </OperationalShell>
  ),
});

function Entry() {
  const query = useQuery({ queryKey: queryKeys.candidates, queryFn: api.candidates, retry: false });
  const [selected, setSelected] = useState<CandidateOut | null>(null);

  return (
    <>
      <SectionHeader
        eyebrow="Etapa 1 · Entrada do ativo"
        title="Selecionar na Originação"
        subtitle="A consulta é somente leitura: nada é gravado na originação e nenhum estudo é disparado. A origem entrega metadados e relatórios derivados — os autos precisam ser recebidos à parte."
        actions={
          <Link to="/operacao" className={secondaryButton}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </Link>
        }
      />

      {query.isPending && <Loading label="Consultando a originação…" />}
      {query.isError && <ErrorNotice error={query.error} onRetry={() => query.refetch()} />}

      {query.data && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Origem: {originLabel(query.data.origin_system)}</span>
            {query.data.is_synthetic && <SyntheticBadge />}
            <span>· Última consulta: {formatDateTime(query.data.consulted_at)}</span>
            <button type="button" onClick={() => query.refetch()} className={secondaryButton}>
              Consultar novamente
            </button>
          </div>

          {query.data.items.length === 0 ? (
            <EmptyState
              title="A consulta não retornou processos"
              description="A originação respondeu sem casos visíveis para o usuário de serviço. Isso descreve apenas esta consulta e sua cobertura."
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <CandidateTable
                items={query.data.items}
                selectedId={selected?.external_id ?? null}
                onSelect={setSelected}
              />

              {selected ? (
                <ConfirmImport key={selected.external_id} candidate={selected} />
              ) : (
                <EmptyState
                  title="Selecione um processo"
                  description="A posição avaliada e a parte representada são confirmadas por quem importa; não há valor presumido."
                />
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

const PAGE_SIZE = 50;

const formatDay = (iso: string | null | undefined) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split("-").reverse().join("/") : null;

/**
 * Lista dos processos da originação. A origem pode trazer centenas de processos: busca,
 * filtros e paginação ficam na tela, sobre a lista já devolvida pelo servidor.
 */
function CandidateTable({
  items,
  selectedId,
  onSelect,
}: {
  items: CandidateOut[];
  selectedId: string | null;
  onSelect: (candidate: CandidateOut) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [court, setCourt] = useState("");
  const [onlyLeads, setOnlyLeads] = useState(false);
  const [page, setPage] = useState(1);

  const statuses = [
    ...new Set(items.map((c) => c.origin_status).filter(Boolean)),
  ].sort() as string[];
  const courts = [...new Set(items.map((c) => c.court).filter(Boolean))].sort() as string[];
  const hasRegistry = items.some((c) => c.court || c.origin_status || c.filing_date || c.is_lead);
  const digits = search.replace(/\D/g, "");
  const needle = search.trim().toLowerCase();
  const filtered = items.filter((c) => {
    if (onlyLeads && !c.is_lead) return false;
    if (status && c.origin_status !== status) return false;
    if (court && c.court !== court) return false;
    if (!needle) return true;
    const haystack = [c.cnj_raw, c.claimant, c.defendant, c.title, c.searched_company_cnpj]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      haystack.includes(needle) ||
      (digits.length >= 4 && haystack.replace(/\D/g, "").includes(digits))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  return (
    <div className="min-w-0">
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label htmlFor={`${id}-search`} className={labelClass}>
            Buscar processo
          </label>
          <input
            id={`${id}-search`}
            type="search"
            autoComplete="off"
            value={search}
            onChange={(event) => change(setSearch)(event.target.value)}
            placeholder="CNJ, parte ou CNPJ consultado…"
            className={inputClass}
          />
        </div>
        {hasRegistry && (
          <>
            <div>
              <label htmlFor={`${id}-court`} className={labelClass}>
                Tribunal
              </label>
              <select
                id={`${id}-court`}
                value={court}
                onChange={(event) => change(setCourt)(event.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {courts.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-status`} className={labelClass}>
                Situação na origem
              </label>
              <select
                id={`${id}-status`}
                value={status}
                onChange={(event) => change(setStatus)(event.target.value)}
                className={inputClass}
              >
                <option value="">Todas</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={onlyLeads}
                onChange={(event) => change(setOnlyLeads)(event.target.checked)}
              />
              Só leads
            </label>
          </>
        )}
      </div>
      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground tabular-nums">{filtered.length}</span>
        {filtered.length !== items.length && (
          <>
            {" "}
            de <span className="tabular-nums">{items.length}</span>
          </>
        )}{" "}
        {items.length === 1 ? "processo" : "processos"}
      </p>

      <TableFrame label="Processos disponíveis na originação">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr>
              {[
                "Processo",
                "Tribunal",
                "Situação na Origem",
                "Distribuição",
                "Partes",
                "Estudo",
              ].map((head) => (
                <th key={head} scope="col" className={thClass}>
                  {head}
                </th>
              ))}
              <th scope="col" className={thClass}>
                Atualizado na Origem
              </th>
              <th scope="col" className={thClass}>
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className={`${tdClass} text-muted-foreground`}>
                  Nenhum processo com esses filtros. A lista completa tem {items.length}.
                </td>
              </tr>
            )}
            {shown.map((c) => {
              const active = selectedId === c.external_id;
              return (
                <tr
                  key={c.external_id}
                  className={`border-b border-border/40 ${active ? "bg-primary/10" : "hover:bg-secondary/30"}`}
                >
                  <td className={tdClass}>
                    <span
                      className="block whitespace-nowrap font-medium tabular-nums"
                      translate="no"
                    >
                      {c.cnj_raw ?? "CNJ não informado"}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {c.is_lead && (
                        <Pill className="border-primary/40 bg-primary/10 text-primary">Lead</Pill>
                      )}
                      {!c.cnj_valid && (
                        <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                          CNJ inválido — entra como rascunho
                        </Pill>
                      )}
                      {c.already_imported_sides.map((side) => (
                        <Pill key={side} className="border-border text-muted-foreground">
                          Já importado: {positionLabel[side]}
                        </Pill>
                      ))}
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {c.court ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={tdClass}>
                    {c.origin_status ?? (
                      <span className="text-muted-foreground">Não informada</span>
                    )}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>
                    {formatDay(c.filing_date) ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`${tdClass} max-w-[280px]`}>
                    {c.claimant || c.defendant ? (
                      <>
                        <span className="block truncate">
                          {c.claimant ?? "Autor não informado"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          contra {c.defendant ?? "réu não informado"}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Não informadas pela origem</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-muted-foreground`}>
                    {c.has_study ? "Disponível (relatório derivado)" : "Não disponível"}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-muted-foreground tabular-nums`}>
                    {formatDateTime(c.source_updated_at)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={`${active ? "Selecionado" : "Selecionar"}: processo ${c.cnj_raw ?? c.external_id}`}
                      onClick={() => onSelect(c)}
                      className={secondaryButton}
                    >
                      {active ? "Selecionado" : "Selecionar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableFrame>

      {pageCount > 1 && (
        <nav
          aria-label="Páginas da lista de processos"
          className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm"
        >
          <span className="mr-auto text-muted-foreground tabular-nums">
            Página {current} de {pageCount}
          </span>
          <button
            type="button"
            className={secondaryButton}
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className={secondaryButton}
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}

function ConfirmImport({ candidate }: { candidate: CandidateOut }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const partyId = useId();
  const [side, setSide] = useState<PositionSide | null>(null);
  const [party, setParty] = useState("");
  const [touched, setTouched] = useState(false);

  const suggestion =
    side === "claimant" ? candidate.claimant : side === "defendant" ? candidate.defendant : null;

  const importation = useMutation({
    mutationFn: api.importOpportunity,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates });
      navigate({ to: "/operacao/$id", params: { id: result.opportunity_id } });
    },
  });

  const sideMissing = touched && side === null;
  const partyMissing = touched && party.trim() === "";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (side === null || party.trim() === "") return;
    importation.mutate({
      external_id: candidate.external_id,
      position_side: side,
      represented_party: party.trim(),
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="h-fit rounded-xl border border-border bg-card p-5"
      aria-label="Confirmar importação"
    >
      <h2 className="text-base font-semibold tracking-tight">Confirmar Posição e Parte</h2>
      <p className="mt-1 break-words text-sm text-muted-foreground" translate="no">
        {candidate.cnj_raw ?? "CNJ não informado"}
      </p>
      {(candidate.court || candidate.origin_status || candidate.searched_company_cnpj) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className={labelClass}>Tribunal</dt>
            <dd className="mt-0.5">{candidate.court ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Situação na origem</dt>
            <dd className="mt-0.5">{candidate.origin_status ?? "Não informada"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Distribuição</dt>
            <dd className="mt-0.5 tabular-nums">
              {formatDay(candidate.filing_date) ?? "Não informada"}
            </dd>
          </div>
          <div>
            <dt className={labelClass}>CNPJ consultado</dt>
            <dd className="mt-0.5 tabular-nums" translate="no">
              {candidate.searched_company_cnpj ?? "Não informado"}
            </dd>
          </div>
        </dl>
      )}
      {!candidate.claimant && !candidate.defendant && (
        <p className="mt-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
          A origem não informa as partes deste processo. O CNPJ consultado indica a empresa
          pesquisada, não o polo em que ela está: a parte e a posição são confirmadas nos autos.
        </p>
      )}

      <fieldset
        className="mt-5"
        aria-describedby={sideMissing ? `${partyId}-side-error` : undefined}
      >
        <legend className={labelClass}>Posição avaliada</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["claimant", "defendant"] as const).map((option) => (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${
                side === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="position_side"
                value={option}
                checked={side === option}
                onChange={() => setSide(option)}
                className="sr-only"
              />
              {positionLabel[option]}
            </label>
          ))}
        </div>
        {sideMissing && (
          <p
            id={`${partyId}-side-error`}
            role="alert"
            className="mt-1.5 text-xs text-risk-critical"
          >
            Escolha a posição avaliada: autor ou réu.
          </p>
        )}
      </fieldset>

      <div className="mt-4">
        <label htmlFor={partyId} className={labelClass}>
          Parte representada
        </label>
        <input
          id={partyId}
          name="represented_party"
          type="text"
          autoComplete="off"
          value={party}
          onChange={(event) => setParty(event.target.value)}
          aria-invalid={partyMissing || undefined}
          aria-describedby={partyMissing ? `${partyId}-error` : undefined}
          placeholder="Ex.: Empresa Alfa Ltda.…"
          className={inputClass}
        />
        {suggestion && party.trim() !== suggestion && (
          <button
            type="button"
            onClick={() => setParty(suggestion)}
            className="mt-1.5 max-w-full truncate text-left text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Usar nome informado pela origem: {suggestion}
          </button>
        )}
        {partyMissing && (
          <p id={`${partyId}-error`} role="alert" className="mt-1.5 text-xs text-risk-critical">
            Informe a parte representada como consta nos autos.
          </p>
        )}
      </div>

      <ul className="mt-5 space-y-1.5 text-xs text-muted-foreground">
        <li>Será criado um snapshot versionado com hash do conteúdo importado.</li>
        <li>Autos integrais entram como documentação pendente.</li>
        <li>Contrato, preço e retorno permanecem não definidos.</li>
      </ul>

      <div aria-live="polite" className="mt-4">
        {importation.isError && <ErrorNotice error={importation.error} />}
      </div>

      <button
        type="submit"
        disabled={importation.isPending}
        className={`${primaryButton} mt-4 w-full`}
      >
        {importation.isPending ? (
          <>
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Importando…
          </>
        ) : (
          "Importar Oportunidade"
        )}
      </button>
    </form>
  );
}
