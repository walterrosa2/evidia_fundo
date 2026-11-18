"""Contratos de motor e contraditorio (T003; AC05–AC08). Dados sinteticos, sem motor real."""

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from evidia.domain.engines import (
    EngineContractViolation,
    can_promote_to_validated,
    citation_pendencies,
    compare_scenarios,
    nulidade_run_status,
)
from evidia.fixtures import engines as fx
from evidia.schemas_engines import (
    Citation,
    EngineBlock,
    EngineRunOut,
    FindingOut,
    ScenarioArgument,
    ScenarioSideView,
)

OK = EngineBlock(key="a", status="completed")
FAILED = EngineBlock(key="b", status="failed")
SKIPPED = EngineBlock(key="c", status="skipped")


@pytest.mark.parametrize(
    ("state", "blocks", "expected"),
    [
        ("processing", [], "running"),
        ("completed", [OK], "completed"),
        ("completed_no_findings", [OK], "completed"),
        ("completed_partial", [OK], "partial"),
        ("error", [], "failed"),
        # O rotulo do motor nao prevalece sobre o bloco falho ou pulado.
        ("completed", [OK, FAILED], "partial"),
        ("completed_no_findings", [OK, SKIPPED], "partial"),
    ],
)
def test_ac06_estado_da_execucao_nunca_conclui_com_bloco_falho(state, blocks, expected):
    assert nulidade_run_status(state, blocks) == expected


def test_estado_desconhecido_do_motor_e_violacao_e_nao_sucesso():
    with pytest.raises(EngineContractViolation):
        nulidade_run_status("done", [OK])


def test_ac06_schema_recusa_execucao_concluida_com_bloco_falho():
    run = fx.partial_run()
    assert run.status == "partial" and run.engine_status == "completed"
    assert [b.key for b in run.blocks if b.status != "completed"] == ["pilar_02"]
    with pytest.raises(ValidationError, match="bloco falho"):
        EngineRunOut.model_validate({**run.model_dump(), "status": "completed"})


def test_lado_simulado_e_obrigatorio_e_exige_quem_confirmou():
    data = fx.partial_run().model_dump()
    for field in ("simulated_side", "side_confirmed_by"):
        with pytest.raises(ValidationError):
            EngineRunOut.model_validate({k: v for k, v in data.items() if k != field})
    with pytest.raises(ValidationError):
        EngineRunOut.model_validate({**data, "simulated_side": "Polo Passivo"})


def test_custo_desconhecido_e_nulo_e_nao_zero():
    run = fx.partial_run()
    assert run.cost_amount is None and run.cost_currency is None
    data = run.model_dump()
    known = EngineRunOut.model_validate({**data, "cost_amount": "0", "cost_currency": "BRL"})
    assert known.cost_amount == 0  # zero so quando informado, com moeda
    with pytest.raises(ValidationError, match="custo e moeda"):
        EngineRunOut.model_validate({**data, "cost_amount": "1.50"})
    with pytest.raises(ValidationError):
        EngineRunOut.model_validate({**data, "cost_amount": 1.5, "cost_currency": "BRL"})


def test_ac05_achado_sem_citacao_nasce_pendente_e_nao_pode_ser_validado():
    finding = fx.finding_without_citation()
    assert [p.code for p in finding.pendencies] == ["evidence_pending"]
    assert can_promote_to_validated(finding.pendencies) is False
    data = finding.model_dump()
    with pytest.raises(ValidationError, match="não pode estar validado"):
        FindingOut.model_validate({**data, "review_state": "validated"})
    with pytest.raises(ValidationError, match="evidence_pending"):
        FindingOut.model_validate({**data, "pendencies": []})
    # O original do motor e preservado sem alteracao.
    assert finding.original == {"exemplo_sintetico": True}


def test_ac05_citacao_precisa_resolver_documento_e_pagina_do_dossie():
    pages = {"v1": 12, "sem-paginas": None}
    assert citation_pendencies([Citation(document_version_id="v1", page_start=12)], pages) == []
    assert (
        citation_pendencies([Citation(document_version_id="sem-paginas", page_start=40)], pages)
        == []
    )
    out = citation_pendencies(
        [
            Citation(document_version_id="v1", page_start=10, page_end=13),
            Citation(document_version_id="de-outro-dossie", page_start=1),
        ],
        pages,
    )
    assert [p.code for p in out] == ["page_out_of_range", "citation_unresolved"]
    assert can_promote_to_validated(out) is False
    with pytest.raises(ValidationError):
        Citation(document_version_id="v1", page_start=5, page_end=4)


