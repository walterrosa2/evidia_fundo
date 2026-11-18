"""Regras puras de integracao de motores e de comparacao de cenarios (RF04–RF06).

Nenhuma chamada externa acontece aqui: sao as decisoes que os adaptadores (T008/T009) e os
cenarios (T010) terao de respeitar, testaveis sem custo.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping

from evidia.schemas_engines import (
    EVIDENCE_PENDING,
    Citation,
    EngineBlock,
    ParticipantScenario,
    Pendency,
    RunStatus,
    ScenarioComparisonOut,
    ScenarioRunOut,
    ScenarioSideView,
)


class EngineContractViolation(ValueError):
    """O motor devolveu algo fora do contrato conhecido. Nunca vira sucesso presumido."""


# Estados do Nulidade360 inventariados em specs/.../research.md (secao 4).
_NULIDADE_STATES: dict[str, RunStatus] = {
    "processing": "running",
    "completed": "completed",
    "completed_no_findings": "completed",
    "completed_partial": "partial",
    "error": "failed",
}


def nulidade_run_status(engine_state: str, blocks: Iterable[EngineBlock]) -> RunStatus:
    """Estado da execucao na Evidia a partir do rotulo do motor e dos blocos.

    Bloco falho ou pulado rebaixa 'concluido' para 'parcial' mesmo que o rotulo do motor
    diga o contrario (AC06). Rotulo desconhecido e violacao de contrato, nao sucesso.
    """
    status = _NULIDADE_STATES.get(engine_state)
    if status is None:
        raise EngineContractViolation(f"Estado desconhecido do Nulidade360: {engine_state!r}.")
    if status == "completed" and any(block.status != "completed" for block in blocks):
        return "partial"
    return status


def citation_pendencies(
    citations: Iterable[Citation], page_counts: Mapping[str, int | None]
) -> list[Pendency]:
    """Pendencias de evidencia de um achado ou argumento (AC05).

    `page_counts` mapeia cada versao de documento do dossie para a contagem real de paginas
    (nulo quando o formato nao tem paginas). Citacao a versao que nao esta no dossie, ou a
    pagina que o arquivo nao tem, nao e resolvivel.
    """
    citations = list(citations)
    if not citations:
        return [
            Pendency(
                code=EVIDENCE_PENDING,
                message="Sem citação resolvível (documento e página): pendente de evidência.",
            )
        ]
    out: list[Pendency] = []
    for citation in citations:
        if citation.document_version_id not in page_counts:
            out.append(
                Pendency(
                    code="citation_unresolved",
                    message="A citação aponta para um documento que não está neste dossiê.",
                )
            )
            continue
        pages = page_counts[citation.document_version_id]
        last = citation.page_end or citation.page_start
        if pages is not None and last > pages:
            out.append(
                Pendency(
                    code="page_out_of_range",
                    message=f"Página {last} não existe: o arquivo citado tem {pages}.",
                )
            )
    return out


def finding_validation_blockers(
    pendencies: Iterable[Pendency], *, is_mock: bool, stale: bool
) -> list[Pendency]:
    """O que impede validar um achado de motor (AC05, RF04).

    Alem das pendencias de evidencia: achado de execucao simulada e dado de teste, e
    achado de execucao desatualizada nao representa o dossie atual.
    """
    blockers = list(pendencies)
    if is_mock:
        blockers.append(
            Pendency(
                code="mock_run",
                message=(
                    "Achado gerado em modo simulado do motor: é dado de teste e não "
                    "representa análise do documento."
                ),
            )
        )
    if stale:
        blockers.append(
            Pendency(
                code="stale_run",
                message="Achado de execução anterior a uma mudança no dossiê; execute de novo.",
            )
        )
    return blockers


def can_promote_to_validated(pendencies: Iterable[Pendency]) -> bool:
    """Achado so pode ser validado sem pendencia alguma; a promocao nunca e automatica."""
    return not list(pendencies)


def _run_status(run: ScenarioRunOut, dossier_version: int) -> str:
    if run.status in ("queued", "running"):
        return "running"
    if run.status == "cancelled":
        return "failed"
    if run.dossier_version != dossier_version:
        # Resultado continua consultavel, mas nao representa o dossie atual.
        return "stale"
    return run.status


def _aggregate(statuses: list[str]) -> str:
    """Estado de um lado com varios participantes: so e 'concluido' se todos estiverem."""
    if all(status == "not_analyzed" for status in statuses):
        return "not_analyzed"
    if all(status == "completed" for status in statuses):
        return "completed"
    if "running" in statuses:
        return "running"
    if all(status in ("completed", "stale") for status in statuses):
        return "stale"
    return "partial"


def _side_view(
    side: str,
    runs: list[ScenarioRunOut],
    dossier_version: int,
    expected: list[str] | None,
) -> tuple[ScenarioSideView, list[ScenarioRunOut]]:
    mine = [run for run in runs if run.simulated_side == side]
    latest: dict[str, ScenarioRunOut] = {}
    for run in sorted(mine, key=lambda r: r.created_at):
        latest[run.participant_id] = run

    if expected is None:
        # Sem lista de participantes do pedido: vale a execucao mais recente do lado.
        if not mine:
            return ScenarioSideView(side=side, status="not_analyzed"), []  # type: ignore[arg-type]
        run = max(mine, key=lambda r: r.created_at)
        view = ScenarioSideView(
            side=side,  # type: ignore[arg-type]
            status=_run_status(run, dossier_version),  # type: ignore[arg-type]
            run_id=run.id,
            arguments_count=len(run.arguments),
            hypotheses_count=sum(
                1 for a in run.arguments if a.status == "hypothesis_for_validation"
            ),
        )
        return view, [run]

    people: list[ParticipantScenario] = []
    considered: list[ScenarioRunOut] = []
    for participant_id in expected:
        run = latest.get(participant_id)
        if run is None:
            people.append(ParticipantScenario(participant_id=participant_id, status="not_analyzed"))
            continue
        considered.append(run)
        people.append(
            ParticipantScenario(
                participant_id=participant_id,
                status=_run_status(run, dossier_version),  # type: ignore[arg-type]
                run_id=run.id,
                arguments_count=len(run.arguments),
                hypotheses_count=sum(
                    1 for a in run.arguments if a.status == "hypothesis_for_validation"
                ),
            )
        )
    status = _aggregate([p.status for p in people]) if people else "not_analyzed"
    if status == "not_analyzed":
        return ScenarioSideView(side=side, status="not_analyzed", participants=people), []  # type: ignore[arg-type]
    view = ScenarioSideView(
        side=side,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        run_id=considered[0].id if len(considered) == 1 else None,
        arguments_count=sum(len(r.arguments) for r in considered),
        hypotheses_count=sum(
            1 for r in considered for a in r.arguments if a.status == "hypothesis_for_validation"
        ),
        participants=people,
    )
    return view, considered


def compare_scenarios(
    opportunity_id: str,
    plea_id: str,
    dossier_version: int,
    runs: Iterable[ScenarioRunOut],
    *,
    expected: Mapping[str, list[str]] | None = None,
) -> ScenarioComparisonOut:
    """Compara os dois lados de um pedido (AC07, AC08).

    A funcao nao recebe a posicao economica: trocar a posicao avaliada nao muda fontes,
    argumentos nem estados. Lado sem execucao aparece como 'not_analyzed', sem contagem
    substituta; nada e invertido a partir do outro lado.

    `expected` lista os participantes de cada lado do pedido. Com varios autores ou reus,
    um lado so esta concluido quando o cenario de cada um deles esta concluido; faltando
    um, o lado fica parcial e a comparacao, indisponivel.
    """
    relevant = [
        run for run in runs if run.opportunity_id == opportunity_id and run.plea_id == plea_id
    ]
    claimant, claimant_runs = _side_view(
        "claimant", relevant, dossier_version, expected.get("claimant") if expected else None
    )
    defendant, defendant_runs = _side_view(
        "defendant", relevant, dossier_version, expected.get("defendant") if expected else None
    )
    comparable = claimant.status == "completed" and defendant.status == "completed"

    limitations: list[str] = []
    labels = {"claimant": "autor", "defendant": "réu"}
    for view in (claimant, defendant):
        name = labels[view.side]
        if view.status == "not_analyzed":
            limitations.append(
                f"Cenário do {name} não analisado: a ausência de argumentos não indica êxito."
            )
        elif view.status == "stale":
            limitations.append(f"Cenário do {name} calculado sobre versão anterior do dossiê.")
        elif view.status in ("partial", "failed", "running"):
            limitations.append(f"Cenário do {name} sem conclusão: comparação indisponível.")
        missing = [p for p in view.participants if p.status == "not_analyzed"]
        if missing and view.status != "not_analyzed":
            limitations.append(
                f"Lado do {name}: {len(missing)} participante(s) do pedido sem cenário analisado."
            )

    common: list[str] = []
    if claimant_runs and defendant_runs:
        cited = [
            {c.document_version_id for run in side for a in run.arguments for c in a.citations}
            for side in (claimant_runs, defendant_runs)
        ]
        common = sorted(cited[0] & cited[1])

    return ScenarioComparisonOut(
        opportunity_id=opportunity_id,
        plea_id=plea_id,
        dossier_version=dossier_version,
        claimant=claimant,
        defendant=defendant,
        comparable=comparable,
        common_sources=common,
        limitations=limitations,
    )


def _flat(text: str) -> str:
    return " ".join((text or "").split()).casefold()


def verify_citation_excerpts(
    citations: list[Citation],
    pendencies: list[Pendency],
    page_texts: Mapping[int, str],
) -> tuple[list[Citation], list[Pendency], int, int]:
    """Confere o trecho de cada citacao contra o texto da pagina citada (P01, AC05).

    Existir a pagina nao basta: com motor real, o trecho citado pode estar em outra pagina ou
    nem estar no documento. Regras:
    - trecho na pagina citada: citacao mantida;
    - trecho em exatamente uma outra pagina: a pagina e corrigida para onde o trecho esta;
    - trecho em nenhuma pagina, ou em varias que nao a citada: a citacao e retirada e vira
      pendencia — o achado nao fica com lastro que nao se pode conferir.
    Citacao sem trecho, ou documento sem texto por pagina, nao pode ser conferida e fica
    como veio. Devolve (citacoes, pendencias, corrigidas, retiradas).
    """
    if not page_texts:
        return citations, pendencies, 0, 0
    flat_pages = {number: _flat(text) for number, text in page_texts.items()}
    kept: list[Citation] = []
    out = list(pendencies)
    corrected = dropped = 0
    for citation in citations:
        needle = _flat(citation.excerpt)
        if not needle:
            kept.append(citation)
            continue
        if needle in flat_pages.get(citation.page_start, ""):
            kept.append(citation)
            continue
        elsewhere = [number for number, text in flat_pages.items() if needle in text]
        if len(elsewhere) == 1:
            kept.append(citation.model_copy(update={"page_start": elsewhere[0], "page_end": None}))
            corrected += 1
            continue
        dropped += 1
        where = (
            "não foi encontrado no documento enviado"
            if not elsewhere
            else "aparece em mais de uma página, nenhuma delas a citada"
        )
        out.append(
            Pendency(
                code="citation_unresolved",
                message=f"O trecho citado pelo motor na página {citation.page_start} {where}.",
            )
        )
    if not kept and EVIDENCE_PENDING not in {p.code for p in out}:
        out.insert(
            0,
            Pendency(
                code=EVIDENCE_PENDING,
                message="Sem citação resolvível (documento e página): pendente de evidência.",
            ),
        )
    return kept, out, corrected, dropped
