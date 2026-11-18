"""Adaptador do Nulidade360 (T008): RF04, AC05, AC06 e AC20.

O motor e substituido por um duble que devolve respostas no formato real do servico
(conferido contra o Nulidade360 em modo simulado). Nenhum provedor pago e chamado.
"""

from datetime import timedelta

import httpx
import pytest

from evidia.adapters.nulidade360 import (
    HttpNulidade360Client,
    Nulidade360Error,
    normalize_analysis,
)
from evidia.models import EngineRun, utcnow
from tests.conftest import make_pdf, upload

MOCK_NOTE = "Resposta gerada por MOCK_AI para QA deterministico."


def block(name: str, *, mock: bool = True, **extra) -> dict:
    return {
        "block_name": name,
        "block_score": 8.0,
        "confidence": 0.7,
        "block_summary": "resumo",
        "block_risk_level": "baixo",
        "processing_notes": [MOCK_NOTE] if mock else ["nota do motor"],
        **extra,
    }


def finding(external_id: int, *, file_name: str, page: int | None, **extra) -> dict:
    return {
        "id": external_id,
        "block_id": "P5",
        "block_name": "Nulidades Periciais",
        "question": f"Pergunta sintética {external_id}?",
        "inference": "Inferência sintética.",
        "procedural_impact": "Impacto sintético.",
        "evidence_strength": "moderada",
        "risk_score": 74.0,
        # Trecho presente nos textos sinteticos dos testes (laudo e PDF de teste).
        "evidences": [
            {"document_id": "1", "file_name": file_name, "page": page, "excerpt": "sint"}
        ],
        "human_status": "suggested",
        **extra,
    }


def analysis(status: str = "completed", **extra) -> dict:
    return {
        "id": 1,
        "status": status,
        "checkpoint": {"status": "valid", "analysis_model": "mock-sem-provedor"},
        "overall_score": 98.39,
        "overall_risk_level": "critico",
        "blocks_meta": {"P1": block("Competência"), "P5": block("Nulidades Periciais")},
        "failed_blocks": [],
        "risk_summary": {},
        "findings": [finding(1, file_name="processo_recorte_real.txt", page=None)],
        **extra,
    }


class FakeNulidade:
    def __init__(self) -> None:
        self.cases: list[dict] = []
        self.started: list[str] = []
        self.analyses: list[dict] = []
        self.down = False
        self.listed = 0
        self.evidence_maps: list[tuple[str, str, int]] = []
        self.reject_evidence_map = False
        self.report: bytes | None = None

    def _check(self) -> None:
        if self.down:
            raise Nulidade360Error(
                "nulidade360_unavailable", "Nulidade360 indisponível.", status=503, retryable=True
            )

    def engine_info(self) -> dict:
        self._check()
        return {"taxonomy_version": "v3.0", "checklist_version": "v3.0", "model": "mock-x"}

    def create_case(self, **kwargs) -> str:
        self._check()
        self.cases.append(kwargs)
        return str(len(self.cases))

    def start_analysis(self, case_ref: str) -> None:
        self._check()
        self.started.append(case_ref)

    def list_analyses(self, case_ref: str) -> list[dict]:
        self._check()
        self.listed += 1
        return self.analyses

    def send_evidence_map(self, case_ref: str, filename: str, content: bytes) -> dict:
        self._check()
        if self.reject_evidence_map:
            raise Nulidade360Error(
                "nulidade360_evidence_map_rejected", "Planilha recusada.", status=422
            )
        self.evidence_maps.append((case_ref, filename, len(content)))
        return {"total_items": 7, "run_id": "sintetico"}

    def fetch_report(self, case_ref: str) -> bytes:
        self._check()
        if self.report is None:
            raise Nulidade360Error(
                "nulidade360_report_unavailable", "Sem relatório no motor.", status=409
            )
        return self.report


@pytest.fixture
def engine(app) -> FakeNulidade:
    fake = FakeNulidade()
    app.state.settings.nulidade360_mode = "mock"
    app.state.nulidade360_client = fake
    return fake


def send_text(actor, opp: str, filename: str = "laudo.txt", text: str = "Laudo sintético.") -> dict:
    resp = upload(actor, opp, text.encode(), filename=filename, title="Laudo")
    assert resp.status_code == 200, resp.text
    return resp.json()


def start(actor, opp: str, version_id: str, side: str = "claimant"):
    return actor.client.post(
        f"/api/v1/opportunities/{opp}/engine-runs",
        json={"engine": "nulidade360", "document_version_id": version_id, "simulated_side": side},
    )


def refresh(actor, run_id: str):
    return actor.client.post(f"/api/v1/engine-runs/{run_id}/refresh")


