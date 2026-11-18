"""Leitura direta e somente-leitura do banco da originacao (T005).

O banco de teste e SINTETICO, com a mesma estrutura de `coletor/originacao.sqlite`.
"""

import hashlib
import sqlite3

import pytest

from evidia.adapters.origination import (
    FixtureOriginationClient,
    OriginationError,
    SqliteOriginationClient,
    normalize_snapshot,
    snapshot_hash,
)
from evidia.main import build_origination_client

CNJ_LEAD = "0000001-10.2024.8.26.0100"
CNJ_TWICE = "0000002-88.2023.8.26.0100"
CNJ_OLD = "0000003-66.2019.8.13.0024"


def make_db(path) -> None:
    db = sqlite3.connect(path)
    db.executescript(
        """
        create table consultas_processos (id text primary key, data_consulta text, usuario text,
            empresa_cnpj text, termo_busca text, filtros_json text, quantidade_processos integer,
            quantidade_cnjs integer);
        create table processos_cnjs (id integer primary key, consulta_id text, cnj text,
            tribunal text, tribunal_tipo text, status text, data_inicio text, cnj_nnnnnnn text,
            cnj_dd text, cnj_aaaa text, cnj_j text, cnj_tr text, cnj_oooo text,
            cnj_valido_estrutural integer, is_lead integer);
        """
    )
    db.executemany(
        "insert into consultas_processos (id, data_consulta, empresa_cnpj) values (?, ?, ?)",
        [
            ("q1", "2026-03-05T10:30:00", "00000000000191"),
            ("q2", "2026-08-20T09:29:00", "00000000000272"),
        ],
    )
    db.executemany(
        "insert into processos_cnjs (consulta_id, cnj, tribunal, tribunal_tipo, status, "
        "data_inicio, is_lead) values (?, ?, ?, ?, ?, ?, ?)",
        [
            ("q1", CNJ_OLD, "TJMG", "Estadual", "INATIVO", "2019-04-01", 0),
            ("q1", CNJ_TWICE, "TJSP", "Estadual", "ATIVO", "2023-02-10", 1),
            ("q2", CNJ_TWICE, "TJSP", "Estadual", "INATIVO", "2023-02-10", 0),
            ("q2", CNJ_LEAD, "TJSP", "Estadual", "ATIVO", "2024-01-15", 1),
            ("q2", "", "", "", "", "", 0),  # linha sem CNJ: ignorada
        ],
    )
    db.commit()
    db.close()


@pytest.fixture
def origin_db(tmp_path):
    path = tmp_path / "originacao.sqlite"
    make_db(path)
    return path


def test_lista_um_candidato_por_cnj_com_a_consulta_mais_recente_e_leads_primeiro(origin_db):
    client = SqliteOriginationClient(str(origin_db))
    items = client.list_candidates()
    assert [c["cnj_raw"] for c in items] == [CNJ_LEAD, CNJ_TWICE, CNJ_OLD]
    twice = items[1]
    # Vale a situacao da consulta mais recente; lead em qualquer consulta continua lead.
    assert twice["origin_status"] == "INATIVO" and twice["is_lead"] is True
    assert twice["searched_company_cnpj"] == "00000000000272"
    assert twice["external_id"] == f"cnj:{CNJ_TWICE}"
    # O banco nao guarda partes nem estudo: nada e presumido.
    assert all(
        c["claimant"] is None and c["defendant"] is None and c["has_study"] is False for c in items
    )
    assert items[2]["court"] == "TJMG" and items[2]["filing_date"] == "2019-04-01"
    assert client.is_synthetic is False and client.system == "originacao-pipeline"


def test_leitura_nao_altera_o_banco_da_originacao(origin_db):
    before = hashlib.sha256(origin_db.read_bytes()).hexdigest()
    client = SqliteOriginationClient(str(origin_db))
    client.list_candidates()
    client.fetch(f"cnj:{CNJ_LEAD}")
    assert hashlib.sha256(origin_db.read_bytes()).hexdigest() == before
    # A conexao usada e somente-leitura: escrever por ela e recusado pelo proprio SQLite.
    from urllib.parse import quote

    ro = sqlite3.connect(f"file:{quote(origin_db.as_posix())}?mode=ro", uri=True)
    with pytest.raises(sqlite3.OperationalError):
        ro.execute("delete from processos_cnjs")
    ro.close()


