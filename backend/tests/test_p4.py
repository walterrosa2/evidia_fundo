"""Adaptador do P4 (T009; RF05): importacao e normalizacao do relatorio.

Os relatorios destes testes sao SINTETICOS, montados nos dois formatos que o P4 real ja
produziu. O P4 nao e executado: ele consome IA paga e nao tem modo simulado.
"""

import io
import json

import pytest
from openpyxl import Workbook

from evidia.adapters.p4 import P4ReportError, page_from_reference, parse_report
from tests.conftest import make_pdf, upload

SOURCE = "\n".join(f"<pagina> {n}\nTexto sintético da página {n}." for n in range(1, 6))


def three_sheets(*, answers: bool = True) -> bytes:
    wb = Workbook()
    provas = wb.active
    provas.title = "Provas"
    provas.append(["Bloco", "TipoProva", "Resumo", "Referencia", "Conteudo"])
    provas.append(["1.01", "Documental", "Contrato assinado", "fls. 2", '{"tipo": "Documental"}'])
    provas.append(["1.01", "Pericial", "Laudo contábil", "pág. 40", "{}"])
    provas.append(["1.02", "Testemunhal", "Depoimento", "conforme os autos", "{}"])
    quesitos = wb.create_sheet("Quesitos")
    quesitos.append(["Bloco", "Quesito"])
    quesitos.append(["1.01", "O contrato previa prazo de entrega?"])
    respostas = wb.create_sheet("Respostas")
    respostas.append(
        [
            "Bloco",
            "Quesito",
            "RespostaTecnica",
            "StatusTecnico",
            "JustificativaTecnica",
            "Observacoes",
        ]
    )
    if answers:
        respostas.append(
            [
                "1.01",
                "O contrato previa prazo de entrega?",
                "Sim, 90 dias.",
                "Respondido",
                "Cláusula 3.",
                None,
            ]
        )
        respostas.append(["1.01", "Houve aditivo?", None, None, None, None])
    return save(wb)


def single_sheet() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Relatorio"
    ws.append(
        [
            "Indice",
            "Categoria",
            "TipoProva",
            "Resumo",
            "Referencia",
            "Quesito",
            "RespostaTecnica",
            "StatusTecnico",
            "JustificativaTecnica",
            "Observacoes",
            "Conteudo",
        ]
    )
    ws.append(["2.01", "Prova", "Documental", "E-mail", "<pagina> 3", "", "", "", "", "", "{}"])
    ws.append(["2.01", "Quesito", "", "", "", "Quem enviou o e-mail?", "", "", "", "", ""])
    # O codigo do P4 grava `resposta`; o prompt usa `resposta_tecnica`. So ha o JSON bruto.
    raw = json.dumps(
        {"quesito": "Quem enviou o e-mail?", "resposta": "A ré.", "status_tecnico": "Parcial"}
    )
    ws.append(["2.01", "Resposta", "", "", "", "Quem enviou o e-mail?", "", "", "", "", raw])
    return save(wb)


def save(wb: Workbook) -> bytes:
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def send(actor, opp: str, content: bytes, filename: str, **form) -> str:
    resp = upload(actor, opp, content, filename=filename, **form)
    assert resp.status_code == 200, resp.text
    return resp.json()["version"]["id"]


@pytest.fixture
def case(analyst, opportunity) -> dict:
    opp = opportunity["opportunity_id"]
    return {
        "opp": opp,
        "source": send(analyst, opp, SOURCE.encode(), "autos-paginados.txt"),
        "report": send(
            analyst, opp, three_sheets(), "relatorio_final.xlsx", category="derived_report"
        ),
    }


def run_import(actor, case: dict, **changes):
    body = {
        "report_version_id": case["report"],
        "source_version_id": case["source"],
        "simulated_side": "defendant",
        **changes,
    }
    return actor.client.post(f"/api/v1/opportunities/{case['opp']}/p4-imports", json=body)


