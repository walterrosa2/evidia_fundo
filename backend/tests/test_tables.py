"""Tabela comum (T015): RF16–RF18, AC17 e AC19. Dados sinteticos."""

import csv
import io
import json
from dataclasses import replace

import pytest

from evidia.services import tables
from tests.conftest import make_pdf, upload

ROWS = "/api/v1/tables/opportunities/rows"
EXPORT = "/api/v1/tables/opportunities/export"
VIEWS = "/api/v1/tables/opportunities/views"


def import_case(actor, external_id: str, side: str, party: str = "Parte Sintética") -> str:
    resp = actor.client.post(
        "/api/v1/origination/imports",
        json={"external_id": external_id, "position_side": side, "represented_party": party},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["opportunity_id"]


def query(actor, **spec):
    resp = actor.client.get(ROWS, params={"q": json.dumps(spec)})
    assert resp.status_code == 200, resp.text
    return resp.json()


def parse_csv(content: bytes) -> list[list[str]]:
    text = content.decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text), delimiter=";"))


@pytest.fixture
def portfolio(analyst) -> dict[str, str]:
    """Seis oportunidades: SP autor/reu, RJ autor/reu, rascunho sem CNJ valido e MG autor."""
    ids = {
        "sp_autor": import_case(analyst, "caso:1", "claimant"),
        "sp_reu": import_case(analyst, "caso:1", "defendant"),
        "rj_autor": import_case(analyst, "caso:2", "claimant"),
        "rj_reu": import_case(analyst, "caso:2", "defendant"),
        "rascunho": import_case(analyst, "caso:3", "claimant"),
        "mg_autor": import_case(analyst, "caso:4", "claimant"),
    }
    for index in range(10):
        upload(analyst, ids["rj_autor"], make_pdf(text=f"dez {index}"), filename=f"a{index}.pdf")
    for index in range(2):
        upload(analyst, ids["sp_autor"], make_pdf(text=f"dois {index}"), filename=f"b{index}.pdf")
    return ids


def test_ac17_filtro_em_duas_colunas_ordena_o_conjunto_inteiro_em_duas_paginas(analyst, portfolio):
    spec = {
        "filters": [
            {"column": "position_side", "values": ["claimant"]},
            {"column": "process_status", "values": ["active"]},
        ],
        "sort": [{"column": "documents_count", "direction": "asc"}],
        "page_size": 2,
        "include_ids": True,
    }
    first = query(analyst, **spec, page=1)
    second = query(analyst, **spec, page=2)
    assert first["total"] == 3 and first["page_count"] == 2
    counts = [r["values"]["documents_count"] for r in first["rows"] + second["rows"]]
    # Ordem numerica no conjunto inteiro: 10 depois de 2 (alfabetica daria 0, 10, 2).
    assert counts == [0, 2, 10]
    paged_ids = [r["id"] for r in first["rows"] + second["rows"]]
    assert paged_ids == first["all_ids"]
    assert paged_ids == [portfolio["mg_autor"], portfolio["sp_autor"], portfolio["rj_autor"]]

    # Inverter a ordem nao altera a identidade do que estava selecionado.
    reversed_ids = query(
        analyst, **{**spec, "sort": [{"column": "documents_count", "direction": "desc"}]}
    )["all_ids"]
    assert set(reversed_ids) == set(paged_ids)
    assert reversed_ids == list(reversed(paged_ids))


def test_ac17_dado_novo_muda_a_versao_do_resultado(analyst, portfolio):
    spec = {"filters": [{"column": "court", "values": ["TJRJ"]}]}
    before = query(analyst, **spec)
    assert query(analyst, **spec)["result_version"] == before["result_version"]
    # Documento novo altera um registro do conjunto: selecao global antiga deixa de valer.
    upload(analyst, portfolio["rj_reu"], make_pdf(text="novo"), filename="novo.pdf")
    after = query(analyst, **spec)
    assert after["total"] == before["total"]
    assert after["result_version"] != before["result_version"]


