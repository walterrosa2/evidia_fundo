import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, documentContentUrl, queryKeys } from "@/lib/operacao/api";
import { citableVersions } from "@/lib/operacao/engines";
import { formatPages } from "@/lib/operacao/labels";
import type { ClaimEvidenceOut, ClaimOut, OpportunityDetail } from "@/lib/operacao/types";
import { ErrorNotice, inputClass, labelClass, Pill, secondaryButton } from "./primitives";

const stanceLabel = { supporting: "Favorável", contrary: "Contrária" } as const;
const stanceClasses = {
  supporting: "border-risk-low/30 bg-risk-low/15 text-risk-low",
  contrary: "border-risk-high/30 bg-risk-high/15 text-risk-high",
} as const;

/** Evidências favoráveis e contrárias a uma afirmação, sempre com documento e página. */
export function ClaimEvidences({
  claim,
  opportunity,
  canWrite,
}: {
  claim: ClaimOut;
  opportunity: OpportunityDetail;
  canWrite: boolean;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.claims(opportunity.id) });
  const options = citableVersions(opportunity.documents);
  const [stance, setStance] = useState<"supporting" | "contrary">("supporting");
  const [versionId, setVersionId] = useState("");
  const [page, setPage] = useState("");
  const [note, setNote] = useState("");

  const add = useMutation({
    mutationFn: () =>
      api.addClaimEvidence(claim.id, {
        stance,
        document_version_id: versionId,
        page_start: Number(page),
        note: note.trim(),
      }),
    onSuccess: () => {
      setVersionId("");
      setPage("");
      setNote("");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (evidenceId: string) => api.deleteClaimEvidence(evidenceId),
    onSuccess: refresh,
  });
  const selected = options.find((option) => option.id === versionId);

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-base font-semibold tracking-tight">
        Evidências Favoráveis e Contrárias
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Evidência contrária não muda o estado da afirmação por conta própria: a decisão é de quem
        revisa.
      </p>
      {claim.evidences.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma evidência registrada.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {claim.evidences.map((evidence) => (
            <EvidenceItem
              key={evidence.id}
              evidence={evidence}
              canWrite={canWrite}
              removing={remove.isPending}
              onRemove={() => remove.mutate(evidence.id)}
            />
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
          aria-label="Registrar evidência da afirmação"
          onSubmit={(event) => {
            event.preventDefault();
            if (versionId && page) add.mutate();
          }}
          className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
        >
          <div>
            <label htmlFor={`${id}-stance`} className={labelClass}>
              Posição da evidência
            </label>
            <select
              id={`${id}-stance`}
              value={stance}
              onChange={(event) => setStance(event.target.value as "supporting" | "contrary")}
              className={inputClass}
            >
              <option value="supporting" className="bg-popover text-popover-foreground">
                Favorável à afirmação
              </option>
              <option value="contrary" className="bg-popover text-popover-foreground">
                Contrária à afirmação
              </option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-doc`} className={labelClass}>
              Documento
            </label>
            <select
              id={`${id}-doc`}
              value={versionId}
              onChange={(event) => setVersionId(event.target.value)}
              className={inputClass}
            >
              <option value="" className="bg-popover text-popover-foreground">
                Selecione…
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
              onChange={(event) => setPage(event.target.value)}
              placeholder="Ex.: 12…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-note`} className={labelClass}>
              O que a página mostra
            </label>
            <input
              id={`${id}-note`}
              type="text"
              autoComplete="off"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: A contestação atribui o atraso a caso fortuito…"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <div aria-live="polite">{add.isError && <ErrorNotice error={add.error} />}</div>
            <button
              type="submit"
              disabled={add.isPending || !versionId || !page}
              className={`${secondaryButton} mt-1`}
            >
              {add.isPending ? "Registrando…" : "Registrar Evidência"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function EvidenceItem({
  evidence,
  canWrite,
  removing,
  onRemove,
}: {
  evidence: ClaimEvidenceOut;
  canWrite: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <Pill className={stanceClasses[evidence.stance]}>{stanceLabel[evidence.stance]}</Pill>
      <div className="min-w-0 flex-1">
        <p className="break-words">
          {evidence.document_title ?? "Documento"} · v{evidence.document_version_no} ·{" "}
          <span className="tabular-nums">
            {formatPages(evidence.page_start, evidence.page_end)}
          </span>
          <a
            href={documentContentUrl(evidence.document_version_id)}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Abrir original
          </a>
        </p>
        {!evidence.is_current_version && (
          <p className="text-xs text-risk-high">Cita versão anterior do documento.</p>
        )}
        {evidence.note && <p className="mt-1 break-words text-muted-foreground">{evidence.note}</p>}
        {evidence.excerpt && (
          <p className="mt-1 break-words text-muted-foreground">“{evidence.excerpt}”</p>
        )}
      </div>
      {canWrite && (
        <button type="button" disabled={removing} onClick={onRemove} className={secondaryButton}>
          Remover
        </button>
      )}
    </li>
  );
}
