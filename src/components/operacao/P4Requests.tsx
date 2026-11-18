import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, queryKeys } from "@/lib/operacao/api";
import { downloadBlob } from "@/lib/operacao/download";
import { citableVersions, spreadsheetVersions } from "@/lib/operacao/engines";
import { formatDateTime, positionLabel } from "@/lib/operacao/labels";
import type { OpportunityDetail, P4RequestOut, PositionSide } from "@/lib/operacao/types";
import {
  ErrorNotice,
  inputClass,
  labelClass,
  Pill,
  primaryButton,
  secondaryButton,
  WithHelp,
} from "./primitives";

const optionClass = "bg-popover text-popover-foreground";

const statusLabel: Record<P4RequestOut["status"], string> = {
  awaiting_external: "Aguardando execução externa",
  imported: "Relatório importado",
  cancelled: "Cancelado",
};

const statusTone: Record<P4RequestOut["status"], string> = {
  awaiting_external: "border-gold/40 bg-gold/10 text-gold",
  imported: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  cancelled: "border-border text-muted-foreground",
};

/**
 * Pedidos de execução do P4. O P4 não tem API: a Evidia registra o pedido, gera o texto de
 * entrada no formato que o P4 lê e fecha o pedido quando o relatório é importado.
 */
export function P4Requests({
  opportunity,
  canWrite,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
}) {
  const titleId = useId();
  const requests = useQuery({
    queryKey: queryKeys.p4Requests(opportunity.id),
    queryFn: () => api.p4Requests(opportunity.id),
  });

  return (
    <div className="mt-6">
      <h3 id={titleId} className="text-base font-semibold tracking-tight">
        Pedidos de Execução
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        O pedido fixa o documento, o lado e o texto de entrada. Quem tem autorização executa o P4
        com esse texto, fora da Evidia; o relatório importado fecha o pedido.
      </p>
      {canWrite && <RequestForm opportunity={opportunity} />}
      {requests.isError && (
        <div className="mt-3">
          <ErrorNotice error={requests.error} onRetry={() => requests.refetch()} />
        </div>
      )}
      {requests.data && requests.data.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido de execução registrado.</p>
      )}
      {requests.data && requests.data.length > 0 && (
        <ul aria-labelledby={titleId} className="mt-3 space-y-3">
          {requests.data.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              opportunity={opportunity}
              canWrite={canWrite}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestForm({ opportunity }: { opportunity: OpportunityDetail }) {
  const id = useId();
  const queryClient = useQueryClient();
  const documents = citableVersions(opportunity.documents);
  const [versionId, setVersionId] = useState("");
  const [side, setSide] = useState<PositionSide | "">("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      api.createP4Request(opportunity.id, {
        document_version_id: versionId,
        simulated_side: side as PositionSide,
        note: note.trim(),
      }),
    onSuccess: () => {
      setTouched(false);
      setNote("");
      queryClient.invalidateQueries({ queryKey: queryKeys.p4Requests(opportunity.id) });
    },
  });
  const missing = touched && (!versionId || !side);

  return (
    <form
      aria-label="Preparar execução do P4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (versionId && side) create.mutate();
      }}
      className="mt-3 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.4fr)_auto] lg:items-end"
    >
      <div>
        <label htmlFor={`${id}-doc`} className={labelClass}>
          Documento a analisar no P4
        </label>
        <select
          id={`${id}-doc`}
          value={versionId}
          onChange={(event) => setVersionId(event.target.value)}
          aria-invalid={touched && !versionId}
          className={inputClass}
        >
          <option value="" className={optionClass}>
            Selecione…
          </option>
          {documents.map((option) => (
            <option key={option.id} value={option.id} className={optionClass}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-side`} className={labelClass}>
          Lado da execução
        </label>
        <select
          id={`${id}-side`}
          value={side}
          onChange={(event) => setSide(event.target.value as PositionSide | "")}
          aria-invalid={touched && !side}
          className={inputClass}
        >
          <option value="" className={optionClass}>
            Selecione…
          </option>
          <option value="claimant" className={optionClass}>
            {positionLabel.claimant}
          </option>
          <option value="defendant" className={optionClass}>
            {positionLabel.defendant}
          </option>
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-note`} className={labelClass}>
          Orientação para quem executa
        </label>
        <input
          id={`${id}-note`}
          type="text"
          autoComplete="off"
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Opcional…"
          className={inputClass}
        />
      </div>
      <WithHelp topic="p4Request">
        <button type="submit" className={primaryButton} disabled={create.isPending}>
          {create.isPending ? "Preparando…" : "Preparar Execução"}
        </button>
      </WithHelp>
      <div aria-live="polite" className="md:col-span-2 lg:col-span-4">
        {missing && (
          <p className="text-sm text-risk-high">
            Escolha o documento e confirme o lado: nada é presumido.
          </p>
        )}
        {create.isError && <ErrorNotice error={create.error} />}
      </div>
    </form>
  );
}

function RequestCard({
  request,
  opportunity,
  canWrite,
}: {
  request: P4RequestOut;
  opportunity: OpportunityDetail;
  canWrite: boolean;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const reports = spreadsheetVersions(opportunity.documents);
  const [reportId, setReportId] = useState("");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.p4Requests(opportunity.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.engineRuns(opportunity.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    queryClient.invalidateQueries({ queryKey: queryKeys.stages(opportunity.id) });
  };
  const download = useMutation({
    mutationFn: () => api.p4RequestPackage(request.id),
    onSuccess: (blob) => downloadBlob(blob, `p4-entrada-${request.id.slice(0, 8)}.txt`),
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelP4Request(request.id),
    onSuccess: refresh,
  });
  const close = useMutation({
    mutationFn: () =>
      api.importP4Report(opportunity.id, {
        report_version_id: reportId,
        source_version_id: request.document_version_id,
        simulated_side: request.simulated_side,
        request_id: request.id,
      }),
    onSuccess: refresh,
  });
  const source = citableVersions(opportunity.documents).find(
    (option) => option.id === request.document_version_id,
  );
  const pending = request.status === "awaiting_external";

  return (
    <li className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">{source?.label ?? "Documento do dossiê"}</p>
          <p className="mt-1 text-muted-foreground">
            Pedido em <span className="tabular-nums">{formatDateTime(request.created_at)}</span> ·
            lado {positionLabel[request.simulated_side].toLowerCase()} ·{" "}
            <span className="tabular-nums">{request.pages}</span>{" "}
            {request.pages === 1 ? "página" : "páginas"}
          </p>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Pill className={statusTone[request.status]}>{statusLabel[request.status]}</Pill>
            {request.stale && (
              <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                Documento substituído
              </Pill>
            )}
          </span>
        </div>
        {pending && (
          <button
            type="button"
            className={secondaryButton}
            disabled={download.isPending}
            onClick={() => download.mutate()}
          >
            <Download aria-hidden="true" className="size-4" />
            {download.isPending ? "Gerando…" : "Baixar Texto de Entrada"}
          </button>
        )}
      </div>
      {request.note && <p className="mt-2 break-words text-muted-foreground">{request.note}</p>}
      {request.ambiguous_markers > 0 && (
        <p className="mt-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2">
          {request.ambiguous_markers}{" "}
          {request.ambiguous_markers === 1 ? "linha do texto cita" : "linhas do texto citam"} página
          (“fls.”, “pág.”) e o P4 pode lê-las como quebra de página. O texto não foi alterado;
          confira as páginas do relatório ao importar.
        </p>
      )}
      {pending && canWrite && (
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div>
            <label htmlFor={`${id}-report`} className={labelClass}>
              Relatório gerado para este pedido (.xlsx)
            </label>
            <select
              id={`${id}-report`}
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              className={inputClass}
            >
              <option value="" className={optionClass}>
                {reports.length === 0 ? "Nenhuma planilha .xlsx no dossiê" : "Selecione…"}
              </option>
              {reports.map((option) => (
                <option key={option.id} value={option.id} className={optionClass}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={primaryButton}
            disabled={!reportId || close.isPending}
            onClick={() => close.mutate()}
          >
            {close.isPending ? "Importando…" : "Importar e Fechar Pedido"}
          </button>
          <button
            type="button"
            className={secondaryButton}
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            Cancelar Pedido
          </button>
        </div>
      )}
      <div aria-live="polite" className="mt-2">
        {download.isError && <ErrorNotice error={download.error} />}
        {cancel.isError && <ErrorNotice error={cancel.error} />}
        {close.isError && <ErrorNotice error={close.error} />}
      </div>
    </li>
  );
}
