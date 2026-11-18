"""Jornada operacional: entrada -> snapshot -> dossie -> revisao -> demonstrativos."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from evidia.adapters.origination import OriginationClient, OriginationError
from evidia.config import Settings
from evidia.deps import current_user, get_db, get_origination, get_settings_dep
from evidia.domain import economics as econ
from evidia.domain.cnj import InvalidCnj, parse_cnj
from evidia.domain.csvsafe import Trusted, decimal_br, render_csv
from evidia.domain.documents import DocumentRejected
from evidia.errors import ApiError, forbidden, not_found
from evidia.logging_setup import audit
from evidia.models import (
    CalculationRun,
    Claim,
    Document,
    DocumentVersion,
    ImportConflict,
    Memo,
    MissingPiece,
    Opportunity,
    OriginSnapshot,
    Process,
    User,
    utcnow,
)
from evidia.schemas import (
    BulkSkipped,
    CalculationRunOut,
    CandidateList,
    CandidateOut,
    ClaimBulkReviewOut,
    ClaimBulkReviewRequest,
    ClaimCreate,
    ClaimOut,
    ClaimReviewOut,
    ClaimReviewRequest,
    ConflictOut,
    CostIn,
    DocumentOut,
    DocumentUploadOut,
    DocumentVersionOut,
    EconomicsRequest,
    ImpactSourceOut,
    ImportOut,
    ImportRequest,
    MemoCreate,
    MemoDecisionRequest,
    MemoOut,
    MissingPieceCreate,
    MissingPieceOut,
    MissingPieceUpdate,
    OpportunityDetail,
    OpportunitySummary,
    OriginDocumentResult,
    OriginDocumentsOut,
    ProcessOut,
    SnapshotOut,
    StageOut,
)
from evidia.services import documents, dossier, economics, evidences, stages
from evidia.services.importing import import_derived_documents, import_from_origin

router = APIRouter(prefix="/api/v1", tags=["operacao"])

_ORIGINATION_STATUS = {
    "origination_not_configured": 503,
    "origination_unavailable": 503,
    "origination_rate_limited": 429,
    "origination_auth_failed": 502,
    "origination_forbidden": 502,
    "origination_contract_violation": 502,
    "origination_not_found": 404,
    "origination_document_not_found": 404,
}


def _origination_error(exc: OriginationError) -> ApiError:
    return ApiError(
        _ORIGINATION_STATUS.get(exc.code, 502),
        exc.code,
        exc.message,
        {"retryable": exc.retryable},
    )


# ------------------------------------------------------------------ originacao


@router.get("/origination/candidates", response_model=CandidateList)
def list_candidates(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    client: OriginationClient = Depends(get_origination),
) -> CandidateList:
    try:
        rows = client.list_candidates()
    except OriginationError as exc:
        audit(
            "origination.list",
            actor=user.id,
            organization_id=user.organization_id,
            target="origination",
            outcome=exc.code,
        )
        raise _origination_error(exc) from exc

    imported: dict[str, list[str]] = {}
    for ext_id, side in db.execute(
        select(Opportunity.origin_external_id, Opportunity.position_side).where(
            Opportunity.organization_id == user.organization_id,
            Opportunity.origin_system == client.system,
        )
    ):
        imported.setdefault(ext_id, []).append(side)

    items = []
    for row in rows:
        try:
            parse_cnj(row.get("cnj_raw"))
            valid = True
        except InvalidCnj:
            valid = False
        items.append(
            CandidateOut(
                **row,
                cnj_valid=valid,
                already_imported_sides=sorted(imported.get(row["external_id"], [])),
            )
        )
    audit(
        "origination.list",
        actor=user.id,
        organization_id=user.organization_id,
        target="origination",
        outcome="ok",
        data={"count": len(items), "origin_system": client.system},
    )
    return CandidateList(
        origin_system=client.system,
        is_synthetic=client.is_synthetic,
        consulted_at=datetime.now(UTC),
        items=items,
    )


@router.post("/origination/imports", response_model=ImportOut)
def import_opportunity(
    body: ImportRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    client: OriginationClient = Depends(get_origination),
) -> ImportOut:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    try:
        result = import_from_origin(
            db,
            user,
            client,
            body.external_id,
            position_side=body.position_side,
            represented_party=body.represented_party,
        )
    except OriginationError as exc:
        audit(
            "opportunity.import",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"origin:{body.external_id}",
            outcome=exc.code,
        )
        raise _origination_error(exc) from exc
    return ImportOut(**result.__dict__)


# ---------------------------------------------------------------- serializacao


def _version_out(v: DocumentVersion, current_no: int) -> DocumentVersionOut:
    return DocumentVersionOut(
        id=v.id,
        document_id=v.document_id,
        version_no=v.version_no,
        sha256=v.sha256,
        filename=v.filename,
        media_type=v.media_type,
        size_bytes=v.size_bytes,
        page_count=v.page_count,
        state=v.state,
        origin=v.origin,
        obtained_at=v.obtained_at,
        uploaded_by=v.uploaded_by,
        is_current=v.version_no == current_no,
        text_source=v.text_source or "none",
        text_pages=v.text_pages or 0,
    )


def _document_out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=d.id,
        title=d.title,
        doc_type=d.doc_type,
        category=d.category,
        current_version_no=d.current_version_no,
        created_at=d.created_at,
        versions=[_version_out(v, d.current_version_no) for v in d.versions],
    )


def _summary_fields(db: Session, opp: Opportunity) -> dict[str, Any]:
    def count(model, *conditions) -> int:
        return db.scalar(
            select(func.count())
            .select_from(model)
            .where(model.opportunity_id == opp.id, *conditions)
        )

    process = db.get(Process, opp.process_id)
    return {
        "id": opp.id,
        "title": opp.title,
        "position_side": opp.position_side,
        "represented_party": opp.represented_party,
        "origin_system": opp.origin_system,
        "origin_external_id": opp.origin_external_id,
        "is_synthetic": opp.is_synthetic,
        "contract_status": opp.contract_status,
        "dossier_version": opp.dossier_version,
        "created_at": opp.created_at,
        "updated_at": opp.updated_at,
        "process": ProcessOut.model_validate(process),
        "documents_count": count(Document),
        "open_gaps_count": count(MissingPiece, MissingPiece.status == "open"),
        "open_conflicts_count": count(ImportConflict, ImportConflict.status == "open"),
        "claims_count": count(Claim),
        "has_full_record": count(Document, Document.category == "full_record") > 0,
    }


def _claim_out(db: Session, claim: Claim) -> ClaimOut:
    title = None
    version_no = None
    if claim.document_version_id:
        version = db.get(DocumentVersion, claim.document_version_id)
        if version:
            version_no = version.version_no
            document = db.get(Document, version.document_id)
            title = document.title if document else None
    return ClaimOut(
        id=claim.id,
        opportunity_id=claim.opportunity_id,
        text=claim.text,
        nature=claim.nature,
        asserted_by=claim.asserted_by,
        subject=claim.subject,
        document_version_id=claim.document_version_id,
        document_title=title,
        document_version_no=version_no,
        page_start=claim.page_start,
        page_end=claim.page_end,
        excerpt=claim.excerpt,
        premise_claim_ids=claim.premise_claim_ids or [],
        review_state=claim.review_state,
        dossier_version=claim.dossier_version,
        stale=claim.stale,
        stale_reason=claim.stale_reason,
        validation_blockers=dossier.validation_blockers(claim),
        created_at=claim.created_at,
        updated_at=claim.updated_at,
        reviews=[ClaimReviewOut.model_validate(r) for r in claim.reviews],
        origin=claim.origin or "manual",
        extraction_confidence=claim.extraction_confidence,
        evidences=evidences.list_for_claim(db, claim.id),
    )


# --------------------------------------------------------------- oportunidades


@router.get("/opportunities", response_model=list[OpportunitySummary])
def list_opportunities(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[OpportunitySummary]:
    opps = db.scalars(
        select(Opportunity)
        .where(Opportunity.organization_id == user.organization_id)
        .order_by(Opportunity.updated_at.desc(), Opportunity.id)
    ).all()
    return [OpportunitySummary(**_summary_fields(db, o)) for o in opps]


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityDetail)
def get_opportunity(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> OpportunityDetail:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    fields = _summary_fields(db, opp)
    snapshots = db.scalars(
        select(OriginSnapshot)
        .where(OriginSnapshot.opportunity_id == opp.id)
        .order_by(OriginSnapshot.version_no.desc())
    ).all()
    conflicts = db.scalars(
        select(ImportConflict)
        .where(ImportConflict.opportunity_id == opp.id)
        .order_by(ImportConflict.created_at.desc())
    ).all()
    gaps = db.scalars(
        select(MissingPiece)
        .where(MissingPiece.opportunity_id == opp.id)
        .order_by(MissingPiece.created_at)
    ).all()
    documents = db.scalars(
        select(Document).where(Document.opportunity_id == opp.id).order_by(Document.created_at)
    ).all()

    blockers: list[str] = []
    if not fields["has_full_record"]:
        blockers.append("Autos integrais não recebidos: documentação pendente.")
    if fields["process"].status == "draft":
        blockers.append("Processo em rascunho: CNJ ausente ou inválido.")
    if fields["open_conflicts_count"]:
        blockers.append("Ha conflitos de identidade em aberto entre snapshots.")

    return OpportunityDetail(
        **fields,
        snapshots=[SnapshotOut.model_validate(s) for s in snapshots],
        conflicts=[ConflictOut.model_validate(c) for c in conflicts],
        missing_pieces=[MissingPieceOut.model_validate(g) for g in gaps],
        documents=[_document_out(d) for d in documents],
        integral_opinion_allowed=not blockers,
        integral_opinion_blockers=blockers,
    )


# ------------------------------------------------------------------ documentos


@router.post("/opportunities/{opportunity_id}/origin-documents", response_model=OriginDocumentsOut)
def import_origin_documents(
    opportunity_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    client: OriginationClient = Depends(get_origination),
    settings: Settings = Depends(get_settings_dep),
) -> OriginDocumentsOut:
    """Importa os relatorios derivados da originacao como documentos do dossie."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    try:
        results = import_derived_documents(
            db,
            user,
            client,
            opp,
            storage_dir=Path(settings.storage_dir),
            max_bytes=settings.max_upload_bytes,
        )
    except OriginationError as exc:
        db.rollback()
        audit(
            "opportunity.import_documents",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"opportunity:{opportunity_id}",
            outcome=exc.code,
        )
        raise ApiError(_ORIGINATION_STATUS.get(exc.code, 502), exc.code, exc.message) from exc
    for row in results:
        stored = row.pop("_stored", None)
        if stored is not None:
            documents.ingest_text(db, user, stored.version, settings)
    db.refresh(opp)
    return OriginDocumentsOut(
        results=[OriginDocumentResult(**row) for row in results],
        dossier_version=opp.dossier_version,
    )


