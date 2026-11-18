"""Texto por pagina, OCR local, estrutura do documento e fila (T006, T008, T018; AC20).

O OCR destes testes e real (Tesseract local); nada sai da maquina. Dados sinteticos.
"""

import io
from datetime import timedelta
from pathlib import Path

import pytest

from evidia.domain import ocr
from evidia.domain.texts import contains_excerpt, split_text_pages
from evidia.models import DocumentVersion, EngineRun, Job, utcnow
from evidia.services import jobs
from evidia.worker import Worker
from tests.conftest import make_pdf, upload
from tests.test_engines import FakeNulidade, analysis

FONT = Path("C:/Windows/Fonts/arial.ttf")
needs_ocr = pytest.mark.skipif(
    not (ocr.OcrEngine().available() and FONT.is_file()),
    reason="Tesseract com português ou fonte de teste indisponível nesta máquina",
)


def send(actor, opp: str, content: bytes, filename: str, **form) -> dict:
    resp = upload(actor, opp, content, filename=filename, **form)
    assert resp.status_code == 200, resp.text
    return resp.json()


def text_of(actor, version_id: str) -> dict:
    resp = actor.client.get(f"/api/v1/document-versions/{version_id}/text")
    assert resp.status_code == 200, resp.text
    return resp.json()


def page(actor, version_id: str, number: int):
    return actor.client.get(f"/api/v1/document-versions/{version_id}/pages/{number}")


def scanned_image(text: str) -> bytes:
    from PIL import Image, ImageDraw, ImageFont

    image = Image.new("RGB", (1400, 300), "white")
    ImageDraw.Draw(image).text(
        (40, 100), text, fill="black", font=ImageFont.truetype(str(FONT), 64)
    )
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def scanned_pdf(texts: list[str]) -> bytes:
    from PIL import Image

    images = [Image.open(io.BytesIO(scanned_image(text))) for text in texts]
    buffer = io.BytesIO()
    images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:])
    return buffer.getvalue()


# ----------------------------------------------------------------- dominio


def test_arquivo_de_texto_so_e_paginado_por_marcador_explicito():
    assert [p.page_no for p in split_text_pages("sem marcadores\nlinha 2")] == [1]
    by_feed = split_text_pages("primeira\fsegunda\fterceira")
    assert [(p.page_no, p.text) for p in by_feed] == [
        (1, "primeira"),
        (2, "segunda"),
        (3, "terceira"),
    ]
    marked = split_text_pages("<pagina> 7\ntexto sete\n<pagina> 8\ntexto oito\n")
    assert [(p.page_no, p.text) for p in marked] == [(7, "texto sete"), (8, "texto oito")]
    # Numeracao repetida nao e confiavel: o arquivo inteiro vira a pagina 1.
    repeated = split_text_pages("<pagina> 2\na\n<pagina> 2\nb\n")
    assert [p.page_no for p in repeated] == [1]


def test_trecho_e_conferido_ignorando_espacos_e_caixa_mas_nao_o_conteudo():
    text = "A  autora\nalegou atraso de 90 dias."
    assert contains_excerpt(text, "a autora alegou ATRASO")
    assert not contains_excerpt(text, "atraso de 60 dias")
    assert not contains_excerpt(text, "   ")


# ----------------------------------------------------------- texto no envio


def test_texto_e_extraido_por_pagina_no_recebimento_e_pagina_sem_texto_e_recusada(
    analyst, outsider, opportunity
):
    opp = opportunity["opportunity_id"]
    txt = send(analyst, opp, "pág um\fpág dois".encode(), "notas.txt")
    assert txt["version"]["text_source"] == "text" and txt["version"]["text_pages"] == 2
    assert page(analyst, txt["version"]["id"], 2).json()["text"] == "pág dois"

    pdf = send(analyst, opp, make_pdf(pages=3, text="Laudo"), "laudo.pdf")
    status = text_of(analyst, pdf["version"]["id"])
    assert status["text_source"] == "native" and status["page_count"] == 3
    assert [p["page_no"] for p in status["pages_with_text"]] == [1, 2, 3]
    assert "Laudo p2" in page(analyst, pdf["version"]["id"], 2).json()["text"]
    missing = page(analyst, pdf["version"]["id"], 9)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "page_text_not_available"

    scanned = send(analyst, opp, make_pdf(pages=2, text=None), "digitalizado.pdf")
    status = text_of(analyst, scanned["version"]["id"])
    assert status["state"] == "needs_ocr" and status["text_source"] == "none"
    assert status["pages_with_text"] == []

    # Texto de documento e conteudo do dossie: outra organizacao nao le.
    assert page(outsider, txt["version"]["id"], 1).status_code == 404
    assert (
        outsider.client.get(f"/api/v1/document-versions/{txt['version']['id']}/text").status_code
        == 404
    )


