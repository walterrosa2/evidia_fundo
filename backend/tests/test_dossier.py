"""Documentos, versoes, afirmacoes e revisao (RF02–RF03, AC04–AC05)."""

from tests.conftest import make_pdf, upload


def opp_id(opportunity) -> str:
    return opportunity["opportunity_id"]


def new_claim(actor, oid, **overrides):
    body = {"text": "A parte alegou atraso na entrega.", "nature": "attributed_allegation"}
    body.update(overrides)
    return actor.client.post(f"/api/v1/opportunities/{oid}/claims", json=body)


# ------------------------------------------------------------------ documentos


def test_contagem_de_paginas_vem_do_arquivo_recebido(analyst, opportunity):
    resp = upload(analyst, opp_id(opportunity), make_pdf(pages=3), title="Laudo", doc_type="laudo")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["version"]["page_count"] == 3
    assert body["version"]["state"] == "stored"
    assert body["version"]["version_no"] == 1
    assert len(body["version"]["sha256"]) == 64
    assert body["dossier_version"] == 1


def test_pdf_identico_enviado_duas_vezes_nao_cria_segunda_fonte(analyst, opportunity):
    pdf = make_pdf(pages=2)
    first = upload(analyst, opp_id(opportunity), pdf, filename="a.pdf").json()
    second = upload(analyst, opp_id(opportunity), pdf, filename="outro-nome.pdf").json()
    assert second["duplicate"] is True
    assert second["version"]["id"] == first["version"]["id"]
    detail = analyst.client.get(f"/api/v1/opportunities/{opp_id(opportunity)}").json()
    assert detail["documents_count"] == 1
    assert detail["dossier_version"] == 1


def test_pdf_corrompido_e_rejeitado_com_erro_explicito(analyst, opportunity):
    resp = upload(analyst, opp_id(opportunity), b"%PDF-1.4 isto nao e um pdf de verdade")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "document_corrupted"
    # Extensao nao prova conteudo.
    fake = upload(analyst, opp_id(opportunity), b"texto qualquer", filename="laudo.pdf")
    assert fake.json()["error"]["code"] == "document_corrupted"
    detail = analyst.client.get(f"/api/v1/opportunities/{opp_id(opportunity)}").json()
    assert detail["documents_count"] == 0


def test_pdf_digitalizado_indica_necessidade_de_ocr(analyst, opportunity):
    body = upload(analyst, opp_id(opportunity), make_pdf(pages=2, text=None)).json()
    assert body["version"]["state"] == "needs_ocr"
    assert body["version"]["page_count"] == 2


def test_formato_nao_aceito_vazio_e_grande_demais(analyst, opportunity):
    oid = opp_id(opportunity)
    assert upload(analyst, oid, b"MZ", filename="x.exe").json()["error"]["code"] == (
        "unsupported_format"
    )
    assert upload(analyst, oid, b"", filename="x.pdf").json()["error"]["code"] == "empty_file"
    big = b"a" * (5 * 1024 * 1024 + 1)
    assert upload(analyst, oid, big, filename="x.txt").json()["error"]["code"] == "file_too_large"


def test_receber_autos_integrais_libera_bloqueio_de_documentacao(analyst, opportunity):
    oid = opp_id(opportunity)
    upload(analyst, oid, make_pdf(pages=4), title="Autos", category="full_record")
    detail = analyst.client.get(f"/api/v1/opportunities/{oid}").json()
    assert detail["has_full_record"] is True
    assert detail["integral_opinion_blockers"] == []


def test_ac04_nova_versao_marca_dependentes_como_desatualizados_e_preserva_o_antigo(
    analyst, reviewer, opportunity
):
    oid = opp_id(opportunity)
    v1 = upload(analyst, oid, make_pdf(pages=3, text="laudo v1"), title="Laudo").json()
    claim = new_claim(
        analyst, oid, document_version_id=v1["version"]["id"], page_start=2, excerpt="trecho"
    ).json()
    reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "validated"}
    )
    calc = analyst.client.post(
        f"/api/v1/opportunities/{oid}/calculations",
        json={
            "defendant": {
                "assumptions": {"base_date": "2026-11-16"},
                "reference_exposure": "1000000",
                "scenarios": [{"id": "a", "label": "A", "disbursement": "700000"}],
            }
        },
    ).json()
    assert calc["stale"] is False

    v2 = upload(
        analyst,
        oid,
        make_pdf(pages=5, text="laudo v2"),
        document_id=v1["document"]["id"],
    ).json()
    assert v2["version"]["version_no"] == 2
    assert v2["superseded_claims"] == 1
    assert v2["superseded_calculations"] == 1

    after = analyst.client.get(f"/api/v1/opportunities/{oid}/claims").json()[0]
    assert after["stale"] is True
    assert "versão 2" in after["stale_reason"]
    assert after["document_version_no"] == 1  # versao de origem continua visivel
    assert after["review_state"] == "validated"  # historico preservado, apenas sinalizado

    runs = analyst.client.get(f"/api/v1/opportunities/{oid}/calculations").json()
    assert runs[0]["stale"] is True
    assert runs[0]["result"]["defendant"]["scenarios"][0]["gross_reduction"] == "300000.00"

    document = analyst.client.get(f"/api/v1/opportunities/{oid}").json()["documents"][0]
    assert [v["version_no"] for v in document["versions"]] == [1, 2]
    assert [v["is_current"] for v in document["versions"]] == [False, True]
    old = analyst.client.get(f"/api/v1/document-versions/{v1['version']['id']}/content")
    assert old.status_code == 200
    assert old.content == make_pdf(pages=3, text="laudo v1")


