"""Execucoes de motor: inicio, reconciliacao e leitura (T008; RF04, AC05, AC06, AC20).

A execucao e registrada ANTES de qualquer chamada ao motor, e cada passo externo e seguido
de gravacao. Assim, depois de uma queda, o que estava em andamento e reconciliado pelo
identificador do caso no motor — sem reenviar o documento nem duplicar achados.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.adapters.nulidade360 import (
    ENGINE,
    MOCK_SAFE_EXTENSIONS,
    POSITION_LABEL,
    Nulidade360Client,
    Nulidade360Error,
    normalize_analysis,
)
from evidia.config import Settings
from evidia.domain.engines import (
    citation_pendencies,
    finding_validation_blockers,
    verify_citation_excerpts,
)
from evidia.errors import ApiError, forbidden, not_found
from evidia.logging_setup import audit
from evidia.models import (
    Claim,
    Document,
    DocumentPage,
    DocumentVersion,
    EngineFinding,
    EngineFindingReview,
    EngineRun,
    FindingClaimLink,
    Opportunity,
    P4Item,
    Process,
    User,
    utcnow,
)
from evidia.schemas_engines import (
    Citation,
    EngineRunCreate,
    EngineRunOut,
    FindingClaimLinkIn,
    FindingClaimLinkOut,
    FindingOut,
    FindingReviewOut,
    FindingReviewRequest,
    Pendency,
)
from evidia.services import dossier

TERMINAL = ("partial", "completed", "failed", "cancelled")
# Execucao registrada que nunca chegou a criar o caso no motor (queda no meio do envio).
ORPHAN_AFTER = timedelta(minutes=2)


def engine_error(exc: Nulidade360Error) -> ApiError:
    return ApiError(exc.status, exc.code, exc.message, {"retryable": exc.retryable})


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def get_run(db: Session, user: User, run_id: str) -> EngineRun:
    run = db.scalar(
        select(EngineRun).where(
            EngineRun.id == run_id, EngineRun.organization_id == user.organization_id
        )
    )
    if run is None:
        raise not_found("Execução", feminine=True)
    return run


def run_out(db: Session, run: EngineRun) -> EngineRunOut:
    findings = db.scalars(select(EngineFinding.id).where(EngineFinding.run_id == run.id)).all()
    return EngineRunOut(
        id=run.id,
        opportunity_id=run.opportunity_id,
        dossier_version=run.dossier_version,
        engine=run.engine,
        engine_version=run.engine_version,
        checklist_version=run.checklist_version,
        prompt_version=run.prompt_version,
        model=run.model,
        input_hash=run.input_hash,
        document_version_ids=[run.document_version_id],
        simulated_side=run.simulated_side,
        side_confirmed_by=run.side_confirmed_by,
        status=run.status,
        engine_status=run.engine_status,
        blocks=run.blocks or [],
        attempts=run.attempts,
        cost_amount=run.cost_amount,
        cost_currency=run.cost_currency,
        usage=None,
        limitations=run.limitations or [],
        evidence_map=run.evidence_map,
        request_id=run.request_id,
        is_mock=run.is_mock,
        is_synthetic=run.is_synthetic,
        stale=run.stale,
        stale_reason=run.stale_reason,
        created_at=_as_utc(run.created_at),
        started_at=_as_utc(run.started_at) if run.started_at else None,
        finished_at=_as_utc(run.finished_at) if run.finished_at else None,
        external_ref=run.external_ref,
        overall_risk_index=run.overall_risk_index,
        findings_count=len(findings),
        items_count=len(db.scalars(select(P4Item.id).where(P4Item.run_id == run.id)).all()),
    )


def _blockers(run: EngineRun, finding: EngineFinding) -> list[Pendency]:
    return finding_validation_blockers(
        [Pendency.model_validate(p) for p in finding.pendencies or []],
        is_mock=run.is_mock,
        stale=run.stale,
    )


def finding_out(db: Session, run: EngineRun, finding: EngineFinding) -> FindingOut:
    reviews = db.scalars(
        select(EngineFindingReview)
        .where(EngineFindingReview.finding_id == finding.id)
        .order_by(EngineFindingReview.created_at, EngineFindingReview.id)
    ).all()
    links = db.execute(
        select(FindingClaimLink, Claim)
        .join(Claim, Claim.id == FindingClaimLink.claim_id)
        .where(FindingClaimLink.finding_id == finding.id)
        .order_by(FindingClaimLink.created_at, FindingClaimLink.id)
    ).all()
    return FindingOut(
        id=finding.id,
        run_id=finding.run_id,
        opportunity_id=finding.opportunity_id,
        engine=run.engine,
        engine_version=run.engine_version,
        block_key=finding.block_key,
        title=finding.title,
        basis=finding.basis,
        consequence_hypothesis=finding.consequence_hypothesis,
        support_strength=finding.support_strength,
        risk_index=finding.risk_index,
        citations=finding.citations or [],
        pendencies=finding.pendencies or [],
        review_state=finding.review_state,
        original=finding.original or {},
        is_synthetic=run.is_synthetic,
        # Achado ja validado nao lista bloqueios: eles valem para a proxima promocao.
        validation_blockers=[] if finding.review_state == "validated" else _blockers(run, finding),
        reviews=[FindingReviewOut.model_validate(r) for r in reviews],
        claim_links=[
            FindingClaimLinkOut(
                id=link.id,
                claim_id=claim.id,
                claim_text=claim.text,
                claim_review_state=claim.review_state,
                claim_stale=claim.stale,
                relation=link.relation,
                note=link.note,
                created_by=link.created_by,
                created_at=link.created_at,
            )
            for link, claim in links
        ],
    )


def _fail(run: EngineRun, reason: str) -> None:
    run.status = "failed"
    run.finished_at = utcnow()
    run.limitations = [*(run.limitations or []), reason]


def _idempotency_key(opp: Opportunity, version: DocumentVersion, side: str) -> str:
    raw = "|".join(
        [opp.organization_id, opp.id, ENGINE, version.sha256, side, str(opp.dossier_version)]
    )
    return hashlib.sha256(raw.encode()).hexdigest()


def start_run(
    db: Session,
    user: User,
    client: Nulidade360Client,
    settings: Settings,
    opportunity_id: str,
    body: EngineRunCreate,
) -> tuple[EngineRun, bool]:
    """Inicia (ou reaproveita) uma execucao. Devolve (execucao, reaproveitada)."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    if settings.nulidade360_mode == "disabled":
        raise ApiError(
            503,
            "nulidade360_not_configured",
            "Integração com o Nulidade360 não configurada neste ambiente.",
        )

    found = db.execute(
        select(DocumentVersion, Document)
        .join(Document, Document.id == DocumentVersion.document_id)
        .where(
            DocumentVersion.id == body.document_version_id,
            DocumentVersion.opportunity_id == opp.id,
            DocumentVersion.organization_id == user.organization_id,
        )
    ).first()
    if found is None:
        raise ApiError(422, "invalid_request", "Documento citado não pertence a este dossiê.")
    version, document = found
    if version.version_no != document.current_version_no:
        raise ApiError(
            409,
            "document_version_not_current",
            "A versão escolhida foi substituída. Analise a versão vigente do documento.",
        )
    if not version.filename.lower().endswith(MOCK_SAFE_EXTENSIONS):
        # Em modo simulado o motor envia PDF ao provedor antes de checar o modo: ha custo.
        # Em modo real, esta versao da Evidia ainda so entrega texto ao motor.
        raise ApiError(
            422,
            "engine_requires_paid_run",
            "Esta versão só envia ao Nulidade360 arquivos .txt ou .md. A análise de PDF "
            "consome mais API paga e depende de autorização específica.",
        )
    path = Path(settings.storage_dir) / version.storage_key
    if not path.is_file():
        raise ApiError(410, "document_content_missing", "Conteúdo do documento indisponível.")
    content = path.read_bytes()
    try:
        content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ApiError(
            422, "invalid_request", "O arquivo de texto precisa estar em UTF-8."
        ) from exc

    evidence = None
    if body.evidence_map_version_id:
        evidence = db.scalar(
            select(DocumentVersion).where(
                DocumentVersion.id == body.evidence_map_version_id,
                DocumentVersion.opportunity_id == opp.id,
                DocumentVersion.organization_id == user.organization_id,
            )
        )
        if evidence is None or not evidence.filename.lower().endswith(".xlsx"):
            raise ApiError(
                422,
                "invalid_request",
                "O mapa de evidências precisa ser uma planilha .xlsx deste dossiê.",
            )
        evidence_path = Path(settings.storage_dir) / evidence.storage_key
        if not evidence_path.is_file():
            raise ApiError(410, "document_content_missing", "Conteúdo da planilha indisponível.")

    key = _idempotency_key(opp, version, body.simulated_side)
    run = db.scalar(select(EngineRun).where(EngineRun.idempotency_key == key))
    if run is not None and run.status not in ("failed", "cancelled"):
        # Mesma entrada, mesmo lado, mesmo dossie: nao reenvia nem cobra de novo.
        return run, True

    process = db.get(Process, opp.process_id)
    now = utcnow()
    if run is None:
        run = EngineRun(
            organization_id=opp.organization_id,
            opportunity_id=opp.id,
            engine=ENGINE,
            status="queued",
            dossier_version=opp.dossier_version,
            input_hash=version.sha256,
            idempotency_key=key,
            document_version_id=version.id,
            sent_filename=version.filename,
            simulated_side=body.simulated_side,
            side_confirmed_by=user.id,
            attempts=1,
            # Provisorio ate o motor responder: vale o que ele declarar na saida.
            is_mock=settings.nulidade360_mode == "mock",
            is_synthetic=opp.is_synthetic,
            blocks=[],
            limitations=[],
            created_by=user.id,
        )
        db.add(run)
    else:
        # Nova tentativa vinculada a mesma operacao.
        run.attempts += 1
        run.status = "queued"
        run.finished_at = None
        run.limitations = []
        run.side_confirmed_by = user.id
    run.deadline_at = now + timedelta(minutes=settings.nulidade360_deadline_minutes)
    db.commit()

    # Antes de reenviar, confere se o motor ja tem analise para o caso desta operacao.
    if run.external_ref:
        try:
            if client.list_analyses(run.external_ref):
                run.status = "running"
                db.commit()
                return refresh_run(db, user.id, client, settings, run), True
        except Nulidade360Error:
            pass  # sem confirmacao: segue para o envio, registrado como nova tentativa

    try:
        info = client.engine_info()
        run.checklist_version = info.get("checklist_version")
        run.engine_version = info.get("taxonomy_version")
        run.model = info.get("model")
        if not run.external_ref:
            run.external_ref = client.create_case(
                name=f"Evidia {opp.id[:8]} · {run.id[:8]}",
                process_number=(process.cnj if process else None) or "",
                represented_party=opp.represented_party,
                position_label=POSITION_LABEL[body.simulated_side],
                filename=version.filename,
                content=content,
            )
            db.commit()
        if evidence is not None and not run.evidence_map:
            # O mapa precisa chegar antes da analise; recusa do motor interrompe o pedido,
            # para nao analisar sem a planilha que o usuario escolheu.
            received = client.send_evidence_map(
                run.external_ref, evidence.filename, evidence_path.read_bytes()
            )
            run.evidence_map = {
                "document_version_id": evidence.id,
                "filename": evidence.filename,
                "sha256": evidence.sha256,
                "total_items": received.get("total_items"),
            }
            db.commit()
        client.start_analysis(run.external_ref)
    except Nulidade360Error as exc:
        _fail(run, f"Envio ao motor não concluído ({exc.code}).")
        db.commit()
        audit(
            "engine.run.start",
            actor=user.id,
            organization_id=opp.organization_id,
            target=f"engine_run:{run.id}",
            outcome="failed",
            data={"engine": ENGINE, "code": exc.code, "attempts": run.attempts},
        )
        raise engine_error(exc) from exc

    run.status = "running"
    run.started_at = utcnow()
    db.commit()
    audit(
        "engine.run.start",
        actor=user.id,
        organization_id=opp.organization_id,
        target=f"engine_run:{run.id}",
        outcome="started",
        data={
            "engine": ENGINE,
            "document_version_id": version.id,
            "input_hash": version.sha256,
            "simulated_side": body.simulated_side,
            "attempts": run.attempts,
            "mode": settings.nulidade360_mode,
        },
    )
    return run, False


