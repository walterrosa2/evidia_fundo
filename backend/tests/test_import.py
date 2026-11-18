"""Importacao idempotente, versoes de snapshot, conflitos e rascunhos (AC01–AC02)."""

import copy
import threading

from evidia.adapters.origination import FixtureOriginationClient
from evidia.fixtures.origination import build_fixture
from evidia.models import ImportOperation, Opportunity, OriginSnapshot, Process, User
from evidia.services.importing import import_from_origin

BODY = {
    "external_id": "caso:1",
    "position_side": "claimant",
    "represented_party": "Autora Sintética Alfa Ltda.",
}


def count(app, model) -> int:
    with app.state.session_factory() as db:
        return db.query(model).count()


def test_ac01_importacao_simultanea_cria_uma_operacao_e_devolve_o_mesmo_id(app, analyst):
    client = FixtureOriginationClient()
    barrier = threading.Barrier(8)
    results, errors = [], []

    with app.state.session_factory() as read_db:
        user = read_db.get(User, analyst.user_id)

    def worker():
        try:
            barrier.wait(timeout=10)
            with app.state.write_session_factory() as db:
                results.append(
                    import_from_origin(
                        db,
                        user,
                        client,
                        "caso:1",
                        position_side="claimant",
                        represented_party="Autora Sintética Alfa Ltda.",
                    )
                )
        except Exception as exc:  # noqa: BLE001 - o teste precisa enxergar qualquer falha
            errors.append(exc)

    threads = [threading.Thread(target=worker) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    assert errors == []
    assert len(results) == 8
    assert len({r.opportunity_id for r in results}) == 1
    assert len({r.operation_id for r in results}) == 1
    assert sorted(r.outcome for r in results) == ["created"] + ["reused"] * 7
    assert count(app, Opportunity) == 1
    assert count(app, OriginSnapshot) == 1
    with app.state.session_factory() as db:
        op = db.query(ImportOperation).one()
        assert op.attempts == 8  # tentativas registradas


def test_reimportar_o_mesmo_snapshot_reutiliza_o_ativo(analyst, app):
    first = analyst.client.post("/api/v1/origination/imports", json=BODY).json()
    second = analyst.client.post("/api/v1/origination/imports", json=BODY).json()
    assert first["outcome"] == "created"
    assert second["outcome"] == "reused"
    assert second["opportunity_id"] == first["opportunity_id"]
    assert second["snapshot_id"] == first["snapshot_id"]
    assert second["attempts"] == 2
    assert count(app, Opportunity) == 1


def test_snapshot_novo_preserva_o_anterior_e_mostra_diferencas(analyst, app):
    first = analyst.client.post("/api/v1/origination/imports", json=BODY).json()

    data = copy.deepcopy(build_fixture())
    cnj = data["casos"][0]["processo_cnj_principal"]
    data["estudos"][cnj]["dados"]["juiz"] = "Outro Magistrado Sintético"
    app.state.origination_client = FixtureOriginationClient(data)

    second = analyst.client.post("/api/v1/origination/imports", json=BODY).json()
    assert second["outcome"] == "new_version"
    assert second["opportunity_id"] == first["opportunity_id"]
    assert second["conflicts"] == 0

    detail = analyst.client.get(f"/api/v1/opportunities/{first['opportunity_id']}").json()
    assert [s["version_no"] for s in detail["snapshots"]] == [2, 1]
    assert detail["snapshots"][1]["payload"]["judge"] == "Magistrado Sintético"
    assert [d["field"] for d in detail["snapshots"][0]["differences"]] == ["judge"]


def test_mudanca_de_parte_vira_conflito_e_nao_substituicao_silenciosa(analyst, app):
    first = analyst.client.post("/api/v1/origination/imports", json=BODY).json()

    data = copy.deepcopy(build_fixture())
    cnj = data["casos"][0]["processo_cnj_principal"]
    data["estudos"][cnj]["dados"]["autor"] = "Outra Autora Sintética Ltda."
    app.state.origination_client = FixtureOriginationClient(data)

    second = analyst.client.post("/api/v1/origination/imports", json=BODY).json()
    assert second["conflicts"] == 1
    detail = analyst.client.get(f"/api/v1/opportunities/{first['opportunity_id']}").json()
    assert detail["open_conflicts_count"] == 1
    assert detail["conflicts"][0]["field"] == "parties"
    # A parte confirmada na importacao original nao foi trocada.
    assert detail["represented_party"] == "Autora Sintética Alfa Ltda."
    assert detail["integral_opinion_allowed"] is False


def test_cnj_invalido_fica_em_rascunho_com_motivo(analyst, app):
    body = {**BODY, "external_id": "caso:3"}
    result = analyst.client.post("/api/v1/origination/imports", json=body).json()
    assert result["is_draft"] is True
    detail = analyst.client.get(f"/api/v1/opportunities/{result['opportunity_id']}").json()
    assert detail["process"]["status"] == "draft"
    assert detail["process"]["cnj"] is None
    assert "CNJ" in detail["process"]["draft_reason"]
    # Repetir nao cria segundo rascunho.
    again = analyst.client.post("/api/v1/origination/imports", json=body).json()
    assert again["opportunity_id"] == result["opportunity_id"]
    assert count(app, Process) == 1


def test_autor_e_reu_do_mesmo_processo_sao_oportunidades_distintas(analyst, app):
    a = analyst.client.post("/api/v1/origination/imports", json=BODY).json()
    b = analyst.client.post(
        "/api/v1/origination/imports",
        json={**BODY, "position_side": "defendant", "represented_party": "Ré Sintética Beta S.A."},
    ).json()
    assert a["opportunity_id"] != b["opportunity_id"]
    assert count(app, Process) == 1
    assert count(app, Opportunity) == 2


def test_ac02_so_metadados_exibe_documentacao_pendente_e_bloqueia_parecer_integral(
    analyst, opportunity
):
    detail = analyst.client.get(f"/api/v1/opportunities/{opportunity['opportunity_id']}").json()
    assert detail["has_full_record"] is False
    assert detail["integral_opinion_allowed"] is False
    assert any("Autos integrais" in b for b in detail["integral_opinion_blockers"])
    assert any("Autos integrais" in g["description"] for g in detail["missing_pieces"])
    assert detail["documents"] == []
    refs = detail["snapshots"][0]["payload"]["document_refs"]
    assert {r["category"] for r in refs} == {"derived_report"}
    assert detail["is_synthetic"] is True
    assert detail["contract_status"] == "not_defined"


def test_posicao_e_parte_sao_obrigatorias_sem_valor_padrao(analyst):
    resp = analyst.client.post("/api/v1/origination/imports", json={"external_id": "caso:1"})
    assert resp.status_code == 422
    fields = {f["field"] for f in resp.json()["error"]["details"]["fields"]}
    assert fields == {"position_side", "represented_party"}


def test_candidatos_indicam_origem_sintetica_e_o_que_ja_foi_importado(analyst, opportunity):
    body = analyst.client.get("/api/v1/origination/candidates").json()
    assert body["is_synthetic"] is True
    assert body["origin_system"] == "fixture-sintetica"
    by_id = {i["external_id"]: i for i in body["items"]}
    assert by_id["caso:1"]["already_imported_sides"] == ["claimant"]
    assert by_id["caso:3"]["cnj_valid"] is False


def test_ac22_integracao_nao_configurada_falha_sem_cair_para_demo(analyst, app):
    from evidia.adapters.origination import DisabledOriginationClient

    app.state.origination_client = DisabledOriginationClient()
    listing = analyst.client.get("/api/v1/origination/candidates")
    assert listing.status_code == 503
    assert listing.json()["error"]["code"] == "origination_not_configured"
    assert "items" not in listing.json()
    imported = analyst.client.post("/api/v1/origination/imports", json=BODY)
    assert imported.status_code == 503
    assert count(app, Opportunity) == 0


def test_provedor_indisponivel_e_falha_e_nao_ausencia_de_resultados(analyst, app):
    from evidia.adapters.origination import OriginationError

    class Down:
        system = "originacao-pipeline"
        is_synthetic = False

        def list_candidates(self):
            raise OriginationError(
                "origination_unavailable", "Originacao indisponivel.", retryable=True
            )

        def fetch(self, external_id):
            raise OriginationError(
                "origination_unavailable", "Originacao indisponivel.", retryable=True
            )

    app.state.origination_client = Down()
    resp = analyst.client.get("/api/v1/origination/candidates")
    assert resp.status_code == 503
    assert resp.json()["error"]["details"] == {"retryable": True}


# ---------------------------------------------- relatorios derivados (T005)


def test_relatorios_derivados_entram_como_documentos_sem_liberar_os_autos(
    app, analyst, outsider, actor_factory, opportunity
):
    oid = opportunity["opportunity_id"]
    url = f"/api/v1/opportunities/{oid}/origin-documents"
    viewer = actor_factory("Org Teste", "leitor-origem", "viewer")
    assert viewer.client.post(url).status_code == 403
    assert outsider.client.post(url).status_code == 404

    first = analyst.client.post(url)
    assert first.status_code == 200, first.text
    by_kind = {r["kind"]: r for r in first.json()["results"]}
    assert by_kind["dossie_pdf"]["outcome"] == "stored"
    assert set(by_kind) <= {"estudo_pdf", "dossie_pdf"}

    detail = analyst.client.get(f"/api/v1/opportunities/{oid}").json()
    derived = [d for d in detail["documents"] if d["category"] == "derived_report"]
    assert len(derived) == len([r for r in by_kind.values() if r["outcome"] == "stored"])
    assert all(d["doc_type"] == "relatorio_originacao" for d in derived)
    # Relatorio derivado nao e copia dos autos: o bloqueio continua.
    assert detail["integral_opinion_allowed"] is False
    assert any("Autos integrais" in b for b in detail["integral_opinion_blockers"])

    # Repetir nao cria fonte nova nem versao nova.
    again = analyst.client.post(url).json()
    assert {r["outcome"] for r in again["results"]} == {"duplicate"}
    assert again["dossier_version"] == first.json()["dossier_version"]


def test_origem_fora_do_ar_e_erro_e_relatorio_ausente_nao_ganha_substituto(
    app, analyst, opportunity
):
    from evidia.adapters.origination import OriginationError

    oid = opportunity["opportunity_id"]
    url = f"/api/v1/opportunities/{oid}/origin-documents"
    client = app.state.origination_client
    original = client.fetch_document

    def down(_path):
        raise OriginationError(
            "origination_unavailable", "Originação indisponível.", retryable=True
        )

    client.fetch_document = down
    try:
        resp = analyst.client.post(url)
        assert resp.status_code == 503
        assert resp.json()["error"]["code"] == "origination_unavailable"

        def missing(_path):
            raise OriginationError(
                "origination_document_not_found", "A origem não tem este relatório."
            )

        client.fetch_document = missing
        out = analyst.client.post(url).json()
        assert out["results"] and {r["outcome"] for r in out["results"]} == {"not_available"}

        client.fetch_document = lambda _path: b"<html>nao e pdf</html>"
        rejected = analyst.client.post(url).json()
        assert {r["outcome"] for r in rejected["results"]} == {"rejected"}
    finally:
        client.fetch_document = original
    docs = analyst.client.get(f"/api/v1/opportunities/{oid}").json()["documents"]
    assert [d for d in docs if d["category"] == "derived_report"] == []
