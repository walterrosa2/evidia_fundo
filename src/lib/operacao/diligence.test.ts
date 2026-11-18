import { describe, expect, it } from "vitest";
import { formatDay, recurrenceText, searchStatusText } from "./diligence";

describe("redação da diligência", () => {
  it("descreve a recorrência com contagem e base, sem qualificar a frequência", () => {
    expect(recurrenceText({ count: 2, universe: 2 })).toBe(
      "2 processos de 2 processos consultados com atuação datada na janela",
    );
    expect(recurrenceText({ count: 1, universe: 1 })).toBe(
      "1 processo de 1 processo consultado com atuação datada na janela",
    );
    // Sem denominador não há frequência a comentar.
    expect(recurrenceText({ count: 3, universe: null })).toBe(
      "3 processos na janela; sem base para avaliar frequência",
    );
    for (const text of [recurrenceText({ count: 9, universe: 9 })]) {
      expect(text).not.toMatch(/anormal|suspeit|elevad/i);
    }
  });

  it("não confunde falha da fonte com ausência de resultado", () => {
    expect(searchStatusText({ status: "failed", results_count: 0 })).toBe(
      "Não foi possível consultar",
    );
    expect(searchStatusText({ status: "no_results", results_count: 0 })).toBe(
      "Consulta feita, nada encontrado nesta cobertura",
    );
    expect(searchStatusText({ status: "completed", results_count: 4 })).toBe("4 registros");
  });

  it("formata a data do ato sem deslocar o dia pelo fuso", () => {
    expect(formatDay("2023-05-10")).toBe("10/05/2023");
    expect(formatDay("2023-05-10T00:00:00+00:00")).toBe("10/05/2023");
    expect(formatDay(null)).toBe("Sem data");
  });
});
