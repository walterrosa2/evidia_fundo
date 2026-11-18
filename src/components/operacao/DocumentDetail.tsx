import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanText, Sparkles, Trash2 } from "lucide-react";
import { api, ApiError, documentContentUrl, queryKeys } from "@/lib/operacao/api";
import { jobLabel, pagesCoverage, suggestionKey, textSourceLabel } from "@/lib/operacao/documents";
import { natureLabel } from "@/lib/operacao/labels";
import type {
  ClaimSuggestionOut,
  ClaimSuggestionsOut,
  DocumentTextOut,
  OpportunityDetail,
} from "@/lib/operacao/types";
import {
  ErrorNotice,
  Help,
  inputClass,
  labelClass,
  Loading,
  Pill,
  primaryButton,
  secondaryButton,
} from "./primitives";

const PIECE_TYPES = [
  ["nao_classificado", "Não classificado"],
  ["peticao_inicial", "Petição inicial"],
  ["contestacao", "Contestação"],
  ["laudo_pericial", "Laudo pericial"],
  ["parecer_assistente", "Parecer do assistente técnico"],
  ["decisao", "Decisão"],
  ["procuracao", "Procuração"],
  ["anexo", "Anexo"],
] as const;
const pieceLabel = Object.fromEntries(PIECE_TYPES) as Record<string, string>;

/** Texto, OCR, estrutura (peças e folhas) e sugestões de afirmação de uma versão de documento. */
export function DocumentDetail({
  opportunity,
  versionId,
  canWrite,
}: {
  opportunity: OpportunityDetail;
  versionId: string;
  canWrite: boolean;
}) {
  const info = useQuery({
    queryKey: queryKeys.documentText(versionId),
    queryFn: () => api.documentText(versionId),
    // Com trabalho na fila, acompanha até terminar.
    refetchInterval: (query) => ((query.state.data?.active_jobs.length ?? 0) > 0 ? 3000 : false),
  });

  if (info.isPending) return <Loading label="Carregando documento…" />;
  if (info.isError) return <ErrorNotice error={info.error} onRetry={() => info.refetch()} />;
  const data = info.data;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <TextStatus data={data} canWrite={canWrite} />
      <PageReader data={data} />
      <Structure data={data} canWrite={canWrite} />
      {canWrite && <Suggestions data={data} opportunity={opportunity} />}
    </div>
  );
}

function TextStatus({ data, canWrite }: { data: DocumentTextOut; canWrite: boolean }) {
  const queryClient = useQueryClient();
  const coverage = pagesCoverage(data);
  const ocr = useMutation({
    mutationFn: () => api.requestOcr(data.document_version_id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.documentText(data.document_version_id) }),
  });
  const working = data.active_jobs.length > 0;
  const isScan = /\.(pdf|png|jpe?g)$/i.test(data.filename);
  const canOcr =
    canWrite && isScan && coverage.missing !== 0 && data.state !== "password_protected";

  return (
    <section
      aria-labelledby="doc-text-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="doc-text-title" className="text-base font-semibold tracking-tight">
            Texto do Documento
          </h3>
          <p className="mt-1 break-words text-sm text-muted-foreground" translate="no">
            {data.filename}
          </p>
        </div>
        <a
          href={documentContentUrl(data.document_version_id)}
          target="_blank"
          rel="noreferrer"
          className={secondaryButton}
        >
          Abrir Original
        </a>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className={labelClass}>Origem do texto</dt>
          <dd className="mt-1 text-sm">{textSourceLabel[data.text_source] ?? data.text_source}</dd>
        </div>
        <div>
          <dt className={labelClass}>Páginas com texto</dt>
          <dd className="mt-1 text-sm tabular-nums">
            {coverage.total == null
              ? `${coverage.withText} (formato sem paginação conhecida)`
              : `${coverage.withText} de ${coverage.total}`}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Situação</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5 text-sm">
            {data.state === "needs_ocr" && (
              <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">Requer OCR</Pill>
            )}
            {data.state === "password_protected" && (
              <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                Protegido por senha
              </Pill>
            )}
            {working && (
              <Pill className="border-primary/40 bg-primary/10 text-primary">
                <Loader2
                  aria-hidden="true"
                  className="mr-1 inline size-3 animate-spin motion-reduce:animate-none"
                />
                {jobLabel(data.active_jobs[0])}
              </Pill>
            )}
            {!working && data.state === "stored" && coverage.missing === 0 && (
              <Pill className="border-risk-low/30 bg-risk-low/15 text-risk-low">
                Texto disponível
              </Pill>
            )}
          </dd>
        </div>
      </dl>
      <p className="mt-3 max-w-3xl text-xs text-muted-foreground">
        O texto é uma leitura do documento para busca e citação. O original continua sendo a fonte;
        o OCR é aproximado e roda nesta máquina, sem serviço externo.
      </p>
      {data.last_job?.status === "failed" && (
        <p role="status" className="mt-2 text-sm text-risk-high">
          Último processamento falhou: {data.last_job.error ?? "motivo não informado"}.
        </p>
      )}
      {canOcr && (
        <div className="mt-3">
          <button
            type="button"
            disabled={ocr.isPending || working || !data.ocr_available}
            onClick={() => ocr.mutate()}
            className={secondaryButton}
          >
            <ScanText aria-hidden="true" className="size-4" />
            {working ? "Processando…" : "Executar OCR"}
          </button>
          {!data.ocr_available && (
            <p className="mt-1 text-xs text-risk-high">
              OCR indisponível nesta máquina (Tesseract ou idioma ausente).
            </p>
          )}
        </div>
      )}
      <div aria-live="polite">{ocr.isError && <ErrorNotice error={ocr.error} />}</div>
    </section>
  );
}

