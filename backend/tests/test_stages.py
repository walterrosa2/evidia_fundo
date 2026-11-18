"""Estado das seis etapas (RF15) e decisao do responsavel sobre o memorando (etapa 6)."""

from evidia.services.stages import (
    STATUSES,
    Counts,
    adversarial,
    build,
    decision,
    economics,
    engines,
    entry,
    structuring,
)
from tests import test_scenarios as _scenarios
from tests.conftest import make_pdf, upload
from tests.test_scenarios import complete_scenario

case = _scenarios.case  # fixture do contraditorio, reaproveitada

# ---------------------------------------------------------------------- regras


def test_dossie_vazio_nao_presume_nada():
    rows = build(Counts())
    assert [r["number"] for r in rows] == [1, 2, 3, 4, 5, 6]
    assert [r["status"] for r in rows] == [
        "waiting_document",  # sem autos integrais
        "not_started",
        "not_started",
        "not_started",
        "not_started",
        "not_started",
    ]
    assert all(r["status"] in STATUSES for r in rows)


def test_entrada_conflito_pede_revisao_e_lacuna_pede_documento():
    assert entry(Counts(has_full_record=True))["status"] == "completed"
    gap = entry(Counts(has_full_record=True, open_gaps=2))
    assert gap["status"] == "waiting_document"
    assert gap["pending"] == ["2 lacunas documentais abertas."]
    conflict = entry(Counts(has_full_record=True, open_conflicts=1, open_gaps=1))
    assert conflict["status"] == "waiting_review"
    assert len(conflict["pending"]) == 2


def test_estruturacao_segue_documentos_e_revisao_das_afirmacoes():
    assert structuring(Counts(documents=1))["status"] == "in_progress"
    assert (
        structuring(Counts(documents=1, claims=3, claims_pending=1))["status"] == "waiting_review"
    )
    assert structuring(Counts(documents=1, claims=3, claims_stale=1))["status"] == "stale"
    assert structuring(Counts(documents=1, claims=3))["status"] == "completed"
    # Documento ainda sem texto impede dizer que a estruturacao terminou.
    assert (
        structuring(Counts(documents=2, documents_needing_ocr=1, claims=3))["status"] == "partial"
    )


def test_motores_parcial_falha_e_desatualizado_ficam_visiveis():
    assert engines(Counts(engine_runs={"running": 1}))["status"] == "in_progress"
    assert engines(Counts(engine_runs={"partial": 1, "completed": 1}))["status"] == "partial"
    assert engines(Counts(engine_runs={"failed": 1}))["status"] == "failed"
    assert engines(Counts(engine_runs_stale=2))["status"] == "stale"
    waiting = engines(Counts(engine_runs={"completed": 1}, findings_pending=4))
    assert waiting["status"] == "waiting_review"
    assert waiting["pending"] == ["4 achados aguardam revisão."]
    assert engines(Counts(engine_runs={"completed": 1}))["status"] == "completed"
    # Diligencia sem motor tambem conta como etapa iniciada.
    assert engines(Counts(occurrences=1, occurrences_pending=1))["status"] == "waiting_review"


def test_contraditorio_so_conclui_com_os_dois_lados_na_versao_atual():
    assert adversarial(Counts(pleas=1))["status"] == "in_progress"
    one = adversarial(Counts(pleas=1, scenario_sides_current={"claimant"}))
    assert one["status"] == "partial"
    assert "réu não analisado" in one["pending"][0]
    both = Counts(pleas=1, scenario_sides_current={"claimant", "defendant"})
    assert adversarial(both)["status"] == "completed"
    assert adversarial(Counts(pleas=1, scenarios_completed_old=2))["status"] == "stale"


def test_economia_e_decisao():
    assert economics(Counts(calculations=2))["status"] == "stale"
    done = economics(Counts(calculations=2, calculations_current=1))
    assert done["status"] == "completed" and "não homologada" in done["summary"]
    assert decision(Counts(memos=1))["status"] == "waiting_review"
    assert decision(Counts(memos=1, latest_memo_decision="approved"))["status"] == "completed"
    assert decision(Counts(memos=1, latest_memo_decision="returned"))["status"] == "in_progress"
    # Aprovacao de memorando desatualizado nao mantem a etapa concluida.
    stale = Counts(memos=1, latest_memo_decision="approved", latest_memo_stale=True)
    assert decision(stale)["status"] == "stale"


# ------------------------------------------------------------------------- API


def stages(actor, oid) -> dict[str, dict]:
    resp = actor.client.get(f"/api/v1/opportunities/{oid}/stages")
    assert resp.status_code == 200, resp.text
    return {row["key"]: row for row in resp.json()}