def items(actor, run_id: str, kind: str | None = None) -> list[dict]:
    resp = actor.client.get(
        f"/api/v1/engine-runs/{run_id}/p4-items", params={"kind": kind} if kind else None
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ----------------------------------------------------------------- leitura


def test_referencia_em_texto_livre_vira_pagina_so_quando_ha_numero_identificavel():
    assert page_from_reference("fls. 12") == 12
    assert page_from_reference("Pág 7, segundo parágrafo") == 7
    assert page_from_reference("<pagina> 301") == 301
    assert page_from_reference("15") == 15
    assert page_from_reference("conforme os autos") is None
    # Dois numeros sem marcador de pagina: nao da para saber qual e a pagina.
    assert page_from_reference("anexo 3 do volume 2") is None


def test_os_dois_formatos_do_relatorio_sao_lidos_e_a_divergencia_de_campo_e_resolvida():
    old = parse_report(three_sheets())
    assert old.layout == "three_sheets"
    assert [(i.kind, i.index_key) for i in old.items] == [
        ("evidence", "1.01"),
        ("evidence", "1.01"),
        ("evidence", "1.02"),
        ("question", "1.01"),
        ("answer", "1.01"),
        ("answer", "1.01"),
    ]
    assert [i.page for i in old.items if i.kind == "evidence"] == [2, 40, None]
    assert old.items[4].answer == "Sim, 90 dias." and old.items[5].answer == ""

    new = parse_report(single_sheet())
    assert new.layout == "single_sheet"
    answer = next(i for i in new.items if i.kind == "answer")
    # Resposta guardada como `resposta` no JSON bruto e recuperada, sem inventar texto.
    assert answer.answer == "A ré." and answer.technical_status == "Parcial"
    assert answer.original["Conteudo"].startswith("{")


def test_arquivo_que_nao_e_relatorio_do_p4_e_recusado():
    wb = Workbook()
    wb.active.title = "Planilha1"
    for bad in (b"isto nao e planilha", save(wb)):
        with pytest.raises(P4ReportError):
            parse_report(bad)
    wb = Workbook()
    ws = wb.active
    ws.title = "Relatorio"
    ws.append(["Indice", "Categoria"])
    ws.append(["1", "Conclusao"])
    with pytest.raises(P4ReportError, match="Categoria desconhecida"):
        parse_report(save(wb))


# -------------------------------------------------------------- importacao


def test_importacao_confere_paginas_com_o_documento_analisado_e_preserva_o_original(
    analyst, outsider, actor_factory, case
):
    made = run_import(analyst, case)
    assert made.status_code == 201, made.text
    run = made.json()
    assert run["engine"] == "p4" and run["status"] == "completed" and run["is_mock"] is False
    assert run["simulated_side"] == "defendant" and run["side_confirmed_by"] == analyst.user_id
    assert run["items_count"] == 6 and run["findings_count"] == 0
    assert {b["key"]: b["status"] for b in run["blocks"]} == {
        "evidence": "completed",
        "question": "completed",
        "answer": "completed",
    }
    # Custo, modelo e versao nao vem no relatorio: ficam desconhecidos, nao zerados.
    assert run["cost_amount"] is None and run["engine_version"] is None and run["model"] is None
    text = " ".join(run["limitations"])
    assert "ocorreu fora da Evidia" in text and "1 resposta(s) sem texto" in text

    evidences = items(analyst, run["id"], "evidence")
    cited, out_of_range, no_page = evidences
    assert cited["citations"] == [
        {
            "document_version_id": case["source"],
            "page_start": 2,
            "page_end": None,
            "excerpt": "",
            "source": "engine",
        }
    ]
    assert cited["pendencies"] == []
    # Pagina 40 nao existe no documento analisado (5 paginas): pendencia, nao citacao.
    assert out_of_range["citations"] == [] and out_of_range["page"] == 40
    assert [p["code"] for p in out_of_range["pendencies"]] == ["page_out_of_range"]
    assert [p["code"] for p in no_page["pendencies"]] == ["evidence_pending"]
    assert no_page["reference_raw"] == "conforme os autos"
    assert cited["original"]["Referencia"] == "fls. 2"
    answers = items(analyst, run["id"], "answer")
    assert answers[0]["technical_status"] == "Respondido" and answers[1]["answer"] == ""

    # Reimportar o mesmo relatorio devolve a mesma execucao, sem duplicar itens.
    again = run_import(analyst, case)
    assert again.status_code == 200 and again.json()["id"] == run["id"]
    assert len(items(analyst, run["id"])) == 6
    # Outro lado e outra execucao; o lado e sempre informado.
    other = run_import(analyst, case, simulated_side="claimant")
    assert other.status_code == 201 and other.json()["id"] != run["id"]
    body = {"report_version_id": case["report"], "source_version_id": case["source"]}
    url = f"/api/v1/opportunities/{case['opp']}/p4-imports"
    assert analyst.client.post(url, json=body).status_code == 422

    viewer = actor_factory("Org A", "leitor.a", "viewer")
    assert run_import(viewer, case).status_code == 403
    assert run_import(outsider, case).status_code == 404
    assert outsider.client.get(f"/api/v1/engine-runs/{run['id']}/p4-items").status_code == 404


def test_relatorio_sem_uma_etapa_fica_parcial_e_documento_sem_paginacao_nao_e_conferido(
    analyst, opportunity
):
    opp = opportunity["opportunity_id"]
    case = {
        "opp": opp,
        "source": send(analyst, opp, make_pdf(pages=1, text=None), "digitalizado.pdf"),
        "report": send(analyst, opp, three_sheets(answers=False), "relatorio_final.xlsx"),
    }
    # PDF de uma pagina: so a pagina 1 existe.
    run = run_import(analyst, case, engine_version="4b4caaa").json()
    assert run["status"] == "partial" and run["engine_version"] == "4b4caaa"
    assert {b["key"]: b["status"] for b in run["blocks"]}["answer"] == "skipped"
    text = " ".join(run["limitations"])
    assert "Etapas sem itens: Respostas" in text and "informada por quem importou" in text
    assert [p["code"] for p in items(analyst, run["id"], "evidence")[0]["pendencies"]] == [
        "page_out_of_range"
    ]

    unpaged = {
        "opp": opp,
        "source": send(analyst, opp, b"\x89PNG\r\n\x1a\n" + b"0" * 64, "foto.png"),
        "report": send(analyst, opp, single_sheet(), "relatorio_novo.xlsx"),
    }
    loose = run_import(analyst, unpaged).json()
    evidence = items(analyst, loose["id"], "evidence")[0]
    # Sem texto paginado nao ha como conferir: a citacao fica, marcada como nao conferida.
    assert evidence["citations"][0]["page_start"] == 3
    assert [p["code"] for p in evidence["pendencies"]] == ["page_not_verified"]


def test_importacao_recusa_arquivo_errado_e_documento_substituido(analyst, case):
    for changes, status, code in (
        ({"report_version_id": case["source"]}, 422, "invalid_request"),
        ({"source_version_id": "de-outro-dossie"}, 422, "invalid_request"),
    ):
        resp = run_import(analyst, case, **changes)
        assert resp.status_code == status and resp.json()["error"]["code"] == code, changes
    text_report = send(analyst, case["opp"], b"nao e planilha", "relatorio.txt")
    not_xlsx = run_import(analyst, case, report_version_id=text_report)
    assert not_xlsx.status_code == 422 and not_xlsx.json()["error"]["code"] == "p4_report_invalid"

    wb = Workbook()
    wb.active.title = "Outra"
    wrong = send(analyst, case["opp"], save(wb), "outra.xlsx")
    bad = run_import(analyst, case, report_version_id=wrong)
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "p4_report_invalid"

    doc_id = analyst.client.get(f"/api/v1/opportunities/{case['opp']}").json()["documents"]
    source_doc = next(d for d in doc_id if d["versions"][0]["id"] == case["source"])["id"]
    send(analyst, case["opp"], b"<pagina> 1\nNovo texto.", "autos-v2.txt", document_id=source_doc)
    stale = run_import(analyst, case)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "document_version_not_current"


def test_achados_e_itens_do_p4_estao_na_tabela_comum_do_dossie(analyst, outsider, case):
    run = run_import(analyst, case).json()

    def table(actor, key: str, **spec):
        return actor.client.get(
            f"/api/v1/tables/{key}/rows",
            params={"q": json.dumps({"scope_id": case["opp"], **spec})},
        )

    rows = table(analyst, "p4_items").json()
    assert rows["total"] == 6
    assert [r["values"]["kind"] for r in rows["rows"][:3]] == ["evidence"] * 3  # ordem do relatório
    pending = table(
        analyst,
        "p4_items",
        filters=[
            {"column": "kind", "values": ["evidence"]},
            {"column": "pendencies_count", "op": "between", "min": "1"},
        ],
    ).json()
    assert pending["total"] == 2
    assert all(r["refs"] == {"run_id": run["id"]} for r in pending["rows"])
    exported = analyst.client.post(
        "/api/v1/tables/p4_items/export",
        json={"query": {"scope_id": case["opp"]}, "columns": ["kind", "page", "technical_status"]},
    )
    assert exported.status_code == 200
    lines = exported.content.decode("utf-8-sig").splitlines()
    assert lines[0] == "Prova ou Quesito;Categoria;Página;Status Técnico"
    assert "Contrato assinado;Prova;2;" in lines[1]

    assert table(analyst, "engine_findings").json()["total"] == 0  # o P4 não gera achados
    for key in ("p4_items", "engine_findings"):
        assert table(outsider, key).status_code == 404


def stage_sheets(*, empty: bool = False) -> bytes:
    """Formato mais antigo do P4: abas "Etapa ..." com colunas em minusculas."""
    wb = Workbook()
    evidences = wb.active
    evidences.title = "Etapa Evidencias"
    evidences.append(["tipo", "conteúdo", "resumo", "referencia"])
    quesitos = wb.create_sheet("Etapa Quesitos")
    quesitos.append(["Quesitos"])
    respostas = wb.create_sheet("Etapa Respostas")
    respostas.append(["quesito", "resposta", "status tecnico", "justificativa", "observações"])
    if not empty:
        evidences.append(["Documental", "Texto integral da prova.", "", "<pagina> 4"])
        quesitos.append(["Houve entrega?"])
        respostas.append(["Houve entrega?", "Não.", "Respondido", "Sem comprovante.", "Nenhuma."])
    return save(wb)


def test_formato_antigo_do_p4_e_lido_com_a_coluna_resposta_e_sem_bloco():
    report = parse_report(stage_sheets())
    assert report.layout == "stage_sheets"
    evidence, question, answer = report.items
    # Sem resumo, o texto da prova e usado; a pagina vem da referencia.
    assert evidence.summary == "Texto integral da prova." and evidence.page == 4
    assert evidence.index_key == "" and evidence.original["conteúdo"] == "Texto integral da prova."
    assert question.question == "Houve entrega?"
    # Neste formato a resposta esta na coluna `resposta`, nao em `RespostaTecnica`.
    assert (answer.answer, answer.technical_status) == ("Não.", "Respondido")
    assert (answer.justification, answer.notes) == ("Sem comprovante.", "Nenhuma.")


def test_planilha_vazia_e_planilha_de_indices_sao_recusadas_com_o_motivo():
    wb = Workbook()
    wb.active.title = "Sheet1"
    with pytest.raises(P4ReportError, match="Planilha vazia"):
        parse_report(save(wb))
    with pytest.raises(P4ReportError, match="Relatório vazio"):
        parse_report(stage_sheets(empty=True))
    wb = Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["Índice", "Tipo", "Conteúdo"])
    ws.append(["1.01", "Petição", "fls. 2"])
    with pytest.raises(P4ReportError, match="planilha de índices"):
        parse_report(save(wb))


