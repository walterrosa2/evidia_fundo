import { useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { DataTable, type CellRenderer } from "@/components/operacao/DataTable";
import { OperationalShell } from "@/components/operacao/OperationalShell";
import { EmptyState, primaryButton, SyntheticBadge } from "@/components/operacao/primitives";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  defaultTableState,
  isDefaultState,
  parseTableState,
  type TableState,
} from "@/lib/operacao/tableState";

type ListSearch = { tabela?: TableState };

export const Route = createFileRoute("/operacao/")({
  head: () => ({ meta: [{ title: "Oportunidades — Operação EvidIA" }] }),
  // Colunas, filtros, ordenação e página ficam na URL: voltar do dossiê restaura a lista.
  validateSearch: (search: Record<string, unknown>): ListSearch => {
    const state = parseTableState(search.tabela);
    return isDefaultState(state) ? {} : { tabela: state };
  },
  component: () => (
    <OperationalShell context="Oportunidades">
      <Opportunities />
    </OperationalShell>
  ),
});

const renderers: Record<string, CellRenderer> = {
  cnj: (row, value) => (
    <>
      <Link
        to="/operacao/$id"
        params={{ id: row.id }}
        className="block truncate rounded-sm font-medium tabular-nums text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        translate="no"
      >
        {value ?? "Rascunho sem CNJ válido"}
      </Link>
      {row.is_synthetic && <SyntheticBadge className="mt-1.5" />}
    </>
  ),
  has_full_record: (_row, value, label) => (
    <span className={value ? "" : "text-risk-high"}>{label}</span>
  ),
  process_status: (_row, value, label) => (
    <span className={value === "draft" ? "text-risk-high" : ""}>{label}</span>
  ),
  open_conflicts_count: (_row, value) => (
    <span className={Number(value) > 0 ? "font-medium text-risk-critical" : ""}>{value}</span>
  ),
};

function Opportunities() {
  const { tabela } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const state = tabela ?? defaultTableState;

  const onStateChange = useCallback(
    (next: TableState, options?: { replace?: boolean }) =>
      navigate({
        search: isDefaultState(next) ? {} : { tabela: next },
        replace: options?.replace,
        resetScroll: false,
      }),
    [navigate],
  );

  const newEntry = (
    <Link to="/operacao/entrada" className={primaryButton}>
      <Plus aria-hidden="true" className="size-4" />
      Nova Entrada
    </Link>
  );

  return (
    <>
      <SectionHeader
        eyebrow="Etapa 1 · Entrada do ativo"
        title="Oportunidades em Avaliação"
        subtitle="Ativos importados da originação, com snapshot versionado, dossiê documental e lacunas visíveis. Nenhum registro desta lista vem da demonstração."
        actions={newEntry}
      />
      <DataTable
        tableKey="opportunities"
        label="Oportunidades em avaliação"
        noun={{ one: "oportunidade", many: "oportunidades" }}
        state={state}
        onStateChange={onStateChange}
        renderers={renderers}
        emptyState={
          <EmptyState
            title="Nenhuma oportunidade importada"
            description="A operação começa vazia. Selecione um processo na originação para criar o primeiro ativo e seu dossiê."
            action={newEntry}
          />
        }
      />
    </>
  );
}
