import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, queryKeys } from "@/lib/operacao/api";
import { downloadBlob } from "@/lib/operacao/download";
import { formatDateTime } from "@/lib/operacao/labels";
import { stageStatusLabel, stageStatusTone } from "@/lib/operacao/stages";
import type { MemoOut, OpportunityDetail, StageOut } from "@/lib/operacao/types";
import {
  EmptyState,
  ErrorNotice,
  Help,
  inputClass,
  labelClass,
  Loading,
  Pill,
  primaryButton,
  secondaryButton,
} from "./primitives";

const decisionLabel = { approved: "Aprovado", returned: "Devolvido" } as const;

function MemoDownload({ memo }: { memo: MemoOut }) {
  const download = useMutation({
    mutationFn: () => api.exportMemo(memo.id),
    onSuccess: (blob) => downloadBlob(blob, `memorando-v${memo.version}.md`),
  });
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className={secondaryButton}
        disabled={download.isPending}
        onClick={() => download.mutate()}
        aria-label={`Baixar memorando versão ${memo.version}`}
      >
        <Download aria-hidden="true" className="size-4" />
        {download.isPending ? "Gerando…" : "Baixar"}
      </button>
      <span aria-live="polite" className="text-xs text-risk-critical">
        {download.isError && "Não foi possível baixar. Tente novamente."}
      </span>
    </span>
  );
}

/** Aprovação ou devolução de uma versão do memorando. Uma decisão por versão. */
function MemoDecisionForm({ memo }: { memo: MemoOut }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [missing, setMissing] = useState(false);
  const decide = useMutation({
    mutationFn: (decision: "approved" | "returned") =>
      api.decideMemo(memo.id, { decision, comment: comment.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memos(memo.opportunity_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stages(memo.opportunity_id) });
    },
  });
  const submit = (decision: "approved" | "returned") => {
    if (comment.trim().length < 3) {
      setMissing(true);
      document.getElementById(`${id}-comment`)?.focus();
      return;
    }
    setMissing(false);
    decide.mutate(decision);
  };
  return (
    <form
      aria-label={`Decisão sobre o memorando versão ${memo.version}`}
      onSubmit={(event) => event.preventDefault()}
      className="mt-3 rounded-md border border-border/60 bg-surface/40 p-3"
    >
      <label htmlFor={`${id}-comment`} className={labelClass}>
        Fundamento da decisão
      </label>
      <textarea
        id={`${id}-comment`}
        rows={2}
        maxLength={2000}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        aria-invalid={missing ? true : undefined}
        aria-describedby={missing ? `${id}-error` : undefined}
        placeholder="Ex.: Premissas conferidas com o comitê em 17/11…"
        className={`${inputClass} mt-1`}
      />
      {missing && (
        <p id={`${id}-error`} className="mt-1 text-xs text-risk-critical">
          Informe o fundamento: a decisão fica registrada com autoria.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButton}
          disabled={decide.isPending}
          onClick={() => submit("approved")}
        >
          Aprovar Memorando
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={decide.isPending}
          onClick={() => submit("returned")}
        >
          Devolver Memorando
        </button>
        <span className="inline-flex items-center">
          <Help topic="memoDecision" />
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        A decisão registra quem respondeu por esta versão. Não homologa a metodologia econômica nem
        define contrato.
      </p>
      <div aria-live="polite">{decide.isError && <ErrorNotice error={decide.error} />}</div>
    </form>
  );
}

function MemoCard({ memo, canReview }: { memo: MemoOut; canReview: boolean }) {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">Memorando Econômico v{memo.version}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Emitido em <span className="tabular-nums">{formatDateTime(memo.created_at)}</span>
          </p>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Pill className="border-border text-muted-foreground">
              Fórmula <span translate="no">&nbsp;{memo.formula_version}</span>
            </Pill>
            <Pill className="border-border text-muted-foreground">
              Dossiê v{memo.dossier_version}
            </Pill>
            <Pill className="border-gold/40 bg-gold/10 text-gold">Não homologado</Pill>
            {memo.decision ? (
              <Pill
                className={
                  memo.decision === "approved"
                    ? "border-risk-low/30 bg-risk-low/15 text-risk-low"
                    : "border-risk-high/30 bg-risk-high/15 text-risk-high"
                }
              >
                {decisionLabel[memo.decision]}
              </Pill>
            ) : (
              <Pill className="border-border text-muted-foreground">Sem decisão</Pill>
            )}
            {memo.stale && (
              <Pill className="border-risk-high/30 bg-risk-high/15 text-risk-high">
                Desatualizado
              </Pill>
            )}
          </span>
        </div>
        <MemoDownload memo={memo} />
      </div>
      {memo.decision && (
        <p className="mt-3 break-words rounded-md border border-border/60 bg-surface/40 px-3 py-2 text-sm">
          <span className="font-medium">{decisionLabel[memo.decision]}</span>
          {memo.decided_at && (
            <>
              {" "}
              em <span className="tabular-nums">{formatDateTime(memo.decided_at)}</span>
            </>
          )}
          : {memo.decision_comment}
        </p>
      )}
      {memo.stale && (
        <p className="mt-3 text-sm text-muted-foreground">
          {memo.stale_reason ?? "O dossiê mudou depois deste memorando"}. A versão continua
          consultável, mas não representa os documentos atuais.
        </p>
      )}
      {canReview && !memo.decision && !memo.stale && <MemoDecisionForm memo={memo} />}
      <details className="mt-3">
        <summary className="cursor-pointer rounded text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Ler o memorando v{memo.version}
        </summary>
        <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface/60 p-3 text-xs leading-relaxed">
          {memo.body}
        </pre>
      </details>
    </li>
  );
}