def _latest(analyses: list[dict]) -> dict:
    def order(item: dict) -> tuple[int, str]:
        raw = item.get("id")
        return (raw, "") if isinstance(raw, int) else (-1, str(raw))

    return max(analyses, key=order)


def refresh_run(
    db: Session, actor_id: str, client: Nulidade360Client, settings: Settings, run: EngineRun
) -> EngineRun:
    """Reconcilia a execucao com o motor. Idempotente: repetir nao duplica achados."""
    if run.status in TERMINAL:
        return run
    now = utcnow()

    if not run.external_ref:
        # A queda aconteceu antes de o motor confirmar o caso: nao ha o que consultar,
        # e reenviar por conta propria poderia duplicar o envio.
        if now - _as_utc(run.created_at) > ORPHAN_AFTER:
            _fail(
                run,
                "Execução interrompida antes da confirmação do motor. Estado remoto "
                "desconhecido; não foi reenviada automaticamente.",
            )
            db.commit()
        return run

    # Libera a trava de escrita enquanto espera o motor; os dados sao relidos depois.
    db.commit()
    try:
        analyses = client.list_analyses(run.external_ref)
    except Nulidade360Error as exc:
        raise engine_error(exc) from exc
    db.refresh(run)
    if run.status in TERMINAL:
        return run  # outro ciclo ja concluiu esta execucao

    if not analyses:
        if run.deadline_at and now > _as_utc(run.deadline_at):
            _fail(
                run,
                "Prazo esgotado sem registro de análise no motor. Estado remoto desconhecido; "
                "nenhum resultado foi presumido.",
            )
            db.commit()
        return run

    version = db.get(DocumentVersion, run.document_version_id)
    try:
        result = normalize_analysis(
            _latest(analyses),
            sent_filename=run.sent_filename,
            document_version_id=run.document_version_id,
            page_count=version.page_count if version else None,
        )
    except Nulidade360Error as exc:
        raise engine_error(exc) from exc

    run.external_analysis_ref = result.external_id
    run.engine_status = result.engine_status
    if result.status == "running":
        if run.deadline_at and now > _as_utc(run.deadline_at):
            _fail(run, "Prazo esgotado com a análise ainda em processamento no motor.")
        else:
            run.status = "running"
        db.commit()
        return run

    known = set(
        db.scalars(select(EngineFinding.external_id).where(EngineFinding.run_id == run.id)).all()
    )
    # Texto por pagina do documento enviado, para conferir o trecho de cada citacao.
    page_texts = dict(
        db.execute(
            select(DocumentPage.page_no, DocumentPage.text).where(
                DocumentPage.document_version_id == run.document_version_id
            )
        ).all()
    )
    corrected_pages = dropped_citations = 0
    for item in result.findings:
        if item.external_id in known:
            continue
        citations, pendencies, corrected, dropped = verify_citation_excerpts(
            list(item.citations), list(item.pendencies), page_texts
        )
        corrected_pages += corrected
        dropped_citations += dropped
        db.add(
            EngineFinding(
                organization_id=run.organization_id,
                opportunity_id=run.opportunity_id,
                run_id=run.id,
                external_id=item.external_id,
                block_key=item.block_key,
                title=item.title,
                basis=item.basis,
                consequence_hypothesis=item.consequence_hypothesis,
                support_strength=item.support_strength,
                risk_index=str(item.risk_index) if item.risk_index is not None else None,
                citations=[c.model_dump(mode="json") for c in citations],
                pendencies=[p.model_dump(mode="json") for p in pendencies],
                review_state="pending",
                original=item.original,
            )
        )

    limitations = list(result.limitations)
    if corrected_pages:
        limitations.append(
            f"{corrected_pages} citação(ões) do motor indicavam página diferente da que contém "
            "o trecho; a página foi corrigida pela conferência com o texto do documento."
        )
    if dropped_citations:
        limitations.append(
            f"{dropped_citations} citação(ões) do motor foram retiradas: o trecho não pôde ser "
            "localizado no documento enviado."
        )
    # So e tratada como simulada a execucao que o proprio motor declarou simulada.
    run.is_mock = result.mock_reported
    if settings.nulidade360_mode == "mock" and not result.mock_reported and result.blocks:
        limitations.append(
            "O motor não declarou modo simulado nesta execução: verifique a configuração do "
            "Nulidade360, pois pode ter havido consumo de API paga."
        )
    if settings.nulidade360_mode == "live" and result.mock_reported:
        limitations.append(
            "A Evidia está configurada para execução real, mas o motor respondeu em modo "
            "simulado: verifique a configuração do Nulidade360."
        )
    if result.mock_reported:
        limitations.append(
            "Execução em modo simulado do motor: os achados e índices são de teste e não "
            "representam análise do documento."
        )
    opp = db.get(Opportunity, run.opportunity_id)
    if opp is not None and opp.dossier_version != run.dossier_version:
        run.stale = True
        run.stale_reason = "Dossiê alterado após o início da execução"

    run.status = result.status
    run.blocks = [b.model_dump(mode="json") for b in result.blocks]
    run.limitations = limitations
    run.model = result.model or run.model
    run.overall_risk_index = (
        str(result.overall_risk_index) if result.overall_risk_index is not None else None
    )
    run.original = {k: v for k, v in result.original.items() if k != "findings"}
    run.finished_at = now
    db.commit()
    audit(
        "engine.run.finish",
        actor=actor_id,
        organization_id=run.organization_id,
        target=f"engine_run:{run.id}",
        outcome=run.status,
        data={
            "engine": run.engine,
            "engine_status": run.engine_status,
            "findings": len(result.findings),
            "blocks_not_completed": [b.key for b in result.blocks if b.status != "completed"],
            "mock_reported": result.mock_reported,
        },
    )
    return run


