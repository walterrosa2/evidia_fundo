import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { api, queryKeys } from "@/lib/operacao/api";
import {
  blockSummary,
  citableVersions,
  engineStatusClasses,
  engineStatusLabel,
} from "@/lib/operacao/engines";
import { formatDateTime, positionLabel } from "@/lib/operacao/labels";
import type { TableState } from "@/lib/operacao/tableState";
import type { EngineRunOut, OpportunityDetail, PositionSide } from "@/lib/operacao/types";
import { DataTable, type CellRenderer } from "./DataTable";
import { P4Requests } from "./P4Requests";
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

const itemRenderers: Record<string, CellRenderer> = {
  text: (_row, value) =>
    value === null ? (
      <span className="text-muted-foreground">Sem texto no relatório</span>
    ) : (
      <p className="line-clamp-2 break-words">{value}</p>
    ),
  answer: (_row, value) =>
    value === null ? (
      <span className="text-muted-foreground/70">—</span>
    ) : (
      <p className="line-clamp-2 break-words">{value}</p>
    ),
  pendencies_count: (_row, value) => (
    <span className={Number(value) > 0 ? "font-medium text-risk-high" : ""}>{value}</span>
  ),
};

/** Relatórios do P4 importados para o dossiê. A Evidia não executa o P4. */
export function P4Section({
  opportunity,
  canWrite,
  open,
  onOpen,
  onClose,
  tableState,
  onTableState,
}: {
  opportunity: OpportunityDetail;
  canWrite: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  tableState: TableState;
  onTableState: (next: TableState, options?: { replace?: boolean }) => void;
}) {
  const titleId = useId();
  const runs = useQuery({
    queryKey: queryKeys.engineRuns(opportunity.id),
    queryFn: () => api.engineRuns(opportunity.id),
  });
  const imported = (runs.data ?? []).filter((run) => run.engine === "p4");

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
        Etapa 3 · Motores especializados
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Provas, Quesitos e Respostas (P4)
        </h2>
        <Help topic="p4" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        O P4 mapeia provas, gera quesitos e respostas técnicas. A Evidia lê o relatório gerado e
        confere cada página citada contra o documento analisado.
      </p>
      <p
        role="note"
        className="mt-3 max-w-3xl rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
      >
        <span className="font-medium">A Evidia não executa o P4.</span> Cada execução do P4 consome
        API paga e não há modo simulado. A Evidia prepara o texto de entrada e registra o pedido; a
        execução é feita por quem tem autorização, e o relatório{" "}
        <span translate="no">relatorio_final.xlsx</span> gerado entra aqui.
      </p>

      <P4Requests opportunity={opportunity} canWrite={canWrite} />

      <h3 className="mt-8 text-base font-semibold tracking-tight">Relatórios Importados</h3>
      {canWrite && <ImportForm opportunity={opportunity} />}

      <div className="mt-4 space-y-4">
        {runs.isPending && <Loading label="Carregando relatórios…" />}
        {runs.isError && <ErrorNotice error={runs.error} onRetry={() => runs.refetch()} />}
        {runs.data && imported.length === 0 && (
          <EmptyState
            title="Nenhum relatório do P4 importado"
            description="Envie o relatório como documento do dossiê e importe indicando o documento que o P4 analisou."
          />
        )}
        {imported.map((run) => (
          <ImportCard key={run.id} run={run} opportunity={opportunity} />
        ))}
      </div>
      {imported.length > 0 && (
        <WithHelp topic="p4Items" className="mt-4">
          <button type="button" onClick={onOpen} className={secondaryButton}>
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            Ver Itens do P4
          </button>
        </WithHelp>
      )}

      {open && (
        <FullscreenDetail eyebrow="P4" title="Itens do P4" onBack={onClose}>
          <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
            A página vem da referência em texto livre do P4. Item com pendência não tem página
            identificável ou cita página que não existe no documento analisado.
          </p>
          <DataTable
            tableKey="p4_items"
            scopeId={opportunity.id}
            label="Itens do P4"
            noun={{ one: "item", many: "itens" }}
            state={tableState}
            onStateChange={onTableState}
            renderers={itemRenderers}
            emptyState={
              <EmptyState title="Nenhum item importado" description="Importe um relatório do P4." />
            }
          />
        </FullscreenDetail>
      )}
    </section>
  );
}

