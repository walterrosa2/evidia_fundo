import { describe, expect, it } from "vitest";
import {
  buildEconomicsRequest,
  emptyCost,
  emptyDraft,
  emptyImpact,
  emptyScenario,
  type EconomicsDraft,
} from "./economicsForm";

const draft = (patch: Partial<EconomicsDraft> = {}): EconomicsDraft => ({
  ...emptyDraft("2026-11-16"),
  ...patch,
});

describe("formulário do réu", () => {
  it("monta o exemplo do aceite AC14 em texto decimal, sem número de ponto flutuante", () => {
    const result = buildEconomicsRequest(
      "defendant",
      draft({
        reference: "1.000.000,00",
        referenceLabel: "Pedido atualizado",
        scenarios: [
          {
            ...emptyScenario(1),
            label: "Acordo",
            amount: "700.000",
            costs: [{ ...emptyCost(1), label: "Custo incremental", amount: "50.000,00" }],
          },
        ],
      }),
    );
    expect(result.errors).toBeNull();
    expect(result.body).toEqual({
      defendant: {
        assumptions: { base_date: "2026-11-16" },
        reference_exposure: "1000000.00",
        reference_label: "Pedido atualizado",
        scenarios: [
          {
            id: "c1",
            label: "Acordo",
            disbursement: "700000",
            probability: null,
            incremental_costs: [
              {
                label: "Custo incremental",
                amount: "50000.00",
                source: "",
                responsible: "",
                confidence: "",
                included_in_disbursement: false,
              },
            ],
            impacts: [],
            source: "",
            responsible: "",
            confidence: "",
          },
        ],
      },
    });
    expect(JSON.stringify(result.body)).not.toMatch(/:\s*\d/); // nenhum valor numérico cru
  });

  it("exige a exposição de referência: não assume zero", () => {
    const result = buildEconomicsRequest(
      "defendant",
      draft({ scenarios: [{ ...emptyScenario(1), label: "Acordo", amount: "10" }] }),
    );
    expect(result.body).toBeNull();
    expect(result.errors).toEqual({ reference: "Campo obrigatório." });
  });
});

describe("formulário do autor", () => {
  it("converte percentuais em fração e leva prazo e aprovações", () => {
    const result = buildEconomicsRequest(
      "claimant",
      draft({
        rate: "15",
        rateApprovedBy: " Revisora ",
        probabilitiesApprovedBy: "Revisora",
        scenarios: [
          {
            ...emptyScenario(1),
            label: "Recebimento",
            amount: "1000000",
            years: "2",
            probability: "60",
          },
          { ...emptyScenario(2), label: "Sem recebimento", amount: "0", probability: "40" },
        ],
      }),
    );
    expect(result.errors).toBeNull();
    expect(result.body?.claimant?.assumptions).toEqual({
      base_date: "2026-11-16",
      discount_rate: "0.15",
      discount_rate_approved_by: "Revisora",
      probabilities_approved_by: "Revisora",
    });
    expect(result.body?.claimant?.scenarios.map((s) => [s.id, s.probability])).toEqual([
      ["c1", "0.6"],
      ["c2", "0.4"],
    ]);
    expect(result.body?.claimant?.scenarios[0].years_from_base).toBe("2");
    // Zero digitado é valor conhecido e segue como zero.
    expect(result.body?.claimant?.scenarios[1].gross_receipt).toBe("0");
  });

  it("aponta cada campo malformado em vez de enviar", () => {
    const result = buildEconomicsRequest(
      "claimant",
      draft({
        baseDate: "",
        rate: "quinze",
        scenarios: [
          {
            ...emptyScenario(1),
            label: " ",
            amount: "um milhão",
            years: "-1",
            probability: "alta",
            costs: [{ ...emptyCost(1), label: "", amount: "" }],
          },
        ],
      }),
    );
    expect(result.body).toBeNull();
    expect(Object.keys(result.errors ?? {}).sort()).toEqual([
      "baseDate",
      "rate",
      "rateApprovedBy",
      "scenarios.0.amount",
      "scenarios.0.costs.0.amount",
      "scenarios.0.costs.0.label",
      "scenarios.0.label",
      "scenarios.0.probability",
      "scenarios.0.years",
    ]);
  });

  it("não envia campo exclusivo do réu", () => {
    const result = buildEconomicsRequest(
      "claimant",
      draft({
        scenarios: [
          {
            ...emptyScenario(1),
            label: "A",
            amount: "1",
            costs: [{ ...emptyCost(1), label: "Custas", amount: "1", included: true }],
          },
        ],
      }),
    );
    expect(result.body?.claimant?.scenarios[0].costs?.[0]).toEqual({
      label: "Custas",
      amount: "1",
      source: "",
      responsible: "",
      confidence: "",
    });
  });
});

describe("impactos", () => {
  const withImpacts = (impacts: ReturnType<typeof emptyImpact>[]) =>
    buildEconomicsRequest(
      "claimant",
      draft({
        scenarios: [{ ...emptyScenario(1), label: "Procedência", amount: "1.000.000", impacts }],
      }),
    );

  it("leva grupo, dimensão, fonte validada, responsável e confiança", () => {
    const result = withImpacts([
      {
        ...emptyImpact(1),
        label: " Prova frágil ",
        group: " prova ",
        amount: "-100.000",
        source: "claim:abc-123",
        responsible: "Ana",
        confidence: "low",
      },
      { ...emptyImpact(2), label: "Recurso", group: "recurso", affects: "term", amount: "1,5" },
      { ...emptyImpact(3), label: "Chance menor", group: "prova", affects: "probability" },
    ]);
    expect(result.errors).toBeNull();
    expect(result.body?.claimant?.scenarios[0].impacts).toEqual([
      {
        id: "i1",
        label: "Prova frágil",
        dependency_group: "prova",
        affects: "value",
        amount: "-100000",
        years: null,
        source_type: "claim",
        source_id: "abc-123",
        responsible: "Ana",
        confidence: "low",
      },
      {
        id: "i2",
        label: "Recurso",
        dependency_group: "recurso",
        affects: "term",
        amount: null,
        years: "1.5",
        source_type: "manual",
        source_id: null,
        responsible: "",
        confidence: "",
      },
      {
        id: "i3",
        label: "Chance menor",
        dependency_group: "prova",
        affects: "probability",
        amount: null,
        years: null,
        source_type: "manual",
        source_id: null,
        responsible: "",
        confidence: "",
      },
    ]);
  });

  it("exige descrição, causa e número; custo adicional não é negativo", () => {
    const result = withImpacts([
      { ...emptyImpact(1) },
      { ...emptyImpact(2), label: "Perícia", group: "pericia", affects: "cost", amount: "-10" },
    ]);
    expect(result.body).toBeNull();
    expect(result.errors).toEqual({
      "scenarios.0.impacts.0.label": "Descreva o impacto.",
      "scenarios.0.impacts.0.group": "Informe a causa (grupo de dependência).",
      "scenarios.0.impacts.0.amount": "Campo obrigatório.",
      "scenarios.0.impacts.1.amount": "Custo adicional não pode ser negativo.",
    });
  });
});
