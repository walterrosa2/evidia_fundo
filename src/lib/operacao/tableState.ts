/**
 * Estado da tabela comum (RF16–RF18): colunas, filtros, ordenação, página e seleção.
 *
 * Funções puras. Filtrar, ordenar e paginar acontecem no servidor; aqui só se monta a
 * consulta e se mantém a preferência de exibição e a seleção por ID estável.
 */
import type {
  ColumnFilter,
  SortSpec,
  TableColumnOut,
  TableQuery,
  TableViewConfig,
  ViewColumn,
} from "./types";

export type TableState = {
  /** Ordem, visibilidade e largura escolhidas. Vazio = padrão da tabela. */
  columns: ViewColumn[];
  filters: ColumnFilter[];
  sort: SortSpec[];
  page: number;
  pageSize: number;
};

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export const defaultTableState: TableState = {
  columns: [],
  filters: [],
  sort: [],
  page: 1,
  pageSize: 25,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.length <= max ? value : null;

const OPS = ["contains", "equals", "between", "empty", "not_empty"] as const;

function parseFilter(raw: unknown): ColumnFilter | null {
  if (!isRecord(raw)) return null;
  const column = text(raw.column, 60);
  if (!column) return null;
  const filter: ColumnFilter = { column };
  if (Array.isArray(raw.values)) {
    filter.values = raw.values
      .filter((v): v is string | null => v === null || typeof v === "string")
      .slice(0, 200);
  }
  if (OPS.includes(raw.op as (typeof OPS)[number])) filter.op = raw.op as ColumnFilter["op"];
  for (const key of ["text", "min", "max"] as const) {
    const value = text(raw[key], 200);
    if (value) filter[key] = value;
  }
  return isFilterActive(filter) ? filter : null;
}

/** Lê o estado vindo da URL (ou de uma visão) descartando o que estiver malformado. */
export function parseTableState(raw: unknown): TableState {
  if (!isRecord(raw)) return defaultTableState;
  const columns = Array.isArray(raw.columns)
    ? raw.columns.flatMap((entry): ViewColumn[] => {
        if (!isRecord(entry)) return [];
        const key = text(entry.key, 60);
        if (!key) return [];
        const width =
          typeof entry.width === "number" && Number.isFinite(entry.width)
            ? clampWidth(entry.width)
            : null;
        return [{ key, visible: entry.visible !== false, width }];
      })
    : [];
  const filters = Array.isArray(raw.filters)
    ? raw.filters.flatMap((entry) => {
        const filter = parseFilter(entry);
        return filter ? [filter] : [];
      })
    : [];
  const sort = Array.isArray(raw.sort)
    ? raw.sort
        .flatMap((entry): SortSpec[] => {
          if (!isRecord(entry)) return [];
          const column = text(entry.column, 60);
          return column ? [{ column, direction: entry.direction === "desc" ? "desc" : "asc" }] : [];
        })
        .slice(0, 5)
    : [];
  const page = typeof raw.page === "number" && raw.page >= 1 ? Math.floor(raw.page) : 1;
  const pageSize = PAGE_SIZES.includes(raw.pageSize as (typeof PAGE_SIZES)[number])
    ? (raw.pageSize as number)
    : defaultTableState.pageSize;
  return { columns, filters, sort, page, pageSize };
}

export function isDefaultState(state: TableState): boolean {
  return (
    state.columns.length === 0 &&
    state.filters.length === 0 &&
    state.sort.length === 0 &&
    state.page === 1 &&
    state.pageSize === defaultTableState.pageSize
  );
}

export function isFilterActive(filter: ColumnFilter): boolean {
  if (filter.values && filter.values.length > 0) return true;
  if (filter.op === "empty" || filter.op === "not_empty") return true;
  if (filter.op === "between") return Boolean(filter.min || filter.max);
  if (filter.op === "contains" || filter.op === "equals") return Boolean(filter.text?.trim());
  return false;
}

export function toQuery(state: TableState, scopeId?: string): TableQuery {
  return {
    ...(scopeId ? { scope_id: scopeId } : {}),
    filters: state.filters.filter(isFilterActive),
    sort: state.sort,
    page: state.page,
    page_size: state.pageSize,
    // A seleção precisa saber quais IDs continuam na visão filtrada.
    include_ids: true,
  };
}

/** Substitui (ou remove, se inativo) o filtro de uma coluna e volta à primeira página. */
export function withFilter(state: TableState, filter: ColumnFilter): TableState {
  const others = state.filters.filter((f) => f.column !== filter.column);
  return {
    ...state,
    filters: isFilterActive(filter) ? [...others, filter] : others,
    page: 1,
  };
}

/** Clique no cabeçalho: crescente → decrescente → sem ordenação. */
export function cycleSort(state: TableState, column: string): TableState {
  const current = state.sort.find((s) => s.column === column);
  const sort: SortSpec[] = !current
    ? [{ column, direction: "asc" }]
    : current.direction === "asc"
      ? [{ column, direction: "desc" }]
      : [];
  return { ...state, sort, page: 1 };
}

const DEFAULT_WIDTH: Record<TableColumnOut["kind"], number> = {
  text: 240,
  enum: 200,
  bool: 150,
  number: 130,
  money: 190,
  date: 170,
};

/** Largura inicial: a sugerida pelo servidor para a coluna ou o padrão do tipo. */
export const defaultWidth = (def: TableColumnOut): number =>
  clampWidth(def.default_width ?? DEFAULT_WIDTH[def.kind]);

export const MIN_WIDTH = 80;
export const MAX_WIDTH = 640;

export function clampWidth(width: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));
}