# Mudancas de estado que encerram a discussao do achado pedem fundamento escrito.
_NEEDS_REASON = ("validated", "discarded")


def review_finding(
    db: Session, user: User, finding_id: str, body: FindingReviewRequest
) -> tuple[EngineRun, EngineFinding]:
    """Revisao humana de um achado de motor (RF03/RF04, AC05).

    Preserva antes/depois e autoria. A saida original do motor nunca e alterada; citacao
    informada pelo revisor entra marcada como tal.
    """
    if user.role not in dossier.REVIEWER_ROLES:
        raise forbidden("Revisão exige papel de revisor.")
    finding = db.scalar(
        select(EngineFinding).where(
            EngineFinding.id == finding_id,
            EngineFinding.organization_id == user.organization_id,
        )
    )
    if finding is None:
        raise not_found("Achado")
    run = db.get(EngineRun, finding.run_id)

    new_state = body.review_state or finding.review_state
    comment = body.comment.strip()
    if new_state in _NEEDS_REASON and new_state != finding.review_state and len(comment) < 3:
        raise ApiError(
            422,
            "review_reason_required",
            "Informe o fundamento da revisão para validar ou descartar o achado.",
        )

    before = {
        "review_state": finding.review_state,
        "citations": finding.citations or [],
        "pendencies": finding.pendencies or [],
    }
    citations = [Citation.model_validate(c) for c in finding.citations or []]
    pendencies = [Pendency.model_validate(p) for p in finding.pendencies or []]

    if body.citation is not None:
        found = db.execute(
            select(DocumentVersion, Document)
            .join(Document, Document.id == DocumentVersion.document_id)
            .where(
                DocumentVersion.id == body.citation.document_version_id,
                DocumentVersion.opportunity_id == finding.opportunity_id,
                DocumentVersion.organization_id == user.organization_id,
            )
        ).first()
        if found is None:
            raise ApiError(422, "invalid_citation", "Documento citado não pertence a este dossiê.")
        version, document = found
        if version.version_no != document.current_version_no:
            raise ApiError(
                422, "invalid_citation", "Cite a versão vigente do documento, não uma anterior."
            )
        try:
            added = Citation(
                document_version_id=version.id,
                page_start=body.citation.page_start,
                page_end=body.citation.page_end,
                source="review",
            )
        except ValueError as exc:
            raise ApiError(422, "invalid_citation", "Intervalo de páginas inválido.") from exc
        problems = citation_pendencies([added], {version.id: version.page_count})
        if problems:
            raise ApiError(422, "invalid_citation", problems[0].message)
        if added not in citations:
            citations.append(added)
        # Com origem resolvida pelo revisor, ficam apenas as pendencias que ainda se aplicam
        # as citacoes. As do motor permanecem no historico e na saida original.
        pages = {
            c.document_version_id: (
                version.page_count if c.document_version_id == version.id else None
            )
            for c in citations
        }
        pendencies = citation_pendencies(citations, pages)

    if new_state == "validated":
        blockers = finding_validation_blockers(pendencies, is_mock=run.is_mock, stale=run.stale)
        if blockers:
            db.rollback()
            raise ApiError(
                409,
                "validation_blocked",
                "O achado não pode ser validado enquanto houver pendências.",
                {"blockers": [b.model_dump() for b in blockers]},
            )

    finding.citations = [c.model_dump(mode="json") for c in citations]
    finding.pendencies = [p.model_dump(mode="json") for p in pendencies]
    finding.review_state = new_state
    after = {
        "review_state": finding.review_state,
        "citations": finding.citations,
        "pendencies": finding.pendencies,
    }
    db.add(
        EngineFindingReview(
            organization_id=user.organization_id,
            finding_id=finding.id,
            reviewer_id=user.id,
            reviewer_name=user.display_name or user.username,
            before=before,
            after=after,
            comment=comment,
        )
    )
    db.commit()
    audit(
        "engine.finding.review",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"engine_finding:{finding.id}",
        outcome=finding.review_state,
        data={
            "from": before["review_state"],
            "citation_added": body.citation is not None,
            "run_id": run.id,
            "is_mock": run.is_mock,
        },
    )
    return run, finding