def test_pdf_grande_tem_o_texto_extraido_pela_fila_e_nao_no_envio(app, analyst, opportunity):
    app.state.settings.inline_text_max_pages = 2
    opp = opportunity["opportunity_id"]
    doc = send(analyst, opp, make_pdf(pages=4, text="Grande"), "grande.pdf")
    assert doc["version"]["text_source"] == "none"
    status = text_of(analyst, doc["version"]["id"])
    assert [(j["kind"], j["status"]) for j in status["active_jobs"]] == [("extract_text", "queued")]
    assert app.state.worker.tick()["jobs"] == 1
    status = text_of(analyst, doc["version"]["id"])
    assert status["text_source"] == "native" and len(status["pages_with_text"]) == 4
    assert status["active_jobs"] == [] and status["last_job"]["status"] == "completed"
    listed = analyst.client.get(f"/api/v1/opportunities/{opp}/jobs").json()
    assert listed[0]["result"] == {"pages_with_text": 4}


# ---------------------------------------------------------------------- OCR


@needs_ocr
def test_ocr_local_le_imagem_e_pdf_digitalizado_sem_alterar_o_original(app, analyst, opportunity):
    opp = opportunity["opportunity_id"]
    image = send(analyst, opp, scanned_image("LAUDO PERICIAL"), "foto.png")
    assert image["version"]["state"] == "needs_ocr"
    version_id = image["version"]["id"]
    assert text_of(analyst, version_id)["ocr_available"] is True

    first = analyst.client.post(f"/api/v1/document-versions/{version_id}/ocr")
    again = analyst.client.post(f"/api/v1/document-versions/{version_id}/ocr")
    assert (first.status_code, again.status_code) == (202, 200)
    assert again.json()["id"] == first.json()["id"]  # um unico trabalho por documento

    assert app.state.worker.tick()["jobs"] == 1
    status = text_of(analyst, version_id)
    assert status["state"] == "stored" and status["text_source"] == "ocr"
    assert status["last_job"]["result"]["pages_read"] == 1
    read = page(analyst, version_id, 1).json()
    assert read["source"] == "ocr" and "LAUDO" in read["text"].upper()
    with app.state.session_factory() as db:
        assert db.get(DocumentVersion, version_id).sha256 == image["version"]["sha256"]

    pdf = send(analyst, opp, scanned_pdf(["PRIMEIRA FOLHA", "SEGUNDA FOLHA"]), "autos.pdf")
    pdf_id = pdf["version"]["id"]
    assert pdf["version"]["state"] == "needs_ocr" and pdf["version"]["page_count"] == 2
    assert analyst.client.post(f"/api/v1/document-versions/{pdf_id}/ocr").status_code == 202
    app.state.worker.tick()
    assert "SEGUNDA" in page(analyst, pdf_id, 2).json()["text"].upper()
    # Repetir o OCR nao refaz paginas que ja tem texto.
    assert analyst.client.post(f"/api/v1/document-versions/{pdf_id}/ocr").status_code == 202
    app.state.worker.tick()
    assert text_of(analyst, pdf_id)["last_job"]["result"] == {
        "pages_read": 0,
        "pages_without_text": 0,
        "pages_not_processed": 0,
    }


def test_ocr_indisponivel_ou_inaplicavel_e_erro_explicito_e_nada_entra_na_fila(
    app, analyst, actor_factory, opportunity
):
    opp = opportunity["opportunity_id"]
    scanned = send(analyst, opp, make_pdf(pages=1, text=None), "digitalizado.pdf")
    txt = send(analyst, opp, b"texto", "notas.txt")
    not_applicable = analyst.client.post(f"/api/v1/document-versions/{txt['version']['id']}/ocr")
    assert not_applicable.status_code == 422
    assert not_applicable.json()["error"]["code"] == "ocr_not_applicable"

    viewer = actor_factory("Org A", "leitor.a", "viewer")
    url = f"/api/v1/document-versions/{scanned['version']['id']}/ocr"
    assert viewer.client.post(url).status_code == 403

    app.state.settings.tesseract_cmd = "tesseract-que-nao-existe"
    unavailable = analyst.client.post(url)
    assert unavailable.status_code == 503
    assert unavailable.json()["error"]["code"] == "ocr_unavailable"
    assert text_of(analyst, scanned["version"]["id"])["ocr_available"] is False
    with app.state.session_factory() as db:
        assert db.query(Job).count() == 0


# --------------------------------------------------------------------- fila


@jobs.handler("teste_instavel")
def _flaky(db, job, settings):
    if job.attempts < 2:
        raise jobs.JobFailed("falha passageira", retryable=True)
    return {"ok": True}


@jobs.handler("teste_definitivo")
def _fatal(db, job, settings):
    raise jobs.JobFailed("falha definitiva")


def new_job(app, analyst, kind: str, **fields) -> str:
    with app.state.write_session_factory() as db:
        job = Job(
            organization_id=analyst.organization_id,
            kind=kind,
            target_id="alvo",
            created_by=analyst.user_id,
            **fields,
        )
        db.add(job)
        db.commit()
        return job.id


def job_state(app, job_id: str) -> Job:
    with app.state.session_factory() as db:
        return db.get(Job, job_id)