function PageReader({ data }: { data: DocumentTextOut }) {
  const id = useId();
  const numbers = data.pages_with_text.map((page) => page.page_no);
  const [chosen, setChosen] = useState<number | null>(null);
  const pageNo = chosen ?? numbers[0] ?? null;
  const page = useQuery({
    queryKey: queryKeys.documentPage(data.document_version_id, pageNo ?? 0),
    queryFn: () => api.documentPage(data.document_version_id, pageNo as number),
    enabled: pageNo != null,
  });

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-base font-semibold tracking-tight">
        Leitura por Página
      </h3>
      {numbers.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma página com texto. Documento digitalizado precisa de OCR.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={`${id}-page`} className={labelClass}>
                Página do arquivo
              </label>
              <select
                id={`${id}-page`}
                value={pageNo ?? ""}
                onChange={(event) => setChosen(Number(event.target.value))}
                className={`${inputClass} min-w-32`}
              >
                {numbers.map((number) => (
                  <option
                    key={number}
                    value={number}
                    className="bg-popover text-popover-foreground"
                  >
                    {number}
                  </option>
                ))}
              </select>
            </div>
            {page.data && (
              <p className="pb-2 text-sm text-muted-foreground">
                {page.data.folio != null ? (
                  <>
                    Folha do processo:{" "}
                    <span className="tabular-nums text-foreground">{page.data.folio}</span>
                  </>
                ) : (
                  "Folha do processo não mapeada"
                )}{" "}
                · origem: {textSourceLabel[page.data.source] ?? page.data.source}
              </p>
            )}
          </div>
          {page.isPending && <Loading label="Carregando página…" />}
          {page.isError && <ErrorNotice error={page.error} onRetry={() => page.refetch()} />}
          {page.data && (
            <pre
              tabIndex={0}
              aria-label={`Texto da página ${page.data.page_no}`}
              className="mt-3 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface p-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {page.data.text}
            </pre>
          )}
        </>
      )}
    </section>
  );
}

