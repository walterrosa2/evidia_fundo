"""Contrato do adaptador HTTP da originacao, contra respostas no formato declarado
no codigo da origem. Nao substitui a homologacao com instancia real (D3)."""

import httpx
import pytest

from evidia.adapters.origination import (
    DisabledOriginationClient,
    FixtureOriginationClient,
    HttpOriginationClient,
    OriginationError,
    normalize_snapshot,
    snapshot_hash,
)
from evidia.fixtures.origination import build_fixture

DATA = build_fixture()
CNJ_A = DATA["casos"][0]["processo_cnj_principal"]


def make_client(handler, **kw) -> tuple[HttpOriginationClient, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def wrapped(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    client = HttpOriginationClient(
        "http://origem.invalid",
        "servico@exemplo.invalid",
        "segredo-sintetico",
        transport=httpx.MockTransport(wrapped),
        sleep=lambda _s: None,
        **kw,
    )
    return client, seen


def healthy(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/api/v1/auth/login":
        return httpx.Response(200, json={"id": 1}, headers={"set-cookie": "evid_sessao=t; Path=/"})
    if path == "/api/v1/casos":
        return httpx.Response(200, json=DATA["casos"])
    if path == "/api/v1/analisados":
        return httpx.Response(200, json=DATA["analisados"])
    if path == "/api/v1/casos/1":
        return httpx.Response(200, json=DATA["casos"][0])
    if path == "/api/v1/casos/4":
        return httpx.Response(200, json=DATA["casos"][3])
    if path == f"/api/v1/processos/{CNJ_A}/estudo":
        return httpx.Response(200, json=DATA["estudos"][CNJ_A])
    if path.endswith("/estudo"):
        return httpx.Response(404, json={"codigo": "ESTUDO_NAO_EXISTE", "mensagem": "x"})
    return httpx.Response(404, json={"codigo": "NAO_ENCONTRADO", "mensagem": "x"})


def test_lista_candidatos_e_envia_cookie_de_sessao():
    client, seen = make_client(healthy)
    items = client.list_candidates()
    assert {i["external_id"] for i in items} == {"caso:1", "caso:2", "caso:3", "caso:4"}
    assert next(i for i in items if i["external_id"] == "caso:1")["has_study"] is True
    assert next(i for i in items if i["external_id"] == "caso:4")["has_study"] is False
    assert "evid_sessao=t" in seen[-1].headers.get("cookie", "")


def test_adaptador_so_emite_get_alem_do_login_e_nunca_gera_estudo_pago():
    client, seen = make_client(healthy)
    client.list_candidates()
    client.fetch("caso:1")
    client.fetch("caso:4")
    posts = [r.url.path for r in seen if r.method != "GET"]
    assert posts == ["/api/v1/auth/login"]


def test_estudo_inexistente_e_estado_legitimo_e_vira_lacuna():
    client, _ = make_client(healthy)
    raw = client.fetch("caso:4")
    assert raw.study is None
    snapshot = normalize_snapshot(raw)
    codes = {g["code"] for g in snapshot["gaps"]}
    assert {"study_not_available", "full_record_not_provided", "parties_not_provided"} <= codes
    assert snapshot["parties"] == []  # nada inventado para preencher a ausencia


def test_estudo_e_pdfs_sao_relatorios_derivados_nunca_autos():
    client, _ = make_client(healthy)
    snapshot = normalize_snapshot(client.fetch("caso:1"))
    assert {d["category"] for d in snapshot["document_refs"]} == {"derived_report"}
    assert snapshot["study"]["has_full_record"] is False
    assert "full_record_not_provided" in {g["code"] for g in snapshot["gaps"]}


def test_credencial_recusada_vira_erro_explicito():
    client, _ = make_client(lambda r: httpx.Response(401, json={"codigo": "LOGIN_INVALIDO"}))
    with pytest.raises(OriginationError) as err:
        client.list_candidates()
    assert err.value.code == "origination_auth_failed"


def test_indisponibilidade_apos_retries_e_falha_nao_lista_vazia():
    calls = {"casos": 0}

    def handler(request):
        if request.url.path.endswith("/login"):
            return httpx.Response(200, json={})
        calls["casos"] += 1
        return httpx.Response(503, text="fora do ar")

    client, _ = make_client(handler, max_retries=2)
    with pytest.raises(OriginationError) as err:
        client.list_candidates()
    assert err.value.code == "origination_unavailable"
    assert err.value.retryable is True
    assert calls["casos"] == 3  # 1 tentativa + 2 retries limitados


def test_timeout_de_rede_e_falha_explicita():
    def handler(request):
        if request.url.path.endswith("/login"):
            return httpx.Response(200, json={})
        raise httpx.ReadTimeout("tempo esgotado", request=request)

    client, _ = make_client(handler, max_retries=1)
    with pytest.raises(OriginationError) as err:
        client.list_candidates()
    assert err.value.code == "origination_unavailable"


def test_html_do_catch_all_da_spa_e_violacao_de_contrato():
    def handler(request):
        if request.url.path.endswith("/login"):
            return httpx.Response(200, json={})
        return httpx.Response(200, text="<html></html>", headers={"content-type": "text/html"})

    client, _ = make_client(handler)
    with pytest.raises(OriginationError) as err:
        client.list_candidates()
    assert err.value.code == "origination_contract_violation"


def test_limite_e_permissao_tem_codigos_distintos():
    def limited(request):
        if request.url.path.endswith("/login"):
            return httpx.Response(200, json={})
        return httpx.Response(429, json={})

    def denied(request):
        if request.url.path.endswith("/login"):
            return httpx.Response(200, json={})
        return httpx.Response(403, json={"codigo": "SEM_PERMISSAO"})

    with pytest.raises(OriginationError) as e1:
        make_client(limited)[0].list_candidates()
    with pytest.raises(OriginationError) as e2:
        make_client(denied)[0].list_candidates()
    assert (e1.value.code, e2.value.code) == ("origination_rate_limited", "origination_forbidden")


def test_sessao_expirada_refaz_login_uma_vez():
    state = {"logins": 0, "casos": 0}

    def handler(request):
        if request.url.path.endswith("/login"):
            state["logins"] += 1
            return httpx.Response(200, json={})
        if request.url.path == "/api/v1/casos":
            state["casos"] += 1
            if state["casos"] == 1:
                return httpx.Response(401, json={"codigo": "NAO_AUTENTICADO"})
            return httpx.Response(200, json=[])
        return httpx.Response(200, json=[])

    client, _ = make_client(handler)
    assert client.list_candidates() == []
    assert state["logins"] == 2


def test_configuracao_incompleta_nao_cria_cliente():
    with pytest.raises(OriginationError) as err:
        HttpOriginationClient("", "", "")
    assert err.value.code == "origination_not_configured"
    assert "segredo" not in err.value.message.lower()


def test_integracao_desabilitada_falha_em_vez_de_devolver_dados():
    with pytest.raises(OriginationError) as err:
        DisabledOriginationClient().list_candidates()
    assert err.value.code == "origination_not_configured"


def test_hash_do_snapshot_e_estavel_e_sensivel_a_mudanca():
    client = FixtureOriginationClient()
    a = normalize_snapshot(client.fetch("caso:1"))
    b = normalize_snapshot(client.fetch("caso:1"))
    assert snapshot_hash(a) == snapshot_hash(b)
    b["judge"] = "Outro Magistrado Sintético"
    assert snapshot_hash(a) != snapshot_hash(b)
    assert a["is_synthetic"] is True


# ------------------------------------------------- download de relatorio


def test_relatorio_derivado_e_baixado_por_get_e_so_nos_caminhos_conhecidos():
    pdf = b"%PDF-1.4 sintetico"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/dossie.pdf"):
            return httpx.Response(200, content=pdf, headers={"content-type": "application/pdf"})
        if request.url.path.endswith("/estudo.pdf"):
            return httpx.Response(200, text="<html></html>", headers={"content-type": "text/html"})
        return healthy(request)

    client, seen = make_client(handler)
    assert client.fetch_document(f"/api/v1/processos/{CNJ_A}/dossie.pdf") == pdf
    assert {r.method for r in seen if "auth/login" not in r.url.path} == {"GET"}

    # Catch-all da SPA (HTML com 200) nao e aceito como relatorio.
    with pytest.raises(OriginationError) as html:
        client.fetch_document(f"/api/v1/processos/{CNJ_A}/estudo.pdf")
    assert html.value.code == "origination_contract_violation"

    # Caminho fora do contrato nem chega a ser pedido.
    before = len(seen)
    for path in (
        f"/api/v1/processos/{CNJ_A}/estudo",
        "/api/v1/processos/../../etc/passwd",
        f"http://outro.invalid/api/v1/processos/{CNJ_A}/dossie.pdf",
    ):
        with pytest.raises(OriginationError) as bad:
            client.fetch_document(path)
        assert bad.value.code == "origination_contract_violation"
    assert len(seen) == before


def test_relatorio_que_a_origem_nao_tem_e_erro_proprio():
    client, _ = make_client(healthy)
    with pytest.raises(OriginationError) as err:
        client.fetch_document(f"/api/v1/processos/{CNJ_A}/dossie.pdf")
    assert err.value.code == "origination_document_not_found"