def test_documento_ausente_e_lacuna_explicita_e_pode_ser_resolvida(analyst, opportunity):
    oid = opp_id(opportunity)
    created = analyst.client.post(
        f"/api/v1/opportunities/{oid}/missing-pieces",
        json={"description": "Anexo 3 citado no laudo", "reason": "Citado na pagina 12"},
    ).json()
    assert created["status"] == "open"
    before = analyst.client.get(f"/api/v1/opportunities/{oid}").json()["open_gaps_count"]
    analyst.client.patch(f"/api/v1/missing-pieces/{created['id']}", json={"status": "received"})
    after = analyst.client.get(f"/api/v1/opportunities/{oid}").json()["open_gaps_count"]
    assert after == before - 1


# ------------------------------------------------------------------ afirmacoes


def test_alegacao_sem_suporte_permanece_alegacao_e_nao_e_validada(analyst, reviewer, opportunity):
    claim = new_claim(analyst, opp_id(opportunity)).json()
    assert claim["nature"] == "attributed_allegation"
    assert claim["review_state"] == "pending"
    assert [b["code"] for b in claim["validation_blockers"]] == ["evidence_pending"]

    resp = reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "validated"}
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "validation_blocked"
    still = analyst.client.get(f"/api/v1/opportunities/{opp_id(opportunity)}/claims").json()[0]
    assert still["review_state"] == "pending"
    assert still["reviews"] == []


def test_ac05_citacao_que_nao_resolve_e_recusada(analyst, opportunity, outsider):
    oid = opp_id(opportunity)
    version = upload(analyst, oid, make_pdf(pages=3)).json()["version"]
    beyond = new_claim(analyst, oid, document_version_id=version["id"], page_start=4)
    assert beyond.status_code == 422
    assert beyond.json()["error"]["code"] == "citation_unresolvable"
    assert "3 paginas" in beyond.json()["error"]["message"]

    orphan_page = new_claim(analyst, oid, page_start=1)
    assert orphan_page.json()["error"]["code"] == "citation_unresolvable"

    unknown = new_claim(analyst, oid, document_version_id="nao-existe", page_start=1)
    assert unknown.json()["error"]["code"] == "citation_unresolvable"


def test_inferencia_sem_premissas_nao_pode_ser_validada(analyst, reviewer, opportunity):
    oid = opp_id(opportunity)
    version = upload(analyst, oid, make_pdf(pages=2)).json()["version"]
    premise = new_claim(analyst, oid, document_version_id=version["id"], page_start=1).json()

    bare = new_claim(analyst, oid, nature="analytical_inference", text="Logo, houve culpa.").json()
    blocked = reviewer.client.post(
        f"/api/v1/claims/{bare['id']}/reviews", json={"review_state": "validated"}
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["details"]["blockers"][0]["code"] == "inference_without_premises"

    grounded = new_claim(
        analyst,
        oid,
        nature="analytical_inference",
        text="Logo, o prazo contratual foi excedido.",
        premise_claim_ids=[premise["id"]],
    ).json()
    ok = reviewer.client.post(
        f"/api/v1/claims/{grounded['id']}/reviews", json={"review_state": "validated"}
    )
    assert ok.status_code == 200
    assert ok.json()["review_state"] == "validated"

    missing = new_claim(analyst, oid, nature="analytical_inference", premise_claim_ids=["x"])
    assert missing.json()["error"]["code"] == "premise_not_found"


def test_correcao_preserva_antes_depois_e_autoria(analyst, reviewer, opportunity):
    oid = opp_id(opportunity)
    version = upload(analyst, oid, make_pdf(pages=2)).json()["version"]
    claim = new_claim(analyst, oid, document_version_id=version["id"], page_start=1).json()

    reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews",
        json={
            "review_state": "contested",
            "text": "A autora alegou atraso; a re contesta a data.",
            "comment": "Contestacao as fls. indicadas.",
        },
    )
    reopened = reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "validated"}
    ).json()

    assert reopened["review_state"] == "validated"
    assert len(reopened["reviews"]) == 2
    first = reopened["reviews"][0]
    assert first["before"]["text"] == "A parte alegou atraso na entrega."
    assert first["after"]["text"] == "A autora alegou atraso; a re contesta a data."
    assert first["before"]["review_state"] == "pending"
    assert first["after"]["review_state"] == "contested"
    assert first["reviewer_id"] == reviewer.user_id
    assert first["comment"] == "Contestacao as fls. indicadas."
    # Validar nao altera a natureza: alegacao revisada continua alegacao.
    assert reopened["nature"] == "attributed_allegation"


def test_afirmacao_desatualizada_exige_nova_citacao_antes_de_validar(
    analyst, reviewer, opportunity
):
    oid = opp_id(opportunity)
    v1 = upload(analyst, oid, make_pdf(pages=2, text="v1"), title="Laudo").json()
    claim = new_claim(analyst, oid, document_version_id=v1["version"]["id"], page_start=1).json()
    v2 = upload(analyst, oid, make_pdf(pages=2, text="v2"), document_id=v1["document"]["id"]).json()

    blocked = reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews", json={"review_state": "validated"}
    )
    assert blocked.status_code == 409
    assert "claim_stale" in [b["code"] for b in blocked.json()["error"]["details"]["blockers"]]

    fixed = reviewer.client.post(
        f"/api/v1/claims/{claim['id']}/reviews",
        json={
            "review_state": "validated",
            "document_version_id": v2["version"]["id"],
            "page_start": 2,
        },
    )
    assert fixed.status_code == 200
    assert fixed.json()["stale"] is False
    assert fixed.json()["document_version_no"] == 2