function Structure({ data, canWrite }: { data: DocumentTextOut; canWrite: boolean }) {
  const id = useId();
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documentText(data.document_version_id) });
    queryClient.invalidateQueries({ queryKey: ["operacao", "pagina", data.document_version_id] });
  };
  const [label, setLabel] = useState("");
  const [type, setType] = useState("nao_classificado");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [folio, setFolio] = useState("");

  const add = useMutation({
    mutationFn: () =>
      api.addDocumentSegment(data.document_version_id, {
        label: label.trim(),
        piece_type: type,
        page_start: Number(start),
        page_end: end ? Number(end) : null,
        folio_start: folio ? Number(folio) : null,
      }),
    onSuccess: () => {
      setLabel("");
      setStart("");
      setEnd("");
      setFolio("");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (segmentId: string) => api.deleteDocumentSegment(segmentId),
    onSuccess: refresh,
  });

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-base font-semibold tracking-tight">
        Estrutura do Documento
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Peças dentro do arquivo e a numeração de folhas do processo. Página do arquivo e folha
        impressa são coisas diferentes: a citação usa a página; a folha é referência.
      </p>
      {data.segments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma peça mapeada.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border bg-card">
          {data.segments.map((segment) => (
            <li key={segment.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{segment.label}</p>
                <p className="text-xs text-muted-foreground">
                  {pieceLabel[segment.piece_type] ?? segment.piece_type} · páginas{" "}
                  <span className="tabular-nums">
                    {segment.page_start}–{segment.page_end}
                  </span>
                  {segment.folio_start != null && (
                    <>
                      {" "}
                      · folhas{" "}
                      <span className="tabular-nums">
                        {segment.folio_start}–{segment.folio_end}
                      </span>
                    </>
                  )}
                </p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(segment.id)}
                  aria-label={`Remover a peça ${segment.label}`}
                  className={secondaryButton}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {remove.isError && (
        <div className="mt-2">
          <ErrorNotice error={remove.error} />
        </div>
      )}

      {canWrite && (
        <form
          aria-label="Mapear peça do documento"
          onSubmit={(event) => {
            event.preventDefault();
            if (label.trim() && start) add.mutate();
          }}
          className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_repeat(3,minmax(0,0.6fr))_auto] lg:items-end"
        >
          <div>
            <label htmlFor={`${id}-label`} className={labelClass}>
              Peça
            </label>
            <input
              id={`${id}-label`}
              type="text"
              autoComplete="off"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex.: Laudo pericial contábil…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-type`} className={labelClass}>
              Tipo
            </label>
            <select
              id={`${id}-type`}
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={inputClass}
            >
              {PIECE_TYPES.map(([value, text]) => (
                <option key={value} value={value} className="bg-popover text-popover-foreground">
                  {text}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-start`} className={labelClass}>
              Página inicial
            </label>
            <input
              id={`${id}-start`}
              type="number"
              inputMode="numeric"
              min={1}
              max={data.page_count ?? undefined}
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-end`} className={labelClass}>
              Página final
            </label>
            <input
              id={`${id}-end`}
              type="number"
              inputMode="numeric"
              min={1}
              max={data.page_count ?? undefined}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-folio`} className={labelClass}>
              Folha inicial
            </label>
            <input
              id={`${id}-folio`}
              type="number"
              inputMode="numeric"
              min={1}
              value={folio}
              onChange={(event) => setFolio(event.target.value)}
              placeholder="Opcional"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={add.isPending || !label.trim() || !start}
            className={secondaryButton}
          >
            {add.isPending ? "Registrando…" : "Mapear Peça"}
          </button>
        </form>
      )}
      <div aria-live="polite" className="mt-2">
        {add.isError && <ErrorNotice error={add.error} />}
      </div>
    </section>
  );
}