@router.post("/opportunities/{opportunity_id}/documents", response_model=DocumentUploadOut)
async def upload_document(
    opportunity_id: str,
    file: UploadFile = File(...),
    title: str = Form(""),
    doc_type: str = Form("nao_classificado"),
    category: str = Form("piece"),
    document_id: str | None = Form(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> DocumentUploadOut:
    content = await file.read(settings.max_upload_bytes + 1)
    try:
        stored = dossier.store_document(
            db,
            user,
            Path(settings.storage_dir),
            settings.max_upload_bytes,
            opportunity_id=opportunity_id,
            filename=Path(file.filename or "arquivo").name,
            content=content,
            title=title,
            doc_type=doc_type,
            category=category,
            document_id=document_id or None,
        )
    except DocumentRejected as exc:
        db.rollback()
        audit(
            "document.upload",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"opportunity:{opportunity_id}",
            outcome=exc.code,
        )
        raise ApiError(422, exc.code, exc.message) from exc
    if not stored.duplicate:
        documents.ingest_text(db, user, stored.version, settings)
    opp = dossier.get_opportunity(db, user, opportunity_id)
    db.refresh(stored.document)
    return DocumentUploadOut(
        document=_document_out(stored.document),
        version=_version_out(stored.version, stored.document.current_version_no),
        duplicate=stored.duplicate,
        superseded_claims=stored.superseded_claims,
        superseded_calculations=stored.superseded_runs,
        dossier_version=opp.dossier_version,
    )


@router.get("/document-versions/{version_id}/content")
def download_document(
    version_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> FileResponse:
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.organization_id == user.organization_id,
        )
    )
    if version is None:
        raise not_found("Documento")
    path = Path(settings.storage_dir) / version.storage_key
    if not path.is_file():
        raise ApiError(410, "document_content_missing", "Conteúdo do documento indisponível.")
    audit(
        "document.read",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"document_version:{version.id}",
        outcome="ok",
    )
    return FileResponse(
        path,
        media_type=version.media_type,
        filename=version.filename,
        content_disposition_type="inline",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


# --------------------------------------------------------------------- lacunas


@router.post("/opportunities/{opportunity_id}/missing-pieces", response_model=MissingPieceOut)
def add_missing_piece(
    opportunity_id: str,
    body: MissingPieceCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> MissingPieceOut:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    piece = MissingPiece(
        organization_id=user.organization_id,
        opportunity_id=opp.id,
        description=body.description,
        reason=body.reason,
        created_by=user.id,
    )
    db.add(piece)
    db.commit()
    return MissingPieceOut.model_validate(piece)


@router.patch("/missing-pieces/{piece_id}", response_model=MissingPieceOut)
def update_missing_piece(
    piece_id: str,
    body: MissingPieceUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> MissingPieceOut:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    piece = db.scalar(
        select(MissingPiece).where(
            MissingPiece.id == piece_id, MissingPiece.organization_id == user.organization_id
        )
    )
    if piece is None:
        raise not_found("Lacuna", feminine=True)
    previous = piece.status
    piece.status = body.status
    db.commit()
    audit(
        "missing_piece.update",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"missing_piece:{piece.id}",
        outcome=body.status,
        data={"from": previous},
    )
    return MissingPieceOut.model_validate(piece)


# ------------------------------------------------------------------ afirmacoes


@router.get("/opportunities/{opportunity_id}/claims", response_model=list[ClaimOut])
def list_claims(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ClaimOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    claims = db.scalars(
        select(Claim).where(Claim.opportunity_id == opp.id).order_by(Claim.created_at, Claim.id)
    ).all()
    return [_claim_out(db, c) for c in claims]


@router.post("/opportunities/{opportunity_id}/claims", response_model=ClaimOut, status_code=201)
def create_claim(
    opportunity_id: str,
    body: ClaimCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ClaimOut:
    claim = dossier.create_claim(db, user, opportunity_id, body.model_dump())
    return _claim_out(db, claim)


@router.post(
    "/opportunities/{opportunity_id}/claims/bulk-review", response_model=ClaimBulkReviewOut
)
def bulk_review_claims(
    opportunity_id: str,
    body: ClaimBulkReviewRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ClaimBulkReviewOut:
    updated, skipped = dossier.bulk_send_to_review(db, user, opportunity_id, body.ids)
    return ClaimBulkReviewOut(updated=updated, skipped=[BulkSkipped(**s) for s in skipped])


@router.post("/claims/{claim_id}/reviews", response_model=ClaimOut)
def review_claim(
    claim_id: str,
    body: ClaimReviewRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ClaimOut:
    claim = dossier.review_claim(db, user, claim_id, body.model_dump(exclude_unset=True))
    db.refresh(claim)
    return _claim_out(db, claim)


# -------------------------------------------------------------------- economia


def _cost(c: CostIn) -> econ.CostItem:
    return econ.CostItem(
        label=c.label,
        amount=c.amount,
        currency=c.currency,
        years_from_base=c.years_from_base,
        on_date=c.on_date,
        included_in_disbursement=c.included_in_disbursement,
        source=c.source,
        responsible=c.responsible,
        confidence=c.confidence,
    )


def _impacts(items, labels: dict[str, str]) -> tuple[econ.Impact, ...]:
    return tuple(
        econ.Impact(
            id=i.id,
            label=i.label,
            dependency_group=i.dependency_group,
            affects=i.affects,
            amount=i.amount,
            years=i.years,
            note=i.note,
            source_type="" if i.source_type == "manual" else i.source_type,
            source_id=i.source_id or "",
            source_label=labels.get(f"{i.source_type}:{i.source_id}", ""),
            responsible=i.responsible,
            confidence=i.confidence,
        )
        for i in items
    )


def _assumptions(a) -> econ.Assumptions:
    return econ.Assumptions(
        currency=a.currency,
        base_date=a.base_date,
        discount_rate=a.discount_rate,
        discount_rate_approved_by=a.discount_rate_approved_by,
        probabilities_approved_by=a.probabilities_approved_by,
        heuristic_score=a.heuristic_score,
        notes=tuple(a.notes),
    )


def compute_statements(
    body: EconomicsRequest, source_labels: dict[str, str] | None = None
) -> dict[str, Any]:
    """`source_labels`: rotulo das fontes ja conferidas dos impactos (ver services)."""
    labels = source_labels or {}
    result: dict[str, Any] = {
        "formula_version": econ.FORMULA_VERSION,
        "claimant": None,
        "defendant": None,
    }
    if body.claimant is not None:
        result["claimant"] = econ.claimant_statement(
            [
                econ.ClaimantScenario(
                    id=s.id,
                    label=s.label,
                    gross_receipt=s.gross_receipt,
                    currency=s.currency,
                    years_from_base=s.years_from_base,
                    receipt_date=s.receipt_date,
                    costs=tuple(_cost(c) for c in s.costs),
                    probability=s.probability,
                    impacts=_impacts(s.impacts, labels),
                    source=s.source,
                    responsible=s.responsible,
                    confidence=s.confidence,
                )
                for s in body.claimant.scenarios
            ],
            _assumptions(body.claimant.assumptions),
        )
    if body.defendant is not None:
        result["defendant"] = econ.defendant_statement(
            Decimal(body.defendant.reference_exposure),
            [
                econ.DefendantScenario(
                    id=s.id,
                    label=s.label,
                    disbursement=s.disbursement,
                    currency=s.currency,
                    years_from_base=s.years_from_base,
                    disbursement_date=s.disbursement_date,
                    incremental_costs=tuple(_cost(c) for c in s.incremental_costs),
                    probability=s.probability,
                    impacts=_impacts(s.impacts, labels),
                    source=s.source,
                    responsible=s.responsible,
                    confidence=s.confidence,
                )
                for s in body.defendant.scenarios
            ],
            _assumptions(body.defendant.assumptions),
            reference_currency=body.defendant.reference_currency,
            reference_label=body.defendant.reference_label,
        )
    return result


@router.post(
    "/opportunities/{opportunity_id}/calculations",
    response_model=CalculationRunOut,
    status_code=201,
)
def run_calculation(
    opportunity_id: str,
    body: EconomicsRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> CalculationRunOut:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    if body.claimant is None and body.defendant is None:
        raise ApiError(422, "no_statement_requested", "Informe ao menos um demonstrativo.")
    opp = dossier.get_opportunity(db, user, opportunity_id)
    try:
        result = compute_statements(body, economics.impact_source_labels(db, opp, body))
    except econ.EconomicsError as exc:
        db.rollback()
        raise ApiError(422, exc.code, exc.message) from exc
    result["limitations"] = economics.limitations(db, opp, result)
    run = CalculationRun(
        organization_id=user.organization_id,
        opportunity_id=opp.id,
        formula_version=econ.FORMULA_VERSION,
        dossier_version=opp.dossier_version,
        inputs=body.model_dump(mode="json"),
        result=result,
        created_by=user.id,
    )
    db.add(run)
    db.commit()
    audit(
        "calculation.run",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"calculation:{run.id}",
        outcome="ok",
        data={"opportunity_id": opp.id, "formula_version": econ.FORMULA_VERSION},
    )
    return CalculationRunOut.model_validate(run)


@router.get("/opportunities/{opportunity_id}/calculations", response_model=list[CalculationRunOut])
def list_calculations(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[CalculationRunOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    runs = db.scalars(
        select(CalculationRun)
        .where(CalculationRun.opportunity_id == opp.id)
        .order_by(CalculationRun.created_at.desc(), CalculationRun.id)
    ).all()
    return [CalculationRunOut.model_validate(r) for r in runs]


_UNDEFINED = "não definido"


def _money(value: str | None) -> object:
    # Nulo e ausencia de definicao: nunca vira zero na exportacao.
    return _UNDEFINED if value is None else decimal_br(value)


def calculation_csv_rows(run: CalculationRun) -> list[list[object]]:
    """Exportacao do demonstrativo a partir do resultado gravado: os mesmos numeros
    do resumo e do detalhe, sem recalculo."""
    rows: list[list[object]] = [
        ["Execução", Trusted(run.id)],
        ["Versão da fórmula", run.formula_version],
        ["Versão do dossiê", run.dossier_version],
        ["Situação", "desatualizado" if run.stale else "vigente"],
        ["Metodologia", "não homologada"],
    ]
    for side, title in (("claimant", "Recebimento do autor"), ("defendant", "Redução de passivo")):
        statement = run.result.get(side)
        if not statement:
            continue
        contract = statement["contract"]
        rows += [
            [],
            [title],
            ["Moeda", statement["currency"]],
            ["Data-base", Trusted(statement["base_date"])],
            ["Taxa de desconto", _money(statement["discount_rate"])],
            ["Preço", _money(contract["price"]["value"])],
            ["Retorno do investidor", _money(contract["investor_return"]["value"])],
            ["Remuneração contratual", _money(contract["contractual_fee"]["value"])],
        ]
        if side == "defendant":
            rows += [
                ["Exposição de referência", _money(statement["reference_exposure"])],
                ["Beneficiário da redução", "cliente"],
                ["Receita da Evidia", _money(statement["evidia_revenue"]["value"])],
            ]
        rows += [
            [],
            [
                "Cenário",
                "Probabilidade",
                "Componente",
                "Operação",
                "Valor",
                "Valor presente",
                "Fonte",
            ],
        ]
        result_key = "net_receipt" if side == "claimant" else "net_reduction"
        for scenario in statement["scenarios"]:
            probability = scenario["probability"]
            shown = "não informada" if probability is None else decimal_br(probability)
            for step in scenario.get("steps", []):
                rows.append(
                    [
                        scenario["label"],
                        shown,
                        step["label"],
                        {"+": "soma", "-": "subtrai"}.get(step["sign"], "informativo"),
                        _money(step["amount"]),
                        "" if step["present_value"] is None else decimal_br(step["present_value"]),
                        step["source"],
                    ]
                )
            pv = scenario.get("net_present_value")
            rows.append(
                [
                    scenario["label"],
                    shown,
                    "Resultado líquido",
                    "total",
                    _money(scenario[result_key]),
                    "" if pv is None else decimal_br(pv),
                    "",
                ]
            )
        impact_rows = [
            [
                scenario["label"],
                impact["label"],
                impact["dependency_group"],
                economics.AFFECTS_LABEL[impact["affects"]],
                "" if impact["amount"] is None else decimal_br(impact["amount"]),
                "" if impact["years"] is None else decimal_br(impact["years"]),
                "aplicado" if impact["applied"] else "não aplicado",
                economics.REASON_LABEL.get(impact["not_applied_reason"] or "", ""),
                impact["source"]["label"] or "Premissa manual",
            ]
            for scenario in statement["scenarios"]
            for impact in scenario.get("impacts", [])
        ]
        if impact_rows:
            rows += [
                [],
                ["Impactos"],
                [
                    "Cenário",
                    "Impacto",
                    "Grupo de dependência",
                    "Incide em",
                    "Valor",
                    "Anos",
                    "Situação",
                    "Motivo",
                    "Fonte",
                ],
                *impact_rows,
            ]
        sensitivity_rows = [
            [
                scenario["label"],
                row["parameter"],
                row["change"],
                _money(row[result_key]),
                ""
                if row.get("net_present_value") is None
                else decimal_br(row["net_present_value"]),
            ]
            for scenario in statement["scenarios"]
            for row in scenario.get("sensitivity", [])
        ]
        if sensitivity_rows:
            rows += [
                [],
                ["Sensibilidade (uma premissa por vez)"],
                ["Cenário", "Premissa", "Variação", "Resultado líquido", "Valor presente"],
                *sensitivity_rows,
            ]
        weighted = statement["weighted"]
        expected = weighted.get("expected_net_receipt", weighted.get("expected_net_reduction"))
        rows += [
            [],
            [
                "Valor ponderado",
                _money(expected)
                if weighted["available"]
                else f"indisponível ({weighted['reason']})",
            ],
        ]
    return rows


@router.get(
    "/calculations/{run_id}/export",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}, "description": "CSV (UTF-8, separador ;)"}},
)
def export_calculation(
    run_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    run = db.scalar(
        select(CalculationRun).where(
            CalculationRun.id == run_id,
            CalculationRun.organization_id == user.organization_id,
        )
    )
    if run is None:
        raise not_found("Demonstrativo")
    audit(
        "calculation.export",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"calculation:{run.id}",
        outcome="ok",
    )
    return Response(
        content=render_csv(calculation_csv_rows(run)),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="demonstrativo-{run.id[:8]}.csv"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/opportunities/{opportunity_id}/impact-sources", response_model=list[ImpactSourceOut])
def list_impact_sources(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ImpactSourceOut]:
    """Fontes ja validadas por pessoa; so elas podem ser ligadas a um impacto."""
    opp = dossier.get_opportunity(db, user, opportunity_id)
    return [ImpactSourceOut(**row) for row in economics.validated_sources(db, opp)]


# ------------------------------------------------------------------ memorando


@router.post("/opportunities/{opportunity_id}/memos", response_model=MemoOut, status_code=201)
def create_memo(
    opportunity_id: str,
    body: MemoCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> MemoOut:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    memo = economics.create_memo(db, user, opp, body.calculation_run_id, body.notes)
    db.commit()
    audit(
        "memo.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"memo:{memo.id}",
        outcome="ok",
        data={
            "opportunity_id": opp.id,
            "version": memo.version,
            "calculation": memo.calculation_run_id,
        },
    )
    return MemoOut.model_validate(memo)


@router.get("/opportunities/{opportunity_id}/memos", response_model=list[MemoOut])
def list_memos(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[MemoOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    memos = db.scalars(
        select(Memo).where(Memo.opportunity_id == opp.id).order_by(Memo.version.desc())
    ).all()
    return [MemoOut.model_validate(m) for m in memos]


@router.get(
    "/memos/{memo_id}/export",
    response_class=Response,
    responses={200: {"content": {"text/markdown": {}}, "description": "Memorando em Markdown"}},
)
def export_memo(
    memo_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    memo = db.scalar(
        select(Memo).where(Memo.id == memo_id, Memo.organization_id == user.organization_id)
    )
    if memo is None:
        raise not_found("Memorando")
    audit(
        "memo.export",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"memo:{memo.id}",
        outcome="ok",
    )
    body = memo.body
    if memo.stale:
        body = f"> ATENÇÃO: memorando desatualizado — {memo.stale_reason}.\n\n" + body
    return Response(
        content=body.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="memorando-v{memo.version}.md"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/memos/{memo_id}/decision", response_model=MemoOut)
def decide_memo(
    memo_id: str,
    body: MemoDecisionRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> MemoOut:
    """Aprovacao ou devolucao do memorando pelo responsavel. Decisao unica por versao."""
    if user.role not in dossier.REVIEWER_ROLES:
        raise forbidden()
    memo = db.scalar(
        select(Memo).where(Memo.id == memo_id, Memo.organization_id == user.organization_id)
    )
    if memo is None:
        raise not_found("Memorando")
    if memo.stale:
        raise ApiError(
            409, "memo_stale", "Memorando desatualizado: emita nova versão antes de decidir."
        )
    if settings.memo_distinct_approver and memo.created_by == user.id:
        raise ApiError(
            403,
            "memo_same_person",
            "Quem emitiu o memorando não pode decidir sobre ele: a decisão é de outro responsável.",
        )
    if memo.decision is not None:
        raise ApiError(
            409,
            "memo_already_decided",
            "Esta versão já tem decisão registrada; para mudar, emita nova versão.",
        )
    memo.decision = body.decision
    memo.decision_comment = body.comment.strip()
    memo.decided_by = user.id
    memo.decided_at = utcnow()
    db.commit()
    audit(
        "memo.decision",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"memo:{memo.id}",
        outcome=body.decision,
        data={"opportunity_id": memo.opportunity_id, "version": memo.version},
    )
    return MemoOut.model_validate(memo)


# --------------------------------------------------------------------- etapas


@router.get("/opportunities/{opportunity_id}/stages", response_model=list[StageOut])
def list_stages(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[StageOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    process = db.get(Process, opp.process_id)
    counts = stages.collect(
        db, opp, draft_process=process is not None and process.status == "draft"
    )
    return [StageOut(**row) for row in stages.build(counts)]