def test_etapas_acompanham_o_dossie_e_respeitam_a_organizacao(analyst, reviewer, outsider, case):
    oid = case["opp"]
    first = stages(analyst, oid)
    assert first["structuring"]["status"] == "waiting_review"  # duas afirmacoes pendentes
    assert first["adversarial"]["status"] == "in_progress"
    assert first["economics"]["status"] == "not_started"
    assert first["decision"]["status"] == "not_started"
    assert outsider.client.get(f"/api/v1/opportunities/{oid}/stages").status_code == 404

    complete_scenario(analyst, case, "a", "claimant", "r", 1)
    assert stages(analyst, oid)["adversarial"]["status"] == "partial"
    complete_scenario(analyst, case, "r", "defendant", "a", 2)
    assert stages(analyst, oid)["adversarial"]["status"] == "completed"

    calc = analyst.client.post(
        f"/api/v1/opportunities/{oid}/calculations",
        json={
            "claimant": {
                "assumptions": {"base_date": "2026-11-16"},
                "scenarios": [{"id": "a", "label": "A", "gross_receipt": "1000"}],
            }
        },
    ).json()
    memo = analyst.client.post(
        f"/api/v1/opportunities/{oid}/memos", json={"calculation_run_id": calc["id"]}
    ).json()
    now = stages(analyst, oid)
    assert now["economics"]["status"] == "completed"
    assert now["decision"]["status"] == "waiting_review"

    decide = f"/api/v1/memos/{memo['id']}/decision"
    body = {"decision": "approved", "comment": "Conferido com o comitê."}
    assert analyst.client.post(decide, json=body).status_code == 403  # analista nao decide
    assert outsider.client.post(decide, json=body).status_code in (403, 404)
    short = reviewer.client.post(decide, json={"decision": "approved", "comment": "ok"})
    assert short.status_code == 422  # decisao exige fundamento
    done = reviewer.client.post(decide, json=body)
    assert done.status_code == 200, done.text
    assert done.json()["decision"] == "approved" and done.json()["decided_by"]
    assert done.json()["body"] == memo["body"]  # a decisao nao reescreve o texto
    again = reviewer.client.post(
        decide, json={"decision": "returned", "comment": "Mudei de ideia."}
    )
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "memo_already_decided"
    assert stages(analyst, oid)["decision"]["status"] == "completed"

    # Documento novo: o que dependia do dossie anterior fica desatualizado, inclusive a decisao.
    upload(analyst, oid, make_pdf(pages=1, text="peca nova"), title="Peça nova")
    late = stages(analyst, oid)
    assert late["adversarial"]["status"] == "stale"
    assert late["economics"]["status"] == "stale"
    assert late["decision"]["status"] == "stale"
    other = analyst.client.post(
        f"/api/v1/opportunities/{oid}/memos", json={"calculation_run_id": calc["id"]}
    )
    assert other.status_code == 409


def test_memorando_desatualizado_nao_recebe_decisao(analyst, reviewer, opportunity):
    oid = opportunity["opportunity_id"]
    calc = analyst.client.post(
        f"/api/v1/opportunities/{oid}/calculations",
        json={
            "claimant": {
                "assumptions": {"base_date": "2026-11-16"},
                "scenarios": [{"id": "a", "label": "A", "gross_receipt": "1000"}],
            }
        },
    ).json()
    memo = analyst.client.post(
        f"/api/v1/opportunities/{oid}/memos", json={"calculation_run_id": calc["id"]}
    ).json()
    upload(analyst, oid, make_pdf(pages=1), title="Peça")
    resp = reviewer.client.post(
        f"/api/v1/memos/{memo['id']}/decision",
        json={"decision": "approved", "comment": "Aprovado."},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "memo_stale"


def test_segregacao_opcional_impede_que_quem_emitiu_aprove(app, analyst, reviewer, opportunity):
    oid = opportunity["opportunity_id"]
    body = {
        "claimant": {
            "assumptions": {"base_date": "2026-11-16"},
            "scenarios": [{"id": "a", "label": "A", "gross_receipt": "1000"}],
        }
    }
    calc = reviewer.client.post(f"/api/v1/opportunities/{oid}/calculations", json=body).json()
    memo = reviewer.client.post(
        f"/api/v1/opportunities/{oid}/memos", json={"calculation_run_id": calc["id"]}
    ).json()
    decide = f"/api/v1/memos/{memo['id']}/decision"
    decision = {"decision": "approved", "comment": "Conferido."}

    app.state.settings = app.state.settings.model_copy(update={"memo_distinct_approver": True})
    same = reviewer.client.post(decide, json=decision)
    assert same.status_code == 403
    assert same.json()["error"]["code"] == "memo_same_person"

    # Sem a exigencia (padrao), o mesmo revisor pode decidir.
    app.state.settings = app.state.settings.model_copy(update={"memo_distinct_approver": False})
    assert reviewer.client.post(decide, json=decision).status_code == 200