function Suggestions({
  data,
  opportunity,
}: {
  data: DocumentTextOut;
  opportunity: OpportunityDetail;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<ClaimSuggestionsOut | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);

  const suggest = useMutation({
    mutationFn: (method: "rules" | "llm") =>
      api.suggestClaims(data.document_version_id, {
        method,
        page_from: from ? Number(from) : null,
        page_to: to ? Number(to) : null,
      }),
    onSuccess: (out) => {
      setResult(out);
      setAccepted([]);
    },
  });
  const accept = useMutation({
    mutationFn: (item: ClaimSuggestionOut) =>
      api.createClaim(opportunity.id, {
        text: item.text,
        nature: item.nature,
        asserted_by: item.asserted_by,
        document_version_id: data.document_version_id,
        page_start: item.page_no,
        excerpt: item.excerpt,
        premise_claim_ids: [],
        origin: item.method,
        extraction_confidence: item.confidence,
      }),
    onSuccess: (_claim, item) => {
      setAccepted((current) => [...current, suggestionKey(item)]);
      queryClient.invalidateQueries({ queryKey: queryKeys.claims(opportunity.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(opportunity.id) });
    },
  });
  const notConfigured =
    suggest.error instanceof ApiError && suggest.error.code === "llm_not_configured";

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-base font-semibold tracking-tight">
        Sugestões de Afirmação
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Sugestão não é afirmação: nada é gravado até alguém registrar. Cada sugestão aponta a página
        e um trecho que existe nela. Registrar não valida — a afirmação nasce pendente.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`${id}-from`} className={labelClass}>
            Da página
          </label>
          <input
            id={`${id}-from`}
            type="number"
            inputMode="numeric"
            min={1}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            placeholder="Início"
            className={`${inputClass} w-28`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-to`} className={labelClass}>
            Até a página
          </label>
          <input
            id={`${id}-to`}
            type="number"
            inputMode="numeric"
            min={1}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="Fim"
            className={`${inputClass} w-28`}
          />
        </div>
        <button
          type="button"
          disabled={suggest.isPending}
          onClick={() => suggest.mutate("rules")}
          className={secondaryButton}
        >
          Sugerir por Regras
        </button>
        <button
          type="button"
          disabled={suggest.isPending}
          onClick={() => suggest.mutate("llm")}
          className={secondaryButton}
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Sugerir com Modelo
        </button>
        <Help topic="suggestions" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        “Por regras” usa padrões locais, sem IA. “Com modelo” usa o modelo de linguagem configurado
        no servidor, quando houver; o pedido é limitado em páginas.
      </p>

      <div aria-live="polite" className="mt-3">
        {suggest.isPending && <Loading label="Analisando páginas…" />}
        {suggest.isError &&
          (notConfigured ? (
            <p
              role="status"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              Modelo de linguagem não configurado neste ambiente. A sugestão por regras continua
              disponível.
            </p>
          ) : (
            <ErrorNotice error={suggest.error} />
          ))}
        {accept.isError && <ErrorNotice error={accept.error} />}
      </div>

      {result && (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
            {result.suggestions.length} {result.suggestions.length === 1 ? "sugestão" : "sugestões"}{" "}
            em {result.pages_analyzed} {result.pages_analyzed === 1 ? "página" : "páginas"} ·{" "}
            {result.method === "rules" ? "regras locais" : `modelo ${result.model ?? ""}`}
            {result.rejected.length > 0 &&
              ` · ${result.rejected.length} recusada(s) por não conferirem com o documento`}
          </p>
          {(result.nature_adjusted ?? 0) > 0 && (
            <p
              role="note"
              className="mt-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              Este documento é peça de parte: {result.nature_adjusted}{" "}
              {result.nature_adjusted === 1
                ? "sugestão que o modelo classificou"
                : "sugestões que o modelo classificou"}{" "}
              como constatação documental {result.nature_adjusted === 1 ? "entra" : "entram"} como
              alegação de quem assina. Promover a constatação é decisão de quem revisa.
            </p>
          )}
          {result.is_mock && (
            <p
              role="note"
              className="mt-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
            >
              <span className="font-medium">Modelo em modo simulado.</span> As sugestões abaixo
              vieram de um substituto local, sem chamada ao provedor.
            </p>
          )}
          <ol className="mt-3 space-y-3">
            {result.suggestions.map((item) => {
              const key = suggestionKey(item);
              const done = accepted.includes(key);
              return (
                <li key={key} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill className="border-border text-muted-foreground">
                      {natureLabel[item.nature]}
                    </Pill>
                    <Pill className="border-border text-muted-foreground">
                      Página {item.page_no}
                    </Pill>
                    <Pill className="border-border text-muted-foreground">
                      Confiança da extração: {Math.round(item.confidence * 100)}%
                    </Pill>
                  </div>
                  <p className="mt-2 break-words">{item.text}</p>
                  {item.asserted_by && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Quem afirma: {item.asserted_by}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={done || accept.isPending}
                    onClick={() => accept.mutate(item)}
                    className={`${done ? secondaryButton : primaryButton} mt-3`}
                  >
                    {done ? "Registrada como Pendente" : "Registrar como Afirmação"}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