# ------------------------------------------------- pedido de execucao (T009)


def p4_request(actor, case: dict, **changes):
    body = {"document_version_id": case["source"], "simulated_side": "defendant", **changes}
    return actor.client.post(f"/api/v1/opportunities/{case['opp']}/p4-requests", json=body)


def test_pacote_de_entrada_usa_o_marcador_do_p4_e_avisa_sobre_linhas_ambiguas():
    from evidia.adapters.p4 import build_input_package

    text, ambiguous = build_input_package(
        [(1, "Petição inicial.\r\nConforme fls. 12 dos autos."), (2, "Laudo.")]
    )
    assert text == "<pagina> 1\nPetição inicial.\nConforme fls. 12 dos autos.\n<pagina> 2\nLaudo.\n"
    # A linha com "fls. 12" seria lida pelo P4 como inicio da pagina 12: e avisado, nao alterado.
    assert ambiguous == 1


def test_pedido_fixa_o_pacote_e_e_fechado_pela_importacao_do_relatorio(
    analyst, outsider, actor_factory, case
):
    viewer = actor_factory("Org Teste", "leitor-p4", "viewer")
    assert p4_request(viewer, case).status_code == 403
    assert p4_request(outsider, case).status_code == 404
    assert p4_request(analyst, case, simulated_side="").status_code == 422  # lado sem padrao

    created = p4_request(analyst, case, note="Rodar com o domínio de tecnologia.")
    assert created.status_code == 201, created.text
    req = created.json()
    assert req["status"] == "awaiting_external" and req["pages"] >= 1 and req["run_id"] is None

    package = analyst.client.get(f"/api/v1/p4-requests/{req['id']}/package")
    assert package.status_code == 200
    body = package.content.decode("utf-8")
    assert body.startswith("<pagina> 1\n")
    import hashlib

    assert hashlib.sha256(package.content).hexdigest() == req["package_sha256"]
    assert outsider.client.get(f"/api/v1/p4-requests/{req['id']}/package").status_code == 404

    # Relatorio com lado diferente do pedido nao fecha o pedido.
    wrong = run_import(analyst, case, request_id=req["id"], simulated_side="claimant")
    assert wrong.status_code == 422
    assert wrong.json()["error"]["code"] == "p4_request_mismatch"

    done = run_import(analyst, case, request_id=req["id"])
    assert done.status_code == 201, done.text
    listed = analyst.client.get(f"/api/v1/opportunities/{case['opp']}/p4-requests").json()
    assert [(r["status"], r["run_id"]) for r in listed] == [("imported", done.json()["id"])]

    # Pedido encerrado nao e reaberto nem cancelado.
    assert run_import(analyst, case, request_id=req["id"]).status_code == 409
    assert analyst.client.post(f"/api/v1/p4-requests/{req['id']}/cancel").status_code == 409


def test_pedido_exige_texto_por_pagina_e_fica_desatualizado_com_nova_versao(analyst, case):
    from tests.conftest import make_pdf

    scanned = send(analyst, case["opp"], make_pdf(pages=1, text=None), "digitalizado.pdf")
    no_text = p4_request(analyst, case, document_version_id=scanned)
    assert no_text.status_code == 409
    assert no_text.json()["error"]["code"] == "document_text_missing"

    req = p4_request(analyst, case).json()
    cancelled = analyst.client.post(f"/api/v1/p4-requests/{req['id']}/cancel")
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"

    again = p4_request(analyst, case).json()
    doc_id = next(
        d["id"]
        for d in analyst.client.get(f"/api/v1/opportunities/{case['opp']}").json()["documents"]
        if any(v["id"] == case["source"] for v in d["versions"])
    )
    send(analyst, case["opp"], b"<pagina> 1\nTexto novo.\n", "autos-v2.txt", document_id=doc_id)
    listed = analyst.client.get(f"/api/v1/opportunities/{case['opp']}/p4-requests").json()
    current = next(r for r in listed if r["id"] == again["id"])
    assert current["stale"] is True  # o pacote nao representa mais o documento vigente
    assert p4_request(analyst, case).status_code == 409  # versao substituida