@pytest.fixture
def ready(analyst, opportunity, engine) -> dict:
    opp = opportunity["opportunity_id"]
    doc = send_text(analyst, opp)
    return {"opp": opp, "version": doc["version"]["id"], "document": doc["version"]["document_id"]}


def test_rf04_posicao_e_enviada_de_forma_explicita_e_a_execucao_fica_registrada(
    analyst, engine, ready
):
    resp = start(analyst, ready["opp"], ready["version"], side="claimant")
    assert resp.status_code == 201, resp.text
    run = resp.json()
    assert run["status"] == "running" and run["simulated_side"] == "claimant"
    assert run["side_confirmed_by"] == analyst.user_id
    assert run["document_version_ids"] == [ready["version"]] and len(run["input_hash"]) == 64
    assert run["checklist_version"] == "v3.0" and run["external_ref"] == "1"
    # Custo desconhecido e nulo; nada e presumido.
    assert run["cost_amount"] is None
    sent = engine.cases[0]
    # Autor vira "Polo Ativo": o padrao silencioso do motor ("Polo Passivo") nao e usado.
    assert sent["position_label"] == "Polo Ativo"
    assert sent["filename"] == "laudo.txt" and sent["content"] == "Laudo sintético.".encode()
    assert engine.started == ["1"]

    defendant = start(analyst, ready["opp"], ready["version"], side="defendant").json()
    assert defendant["id"] != run["id"] and engine.cases[1]["position_label"] == "Polo Passivo"


def test_lado_simulado_e_obrigatorio_e_o_pedido_respeita_papel_e_organizacao(
    analyst, outsider, actor_factory, engine, ready
):
    url = f"/api/v1/opportunities/{ready['opp']}/engine-runs"
    body = {"engine": "nulidade360", "document_version_id": ready["version"]}
    assert analyst.client.post(url, json=body).status_code == 422
    assert (
        analyst.client.post(url, json={**body, "simulated_side": "Polo Passivo"}).status_code == 422
    )
    viewer = actor_factory("Org A", "leitor.a", "viewer")
    assert start(viewer, ready["opp"], ready["version"]).status_code == 403
    assert start(outsider, ready["opp"], ready["version"]).status_code == 404
    assert engine.cases == []  # nada saiu para o motor

    run = start(analyst, ready["opp"], ready["version"]).json()
    assert refresh(outsider, run["id"]).status_code == 404
    assert outsider.client.get(f"/api/v1/engine-runs/{run['id']}/findings").status_code == 404
    assert outsider.client.get(url).status_code == 404


def test_ac05_achado_sem_citacao_resolvivel_fica_pendente_e_o_original_e_preservado(
    analyst, engine, ready
):
    run = start(analyst, ready["opp"], ready["version"]).json()
    engine.analyses = [analysis()]
    done = refresh(analyst, run["id"]).json()
    assert done["status"] == "completed" and done["engine_status"] == "completed"
    assert done["is_mock"] is True and done["findings_count"] == 1
    assert done["overall_risk_index"] == "98.39"
    assert any("modo simulado" in text for text in done["limitations"])

    findings = analyst.client.get(f"/api/v1/engine-runs/{run['id']}/findings").json()
    item = findings[0]
    # O motor atribuiu a evidencia a outro arquivo e nao informou pagina.
    assert item["citations"] == []
    assert [p["code"] for p in item["pendencies"]] == ["evidence_pending", "citation_unresolved"]
    assert item["review_state"] == "pending"
    assert item["risk_index"] == "74.0" and item["support_strength"] == "moderate"
    assert item["original"]["evidences"][0]["file_name"] == "processo_recorte_real.txt"
    assert item["original"]["human_status"] == "suggested"


def test_ac06_bloco_falho_mantem_parcial_mesmo_com_rotulo_concluido_do_motor(
    analyst, engine, ready
):
    run = start(analyst, ready["opp"], ready["version"]).json()
    engine.analyses = [
        analysis(
            status="completed",
            blocks_meta={
                "P1": block("Competência"),
                "P5": block("Nulidades Periciais", status="failed", error_type="quota"),
                "P6": block("Contraditório", status="skipped"),
            },
            failed_blocks=[
                {"block_id": "P5", "block_name": "Nulidades Periciais", "error": "cota esgotada"}
            ],
        )
    ]
    out = refresh(analyst, run["id"]).json()
    assert out["status"] == "partial" and out["engine_status"] == "completed"
    assert {b["key"]: b["status"] for b in out["blocks"]} == {
        "P1": "completed",
        "P5": "failed",
        "P6": "skipped",
    }
    assert next(b for b in out["blocks"] if b["key"] == "P5")["message"] == "cota esgotada"
    # Indice global do motor nao e exibido quando a auditoria nao ficou completa.
    assert out["overall_risk_index"] is None
    text = " ".join(out["limitations"])
    assert "P5" in text and "P6" in text and "parecer integral permanece indisponível" in text


