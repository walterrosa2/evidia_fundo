"""Aceites economicos AC13–AC16 e exemplo didatico da especificacao (RF14).

Os valores esperados vem da especificacao, nao de constantes da implementacao.
"""

from datetime import date
from decimal import Decimal as D

import pytest

from evidia.domain.economics import (
    Assumptions,
    ClaimantScenario,
    CostItem,
    DefendantScenario,
    EconomicsError,
    claimant_statement,
    defendant_statement,
)

BASE = date(2026, 11, 16)


def assumptions(**kw) -> Assumptions:
    return Assumptions(currency="BRL", base_date=BASE, **kw)


def test_ac14_reducao_bruta_300k_e_liquida_250k_sem_receita_da_evidia():
    out = defendant_statement(
        D("1000000"),
        [
            DefendantScenario(
                id="base",
                label="Acordo",
                disbursement=D("700000"),
                incremental_costs=(CostItem("Custo incremental", D("50000")),),
            )
        ],
        assumptions(),
    )
    row = out["scenarios"][0]
    assert row["gross_reduction"] == "300000.00"
    assert row["net_reduction"] == "250000.00"
    assert out["beneficiary"] == "client"
    assert out["evidia_revenue"] == {"value": None, "reason": "contract_not_defined"}


def test_ac13_sem_contrato_gera_os_dois_demonstrativos_com_campos_contratuais_nulos():
    claimant = claimant_statement(
        [ClaimantScenario(id="c1", label="Procedencia", gross_receipt=D("500000"))], assumptions()
    )
    defendant = defendant_statement(
        D("500000"),
        [DefendantScenario(id="d1", label="Improcedencia", disbursement=D("0"))],
        assumptions(),
    )
    for statement in (claimant, defendant):
        contract = statement["contract"]
        assert contract["status"] == "not_defined"
        for field in ("price", "investor_return", "contractual_fee"):
            # Nulo (indefinido) e diferente de zero (valor conhecido).
            assert contract[field]["value"] is None
            assert contract[field]["value"] != 0
            assert contract[field]["reason"] == "contract_not_defined"
    assert claimant["scenarios"][0]["net_receipt"] == "500000.00"
    assert defendant["scenarios"][0]["net_reduction"] == "500000.00"


def test_ac15_custo_ja_incluido_no_desembolso_nao_e_descontado_de_novo():
    out = defendant_statement(
        D("1000000"),
        [
            DefendantScenario(
                id="base",
                label="Acordo com honorarios embutidos",
                disbursement=D("700000"),
                incremental_costs=(
                    CostItem(
                        "Honorarios ja no desembolso", D("50000"), included_in_disbursement=True
                    ),
                    CostItem("Pericia adicional", D("10000")),
                ),
            )
        ],
        assumptions(),
    )
    row = out["scenarios"][0]
    assert row["gross_reduction"] == "300000.00"
    assert row["incremental_costs_deducted"] == "10000.00"
    assert row["net_reduction"] == "290000.00"
    assert [c["label"] for c in row["costs_already_in_disbursement"]] == [
        "Honorarios ja no desembolso"
    ]


def test_ac16_score_heuristico_nunca_vira_probabilidade():
    out = claimant_statement(
        [
            ClaimantScenario(id="a", label="Ganha", gross_receipt=D("1000000")),
            ClaimantScenario(id="b", label="Perde", gross_receipt=D("0")),
        ],
        assumptions(heuristic_score=D("72")),
    )
    assert out["weighted"]["available"] is False
    assert out["weighted"]["reason"] == "heuristic_score_is_not_probability"
    assert out["weighted"]["expected_net_receipt"] is None
    assert out["heuristic_score_ignored"] is True
    assert [s["probability"] for s in out["scenarios"]] == [None, None]


def test_probabilidades_sem_aprovador_saem_nao_ponderadas():
    out = claimant_statement(
        [
            ClaimantScenario(id="a", label="Ganha", gross_receipt=D("100"), probability=D("0.6")),
            ClaimantScenario(id="b", label="Perde", gross_receipt=D("0"), probability=D("0.4")),
        ],
        assumptions(),
    )
    assert out["weighted"] == {
        "available": False,
        "reason": "probabilities_not_approved",
        "expected_net_receipt": None,
        "expected_net_present_value": None,
        "formula": out["weighted"]["formula"],
    }


def test_exemplo_da_especificacao_valor_liquido_presente_403686_20():
    # RF14: R$ 1.000.000 em dois anos, 60%/40%, 15% a.a., custo certo de R$ 50.000 hoje.
    cost = (CostItem("Custo certo hoje", D("50000")),)
    out = claimant_statement(
        [
            ClaimantScenario(
                id="recebe",
                label="Recebimento",
                gross_receipt=D("1000000"),
                years_from_base=D("2"),
                costs=cost,
                probability=D("0.60"),
            ),
            ClaimantScenario(
                id="zero",
                label="Sem recebimento",
                gross_receipt=D("0"),
                costs=cost,
                probability=D("0.40"),
            ),
        ],
        assumptions(
            discount_rate=D("0.15"),
            discount_rate_approved_by="Revisor sintetico",
            probabilities_approved_by="Revisor sintetico",
        ),
    )
    assert out["weighted"]["available"] is True
    assert out["weighted"]["expected_net_present_value"] == "403686.20"


