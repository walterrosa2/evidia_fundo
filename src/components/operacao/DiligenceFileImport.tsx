import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/operacao/api";
import { spreadsheetVersions } from "@/lib/operacao/engines";
import type { OpportunityDetail, ParticipantOut } from "@/lib/operacao/types";
import { ErrorNotice, inputClass, labelClass, secondaryButton, WithHelp } from "./primitives";

const optionClass = "bg-popover text-popover-foreground";

/**
 * Registra o resultado de uma consulta feita por pessoa autorizada em fonte real (tribunal,
 * conselho, fornecedor), a partir de uma planilha já recebida no dossiê. A planilha é a prova
 * da coleta; a cobertura é declarada por quem consultou.
 */
export function DiligenceFileImport({
  opportunity,
  participants,
}: {
  opportunity: OpportunityDetail;
  participants: ParticipantOut[];
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const sheets = spreadsheetVersions(opportunity.documents);
  const [participantId, setParticipantId] = useState("");
  const [fileId, setFileId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [coverage, setCoverage] = useState("");
  const [touched, setTouched] = useState(false);

  const complete =
    participantId && fileId && sourceName.trim().length >= 2 && coverage.trim().length >= 10;
  const send = useMutation({
    mutationFn: () =>
      api.importDiligenceFile(opportunity.id, {
        participant_id: participantId,
        file_version_id: fileId,
        source_name: sourceName.trim(),
        coverage: coverage.trim(),
      }),
    onSuccess: () => {
      setTouched(false);
      setFileId("");
      queryClient.invalidateQueries({ queryKey: queryKeys.participants(opportunity.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.crosscheck(opportunity.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    },
  });

  return (
    <form
      aria-label="Registrar consulta feita em fonte real"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (complete) send.mutate();
      }}
      className="mt-6 rounded-xl border border-border bg-card p-4"
    >
      <h3 className="text-base font-semibold tracking-tight">
        Registrar Consulta Feita em Fonte Real
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Envie ao dossiê a planilha com o resultado (uma linha por atuação, com as colunas Processo
        (CNJ), Tribunal, Papel, Lado, Data do ato, Ato, Data de distribuição e Referência na fonte)
        e indique aqui a fonte e o que ela cobre. Os vínculos entram como candidatos.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={`${id}-participant`} className={labelClass}>
            Profissional consultado
          </label>
          <select
            id={`${id}-participant`}
            value={participantId}
            onChange={(event) => setParticipantId(event.target.value)}
            aria-invalid={touched && !participantId}
            className={inputClass}
          >
            <option value="" className={optionClass}>
              Selecione…
            </option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id} className={optionClass}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-file`} className={labelClass}>
            Planilha do resultado (.xlsx)
          </label>
          <select
            id={`${id}-file`}
            value={fileId}
            onChange={(event) => setFileId(event.target.value)}
            aria-invalid={touched && !fileId}
            className={inputClass}
          >
            <option value="" className={optionClass}>
              {sheets.length === 0 ? "Nenhuma planilha .xlsx no dossiê" : "Selecione…"}
            </option>
            {sheets.map((option) => (
              <option key={option.id} value={option.id} className={optionClass}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-source`} className={labelClass}>
            Fonte consultada
          </label>
          <input
            id={`${id}-source`}
            type="text"
            autoComplete="off"
            maxLength={80}
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            aria-invalid={touched && sourceName.trim().length < 2}
            placeholder="Ex.: Portal do tribunal, conselho profissional…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-coverage`} className={labelClass}>
            O que a consulta cobre e o que não cobre
          </label>
          <textarea
            id={`${id}-coverage`}
            rows={2}
            maxLength={2000}
            value={coverage}
            onChange={(event) => setCoverage(event.target.value)}
            aria-invalid={touched && coverage.trim().length < 10}
            placeholder="Ex.: Busca por nome; não inclui processos em segredo de justiça…"
            className={inputClass}
          />
        </div>
      </div>
      <WithHelp topic="sourceFile" className="mt-3">
        <button type="submit" className={secondaryButton} disabled={send.isPending}>
          {send.isPending ? "Registrando…" : "Registrar Consulta"}
        </button>
      </WithHelp>
      <div aria-live="polite" className="mt-2 text-sm">
        {touched && !complete && (
          <p className="text-risk-high">
            Informe o profissional, a planilha, a fonte e a cobertura. Sem a cobertura, um resultado
            vazio seria lido como ausência de vínculo.
          </p>
        )}
        {send.isError && <ErrorNotice error={send.error} />}
        {send.data && (
          <p>
            Consulta registrada:{" "}
            {send.data.status === "no_results"
              ? "nada encontrado nesta cobertura."
              : `${send.data.results_count} atuação(ões) lida(s) da planilha.`}
          </p>
        )}
      </div>
    </form>
  );
}
