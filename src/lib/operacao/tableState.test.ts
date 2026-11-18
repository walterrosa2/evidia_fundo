import { describe, expect, it } from "vitest";
import {
  cycleSort,
  defaultTableState,
  effectiveColumns,
  emptySelection,
  fromViewConfig,
  isDefaultState,
  keepOnlyInView,
  moveColumn,
  moveColumnTo,
  parseTableState,
  selectionStatus,
  togglePage,
  toggleRow,
  toPrefs,
  toQuery,
  withFilter,
} from "./tableState";
import type { TableColumnOut } from "./types";

const column = (key: string, extra: Partial<TableColumnOut> = {}): TableColumnOut => ({
  key,
  label: key,
  kind: "text",
  sortable: true,
  filterable: true,
  facet: false,
  required: false,
  default_visible: true,
  help: "",
  ...extra,
});

const defs = [
  column("cnj", { required: true }),
  column("court", { kind: "enum" }),
  column("docs", { kind: "number" }),
  column("hidden", { default_visible: false }),
];

describe("estado vindo da URL", () => {
  it("descarta entradas malformadas em vez de falhar", () => {
    const state = parseTableState({
      columns: [{ key: "court", visible: false, width: 9999 }, { visible: true }, "x"],
      filters: [
        { column: "court", values: ["TJSP", 7, null] },
        { column: "cnj", op: "contains", text: "   " },
        { column: "docs", op: "drop table" },
        { op: "empty" },
      ],
      sort: [{ column: "docs", direction: "sideways" }, { direction: "asc" }],
      page: -3,
      pageSize: 37,
    });
    expect(state.columns).toEqual([{ key: "court", visible: false, width: 640 }]);
    expect(state.filters).toEqual([{ column: "court", values: ["TJSP", null] }]);
    expect(state.sort).toEqual([{ column: "docs", direction: "asc" }]);
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(25);
    expect(isDefaultState(parseTableState("lixo"))).toBe(true);
  });
});

describe("consulta", () => {
  it("trocar filtro substitui o da mesma coluna, mantém os outros e volta à página 1", () => {
    let state = { ...defaultTableState, page: 3 };
    state = withFilter(state, { column: "court", values: ["TJSP"] });
    state = withFilter({ ...state, page: 2 }, { column: "side", values: ["claimant"] });
    state = withFilter({ ...state, page: 2 }, { column: "court", values: ["TJSP", "TJRJ"] });
    expect(state.page).toBe(1);
    expect(toQuery(state).filters).toEqual([
      { column: "side", values: ["claimant"] },
      { column: "court", values: ["TJSP", "TJRJ"] },
    ]);
    // Filtro esvaziado sai da consulta.
    expect(withFilter(state, { column: "court", values: [] }).filters).toEqual([
      { column: "side", values: ["claimant"] },
    ]);
  });

  it("o cabeçalho alterna crescente, decrescente e sem ordenação", () => {
    const asc = cycleSort(defaultTableState, "docs");
    const desc = cycleSort(asc, "docs");
    expect(asc.sort).toEqual([{ column: "docs", direction: "asc" }]);
    expect(desc.sort).toEqual([{ column: "docs", direction: "desc" }]);
    expect(cycleSort(desc, "docs").sort).toEqual([]);
    expect(cycleSort(desc, "court").sort).toEqual([{ column: "court", direction: "asc" }]);
  });
});