def test_ac20_repetir_o_pedido_e_a_reconciliacao_nao_duplicam_envio_nem_achado(
    analyst, engine, ready
):
    first = start(analyst, ready["opp"], ready["version"])
    again = start(analyst, ready["opp"], ready["version"])
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json()["id"] == first.json()["id"]
    assert len(engine.cases) == 1 and engine.started == ["1"]

    engine.analyses = [
        analysis(
            findings=[
                finding(1, file_name="laudo.txt", page=None),
                finding(2, file_name="laudo.txt", page=None),
            ]
        )
    ]
    run_id = first.json()["id"]
    assert refresh(analyst, run_id).json()["findings_count"] == 2
    calls = engine.listed
    # Execucao encerrada nao volta a consultar o motor nem regrava achados.
    assert refresh(analyst, run_id).json()["findings_count"] == 2
    assert engine.listed == calls
    assert start(analyst, ready["opp"], ready["version"]).status_code == 200
    assert len(engine.cases) == 1


def test_pdf_nao_e_enviado_em_modo_simulado_porque_geraria_custo(analyst, opportunity, engine):
    opp = opportunity["opportunity_id"]
    pdf = upload(analyst, opp, make_pdf(pages=2), filename="laudo.pdf").json()
    resp = start(analyst, opp, pdf["version"]["id"])
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "engine_requires_paid_run"
    assert engine.cases == []
    assert analyst.client.get(f"/api/v1/opportunities/{opp}/engine-runs").json() == []


def test_motor_fora_do_ar_e_erro_tipado_sem_resultado_presumido_e_nova_tentativa_e_vinculada(
    analyst, engine, ready
):
    engine.down = True
    resp = start(analyst, ready["opp"], ready["version"])
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "nulidade360_unavailable"
    runs = analyst.client.get(f"/api/v1/opportunities/{ready['opp']}/engine-runs").json()
    assert [(r["status"], r["attempts"], r["findings_count"]) for r in runs] == [("failed", 1, 0)]

    engine.down = False
    retry = start(analyst, ready["opp"], ready["version"])
    assert retry.status_code == 201
    assert retry.json()["id"] == runs[0]["id"] and retry.json()["attempts"] == 2
    assert retry.json()["status"] == "running"

    # Indisponibilidade durante a consulta nao encerra a execucao nem inventa estado.
    engine.down = True
    assert refresh(analyst, runs[0]["id"]).status_code == 503
    engine.down = False
    assert refresh(analyst, runs[0]["id"]).json()["status"] == "running"


def test_ac20_execucao_interrompida_antes_do_motor_confirmar_fica_irreconciliavel(
    app, analyst, engine, ready
):
    with app.state.write_session_factory() as db:
        run = EngineRun(
            organization_id=analyst.organization_id,
            opportunity_id=ready["opp"],
            engine="nulidade360",
            status="queued",
            dossier_version=1,
            input_hash="0" * 64,
            idempotency_key="chave-de-teste",
            document_version_id=ready["version"],
            sent_filename="laudo.txt",
            simulated_side="defendant",
            side_confirmed_by=analyst.user_id,
            created_by=analyst.user_id,
            created_at=utcnow() - timedelta(minutes=10),
            is_mock=True,
        )
        db.add(run)
        db.commit()
        run_id = run.id
    out = refresh(analyst, run_id).json()
    assert out["status"] == "failed"
    assert "não foi reenviada automaticamente" in out["limitations"][0]
    assert engine.cases == [] and engine.listed == 0  # nada foi reenviado


def test_sem_registro_no_motor_segue_em_andamento_ate_o_prazo_e_depois_falha_sem_presumir(
    app, analyst, engine, ready
):
    run_id = start(analyst, ready["opp"], ready["version"]).json()["id"]
    assert refresh(analyst, run_id).json()["status"] == "running"
    engine.analyses = [{"id": 1, "status": "processing"}]
    assert refresh(analyst, run_id).json()["status"] == "running"
    engine.analyses = []
    with app.state.write_session_factory() as db:
        db.get(EngineRun, run_id).deadline_at = utcnow() - timedelta(minutes=1)
        db.commit()
    out = refresh(analyst, run_id).json()
    assert out["status"] == "failed" and out["findings_count"] == 0
    assert "Estado remoto desconhecido" in out["limitations"][0]