def test_probabilidades_devem_somar_um():
    with pytest.raises(EconomicsError) as err:
        claimant_statement(
            [
                ClaimantScenario(id="a", label="A", gross_receipt=D("1"), probability=D("0.6")),
                ClaimantScenario(id="b", label="B", gross_receipt=D("1"), probability=D("0.5")),
            ],
            assumptions(probabilities_approved_by="Revisor"),
        )
    assert err.value.code == "probabilities_do_not_sum_to_one"


def test_probabilidade_parcial_ou_fora_do_intervalo_e_rejeitada():
    with pytest.raises(EconomicsError) as partial:
        claimant_statement(
            [
                ClaimantScenario(id="a", label="A", gross_receipt=D("1"), probability=D("1")),
                ClaimantScenario(id="b", label="B", gross_receipt=D("1")),
            ],
            assumptions(),
        )
    assert partial.value.code == "incomplete_probabilities"
    with pytest.raises(EconomicsError) as out_of_range:
        claimant_statement(
            [ClaimantScenario(id="a", label="A", gross_receipt=D("1"), probability=D("1.2"))],
            assumptions(),
        )
    assert out_of_range.value.code == "probability_out_of_range"


def test_moeda_divergente_exige_conversao_explicita():
    with pytest.raises(EconomicsError) as err:
        defendant_statement(
            D("1000"),
            [DefendantScenario(id="a", label="A", disbursement=D("10"), currency="USD")],
            assumptions(),
        )
    assert err.value.code == "currency_mismatch"


def test_valor_negativo_e_exibido_e_nao_truncado_a_zero():
    out = defendant_statement(
        D("500000"),
        [DefendantScenario(id="pior", label="Condenacao maior", disbursement=D("650000"))],
        assumptions(),
    )
    assert out["scenarios"][0]["gross_reduction"] == "-150000.00"
    assert out["scenarios"][0]["net_reduction"] == "-150000.00"


def test_taxa_de_desconto_exige_aprovador():
    with pytest.raises(EconomicsError) as err:
        claimant_statement(
            [ClaimantScenario(id="a", label="A", gross_receipt=D("1"))],
            assumptions(discount_rate=D("0.1")),
        )
    assert err.value.code == "discount_rate_not_approved"


def test_reu_nao_e_derivado_do_autor_por_subtracao():
    # Demonstrativos independentes: mudar o autor nao altera o reu.
    defendant = lambda: defendant_statement(  # noqa: E731
        D("1000000"),
        [DefendantScenario(id="a", label="A", disbursement=D("400000"))],
        assumptions(),
    )
    before = defendant()
    claimant_statement(
        [ClaimantScenario(id="x", label="X", gross_receipt=D("999999"))], assumptions()
    )
    assert defendant() == before


def test_centavos_arredondam_meio_para_cima_apenas_na_saida():
    out = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("100.005"),
                costs=(CostItem("c", D("0.000")),),
            )
        ],
        assumptions(),
    )
    assert out["scenarios"][0]["net_receipt"] == "100.01"


def _signed_total(steps, field="amount"):
    total = D(0)
    for step in steps:
        if step["sign"] == "+":
            total += D(step[field])
        elif step["sign"] == "-":
            total -= D(step[field])
    return total


def test_memoria_do_autor_reconcilia_com_liquido_e_valor_presente():
    # Mesmo exemplo da especificacao (RF14): a memoria aberta reproduz o valor exibido.
    out = claimant_statement(
        [
            ClaimantScenario(
                id="recebe",
                label="Recebimento",
                gross_receipt=D("1000000"),
                years_from_base=D("2"),
                costs=(CostItem("Custo certo hoje", D("50000"), source="Orcamento sintetico"),),
            )
        ],
        assumptions(discount_rate=D("0.15"), discount_rate_approved_by="Revisor sintetico"),
    )
    row = out["scenarios"][0]
    assert _signed_total(row["steps"]) == D(row["net_receipt"]) == D("950000.00")
    # 1.000.000 / 1,15^2 = 756.143,67; menos 50.000 hoje.
    assert [s["present_value"] for s in row["steps"]] == ["756143.67", "50000.00"]
    assert _signed_total(row["steps"], "present_value") == D(row["net_present_value"])
    assert row["steps"][0]["years"] == "2"
    assert row["steps"][1]["source"] == "Orcamento sintetico"


def test_memoria_do_reu_reconcilia_e_nao_conta_custo_ja_incluido():
    out = defendant_statement(
        D("1000000"),
        [
            DefendantScenario(
                id="base",
                label="Acordo",
                disbursement=D("700000"),
                incremental_costs=(
                    CostItem(
                        "Honorarios ja no desembolso", D("50000"), included_in_disbursement=True
                    ),
                    CostItem("Pericia adicional", D("10000")),
                ),
            )
        ],
        assumptions(),
    )
    row = out["scenarios"][0]
    assert _signed_total(row["steps"]) == D(row["net_reduction"]) == D("290000.00")
    informative = [s for s in row["steps"] if s["sign"] == "info"]
    assert [s["label"] for s in informative] == ["Honorarios ja no desembolso"]
