import { describe, expect, it } from "vitest";
import { legacyStageTarget, parseStage } from "./stages";

const ID = "ac634e59-4040-4820-ac7f-aff01e871ed1";

describe("etapa na URL", () => {
  it("aceita 1 a 6 e trata o resto como visão completa", () => {
    expect(parseStage(3)).toBe(3);
    expect(parseStage("6")).toBe(6);
    expect(parseStage("0")).toBeUndefined();
    expect(parseStage(7)).toBeUndefined();
    expect(parseStage("abc")).toBeUndefined();
    expect(parseStage(undefined)).toBeUndefined();
  });
});

describe("URLs antigas", () => {
  it("levam à etapa correspondente quando informam a oportunidade", () => {
    expect(legacyStageTarget("/nulidade360/resultado", ID)).toEqual({ id: ID, etapa: 3 });
    expect(legacyStageTarget("/red-team", ID)).toEqual({ id: ID, etapa: 4 });
    expect(legacyStageTarget("/valuation", ID)).toEqual({ id: ID, etapa: 5 });
    expect(legacyStageTarget("/relatorios/investment-memo", ID)).toEqual({ id: ID, etapa: 6 });
  });

  it("sem oportunidade válida a demonstração continua abrindo normalmente", () => {
    expect(legacyStageTarget("/nulidade360", undefined)).toBeNull();
    expect(legacyStageTarget("/nulidade360", "eletromar")).toBeNull();
    expect(legacyStageTarget("/nulidade360", "../../operacao")).toBeNull();
  });

  it("não redireciona endereços sem etapa correspondente nem a própria operação", () => {
    expect(legacyStageTarget("/dashboard", ID)).toBeNull();
    expect(legacyStageTarget("/operacao", ID)).toBeNull();
    expect(legacyStageTarget("/valuations", ID)).toBeNull();
  });
});