def test_rf04_documento_novo_deixa_a_execucao_desatualizada_e_versao_antiga_e_recusada(
    analyst, engine, ready
):
    run_id = start(analyst, ready["opp"], ready["version"]).json()["id"]
    engine.analyses = [analysis()]
    assert refresh(analyst, run_id).json()["stale"] is False
    newer = upload(
        analyst, ready["opp"], b"Laudo v2.", filename="laudo-v2.txt", document_id=ready["document"]
    ).json()
    runs = analyst.client.get(f"/api/v1/opportunities/{ready['opp']}/engine-runs").json()
    assert runs[0]["stale"] is True and runs[0]["status"] == "completed"  # segue consultável
    old = start(analyst, ready["opp"], ready["version"])
    assert old.status_code == 409
    assert old.json()["error"]["code"] == "document_version_not_current"
    # A versao vigente gera execucao nova (outro documento, outra versao do dossie).
    fresh = start(analyst, ready["opp"], newer["version"]["id"])
    assert fresh.status_code == 201 and fresh.json()["id"] != run_id


def test_motor_que_nao_declara_modo_simulado_gera_alerta_e_nao_e_marcado_como_simulado(
    analyst, engine, ready
):
    run_id = start(analyst, ready["opp"], ready["version"]).json()["id"]
    engine.analyses = [analysis(blocks_meta={"P1": block("Competência", mock=False)})]
    out = refresh(analyst, run_id).json()
    assert out["is_mock"] is False
    assert any("consumo de API paga" in text for text in out["limitations"])


def test_integracao_desligada_responde_erro_de_configuracao(app, analyst, ready):
    app.state.settings.nulidade360_mode = "disabled"
    resp = start(analyst, ready["opp"], ready["version"])
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "nulidade360_not_configured"


def test_resposta_fora_do_contrato_e_violacao_e_nao_sucesso(analyst, engine, ready):
    run_id = start(analyst, ready["opp"], ready["version"]).json()["id"]
    for bad in (
        analysis(status="done"),
        analysis(blocks_meta={"P1": block("x", status="talvez")}),
        {"id": 1, "status": "completed", "blocks_meta": {}},  # sem a lista de achados
    ):
        engine.analyses = [bad]
        resp = refresh(analyst, run_id)
        assert resp.status_code == 502, bad
        assert resp.json()["error"]["code"] == "nulidade360_contract_violation"
    runs = analyst.client.get(f"/api/v1/opportunities/{ready['opp']}/engine-runs").json()
    assert runs[0]["status"] == "running" and runs[0]["findings_count"] == 0


def test_normalizacao_aceita_citacao_com_pagina_do_arquivo_enviado():
    raw = analysis(
        findings=[
            finding(1, file_name="laudo.pdf", page=3),
            finding(2, file_name="laudo.pdf", page=40),
            finding(3, file_name="laudo.pdf", page=None, evidence_strength="forte"),
        ]
    )
    out = normalize_analysis(
        raw, sent_filename="laudo.pdf", document_version_id="v1", page_count=12
    )
    cited, out_of_range, no_page = out.findings
    assert [c.page_start for c in cited.citations] == [3] and cited.pendencies == []
    assert [p.code for p in out_of_range.pendencies] == ["evidence_pending", "page_out_of_range"]
    assert [p.code for p in no_page.pendencies] == ["evidence_pending"]
    assert no_page.support_strength == "strong"
    # Erro do motor sem blocos: falha registrada, nada completado.
    failed = normalize_analysis(
        {"id": 2, "status": "error", "findings": []},
        sent_filename="laudo.pdf",
        document_version_id="v1",
        page_count=12,
    )
    assert failed.status == "failed" and failed.overall_risk_index is None


def test_cliente_http_envia_posicao_explicita_e_traduz_falhas():
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/cases":
            seen["body"] = request.read().decode("utf-8", errors="replace")
            return httpx.Response(200, json={"message": "ok", "case_id": 7})
        if request.url.path == "/api/cases/7/analyze":
            return httpx.Response(200, json={"message": "Análise iniciada"})
        if request.url.path == "/api/cases/7/analyses":
            return httpx.Response(200, json=[{"id": 1, "status": "processing"}])
        if request.url.path == "/api/cases/8/analyses":
            return httpx.Response(200, text="<html>", headers={"content-type": "text/html"})
        if request.url.path == "/api/cases/9/analyses":
            raise httpx.ReadTimeout("tempo esgotado", request=request)
        return httpx.Response(404, json={"detail": "Caso não encontrado"})

    client = HttpNulidade360Client("http://motor.local", transport=httpx.MockTransport(handler))
    ref = client.create_case(
        name="Caso",
        process_number="",
        represented_party="Parte Sintética",
        position_label="Polo Ativo",
        filename="laudo.txt",
        content=b"texto",
    )
    assert ref == "7"
    assert 'name="posicao_processual"' in seen["body"] and "Polo Ativo" in seen["body"]
    client.start_analysis("7")
    assert client.list_analyses("7")[0]["status"] == "processing"
    for case_ref, code in (
        ("8", "nulidade360_contract_violation"),
        ("9", "nulidade360_timeout"),
        ("10", "nulidade360_not_found"),
    ):
        with pytest.raises(Nulidade360Error) as caught:
            client.list_analyses(case_ref)
        assert caught.value.code == code
    with pytest.raises(Nulidade360Error):
        HttpNulidade360Client("  ")


