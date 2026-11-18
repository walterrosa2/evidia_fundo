"""Texto, OCR, estrutura do documento, sugestoes e evidencias de afirmacao (T006, T007)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.config import Settings
from evidia.deps import current_user, get_db, get_llm, get_settings_dep
from evidia.llm import LLMClient
from evidia.logging_setup import audit
from evidia.models import Job, User
from evidia.schemas import (
    ClaimEvidenceIn,
    ClaimEvidenceOut,
    ClaimSuggestionRequest,
    ClaimSuggestionsOut,
    DocumentPageOut,
    DocumentSegmentIn,
    DocumentSegmentOut,
    DocumentTextOut,
    JobOut,
)
from evidia.services import documents, dossier, evidences

router = APIRouter(prefix="/api/v1", tags=["documentos"])


def _job_out(job: Job) -> JobOut:
    return JobOut.model_validate(job)


@router.get("/document-versions/{version_id}/text", response_model=DocumentTextOut)
def document_text(
    version_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> DocumentTextOut:
    """Situacao do texto do documento: paginas com texto, origem e estrutura mapeada."""
    version = documents.get_version(db, user, version_id)
    pages = documents.list_pages(db, version)
    segments = documents.list_segments(db, version)
    active = db.scalars(
        select(Job).where(Job.target_id == version.id, Job.status.in_(("queued", "running")))
    ).all()
    last = db.scalar(
        select(Job)
        .where(Job.target_id == version.id, Job.status.in_(("completed", "failed")))
        .order_by(Job.finished_at.desc())
    )
    return DocumentTextOut(
        document_version_id=version.id,
        filename=version.filename,
        state=version.state,
        page_count=version.page_count,
        text_source=version.text_source,
        pages_with_text=[
            {"page_no": p.page_no, "source": p.source, "char_count": p.char_count} for p in pages
        ],
        ocr_available=documents.ocr_engine(settings).available(),
        active_jobs=[_job_out(job) for job in active],
        last_job=_job_out(last) if last else None,
        segments=[DocumentSegmentOut.model_validate(s) for s in segments],
    )


@router.get("/document-versions/{version_id}/pages/{page_no}", response_model=DocumentPageOut)
def document_page(
    version_id: str,
    page_no: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DocumentPageOut:
    version = documents.get_version(db, user, version_id)
    page = documents.get_page(db, version, page_no)
    audit(
        "document.read",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"document_version:{version.id}",
        outcome="page_text",
        data={"page_no": page_no},
    )
    return DocumentPageOut(
        page_no=page.page_no,
        text=page.text,
        source=page.source,
        char_count=page.char_count,
        folio=documents.folio_for_page(documents.list_segments(db, version), page.page_no),
    )


@router.post(
    "/document-versions/{version_id}/ocr",
    response_model=JobOut,
    status_code=202,
    responses={200: {"model": JobOut, "description": "OCR já em andamento para este documento"}},
)
def request_ocr(
    version_id: str,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> JobOut:
    job, created = documents.request_ocr(db, user, version_id, settings)
    if not created:
        response.status_code = 200
    return _job_out(job)


@router.get("/opportunities/{opportunity_id}/jobs", response_model=list[JobOut])
def list_jobs(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[JobOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    found = db.scalars(
        select(Job).where(Job.opportunity_id == opp.id).order_by(Job.created_at.desc()).limit(100)
    ).all()
    return [_job_out(job) for job in found]


@router.post(
    "/document-versions/{version_id}/segments", response_model=DocumentSegmentOut, status_code=201
)
def add_segment(
    version_id: str,
    body: DocumentSegmentIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DocumentSegmentOut:
    segment = documents.add_segment(db, user, version_id, body.model_dump())
    return DocumentSegmentOut.model_validate(segment)


@router.delete("/document-segments/{segment_id}", status_code=204)
def delete_segment(
    segment_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    documents.delete_segment(db, user, segment_id)
    return Response(status_code=204)


@router.post(
    "/document-versions/{version_id}/claim-suggestions", response_model=ClaimSuggestionsOut
)
def suggest_claims(
    version_id: str,
    body: ClaimSuggestionRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    settings: Settings = Depends(get_settings_dep),
) -> ClaimSuggestionsOut:
    """Sugestoes para revisao. Nada e gravado por esta rota."""
    out = documents.suggest_claims(
        db,
        user,
        llm,
        settings,
        version_id,
        method=body.method,
        page_from=body.page_from,
        page_to=body.page_to,
    )
    return ClaimSuggestionsOut(
        document_version_id=version_id,
        method=out["method"],
        is_mock=out["is_mock"],
        model=out["model"],
        pages_analyzed=out["pages_analyzed"],
        suggestions=[
            {
                "text": s.text,
                "nature": s.nature,
                "asserted_by": s.asserted_by,
                "page_no": s.page_no,
                "excerpt": s.excerpt,
                "confidence": s.confidence,
                "method": s.method,
            }
            for s in out["suggestions"]
        ],
        rejected=out["rejected"],
        nature_adjusted=out["nature_adjusted"],
        usage=out["usage"],
    )


@router.post("/claims/{claim_id}/evidences", response_model=ClaimEvidenceOut, status_code=201)
def add_claim_evidence(
    claim_id: str,
    body: ClaimEvidenceIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ClaimEvidenceOut:
    return evidences.evidence_out(db, evidences.add_evidence(db, user, claim_id, body.model_dump()))


@router.delete("/claim-evidences/{evidence_id}", status_code=204)
def delete_claim_evidence(
    evidence_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    evidences.delete_evidence(db, user, evidence_id)
    return Response(status_code=204)
