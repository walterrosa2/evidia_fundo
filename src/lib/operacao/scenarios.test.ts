import { describe, expect, it } from "vitest";
import { sideSummary } from "./scenarios";

describe("resumo de um lado do contraditório", () => {
  it("não atribui número a lado sem cenário analisado", () => {
    const text = sideSummary({
      status: "not_analyzed",
      arguments_count: null,
      hypotheses_count: null,
    });
    expect(text).toBe("Sem cenário analisado");
    expect(text).not.toMatch(/\d/);
  });

  it("separa argumentos com evidência de hipóteses a validar", () => {
    expect(sideSummary({ status: "completed", arguments_count: 3, hypotheses_count: 1 })).toBe(
      "3 argumentos, 1 ainda como hipótese a validar",
    );
    expect(sideSummary({ status: "completed", arguments_count: 1, hypotheses_count: 0 })).toBe(
      "1 argumento, todos com evidência no dossiê",
    );
  });
});