# --------------------------------------------------------- revisao de achado


def review(actor, finding_id: str, **body):
    return actor.client.post(f"/api/v1/engine-findings/{finding_id}/reviews", json=body)


def finished(analyst, engine, ready, **changes) -> dict:
    """Execucao concluida com um achado; devolve o achado normalizado."""
    run_id = start(analyst, ready["opp"], ready["version"]).json()["id"]
    engine.analyses = [analysis(**changes)]
    assert refresh(analyst, run_id).status_code == 200
    item = analyst.client.get(f"/api/v1/engine-runs/{run_id}/findings").json()[0]
    return {"run": run_id, "finding": item}


def real_blocks() -> dict:
    """Blocos sem a nota de modo simulado: o motor nao declarou execucao de teste."""
    return {"P5": block("Nulidades Periciais", mock=False)}


def test_achado_de_execucao_simulada_pode_ser_descartado_mas_nunca_validado(
    analyst, reviewer, outsider, engine, ready
):
    out = finished(analyst, engine, ready)
    finding_id = out["finding"]["id"]
    assert {b["code"] for b in out["finding"]["validation_blockers"]} == {
        "evidence_pending",
        "citation_unresolved",
        "mock_run",
    }
    blocked = review(reviewer, finding_id, review_state="validated", comment="Conferido.")
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "validation_blocked"
    codes = {b["code"] for b in blocked.json()["error"]["details"]["blockers"]}
    assert "mock_run" in codes and "evidence_pending" in codes

    # Revisao e do papel de revisor, dentro da organizacao.
    assert review(analyst, finding_id, review_state="discarded", comment="x y z").status_code == 403
    assert (
        review(outsider, finding_id, review_state="discarded", comment="x y z").status_code == 404
    )
    no_reason = review(reviewer, finding_id, review_state="discarded")
    assert no_reason.status_code == 422
    assert no_reason.json()["error"]["code"] == "review_reason_required"

    done = review(reviewer, finding_id, review_state="discarded", comment="Dado de teste do motor.")
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["review_state"] == "discarded"
    entry = body["reviews"][0]
    assert entry["before"]["review_state"] == "pending"
    assert entry["after"]["review_state"] == "discarded"
    assert (
        entry["comment"] == "Dado de teste do motor." and entry["reviewer_id"] == reviewer.user_id
    )
    # A saida original do motor continua intacta depois da revisao.
    assert body["original"] == out["finding"]["original"]


def test_ac05_citacao_do_revisor_resolve_a_pendencia_e_permite_validar(
    analyst, reviewer, engine, ready
):
    out = finished(analyst, engine, ready, blocks_meta=real_blocks())
    finding_id = out["finding"]["id"]
    assert [b["code"] for b in out["finding"]["validation_blockers"]] == [
        "evidence_pending",
        "citation_unresolved",
    ]
    assert (
        review(reviewer, finding_id, review_state="validated", comment="Sem página.").status_code
        == 409
    )

    pdf = upload(analyst, ready["opp"], make_pdf(pages=2), filename="anexo.pdf").json()
    cite = {"document_version_id": pdf["version"]["id"], "page_start": 5}
    out_of_range = review(reviewer, finding_id, citation=cite)
    assert out_of_range.status_code == 422
    assert out_of_range.json()["error"]["code"] == "invalid_citation"
    foreign = review(
        reviewer, finding_id, citation={"document_version_id": "nao-existe", "page_start": 1}
    )
    assert foreign.status_code == 422

    cited = review(reviewer, finding_id, citation={**cite, "page_start": 2})
    assert cited.status_code == 200, cited.text
    body = cited.json()
    assert body["pendencies"] == []
    assert body["citations"] == [
        {
            "document_version_id": pdf["version"]["id"],
            "page_start": 2,
            "page_end": None,
            "excerpt": "",
            "source": "review",
        }
    ]
    # O documento novo deixou a execucao desatualizada: validar segue bloqueado por isso.
    assert [b["code"] for b in body["validation_blockers"]] == ["stale_run"]
    stale = review(reviewer, finding_id, review_state="validated", comment="Conferido na página 2.")
    assert stale.status_code == 409
    assert [b["code"] for b in stale.json()["error"]["details"]["blockers"]] == ["stale_run"]
    # O historico guarda as pendencias do motor que a citacao do revisor substituiu.
    before = body["reviews"][-1]["before"]["pendencies"]
    assert [p["code"] for p in before] == ["evidence_pending", "citation_unresolved"]