def test_valores_da_coluna_combinam_por_ou_e_colunas_por_e(analyst, portfolio):
    courts = sorted({f["value"] for f in query(analyst)["facets"]["court"] if f["value"]})
    assert len(courts) == 3
    two_courts = query(analyst, filters=[{"column": "court", "values": courts[:2]}])
    one_court = query(analyst, filters=[{"column": "court", "values": courts[:1]}])
    assert two_courts["total"] > one_court["total"] > 0
    both = query(
        analyst,
        filters=[
            {"column": "court", "values": courts[:2]},
            {"column": "position_side", "values": ["defendant"]},
        ],
    )
    assert both["total"] < two_courts["total"]
    assert {r["values"]["position_side"] for r in both["rows"]} == {"defendant"}


def test_facetas_refletem_as_outras_colunas_e_mantem_o_valor_selecionado(analyst, portfolio):
    out = query(
        analyst,
        filters=[
            {"column": "position_side", "values": ["defendant"]},
            {"column": "court", "values": ["TJMG"]},
        ],
    )
    assert out["total"] == 0  # MG so tem autor
    court = {f["value"]: f["count"] for f in out["facets"]["court"]}
    # A faceta de tribunal ignora o proprio filtro e respeita o de posicao.
    assert court["TJSP"] == 1 and court["TJRJ"] == 1
    assert court["TJMG"] == 0  # selecionado continua visivel, com contagem zero
    side = {f["value"]: f["count"] for f in out["facets"]["position_side"]}
    assert side == {"claimant": 1, "defendant": 0}


def test_nulos_ficam_no_fim_nas_duas_direcoes_e_tem_filtro_explicito(analyst, portfolio):
    for direction in ("asc", "desc"):
        out = query(analyst, sort=[{"column": "cnj", "direction": direction}])
        assert out["rows"][-1]["id"] == portfolio["rascunho"]
        assert out["rows"][-1]["values"]["cnj"] is None
    empty = query(analyst, filters=[{"column": "cnj", "op": "empty"}])
    assert [r["id"] for r in empty["rows"]] == [portfolio["rascunho"]]
    by_null_value = query(analyst, filters=[{"column": "court", "values": [None]}])
    assert [r["id"] for r in by_null_value["rows"]] == [portfolio["rascunho"]]
    assert query(analyst, filters=[{"column": "cnj", "op": "not_empty"}])["total"] == 5


def test_operadores_por_tipo_texto_e_intervalo_numerico(analyst, portfolio):
    contains = query(analyst, filters=[{"column": "cnj", "op": "contains", "text": "8.19"}])
    assert {r["id"] for r in contains["rows"]} == {portfolio["rj_autor"], portfolio["rj_reu"]}
    between = query(
        analyst, filters=[{"column": "documents_count", "op": "between", "min": "2", "max": "9"}]
    )
    assert [r["id"] for r in between["rows"]] == [portfolio["sp_autor"]]
    today = query(analyst, filters=[{"column": "updated_at", "op": "between", "min": "2000-01-01"}])
    assert today["total"] == 6
    bad = analyst.client.get(
        ROWS,
        params={
            "q": json.dumps(
                {"filters": [{"column": "documents_count", "op": "between", "min": "muitos"}]}
            )
        },
    )
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "invalid_filter"


def test_tabela_e_exportacao_nunca_incluem_registros_de_outra_organizacao(
    analyst, outsider, portfolio
):
    assert query(outsider)["total"] == 0
    assert query(outsider, include_ids=True)["all_ids"] == []
    resp = outsider.client.post(
        EXPORT, json={"columns": ["cnj", "title"], "ids": list(portfolio.values())}
    )
    assert resp.status_code == 200
    assert len(parse_csv(resp.content)) == 1  # apenas o cabecalho


