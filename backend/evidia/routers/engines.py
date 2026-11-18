"""Execucoes de motor no dossie (T008). Hoje: Nulidade360 em modo simulado."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.adapters.nulidade360 import Nulidade360Client
from evidia.config import Settings
from evidia.deps import current_user, get_db, get_nulidade360, get_settings_dep
from evidia.models import EngineFinding, EngineRun, P4Request, User
from evidia.schemas_engines import (
    EngineRunCreate,
    EngineRunOut,
    FindingClaimLinkIn,
    FindingOut,
    FindingReviewRequest,
    P4ImportRequest,
    P4ItemOut,
    P4RequestCreate,
    P4RequestOut,
)
from evidia.services import dossier, engines, p4

router = APIRouter(prefix="/api/v1", tags=["motores"])


@router.post(
    "/opportunities/{opportunity_id}/engine-runs",
    response_model=EngineRunOut,
    status_code=201,
    responses={200: {"model": EngineRunOut, "description": "Execução equivalente reaproveitada"}},
)
def start_engine_run(
    opportunity_id: str,
    body: EngineRunCreate,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    client: Nulidade360Client = Depends(get_nulidade360),
    settings: Settings = Depends(get_settings_dep),
) -> EngineRunOut:
    run, reused = engines.start_run(db, user, client, settings, opportunity_id, body)
    if reused:
        response.status_code = 200
    return engines.run_out(db, run)


@router.get("/opportunities/{opportunity_id}/engine-runs", response_model=list[EngineRunOut])
def list_engine_runs(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[EngineRunOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    runs = db.scalars(
        select(EngineRun)
        .where(EngineRun.opportunity_id == opp.id)
        .order_by(EngineRun.created_at.desc(), EngineRun.id)
    ).all()
    return [engines.run_out(db, run) for run in runs]


@router.post("/engine-runs/{run_id}/refresh", response_model=EngineRunOut)
def refresh_engine_run(
    run_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    client: Nulidade360Client = Depends(get_nulidade360),
    settings: Settings = Depends(get_settings_dep),
) -> EngineRunOut:
    """Consulta o motor e atualiza a execucao. Nao reenvia documento nem reinicia analise."""
    run = engines.get_run(db, user, run_id)
    return engines.run_out(db, engines.refresh_run(db, user.id, client, settings, run))


@router.get("/engine-runs/{run_id}/findings", response_model=list[FindingOut])
def list_engine_findings(
    run_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[FindingOut]:
    run = engines.get_run(db, user, run_id)
    findings = db.scalars(
        select(EngineFinding)
        .where(EngineFinding.run_id == run.id)
        .order_by(EngineFinding.block_key, EngineFinding.created_at, EngineFinding.id)
    ).all()
    return [engines.finding_out(db, run, finding) for finding in findings]


@router.post("/engine-findings/{finding_id}/reviews", response_model=FindingOut)
def review_engine_finding(
    finding_id: str,
    body: FindingReviewRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> FindingOut:
    run, finding = engines.review_finding(db, user, finding_id, body)
    return engines.finding_out(db, run, finding)


@router.post(
    "/opportunities/{opportunity_id}/p4-imports",
    response_model=EngineRunOut,
    status_code=201,
    responses={200: {"model": EngineRunOut, "description": "Relatório já importado"}},
)
def import_p4_report(
    opportunity_id: str,
    body: P4ImportRequest,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> EngineRunOut:
    """Importa o relatorio de uma execucao do P4. A Evidia nao executa o P4."""
    data = body.model_dump()
    request = p4.check_request_for_import(db, user, opportunity_id, data)
    run, reused = p4.import_report(db, user, settings, opportunity_id, data)
    if request is not None:
        p4.close_request(db, user, request, run)
    if reused:
        response.status_code = 200
    return engines.run_out(db, run)


@router.get("/engine-runs/{run_id}/p4-items", response_model=list[P4ItemOut])
def list_p4_items(
    run_id: str,
    kind: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[P4ItemOut]:
    run = engines.get_run(db, user, run_id)
    return [p4.item_out(item) for item in p4.list_items(db, run, kind)]


@router.post(
    "/engine-findings/{finding_id}/claim-links", response_model=FindingOut, status_code=201
)
def link_finding_claim(
    finding_id: str,
    body: FindingClaimLinkIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> FindingOut:
    run, finding = engines.link_claim(db, user, finding_id, body)
    return engines.finding_out(db, run, finding)


@router.delete("/engine-finding-claim-links/{link_id}", response_model=FindingOut)
def unlink_finding_claim(
    link_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> FindingOut:
    run, finding = engines.unlink_claim(db, user, link_id)
    return engines.finding_out(db, run, finding)


@router.get(
    "/engine-runs/{run_id}/report",
    response_class=Response,
    responses={200: {"description": "Relatório .docx gerado pelo motor"}},
)
def engine_run_report(
    run_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    client: Nulidade360Client = Depends(get_nulidade360),
) -> Response:
    run, content = engines.fetch_report(db, user, client, run_id)
    # Execucao simulada fica marcada no nome do arquivo: o relatorio nao e analise real.
    suffix = "-SIMULADO" if run.is_mock else ""
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="nulidade360-{run.id[:8]}{suffix}.docx"',
            "Cache-Control": "no-store",
        },
    )


# ----------------------------------------------- pedido de execucao do P4


@router.post(
    "/opportunities/{opportunity_id}/p4-requests", response_model=P4RequestOut, status_code=201
)
def create_p4_request(
    opportunity_id: str,
    body: P4RequestCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> P4RequestOut:
    """Registra o pedido e fixa o pacote de entrada. A Evidia nao executa o P4."""
    request = p4.create_request(db, user, opportunity_id, body.model_dump())
    return p4.request_out(db, request)


@router.get("/opportunities/{opportunity_id}/p4-requests", response_model=list[P4RequestOut])
def list_p4_requests(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[P4RequestOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    requests = db.scalars(
        select(P4Request)
        .where(P4Request.opportunity_id == opp.id)
        .order_by(P4Request.created_at.desc(), P4Request.id)
    ).all()
    return [p4.request_out(db, request) for request in requests]


@router.get(
    "/p4-requests/{request_id}/package",
    response_class=Response,
    responses={200: {"content": {"text/plain": {}}, "description": "Texto pré-paginado para o P4"}},
)
def p4_request_package(
    request_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    request, text = p4.request_package(db, user, request_id)
    return Response(
        content=text.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="p4-entrada-{request.id[:8]}.txt"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/p4-requests/{request_id}/cancel", response_model=P4RequestOut)
def cancel_p4_request(
    request_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> P4RequestOut:
    return p4.request_out(db, p4.cancel_request(db, user, request_id))