def test_achado_com_citacao_valida_de_execucao_atual_pode_ser_validado_com_fundamento(
    analyst, reviewer, engine, ready
):
    out = finished(
        analyst,
        engine,
        ready,
        blocks_meta=real_blocks(),
        findings=[finding(1, file_name="laudo.txt", page=1)],
    )
    item = out["finding"]
    assert item["validation_blockers"] == [] and item["citations"][0]["source"] == "engine"
    assert review(reviewer, item["id"], review_state="validated").status_code == 422
    ok = review(reviewer, item["id"], review_state="validated", comment="Conferido na página 1.")
    assert ok.status_code == 200, ok.text
    assert ok.json()["review_state"] == "validated"
    again = review(reviewer, item["id"], review_state="contested", comment="Impugnado pela ré.")
    assert [r["after"]["review_state"] for r in again.json()["reviews"]] == [
        "validated",
        "contested",
    ]


# ------------------------------------------------- vinculo achado <-> afirmacao


def test_achado_e_ligado_a_afirmacao_do_mesmo_dossie_sem_mudar_o_estado_de_nenhum(
    analyst, reviewer, outsider, actor_factory, engine, ready
):
    item = finished(analyst, engine, ready)["finding"]
    oid = item["opportunity_id"]
    claim = analyst.client.post(
        f"/api/v1/opportunities/{oid}/claims",
        json={"text": "A citação ocorreu por edital.", "nature": "attributed_allegation"},
    ).json()
    url = f"/api/v1/engine-findings/{item['id']}/claim-links"
    body = {"claim_id": claim["id"], "relation": "supports", "note": "Mesmo fato."}

    viewer = actor_factory("Org Teste", "leitor-vinculo", "viewer")
    assert viewer.client.post(url, json=body).status_code == 403
    assert outsider.client.post(url, json=body).status_code == 404
    bad = analyst.client.post(url, json={**body, "relation": "prova"})
    assert bad.status_code == 422
    missing = analyst.client.post(url, json={**body, "claim_id": "nao-existe"})
    assert missing.json()["error"]["code"] == "claim_not_in_dossier"

    linked = analyst.client.post(url, json=body)
    assert linked.status_code == 201, linked.text
    out = linked.json()
    assert [(link["claim_id"], link["relation"], link["note"]) for link in out["claim_links"]] == [
        (claim["id"], "supports", "Mesmo fato.")
    ]
    link = out["claim_links"][0]
    assert link["claim_text"] == "A citação ocorreu por edital."
    assert link["claim_review_state"] == "pending"  # vinculo nao valida a afirmacao
    assert out["review_state"] == item["review_state"]  # nem o achado
    assert analyst.client.post(url, json=body).json()["error"]["code"] == "link_exists"

    # O estado da afirmacao aparece atualizado na leitura do achado.
    reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews",
        json={"review_state": "contested", "comment": "A ré nega."},
    )
    again = analyst.client.get(f"/api/v1/engine-runs/{item['run_id']}/findings").json()[0]
    assert again["claim_links"][0]["claim_review_state"] == "contested"

    remove = f"/api/v1/engine-finding-claim-links/{link['id']}"
    assert outsider.client.delete(remove).status_code == 404
    assert viewer.client.delete(remove).status_code == 403
    gone = analyst.client.delete(remove)
    assert gone.status_code == 200 and gone.json()["claim_links"] == []
    assert analyst.client.delete(remove).status_code == 404


# ------------------------------------------- mapa de evidencias e relatorio


def _xlsx(actor, opp: str, title: str = "Mapa de evidências") -> dict:
    import io

    from openpyxl import Workbook

    wb = Workbook()
    wb.active.append(["Tipo de Evidência", "Trecho"])
    buffer = io.BytesIO()
    wb.save(buffer)
    return upload(actor, opp, buffer.getvalue(), filename="mapa.xlsx", title=title).json()


def test_mapa_de_evidencias_chega_ao_motor_antes_da_analise_e_fica_registrado(
    analyst, engine, opportunity
):
    opp = opportunity["opportunity_id"]
    sheet = _xlsx(analyst, opp)["version"]["id"]
    text = send_text(analyst, opp)["version"]["id"]
    url = f"/api/v1/opportunities/{opp}/engine-runs"
    base = {"engine": "nulidade360", "document_version_id": text, "simulated_side": "claimant"}

    # Só planilha .xlsx do próprio dossiê serve de mapa.
    wrong = analyst.client.post(url, json={**base, "evidence_map_version_id": text})
    assert wrong.status_code == 422
    assert engine.cases == []  # nada foi enviado ao motor

    ok = analyst.client.post(url, json={**base, "evidence_map_version_id": sheet})
    assert ok.status_code == 201, ok.text
    run = ok.json()
    assert run["evidence_map"]["document_version_id"] == sheet
    assert run["evidence_map"]["total_items"] == 7
    assert [m[:2] for m in engine.evidence_maps] == [("1", "mapa.xlsx")]
    assert engine.started == ["1"]  # a analise so comecou depois do mapa
    # Custo e uso de tokens: o motor nao informa; fica desconhecido, nunca zero.
    assert run["cost_amount"] is None and run["usage"] is None