def test_exportacao_respeita_filtro_selecao_e_neutraliza_formulas(analyst, portfolio):
    injected = import_case(analyst, "caso:4", "defendant", party='=HYPERLINK("http://x";"a")')
    resp = analyst.client.post(
        EXPORT,
        json={
            "query": {"sort": [{"column": "documents_count", "direction": "desc"}]},
            "columns": ["represented_party", "documents_count", "position_side"],
            "ids": [injected, portfolio["rj_autor"]],
        },
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    table = parse_csv(resp.content)
    # Identificador minimo (CNJ) entra mesmo sem ser pedido.
    assert table[0] == ["Processo (CNJ)", "Parte Representada", "Documentos", "Posição Avaliada"]
    assert len(table) == 3
    assert table[1][2] == "10" and table[1][3] == "Autor"
    assert table[2][1].startswith("'=HYPERLINK")  # texto literal, nao formula
    assert table[2][3] == "Réu"


@pytest.fixture
def restricted_column(monkeypatch):
    """Torna 'ID na Origem' visivel apenas a administradores, para exercitar o mecanismo."""
    table = tables.TABLES["opportunities"]
    columns = tuple(
        replace(c, allowed_roles=frozenset({"admin"})) if c.key == "origin_external_id" else c
        for c in table.columns
    )
    monkeypatch.setitem(tables.TABLES, "opportunities", replace(table, columns=columns))


def test_ac19_coluna_sem_permissao_nao_sai_por_tabela_filtro_ordenacao_ou_exportacao(
    actor_factory, analyst, portfolio, restricted_column
):
    admin = actor_factory("Org A", "admin.a", "admin")
    assert "origin_external_id" in query(admin)["rows"][0]["values"]

    out = query(analyst)
    assert "origin_external_id" not in {c["key"] for c in out["columns"]}
    assert all("origin_external_id" not in r["values"] for r in out["rows"])

    attempts = [
        {"filters": [{"column": "origin_external_id", "op": "contains", "text": "caso:1"}]},
        {"sort": [{"column": "origin_external_id", "direction": "asc"}]},
    ]
    for spec in attempts:
        resp = analyst.client.get(ROWS, params={"q": json.dumps(spec)})
        assert resp.status_code == 422, spec
        assert resp.json()["error"]["code"] == "unknown_column"
    exported = analyst.client.post(EXPORT, json={"columns": ["cnj", "origin_external_id"]})
    assert exported.status_code == 422
    assert exported.json()["error"]["code"] == "unknown_column"


def test_ac19_visao_manipulada_ou_antiga_nao_devolve_coluna_proibida(
    actor_factory, analyst, portfolio, monkeypatch
):
    manipulated = {
        "columns": [
            {"key": "origin_external_id", "visible": True},
            {"key": "cnj", "visible": False},
            {"key": "coluna_inventada", "visible": True},
        ],
        "filters": [{"column": "origin_external_id", "op": "contains", "text": "caso"}],
        "sort": [{"column": "origin_external_id", "direction": "asc"}],
    }
    # Gravada enquanto a coluna era permitida.
    saved = analyst.client.post(VIEWS, json={"name": "Minha visão", "config": manipulated})
    assert saved.status_code == 200, saved.text
    kept = saved.json()["config"]
    assert [c["key"] for c in kept["columns"]] == ["origin_external_id", "cnj"]
    assert kept["columns"][1]["visible"] is True  # identificador minimo nao pode ser oculto

    # A permissao muda depois: a visao antiga e higienizada na leitura.
    table = tables.TABLES["opportunities"]
    columns = tuple(
        replace(c, allowed_roles=frozenset({"admin"})) if c.key == "origin_external_id" else c
        for c in table.columns
    )
    monkeypatch.setitem(tables.TABLES, "opportunities", replace(table, columns=columns))
    reread = analyst.client.get(VIEWS).json()[0]["config"]
    assert [c["key"] for c in reread["columns"]] == ["cnj"]
    assert reread["filters"] == [] and reread["sort"] == []

    # Visao e pessoal: outro usuario da mesma organizacao e outra organizacao nao a veem.
    colleague = actor_factory("Org A", "colega.a", "analyst")
    assert colleague.client.get(VIEWS).json() == []
    view_id = saved.json()["id"]
    assert colleague.client.delete(f"/api/v1/table-views/{view_id}").status_code == 404
    assert analyst.client.delete(f"/api/v1/table-views/{view_id}").status_code == 204
    assert analyst.client.get(VIEWS).json() == []


def test_visao_salva_reaparece_e_so_uma_e_padrao(analyst):
    config = {
        "columns": [{"key": "court", "visible": True, "width": 180}, {"key": "cnj"}],
        "sort": [{"column": "court", "direction": "desc"}],
        "page_size": 50,
    }
    first = analyst.client.post(VIEWS, json={"name": "A", "config": config, "is_default": True})
    assert first.status_code == 200
    analyst.client.post(VIEWS, json={"name": "B", "config": config, "is_default": True})
    # Salvar com o mesmo nome atualiza a visao em vez de duplicar.
    updated = analyst.client.post(
        VIEWS, json={"name": "A", "config": {**config, "page_size": 10}, "is_default": False}
    )
    assert updated.json()["id"] == first.json()["id"]
    views = {v["name"]: v for v in analyst.client.get(VIEWS).json()}
    assert set(views) == {"A", "B"}
    assert views["A"]["config"]["page_size"] == 10
    assert views["A"]["config"]["columns"][0] == {"key": "court", "visible": True, "width": 180}
    assert [v["is_default"] for v in (views["A"], views["B"])] == [False, True]


def test_tabela_desconhecida_e_consulta_malformada_tem_erro_estavel(analyst):
    assert analyst.client.get("/api/v1/tables/inexistente/rows").status_code == 404
    malformed = analyst.client.get(ROWS, params={"q": "{nao e json"})
    assert malformed.status_code == 422
    assert malformed.json()["error"]["code"] == "invalid_request"
    oversized = analyst.client.get(ROWS, params={"q": json.dumps({"page_size": 5000})})
    assert oversized.status_code == 422


def test_exportacao_do_demonstrativo_reconcilia_e_preserva_nulo_diferente_de_zero(
    analyst, outsider, opportunity
):
    run = analyst.client.post(
        f"/api/v1/opportunities/{opportunity['opportunity_id']}/calculations",
        json={
            "defendant": {
                "assumptions": {"base_date": "2026-11-16"},
                "reference_exposure": "1000000",
                "scenarios": [
                    {
                        "id": "d",
                        "label": "=Acordo",
                        "disbursement": "700000",
                        "incremental_costs": [{"label": "Custo incremental", "amount": "50000"}],
                    },
                    {"id": "p", "label": "Condenação maior", "disbursement": "1150000"},
                ],
            }
        },
    ).json()
    resp = analyst.client.get(f"/api/v1/calculations/{run['id']}/export")
    assert resp.status_code == 200
    table = parse_csv(resp.content)
    flat = {row[0]: row[1] for row in table if len(row) == 2}
    assert flat["Receita da Evidia"] == "não definido"
    assert flat["Preço"] == "não definido"
    assert flat["Exposição de referência"] == "1000000,00"
    totals = [row for row in table if len(row) == 7 and row[2] == "Resultado líquido"]
    # Mesmos numeros do resultado gravado; negativo preservado; rotulo neutralizado.
    assert [row[4] for row in totals] == ["250000,00", "-150000,00"]
    assert totals[0][0] == "'=Acordo"
    assert outsider.client.get(f"/api/v1/calculations/{run['id']}/export").status_code == 404


# ------------------------------------------------------- tabelas do dossie


def scoped(actor, table: str, opportunity_id: str, **spec):
    resp = actor.client.get(
        f"/api/v1/tables/{table}/rows",
        params={"q": json.dumps({"scope_id": opportunity_id, **spec})},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def add_claim(actor, opportunity_id: str, text: str, **fields) -> dict:
    resp = actor.client.post(
        f"/api/v1/opportunities/{opportunity_id}/claims",
        json={"text": text, "nature": "attributed_allegation", **fields},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def send(actor, opportunity_id: str, pages: int, filename: str, **form) -> dict:
    resp = upload(
        actor, opportunity_id, make_pdf(pages=pages, text=filename), filename=filename, **form
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture
def dossier_rows(analyst, opportunity) -> dict:
    """Dossie com dois documentos (um deles em duas versoes) e tres afirmacoes."""
    opp = opportunity["opportunity_id"]
    laudo = send(analyst, opp, 3, "laudo.pdf", title="Laudo")
    laudo_doc = laudo["version"]["document_id"]
    laudo_v2 = send(analyst, opp, 4, "laudo-v2.pdf", document_id=laudo_doc)
    inicial = send(
        analyst, opp, 12, "inicial.pdf", title="Petição inicial", doc_type="peticao_inicial"
    )
    cited = add_claim(
        analyst,
        opp,
        "A autora alegou atraso de 90 dias",
        asserted_by="Autora",
        document_version_id=inicial["version"]["id"],
        page_start=7,
    )
    finding = add_claim(
        analyst,
        opp,
        "O laudo registra divergência de saldo",
        nature="documentary_finding",
        document_version_id=laudo_v2["version"]["id"],
        page_start=2,
    )
    loose = add_claim(analyst, opp, "Alegação ainda sem citação")
    return {
        "opp": opp,
        "laudo_doc": laudo_doc,
        "laudo_v1": laudo["version"]["id"],
        "laudo_v2": laudo_v2["version"]["id"],
        "inicial": inicial["version"]["id"],
        "cited": cited["id"],
        "finding": finding["id"],
        "loose": loose["id"],
    }


def test_documentos_do_dossie_uma_linha_por_versao_com_ordem_filtro_e_referencia(
    analyst, dossier_rows
):
    out = scoped(analyst, "documents", dossier_rows["opp"], include_ids=True)
    assert out["total"] == 3
    # Ordem padrao: titulo crescente e, no mesmo documento, versao mais nova primeiro.
    assert out["all_ids"] == [
        dossier_rows["laudo_v2"],
        dossier_rows["laudo_v1"],
        dossier_rows["inicial"],
    ]
    first = out["rows"][0]
    assert first["refs"] == {"document_id": dossier_rows["laudo_doc"]}
    assert first["values"]["is_current"] is True and first["values"]["page_count"] == 4
    assert out["rows"][1]["values"]["is_current"] is False  # anterior continua consultavel

    current = scoped(
        analyst,
        "documents",
        dossier_rows["opp"],
        filters=[{"column": "is_current", "values": ["true"]}],
        sort=[{"column": "page_count", "direction": "desc"}],
    )
    assert [r["values"]["page_count"] for r in current["rows"]] == [12, 4]
    facets = {f["value"]: f["label"] for f in current["facets"]["doc_type"]}
    assert facets["peticao_inicial"] == "Petição inicial"
    widths = {c["key"]: c["default_width"] for c in current["columns"]}
    assert widths["title"] == 300 and widths["category"] is None


def test_afirmacoes_do_dossie_filtram_por_revisao_e_citacao_ausente(
    analyst, reviewer, dossier_rows
):
    opp = dossier_rows["opp"]
    out = scoped(analyst, "claims", opp, include_ids=True)
    # Ordem padrao: ordem de registro.
    assert out["all_ids"] == [dossier_rows["cited"], dossier_rows["finding"], dossier_rows["loose"]]
    cited = out["rows"][0]["values"]
    assert cited["document_title"] == "Petição inicial" and cited["page_start"] == 7
    assert cited["asserted_by"] == "Autora"

    without_citation = scoped(
        analyst, "claims", opp, filters=[{"column": "document_title", "op": "empty"}]
    )
    assert [r["id"] for r in without_citation["rows"]] == [dossier_rows["loose"]]

    before = scoped(analyst, "claims", opp)["result_version"]
    review = reviewer.client.post(
        f"/api/v1/claims/{dossier_rows['finding']}/reviews",
        json={"review_state": "validated", "comment": "Conferido com o laudo"},
    )
    assert review.status_code == 200, review.text
    validated = scoped(
        analyst, "claims", opp, filters=[{"column": "review_state", "values": ["validated"]}]
    )
    assert [r["id"] for r in validated["rows"]] == [dossier_rows["finding"]]
    assert scoped(analyst, "claims", opp)["result_version"] != before


def test_nova_versao_muda_a_versao_do_resultado_e_marca_afirmacao_desatualizada(
    analyst, dossier_rows
):
    opp = dossier_rows["opp"]
    spec = {"filters": [{"column": "title", "op": "equals", "text": "Laudo"}]}
    before = scoped(analyst, "documents", opp, **spec)
    send(analyst, opp, 5, "laudo-v3.pdf", document_id=dossier_rows["laudo_doc"])
    after = scoped(analyst, "documents", opp, **spec)
    assert after["total"] == before["total"] + 1
    assert after["result_version"] != before["result_version"]
    stale = scoped(analyst, "claims", opp, filters=[{"column": "stale", "values": ["true"]}])
    assert [r["id"] for r in stale["rows"]] == [dossier_rows["finding"]]


def test_tabela_do_dossie_exige_escopo_e_nao_vaza_entre_organizacoes(
    analyst, outsider, dossier_rows
):
    opp = dossier_rows["opp"]
    for table in ("documents", "claims"):
        missing = analyst.client.get(f"/api/v1/tables/{table}/rows")
        assert missing.status_code == 422
        assert missing.json()["error"]["code"] == "scope_required"
        # Oportunidade de outra organizacao responde como inexistente, na tabela e no CSV.
        foreign = outsider.client.get(
            f"/api/v1/tables/{table}/rows", params={"q": json.dumps({"scope_id": opp})}
        )
        assert foreign.status_code == 404
        exported = outsider.client.post(
            f"/api/v1/tables/{table}/export",
            json={"query": {"scope_id": opp}, "columns": ["title"]},
        )
        assert exported.status_code == 404
    unscoped = analyst.client.get(ROWS, params={"q": json.dumps({"scope_id": opp})})
    assert unscoped.status_code == 422

    # Outro dossie da mesma organizacao nao mistura registros.
    other = import_case(analyst, "caso:2", "defendant")
    assert scoped(analyst, "documents", other)["total"] == 0
    assert scoped(analyst, "claims", other)["unfiltered_total"] == 0


def test_exportacao_das_tabelas_do_dossie_respeita_filtro_e_selecao(analyst, dossier_rows):
    opp = dossier_rows["opp"]
    injected = add_claim(analyst, opp, "=SOMA(A1:A9)", asserted_by="@parte")
    resp = analyst.client.post(
        "/api/v1/tables/claims/export",
        json={
            "query": {"scope_id": opp},
            "columns": ["nature", "asserted_by", "page_start"],
            "ids": [injected["id"], dossier_rows["cited"]],
        },
    )
    assert resp.status_code == 200, resp.text
    table = parse_csv(resp.content)
    assert table[0] == ["Afirmação", "Natureza", "Quem Afirma", "Página"]
    assert table[1] == ["A autora alegou atraso de 90 dias", "Alegação atribuída", "Autora", "7"]
    assert table[2][0] == "'=SOMA(A1:A9)" and table[2][2] == "'@parte"

    docs = analyst.client.post(
        "/api/v1/tables/documents/export",
        json={
            "query": {
                "scope_id": opp,
                "filters": [{"column": "is_current", "values": ["false"]}],
            },
            "columns": ["version_no", "is_current", "page_count"],
        },
    )
    assert parse_csv(docs.content) == [
        ["Documento", "Versão", "Vigência", "Páginas"],
        ["Laudo", "1", "Anterior", "3"],
    ]


# ------------------------------------------------- lacunas, calculos e lote


def _rows(actor, table: str, scope: str, **query):
    import json as _json

    resp = actor.client.get(
        f"/api/v1/tables/{table}/rows", params={"q": _json.dumps({"scope_id": scope, **query})}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_lacunas_e_cenarios_de_calculo_na_tabela_comum(analyst, outsider, opportunity):
    oid = opportunity["opportunity_id"]
    gaps = _rows(analyst, "missing_pieces", oid)
    assert gaps["total"] >= 1  # a importacao declara a falta dos autos
    assert {c["key"] for c in gaps["columns"]} >= {"description", "status", "source"}
    assert all(row["values"]["status"] == "open" for row in gaps["rows"])

    analyst.client.post(
        f"/api/v1/opportunities/{oid}/calculations",
        json={
            "defendant": {
                "assumptions": {"base_date": "2026-11-16"},
                "reference_exposure": "1000000",
                "scenarios": [
                    {"id": "a", "label": "Acordo", "disbursement": "700000"},
                    {"id": "b", "label": "Condenação", "disbursement": "1200000"},
                ],
            }
        },
    )
    calc = _rows(
        analyst,
        "calculation_scenarios",
        oid,
        sort=[{"column": "net_result", "direction": "desc"}],
    )
    # Dinheiro trafega como texto decimal e ordena por valor, nao por texto.
    assert [r["values"]["net_result"] for r in calc["rows"]] == ["300000.00", "-200000.00"]
    assert {c["key"]: c["kind"] for c in calc["columns"]}["net_result"] == "money"
    negative = _rows(
        analyst,
        "calculation_scenarios",
        oid,
        filters=[{"column": "net_result", "op": "between", "max": "0"}],
    )
    assert [r["values"]["scenario"] for r in negative["rows"]] == ["Condenação"]
    assert calc["rows"][0]["refs"]["detail"].endswith(":defendant:a")

    # Escopo e organizacao continuam valendo nas tabelas novas.
    import json as _json

    for table in ("missing_pieces", "calculation_scenarios"):
        denied = outsider.client.get(
            f"/api/v1/tables/{table}/rows", params={"q": _json.dumps({"scope_id": oid})}
        )
        assert denied.status_code == 404

    exported = analyst.client.post(
        "/api/v1/tables/calculation_scenarios/export",
        json={"query": {"scope_id": oid}, "columns": ["scenario", "net_result"], "ids": None},
    )
    assert exported.status_code == 200, exported.text
    assert "300000,00" in exported.content.decode("utf-8-sig")


def test_acao_em_massa_encaminha_so_pendentes_e_registra_historico(
    analyst, reviewer, outsider, actor_factory, opportunity
):
    oid = opportunity["opportunity_id"]

    def claim(text):
        return analyst.client.post(
            f"/api/v1/opportunities/{oid}/claims",
            json={"text": text, "nature": "attributed_allegation"},
        ).json()

    first, second, third = (
        claim("Primeira alegação."),
        claim("Segunda alegação."),
        claim("Terceira."),
    )
    reviewer.client.post(
        f"/api/v1/claims/{third['id']}/reviews", json={"review_state": "discarded", "comment": "x"}
    )
    url = f"/api/v1/opportunities/{oid}/claims/bulk-review"
    body = {
        "ids": [first["id"], second["id"], third["id"], "nao-existe", first["id"]],
        "review_state": "in_review",
    }

    viewer = actor_factory("Org Teste", "leitor", "viewer")
    assert viewer.client.post(url, json=body).status_code == 403
    assert outsider.client.post(url, json=body).status_code == 404
    # Validar em massa nao existe: exige fundamento e conferencia por linha.
    invalid = analyst.client.post(url, json={**body, "review_state": "validated"})
    assert invalid.status_code == 422

    done = analyst.client.post(url, json=body)
    assert done.status_code == 200, done.text
    assert done.json()["updated"] == 2
    assert sorted((s["id"], s["reason"]) for s in done.json()["skipped"]) == sorted(
        [(third["id"], "not_pending"), ("nao-existe", "not_found")]
    )
    claims = {c["id"]: c for c in analyst.client.get(f"/api/v1/opportunities/{oid}/claims").json()}
    assert claims[first["id"]]["review_state"] == "in_review"
    assert claims[third["id"]]["review_state"] == "discarded"
    history = claims[first["id"]]["reviews"]
    assert len(history) == 1 and history[0]["comment"] == "Encaminhada para revisão em lote."

    # Repetir nao altera de novo nem duplica historico.
    again = analyst.client.post(url, json=body).json()
    assert again["updated"] == 0


# ------------------------------------------------ politica de colunas por papel


def test_politica_padrao_esconde_do_leitor_identificadores_tecnicos_e_de_integridade(
    actor_factory, analyst, portfolio
):
    viewer = actor_factory("Org A", "leitor.a", "viewer")
    seen = {c["key"] for c in query(viewer)["columns"]}
    assert "origin_external_id" not in seen and "cnj" in seen
    assert "origin_external_id" in {c["key"] for c in query(analyst)["columns"]}
    # Pedir a coluna por filtro, ordenacao ou exportacao responde como coluna inexistente.
    resp = viewer.client.get(
        ROWS, params={"q": json.dumps({"sort": [{"column": "origin_external_id"}]})}
    )
    assert resp.status_code == 422 and resp.json()["error"]["code"] == "unknown_column"
    exported = viewer.client.post(EXPORT, json={"columns": ["cnj", "origin_external_id"]})
    assert exported.status_code == 422


def test_politica_e_configuravel_e_configuracao_errada_impede_a_subida(settings):
    from evidia.main import create_app

    try:
        tables.configure_column_policy({"opportunities.origin_external_id": ["*"]})
        assert (
            tables.column_roles(
                tables.OPPORTUNITIES,
                next(c for c in tables.OPPORTUNITIES.columns if c.key == "origin_external_id"),
            )
            == tables.ALL_ROLES
        )
        tables.configure_column_policy({"claims.asserted_by": ["admin", "reviewer"]})
        assert tables._column_policy["claims.asserted_by"] == frozenset({"admin", "reviewer"})
        # O padrao continua valendo para o que nao foi ajustado.
        assert tables._column_policy["documents.sha256"] == tables.STAFF_ROLES

        for bad in (
            {"opportunities.inexistente": ["admin"]},
            {"tabela_inexistente.cnj": ["admin"]},
            {"documents.sha256": ["chefe"]},
            {"documents.sha256": []},
            {"documents.title": ["admin"]},  # identifica o registro: nao pode ser restrita
        ):
            with pytest.raises(ValueError, match="EVIDIA_COLUMN_POLICY"):
                tables.configure_column_policy(bad)
        broken = settings.model_copy(update={"column_policy": {"documents.sha256": ["chefe"]}})
        with pytest.raises(ValueError, match="EVIDIA_COLUMN_POLICY"):
            create_app(broken)
    finally:
        tables.configure_column_policy(None)


# ------------------------------------------------------------ ajuda das colunas


def test_toda_coluna_de_toda_tabela_tem_ajuda_no_formato_do_guia_editorial():
    from evidia.services.table_help import COLUMN_HELP, help_for

    for key, table in tables.TABLES.items():
        known = {c.key for c in table.columns}
        # Ajuda escrita para coluna que nao existe mais e texto morto.
        assert set(COLUMN_HELP[key]) == known, (key, set(COLUMN_HELP[key]) ^ known)
        for column in table.columns:
            text = help_for(key, column.key)
            lines = text.splitlines()
            assert [line.split(":")[0] for line in lines] == [
                "O que é",
                "Como é calculado",
                "Como ler",
            ], (key, column.key)
            assert all(len(line.split(": ", 1)[1]) >= 15 for line in lines), (key, column.key)
            assert len(text) <= 520, (key, column.key, len(text))
            # Guia editorial: terceira pessoa, sem instrucao de navegacao.
            lowered = text.casefold()
            assert not any(w in lowered for w in ("você", "seu ", "sua ", "clique", "abra ")), (
                key,
                column.key,
            )


def test_ajuda_da_coluna_chega_a_tela_pela_api(analyst, portfolio):
    by_key = {c["key"]: c for c in query(analyst)["columns"]}
    assert by_key["position_side"]["help"].startswith("O que é: Lado do processo")
    assert "Como ler:" in by_key["has_full_record"]["help"]
