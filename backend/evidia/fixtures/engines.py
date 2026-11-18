"""Exemplos SINTETICOS dos contratos de motor e contraditorio (T003).

Nao sao saidas de motor real: nenhum motor foi executado para produzi-los. Servem para
fixar o formato e exercitar as regras de evidia.domain.engines sem custo.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from evidia.domain.engines import citation_pendencies, compare_scenarios, nulidade_run_status
from evidia.schemas_engines import (
    Citation,
    EngineBlock,
    EngineRunOut,
    FindingOut,
    ScenarioArgument,
    ScenarioRunOut,
)

AVISO = "DADOS SINTÉTICOS — exemplo de contrato; nenhum motor real foi executado"

_T0 = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)
_T1 = datetime(2026, 11, 17, 12, 5, tzinfo=UTC)
_OPP = "00000000-0000-4000-8000-000000000001"
_DOC = "00000000-0000-4000-8000-0000000000d1"
_USER = "00000000-0000-4000-8000-0000000000a1"
_AUTHOR = "00000000-0000-4000-8000-0000000000b1"
_DEFENDANT = "00000000-0000-4000-8000-0000000000b2"
_PLEA = "00000000-0000-4000-8000-0000000000c1"


def partial_run() -> EngineRunOut:
    """Execucao em que um bloco falhou: o motor rotulou 'completed', a Evidia mantem parcial."""
    blocks = [
        EngineBlock(key="pilar_01", label="Pilar 1 (sintético)", status="completed"),
        EngineBlock(
            key="pilar_02",
            label="Pilar 2 (sintético)",
            status="failed",
            message="Bloco sem resposta do provedor (exemplo sintético).",
        ),
    ]
    return EngineRunOut(
        id="00000000-0000-4000-8000-0000000000e1",
        opportunity_id=_OPP,
        dossier_version=3,
        engine="nulidade360",
        engine_version=None,
        checklist_version="sintetico-1",
        prompt_version="sintetico-1",
        model=None,
        input_hash="0" * 64,
        document_version_ids=[_DOC],
        simulated_side="defendant",
        side_confirmed_by=_USER,
        status=nulidade_run_status("completed", blocks),
        engine_status="completed",
        blocks=blocks,
        attempts=1,
        cost_amount=None,
        cost_currency=None,
        usage=None,
        limitations=["Pilar 2 não analisado: o parecer integral permanece indisponível."],
        request_id=None,
        is_mock=True,
        is_synthetic=True,
        created_at=_T0,
        started_at=_T0,
        finished_at=_T1,
    )


def finding_without_citation() -> FindingOut:
    """Achado gerado sem citacao resolvivel: nasce com pendencia e nao pode ser validado."""
    return FindingOut(
        id="00000000-0000-4000-8000-0000000000f1",
        run_id=partial_run().id,
        opportunity_id=_OPP,
        engine="nulidade360",
        block_key="pilar_01",
        title="Achado sintético sem página de origem",
        basis="Texto sintético de fundamento.",
        consequence_hypothesis="Hipótese sintética de consequência, a validar.",
        support_strength="not_assessed",
        risk_index=None,
        citations=[],
        pendencies=citation_pendencies([], {_DOC: 12}),
        review_state="pending",
        original={"exemplo_sintetico": True},
        is_synthetic=True,
    )


def claimant_only_scenario() -> ScenarioRunOut:
    return ScenarioRunOut(
        id="00000000-0000-4000-8000-0000000000e2",
        opportunity_id=_OPP,
        dossier_version=3,
        participant_id=_AUTHOR,
        plea_id=_PLEA,
        simulated_side="claimant",
        status="completed",
        arguments=[
            ScenarioArgument(
                id="00000000-0000-4000-8000-0000000000f2",
                formulated_by=_AUTHOR,
                against=_DEFENDANT,
                plea_id=_PLEA,
                origin="source_evidence",
                hypothesis="Argumento sintético apoiado na página 7 do documento.",
                citations=[Citation(document_version_id=_DOC, page_start=7)],
                status="supported",
            ),
            ScenarioArgument(
                id="00000000-0000-4000-8000-0000000000f3",
                formulated_by=_AUTHOR,
                against=_DEFENDANT,
                plea_id=_PLEA,
                origin="scenario_inference",
                hypothesis="Argumento sintético ainda sem evidência.",
                pendencies=citation_pendencies([], {_DOC: 12}),
                status="hypothesis_for_validation",
            ),
        ],
        is_mock=True,
        is_synthetic=True,
        created_at=_T0,
        finished_at=_T1,
    )


def build_examples() -> dict[str, Any]:
    comparison = compare_scenarios(_OPP, _PLEA, 3, [claimant_only_scenario()])
    return {
        "_aviso": AVISO,
        "execucao_parcial": partial_run().model_dump(mode="json"),
        "achado_sem_citacao": finding_without_citation().model_dump(mode="json"),
        "cenario_do_autor": claimant_only_scenario().model_dump(mode="json"),
        "comparacao_so_com_autor": comparison.model_dump(mode="json"),
    }