function ImportForm({ opportunity }: { opportunity: OpportunityDetail }) {
  const id = useId();
  const queryClient = useQueryClient();
  const versions = citableVersions(opportunity.documents);
  const isReport = (label: string, versionId: string) =>
    opportunity.documents.some((document) =>
      document.versions.some(
        (version) => version.id === versionId && version.filename.toLowerCase().endsWith(".xlsx"),
      ),
    ) && Boolean(label);
  const reports = versions.filter((option) => isReport(option.label, option.id));
  const sources = versions.filter((option) => !isReport(option.label, option.id));
  const [report, setReport] = useState("");
  const [source, setSource] = useState("");
  const [side, setSide] = useState<PositionSide | "">("");
  const [touched, setTouched] = useState(false);

  const run = useMutation({
    mutationFn: () =>
      api.importP4Report(opportunity.id, {
        report_version_id: report,
        source_version_id: source,
        simulated_side: side as PositionSide,
      }),
    onSuccess: () => {
      setTouched(false);
      setReport("");
      queryClient.invalidateQueries({ queryKey: queryKeys.engineRuns(opportunity.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    },
  });
  const missing = touched && (!report || !source || !side);

  return (
    <form
      aria-label="Importar relatório do P4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (report && source && side) run.mutate();
      }}
      className="mt-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <label htmlFor={`${id}-report`} className={labelClass}>
            Relatório do P4 (.xlsx)
          </label>
          <select
            id={`${id}-report`}
            value={report}
            onChange={(event) => setReport(event.target.value)}
            disabled={reports.length === 0}
            className={inputClass}
          >
            <option value="" className={optionClass}>
              {reports.length === 0 ? "Nenhuma planilha no dossiê" : "Selecione…"}
            </option>
            {reports.map((option) => (
              <option key={option.id} value={option.id} className={optionClass}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-source`} className={labelClass}>
            Documento que o P4 analisou
          </label>
          <select
            id={`${id}-source`}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={inputClass}
          >
            <option value="" className={optionClass}>
              Selecione…
            </option>
            {sources.map((option) => (
              <option key={option.id} value={option.id} className={optionClass}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className={labelClass}>Lado para o qual o P4 foi executado</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(["claimant", "defendant"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${
                  side === value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:bg-secondary/40"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-side`}
                  value={value}
                  checked={side === value}
                  onChange={() => setSide(value)}
                  className="size-4 accent-[var(--primary)]"
                />
                {positionLabel[value]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div aria-live="polite" className="mt-2">
        {missing && (
          <p className="text-sm text-risk-high">
            Escolha o relatório, o documento analisado e o lado: nada é presumido.
          </p>
        )}
        {run.isError && <ErrorNotice error={run.error} />}
        {run.isSuccess && <p className="text-sm text-risk-low">Relatório importado.</p>}
      </div>
      <WithHelp topic="p4Import" className="mt-3">
        <button type="submit" disabled={run.isPending} className={primaryButton}>
          {run.isPending ? "Importando…" : "Importar Relatório"}
        </button>
      </WithHelp>
    </form>
  );
}

function ImportCard({ run, opportunity }: { run: EngineRunOut; opportunity: OpportunityDetail }) {
  const summary = blockSummary(run.blocks);
  const source = opportunity.documents
    .flatMap((document) =>
      document.versions
        .filter((version) => version.id === run.document_version_ids[0])
        .map((version) => `${document.title} · v${version.version_no}`),
    )
    .at(0);

  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        Importado em <span className="tabular-nums">{formatDateTime(run.created_at)}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Pill className={engineStatusClasses[run.status]}>{engineStatusLabel[run.status]}</Pill>
        <Pill className="border-border text-muted-foreground">
          Lado: {positionLabel[run.simulated_side]}
        </Pill>
        {run.stale && (
          <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">Desatualizada</Pill>
        )}
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <dt className={labelClass}>Documento analisado</dt>
          <dd className="mt-1 break-words text-sm">{source ?? "Não localizado neste dossiê"}</dd>
        </div>
        <div>
          <dt className={labelClass}>Itens</dt>
          <dd className="mt-1 text-sm tabular-nums">{run.items_count}</dd>
        </div>
        <div>
          <dt className={labelClass}>Etapas com itens</dt>
          <dd className={`mt-1 text-sm ${summary.incomplete > 0 ? "text-risk-high" : ""}`}>
            {summary.completed} de {summary.total}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Versão do P4</dt>
          <dd className="mt-1 text-sm">{run.engine_version ?? "Não informada pelo relatório"}</dd>
        </div>
      </dl>
      {run.limitations.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {run.limitations.map((text) => (
            <li key={text} className="break-words">
              {text}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