def test_rf06_argumento_sem_evidencia_fica_como_hipotese():
    supported, hypothesis = fx.claimant_only_scenario().arguments
    assert supported.status == "supported" and hypothesis.status == "hypothesis_for_validation"
    data = hypothesis.model_dump()
    with pytest.raises(ValidationError, match="hypothesis_for_validation"):
        ScenarioArgument.model_validate({**data, "status": "supported"})
    with pytest.raises(ValidationError, match="source_evidence"):
        ScenarioArgument.model_validate({**data, "origin": "source_evidence"})
    with pytest.raises(ValidationError, match="contra si mesmo"):
        ScenarioArgument.model_validate({**data, "against": data["formulated_by"]})


def test_ac07_so_o_autor_concluido_deixa_o_reu_como_nao_analisado():
    run = fx.claimant_only_scenario()
    out = compare_scenarios(run.opportunity_id, run.plea_id, 3, [run])
    assert out.claimant.status == "completed" and out.claimant.arguments_count == 2
    assert out.claimant.hypotheses_count == 1
    assert out.defendant.status == "not_analyzed"
    # Sem contagem, risco ou probabilidade substituta para o lado ausente.
    assert out.defendant.model_dump(exclude={"side", "status"}) == {
        "run_id": None,
        "arguments_count": None,
        "hypotheses_count": None,
        "participants": [],
    }
    assert out.comparable is False
    assert any("réu não analisado" in text for text in out.limitations)
    with pytest.raises(ValidationError):
        ScenarioSideView(side="defendant", status="not_analyzed", arguments_count=0)


def _defendant_run(base, **changes):
    argument = base.arguments[0].model_copy(
        update={
            "id": "arg-reu",
            "formulated_by": base.arguments[0].against,
            "against": base.arguments[0].formulated_by,
        }
    )
    return base.model_copy(
        update={"id": "run-reu", "simulated_side": "defendant", "arguments": [argument], **changes}
    )


def test_ac08_comparacao_preserva_os_dois_cenarios_e_compartilha_so_a_evidencia_original():
    claimant = fx.claimant_only_scenario()
    defendant = _defendant_run(claimant)
    out = compare_scenarios(claimant.opportunity_id, claimant.plea_id, 3, [claimant, defendant])
    assert out.comparable is True and out.limitations == []
    assert (out.claimant.run_id, out.defendant.run_id) == (claimant.id, "run-reu")
    # A fonte comum e a versao de documento citada pelos dois; argumentos nao migram.
    assert out.common_sources == [claimant.arguments[0].citations[0].document_version_id]
    assert (out.claimant.arguments_count, out.defendant.arguments_count) == (2, 1)
    # A comparacao nao recebe posicao economica: a ordem das execucoes tambem nao a altera.
    again = compare_scenarios(claimant.opportunity_id, claimant.plea_id, 3, [defendant, claimant])
    assert again == out


def test_cenario_de_versao_anterior_do_dossie_fica_desatualizado_e_nao_comparavel():
    claimant = fx.claimant_only_scenario()
    defendant = _defendant_run(claimant)
    out = compare_scenarios(claimant.opportunity_id, claimant.plea_id, 4, [claimant, defendant])
    assert out.claimant.status == "stale" and out.defendant.status == "stale"
    assert out.comparable is False
    # A execucao mais recente de cada lado e a que vale; outro pedido nao entra.
    later = datetime(2026, 11, 18, tzinfo=UTC)
    rerun = claimant.model_copy(
        update={
            "id": "run-novo",
            "dossier_version": 4,
            "created_at": later,
            "finished_at": later + timedelta(minutes=1),
        }
    )
    other_plea = claimant.model_copy(update={"id": "outro", "plea_id": "outro-pedido"})
    out = compare_scenarios(
        claimant.opportunity_id, claimant.plea_id, 4, [claimant, rerun, other_plea, defendant]
    )
    assert out.claimant.status == "completed" and out.claimant.run_id == "run-novo"
    running = _defendant_run(claimant, status="running", dossier_version=4, created_at=later)
    out = compare_scenarios(claimant.opportunity_id, claimant.plea_id, 4, [rerun, running])
    assert out.defendant.status == "running" and out.comparable is False


def test_exemplos_exportados_se_declaram_sinteticos_e_simulados():
    examples = fx.build_examples()
    assert "SINTÉTICOS" in examples["_aviso"]
    assert examples["execucao_parcial"]["is_mock"] is True
    assert examples["execucao_parcial"]["is_synthetic"] is True
    assert examples["comparacao_so_com_autor"]["defendant"]["status"] == "not_analyzed"