export type EffectiveColumn = { def: TableColumnOut; visible: boolean; width: number };

/**
 * Combina a definição do servidor com a preferência do usuário. Colunas que o servidor
 * não devolveu (inexistentes ou sem permissão) são ignoradas; identificadores mínimos
 * ficam sempre visíveis.
 */
export function effectiveColumns(defs: TableColumnOut[], prefs: ViewColumn[]): EffectiveColumn[] {
  const byKey = new Map(defs.map((def) => [def.key, def]));
  const out: EffectiveColumn[] = [];
  const seen = new Set<string>();
  for (const pref of prefs) {
    const def = byKey.get(pref.key);
    if (!def || seen.has(pref.key)) continue;
    seen.add(pref.key);
    out.push({
      def,
      visible: pref.visible || def.required,
      width: clampWidth(pref.width ?? defaultWidth(def)),
    });
  }
  for (const def of defs) {
    if (seen.has(def.key)) continue;
    out.push({
      def,
      visible: prefs.length === 0 ? def.default_visible || def.required : def.required,
      width: defaultWidth(def),
    });
  }
  return out;
}

/** Largura só é guardada quando difere do padrão: mantém a URL e a visão enxutas. */
export const toPrefs = (columns: EffectiveColumn[]): ViewColumn[] =>
  columns.map((c) => ({
    key: c.def.key,
    visible: c.visible,
    ...(c.width === defaultWidth(c.def) ? {} : { width: c.width }),
  }));

export function moveColumn(
  columns: EffectiveColumn[],
  key: string,
  delta: -1 | 1,
): EffectiveColumn[] {
  const index = columns.findIndex((c) => c.def.key === key);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= columns.length) return columns;
  const next = [...columns];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Arrasto: leva a coluna `key` para a posição da coluna `targetKey`. */
export function moveColumnTo(
  columns: EffectiveColumn[],
  key: string,
  targetKey: string,
): EffectiveColumn[] {
  const from = columns.findIndex((c) => c.def.key === key);
  const to = columns.findIndex((c) => c.def.key === targetKey);
  if (from < 0 || to < 0 || from === to) return columns;
  const next = [...columns];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function toViewConfig(state: TableState): TableViewConfig {
  return {
    columns: state.columns,
    filters: state.filters.filter(isFilterActive),
    sort: state.sort,
    page_size: state.pageSize,
  };
}

export function fromViewConfig(config: TableViewConfig): TableState {
  return parseTableState({ ...config, pageSize: config.page_size, page: 1 });
}

// ------------------------------------------------------------------- seleção

export type Selection = {
  ids: string[];
  /** Preenchido quando a seleção veio de "todos os resultados filtrados". */
  global: { resultVersion: string } | null;
};

export const emptySelection: Selection = { ids: [], global: null };

export function togglePage(selection: Selection, pageIds: string[], select: boolean): Selection {
  const page = new Set(pageIds);
  const ids = select
    ? [...selection.ids, ...pageIds.filter((id) => !selection.ids.includes(id))]
    : selection.ids.filter((id) => !page.has(id));
  return { ids, global: null };
}

export function toggleRow(selection: Selection, id: string): Selection {
  const ids = selection.ids.includes(id)
    ? selection.ids.filter((other) => other !== id)
    : [...selection.ids, id];
  return { ids, global: null };
}

export type SelectionStatus = {
  count: number;
  /** Selecionados que não estão no resultado filtrado atual. */
  outsideView: number;
  /** A seleção global foi feita sobre um conjunto que já mudou (AC17). */
  globalIsStale: boolean;
  pageState: "none" | "some" | "all";
};

export function selectionStatus(
  selection: Selection,
  current: { allIds: string[]; pageIds: string[]; resultVersion: string },
): SelectionStatus {
  const inView = new Set(current.allIds);
  const selected = new Set(selection.ids);
  const onPage = current.pageIds.filter((id) => selected.has(id)).length;
  return {
    count: selection.ids.length,
    outsideView: selection.ids.filter((id) => !inView.has(id)).length,
    globalIsStale:
      selection.global !== null && selection.global.resultVersion !== current.resultVersion,
    pageState: onPage === 0 ? "none" : onPage === current.pageIds.length ? "all" : "some",
  };
}

export function keepOnlyInView(selection: Selection, allIds: string[]): Selection {
  const inView = new Set(allIds);
  return { ids: selection.ids.filter((id) => inView.has(id)), global: null };
}