describe("colunas", () => {
  it("sem preferência usa o padrão do servidor", () => {
    const columns = effectiveColumns(defs, []);
    expect(columns.map((c) => [c.def.key, c.visible])).toEqual([
      ["cnj", true],
      ["court", true],
      ["docs", true],
      ["hidden", false],
    ]);
  });

  it("preferência define ordem e largura, mas não oculta identificador nem cria coluna", () => {
    const columns = effectiveColumns(defs, [
      { key: "docs", visible: true, width: 200 },
      { key: "proibida", visible: true },
      { key: "cnj", visible: false },
    ]);
    expect(columns.map((c) => c.def.key)).toEqual(["docs", "cnj", "court", "hidden"]);
    expect(columns[0].width).toBe(200);
    expect(columns[1].visible).toBe(true); // identificador mínimo
    // Coluna não mencionada numa visão personalizada entra oculta, não some.
    expect(columns[2].visible).toBe(false);
    expect(toPrefs(columns).some((c) => c.key === "proibida")).toBe(false);
  });

  it("reordena sem sair dos limites", () => {
    const columns = effectiveColumns(defs, []);
    expect(moveColumn(columns, "court", -1).map((c) => c.def.key)).toEqual([
      "court",
      "cnj",
      "docs",
      "hidden",
    ]);
    expect(moveColumn(columns, "cnj", -1)).toBe(columns);
    expect(moveColumn(columns, "hidden", 1)).toBe(columns);
  });

  it("arrasto leva a coluna para a posição do alvo, nos dois sentidos", () => {
    const columns = effectiveColumns(defs, []);
    const keys = (list: typeof columns) => list.map((c) => c.def.key);
    const start = keys(columns);
    const [first, second, third] = start;
    expect(keys(moveColumnTo(columns, third, first))).toEqual([
      third,
      first,
      second,
      ...start.slice(3),
    ]);
    expect(keys(moveColumnTo(columns, first, third))).toEqual([
      second,
      third,
      first,
      ...start.slice(3),
    ]);
    expect(moveColumnTo(columns, first, first)).toBe(columns);
    expect(moveColumnTo(columns, "inexistente", first)).toBe(columns);
  });

  it("aplicar uma visão salva volta à primeira página", () => {
    const state = fromViewConfig({
      columns: [{ key: "court", visible: true, width: 180 }],
      filters: [{ column: "court", values: ["TJSP"] }],
      sort: [{ column: "docs", direction: "desc" }],
      page_size: 50,
    });
    expect(state).toEqual({
      columns: [{ key: "court", visible: true, width: 180 }],
      filters: [{ column: "court", values: ["TJSP"] }],
      sort: [{ column: "docs", direction: "desc" }],
      page: 1,
      pageSize: 50,
    });
  });
});

describe("seleção por ID", () => {
  const current = { allIds: ["a", "b", "c", "d"], pageIds: ["a", "b"], resultVersion: "v1" };

  it("selecionar a página e selecionar linhas mantêm identidades estáveis", () => {
    let selection = togglePage(emptySelection, ["a", "b"], true);
    selection = toggleRow(selection, "d");
    selection = toggleRow(selection, "a");
    expect(selection.ids).toEqual(["b", "d"]);
    expect(selectionStatus(selection, current)).toMatchObject({ count: 2, pageState: "some" });
    // Reordenar muda a página exibida, não quem está selecionado.
    const reordered = { ...current, pageIds: ["d", "c"] };
    expect(selectionStatus(selection, reordered).count).toBe(2);
  });

  it("informa quantos selecionados saíram da visão após mudar o filtro", () => {
    const selection = { ids: ["a", "b", "d"], global: null };
    const filtered = { allIds: ["a", "c"], pageIds: ["a", "c"], resultVersion: "v2" };
    const status = selectionStatus(selection, filtered);
    expect(status.outsideView).toBe(2);
    expect(status.count).toBe(3); // nada é descartado sem o usuário decidir
    expect(keepOnlyInView(selection, filtered.allIds).ids).toEqual(["a"]);
  });

  it("seleção de todos os resultados fica marcada como antiga quando os dados mudam", () => {
    const selection = { ids: ["a", "b", "c", "d"], global: { resultVersion: "v1" } };
    expect(selectionStatus(selection, current).globalIsStale).toBe(false);
    expect(selectionStatus(selection, { ...current, resultVersion: "v2" }).globalIsStale).toBe(
      true,
    );
    // Alterar manualmente a seleção deixa de ser "todos os resultados".
    expect(toggleRow(selection, "a").global).toBeNull();
  });
});

describe("tabelas do dossiê", () => {
  it("envia a oportunidade na consulta apenas quando a tabela é escopada", () => {
    expect(toQuery(defaultTableState)).not.toHaveProperty("scope_id");
    expect(toQuery(defaultTableState, "opp-1")).toMatchObject({ scope_id: "opp-1", page: 1 });
  });

  it("usa a largura sugerida pelo servidor e só guarda a que o usuário mudou", () => {
    const wide = [column("text", { required: true, default_width: 420 }), column("nature")];
    const initial = effectiveColumns(wide, []);
    expect(initial.map((c) => c.width)).toEqual([420, 240]);
    expect(toPrefs(initial).every((pref) => !("width" in pref))).toBe(true);
    const resized = initial.map((c, index) => (index === 0 ? { ...c, width: 500 } : c));
    expect(toPrefs(resized)[0]).toEqual({ key: "text", visible: true, width: 500 });
    expect(effectiveColumns(wide, toPrefs(resized))[0].width).toBe(500);
  });
});
