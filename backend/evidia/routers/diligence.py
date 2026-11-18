"""Diligencia de vinculos e qualificacao tecnica (T011, T012)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from evidia.adapters.diligence import DiligenceConnector
from evidia.config import Settings
from evidia.deps import current_user, get_db, get_diligence, get_settings_dep
from evidia.domain.csvsafe import render_csv
from evidia.logging_setup import audit
from evidia.models import User
from evidia.schemas_diligence import (
    CrosscheckOut,
    MergeRequest,
    OccurrenceIn,
    OccurrenceOut,
    OccurrenceReviewRequest,
    ParticipantIn,
    ParticipantOut,
    ParticipantUpdate,
    RoleIn,
    RoleOut,
    SearchFileImport,
    SearchOut,
    SearchRequest,
)
from evidia.services import diligence, dossier

router = APIRouter(prefix="/api/v1", tags=["diligencia"])


@router.get("/opportunities/{opportunity_id}/participants", response_model=list[ParticipantOut])
def list_participants(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ParticipantOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    return diligence.participants_out(db, opp.id)


@router.post(
    "/opportunities/{opportunity_id}/participants", response_model=ParticipantOut, status_code=201
)
def create_participant(
    opportunity_id: str,
    body: ParticipantIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    created = diligence.create_participant(db, user, opportunity_id, body.model_dump(mode="json"))
    return diligence.participant_out(db, created)


@router.patch("/participants/{participant_id}", response_model=ParticipantOut)
def update_participant(
    participant_id: str,
    body: ParticipantUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    updated = diligence.update_participant(
        db, user, participant_id, body.model_dump(mode="json", exclude_unset=True)
    )
    return diligence.participant_out(db, updated)


@router.post("/participants/{participant_id}/merge", response_model=ParticipantOut)
def merge_participant(
    participant_id: str,
    body: MergeRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    """Une esta ficha a outra. Ato de revisor, com motivo; pode ser desfeito."""
    target = diligence.merge_participants(
        db, user, participant_id, body.into_participant_id, body.reason
    )
    return diligence.participant_out(db, target)


@router.post("/participants/{participant_id}/unmerge", response_model=ParticipantOut)
def unmerge_participant(
    participant_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ParticipantOut:
    restored = diligence.unmerge_participant(db, user, participant_id)
    return diligence.participant_out(db, restored)


@router.post("/participants/{participant_id}/roles", response_model=RoleOut, status_code=201)
def add_role(
    participant_id: str,
    body: RoleIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> RoleOut:
    return diligence.role_out(diligence.add_role(db, user, participant_id, body.model_dump()))


@router.delete("/process-roles/{role_id}", status_code=204)
def delete_role(
    role_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    diligence.delete_role(db, user, role_id)
    return Response(status_code=204)


@router.post(
    "/opportunities/{opportunity_id}/diligence-searches", response_model=SearchOut, status_code=201
)
def run_search(
    opportunity_id: str,
    body: SearchRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    connector: DiligenceConnector = Depends(get_diligence),
) -> SearchOut:
    """Consulta a fonte configurada. Falha da fonte e gravada como pesquisa com estado
    `failed` — nao como 'nenhum resultado'."""
    search = diligence.run_search(
        db, user, connector, opportunity_id, body.participant_id, body.reference_date
    )
    return diligence.search_out(search)


@router.post(
    "/opportunities/{opportunity_id}/diligence-searches/file",
    response_model=SearchOut,
    status_code=201,
)
def import_search_file(
    opportunity_id: str,
    body: SearchFileImport,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> SearchOut:
    """Registra o resultado de uma consulta feita fora, a partir de planilha do dossie."""
    search = diligence.import_search_file(
        db, user, settings.storage_dir, opportunity_id, body.model_dump()
    )
    return diligence.search_out(search)


@router.get("/opportunities/{opportunity_id}/diligence-searches", response_model=list[SearchOut])
def list_searches(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[SearchOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    return [diligence.search_out(s) for s in diligence.list_searches(db, opp.id)]


@router.get("/opportunities/{opportunity_id}/diligence/crosscheck", response_model=CrosscheckOut)
def crosscheck(
    opportunity_id: str,
    reference_date: date | None = Query(default=None, description="Fim da janela de cinco anos"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> CrosscheckOut:
    return diligence.crosscheck(db, user, opportunity_id, reference_date)


@router.get("/opportunities/{opportunity_id}/occurrences", response_model=list[OccurrenceOut])
def list_occurrences(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[OccurrenceOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    return [diligence.occurrence_out(db, o) for o in diligence.list_occurrences(db, opp.id)]


@router.post(
    "/opportunities/{opportunity_id}/occurrences", response_model=OccurrenceOut, status_code=201
)
def create_occurrence(
    opportunity_id: str,
    body: OccurrenceIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> OccurrenceOut:
    created = diligence.create_occurrence(db, user, opportunity_id, body.model_dump())
    return diligence.occurrence_out(db, created)


@router.post("/occurrences/{occurrence_id}/reviews", response_model=OccurrenceOut)
def review_occurrence(
    occurrence_id: str,
    body: OccurrenceReviewRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> OccurrenceOut:
    reviewed = diligence.review_occurrence(
        db, user, occurrence_id, body.model_dump(exclude_unset=True)
    )
    return diligence.occurrence_out(db, reviewed)


@router.get(
    "/opportunities/{opportunity_id}/diligence/export",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}, "description": "CSV (UTF-8, separador ;)"}},
)
def export_diligence(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    rows = diligence.export_rows(db, user, opportunity_id)
    audit(
        "diligence.export",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"opportunity:{opportunity_id}",
        outcome="ok",
        data={"rows": len(rows) - 1},
    )
    return Response(
        content=render_csv(rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="diligencia.csv"',
            "Cache-Control": "no-store",
        },
    )
