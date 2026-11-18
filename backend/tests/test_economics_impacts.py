"""Impactos, grupos de dependencia, sensibilidade e memorando (T013/T017; RF13–RF14).

Valores esperados calculados a mao a partir das regras declaradas, nao da implementacao.
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
    Impact,
    claimant_statement,
    defendant_statement,
)
from tests import test_scenarios as _scenarios
from tests.conftest import make_pdf, upload
from tests.test_economics import _signed_total
from tests.test_scenarios import complete_scenario

case = _scenarios.case  # fixture do contraditorio, reaproveitada

BASE = date(2026, 11, 16)


def assumptions(**kw) -> Assumptions:
    return Assumptions(currency="BRL", base_date=BASE, **kw)


def impact(id_, group, affects, amount=None, years=None, **kw) -> Impact:
    return Impact(
        id=id_,
        label=f"Impacto {id_}",
        dependency_group=group,
        affects=affects,
        amount=None if amount is None else D(amount),
        years=None if years is None else D(years),
        **kw,
    )


# -------------------------------------------------------------------- dominio


def test_impactos_do_mesmo_grupo_nao_sao_somados_duas_vezes():
    """Dois achados com a mesma causa (-100k e -60k) reduzem o valor em 100k, nao em 160k."""
    out = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("1000000"),
                costs=(CostItem(label="Honorários", amount=D("50000")),),
                impacts=(
                    impact("i1", "nulidade-citacao", "value", "-60000"),
                    impact("i2", "nulidade-citacao", "value", "-100000"),
                    impact("i3", "prova-pericial", "value", "-20000"),
                ),
            )
        ],
        assumptions(),
    )
    s = out["scenarios"][0]
    assert s["impacts_on_value"] == "-120000.00"
    assert s["adjusted_gross_receipt"] == "880000.00"
    assert s["net_receipt"] == "830000.00"
    by_id = {i["id"]: i for i in s["impacts"]}
    assert by_id["i2"]["applied"] and by_id["i3"]["applied"]
    assert by_id["i1"]["applied"] is False
    assert by_id["i1"]["not_applied_reason"] == "same_dependency_group"
    # A memoria continua fechando com o resultado.
    assert _signed_total(s["steps"]) == D(s["net_receipt"])


def test_mesmo_grupo_em_dimensoes_diferentes_aplica_os_dois():
    """A mesma causa pode reduzir o valor E gerar custo: sao dimensoes distintas."""
    out = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("500000"),
                impacts=(
                    impact("v", "g", "value", "-50000"),
                    impact("c", "g", "cost", "10000"),
                ),
            )
        ],
        assumptions(),
    )
    s = out["scenarios"][0]
    assert s["net_receipt"] == "440000.00"
    assert all(i["applied"] for i in s["impacts"])


def test_impacto_de_probabilidade_e_de_contrato_e_so_informativo():
    plain = claimant_statement(
        [ClaimantScenario(id="a", label="A", gross_receipt=D("100000"))], assumptions()
    )
    out = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("100000"),
                impacts=(
                    impact("p", "g1", "probability", note="reduz a chance de êxito"),
                    impact("k", "g2", "contract", "5000"),
                ),
            )
        ],
        assumptions(heuristic_score=D("0.4")),
    )
    s = out["scenarios"][0]
    assert s["net_receipt"] == plain["scenarios"][0]["net_receipt"] == "100000.00"
    assert s["probability"] is None and out["weighted"]["available"] is False
    reasons = {i["id"]: i["not_applied_reason"] for i in s["impacts"]}
    assert reasons == {
        "p": "probability_is_an_approved_assumption",
        "k": "contract_not_defined",
    }


def test_impacto_de_prazo_muda_so_o_valor_presente():
    """1.000.000 em 2 anos a 10%: VP 826.446,28. Com +1 ano: 751.314,80. Liquido igual."""

    def run(*impacts):
        return claimant_statement(
            [
                ClaimantScenario(
                    id="a",
                    label="A",
                    gross_receipt=D("1000000"),
                    years_from_base=D(2),
                    impacts=impacts,
                )
            ],
            assumptions(discount_rate=D("0.10"), discount_rate_approved_by="Comitê"),
        )["scenarios"][0]

    base = run()
    later = run(impact("t", "recurso", "term", years="1"))
    assert base["net_present_value"] == "826446.28"
    assert later["net_present_value"] == "751314.80"
    assert later["net_receipt"] == base["net_receipt"] == "1000000.00"
    assert later["years"] == "3"
    assert _signed_total(later["steps"], "present_value") == D(later["net_present_value"])


def test_impacto_de_prazo_sem_taxa_nao_e_aplicado_e_diz_por_que():
    s = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("1000"),
                impacts=(impact("t", "g", "term", years="2"),),
            )
        ],
        assumptions(),
    )["scenarios"][0]
    assert s["impacts"][0]["applied"] is False
    assert s["impacts"][0]["not_applied_reason"] == "no_discounting_in_this_statement"


def test_reu_impacto_que_aumenta_desembolso_reduz_a_reducao_de_passivo():
    """Referencia 1.000.000, desembolso 700.000, impacto +50.000 e custo de impacto 10.000."""
    out = defendant_statement(
        D("1000000"),
        [
            DefendantScenario(
                id="a",
                label="A",
                disbursement=D("700000"),
                impacts=(
                    impact("v", "multa", "value", "50000"),
                    impact("v2", "multa", "value", "30000"),
                    impact("c", "pericia", "cost", "10000"),
                ),
            )
        ],
        assumptions(),
    )
    s = out["scenarios"][0]
    assert s["adjusted_disbursement"] == "750000.00"
    assert s["gross_reduction"] == "250000.00"
    assert s["net_reduction"] == "240000.00"
    assert _signed_total(s["steps"]) == D(s["net_reduction"])
    assert out["evidia_revenue"]["value"] is None


def test_sensibilidade_varia_uma_premissa_por_vez():
    """Bruto 1.000.000, custo 100.000 hoje, 2 anos, 10% a.a."""
    s = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("1000000"),
                years_from_base=D(2),
                costs=(CostItem(label="Custas", amount=D("100000")),),
            )
        ],
        assumptions(discount_rate=D("0.10"), discount_rate_approved_by="Comitê"),
    )["scenarios"][0]
    rows = {(r["parameter"], r["change"]): r for r in s["sensitivity"]}
    assert rows[("gross_receipt", "+10%")]["net_receipt"] == "1000000.00"
    assert rows[("gross_receipt", "-10%")]["net_receipt"] == "800000.00"
    # 1.100.000 / 1,21 - 100.000
    assert rows[("gross_receipt", "+10%")]["net_present_value"] == "809090.91"
    # prazo: 1.000.000 / 1,331 - 100.000 ; 1.000.000 / 1,1 - 100.000
    assert rows[("years", "+1 ano")]["net_present_value"] == "651314.80"
    assert rows[("years", "-1 ano")]["net_present_value"] == "809090.91"
    # taxa: 1.000.000 / 1,11^2 - 100.000 ; 1.000.000 / 1,09^2 - 100.000
    assert rows[("discount_rate", "+1 p.p.")]["net_present_value"] == "711622.43"
    assert rows[("discount_rate", "-1 p.p.")]["net_present_value"] == "741679.99"
    # Variar prazo ou taxa nao muda o liquido nominal.
    assert rows[("years", "+1 ano")]["net_receipt"] == s["net_receipt"] == "900000.00"


def test_sem_impactos_o_resultado_e_o_da_formula_anterior():
    """Exemplo da especificacao continua valendo: 403.686,20."""
    out = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("600000"),
                years_from_base=D(2),
                costs=(CostItem(label="Custos", amount=D("90000")),),
            )
        ],
        assumptions(discount_rate=D("0.12"), discount_rate_approved_by="Comitê"),
    )["scenarios"][0]
    assert out["impacts"] == []
    assert out["adjusted_gross_receipt"] == out["gross_receipt"]


@pytest.mark.parametrize(
    ("bad", "code"),
    [
        ((impact("x", "g", "value", "1"), impact("x", "g", "value", "2")), "duplicate_impact"),
        ((impact("x", "  ", "value", "1"),), "invalid_impact"),
        ((impact("x", "g", "value"),), "invalid_impact"),
        ((impact("x", "g", "cost", "-1"),), "invalid_impact"),
        ((impact("x", "g", "term"),), "invalid_impact"),
        ((impact("x", "g", "outra", "1"),), "invalid_impact"),
    ],
)
def test_impacto_invalido_e_recusado(bad, code):
    with pytest.raises(EconomicsError) as err:
        claimant_statement(
            [ClaimantScenario(id="a", label="A", gross_receipt=D("1000"), impacts=bad)],
            assumptions(),
        )
    assert err.value.code == code


def test_impacto_de_prazo_nao_leva_recebimento_para_antes_da_data_base():
    with pytest.raises(EconomicsError) as err:
        claimant_statement(
            [
                ClaimantScenario(
                    id="a",
                    label="A",
                    gross_receipt=D("1000"),
                    years_from_base=D(1),
                    impacts=(impact("t", "g", "term", years="-2"),),
                )
            ],
            assumptions(discount_rate=D("0.1"), discount_rate_approved_by="Comitê"),
        )
    assert err.value.code == "negative_time"


def test_responsavel_e_confianca_acompanham_cada_componente():
    s = claimant_statement(
        [
            ClaimantScenario(
                id="a",
                label="A",
                gross_receipt=D("1000"),
                responsible="Ana",
                confidence="medium",
                costs=(
                    CostItem(
                        label="Custas", amount=D("10"), responsible="Bruno", confidence="high"
                    ),
                ),
                impacts=(impact("v", "g", "value", "-5", responsible="Carla", confidence="low"),),
            )
        ],
        assumptions(),
    )["scenarios"][0]
    who = {step["key"]: (step["responsible"], step["confidence"]) for step in s["steps"]}
    assert who == {
        "gross_receipt": ("Ana", "medium"),
        "impact_value": ("Carla", "low"),
        "cost": ("Bruno", "high"),
    }


# ------------------------------------------------------------------------ API


def calc_body(impacts):
    return {
        "claimant": {
            "assumptions": {"base_date": "2026-11-16"},
            "scenarios": [
                {"id": "a", "label": "Procedência", "gross_receipt": "1000000", "impacts": impacts}
            ],
        }
    }


def claim_impact(claim_id, **over):
    body = {
        "id": "i1",
        "label": "Prova frágil",
        "dependency_group": "prova",
        "affects": "value",
        "amount": "-100000",
        "source_type": "claim",
        "source_id": claim_id,
    }
    body.update(over)
    return body


def test_impacto_so_aceita_fonte_validada_do_proprio_dossie(
    analyst, reviewer, outsider, opportunity
):
    oid = opportunity["opportunity_id"]
    url = f"/api/v1/opportunities/{oid}/calculations"
    version = upload(analyst, oid, make_pdf(pages=2), title="Laudo").json()["version"]
    claim = analyst.client.post(
        f"/api/v1/opportunities/{oid}/claims",
        json={
            "text": "O laudo não mediu o atraso.",
            "nature": "documentary_finding",
            "document_version_id": version["id"],
            "page_start": 1,
            "excerpt": "",
        },
    ).json()

    pending = analyst.client.post(url, json=calc_body([claim_impact(claim["id"])]))
    assert pending.status_code == 422
    assert pending.json()["error"]["code"] == "impact_source_not_validated"

    missing = analyst.client.post(url, json=calc_body([claim_impact(None)]))
    assert missing.json()["error"]["code"] == "impact_source_missing"

    unknown = analyst.client.post(url, json=calc_body([claim_impact("nao-existe")]))
    assert unknown.json()["error"]["code"] == "impact_source_not_found"

    assert analyst.client.get(url).json() == []  # nada foi gravado nas recusas
    sources_url = f"/api/v1/opportunities/{oid}/impact-sources"
    assert analyst.client.get(sources_url).json() == []  # nada validado ainda

    reviewed = reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "validated"}
    )
    assert reviewed.status_code == 200, reviewed.text
    assert analyst.client.get(sources_url).json() == [
        {"type": "claim", "id": claim["id"], "label": "Afirmação: O laudo não mediu o atraso."}
    ]
    assert outsider.client.get(sources_url).status_code == 404
    ok = analyst.client.post(url, json=calc_body([claim_impact(claim["id"])]))
    assert ok.status_code == 201, ok.text
    scenario = ok.json()["result"]["claimant"]["scenarios"][0]
    assert scenario["net_receipt"] == "900000.00"
    source = scenario["impacts"][0]["source"]
    assert source["type"] == "claim" and source["id"] == claim["id"]
    assert source["label"].startswith("Afirmação validada: O laudo")
    assert ok.json()["formula_version"] == "econ-1.2.0"

    # Outra organizacao nao usa a afirmacao deste dossie como fonte.
    other = outsider.client.post(
        "/api/v1/opportunities",
        json={"cnj": "0000001-11.2024.8.26.0100", "position_side": "claimant"},
    )
    if other.status_code == 201:
        foreign = outsider.client.post(
            f"/api/v1/opportunities/{other.json()['id']}/calculations",
            json=calc_body([claim_impact(claim["id"])]),
        )
        assert foreign.json()["error"]["code"] == "impact_source_not_found"


def test_demonstrativo_declara_limitacoes_e_a_adversarial_some_quando_concluida(analyst, case):
    url = f"/api/v1/opportunities/{case['opp']}/calculations"
    first = analyst.client.post(url, json=calc_body([])).json()
    codes = [item["code"] for item in first["result"]["limitations"]]
    assert codes == [
        "methodology_not_homologated",
        "contract_not_defined",
        "no_adversarial_analysis",
        "claimant_not_weighted",
    ]

    complete_scenario(analyst, case, "a", "claimant", "r", 1)
    second = analyst.client.post(url, json=calc_body([])).json()
    codes = [item["code"] for item in second["result"]["limitations"]]
    assert "no_adversarial_analysis" not in codes
    assert "methodology_not_homologated" in codes


def test_memorando_e_versionado_imutavel_e_fica_desatualizado_com_o_dossie(
    analyst, outsider, opportunity
):
    oid = opportunity["opportunity_id"]
    manual = {
        "id": "m1",
        "label": "Risco de prescrição parcial",
        "dependency_group": "prescricao",
        "affects": "value",
        "amount": "-250000",
        "responsible": "Ana",
        "confidence": "low",
    }
    dup = {**manual, "id": "m2", "amount": "-100000", "label": "Mesmo risco, outra peça"}
    calc = analyst.client.post(
        f"/api/v1/opportunities/{oid}/calculations", json=calc_body([manual, dup])
    ).json()

    memos_url = f"/api/v1/opportunities/{oid}/memos"
    one = analyst.client.post(
        memos_url, json={"calculation_run_id": calc["id"], "notes": "Primeira leitura."}
    )
    assert one.status_code == 201, one.text
    memo = one.json()
    assert memo["version"] == 1 and memo["stale"] is False
    body = memo["body"]
    assert "# Memorando econômico — versão 1" in body
    assert "Metodologia econômica não homologada" in body
    assert "Não há análise adversarial concluída" in body
    assert "750.000,00" in body  # 1.000.000 - 250.000 (o de 100.000 nao soma)
    assert "não aplicado — mesma causa de outro impacto" in body
    assert "Primeira leitura." in body
    assert "não definidos (sem contrato)" in body

    two = analyst.client.post(memos_url, json={"calculation_run_id": calc["id"]}).json()
    assert two["version"] == 2
    listed = analyst.client.get(memos_url).json()
    assert [m["version"] for m in listed] == [2, 1]
    assert listed[1]["body"] == body  # a versao 1 nao foi reescrita

    exported = analyst.client.get(f"/api/v1/memos/{memo['id']}/export")
    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/markdown")
    assert exported.content.decode("utf-8") == body

    # Isolamento por organizacao.
    assert outsider.client.get(f"/api/v1/memos/{memo['id']}/export").status_code == 404
    assert outsider.client.get(memos_url).status_code == 404
    assert analyst.client.post(memos_url, json={"calculation_run_id": "x"}).status_code == 404

    # Documento novo: memorando e demonstrativo ficam desatualizados; nao se emite outro.
    upload(analyst, oid, make_pdf(pages=1, text="peca nova"), title="Peça nova")
    assert all(m["stale"] for m in analyst.client.get(memos_url).json())
    late = analyst.client.get(f"/api/v1/memos/{memo['id']}/export").content.decode("utf-8")
    assert late.startswith("> ATENÇÃO: memorando desatualizado")
    blocked = analyst.client.post(memos_url, json={"calculation_run_id": calc["id"]})
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "calculation_stale"


def test_exportacao_do_demonstrativo_traz_impactos_e_sensibilidade(analyst, opportunity):
    oid = opportunity["opportunity_id"]
    calc = analyst.client.post(
        f"/api/v1/opportunities/{oid}/calculations",
        json=calc_body(
            [
                {
                    "id": "m1",
                    "label": "=Risco",
                    "dependency_group": "g",
                    "affects": "value",
                    "amount": "-1000",
                }
            ]
        ),
    ).json()
    text = analyst.client.get(f"/api/v1/calculations/{calc['id']}/export").content.decode(
        "utf-8-sig"
    )
    assert "Impactos" in text and "Grupo de dependência" in text
    assert "Sensibilidade (uma premissa por vez)" in text
    assert "Premissa manual" in text
    assert "\n=Risco" not in text and ";=Risco" not in text  # formula neutralizada
