"""Contraditorio bilateral: pedidos, cenarios por participante e comparacao (RF06; T010).

Cada cenario e de um participante, para um pedido, simulando um lado. Os dois lados usam a
mesma base de evidencia original (documentos e afirmacoes do dossie); o que um cenario
conclui nunca entra como fato no cenario do outro. Nenhum sinal ou indice e invertido para
fabricar a tese contraria.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.config import BACKEND_DIR, Settings
from evidia.domain.engines import citation_pendencies, compare_scenarios
from evidia.domain.texts import PageText, contains_excerpt
from evidia.errors import ApiError, forbidden, not_found
from evidia.llm import LLMClient, LLMError, MockLLM, build_prompt, record_evidence
from evidia.logging_setup import audit
from evidia.models import (
    Claim,
    DocumentPage,
    DocumentVersion,
    Opportunity,
    Participant,
    Plea,
    ScenarioArgumentRow,
    ScenarioRun,
    User,
    utcnow,
)
from evidia.schemas_engines import (
    Citation,
    Pendency,
    PleaOut,
    ScenarioArgument,
    ScenarioComparisonOut,
    ScenarioRunOut,
)
from evidia.services import dossier

PROMPT_PATH = BACKEND_DIR / "evidia" / "prompts" / "adversarial_v2.txt"
PROMPT_VERSION = "adversarial_v2"
MAX_CLAIMS_IN_CONTEXT = 60
MAX_MODEL_ARGUMENTS = 30
SIDE_LABEL = {"claimant": "autor", "defendant": "réu"}


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


# -------------------------------------------------------------------- pedidos


def plea_out(plea: Plea) -> PleaOut:
    return PleaOut.model_validate(plea)


def get_plea(db: Session, user: User, plea_id: str) -> Plea:
    plea = db.scalar(
        select(Plea).where(Plea.id == plea_id, Plea.organization_id == user.organization_id)
    )
    if plea is None:
        raise not_found("Pedido")
    return plea


def list_pleas(db: Session, opportunity_id: str) -> list[Plea]:
    return list(
        db.scalars(
            select(Plea).where(Plea.opportunity_id == opportunity_id).order_by(Plea.created_at)
        ).all()
    )


def _participants(db: Session, opportunity_id: str) -> dict[str, Participant]:
    found = db.scalars(
        select(Participant).where(
            Participant.opportunity_id == opportunity_id, Participant.merged_into_id.is_(None)
        )
    ).all()
    return {p.id: p for p in found}


def create_plea(db: Session, user: User, opportunity_id: str, data: dict[str, Any]) -> Plea:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    people = _participants(db, opp.id)
    claimants = list(dict.fromkeys(data["claimant_participant_ids"]))
    defendants = list(dict.fromkeys(data["defendant_participant_ids"]))
    if any(pid not in people for pid in (*claimants, *defendants)):
        raise ApiError(422, "invalid_request", "Participante não pertence a este dossiê.")
    if set(claimants) & set(defendants):
        raise ApiError(
            422, "invalid_request", "O mesmo participante não pode estar nos dois lados do pedido."
        )
    plea = Plea(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        title=data["title"].strip(),
        description=(data.get("description") or "").strip(),
        claimant_participant_ids=claimants,
        defendant_participant_ids=defendants,
        is_synthetic=opp.is_synthetic,
        created_by=user.id,
    )
    db.add(plea)
    db.commit()
    audit(
        "scenario.plea.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"plea:{plea.id}",
        outcome="created",
        data={"claimants": len(claimants), "defendants": len(defendants)},
    )
    return plea


# ------------------------------------------------------------------- cenarios


def get_run(db: Session, user: User, run_id: str) -> ScenarioRun:
    run = db.scalar(
        select(ScenarioRun).where(
            ScenarioRun.id == run_id, ScenarioRun.organization_id == user.organization_id
        )
    )
    if run is None:
        raise not_found("Cenário")
    return run


def _arguments(db: Session, run_id: str) -> list[ScenarioArgumentRow]:
    return list(
        db.scalars(
            select(ScenarioArgumentRow)
            .where(ScenarioArgumentRow.run_id == run_id)
            .order_by(ScenarioArgumentRow.created_at, ScenarioArgumentRow.id)
        ).all()
    )


def run_out(db: Session, run: ScenarioRun) -> ScenarioRunOut:
    opp = db.get(Opportunity, run.opportunity_id)
    return ScenarioRunOut(
        id=run.id,
        opportunity_id=run.opportunity_id,
        dossier_version=run.dossier_version,
        participant_id=run.participant_id,
        plea_id=run.plea_id,
        simulated_side=run.simulated_side,
        status=run.status,
        arguments=[
            ScenarioArgument(
                id=a.id,
                formulated_by=a.formulated_by,
                against=a.against,
                plea_id=run.plea_id,
                affected_act=a.affected_act or None,
                origin=a.origin,
                hypothesis=a.hypothesis,
                counter_evidence=a.counter_evidence,
                mitigation=a.mitigation,
                confidence=a.confidence,
                citations=a.citations or [],
                pendencies=a.pendencies or [],
                status=a.status,
            )
            for a in _arguments(db, run.id)
        ],
        limitations=run.limitations or [],
        is_mock=run.is_mock,
        is_synthetic=run.is_synthetic,
        created_at=_as_utc(run.created_at),
        finished_at=_as_utc(run.finished_at) if run.finished_at else None,
        source=run.source,
        stale=opp is not None and opp.dossier_version != run.dossier_version,
    )


def list_runs(db: Session, opportunity_id: str) -> list[ScenarioRun]:
    return list(
        db.scalars(
            select(ScenarioRun)
            .where(ScenarioRun.opportunity_id == opportunity_id)
            .order_by(ScenarioRun.created_at)
        ).all()
    )


def _page_counts(db: Session, opportunity_id: str) -> dict[str, int | None]:
    return dict(
        db.execute(
            select(DocumentVersion.id, DocumentVersion.page_count).where(
                DocumentVersion.opportunity_id == opportunity_id
            )
        ).all()
    )


def _check_citations(
    db: Session, opportunity_id: str, raw: list[dict[str, Any]]
) -> tuple[list[Citation], list[Pendency]]:
    """Separa as citacoes resolviveis das que nao conferem com o dossie."""
    pages = _page_counts(db, opportunity_id)
    valid: list[Citation] = []
    problems: list[Pendency] = []
    for item in raw:
        try:
            citation = Citation(
                document_version_id=item["document_version_id"],
                page_start=item["page_start"],
                page_end=item.get("page_end"),
                excerpt=item.get("excerpt") or "",
            )
        except ValueError:
            problems.append(
                Pendency(code="invalid_citation", message="Citação em formato inválido.")
            )
            continue
        found = citation_pendencies([citation], pages)
        if found:
            problems.extend(found)
            continue
        if citation.excerpt:
            page = db.scalar(
                select(DocumentPage).where(
                    DocumentPage.document_version_id == citation.document_version_id,
                    DocumentPage.page_no == citation.page_start,
                )
            )
            # So confere o trecho quando ha texto da pagina para conferir.
            if page is not None and not contains_excerpt(page.text, citation.excerpt):
                problems.append(
                    Pendency(
                        code="excerpt_not_in_page",
                        message=f"O trecho citado não está na página {citation.page_start}.",
                    )
                )
                continue
        valid.append(citation)
    return valid, problems


def _store_argument(
    db: Session,
    run: ScenarioRun,
    *,
    against: str,
    hypothesis: str,
    citations: list[dict[str, Any]],
    affected_act: str = "",
    counter_evidence: str = "",
    mitigation: str = "",
    confidence: str = "not_assessed",
    extra_pendencies: list[Pendency] | None = None,
) -> ScenarioArgumentRow:
    valid, problems = _check_citations(db, run.opportunity_id, citations)
    pendencies = [*problems, *(extra_pendencies or [])]
    if not valid:
        # Sem evidencia, o argumento e hipotese a validar — nunca tese sustentada.
        pendencies = [*citation_pendencies([], {}), *pendencies]
    row = ScenarioArgumentRow(
        organization_id=run.organization_id,
        run_id=run.id,
        formulated_by=run.participant_id,
        against=against,
        affected_act=affected_act,
        origin="source_evidence" if valid else "scenario_inference",
        hypothesis=hypothesis,
        counter_evidence=counter_evidence,
        mitigation=mitigation,
        confidence=confidence,
        citations=[c.model_dump(mode="json") for c in valid],
        pendencies=[p.model_dump(mode="json") for p in pendencies],
        status="supported" if valid and not pendencies else "hypothesis_for_validation",
    )
    db.add(row)
    return row


def _opposite(plea: Plea, side: str) -> list[str]:
    return list(
        plea.defendant_participant_ids if side == "claimant" else plea.claimant_participant_ids
    )


def create_run(
    db: Session,
    user: User,
    llm: LLMClient,
    settings: Settings,
    plea_id: str,
    data: dict[str, Any],
) -> ScenarioRun:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    plea = get_plea(db, user, plea_id)
    opp = db.get(Opportunity, plea.opportunity_id)
    side = data["simulated_side"]
    own = plea.claimant_participant_ids if side == "claimant" else plea.defendant_participant_ids
    if data["participant_id"] not in own:
        raise ApiError(
            422,
            "participant_not_on_side",
            f"O participante não está no lado do {SIDE_LABEL[side]} deste pedido.",
        )
    run = ScenarioRun(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        plea_id=plea.id,
        participant_id=data["participant_id"],
        simulated_side=side,
        dossier_version=opp.dossier_version,
        status="running",
        source="manual" if data["method"] == "manual" else "model",
        is_mock=False,
        limitations=[],
        is_synthetic=opp.is_synthetic,
        created_by=user.id,
    )
    if data["method"] == "manual":
        db.add(run)
        db.commit()
        audit(
            "scenario.run.create",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"scenario_run:{run.id}",
            outcome="started",
            data={"side": side, "method": "manual", "plea_id": plea.id},
        )
        return run
    return _generate(db, user, llm, settings, opp, plea, run)


def _claims_context(db: Session, opp: Opportunity) -> list[Claim]:
    """Evidencia original compartilhada pelos dois lados: afirmacoes do dossie com citacao
    resolvivel, na versao vigente. Argumentos de outro cenario nunca entram aqui."""
    found = db.scalars(
        select(Claim)
        .where(
            Claim.opportunity_id == opp.id,
            Claim.stale.is_(False),
            Claim.document_version_id.is_not(None),
            Claim.page_start.is_not(None),
            Claim.review_state != "discarded",
        )
        .order_by(Claim.created_at, Claim.id)
        .limit(MAX_CLAIMS_IN_CONTEXT)
    ).all()
    return list(found)


def _mock_responder(claims: list[Claim]):
    def respond(_prompt) -> dict[str, Any]:
        arguments = [
            {
                "hypothesis": f"Argumento simulado a partir da afirmação {index}.",
                "claim_refs": [index],
                "confidence": "low",
            }
            for index in range(1, min(len(claims), 3) + 1)
        ]
        arguments.append(
            {"hypothesis": "Argumento simulado ainda sem evidência no dossiê.", "claim_refs": []}
        )
        return {"arguments": arguments}

    return respond


def _generate(
    db: Session,
    user: User,
    llm: LLMClient,
    settings: Settings,
    opp: Opportunity,
    plea: Plea,
    run: ScenarioRun,
) -> ScenarioRun:
    claims = _claims_context(db, opp)
    if not claims:
        raise ApiError(
            409,
            "no_evidence_for_scenario",
            "Registre afirmações com documento e página antes de gerar o cenário pelo modelo.",
        )
    people = _participants(db, opp.id)
    targets = _opposite(plea, run.simulated_side)
    blocks = [
        PageText(
            index,
            f"[{claim.nature}] {claim.text}"
            + (f" (afirmado por: {claim.asserted_by})" if claim.asserted_by else ""),
            "claim",
        )
        for index, claim in enumerate(claims, start=1)
    ]
    target_lines = "\n".join(
        f"{index}. {people[pid].name}" for index, pid in enumerate(targets, start=1)
    )
    task = (
        f"Pedido em análise: {plea.title}.\n"
        f"Lado a defender: {SIDE_LABEL[run.simulated_side]} "
        f"({people[run.participant_id].name}), que "
        + (
            "formula o pedido e precisa sustentá-lo.\n"
            if run.simulated_side == "claimant"
            else "resiste ao pedido e busca afastá-lo ou reduzi-lo.\n"
        )
        + f"Participantes do lado oposto, numerados para o campo against_ref:\n{target_lines}\n"
        "As afirmações do dossiê estão abaixo, numeradas no delimitador."
    )
    client = MockLLM(_mock_responder(claims)) if getattr(llm, "provider", "") == "mock" else llm
    prompt = build_prompt(PROMPT_PATH.read_text(encoding="utf-8"), task, blocks, label="afirmacao")
    target_ref = f"plea:{plea.id}"
    organization_id, participant_id, side = (
        opp.organization_id,
        run.participant_id,
        run.simulated_side,
    )
    db.rollback()  # nao segura o banco enquanto espera o provedor
    try:
        result = client.complete_json(prompt)
    except LLMError as exc:
        record_evidence(
            Path(settings.log_dir),
            task=PROMPT_VERSION,
            actor=user.id,
            organization_id=organization_id,
            target=target_ref,
            prompt=prompt,
            result=None,
            error=exc.code,
        )
        audit(
            "scenario.run.create",
            actor=user.id,
            organization_id=organization_id,
            target=target_ref,
            outcome=exc.code,
            data={"side": side, "method": "model"},
        )
        raise ApiError(exc.status, exc.code, exc.message, {"retryable": exc.retryable}) from exc
    record_evidence(
        Path(settings.log_dir),
        task=PROMPT_VERSION,
        actor=user.id,
        organization_id=organization_id,
        target=target_ref,
        prompt=prompt,
        result=result,
    )

    run.is_mock = result.is_mock
    db.add(run)
    db.flush()
    items = result.data.get("arguments") if isinstance(result.data, dict) else None
    rejected = 0
    stored = 0
    for item in (items if isinstance(items, list) else [])[:MAX_MODEL_ARGUMENTS]:
        hypothesis = item.get("hypothesis") if isinstance(item, dict) else None
        if not isinstance(hypothesis, str) or len(hypothesis.strip()) < 3:
            rejected += 1
            continue
        refs = item.get("claim_refs")
        cited = [
            claims[ref - 1]
            for ref in (refs if isinstance(refs, list) else [])
            if isinstance(ref, int) and not isinstance(ref, bool) and 1 <= ref <= len(claims)
        ]
        # O modelo so pode apontar afirmacoes do dossie: a citacao vem delas, nao do modelo.
        citations = [
            {
                "document_version_id": claim.document_version_id,
                "page_start": claim.page_start,
                "page_end": claim.page_end,
                # O trecho e o da afirmacao ja conferida no dossie, nao texto do modelo.
                "excerpt": claim.excerpt or "",
            }
            for claim in cited
        ]
        extra: list[Pendency] = []
        ref = item.get("against_ref")
        if isinstance(ref, int) and not isinstance(ref, bool) and 1 <= ref <= len(targets):
            against = targets[ref - 1]
        else:
            against = targets[0]
            if len(targets) > 1:
                extra.append(
                    Pendency(
                        code="target_not_specified",
                        message=(
                            "O modelo não indicou contra qual participante o argumento se dirige."
                        ),
                    )
                )
        confidence = item.get("confidence")
        _store_argument(
            db,
            run,
            against=against,
            hypothesis=hypothesis.strip()[:4000],
            citations=citations,
            counter_evidence=str(item.get("counter_evidence") or "")[:4000],
            mitigation=str(item.get("mitigation") or "")[:4000],
            confidence=confidence if confidence in ("high", "medium", "low") else "not_assessed",
            extra_pendencies=extra,
        )
        stored += 1

    limitations = []
    if result.is_mock:
        limitations.append(
            "Cenário gerado em modo simulado: os argumentos são de teste e não representam análise."
        )
    if rejected:
        limitations.append(f"{rejected} item(ns) devolvido(s) pelo modelo foram recusados.")
    if len(claims) == MAX_CLAIMS_IN_CONTEXT:
        limitations.append(
            f"Só as primeiras {MAX_CLAIMS_IN_CONTEXT} afirmações do dossiê foram consideradas."
        )
    if stored == 0:
        limitations.append("O modelo não devolveu argumento aproveitável.")
    run.limitations = limitations
    run.status = "completed" if stored else "failed"
    run.finished_at = utcnow()
    db.commit()
    audit(
        "scenario.run.create",
        actor=user.id,
        organization_id=organization_id,
        target=f"scenario_run:{run.id}",
        outcome=run.status,
        data={
            "side": side,
            "participant_id": participant_id,
            "method": "model",
            "provider": result.provider,
            "is_mock": result.is_mock,
            "arguments": stored,
            "rejected": rejected,
            "usage": result.usage,
            "prompt_version": PROMPT_VERSION,
        },
    )
    return run


def _editable(run: ScenarioRun) -> None:
    if run.source != "manual" or run.status != "running":
        raise ApiError(
            409, "scenario_not_editable", "Só cenário manual em elaboração aceita alterações."
        )


def add_argument(db: Session, user: User, run_id: str, data: dict[str, Any]) -> ScenarioRun:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    run = get_run(db, user, run_id)
    _editable(run)
    plea = db.get(Plea, run.plea_id)
    if data["against"] not in _opposite(plea, run.simulated_side):
        raise ApiError(
            422,
            "invalid_request",
            "O argumento precisa se dirigir a um participante do lado oposto do pedido.",
        )
    _store_argument(
        db,
        run,
        against=data["against"],
        hypothesis=data["hypothesis"].strip(),
        citations=data.get("citations") or [],
        affected_act=(data.get("affected_act") or "").strip(),
        counter_evidence=(data.get("counter_evidence") or "").strip(),
        mitigation=(data.get("mitigation") or "").strip(),
        confidence=data.get("confidence") or "not_assessed",
    )
    db.commit()
    return run


def delete_argument(db: Session, user: User, argument_id: str) -> ScenarioRun:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    row = db.scalar(
        select(ScenarioArgumentRow).where(
            ScenarioArgumentRow.id == argument_id,
            ScenarioArgumentRow.organization_id == user.organization_id,
        )
    )
    if row is None:
        raise not_found("Argumento")
    run = db.get(ScenarioRun, row.run_id)
    _editable(run)
    db.delete(row)
    db.commit()
    return run


def complete_run(db: Session, user: User, run_id: str) -> ScenarioRun:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    run = get_run(db, user, run_id)
    _editable(run)
    if not _arguments(db, run.id):
        # Cenario vazio concluido seria lido como "sem ataque": ausencia de argumento nao e exito.
        raise ApiError(
            409,
            "scenario_empty",
            "Registre ao menos um argumento antes de concluir o cenário.",
        )
    run.status = "completed"
    run.finished_at = utcnow()
    db.commit()
    audit(
        "scenario.run.complete",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"scenario_run:{run.id}",
        outcome="completed",
        data={"side": run.simulated_side},
    )
    return run


def comparison(db: Session, user: User, plea_id: str) -> ScenarioComparisonOut:
    plea = get_plea(db, user, plea_id)
    opp = db.get(Opportunity, plea.opportunity_id)
    runs = [
        run_out(db, run)
        for run in db.scalars(select(ScenarioRun).where(ScenarioRun.plea_id == plea.id)).all()
    ]
    return compare_scenarios(
        opp.id,
        plea.id,
        opp.dossier_version,
        runs,
        expected={
            "claimant": list(plea.claimant_participant_ids),
            "defendant": list(plea.defendant_participant_ids),
        },
    )