def test_planilha_recusada_pelo_motor_interrompe_o_pedido_sem_analisar(
    analyst, engine, opportunity
):
    opp = opportunity["opportunity_id"]
    sheet = _xlsx(analyst, opp)["version"]["id"]
    text = send_text(analyst, opp)["version"]["id"]
    engine.reject_evidence_map = True
    resp = analyst.client.post(
        f"/api/v1/opportunities/{opp}/engine-runs",
        json={
            "engine": "nulidade360",
            "document_version_id": text,
            "simulated_side": "claimant",
            "evidence_map_version_id": sheet,
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "nulidade360_evidence_map_rejected"
    assert engine.started == []  # nao analisou sem o mapa escolhido
    runs = analyst.client.get(f"/api/v1/opportunities/{opp}/engine-runs").json()
    assert [r["status"] for r in runs] == ["failed"]


def test_relatorio_do_motor_e_baixado_rotulado_e_ausencia_e_erro_proprio(
    analyst, outsider, engine, ready
):
    run_id = start(analyst, ready["opp"], ready["version"]).json()["id"]
    url = f"/api/v1/engine-runs/{run_id}/report"
    assert outsider.client.get(url).status_code == 404

    missing = analyst.client.get(url)
    assert missing.status_code == 409
    assert missing.json()["error"]["code"] == "nulidade360_report_unavailable"

    engine.report = b"PK-relatorio-sintetico"
    got = analyst.client.get(url)
    assert got.status_code == 200
    assert got.content == b"PK-relatorio-sintetico"
    assert "SIMULADO" in got.headers["content-disposition"]

    engine.down = True
    assert analyst.client.get(url).status_code == 503


def test_cliente_http_mapa_de_evidencias_e_relatorio():
    docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        path = request.url.path
        if path == "/api/cases/1/evidence-map":
            return httpx.Response(200, json={"evidence_map": {"total_items": 3, "run_id": "r"}})
        if path == "/api/cases/2/evidence-map":
            return httpx.Response(400, json={"detail": "Colunas obrigatorias ausentes"})
        if path == "/api/cases/1/report.docx":
            return httpx.Response(200, content=b"PK", headers={"content-type": docx})
        if path == "/api/cases/2/report.docx":
            return httpx.Response(400, json={"detail": "Nao ha achados aceitos"})
        if path == "/api/cases/3/report.docx":
            return httpx.Response(200, text="<html>", headers={"content-type": "text/html"})
        return httpx.Response(404, json={})

    client = HttpNulidade360Client("http://motor.invalid", transport=httpx.MockTransport(handler))
    assert client.send_evidence_map("1", "mapa.xlsx", b"x") == {"total_items": 3, "run_id": "r"}
    assert seen[-1].method == "POST" and b"mapa.xlsx" in seen[-1].content
    with pytest.raises(Nulidade360Error) as rejected:
        client.send_evidence_map("2", "mapa.xlsx", b"x")
    assert rejected.value.code == "nulidade360_evidence_map_rejected"

    assert client.fetch_report("1") == b"PK"
    assert seen[-1].method == "GET"
    with pytest.raises(Nulidade360Error) as unavailable:
        client.fetch_report("2")
    assert unavailable.value.code == "nulidade360_report_unavailable"
    with pytest.raises(Nulidade360Error) as html:
        client.fetch_report("3")
    assert html.value.code == "nulidade360_contract_violation"


# ---------------------------------------------------------------- modo real


def test_modo_real_nao_marca_a_execucao_como_simulada_e_estranha_motor_simulado(
    app, analyst, engine, ready
):
    app.state.settings.nulidade360_mode = "live"
    health = analyst.client.get("/health").json()
    assert health["nulidade360_mode"] == "live" and "llm_mode" in health

    started = start(analyst, ready["opp"], ready["version"])
    assert started.status_code == 201, started.text
    run_id = started.json()["id"]
    assert started.json()["is_mock"] is False  # execucao real nao nasce rotulada como teste

    # O motor conclui sem declarar modo simulado: nada de alerta, nada de rotulo de teste.
    engine.analyses = [analysis(blocks_meta=real_blocks())]
    done = refresh(analyst, run_id).json()
    assert done["is_mock"] is False
    assert not any("simulado" in text for text in done["limitations"])
    assert not any("consumo de API paga" in text for text in done["limitations"])

    # PDF continua barrado: esta versao so entrega texto ao motor.
    pdf = upload(analyst, ready["opp"], make_pdf(pages=1), filename="peca.pdf").json()
    blocked = start(analyst, ready["opp"], pdf["version"]["id"])
    assert blocked.status_code == 422
    assert blocked.json()["error"]["code"] == "engine_requires_paid_run"


def test_modo_real_com_motor_respondendo_simulado_vira_limitacao_visivel(
    app, analyst, engine, opportunity
):
    app.state.settings.nulidade360_mode = "live"
    opp = opportunity["opportunity_id"]
    version = send_text(analyst, opp, filename="outro.txt", text="Outro laudo sintético.")
    run_id = start(analyst, opp, version["version"]["id"]).json()["id"]
    engine.analyses = [analysis()]  # blocos declarados como simulados pelo motor
    done = refresh(analyst, run_id).json()
    assert done["is_mock"] is True
    assert any("configurada para execução real" in text for text in done["limitations"])


# -------------------------------------- trecho citado conferido contra a pagina


def test_trecho_citado_e_conferido_contra_a_pagina_e_nao_so_a_existencia_dela():
    from evidia.domain.engines import verify_citation_excerpts
    from evidia.schemas_engines import Citation

    pages = {
        1: "O perito não intimou\nos assistentes.",
        2: "Metodologia ausente.",
        3: "Metodologia ausente.",
    }

    def cite(page: int, excerpt: str) -> Citation:
        return Citation(document_version_id="v", page_start=page, excerpt=excerpt)

    kept, pend, corrected, dropped = verify_citation_excerpts(
        [
            cite(1, "o perito não intimou os assistentes"),  # na pagina citada (espacos e caixa)
            cite(2, "O perito não intimou"),  # esta na pagina 1: corrigida
            cite(1, "Metodologia ausente."),  # esta nas paginas 2 e 3: ambigua, retirada
            cite(2, "Texto que o modelo inventou"),  # em nenhuma pagina: retirada
            cite(9, ""),  # sem trecho: nao ha o que conferir
        ],
        [],
        pages,
    )
    assert [c.page_start for c in kept] == [1, 1, 9]
    assert (corrected, dropped) == (1, 2)
    assert [p.code for p in pend] == ["citation_unresolved", "citation_unresolved"]
    assert "mais de uma página" in pend[0].message and "não foi encontrado" in pend[1].message

    # Sem nenhuma citacao conferida, o achado fica pendente de evidencia.
    none, pend, _, dropped = verify_citation_excerpts([cite(1, "inexistente")], [], pages)
    assert none == [] and dropped == 1
    assert [p.code for p in pend] == ["evidence_pending", "citation_unresolved"]

    # Documento sem texto por pagina: nada a conferir, nada muda.
    same = [cite(4, "qualquer")]
    assert verify_citation_excerpts(same, [], {}) == (same, [], 0, 0)


def test_motor_que_cita_pagina_errada_tem_a_pagina_corrigida_e_o_que_inventa_fica_pendente(
    analyst, engine, opportunity
):
    opp = opportunity["opportunity_id"]
    text = (
        "<pagina> 1\nO perito não intimou os assistentes técnicos.\n<pagina> 2\nSem metodologia.\n"
    )
    version = send_text(analyst, opp, filename="laudo-paginado.txt", text=text)["version"]["id"]
    run_id = start(analyst, opp, version).json()["id"]

    def evidence(page: int, excerpt: str) -> list[dict]:
        return [{"file_name": "laudo-paginado.txt", "page": page, "excerpt": excerpt}]

    engine.analyses = [
        analysis(
            blocks_meta=real_blocks(),
            findings=[
                finding(1, file_name="x", page=1, evidences=evidence(2, "O perito não intimou")),
                finding(2, file_name="x", page=1, evidences=evidence(1, "Trecho que não existe")),
                finding(3, file_name="x", page=1, evidences=evidence(2, "Sem metodologia.")),
            ],
        )
    ]
    done = refresh(analyst, run_id).json()
    assert any("página foi corrigida" in t for t in done["limitations"])
    assert any("foram retiradas" in t for t in done["limitations"])
    found = {
        f["original"]["id"]: f
        for f in analyst.client.get(f"/api/v1/engine-runs/{run_id}/findings").json()
    }
    assert [c["page_start"] for c in found[1]["citations"]] == [1]  # motor disse 2
    assert found[1]["original"]["evidences"][0]["page"] == 2  # o original fica como veio
    assert found[2]["citations"] == []
    assert [p["code"] for p in found[2]["pendencies"]] == [
        "evidence_pending",
        "citation_unresolved",
    ]
    assert [c["page_start"] for c in found[3]["citations"]] == [2] and found[3]["pendencies"] == []
