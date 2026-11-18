import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Columns3,
  Download,
  Filter,
  GripVertical,
  Loader2,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { HelpHint } from "@/components/shared/HelpHint";
import { api, ApiError, queryKeys } from "@/lib/operacao/api";
import { downloadBlob } from "@/lib/operacao/download";
import { formatDateTime } from "@/lib/operacao/labels";
import { formatMoney } from "@/lib/operacao/money";
import {
  clampWidth,
  cycleSort,
  defaultTableState,
  effectiveColumns,
  emptySelection,
  fromViewConfig,
  isDefaultState,
  keepOnlyInView,
  moveColumn,
  moveColumnTo,
  PAGE_SIZES,
  selectionStatus,
  togglePage,
  toggleRow,
  toPrefs,
  toQuery,
  toViewConfig,
  withFilter,
  type EffectiveColumn,
  type Selection,
  type TableState,
} from "@/lib/operacao/tableState";
import type {
  CellValue,
  ColumnFilter,
  FacetValue,
  FilterOp,
  TableColumnOut,
  TableQueryOut,
  TableRow,
} from "@/lib/operacao/types";
import { AnchoredPopover } from "./AnchoredPopover";
import {
  EmptyState,
  ErrorNotice,
  Help,
  inputClass,
  labelClass,
  Loading,
  primaryButton,
  secondaryButton,
} from "./primitives";

export type CellRenderer = (row: TableRow, value: CellValue, label: string) => React.ReactNode;

type Panel =
  { kind: "filter"; column: string } | { kind: "columns" } | { kind: "views" } | { kind: "export" };

const SELECT_WIDTH = 44;
const smallButton =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";
const iconButton =
  "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";
const checkboxClass = "size-4 shrink-0 accent-[var(--primary)]";

const integer = new Intl.NumberFormat("pt-BR");

function useStoredSelection(scopedKey: string): [Selection, (next: Selection) => void] {
  const storageKey = `evidia.operacao.selecao.${scopedKey}`;
  const [selection, setSelection] = useState<Selection>(emptySelection);
  // Lida após montar: a casca é renderizada no servidor, onde não há sessionStorage.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Selection) : null;
      if (parsed && Array.isArray(parsed.ids)) setSelection(parsed);
    } catch {
      // Sem armazenamento disponível a seleção vale apenas para esta visita.
    }
  }, [storageKey]);
  const update = useCallback(
    (next: Selection) => {
      setSelection(next);
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Idem.
      }
    },
    [storageKey],
  );
  return [selection, update];
}

/**
 * Tabela comum da operação. Filtro, ordenação, paginação e exportação são resolvidos
 * no servidor sobre o conjunto inteiro; a tela guarda apenas a preferência de exibição
 * e a seleção por ID.
 */