def test_fila_repete_falha_passageira_e_encerra_falha_definitiva_ou_tipo_desconhecido(app, analyst):
    flaky = new_job(app, analyst, "teste_instavel")
    fatal = new_job(app, analyst, "teste_definitivo")
    unknown = new_job(app, analyst, "tipo_que_nao_existe")
    app.state.worker.tick()
    waiting = job_state(app, flaky)
    assert (waiting.status, waiting.attempts, waiting.error) == ("queued", 1, "falha passageira")
    assert waiting.next_attempt_at is not None  # espera antes da nova tentativa
    assert job_state(app, fatal).status == "failed"
    assert "desconhecido" in job_state(app, unknown).error

    # Antes da hora marcada o trabalho nao e retomado; depois, e a mesma operacao.
    assert app.state.worker.tick()["jobs"] == 0
    with app.state.write_session_factory() as db:
        db.get(Job, flaky).next_attempt_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert app.state.worker.tick()["jobs"] == 1
    done = job_state(app, flaky)
    assert (done.status, done.attempts, done.result) == ("completed", 2, {"ok": True})


def test_ac20_trabalho_interrompido_por_queda_volta_a_fila_na_inicializacao(app, analyst):
    orphan = new_job(app, analyst, "teste_instavel", status="running", attempts=1)
    restarted = Worker(app.state)
    assert restarted.recover() == 1
    assert job_state(app, orphan).status == "queued"
    restarted.tick()
    assert job_state(app, orphan).status == "completed"


def test_ac20_execucao_de_motor_e_reconciliada_pelo_trabalhador_apos_reinicio(
    app, analyst, opportunity
):
    engine = FakeNulidade()
    app.state.settings.nulidade360_mode = "mock"
    app.state.nulidade360_client = engine
    opp = opportunity["opportunity_id"]
    doc = send(analyst, opp, "Laudo sintético.".encode(), "laudo.txt")
    started = analyst.client.post(
        f"/api/v1/opportunities/{opp}/engine-runs",
        json={
            "engine": "nulidade360",
            "document_version_id": doc["version"]["id"],
            "simulated_side": "defendant",
        },
    ).json()
    assert started["status"] == "running"

    # Motor fora do ar: o ciclo nao encerra a execucao nem inventa estado.
    engine.down = True
    assert Worker(app.state).tick()["reconciled"] == 0
    engine.down = False
    engine.analyses = [analysis()]

    restarted = Worker(app.state)  # processo novo, mesmo banco
    assert restarted.tick()["reconciled"] == 1
    with app.state.session_factory() as db:
        run = db.get(EngineRun, started["id"])
        assert run.status == "completed"
    # Nenhum reenvio: um caso, uma analise iniciada; e nenhum achado duplicado.
    assert len(engine.cases) == 1 and engine.started == ["1"]
    assert restarted.tick() == {"reconciled": 0, "jobs": 0}
    findings = analyst.client.get(f"/api/v1/engine-runs/{started['id']}/findings").json()
    assert len(findings) == 1


# ------------------------------------------------------- estrutura do documento


def test_estrutura_do_documento_mapeia_peca_paginas_e_folha_processual(
    analyst, outsider, actor_factory, opportunity
):
    opp = opportunity["opportunity_id"]
    doc = send(analyst, opp, make_pdf(pages=6, text="Autos"), "autos.pdf")
    url = f"/api/v1/document-versions/{doc['version']['id']}/segments"

    created = analyst.client.post(
        url,
        json={
            "label": "Laudo pericial",
            "piece_type": "laudo_pericial",
            "page_start": 3,
            "page_end": 5,
            "folio_start": 120,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["folio_end"] == 122  # mesma extensao do intervalo de paginas
    # Pagina 4 do arquivo e a folha 121 do processo; pagina fora de peca mapeada nao tem folha.
    assert page(analyst, doc["version"]["id"], 4).json()["folio"] == 121
    assert page(analyst, doc["version"]["id"], 1).json()["folio"] is None
    assert [s["label"] for s in text_of(analyst, doc["version"]["id"])["segments"]] == [
        "Laudo pericial"
    ]

    for body, code in (
        ({"label": "x", "page_start": 5, "page_end": 4}, "invalid_page_range"),
        ({"label": "x", "page_start": 6, "page_end": 7}, "page_out_of_range"),
        (
            {"label": "x", "page_start": 1, "page_end": 3, "folio_start": 10, "folio_end": 20},
            "invalid_folio_range",
        ),
        ({"label": "x", "page_start": 1, "folio_end": 20}, "invalid_folio_range"),
    ):
        resp = analyst.client.post(url, json=body)
        assert resp.status_code == 422 and resp.json()["error"]["code"] == code, body

    viewer = actor_factory("Org A", "leitor.a", "viewer")
    assert viewer.client.post(url, json={"label": "x", "page_start": 1}).status_code == 403
    assert outsider.client.post(url, json={"label": "x", "page_start": 1}).status_code == 404
    segment_id = created.json()["id"]
    assert outsider.client.delete(f"/api/v1/document-segments/{segment_id}").status_code == 404
    assert analyst.client.delete(f"/api/v1/document-segments/{segment_id}").status_code == 204
    assert text_of(analyst, doc["version"]["id"])["segments"] == []
