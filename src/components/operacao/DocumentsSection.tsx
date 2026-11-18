import { useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { api, documentContentUrl, queryKeys } from "@/lib/operacao/api";
import { categoryLabel, formatBytes, formatDateTime, gapStatusLabel } from "@/lib/operacao/labels";
import type { TableState } from "@/lib/operacao/tableState";
import type {
  DocumentCategory,
  DocumentUploadOut,
  MissingPieceOut,
  OpportunityDetail,
  OriginDocumentResult,
  TableRow,
} from "@/lib/operacao/types";
import { DataTable, type CellRenderer } from "./DataTable";
import {
  EmptyState,
  ErrorNotice,
  Help,
  inputClass,
  labelClass,
  Pill,
  primaryButton,
  secondaryButton,
} from "./primitives";

const DOC_TYPES = [
  ["nao_classificado", "Não classificado"],
  ["processo_integral", "Processo integral"],
  ["peticao_inicial", "Petição inicial"],
  ["contestacao", "Contestação"],
  ["laudo_pericial", "Laudo pericial"],
  ["parecer_assistente", "Parecer do assistente técnico"],
  ["contrato", "Contrato"],
  ["decisao", "Decisão"],
  ["comprovante", "Comprovante"],
  ["relatorio_originacao", "Relatório da originação"],
] as const;

function useInvalidate(opportunityId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(opportunityId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.claims(opportunityId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
    queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    // Documento novo deixa as execuções de motor desatualizadas.
    queryClient.invalidateQueries({ queryKey: queryKeys.engineRuns(opportunityId) });
  };
}

function uploadSummary(result: DocumentUploadOut): string {
  if (result.duplicate) {
    return "Arquivo idêntico já recebido neste dossiê: nenhuma fonte nova foi criada.";
  }
  const parts = [`Versão ${result.version.version_no} recebida.`];
  if (result.superseded_claims > 0) {
    parts.push(
      `${result.superseded_claims} afirmação(ões) baseada(s) na versão anterior foram marcadas como desatualizadas.`,
    );
  }
  if (result.superseded_calculations > 0) {
    parts.push(`${result.superseded_calculations} cálculo(s) ficaram desatualizados.`);
  }
  return parts.join(" ");
}

const documentRenderers: Record<string, CellRenderer> = {
  title: (_row, value) => (
    <span className="block truncate font-medium text-foreground" title={String(value ?? "")}>
      {value}
    </span>
  ),
  version_no: (_row, value) => <>v{value}</>,
  is_current: (_row, value, label) => (
    <span className={value ? "text-risk-low" : "text-muted-foreground"}>{label}</span>
  ),
  state: (_row, value, label) => (
    <Pill
      className={
        value === "stored"
          ? "border-risk-low/30 bg-risk-low/15 text-risk-low"
          : "border-risk-high/30 bg-risk-high/15 text-risk-high"
      }
    >
      {label}
    </Pill>
  ),
  category: (_row, value, label) => (
    <span className={value === "derived_report" ? "text-gold" : ""}>{label}</span>
  ),
  sha256: (_row, value) => (
    <span className="block truncate font-mono text-xs" translate="no" title={String(value)}>
      {String(value).slice(0, 16)}…
    </span>
  ),
  size_bytes: (_row, value) => <>{formatBytes(Number(value))}</>,
};

export function DocumentsSection({
  opportunity,
  canWrite,
  tableState,
  onTableState,
  onOpenDocument,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  /** Abre texto, OCR e estrutura da versão em tela inteira. */
  onOpenDocument: (versionId: string) => void;
  tableState: TableState;
  onTableState: (next: TableState, options?: { replace?: boolean }) => void;
}) {
  const invalidate = useInvalidate(opportunity.id);
  const formId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocumentCategory>("piece");
  const [notice, setNotice] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<unknown>(null);

  const upload = useMutation({
    mutationFn: (form: FormData) => api.uploadDocument(opportunity.id, form),
    onSuccess: (result) => {
      setNotice(uploadSummary(result));
      if (fileRef.current) fileRef.current.value = "";
      invalidate();
    },
    onError: () => setNotice(null),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!(form.get("file") instanceof File) || (form.get("file") as File).size === 0) {
      fileRef.current?.focus();
      return;
    }
    upload.mutate(form);
  };

  return (
    <section aria-labelledby={`${formId}-title`} className="mt-10">
      <div className="flex items-center gap-2">
        <h2 id={`${formId}-title`} className="text-lg font-semibold tracking-tight">
          Documentos do Dossiê
        </h2>
        <Help topic="documents" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Cada arquivo é guardado no original, com hash, versão, origem e contagem real de páginas.
        Nova versão não apaga a anterior.
      </p>

      {canWrite && <OriginDocuments opportunityId={opportunity.id} onDone={invalidate} />}

      {canWrite && (
        <form
          onSubmit={submit}
          className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
        >
          <div>
            <label htmlFor={`${formId}-file`} className={labelClass}>
              Arquivo
            </label>
            <input
              ref={fileRef}
              id={`${formId}-file`}
              name="file"
              type="file"
              required
              accept=".pdf,.txt,.md,.docx,.xlsx,.png,.jpg,.jpeg"
              className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-foreground`}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-title-input`} className={labelClass}>
              Título
            </label>
            <input
              id={`${formId}-title-input`}
              name="title"
              type="text"
              autoComplete="off"
              placeholder="Ex.: Laudo pericial contábil…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-type`} className={labelClass}>
              Tipo documental
            </label>
            <select
              id={`${formId}-type`}
              name="doc_type"
              defaultValue="nao_classificado"
              className={inputClass}
            >
              {DOC_TYPES.map(([value, label]) => (
                <option key={value} value={value} className="bg-popover text-popover-foreground">
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-category`} className={labelClass}>
              Categoria
            </label>
            <select
              id={`${formId}-category`}
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as DocumentCategory)}
              className={inputClass}
            >
              {(Object.keys(categoryLabel) as DocumentCategory[]).map((value) => (
                <option key={value} value={value} className="bg-popover text-popover-foreground">
                  {categoryLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={upload.isPending} className={primaryButton}>
            {upload.isPending ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                Enviando…
              </>
            ) : (
              <>
                <FileUp aria-hidden="true" className="size-4" />
                Enviar Documento
              </>
            )}
          </button>
        </form>
      )}

      <div aria-live="polite" className="mt-3">
        {notice && (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
            {notice}
          </p>
        )}
        {upload.isError && <ErrorNotice error={upload.error} />}
        {versionError != null && <ErrorNotice error={versionError} />}
      </div>

      <div className="mt-4">
        <DataTable
          tableKey="documents"
          scopeId={opportunity.id}
          label="Documentos do dossiê e suas versões"
          noun={{ one: "versão de documento", many: "versões de documentos" }}
          state={tableState}
          onStateChange={onTableState}
          renderers={documentRenderers}
          actionsWidth={canWrite ? 520 : 340}
          rowActions={(row) => (
            <DocumentActions
              row={row}
              opportunityId={opportunity.id}
              canWrite={canWrite}
              onNotice={setNotice}
              onError={setVersionError}
              onOpen={() => onOpenDocument(row.id)}
            />
          )}
          emptyState={
            <EmptyState
              title="Nenhum documento recebido"
              description="A originação não entrega os autos. Envie o processo integral ou as peças autorizadas para iniciar a estruturação."
            />
          }
        />
      </div>
    </section>
  );
}

function DocumentActions({
  row,
  opportunityId,
  canWrite,
  onNotice,
  onError,
  onOpen,
}: {
  row: TableRow;
  opportunityId: string;
  canWrite: boolean;
  onOpen: () => void;
  onNotice: (text: string | null) => void;
  onError: (error: unknown) => void;
}) {
  const invalidate = useInvalidate(opportunityId);
  const inputRef = useRef<HTMLInputElement>(null);
  const title = String(row.values.title ?? "documento");
  const documentId = row.refs?.document_id;

  const newVersion = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set("file", file);
      form.set("document_id", documentId ?? "");
      return api.uploadDocument(opportunityId, form);
    },
    onMutate: () => onError(null),
    onSuccess: (result) => {
      onNotice(uploadSummary(result));
      invalidate();
    },
    onError: (error) => {
      onNotice(null);
      onError(error);
    },
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  return (
    <span className="inline-flex flex-wrap justify-end gap-2">
      <a
        href={documentContentUrl(row.id)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir original de ${title}, versão ${row.values.version_no}`}
        className={secondaryButton}
      >
        Abrir Original
      </a>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Texto e estrutura de ${title}, versão ${row.values.version_no}`}
        className={secondaryButton}
      >
        Texto e Estrutura
      </button>
      {canWrite && documentId && row.values.is_current === true && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label={`Arquivo da nova versão de ${title}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) newVersion.mutate(file);
            }}
          />
          <button
            type="button"
            disabled={newVersion.isPending}
            onClick={() => inputRef.current?.click()}
            className={secondaryButton}
          >
            {newVersion.isPending ? "Enviando…" : "Enviar Nova Versão"}
          </button>
        </>
      )}
    </span>
  );
}

