"""Autenticacao, isolamento por organizacao, papeis e trilha de auditoria (P07, AC03)."""

import json

from fastapi.testclient import TestClient

from tests.conftest import PASSWORD, make_pdf, upload


def test_health_identifica_modo_operacional_sem_exigir_login(app):
    body = TestClient(app).get("/health").json()
    assert body == {
        "status": "ok",
        "service": "evidia-api",
        "version": body["version"],
        "mode": "operational",
        "origination_mode": "fixture",
        # Modos dos motores: informam se ha IA real, sem expor chave nem endereco.
        "nulidade360_mode": "disabled",
        "llm_mode": "disabled",
    }


def test_rotas_operacionais_exigem_autenticacao(app):
    anonymous = TestClient(app)
    for path in ("/api/v1/opportunities", "/api/v1/origination/candidates", "/api/v1/auth/me"):
        resp = anonymous.get(path)
        assert resp.status_code == 401, path
        assert resp.json()["error"]["code"] == "not_authenticated"


def test_login_invalido_nao_revela_se_o_usuario_existe(app, analyst):
    client = TestClient(app)
    wrong = client.post("/api/v1/auth/login", json={"username": "analista.a", "password": "x"})
    unknown = client.post("/api/v1/auth/login", json={"username": "ninguem", "password": "x"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"] == unknown.json()["error"]


def test_cookie_de_sessao_e_httponly_e_strict(app, analyst):
    client = TestClient(app)
    resp = client.post("/api/v1/auth/login", json={"username": "analista.a", "password": PASSWORD})
    cookie = resp.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie
    assert PASSWORD not in resp.text


def test_mutacao_por_cookie_sem_cabecalho_proprio_e_recusada(app, analyst):
    client = TestClient(app)
    client.post("/api/v1/auth/login", json={"username": "analista.a", "password": PASSWORD})
    resp = client.post(
        "/api/v1/origination/imports",
        json={"external_id": "caso:1", "position_side": "claimant", "represented_party": "X"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "csrf_header_required"


def test_ac03_outra_organizacao_nao_ve_nem_confirma_existencia(analyst, outsider, opportunity):
    oid = opportunity["opportunity_id"]
    version = upload(analyst, oid, make_pdf(pages=2)).json()["version"]
    claim = analyst.client.post(
        f"/api/v1/opportunities/{oid}/claims",
        json={"text": "Afirmacao da org A", "nature": "attributed_allegation"},
    ).json()

    assert outsider.client.get("/api/v1/opportunities").json() == []
    probes = [
        outsider.client.get(f"/api/v1/opportunities/{oid}"),
        outsider.client.get(f"/api/v1/opportunities/{oid}/claims"),
        outsider.client.get(f"/api/v1/opportunities/{oid}/calculations"),
        outsider.client.get(f"/api/v1/document-versions/{version['id']}/content"),
        outsider.client.post(
            f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "discarded"}
        ),
        upload(outsider, oid, make_pdf(pages=1)),
        outsider.client.post(
            f"/api/v1/opportunities/{oid}/claims",
            json={"text": "intrusao", "nature": "attributed_allegation"},
        ),
    ]
    for resp in probes:
        assert resp.status_code == 404, resp.request.url
        assert "Org A" not in resp.text and "Sintética Alfa" not in resp.text

    # Documento da org A nao pode ser citado a partir de um dossie da org B.
    other = outsider.client.post(
        "/api/v1/origination/imports",
        json={"external_id": "caso:2", "position_side": "defendant", "represented_party": "Ré"},
    ).json()
    cross = outsider.client.post(
        f"/api/v1/opportunities/{other['opportunity_id']}/claims",
        json={
            "text": "citacao cruzada",
            "nature": "documentary_finding",
            "document_version_id": version["id"],
            "page_start": 1,
        },
    )
    assert cross.status_code == 422
    assert cross.json()["error"]["code"] == "citation_unresolvable"


def test_ac03_sessao_revogada_perde_acesso_imediatamente(app, analyst, opportunity):
    oid = opportunity["opportunity_id"]
    assert analyst.client.get(f"/api/v1/opportunities/{oid}").status_code == 200
    token = analyst.client.cookies.get("evidia_session")
    assert analyst.client.post("/api/v1/auth/logout").status_code == 204

    # Mesmo reapresentando o token antigo (como faria um cache), o servidor nega.
    replay = TestClient(app)
    resp = replay.get(f"/api/v1/opportunities/{oid}", headers={"authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "Sintética" not in resp.text


def test_usuario_desativado_perde_acesso(app, analyst):
    from evidia.models import User

    with app.state.write_session_factory() as db:
        db.get(User, analyst.user_id).active = False
        db.commit()
    assert analyst.client.get("/api/v1/opportunities").status_code == 401


def test_papeis_leitor_nao_escreve_e_analista_nao_revisa(actor_factory, analyst, opportunity):
    oid = opportunity["opportunity_id"]
    viewer = actor_factory("Org A", "leitor.a", "viewer")
    assert viewer.client.get(f"/api/v1/opportunities/{oid}").status_code == 200
    assert upload(viewer, oid, make_pdf()).status_code == 403
    denied_import = viewer.client.post(
        "/api/v1/origination/imports",
        json={"external_id": "caso:2", "position_side": "claimant", "represented_party": "X"},
    )
    assert denied_import.status_code == 403

    claim = analyst.client.post(
        f"/api/v1/opportunities/{oid}/claims",
        json={"text": "Afirmacao qualquer", "nature": "attributed_allegation"},
    ).json()
    own_review = analyst.client.post(
        f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "discarded"}
    )
    assert own_review.status_code == 403


def test_dinheiro_em_ponto_flutuante_e_recusado_na_api(analyst, opportunity):
    resp = analyst.client.post(
        f"/api/v1/opportunities/{opportunity['opportunity_id']}/calculations",
        json={
            "defendant": {
                "assumptions": {"base_date": "2026-11-16"},
                "reference_exposure": 1000000.10,
                "scenarios": [{"id": "a", "label": "A", "disbursement": "1"}],
            }
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "invalid_request"


def test_api_calcula_os_dois_demonstrativos_sem_contrato(analyst, opportunity):
    resp = analyst.client.post(
        f"/api/v1/opportunities/{opportunity['opportunity_id']}/calculations",
        json={
            "claimant": {
                "assumptions": {"base_date": "2026-11-16"},
                "scenarios": [{"id": "c", "label": "Procedencia", "gross_receipt": "500000"}],
            },
            "defendant": {
                "assumptions": {"base_date": "2026-11-16"},
                "reference_exposure": "1000000",
                "scenarios": [
                    {
                        "id": "d",
                        "label": "Acordo",
                        "disbursement": "700000",
                        "incremental_costs": [{"label": "Custo", "amount": "50000"}],
                    }
                ],
            },
        },
    )
    assert resp.status_code == 201, resp.text
    result = resp.json()["result"]
    assert result["defendant"]["scenarios"][0]["net_reduction"] == "250000.00"
    assert result["claimant"]["contract"]["investor_return"]["value"] is None
    assert result["defendant"]["evidia_revenue"]["value"] is None
    assert resp.json()["formula_version"] == result["formula_version"]


def test_erro_economico_devolve_codigo_estavel(analyst, opportunity):
    resp = analyst.client.post(
        f"/api/v1/opportunities/{opportunity['opportunity_id']}/calculations",
        json={
            "claimant": {
                "assumptions": {"base_date": "2026-11-16", "probabilities_approved_by": "R"},
                "scenarios": [
                    {"id": "a", "label": "A", "gross_receipt": "1", "probability": "0.7"},
                    {"id": "b", "label": "B", "gross_receipt": "1", "probability": "0.7"},
                ],
            }
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "probabilities_do_not_sum_to_one"


def test_auditoria_registra_acao_alvo_resultado_e_correlacao_sem_segredos(
    app, settings, analyst, opportunity
):
    upload(analyst, opportunity["opportunity_id"], make_pdf(pages=1))
    analyst.client.get("/api/v1/opportunities", headers={"x-correlation-id": "corr-teste-0001"})
    raw = (settings.log_dir / "audit.jsonl").read_text(encoding="utf-8")
    events = [json.loads(line) for line in raw.splitlines() if line.strip()]
    actions = {e["action"] for e in events}
    assert {"auth.login", "opportunity.import", "document.upload"} <= actions
    for event in events:
        assert {"timestamp", "correlation_id", "actor", "action", "target", "outcome"} <= set(event)
    assert PASSWORD not in raw
    assert "Sintética Alfa" not in raw  # nome de parte nao entra no log geral

    app_log = (settings.log_dir / "app.log").read_text(encoding="utf-8")
    assert PASSWORD not in app_log


def test_correlation_id_volta_no_cabecalho_e_no_erro(app):
    resp = TestClient(app).get("/api/v1/auth/me", headers={"x-correlation-id": "corr-teste-0002"})
    assert resp.headers["x-correlation-id"] == "corr-teste-0002"
    assert resp.json()["correlation_id"] == "corr-teste-0002"


def test_sanitizacao_mascara_identificadores_e_segredos():
    from evidia.logging_setup import sanitize

    out = sanitize(
        {
            "password": "abc",
            "nota": "CPF 123.456.789-09 e contato fulano@exemplo.invalid",
            "nested": [{"api_key": "k"}],
        }
    )
    assert out["password"] == "***"
    assert out["nested"][0]["api_key"] == "***"
    assert "123.456.789-09" not in out["nota"] and "fulano@" not in out["nota"]
