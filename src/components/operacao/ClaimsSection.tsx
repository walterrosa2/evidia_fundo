import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api, ApiError, documentContentUrl, queryKeys } from "@/lib/operacao/api";
import {
  formatDateTime,
  formatPages,
  natureHelp,
  natureLabel,
  reviewClasses,
  reviewLabel,
} from "@/lib/operacao/labels";
import type { TableState } from "@/lib/operacao/tableState";
import type { ClaimNature, ClaimOut, OpportunityDetail, ReviewState } from "@/lib/operacao/types";
import { ClaimEvidences } from "./ClaimEvidences";
import { DataTable, type CellRenderer } from "./DataTable";
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
} from "./primitives";

const NATURES = Object.keys(natureLabel) as ClaimNature[];
const REVIEW_STATES = Object.keys(reviewLabel) as ReviewState[];

type VersionOption = { id: string; label: string; pageCount: number | null };

function versionOptions(opportunity: OpportunityDetail): VersionOption[] {
  return opportunity.documents.flatMap((document) =>
    document.versions
      .filter((version) => version.is_current)
      .map((version) => ({
        id: version.id,
        label: `${document.title} · v${version.version_no}${
          version.page_count != null ? ` · ${version.page_count} p.` : ""
        }`,
        pageCount: version.page_count,
      })),
  );
}

const claimRenderers: Record<string, CellRenderer> = {
  text: (_row, value) => <p className="line-clamp-2 break-words">{value}</p>,
  document_title: (_row, value) =>
    value === null ? (
      <span className="text-risk-high">Sem citação</span>
    ) : (
      <span className="block truncate" title={String(value)}>
        {value}
      </span>
    ),
  document_version_no: (_row, value) =>
    value === null ? <span className="text-muted-foreground/70">—</span> : <>v{value}</>,
  review_state: (_row, value, label) => (
    <Pill className={reviewClasses[value as ReviewState] ?? "border-border"}>{label}</Pill>
  ),
  stale: (_row, value, label) =>
    value ? (
      <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">{label}</Pill>
    ) : (
      <span className="text-muted-foreground">{label}</span>
    ),
};

export function ClaimsSection({
  opportunity,
  canWrite,
  canReview,
  openClaimId,
  onOpenClaim,
  onCloseClaim,
  tableState,
  onTableState,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  canReview: boolean;
  tableState: TableState;
  onTableState: (next: TableState, options?: { replace?: boolean }) => void;
  openClaimId: string | null;
  onOpenClaim: (id: string) => void;
  onCloseClaim: () => void;
}) {
  const titleId = useId();
  const claims = useQuery({
    queryKey: queryKeys.claims(opportunity.id),
    queryFn: () => api.claims(opportunity.id),
  });
  const openClaim = claims.data?.find((claim) => claim.id === openClaimId) ?? null;

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Afirmações e Revisão
        </h2>
        <Help topic="claims" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        A natureza da afirmação é independente do tipo do documento. “Validada” significa revisada
        por responsável, não verdade judicial estabelecida.
      </p>

      {canWrite && <NewClaimForm opportunity={opportunity} claims={claims.data ?? []} />}

      <div className="mt-4">
        {/* A ficha em tela inteira lê a afirmação completa desta consulta. */}
        {claims.isError && <ErrorNotice error={claims.error} onRetry={() => claims.refetch()} />}
        <DataTable
          tableKey="claims"
          scopeId={opportunity.id}
          label="Afirmações do dossiê"
          noun={{ one: "afirmação", many: "afirmações" }}
          state={tableState}
          onStateChange={onTableState}
          renderers={claimRenderers}
          actionsWidth={140}
          bulkActions={
            canWrite
              ? (ids, clear) => (
                  <BulkSendToReview opportunityId={opportunity.id} ids={ids} onDone={clear} />
                )
              : undefined
          }
          rowActions={(row) => (
            <button
              type="button"
              onClick={() => onOpenClaim(row.id)}
              aria-label={`Abrir ficha da afirmação: ${String(row.values.text ?? "").slice(0, 80)}`}
              className={secondaryButton}
            >
              Abrir Ficha
            </button>
          )}
          emptyState={
            <EmptyState
              title="Nenhuma afirmação registrada"
              description="Registre constatações, alegações e inferências ligadas à página do documento de origem."
            />
          }
        />
        {openClaimId && claims.isPending && <Loading label="Carregando ficha…" />}
      </div>

      {openClaim && (
        <FullscreenDetail
          eyebrow={`Afirmação · ${natureLabel[openClaim.nature]}`}
          title="Ficha da Afirmação"
          onBack={onCloseClaim}
        >
          <ClaimDetail
            claim={openClaim}
            opportunity={opportunity}
            allClaims={claims.data ?? []}
            canReview={canReview}
            canWrite={canWrite}
          />
        </FullscreenDetail>
      )}
    </section>
  );
}