/**
 * Etapa 6: pendências das etapas anteriores e memorandos versionados, com a decisão do
 * responsável. Nada aqui recomenda investimento: a recomendação é de quem decide.
 */
export function DecisionSection({
  opportunity,
  canReview,
  stages,
}: {
  opportunity: OpportunityDetail;
  canReview: boolean;
  stages: StageOut[] | undefined;
}) {
  const titleId = useId();
  const memos = useQuery({
    queryKey: queryKeys.memos(opportunity.id),
    queryFn: () => api.memos(opportunity.id),
  });
  const open = (stages ?? []).filter((stage) => stage.number < 6 && stage.pending.length > 0);

  return (
    <section aria-labelledby={titleId} className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
        Etapa 6 · Decisão e negociação
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Decisão e Memorandos
        </h2>
        <Help topic="decision" />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Reúne o que ainda está pendente nas etapas anteriores e os memorandos emitidos. Cada versão
        do memorando é um retrato do demonstrativo e não é reescrita; a decisão é de um responsável
        e fica registrada.
      </p>

      <h3 className="mt-5 text-base font-semibold tracking-tight">Pendências Consolidadas</h3>
      {stages === undefined ? (
        <Loading label="Carregando estado das etapas…" />
      ) : open.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma pendência registrada nas etapas 1 a 5 para a versão atual do dossiê.
        </p>
      ) : (
        <ul aria-label="Pendências por etapa" className="mt-2 space-y-2">
          {open.map((stage) => (
            <li key={stage.key} className="rounded-md border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {stage.number}. {stage.title}
                </span>
                <Pill className={stageStatusTone[stage.status]}>
                  {stageStatusLabel[stage.status]}
                </Pill>
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {stage.pending.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-base font-semibold tracking-tight">Memorandos Emitidos</h3>
      <div className="mt-2">
        {memos.isPending && <Loading label="Carregando memorandos…" />}
        {memos.isError && <ErrorNotice error={memos.error} onRetry={() => memos.refetch()} />}
        {memos.data && memos.data.length === 0 && (
          <EmptyState
            title="Nenhum memorando emitido"
            description="O memorando é emitido a partir de um demonstrativo vigente, na etapa 5."
          />
        )}
        {memos.data && memos.data.length > 0 && (
          <ul aria-label="Memorandos Emitidos" className="space-y-3">
            {memos.data.map((memo) => (
              <MemoCard key={memo.id} memo={memo} canReview={canReview} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