def test_snapshot_traz_o_cadastro_da_origem_e_declara_o_que_falta(origin_db):
    client = SqliteOriginationClient(str(origin_db))
    snapshot = normalize_snapshot(client.fetch(f"cnj:{CNJ_TWICE}"))
    assert snapshot["cnj_raw"] == CNJ_TWICE and snapshot["is_synthetic"] is False
    assert snapshot["origin_details"] == {
        "court": "TJSP",
        "court_type": "Estadual",
        "status": "INATIVO",
        "filing_date": "2023-02-10",
        "is_lead": True,
        "searched_company_cnpj": "00000000000272",
        "last_query_at": "2026-08-20T09:29:00",
        "queries": 2,
    }
    assert snapshot["parties"] == [] and snapshot["study"] is None
    assert {g["code"] for g in snapshot["gaps"]} == {
        "full_record_not_provided",
        "study_not_available",
        "parties_not_provided",
    }
    # Duas leituras do mesmo registro geram o mesmo hash.
    assert snapshot_hash(snapshot) == snapshot_hash(
        normalize_snapshot(client.fetch(f"cnj:{CNJ_TWICE}"))
    )
    # As demais origens nao ganham o campo novo: os snapshots ja gravados continuam identicos.
    fixture = normalize_snapshot(FixtureOriginationClient().fetch("caso:1"))
    assert "origin_details" not in fixture


def test_processo_inexistente_relatorio_e_banco_errado_sao_erros_proprios(origin_db, tmp_path):
    client = SqliteOriginationClient(str(origin_db))
    for bad in ("cnj:9999999-99.2099.8.26.0100", "caso:1", "qualquer"):
        with pytest.raises(OriginationError) as err:
            client.fetch(bad)
        assert err.value.code == "origination_not_found"
    with pytest.raises(OriginationError) as report:
        client.fetch_document(f"/api/v1/processos/{CNJ_LEAD}/dossie.pdf")
    assert report.value.code == "origination_document_not_found"

    with pytest.raises(OriginationError) as missing:
        SqliteOriginationClient(str(tmp_path / "nao-existe.sqlite"))
    assert missing.value.code == "origination_not_configured"

    other = tmp_path / "outro.sqlite"
    sqlite3.connect(other).execute("create table x (a)").connection.close()
    with pytest.raises(OriginationError) as shape:
        SqliteOriginationClient(str(other)).list_candidates()
    assert shape.value.code == "origination_contract_violation"

    not_db = tmp_path / "texto.sqlite"
    not_db.write_text("isto nao e um banco", encoding="utf-8")
    with pytest.raises(OriginationError) as garbage:
        SqliteOriginationClient(str(not_db)).list_candidates()
    assert garbage.value.code == "origination_contract_violation"


def test_caminho_ausente_e_erro_de_configuracao_e_nao_cai_em_dado_sintetico(settings):
    broken = settings.model_copy(update={"origination_mode": "sqlite", "origination_db_path": ""})
    client = build_origination_client(broken)
    with pytest.raises(OriginationError) as err:
        client.list_candidates()
    assert err.value.code == "origination_not_configured"
    assert not isinstance(client, FixtureOriginationClient)


def test_candidatos_do_banco_aparecem_na_api_e_sao_importados_como_dado_real(
    app, analyst, origin_db
):
    app.state.origination_client = SqliteOriginationClient(str(origin_db))
    listed = analyst.client.get("/api/v1/origination/candidates")
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body["is_synthetic"] is False and body["origin_system"] == "originacao-pipeline"
    assert [c["cnj_raw"] for c in body["items"]] == [CNJ_LEAD, CNJ_TWICE, CNJ_OLD]
    first = body["items"][0]
    assert first["is_lead"] is True and first["court"] == "TJSP" and first["cnj_valid"] is False

    imported = analyst.client.post(
        "/api/v1/origination/imports",
        json={
            "external_id": first["external_id"],
            "position_side": "claimant",
            "represented_party": "Parte informada pelo analista",
        },
    )
    assert imported.status_code in (200, 201), imported.text
    detail = analyst.client.get(f"/api/v1/opportunities/{imported.json()['opportunity_id']}").json()
    assert detail["is_synthetic"] is False
    snapshot = detail["snapshots"][0]["payload"]
    assert snapshot["origin_details"]["status"] == "ATIVO"
    assert "Partes nao informadas pela origem" in [g["description"] for g in snapshot["gaps"]]
    assert detail["integral_opinion_allowed"] is False  # sem autos, parecer integral bloqueado

    # O banco nao tem relatorios: a busca diz isso, sem inventar documento.
    reports = analyst.client.post(f"/api/v1/opportunities/{detail['id']}/origin-documents").json()
    assert {r["outcome"] for r in reports["results"]} == {"not_available"}
    again = analyst.client.get("/api/v1/origination/candidates").json()["items"][0]
    assert again["already_imported_sides"] == ["claimant"]