def _finding_for(db: Session, user: User, finding_id: str) -> tuple[EngineRun, EngineFinding]:
    finding = db.scalar(
        select(EngineFinding).where(
            EngineFinding.id == finding_id,
            EngineFinding.organization_id == user.organization_id,
        )
    )
    if finding is None:
        raise not_found("Achado")
    return db.get(EngineRun, finding.run_id), finding


def link_claim(
    db: Session, user: User, finding_id: str, body: FindingClaimLinkIn
) -> tuple[EngineRun, EngineFinding]:
    """Relaciona uma afirmacao do mesmo dossie ao achado. Nao muda o estado de nenhum dos dois."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    run, finding = _finding_for(db, user, finding_id)
    claim = db.scalar(
        select(Claim).where(
            Claim.id == body.claim_id,
            Claim.organization_id == user.organization_id,
            Claim.opportunity_id == finding.opportunity_id,
        )
    )
    if claim is None:
        # Afirmacao de outro dossie ou organizacao e tratada como inexistente.
        raise ApiError(422, "claim_not_in_dossier", "A afirmação não pertence a este dossiê.")
    exists = db.scalar(
        select(FindingClaimLink.id).where(
            FindingClaimLink.finding_id == finding.id, FindingClaimLink.claim_id == claim.id
        )
    )
    if exists:
        raise ApiError(409, "link_exists", "Esta afirmação já está relacionada ao achado.")
    link = FindingClaimLink(
        organization_id=user.organization_id,
        opportunity_id=finding.opportunity_id,
        finding_id=finding.id,
        claim_id=claim.id,
        relation=body.relation,
        note=body.note.strip(),
        created_by=user.id,
    )
    db.add(link)
    db.commit()
    audit(
        "finding.claim_link",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"finding:{finding.id}",
        outcome="linked",
        data={"claim_id": claim.id, "relation": body.relation},
    )
    return run, finding


def unlink_claim(db: Session, user: User, link_id: str) -> tuple[EngineRun, EngineFinding]:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    link = db.scalar(
        select(FindingClaimLink).where(
            FindingClaimLink.id == link_id,
            FindingClaimLink.organization_id == user.organization_id,
        )
    )
    if link is None:
        raise not_found("Vínculo")
    run, finding = _finding_for(db, user, link.finding_id)
    data = {"claim_id": link.claim_id, "relation": link.relation}
    db.delete(link)
    db.commit()
    # A remocao fica na trilha de auditoria: o vinculo nao some sem registro.
    audit(
        "finding.claim_link",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"finding:{finding.id}",
        outcome="unlinked",
        data=data,
    )
    return run, finding


def fetch_report(
    db: Session, user: User, client: Nulidade360Client, run_id: str
) -> tuple[EngineRun, bytes]:
    """Relatorio .docx montado pelo motor. E leitura: nada e gravado no dossie."""
    run = get_run(db, user, run_id)
    if run.engine != ENGINE or not run.external_ref:
        raise ApiError(
            409, "engine_report_unavailable", "Esta execução não tem relatório do motor."
        )
    ref = run.external_ref
    db.commit()  # libera a transacao antes da chamada externa
    try:
        content = client.fetch_report(ref)
    except Nulidade360Error as exc:
        audit(
            "engine.run.report",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"engine_run:{run.id}",
            outcome=exc.code,
        )
        raise engine_error(exc) from exc
    audit(
        "engine.run.report",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"engine_run:{run.id}",
        outcome="ok",
        data={"bytes": len(content), "is_mock": run.is_mock},
    )
    return run, content