export function DataTable({
  tableKey,
  scopeId,
  label,
  noun,
  state,
  onStateChange,
  renderers = {},
  rowActions,
  bulkActions,
  actionsWidth = 200,
  emptyState,
}: {
  tableKey: string;
  /** Oportunidade do dossiê, nas tabelas que pertencem a um. */
  scopeId?: string;
  label: string;
  noun: { one: string; many: string };
  state: TableState;
  onStateChange: (next: TableState, options?: { replace?: boolean }) => void;
  renderers?: Record<string, CellRenderer>;
  /** Ações da linha, exibidas em uma coluna final fixa. */
  rowActions?: (row: TableRow) => React.ReactNode;
  /** Ações sobre os registros selecionados. O servidor confere cada um de novo. */
  bulkActions?: (ids: string[], clear: () => void) => React.ReactNode;
  actionsWidth?: number;
  emptyState: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const query = useMemo(() => toQuery(state, scopeId), [state, scopeId]);
  const rows = useQuery({
    queryKey: queryKeys.tableRows(tableKey, query),
    queryFn: () => api.tableRows(tableKey, query),
    placeholderData: keepPreviousData,
  });
  const views = useQuery({
    queryKey: queryKeys.tableViews(tableKey),
    queryFn: () => api.tableViews(tableKey),
  });

  // Seleção de um dossiê não vale para outro.
  const [selection, setSelection] = useStoredSelection(
    scopeId ? `${tableKey}.${scopeId}` : tableKey,
  );
  const [panel, setPanel] = useState<Panel | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [drag, setDrag] = useState<{ key: string; width: number } | null>(null);
  const [dismissedOutside, setDismissedOutside] = useState<string | null>(null);

  const openPanel = (next: Panel, element: HTMLElement) => {
    const same = panel && JSON.stringify(panel) === JSON.stringify(next);
    setPanel(same ? null : next);
    setAnchor(same ? null : element);
  };
  const closePanel = useCallback(() => {
    setPanel(null);
    setAnchor(null);
  }, []);

  // Visão marcada como padrão reaparece ao entrar na tabela sem estado na URL.
  const appliedDefault = useRef(false);
  useEffect(() => {
    if (appliedDefault.current || !views.data) return;
    appliedDefault.current = true;
    const preferred = views.data.find((view) => view.is_default);
    if (preferred && isDefaultState(state)) {
      onStateChange(fromViewConfig(preferred.config), { replace: true });
    }
  }, [views.data, state, onStateChange]);

  // O servidor limita a página ao total real (ex.: filtro reduziu o conjunto).
  const data = rows.data;
  useEffect(() => {
    if (data && !rows.isPlaceholderData && data.page !== state.page) {
      onStateChange({ ...state, page: data.page }, { replace: true });
    }
  }, [data, rows.isPlaceholderData, state, onStateChange]);

  const columns = useMemo(
    () => (data ? effectiveColumns(data.columns, state.columns) : []),
    [data, state.columns],
  );
  const shown = useMemo(
    () =>
      columns
        .filter((column) => column.visible)
        .map((column) =>
          drag && drag.key === column.def.key ? { ...column, width: drag.width } : column,
        ),
    [columns, drag],
  );
  const tableWidth =
    SELECT_WIDTH +
    shown.reduce((sum, column) => sum + column.width, 0) +
    (rowActions ? actionsWidth : 0);

  // Barra horizontal superior, sincronizada com a da base do contêiner.
  const topScroll = useRef<HTMLDivElement>(null);
  const bodyScroll = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const sync = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => (syncing.current = false));
  };

  const setColumns = (next: EffectiveColumn[]) =>
    onStateChange({ ...state, columns: toPrefs(next) }, { replace: true });

  if (rows.isPending) return <Loading label={`Carregando ${noun.many}…`} />;
  if (rows.isError || !data) {
    const unknownColumn = rows.error instanceof ApiError && rows.error.code === "unknown_column";
    return (
      <div className="space-y-3">
        <ErrorNotice error={rows.error} onRetry={() => rows.refetch()} />
        {(unknownColumn || !isDefaultState(state)) && (
          <button
            type="button"
            className={secondaryButton}
            onClick={() => onStateChange(defaultTableState)}
          >
            Restaurar Visão Padrão
          </button>
        )}
      </div>
    );
  }

  if (data.unfiltered_total === 0) return <>{emptyState}</>;

  const pageIds = data.rows.map((row) => row.id);
  const allIds = data.all_ids ?? [];
  const status = selectionStatus(selection, {
    allIds,
    pageIds,
    resultVersion: data.result_version,
  });
  const selected = new Set(selection.ids);
  const filtersKey = JSON.stringify(query.filters);
  const activeFilters = query.filters;
  const columnByKey = new Map(data.columns.map((column) => [column.key, column]));

  const nounFor = (count: number) => (count === 1 ? noun.one : noun.many);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          <span className="font-medium text-foreground tabular-nums">
            {integer.format(data.total)}
          </span>{" "}
          {data.total !== data.unfiltered_total && (
            <>
              de <span className="tabular-nums">{integer.format(data.unfiltered_total)}</span>{" "}
            </>
          )}
          {nounFor(data.unfiltered_total)}
          {rows.isFetching && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs">
              <Loader2
                aria-hidden="true"
                className="size-3 animate-spin motion-reduce:animate-none"
              />
              Atualizando…
            </span>
          )}
        </p>
        <button
          type="button"
          className={smallButton}
          aria-haspopup="dialog"
          aria-expanded={panel?.kind === "views"}
          onClick={(event) => openPanel({ kind: "views" }, event.currentTarget)}
        >
          <Save aria-hidden="true" className="size-3.5" />
          Visões
        </button>
        <button
          type="button"
          className={smallButton}
          aria-haspopup="dialog"
          aria-expanded={panel?.kind === "columns"}
          onClick={(event) => openPanel({ kind: "columns" }, event.currentTarget)}
        >
          <Columns3 aria-hidden="true" className="size-3.5" />
          Colunas
        </button>
        <button
          type="button"
          className={smallButton}
          aria-haspopup="dialog"
          aria-expanded={panel?.kind === "export"}
          onClick={(event) => openPanel({ kind: "export" }, event.currentTarget)}
        >
          <Download aria-hidden="true" className="size-3.5" />
          Exportar
        </button>
        <Help topic="tableToolbar" align="right" side="bottom" />
      </div>

      {activeFilters.length > 0 && (
        <ul aria-label="Filtros ativos" className="mt-3 flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => {
            const column = columnByKey.get(filter.column);
            if (!column) return null;
            return (
              <li
                key={filter.column}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/40 bg-primary/10 py-0.5 pl-2 pr-0.5 text-xs text-primary"
              >
                <span className="truncate">
                  {column.label}: {describeFilter(filter, column, data.facets[column.key])}
                </span>
                <button
                  type="button"
                  aria-label={`Remover filtro de ${column.label}`}
                  className="grid size-6 place-items-center rounded hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => onStateChange(withFilter(state, { column: filter.column }))}
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onStateChange({ ...state, filters: [], page: 1 })}
            >
              Limpar Filtros
            </button>
          </li>
        </ul>
      )}

      {status.count > 0 && (
        <div
          role="region"
          aria-label="Seleção"
          className="mt-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-medium tabular-nums" aria-live="polite">
              {integer.format(status.count)} {status.count === 1 ? "selecionado" : "selecionados"}
              {selection.global && !status.globalIsStale && " (todos os resultados filtrados)"}
            </span>
            {status.count - status.outsideView < data.total && (
              <button
                type="button"
                className={smallButton}
                onClick={() =>
                  setSelection({ ids: allIds, global: { resultVersion: data.result_version } })
                }
              >
                Selecionar Todos os {integer.format(data.total)} Resultados
              </button>
            )}
            <button
              type="button"
              className={smallButton}
              onClick={() => setSelection(emptySelection)}
            >
              Limpar Seleção
            </button>
            {bulkActions?.(selection.ids, () => setSelection(emptySelection))}
          </div>
          {status.globalIsStale && (
            <p role="status" className="mt-2 text-xs text-gold">
              Os dados mudaram depois que todos os resultados foram selecionados. A seleção guarda
              os registros de antes; selecione novamente para incluir o conjunto atual.
            </p>
          )}
          {status.outsideView > 0 && dismissedOutside !== filtersKey && (
            <div role="status" className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span>
                {integer.format(status.outsideView)}{" "}
                {status.outsideView === 1 ? "selecionado não aparece" : "selecionados não aparecem"}{" "}
                com os filtros atuais.
              </span>
              <button
                type="button"
                className={smallButton}
                onClick={() => setDismissedOutside(filtersKey)}
              >
                Manter na Seleção
              </button>
              <button
                type="button"
                className={smallButton}
                onClick={() => setSelection(keepOnlyInView(selection, allIds))}
              >
                Remover da Seleção
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <div
          ref={topScroll}
          aria-hidden="true"
          tabIndex={-1}
          onScroll={() => sync(topScroll.current, bodyScroll.current)}
          className="overflow-x-auto overflow-y-hidden border-b border-border/60"
        >
          <div style={{ width: tableWidth, height: 1 }} />
        </div>
        <div
          ref={bodyScroll}
          role="region"
          aria-label={label}
          tabIndex={0}
          onScroll={() => sync(bodyScroll.current, topScroll.current)}
          className="relative max-h-[calc(100vh-240px)] overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <table
            className="table-fixed border-separate border-spacing-0 text-sm"
            style={{ width: tableWidth, minWidth: "100%" }}
          >
            <colgroup>
              <col style={{ width: SELECT_WIDTH }} />
              {shown.map((column) => (
                <col key={column.def.key} style={{ width: column.width }} />
              ))}
              {rowActions && <col style={{ width: actionsWidth }} />}
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 z-[15] border-b border-border bg-surface-elevated px-3 py-2.5 text-left"
                >
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    aria-label={`Selecionar os ${pageIds.length} registros desta página`}
                    checked={status.pageState === "all"}
                    ref={(element) => {
                      if (element) element.indeterminate = status.pageState === "some";
                    }}
                    onChange={(event) =>
                      setSelection(togglePage(selection, pageIds, event.target.checked))
                    }
                  />
                </th>
                {shown.map((column) => (
                  <HeaderCell
                    key={column.def.key}
                    column={column}
                    state={state}
                    filterOpen={panel?.kind === "filter" && panel.column === column.def.key}
                    onSort={() => onStateChange(cycleSort(state, column.def.key))}
                    onFilter={(element) =>
                      openPanel({ kind: "filter", column: column.def.key }, element)
                    }
                    onDrag={(width) => setDrag({ key: column.def.key, width })}
                    onResize={(width) => {
                      setDrag(null);
                      setColumns(
                        columns.map((other) =>
                          other.def.key === column.def.key ? { ...other, width } : other,
                        ),
                      );
                    }}
                  />
                ))}
                {rowActions && (
                  <th
                    scope="col"
                    className="sticky top-0 z-[15] border-b border-border bg-surface-elevated px-3 py-2.5"
                  >
                    <span className="sr-only">Ações</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-secondary/30 ${selected.has(row.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="border-b border-border/40 px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      aria-label={`Selecionar ${rowLabel(row, shown)}`}
                      checked={selected.has(row.id)}
                      onChange={() => setSelection(toggleRow(selection, row.id))}
                    />
                  </td>
                  {shown.map((column) => {
                    const value = row.values[column.def.key] ?? null;
                    const text = displayValue(value, column.def, data.facets[column.def.key]);
                    const custom = renderers[column.def.key];
                    return (
                      <td
                        key={column.def.key}
                        className={`overflow-hidden border-b border-border/40 px-3 py-3 align-top ${
                          column.def.kind === "number" || column.def.kind === "money"
                            ? "text-right tabular-nums"
                            : ""
                        } ${column.def.kind === "date" ? "tabular-nums text-muted-foreground" : ""}`}
                      >
                        {custom ? (
                          custom(row, value, text)
                        ) : value === null ? (
                          <span className="text-muted-foreground/70">
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">Vazio</span>
                          </span>
                        ) : (
                          <span className="block truncate" title={text}>
                            {text}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {rowActions && (
                    <td className="border-b border-border/40 px-3 py-2 text-right align-top">
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={shown.length + 1 + (rowActions ? 1 : 0)}
                    className="px-6 py-10 text-center"
                  >
                    <p className="text-sm font-medium">Nenhum resultado com os filtros atuais</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Há {integer.format(data.unfiltered_total)} {nounFor(data.unfiltered_total)} no
                      total. Ajuste ou limpe os filtros.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <nav
        aria-label={`Paginação de ${label}`}
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"
      >
        <label className="inline-flex items-center gap-2">
          Por página
          <select
            value={state.pageSize}
            onChange={(event) =>
              onStateChange({ ...state, pageSize: Number(event.target.value), page: 1 })
            }
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size} className="bg-popover text-popover-foreground">
                {size}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto tabular-nums" aria-live="polite">
          Página {data.page} de {data.page_count}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={smallButton}
            disabled={data.page <= 1}
            onClick={() => onStateChange({ ...state, page: data.page - 1 })}
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            Anterior
          </button>
          <button
            type="button"
            className={smallButton}
            disabled={data.page >= data.page_count}
            onClick={() => onStateChange({ ...state, page: data.page + 1 })}
          >
            Próxima
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </nav>

      {panel?.kind === "filter" && columnByKey.has(panel.column) && (
        <AnchoredPopover
          key={panel.column}
          anchor={anchor}
          label={`Filtro de ${columnByKey.get(panel.column)!.label}`}
          onClose={closePanel}
        >
          <FilterPanel
            column={columnByKey.get(panel.column)!}
            facets={data.facets[panel.column]}
            filter={state.filters.find((f) => f.column === panel.column) ?? null}
            onChange={(filter) => onStateChange(withFilter(state, filter), { replace: true })}
          />
        </AnchoredPopover>
      )}
      {panel?.kind === "columns" && (
        <AnchoredPopover anchor={anchor} label="Colunas da tabela" width={340} onClose={closePanel}>
          <ColumnsPanel
            columns={columns}
            onChange={setColumns}
            onReset={() => onStateChange({ ...state, columns: [] }, { replace: true })}
          />
        </AnchoredPopover>
      )}
      {panel?.kind === "views" && (
        <AnchoredPopover anchor={anchor} label="Visões salvas" width={340} onClose={closePanel}>
          <ViewsPanel
            tableKey={tableKey}
            state={state}
            onApply={(next) => {
              onStateChange(next);
              closePanel();
            }}
            onSaved={() =>
              queryClient.invalidateQueries({ queryKey: queryKeys.tableViews(tableKey) })
            }
          />
        </AnchoredPopover>
      )}
      {panel?.kind === "export" && (
        <AnchoredPopover anchor={anchor} label="Exportar tabela" width={340} onClose={closePanel}>
          <ExportPanel
            tableKey={tableKey}
            scopeId={scopeId}
            data={data}
            state={state}
            columns={shown}
            selection={selection}
            noun={noun}
          />
        </AnchoredPopover>
      )}
    </div>
  );
}

function rowLabel(row: TableRow, shown: EffectiveColumn[]): string {
  const identifier = shown.find((column) => column.def.required) ?? shown[0];
  const value = identifier ? row.values[identifier.def.key] : null;
  return value === null || value === undefined ? "registro sem identificador" : String(value);
}

function displayValue(value: CellValue, column: TableColumnOut, facets?: FacetValue[]): string {
  if (value === null) return "Vazio";
  if (column.kind === "date") return formatDateTime(String(value));
  if (column.kind === "money") return formatMoney(String(value));
  if (column.kind === "number") return integer.format(Number(value));
  if (column.kind === "enum" || column.kind === "bool") {
    const key = typeof value === "boolean" ? String(value) : value;
    return facets?.find((facet) => facet.value === key)?.label ?? String(value);
  }
  return String(value);
}

const opLabel: Record<FilterOp, string> = {
  contains: "contém",
  equals: "igual a",
  between: "entre",
  empty: "vazio",
  not_empty: "preenchido",
};

function describeFilter(filter: ColumnFilter, column: TableColumnOut, facets?: FacetValue[]) {
  const parts: string[] = [];
  if (filter.values?.length) {
    parts.push(
      filter.values
        .map((value) => facets?.find((facet) => facet.value === value)?.label ?? value ?? "Vazio")
        .join(" ou "),
    );
  }
  if (filter.op === "empty" || filter.op === "not_empty") parts.push(opLabel[filter.op]);
  if ((filter.op === "contains" || filter.op === "equals") && filter.text) {
    parts.push(`${opLabel[filter.op]} “${filter.text}”`);
  }
  if (filter.op === "between") {
    const show = (raw: string) =>
      column.kind === "date" ? raw.split("-").reverse().join("/") : raw;
    if (filter.min && filter.max) parts.push(`de ${show(filter.min)} a ${show(filter.max)}`);
    else if (filter.min) parts.push(`a partir de ${show(filter.min)}`);
    else if (filter.max) parts.push(`até ${show(filter.max)}`);
  }
  return parts.join(" · ");
}

function HeaderCell({
  column,
  state,
  filterOpen,
  onSort,
  onFilter,
  onDrag,
  onResize,
}: {
  column: EffectiveColumn;
  state: TableState;
  filterOpen: boolean;
  onSort: () => void;
  onFilter: (element: HTMLElement) => void;
  onDrag: (width: number) => void;
  onResize: (width: number) => void;
}) {
  const { def } = column;
  const sort = state.sort.find((entry) => entry.column === def.key);
  const filtered = state.filters.some((filter) => filter.column === def.key);
  const start = useRef<{ x: number; width: number } | null>(null);
  const latest = useRef(column.width);

  const SortIcon = !sort ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={
        !def.sortable
          ? undefined
          : !sort
            ? "none"
            : sort.direction === "asc"
              ? "ascending"
              : "descending"
      }
      className="sticky top-0 z-[15] border-b border-border bg-surface-elevated py-1.5 pl-3 pr-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
    >
      <div
        className={`flex items-center gap-0.5 ${def.kind === "number" || def.kind === "money" ? "justify-end" : ""}`}
      >
        {def.sortable ? (
          <button
            type="button"
            onClick={onSort}
            title={`Ordenar por ${def.label}`}
            className={`-ml-1 flex min-h-8 min-w-0 items-center gap-1 rounded px-1 uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              sort ? "text-foreground" : ""
            }`}
          >
            <span className="truncate">{def.label}</span>
            <SortIcon
              aria-hidden="true"
              className={`size-3 shrink-0 ${sort ? "text-primary" : "opacity-50"}`}
            />
          </button>
        ) : (
          <span className="truncate">{def.label}</span>
        )}
        {def.help && <HelpHint label={def.label} text={def.help} side="bottom" />}
        {def.filterable && (
          <button
            type="button"
            aria-label={`Filtrar ${def.label}${filtered ? " (filtro ativo)" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={filterOpen}
            onClick={(event) => onFilter(event.currentTarget)}
            className={`${iconButton} ${filtered ? "bg-primary/15 text-primary" : ""}`}
          >
            <Filter aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Largura da coluna ${def.label}`}
        aria-valuenow={column.width}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onResize(clampWidth(column.width + (event.key === "ArrowRight" ? 16 : -16)));
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          start.current = { x: event.clientX, width: column.width };
          latest.current = column.width;
        }}
        onPointerMove={(event) => {
          if (!start.current) return;
          latest.current = clampWidth(start.current.width + event.clientX - start.current.x);
          onDrag(latest.current);
        }}
        onPointerUp={() => {
          if (!start.current) return;
          start.current = null;
          onResize(latest.current);
        }}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none border-r border-border/60 hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      />
    </th>
  );
}

function FilterPanel({
  column,
  facets,
  filter,
  onChange,
}: {
  column: TableColumnOut;
  facets: FacetValue[] | undefined;
  filter: ColumnFilter | null;
  onChange: (filter: ColumnFilter) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const current: ColumnFilter = filter ?? { column: column.key };
  const range = column.kind === "number" || column.kind === "money" || column.kind === "date";
  const defaultOp: FilterOp = range ? "between" : "contains";
  const op = current.op ?? defaultOp;

  // Texto e limites são aplicados enquanto se digita, sem disparar uma consulta por tecla.
  const [draft, setDraft] = useState({
    text: current.text ?? "",
    min: current.min ?? "",
    max: current.max ?? "",
  });
  const pending = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(pending.current), []);
  const typed = (patch: Partial<typeof draft>, nextOp: FilterOp) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(
      () =>
        onChange({
          ...current,
          op: nextOp,
          text: next.text || null,
          min: next.min || null,
          max: next.max || null,
        }),
      300,
    );
  };

  const clear = () => {
    window.clearTimeout(pending.current);
    setDraft({ text: "", min: "", max: "" });
    setSearch("");
    onChange({ column: column.key });
  };

  const selectedValues = current.values ?? [];
  const visibleFacets = (facets ?? []).filter((facet) =>
    facet.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{column.label}</h3>
        <button
          type="button"
          onClick={clear}
          className="rounded px-1.5 py-1 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Limpar Filtro
        </button>
      </div>

      {column.facet ? (
        <>
          <div>
            <label htmlFor={`${id}-search`} className="sr-only">
              Buscar valores de {column.label}
            </label>
            <input
              id={`${id}-search`}
              type="search"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar valor…"
              className={`${inputClass} mt-0`}
            />
          </div>
          <fieldset>
            <legend className="text-xs text-muted-foreground">
              Marcar vários valores mostra registros com qualquer um deles.
            </legend>
            <div className="mt-1.5 max-h-56 space-y-0.5 overflow-auto">
              {visibleFacets.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">Nenhum valor encontrado.</p>
              )}
              {visibleFacets.map((facet) => {
                const checked = selectedValues.includes(facet.value);
                return (
                  <label
                    key={facet.value ?? "\u0000vazio"}
                    className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-1.5 hover:bg-secondary/50"
                  >
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={checked}
                      onChange={() =>
                        onChange({
                          ...current,
                          values: checked
                            ? selectedValues.filter((value) => value !== facet.value)
                            : [...selectedValues, facet.value],
                        })
                      }
                    />
                    <span
                      className={`min-w-0 flex-1 truncate ${facet.value === null ? "italic text-muted-foreground" : ""}`}
                    >
                      {facet.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {integer.format(facet.count)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </>
      ) : (
        <>
          <div>
            <label htmlFor={`${id}-op`} className={labelClass}>
              Condição
            </label>
            <select
              id={`${id}-op`}
              value={op}
              onChange={(event) => {
                window.clearTimeout(pending.current);
                onChange({
                  ...current,
                  op: event.target.value as FilterOp,
                  text: draft.text || null,
                  min: draft.min || null,
                  max: draft.max || null,
                });
              }}
              className={inputClass}
            >
              {(range
                ? (["between", "empty", "not_empty"] as const)
                : (["contains", "equals", "empty", "not_empty"] as const)
              ).map((value) => (
                <option key={value} value={value} className="bg-popover text-popover-foreground">
                  {value === "between"
                    ? "Intervalo"
                    : opLabel[value].charAt(0).toUpperCase() + opLabel[value].slice(1)}
                </option>
              ))}
            </select>
          </div>
          {(op === "contains" || op === "equals") && (
            <div>
              <label htmlFor={`${id}-text`} className={labelClass}>
                Texto
              </label>
              <input
                id={`${id}-text`}
                type="search"
                autoComplete="off"
                value={draft.text}
                onChange={(event) => typed({ text: event.target.value }, op)}
                placeholder="Digite para filtrar…"
                className={inputClass}
              />
            </div>
          )}
          {op === "between" && (
            <div className="grid grid-cols-2 gap-2">
              {(["min", "max"] as const).map((bound) => (
                <div key={bound}>
                  <label htmlFor={`${id}-${bound}`} className={labelClass}>
                    {bound === "min" ? "De" : "Até"}
                  </label>
                  <input
                    id={`${id}-${bound}`}
                    type={column.kind === "date" ? "date" : "number"}
                    inputMode={column.kind === "date" ? undefined : "decimal"}
                    step={column.kind === "money" ? "0.01" : undefined}
                    value={draft[bound]}
                    onChange={(event) => typed({ [bound]: event.target.value }, "between")}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ColumnsPanel({
  columns,
  onChange,
  onReset,
}: {
  columns: EffectiveColumn[];
  onChange: (next: EffectiveColumn[]) => void;
  onReset: () => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Colunas</h3>
        <button
          type="button"
          onClick={onReset}
          className="rounded px-1.5 py-1 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Restaurar Padrão
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Marque para exibir. Arraste pela alça ou use as setas para reordenar. A largura é ajustada
        na borda do cabeçalho.
      </p>
      <ul className="mt-2 space-y-0.5">
        {columns.map((column, index) => (
          <li
            key={column.def.key}
            data-column={column.def.key}
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOver(column.def.key);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging) onChange(moveColumnTo(columns, dragging, column.def.key));
              setDragging(null);
              setOver(null);
            }}
            className={`flex items-center gap-1 rounded hover:bg-secondary/40 ${
              over === column.def.key && dragging !== column.def.key
                ? "outline outline-2 outline-primary/60"
                : ""
            } ${dragging === column.def.key ? "opacity-50" : ""}`}
          >
            <span
              draggable
              aria-hidden="true"
              title="Arrastar para reordenar"
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", column.def.key);
                setDragging(column.def.key);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
              className="grid size-7 shrink-0 cursor-grab place-items-center rounded text-muted-foreground hover:bg-secondary active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </span>
            <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 px-1.5">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={column.visible}
                disabled={column.def.required}
                onChange={(event) =>
                  onChange(
                    columns.map((other) =>
                      other === column ? { ...other, visible: event.target.checked } : other,
                    ),
                  )
                }
              />
              <span className="min-w-0 truncate">{column.def.label}</span>
              {column.def.required && (
                <span className="shrink-0 text-[11px] text-muted-foreground">sempre visível</span>
              )}
            </label>
            <button
              type="button"
              className={iconButton}
              aria-label={`Mover ${column.def.label} para cima`}
              disabled={index === 0}
              onClick={() => onChange(moveColumn(columns, column.def.key, -1))}
            >
              <ChevronUp aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label={`Mover ${column.def.label} para baixo`}
              disabled={index === columns.length - 1}
              onClick={() => onChange(moveColumn(columns, column.def.key, 1))}
            >
              <ChevronDown aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ViewsPanel({
  tableKey,
  state,
  onApply,
  onSaved,
}: {
  tableKey: string;
  state: TableState;
  onApply: (next: TableState) => void;
  onSaved: () => void;
}) {
  const id = useId();
  const views = useQuery({
    queryKey: queryKeys.tableViews(tableKey),
    queryFn: () => api.tableViews(tableKey),
  });
  const [name, setName] = useState("");
  const [asDefault, setAsDefault] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api.saveTableView(tableKey, {
        name: name.trim(),
        config: toViewConfig(state),
        is_default: asDefault,
      }),
    onSuccess: () => {
      setName("");
      setAsDefault(false);
      onSaved();
    },
  });
  const remove = useMutation({
    mutationFn: (viewId: string) => api.deleteTableView(viewId),
    onSuccess: () => {
      setConfirming(null);
      onSaved();
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Visões Salvas</h3>
        <button
          type="button"
          onClick={() => onApply(defaultTableState)}
          className="rounded px-1.5 py-1 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Restaurar Padrão
        </button>
      </div>

      {views.isPending && <p className="text-xs text-muted-foreground">Carregando visões…</p>}
      {views.isError && <ErrorNotice error={views.error} onRetry={() => views.refetch()} />}
      {views.data && views.data.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma visão salva. Uma visão guarda colunas, larguras, filtros e ordenação — só para
          você.
        </p>
      )}
      {views.data && views.data.length > 0 && (
        <ul className="space-y-1">
          {views.data.map((view) => (
            <li key={view.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onApply(fromViewConfig(view.config))}
                className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded px-2 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="min-w-0 truncate">{view.name}</span>
                {view.is_default && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-gold">
                    <Star aria-hidden="true" className="size-3" />
                    Ao abrir
                  </span>
                )}
              </button>
              {confirming === view.id ? (
                <button
                  type="button"
                  className={`${smallButton} border-risk-critical/50 text-risk-critical`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(view.id)}
                >
                  Confirmar Exclusão
                </button>
              ) : (
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Excluir a visão ${view.name}`}
                  onClick={() => setConfirming(view.id)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {remove.isError && <ErrorNotice error={remove.error} />}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) save.mutate();
        }}
        className="border-t border-border pt-3"
      >
        <label htmlFor={`${id}-name`} className={labelClass}>
          Salvar a visão atual como
        </label>
        <input
          id={`${id}-name`}
          type="text"
          autoComplete="off"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Réus com autos pendentes…"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Usar um nome existente atualiza aquela visão.
        </p>
        <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={asDefault}
            onChange={(event) => setAsDefault(event.target.checked)}
          />
          Abrir a tabela com esta visão
        </label>
        <div aria-live="polite" className="mt-2">
          {save.isError && <ErrorNotice error={save.error} />}
          {save.isSuccess && <p className="text-xs text-risk-low">Visão salva.</p>}
        </div>
        <button
          type="submit"
          disabled={save.isPending || !name.trim()}
          className={`${primaryButton} mt-2 w-full`}
        >
          {save.isPending ? "Salvando…" : "Salvar Visão"}
        </button>
      </form>
    </div>
  );
}

function ExportPanel({
  tableKey,
  scopeId,
  data,
  state,
  columns,
  selection,
  noun,
}: {
  tableKey: string;
  scopeId?: string;
  data: TableQueryOut;
  state: TableState;
  columns: EffectiveColumn[];
  selection: Selection;
  noun: { one: string; many: string };
}) {
  const id = useId();
  const hasSelection = selection.ids.length > 0;
  const [scope, setScope] = useState<"filtered" | "selected">(
    hasSelection ? "selected" : "filtered",
  );
  const count = scope === "selected" ? selection.ids.length : data.total;

  const run = useMutation({
    mutationFn: () =>
      api.exportTable(tableKey, {
        query: { ...toQuery(state, scopeId), page: 1, include_ids: false },
        columns: columns.map((column) => column.def.key),
        ids: scope === "selected" ? selection.ids : null,
      }),
    onSuccess: (blob) => downloadBlob(blob, `${tableKey}.csv`),
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Exportar CSV</h3>
      <fieldset>
        <legend className={labelClass}>O que exportar</legend>
        <div className="mt-1.5 space-y-0.5">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-1.5 hover:bg-secondary/50">
            <input
              type="radio"
              name={`${id}-scope`}
              className={checkboxClass}
              checked={scope === "filtered"}
              onChange={() => setScope("filtered")}
            />
            Resultados filtrados ({integer.format(data.total)})
          </label>
          <label
            className={`flex min-h-9 items-center gap-2 rounded px-1.5 ${
              hasSelection ? "cursor-pointer hover:bg-secondary/50" : "opacity-50"
            }`}
          >
            <input
              type="radio"
              name={`${id}-scope`}
              className={checkboxClass}
              checked={scope === "selected"}
              disabled={!hasSelection}
              onChange={() => setScope("selected")}
            />
            Selecionados ({integer.format(selection.ids.length)})
          </label>
        </div>
      </fieldset>
      <div>
        <p className={labelClass}>Colunas, na ordem da tela</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {columns.map((column) => column.def.label).join(" · ")}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        O servidor gera o arquivo e confere de novo o que você pode ver. Registros selecionados que
        deixaram de existir ou de estar acessíveis não entram.
      </p>
      <div aria-live="polite">
        {run.isError && <ErrorNotice error={run.error} />}
        {run.isSuccess && <p className="text-xs text-risk-low">Arquivo gerado.</p>}
      </div>
      <button
        type="button"
        disabled={run.isPending || count === 0}
        onClick={() => run.mutate()}
        className={`${primaryButton} w-full`}
      >
        <Download aria-hidden="true" className="size-4" />
        {run.isPending
          ? "Gerando…"
          : `Exportar ${integer.format(count)} ${count === 1 ? noun.one : noun.many}`}
      </button>
    </div>
  );
}