function NewClaimForm({
  opportunity,
  claims,
}: {
  opportunity: OpportunityDetail;
  claims: ClaimOut[];
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const options = versionOptions(opportunity);
  const [text, setText] = useState("");
  const [nature, setNature] = useState<ClaimNature>("attributed_allegation");
  const [assertedBy, setAssertedBy] = useState("");
  const [versionId, setVersionId] = useState("");
  const [page, setPage] = useState("");
  const [premises, setPremises] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () =>
      api.createClaim(opportunity.id, {
        text: text.trim(),
        nature,
        asserted_by: assertedBy.trim(),
        document_version_id: versionId || null,
        page_start: versionId && page ? Number(page) : null,
        premise_claim_ids: nature === "analytical_inference" ? premises : [],
      }),
    onSuccess: () => {
      setText("");
      setAssertedBy("");
      setPage("");
      setPremises([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.claims(opportunity.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(opportunity.id) });
    },
  });

  const selected = options.find((option) => option.id === versionId);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim().length >= 3) create.mutate();
      }}
      className="mt-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label htmlFor={`${id}-text`} className={labelClass}>
            Texto da afirmação
          </label>
          <textarea
            id={`${id}-text`}
            rows={2}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ex.: A autora alegou atraso de 90 dias na entrega…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-nature`} className={labelClass}>
            Natureza
          </label>
          <select
            id={`${id}-nature`}
            value={nature}
            onChange={(event) => setNature(event.target.value as ClaimNature)}
            aria-describedby={`${id}-nature-help`}
            className={inputClass}
          >
            {NATURES.map((value) => (
              <option key={value} value={value} className="bg-popover text-popover-foreground">
                {natureLabel[value]}
              </option>
            ))}
          </select>
          <p id={`${id}-nature-help`} className="mt-1 text-xs text-muted-foreground">
            {natureHelp[nature]}
          </p>
        </div>
        <div>
          <label htmlFor={`${id}-by`} className={labelClass}>
            Quem afirma
          </label>
          <input
            id={`${id}-by`}
            type="text"
            autoComplete="off"
            value={assertedBy}
            onChange={(event) => setAssertedBy(event.target.value)}
            placeholder="Ex.: Autora, perito do juízo…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-doc`} className={labelClass}>
            Documento de origem
          </label>
          <select
            id={`${id}-doc`}
            value={versionId}
            onChange={(event) => setVersionId(event.target.value)}
            className={inputClass}
          >
            <option value="" className="bg-popover text-popover-foreground">
              Sem citação (ficará pendente de evidência)
            </option>
            {options.map((option) => (
              <option
                key={option.id}
                value={option.id}
                className="bg-popover text-popover-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-page`} className={labelClass}>
            Página do arquivo
          </label>
          <input
            id={`${id}-page`}
            type="number"
            inputMode="numeric"
            min={1}
            max={selected?.pageCount ?? undefined}
            value={page}
            disabled={!versionId}
            onChange={(event) => setPage(event.target.value)}
            placeholder="Ex.: 12…"
            className={inputClass}
          />
        </div>
        {nature === "analytical_inference" && (
          <fieldset className="lg:col-span-2">
            <legend className={labelClass}>Premissas referenciadas</legend>
            {claims.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Registre antes as afirmações que servem de premissa. Inferência sem premissa não
                pode ser validada.
              </p>
            ) : (
              <div className="mt-2 grid max-h-44 gap-1 overflow-auto rounded-md border border-border p-2">
                {claims.map((claim) => (
                  <label
                    key={claim.id}
                    className="flex min-h-9 cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary/40"
                  >
                    <input
                      type="checkbox"
                      checked={premises.includes(claim.id)}
                      onChange={(event) =>
                        setPremises((current) =>
                          event.target.checked
                            ? [...current, claim.id]
                            : current.filter((value) => value !== claim.id),
                        )
                      }
                      className="mt-1 size-4 accent-[var(--primary)]"
                    />
                    <span className="line-clamp-2 min-w-0 break-words">{claim.text}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}
      </div>

      <div aria-live="polite" className="mt-3">
        {create.isError && <ErrorNotice error={create.error} />}
      </div>

      <button
        type="submit"
        disabled={create.isPending || text.trim().length < 3}
        className={`${primaryButton} mt-3`}
      >
        {create.isPending ? (
          <>
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Registrando…
          </>
        ) : (
          "Registrar Afirmação"
        )}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={labelClass}>{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

function ClaimDetail({
  claim,
  opportunity,
  allClaims,
  canReview,
  canWrite,
}: {
  claim: ClaimOut;
  opportunity: OpportunityDetail;
  allClaims: ClaimOut[];
  canReview: boolean;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const options = versionOptions(opportunity);
  const [state, setState] = useState<ReviewState>(claim.review_state);
  const [comment, setComment] = useState("");
  const [versionId, setVersionId] = useState("");
  const [page, setPage] = useState("");

  const review = useMutation({
    mutationFn: () =>
      api.reviewClaim(claim.id, {
        review_state: state,
        comment: comment.trim(),
        ...(versionId
          ? { document_version_id: versionId, page_start: page ? Number(page) : null }
          : {}),
      }),
    onSuccess: () => {
      setComment("");
      setVersionId("");
      setPage("");
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.claims(opportunity.id) });
    },
  });

  const blockers =
    review.error instanceof ApiError && review.error.code === "validation_blocked"
      ? ((review.error.details?.blockers as { code: string; message: string }[] | undefined) ?? [])
      : [];
  const premises = allClaims.filter((other) => claim.premise_claim_ids.includes(other.id));

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{claim.text}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Pill className={reviewClasses[claim.review_state]}>
              {reviewLabel[claim.review_state]}
            </Pill>
            <Pill className="border-border text-muted-foreground">{natureLabel[claim.nature]}</Pill>
            {claim.stale && (
              <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                Desatualizada
              </Pill>
            )}
          </div>
          {claim.stale && claim.stale_reason && (
            <p className="mt-3 rounded-md border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm">
              {claim.stale_reason}. A análise anterior continua consultável; atualize a citação
              antes de validar.
            </p>
          )}
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="O que a natureza indica">{natureHelp[claim.nature]}</Field>
            <Field label="Quem afirma">{claim.asserted_by || "Não informado"}</Field>
            <Field label="Documento de origem">
              {claim.document_title ? (
                <>
                  {claim.document_title} · v{claim.document_version_no} ·{" "}
                  {formatPages(claim.page_start, claim.page_end)}
                  {claim.document_version_id && (
                    <a
                      href={documentContentUrl(claim.document_version_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Abrir original
                    </a>
                  )}
                </>
              ) : (
                <span className="text-risk-high">Sem citação resolvível</span>
              )}
            </Field>
            <Field label="Versão do dossiê no registro">
              <span className="tabular-nums">{claim.dossier_version}</span>
            </Field>
            <Field label="Como foi registrada">
              {claim.origin === "rules"
                ? "Sugestão por regras locais, aceita por uma pessoa"
                : claim.origin === "llm"
                  ? "Sugestão de modelo de linguagem, aceita por uma pessoa"
                  : "Registro manual"}
              {claim.extraction_confidence != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · confiança da extração {Math.round(claim.extraction_confidence * 100)}% (não mede
                  a verdade do conteúdo)
                </span>
              )}
            </Field>
          </dl>
          {premises.length > 0 && (
            <div className="mt-5">
              <h3 className={labelClass}>Premissas</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {premises.map((premise) => (
                  <li
                    key={premise.id}
                    className="break-words rounded-md border border-border px-3 py-2"
                  >
                    {premise.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {claim.validation_blockers.length > 0 && (
            <div className="mt-5">
              <h3 className={labelClass}>Pendências para validar</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-risk-high">
                {claim.validation_blockers.map((blocker) => (
                  <li key={blocker.code}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <ClaimEvidences claim={claim} opportunity={opportunity} canWrite={canWrite} />

        <section>
          <h3 className="text-base font-semibold tracking-tight">Histórico de Revisão</h3>
          {claim.reviews.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma revisão registrada.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {[...claim.reviews].reverse().map((entry) => (
                <li key={entry.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.reviewer_name}</span>
                    <span className="tabular-nums">{formatDateTime(entry.created_at)}</span>
                  </div>
                  <p className="mt-2">
                    {reviewLabel[entry.before.review_state as ReviewState] ?? "—"} →{" "}
                    <span className="font-medium">
                      {reviewLabel[entry.after.review_state as ReviewState] ?? "—"}
                    </span>
                  </p>
                  {entry.before.text !== entry.after.text && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p className="break-words rounded-md border border-border px-3 py-2 text-muted-foreground">
                        <span className={labelClass}>Antes</span>
                        <br />
                        {String(entry.before.text)}
                      </p>
                      <p className="break-words rounded-md border border-border px-3 py-2">
                        <span className={labelClass}>Depois</span>
                        <br />
                        {String(entry.after.text)}
                      </p>
                    </div>
                  )}
                  {entry.comment && (
                    <p className="mt-2 break-words text-muted-foreground">{entry.comment}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="min-w-0">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold tracking-tight">Registrar Revisão</h3>
          {!canReview ? (
            <p className="mt-2 text-sm text-muted-foreground">
              A revisão é reservada ao papel de revisor. Seu acesso permite consultar a ficha e o
              histórico.
            </p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                review.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label htmlFor={`${id}-state`} className={labelClass}>
                  Estado da revisão
                </label>
                <select
                  id={`${id}-state`}
                  value={state}
                  onChange={(event) => setState(event.target.value as ReviewState)}
                  className={inputClass}
                >
                  {REVIEW_STATES.map((value) => (
                    <option
                      key={value}
                      value={value}
                      className="bg-popover text-popover-foreground"
                    >
                      {reviewLabel[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-doc`} className={labelClass}>
                  Atualizar citação (opcional)
                </label>
                <select
                  id={`${id}-doc`}
                  value={versionId}
                  onChange={(event) => setVersionId(event.target.value)}
                  className={inputClass}
                >
                  <option value="" className="bg-popover text-popover-foreground">
                    Manter citação atual
                  </option>
                  {options.map((option) => (
                    <option
                      key={option.id}
                      value={option.id}
                      className="bg-popover text-popover-foreground"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {versionId && (
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
              )}
              <div>
                <label htmlFor={`${id}-comment`} className={labelClass}>
                  Fundamento da revisão
                </label>
                <textarea
                  id={`${id}-comment`}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Ex.: Conferido com o laudo, página 12…"
                  className={inputClass}
                />
              </div>

              <div aria-live="polite">
                {review.isError &&
                  (blockers.length > 0 ? (
                    <div
                      role="alert"
                      className="rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">A afirmação não pode ser validada ainda:</p>
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

              <button
                type="submit"
                disabled={review.isPending}
                className={`${primaryButton} w-full`}
              >
                {review.isPending ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                    Registrando…
                  </>
                ) : (
                  "Registrar Revisão"
                )}
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}

const bulkSkipReason: Record<string, string> = {
  not_pending: "já não estavam pendentes",
  stale: "estão desatualizadas",
  not_found: "não pertencem a este dossiê",
};

/** Encaminha as afirmações selecionadas para revisão. Validar continua individual. */
function BulkSendToReview({
  opportunityId,
  ids,
  onDone,
}: {
  opportunityId: string;
  ids: string[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: () => api.bulkSendClaimsToReview(opportunityId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.claims(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stages(opportunityId) });
    },
  });
  const skipped = send.data?.skipped ?? [];
  const reasons = [...new Set(skipped.map((item) => bulkSkipReason[item.reason] ?? item.reason))];
  return (
    <>
      <button
        type="button"
        className={secondaryButton}
        disabled={send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isPending ? "Encaminhando…" : "Enviar Selecionadas para Revisão"}
      </button>
      <Help topic="bulkReview" />
      <span role="status" className="basis-full text-xs">
        {send.isError && (
          <span className="text-risk-critical">Não foi possível encaminhar. Tente novamente.</span>
        )}
        {send.data && (
          <>
            {send.data.updated} encaminhada{send.data.updated === 1 ? "" : "s"} para revisão.
            {skipped.length > 0 &&
              ` ${skipped.length} ignorada${skipped.length === 1 ? "" : "s"}: ${reasons.join("; ")}.`}{" "}
            <button
              type="button"
              className="rounded text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={onDone}
            >
              Limpar seleção
            </button>
          </>
        )}
      </span>
    </>
  );
}
