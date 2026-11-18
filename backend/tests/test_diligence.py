"""Diligencia de vinculos (T011, T012): RF07–RF12, AC09–AC12. Dados sinteticos.

A fonte externa e o conector sintetico rotulado; nenhuma fonte real e consultada.
"""

import csv
import io
from datetime import date, timedelta

import pytest

from evidia.adapters.diligence import DisabledDiligenceConnector, FixtureDiligenceConnector
from evidia.domain import diligence as rules
from evidia.services.diligence import today
from tests.conftest import make_pdf, upload


@pytest.fixture
def source(app):
    app.state.diligence_connector = FixtureDiligenceConnector()
    return app.state.diligence_connector


def person(actor, opp: str, name: str, **fields) -> dict:
    resp = actor.client.post(
        f"/api/v1/opportunities/{opp}/participants", json={"name": name, **fields}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def role(actor, participant_id: str, **fields) -> dict:
    resp = actor.client.post(f"/api/v1/participants/{participant_id}/roles", json=fields)
    assert resp.status_code == 201, resp.text
    return resp.json()


def people(actor, opp: str) -> dict[str, dict]:
    listed = actor.client.get(f"/api/v1/opportunities/{opp}/participants").json()
    return {p["id"]: p for p in listed}


def search(actor, opp: str, participant_id: str, **body):
    return actor.client.post(
        f"/api/v1/opportunities/{opp}/diligence-searches",
        json={"participant_id": participant_id, **body},
    )


def crosscheck(actor, opp: str) -> dict:
    resp = actor.client.get(f"/api/v1/opportunities/{opp}/diligence/crosscheck")
    assert resp.status_code == 200, resp.text
    return resp.json()


def occurrence(actor, opp: str, **body):
    return actor.client.post(f"/api/v1/opportunities/{opp}/occurrences", json=body)


def review(actor, occurrence_id: str, **body):
    return actor.client.post(f"/api/v1/occurrences/{occurrence_id}/reviews", json=body)


def confirm(reviewer, participant_id: str) -> None:
    resp = reviewer.client.patch(
        f"/api/v1/participants/{participant_id}",
        json={"identity_status": "confirmed", "identity_note": "Conferido com o CREA informado."},
    )
    assert resp.status_code == 200, resp.text


EXPERT = {
    "specialty": "Engenharia",
    "identifiers": [{"type": "crea", "value": "000001", "uf": "SP"}],
}
CNJ = "9000001-80.2024.8.26.0100"


# ------------------------------------------------------------------ dominio


def test_rf08_janela_de_cinco_anos_e_inclusiva_e_usa_a_data_do_ato():
    start, end = rules.window_for(date(2026, 11, 16))
    assert (start, end) == (date(2021, 11, 16), date(2026, 11, 16))
    assert rules.window_for(date(2024, 2, 29))[0] == date(2019, 2, 28)
    assert rules.classify_event(date(2021, 11, 16), start, end) == "in_window"
    assert rules.classify_event(date(2021, 11, 15), start, end) == "out_of_window"
    assert rules.classify_event(None, start, end) == "undated"


def test_ac09_homonimo_so_e_a_mesma_pessoa_com_identificador_forte_identico():
    oab = [{"type": "oab", "value": "12.345", "uf": "sp"}]
    assert rules.same_identity(oab, [{"type": "oab", "value": "12345", "uf": "SP"}])
    assert not rules.same_identity(oab, [{"type": "oab", "value": "12345", "uf": "RJ"}])
    assert not rules.same_identity([], [])
    assert not rules.same_identity(
        [{"type": "other", "value": "x"}], [{"type": "other", "value": "x"}]
    )
    groups = rules.homonym_groups(
        [
            rules.Person("a", "João da Silva"),
            rules.Person("b", "JOAO DA SILVA"),
            rules.Person("c", "João da Silva", oab),
            rules.Person("d", "Joao da  Silva", oab),
            rules.Person("e", "Maria Souza"),
        ]
    )
    # c e d compartilham OAB: nao sao homonimos pendentes. a e b seguem sem resolver.
    assert groups == [["a", "b"]]


def test_registro_atual_nao_prova_habilitacao_na_data_do_ato_e_arquivado_nao_e_sancao():
    act = date(2022, 5, 10)
    assert rules.qualification_status(date(2020, 1, 1), None, act) == "covered"
    assert rules.qualification_status(date(2023, 1, 1), None, act) == "not_covered"
    assert rules.qualification_status(date(2015, 1, 1), date(2021, 12, 31), act) == "not_covered"
    assert rules.qualification_status(None, None, act) == "unknown"  # lacuna historica visivel
    assert rules.is_current_sanction("sanction_in_force") is True
    for status in ("archived", "acquitted", "ongoing", "sanction_served", None):
        assert rules.is_current_sanction(status) is False


# ------------------------------------------------- identidade e homonimos


def test_ac09_homonimos_ficam_separados_e_uniao_e_ato_de_revisor_que_pode_ser_desfeito(
    analyst, reviewer, outsider, actor_factory, opportunity
):
    opp = opportunity["opportunity_id"]
    first = person(analyst, opp, "Perito Homônimo")
    second = person(analyst, opp, "PERITO HOMONIMO")
    role(analyst, first["id"], cnj=CNJ, role="court_expert", side="court", event_date="2024-03-01")
    role(analyst, second["id"], cnj="outro processo", role="court_expert", side="court")

    listed = people(analyst, opp)
    assert listed[first["id"]]["homonym_ids"] == [second["id"]]
    assert listed[first["id"]]["identity_status"] == "candidate"
    assert len(listed[first["id"]]["roles"]) == 1 and len(listed[second["id"]]["roles"]) == 1

    merge = {"into_participant_id": first["id"], "reason": "Mesmo CPF conferido na procuração."}
    url = f"/api/v1/participants/{second['id']}/merge"
    assert analyst.client.post(url, json=merge).status_code == 403
    assert reviewer.client.post(url, json={**merge, "reason": ""}).status_code == 422
    assert outsider.client.post(url, json=merge).status_code == 404
    merged = reviewer.client.post(url, json=merge)
    assert merged.status_code == 200, merged.text
    assert len(merged.json()["roles"]) == 2
    assert list(people(analyst, opp)) == [first["id"]]  # a ficha unida sai da lista

    undone = reviewer.client.post(f"/api/v1/participants/{second['id']}/unmerge")
    assert undone.status_code == 200 and len(undone.json()["roles"]) == 1
    assert len(people(analyst, opp)[first["id"]]["roles"]) == 1

    # Confirmar identidade exige revisor e a base da confirmacao.
    patch = f"/api/v1/participants/{first['id']}"
    assert analyst.client.patch(patch, json={"identity_status": "confirmed"}).status_code == 403
    no_basis = reviewer.client.patch(patch, json={"identity_status": "confirmed"})
    assert no_basis.status_code == 422
    assert no_basis.json()["error"]["code"] == "identity_basis_required"
    viewer = actor_factory("Org A", "leitor.a", "viewer")
    create = viewer.client.post(f"/api/v1/opportunities/{opp}/participants", json={"name": "Xis"})
    assert create.status_code == 403
    assert outsider.client.get(f"/api/v1/opportunities/{opp}/participants").status_code == 404


def test_papel_citado_em_documento_do_dossie_precisa_de_pagina_existente(analyst, opportunity):
    opp = opportunity["opportunity_id"]
    pdf = upload(analyst, opp, make_pdf(pages=2), filename="nomeacao.pdf").json()
    expert = person(analyst, opp, "Perita Sintética Dois")
    url = f"/api/v1/participants/{expert['id']}/roles"
    base = {"cnj": CNJ, "role": "court_expert", "document_version_id": pdf["version"]["id"]}
    cited = analyst.client.post(url, json={**base, "page_start": 2})
    assert cited.status_code == 201 and cited.json()["source_kind"] == "dossier"
    for body in (
        {**base, "page_start": 3},
        base,
        {**base, "document_version_id": "x", "page_start": 1},
    ):
        resp = analyst.client.post(url, json=body)
        assert resp.status_code == 422 and resp.json()["error"]["code"] == "invalid_citation"
    assert analyst.client.delete(f"/api/v1/process-roles/{cited.json()['id']}").status_code == 204


# -------------------------------------------------------------- pesquisas


def test_pesquisa_guarda_janela_cobertura_e_nao_duplica_ao_repetir(analyst, opportunity, source):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Sintético Um", **EXPERT)
    first = search(analyst, opp, expert["id"])
    assert first.status_code == 201, first.text
    body = first.json()
    start, end = rules.window_for(today())
    assert body["status"] == "completed" and body["results_count"] == 4
    assert (body["window_start"], body["window_end"]) == (start.isoformat(), end.isoformat())
    assert body["timezone"] == "America/Sao_Paulo" and body["filter_field"] == "filing_date"
    assert "não é integral" in body["coverage"] and body["is_synthetic"] is True

    listed = people(analyst, opp)
    assert len(listed[expert["id"]]["roles"]) == 4
    names = sorted(p["name"] for p in listed.values())
    # Juiz, advogada e parte: uma ficha cada, embora aparecam em varios processos.
    assert names == [
        "Advogada Sintética Um",
        "Magistrado Sintético Um",
        "Perito Sintético Um",
        "Ré Sintética Beta S.A.",
    ]
    assert all(p["identity_status"] == "candidate" for p in listed.values())

    again = search(analyst, opp, expert["id"]).json()
    assert again["id"] != body["id"]  # cada consulta fica registrada
    assert len(people(analyst, opp)) == 4
    assert len(people(analyst, opp)[expert["id"]]["roles"]) == 4

    # Um homonimo cadastrado a mao NAO e unido ao juiz que veio da fonte (AC09).
    manual = person(analyst, opp, "Magistrado Sintético Um")
    search(analyst, opp, expert["id"])
    listed = people(analyst, opp)
    assert len(listed) == 5 and listed[manual["id"]]["roles"] == []
    assert len(listed[manual["id"]]["homonym_ids"]) == 1


def test_falha_de_fonte_nao_e_ausencia_de_resultado(app, analyst, opportunity, source):
    opp = opportunity["opportunity_id"]
    down = person(analyst, opp, "Perito Fonte Fora")
    unknown = person(analyst, opp, "Perita Sem Registros")
    role(analyst, down["id"], cnj=CNJ, role="court_expert", side="court", event_date="2024-03-01")
    role(analyst, unknown["id"], cnj=CNJ, role="party_assistant", side="claimant")

    failed = search(analyst, opp, down["id"]).json()
    assert failed["status"] == "failed" and failed["error_code"] == "diligence_unavailable"
    assert failed["results_count"] == 0 and "não permite conclusão" in failed["coverage"]
    empty = search(analyst, opp, unknown["id"]).json()
    assert empty["status"] == "no_results" and empty["error_code"] is None
    assert "não é integral" in empty["coverage"]

    out = crosscheck(analyst, opp)
    text = " ".join(out["limitations"])
    assert "não foi possível consultar a fonte" in text and "não indica ausência de vínculo" in text

    app.state.diligence_connector = DisabledDiligenceConnector()
    off = search(analyst, opp, down["id"])
    assert off.status_code == 503 and off.json()["error"]["code"] == "diligence_not_configured"
    listed = analyst.client.get(f"/api/v1/opportunities/{opp}/diligence-searches").json()
    assert len(listed) == 2  # integracao desligada nao registra consulta


# ------------------------------------------------------------- cruzamentos


def test_ac10_atuacao_na_janela_em_processo_antigo_entra_e_recorrencia_tem_denominador(
    analyst, opportunity, source
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Sintético Um", **EXPERT)
    search(analyst, opp, expert["id"])
    out = crosscheck(analyst, opp)
    subject = out["subjects"][0]
    assert subject["name"] == "Perito Sintético Um" and len(out["subjects"]) == 1

    judge = [c for c in subject["cooccurrences"] if c["other_name"] == "Magistrado Sintético Um"]
    by_cnj = {c["cnj"]: c for c in judge}
    old = by_cnj["9000011-10.2018.8.26.0100"]
    # Processo distribuido antes da janela, atuacao dentro dela: entra, com a data do ato.
    assert old["timing"] == "in_window" and old["filed_before_window"] is True
    assert by_cnj["9000012-55.2024.8.26.0100"]["filed_before_window"] is False
    assert by_cnj["9000013-90.2019.8.26.0100"]["timing"] == "out_of_window"
    undated = [c for c in subject["cooccurrences"] if c["timing"] == "undated"]
    assert [c["other_name"] for c in undated] == ["Advogada Sintética Um"]

    recurrences = {r["other_name"]: r for r in subject["recurrences"]}
    # Evento fora da janela e evento sem data nao entram na contagem.
    assert (
        recurrences["Magistrado Sintético Um"]["count"],
        recurrences["Magistrado Sintético Um"]["universe"],
    ) == (2, 2)
    assert recurrences["Advogada Sintética Um"]["count"] == 1
    assert all(r["expected"] is False for r in recurrences.values())

    text = " ".join(out["limitations"])
    assert "filtra pela data de distribuição" in text
    assert "identidade ainda não confirmada" in text and "atuações sem data" in text
    # Nenhuma palavra de juizo sobre a frequencia.
    assert "anormal" not in str(out) and "suspei" not in str(out)


def test_ac11_assistente_com_a_parte_que_o_indicou_e_relacao_esperada(analyst, opportunity):
    opp = opportunity["opportunity_id"]
    assistant = person(analyst, opp, "Assistente Sintético da Ré")
    court_expert = person(analyst, opp, "Perita Sintética do Juízo")
    party = person(analyst, opp, "Ré Sintética Beta S.A.", kind="company")
    lawyer = person(analyst, opp, "Advogado Sintético da Ré")
    author_lawyer = person(analyst, opp, "Advogada Sintética da Autora")
    when = (today() - timedelta(days=200)).isoformat()
    role(
        analyst, assistant["id"], cnj=CNJ, role="party_assistant", side="defendant", event_date=when
    )
    role(analyst, court_expert["id"], cnj=CNJ, role="court_expert", side="court", event_date=when)
    role(analyst, party["id"], cnj=CNJ, role="party", side="defendant")
    role(analyst, lawyer["id"], cnj=CNJ, role="lawyer", side="defendant")
    role(analyst, author_lawyer["id"], cnj=CNJ, role="lawyer", side="claimant")

    subjects = {s["name"]: s for s in crosscheck(analyst, opp)["subjects"]}
    mine = {
        c["other_name"]: c["expected"]
        for c in subjects["Assistente Sintético da Ré"]["cooccurrences"]
    }
    assert mine == {
        "Ré Sintética Beta S.A.": True,
        "Advogado Sintético da Ré": True,
        "Advogada Sintética da Autora": False,
    }
    assert all(
        r["expected"] is (r["other_name"] != "Advogada Sintética da Autora")
        for r in subjects["Assistente Sintético da Ré"]["recurrences"]
    )
    # O perito do juizo nao tem relacao esperada com parte alguma.
    assert not any(c["expected"] for c in subjects["Perita Sintética do Juízo"]["cooccurrences"])
    assert subjects["Perita Sintética do Juízo"]["searches"] == []


# -------------------------------------------------------------- ocorrencias


def test_ocorrencia_nasce_candidata_e_so_valida_com_identidade_fonte_e_fundamento(
    analyst, reviewer, outsider, opportunity
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Sintético Um", **EXPERT)
    judge = person(analyst, opp, "Magistrado Sintético Um")
    created = occurrence(
        analyst,
        opp,
        kind="cooccurrence",
        relation="expert_judge",
        subject_participant_id=expert["id"],
        related_participant_id=judge["id"],
        cnj=CNJ,
        fact_date=(today() - timedelta(days=300)).isoformat(),
        sheet={
            "what_found": "Atuaram no mesmo processo.",
            "does_not_allow": "Afirmar parcialidade.",
        },
    )
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["state"] == "identity_pending" and item["timing"] == "in_window"
    assert {b["code"] for b in item["validation_blockers"]} == {
        "identity_not_confirmed",
        "source_missing",
    }
    blocked = review(reviewer, item["id"], state="validated", comment="Conferido.")
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "validation_blocked"
    assert review(analyst, item["id"], state="in_review").status_code == 403
    assert review(outsider, item["id"], state="in_review").status_code == 404

    confirm(reviewer, expert["id"])
    sourced = occurrence(
        analyst,
        opp,
        kind="cooccurrence",
        relation="expert_judge",
        subject_participant_id=expert["id"],
        related_participant_id=judge["id"],
        cnj=CNJ,
        source_url="https://exemplo.invalid/ato-de-nomeacao",
        material_hash="a" * 64,
    ).json()
    assert sourced["state"] == "candidate" and sourced["validation_blockers"] == []
    assert review(reviewer, sourced["id"], state="validated").status_code == 422
    # Encaminhar ao juridico exige validacao antes.
    early = review(reviewer, sourced["id"], state="forwarded_legal")
    assert early.status_code == 409
    assert [b["code"] for b in early.json()["error"]["details"]["blockers"]] == ["not_validated"]

    ok = review(reviewer, sourced["id"], state="validated", comment="Ato de nomeação conferido.")
    assert ok.status_code == 200 and ok.json()["state"] == "validated"
    forwarded = review(reviewer, sourced["id"], state="forwarded_legal")
    assert forwarded.json()["state"] == "forwarded_legal"
    # Conclusao revisada pode ser reaberta com contraprova; o historico e preservado.
    reopened = review(
        reviewer,
        sourced["id"],
        state="contested",
        sheet={"contrary_evidence": "O ato foi revogado antes da perícia."},
        comment="Contraprova juntada.",
    ).json()
    assert reopened["state"] == "contested"
    assert [r["after"]["state"] for r in reopened["reviews"]] == [
        "validated",
        "forwarded_legal",
        "contested",
    ]
    assert reopened["sheet"]["contrary_evidence"].startswith("O ato foi revogado")

    bad_hash = occurrence(
        analyst, opp, kind="other", subject_participant_id=expert["id"], material_hash="xyz"
    )
    assert bad_hash.status_code == 422


def test_ac12_material_social_sem_data_ou_autoria_nao_vira_vinculo_confirmado(
    analyst, reviewer, opportunity
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Sintético Um", **EXPERT)
    confirm(reviewer, expert["id"])
    photo = occurrence(
        analyst,
        opp,
        kind="social",
        subject_participant_id=expert["id"],
        source_url="https://exemplo.invalid/foto",
        sheet={"what_found": "Fotografia conjunta em evento."},
    ).json()
    assert {b["code"] for b in photo["validation_blockers"]} == {
        "social_content_date_missing",
        "social_author_attributed_missing",
        "social_relevance_justification_missing",
    }
    blocked = review(reviewer, photo["id"], state="validated", comment="Parece ser ele.")
    assert blocked.status_code == 409
    # As lacunas ficam registradas; a ocorrencia segue como nao confirmada.
    partial = review(
        reviewer,
        photo["id"],
        state="inconclusive",
        sheet={
            "what_found": "Fotografia conjunta em evento.",
            "missing_to_verify": "Data e autoria.",
        },
    ).json()
    assert partial["state"] == "inconclusive" and len(partial["validation_blockers"]) == 3

    complete = review(
        reviewer,
        photo["id"],
        state="validated",
        comment="Publicação institucional conferida.",
        sheet={
            "what_found": "Fotografia conjunta em evento.",
            "content_date": "2024-06-01",
            "author_attributed": "Página institucional do evento",
            "relevance_justification": "Evento ocorreu durante a perícia.",
            "does_not_allow": "Concluir amizade íntima ou parcialidade.",
        },
    )
    assert complete.status_code == 200 and complete.json()["state"] == "validated"


def test_procedimento_arquivado_nao_e_sancao_e_qualificacao_e_medida_na_data_do_fato(
    analyst, reviewer, opportunity
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Sintético Um", **EXPERT)
    confirm(reviewer, expert["id"])
    base = {
        "subject_participant_id": expert["id"],
        "source_url": "https://exemplo.invalid/conselho",
    }

    no_status = occurrence(analyst, opp, kind="disciplinary", **base).json()
    assert [b["code"] for b in no_status["validation_blockers"]] == ["proceeding_status_missing"]
    archived = occurrence(
        analyst, opp, kind="disciplinary", sheet={"proceeding_status": "archived"}, **base
    ).json()
    in_force = occurrence(
        analyst, opp, kind="disciplinary", sheet={"proceeding_status": "sanction_in_force"}, **base
    ).json()
    assert archived["is_current_sanction"] is False and in_force["is_current_sanction"] is True

    act = (today() - timedelta(days=6 * 366)).isoformat()
    later_registry = occurrence(
        analyst,
        opp,
        kind="qualification",
        fact_date=act,
        sheet={"registry_valid_from": today().isoformat()},
        **base,
    ).json()
    # Registro obtido depois do ato nao cobre o ato; e o fato esta fora da janela.
    assert later_registry["qualification_status"] == "not_covered"
    assert later_registry["timing"] == "out_of_window"
    unknown = occurrence(analyst, opp, kind="qualification", fact_date=act, **base).json()
    assert unknown["qualification_status"] == "unknown"


def test_rf12_dossie_exportado_rotula_o_que_nao_foi_validado_e_neutraliza_formulas(
    analyst, reviewer, outsider, opportunity
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "=Perito Sintético", **EXPERT)
    confirm(reviewer, expert["id"])
    base = {"subject_participant_id": expert["id"], "source_url": "https://exemplo.invalid/a"}
    pending = occurrence(
        analyst,
        opp,
        kind="other",
        sheet={"what_found": "Indício A.", "does_not_allow": "Afirmar vínculo."},
        **base,
    ).json()
    valid = occurrence(
        analyst, opp, kind="other", sheet={"what_found": "Indício B."}, **base
    ).json()
    review(reviewer, valid["id"], state="validated", comment="Conferido na fonte.")

    resp = analyst.client.get(f"/api/v1/opportunities/{opp}/diligence/export")
    assert resp.status_code == 200 and resp.headers["content-type"].startswith("text/csv")
    rows = list(csv.reader(io.StringIO(resp.content.decode("utf-8-sig")), delimiter=";"))
    assert rows[0][:3] == ["Situação", "Tipo", "Profissional"]
    assert rows[0][7:12] == [
        "O que foi encontrado",
        "O que permite afirmar",
        "O que não permite afirmar",
        "O que falta verificar",
        "Possível impacto se confirmado",
    ]
    by_found = {row[7]: row for row in rows[1:]}
    assert by_found["Indício A."][0] == "Candidata (não validada)"
    assert by_found["Indício B."][0] == "Validada"
    assert (
        by_found["Indício A."][2] == "'=Perito Sintético"
        and by_found["Indício A."][9] == "Afirmar vínculo."
    )
    assert outsider.client.get(f"/api/v1/opportunities/{opp}/diligence/export").status_code == 404
    assert outsider.client.get(f"/api/v1/opportunities/{opp}/occurrences").status_code == 404
    assert pending["id"] != valid["id"]


def test_tabelas_comuns_da_diligencia_sao_escopadas_ao_dossie(
    analyst, outsider, opportunity, source
):
    import json

    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Sintético Um", **EXPERT)
    search(analyst, opp, expert["id"])
    occurrence(
        analyst,
        opp,
        kind="other",
        subject_participant_id=expert["id"],
        sheet={"what_found": "Indício sintético."},
    )

    def table(actor, key: str, **spec):
        return actor.client.get(
            f"/api/v1/tables/{key}/rows", params={"q": json.dumps({"scope_id": opp, **spec})}
        )

    roles = table(analyst, "process_roles").json()
    assert roles["total"] == 10  # perito 4, juiz 3, advogada 2, parte 1
    # Ordem padrao: ato mais recente primeiro; atuacao sem data fica no fim.
    dated = [r["values"]["event_date"] for r in roles["rows"] if r["values"]["event_date"]]
    assert dated == sorted(dated, reverse=True)
    assert roles["rows"][-1]["values"]["event_date"] is None
    judges = table(
        analyst, "process_roles", filters=[{"column": "role", "values": ["judge"]}]
    ).json()
    assert judges["total"] == 3
    assert {r["values"]["participant"] for r in judges["rows"]} == {"Magistrado Sintético Um"}

    found = table(analyst, "occurrences").json()
    assert found["total"] == 1 and found["rows"][0]["values"]["state"] == "identity_pending"
    assert found["rows"][0]["values"]["what_found"] == "Indício sintético."
    for key in ("process_roles", "occurrences"):
        assert table(outsider, key).status_code == 404


# ----------------------------------------- resultado de fonte real por planilha


def result_sheet(rows: list[list], header: list[str] | None = None) -> bytes:
    import io

    from openpyxl import Workbook

    wb = Workbook()
    wb.active.append(
        header
        or [
            "Processo (CNJ)",
            "Tribunal",
            "Papel",
            "Lado",
            "Data do ato",
            "Ato",
            "Data de distribuição",
            "Referência na fonte",
        ]
    )
    for row in rows:
        wb.active.append(row)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def import_file(
    actor, opp: str, participant_id: str, content: bytes, name="resultado.xlsx", **body
):
    version = upload(actor, opp, content, filename=name, title=f"Consulta {name}").json()
    payload = {
        "participant_id": participant_id,
        "file_version_id": version["version"]["id"],
        "source_name": "Portal sintético do tribunal",
        "coverage": "Consulta por nome no portal; não cobre processos em segredo de justiça.",
        **body,
    }
    return actor.client.post(f"/api/v1/opportunities/{opp}/diligence-searches/file", json=payload)


def test_resultado_coletado_em_fonte_real_entra_por_planilha_com_procedencia(
    analyst, outsider, actor_factory, opportunity
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perito Real Sintético")
    year = date.today().year
    sheet = result_sheet(
        [
            [
                "1000001-11.2022.8.26.0100",
                "TJSP",
                "Perito",
                "Juízo",
                f"10/05/{year - 2}",
                "Nomeação",
                f"{year - 3}-01-15",
                "https://tribunal.invalid/p/1",
            ],
            [
                "1000002-22.2015.8.26.0100",
                "TJSP",
                "Assistente técnico",
                "Réu",
                None,
                "Parecer",
                None,
                "https://tribunal.invalid/p/2",
            ],
        ]
    )
    viewer = actor_factory("Org Teste", "leitor-planilha", "viewer")
    denied = outsider.client.post(
        f"/api/v1/opportunities/{opp}/diligence-searches/file",
        json={
            "participant_id": expert["id"],
            "file_version_id": "x",
            "source_name": "Portal",
            "coverage": "Consulta por nome no portal.",
        },
    )
    assert denied.status_code == 404

    done = import_file(analyst, opp, expert["id"], sheet)
    assert done.status_code == 201, done.text
    out = done.json()
    assert out["status"] == "completed" and out["results_count"] == 2
    assert out["connector"] == "arquivo: Portal sintético do tribunal"
    assert "segredo de justiça" in out["coverage"]  # a cobertura e a declarada por quem coletou
    assert out["filter_field"] == "event_date"

    people_now = analyst.client.get(f"/api/v1/opportunities/{opp}/participants").json()
    roles = next(p for p in people_now if p["id"] == expert["id"])["roles"]
    assert {(r["role"], r["source_ref"]) for r in roles} == {
        ("court_expert", "https://tribunal.invalid/p/1"),
        ("party_assistant", "https://tribunal.invalid/p/2"),
    }
    # Vinculo trazido por planilha nao nasce validado: nenhuma ocorrencia foi criada sozinha.
    assert analyst.client.get(f"/api/v1/opportunities/{opp}/occurrences").json() == []
    assert (
        viewer.client.post(
            f"/api/v1/opportunities/{opp}/diligence-searches/file",
            json={
                "participant_id": expert["id"],
                "file_version_id": "x",
                "source_name": "Portal",
                "coverage": "Consulta por nome no portal.",
            },
        ).status_code
        == 403
    )


def test_planilha_vazia_e_nada_encontrado_e_planilha_invalida_e_recusada_inteira(
    analyst, opportunity
):
    opp = opportunity["opportunity_id"]
    expert = person(analyst, opp, "Perita Sem Resultado Sintética")

    empty = import_file(analyst, opp, expert["id"], result_sheet([]), name="vazia.xlsx")
    assert empty.status_code == 201
    assert empty.json()["status"] == "no_results"  # consulta feita, nada encontrado nesta cobertura

    # Sem cobertura declarada, o vazio seria lido como "nenhum vinculo": recusado.
    no_coverage = import_file(
        analyst, opp, expert["id"], result_sheet([]), name="vazia2.xlsx", coverage="curta"
    )
    assert no_coverage.status_code == 422

    cases = {
        "cnj.xlsx": [["123", "TJSP", "Perito", "", None, "", None, "ref"]],
        "papel.xlsx": [
            ["1000001-11.2022.8.26.0100", "TJSP", "Testemunha", "", None, "", None, "r"]
        ],
        "data.xlsx": [["1000001-11.2022.8.26.0100", "TJSP", "Perito", "", "ontem", "", None, "r"]],
        "ref.xlsx": [["1000001-11.2022.8.26.0100", "TJSP", "Perito", "", None, "", None, ""]],
    }
    good = ["1000009-99.2021.8.26.0100", "TJSP", "Perito", "", None, "", None, "ref-ok"]
    for name, rows in cases.items():
        resp = import_file(analyst, opp, expert["id"], result_sheet([good, *rows]), name=name)
        assert resp.status_code == 422, name
        assert resp.json()["error"]["code"] == "diligence_file_invalid"
        assert "Linha 3" in resp.json()["error"]["message"]
    missing = import_file(
        analyst,
        opp,
        expert["id"],
        result_sheet([], header=["Processo (CNJ)", "Papel"]),
        name="colunas.xlsx",
    )
    assert "Referência na fonte" in missing.json()["error"]["message"]
    # Nenhuma linha boa das planilhas recusadas entrou.
    people_now = analyst.client.get(f"/api/v1/opportunities/{opp}/participants").json()
    assert next(p for p in people_now if p["id"] == expert["id"])["roles"] == []