export function GapsSection({
  opportunity,
  canWrite,
  tableState,
  onTableState,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  tableState: TableState;
  onTableState: (next: TableState, options?: { replace?: boolean }) => void;
}) {
  const invalidate = useInvalidate(opportunity.id);
  const baseId = useId();
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");

  const add = useMutation({
    mutationFn: () => api.addMissingPiece(opportunity.id, description.trim(), reason.trim()),
    onSuccess: () => {
      setDescription("");
      setReason("");
      invalidate();
    },
  });
  const update = useMutation({
    mutationFn: (args: { id: string; status: MissingPieceOut["status"] }) =>
      api.updateMissingPiece(args.id, args.status),
    onSuccess: invalidate,
  });

  return (
    <section aria-labelledby={`${baseId}-title`} className="mt-10">
      <div className="flex items-center gap-2">
        <h2 id={`${baseId}-title`} className="text-lg font-semibold tracking-tight">
          Lacunas Documentais
        </h2>
        <Help topic="gaps" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Peça ausente é lacuna explícita. Documento não recebido não equivale a ausência de
        irregularidade.
      </p>

      <div className="mt-4">
        <DataTable
          tableKey="missing_pieces"
          scopeId={opportunity.id}
          label="Lacunas documentais do dossiê"
          noun={{ one: "lacuna", many: "lacunas" }}
          state={tableState}
          onStateChange={onTableState}
          actionsWidth={210}
          rowActions={
            canWrite
              ? (row) => {
                  const isOpen = row.values.status === "open";
                  return (
                    <button
                      type="button"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: row.id, status: isOpen ? "received" : "open" })
                      }
                      aria-label={`${isOpen ? "Marcar como recebida" : "Reabrir lacuna"}: ${String(
                        row.values.description ?? "",
                      ).slice(0, 80)}`}
                      className={secondaryButton}
                    >
                      {isOpen ? "Marcar como Recebida" : "Reabrir Lacuna"}
                    </button>
                  );
                }
              : undefined
          }
          emptyState={
            <EmptyState
              title="Nenhuma lacuna registrada"
              description="Peça citada e não recebida deve ser registrada aqui; ausência de registro não prova que o dossiê está completo."
            />
          }
        />
      </div>
      {update.isError && (
        <div className="mt-3">
          <ErrorNotice error={update.error} />
        </div>
      )}

      {canWrite && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (description.trim().length >= 3) add.mutate();
          }}
          className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
        >
          <div>
            <label htmlFor={`${baseId}-desc`} className={labelClass}>
              Peça citada e não recebida
            </label>
            <input
              id={`${baseId}-desc`}
              type="text"
              autoComplete="off"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: Anexo 3 citado no laudo…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${baseId}-reason`} className={labelClass}>
              Onde é citada
            </label>
            <input
              id={`${baseId}-reason`}
              type="text"
              autoComplete="off"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: Laudo, página 12…"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={add.isPending || description.trim().length < 3}
            className={secondaryButton}
          >
            {add.isPending ? "Registrando…" : "Registrar Lacuna"}
          </button>
        </form>
      )}
      {add.isError && (
        <div className="mt-3">
          <ErrorNotice error={add.error} />
        </div>
      )}
    </section>
  );
}

const originOutcome: Record<OriginDocumentResult["outcome"], string> = {
  stored: "recebido",
  duplicate: "já estava no dossiê",
  not_available: "a origem não tem este relatório",
  rejected: "arquivo recusado",
};

/**
 * Traz os relatórios que a originação gera para o processo. São relatórios derivados:
 * entram no dossiê como tal e não substituem os autos.
 */
function OriginDocuments({ opportunityId, onDone }: { opportunityId: string; onDone: () => void }) {
  const fetchReports = useMutation({
    mutationFn: () => api.importOriginDocuments(opportunityId),
    onSuccess: onDone,
  });
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={secondaryButton}
          disabled={fetchReports.isPending}
          onClick={() => fetchReports.mutate()}
        >
          {fetchReports.isPending ? "Buscando…" : "Importar Relatórios da Originação"}
        </button>
        <Help topic="originReports" />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Estudo e dossiê gerados pela originação. São relatórios derivados: não são cópia dos autos
          e não liberam o parecer integral.
        </p>
      </div>
      <div aria-live="polite">
        {fetchReports.isError && (
          <div className="mt-3">
            <ErrorNotice error={fetchReports.error} />
          </div>
        )}
        {fetchReports.data &&
          (fetchReports.data.results.length === 0 ? (
            <p className="mt-3 text-sm">A origem não lista relatórios para este processo.</p>
          ) : (
            <ul
              aria-label="Resultado da importação de relatórios"
              className="mt-3 space-y-1 text-sm"
            >
              {fetchReports.data.results.map((result) => (
                <li key={result.kind}>
                  <span className="font-medium">{result.title}:</span>{" "}
                  {originOutcome[result.outcome]}
                  {result.outcome === "rejected" && result.reason ? ` (${result.reason})` : ""}.
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
