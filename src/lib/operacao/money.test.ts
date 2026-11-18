import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPercent,
  formatYears,
  parseDecimalInput,
  parsePercentInput,
  shiftDecimal,
} from "./money";

const NBSP = String.fromCharCode(160);

describe("formatMoney", () => {
  it("agrupa milhares e usa vírgula decimal sem passar por float", () => {
    expect(formatMoney("1000000.50")).toBe(`R$${NBSP}1.000.000,50`);
    expect(formatMoney("403686.20")).toBe(`R$${NBSP}403.686,20`);
    // Acima do limite seguro de inteiros em ponto flutuante: os centavos permanecem exatos.
    expect(formatMoney("90071992547409931.07")).toBe(`R$${NBSP}90.071.992.547.409.931,07`);
  });

  it("preserva valor negativo e zero como valores conhecidos", () => {
    expect(formatMoney("-150000.00")).toBe(`−R$${NBSP}150.000,00`);
    expect(formatMoney("0.00")).toBe(`R$${NBSP}0,00`);
  });

  it("identifica moeda sem símbolo conhecido pelo código", () => {
    expect(formatMoney("10.00", "USD")).toBe(`USD${NBSP}10,00`);
  });
});

describe("parseDecimalInput", () => {
  it("lê o formato brasileiro e o decimal do contrato", () => {
    expect(parseDecimalInput("1.000.000,50")).toBe("1000000.50");
    expect(parseDecimalInput("R$ 700.000")).toBe("700000");
    expect(parseDecimalInput("1000000.5")).toBe("1000000.5");
    expect(parseDecimalInput("50000")).toBe("50000");
    expect(parseDecimalInput("0,15")).toBe("0.15");
    expect(parseDecimalInput("1.5")).toBe("1.5");
  });

  it("recusa o que não é número em vez de adivinhar", () => {
    for (const raw of ["", "  ", "abc", "1,2,3", "1.00,5.0", "12.34.56,7", "1e5"]) {
      expect(parseDecimalInput(raw)).toBeNull();
    }
  });

  it("mantém o sinal e não produz zero negativo", () => {
    expect(parseDecimalInput("-1.500,25")).toBe("-1500.25");
    expect(parseDecimalInput("-0")).toBe("0");
  });
});

describe("percentuais e prazos", () => {
  it("converte percentual digitado em fração e de volta, sem erro binário", () => {
    expect(parsePercentInput("15")).toBe("0.15");
    expect(parsePercentInput("15,5%")).toBe("0.155");
    expect(parsePercentInput("0,1")).toBe("0.001");
    expect(parsePercentInput("100")).toBe("1");
    expect(formatPercent("0.15")).toBe("15%");
    expect(formatPercent("0.155")).toBe("15,5%");
    expect(formatPercent("0.6")).toBe("60%");
    expect(parsePercentInput("x")).toBeNull();
  });

  it("desloca a vírgula nos dois sentidos", () => {
    expect(shiftDecimal("0.07", 2)).toBe("7");
    expect(shiftDecimal("7", -2)).toBe("0.07");
    expect(shiftDecimal("-12.5", -1)).toBe("-1.25");
    expect(shiftDecimal("0", -2)).toBe("0");
  });

  it("escreve o prazo com singular e plural", () => {
    expect(formatYears("2")).toBe("2 anos");
    expect(formatYears("1")).toBe("1 ano");
    expect(formatYears("0.5")).toBe("0,5 ano");
    expect(formatYears("1.5")).toBe("1,5 anos");
  });
});
