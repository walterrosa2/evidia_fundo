"""Dossie documental e afirmacoes rastreaveis (RF02–RF03, AC04–AC05)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from evidia.domain.documents import DOCUMENT_CATEGORIES, Inspection, inspect
from evidia.errors import ApiError, forbidden, not_found
from evidia.logging_setup import audit
from evidia.models import (
    CalculationRun,
    Claim,
    ClaimReview,
    Document,
    DocumentVersion,
    EngineRun,
    Memo,
    Opportunity,
    User,
    utcnow,
)

CLAIM_NATURES = (
    "documentary_finding",
    "attributed_allegation",
    "analytical_inference",
    "human_conclusion",
)
REVIEW_STATES = ("pending", "in_review", "validated", "discarded", "contested", "inconclusive")
REVIEWER_ROLES = ("admin", "reviewer")
WRITER_ROLES = ("admin", "analyst", "reviewer")


@dataclass(frozen=True)
class StoredDocument:
    version: DocumentVersion
    document: Document
    duplicate: bool
    superseded_claims: int
    superseded_runs: int


def get_opportunity(db: Session, user: User, opportunity_id: str) -> Opportunity:
    opp = db.scalar(
        select(Opportunity).where(
            Opportunity.id == opportunity_id,
            Opportunity.organization_id == user.organization_id,
        )
    )
    if opp is None:
        raise not_found("Oportunidade", feminine=True)
    return opp


def _storage_path(storage_dir: Path, org_id: str, sha256: str) -> tuple[Path, str]:
    key = f"{org_id}/{sha256[:2]}/{sha256}"
    return storage_dir / org_id / sha256[:2] / sha256, key


def store_document(
    db: Session,
    user: User,
    storage_dir: Path,
    max_bytes: int,
    *,
    opportunity_id: str,
    filename: str,
    content: bytes,
    title: str,
    doc_type: str,
    category: str,
    document_id: str | None,
    origin: str = "upload",
) -> StoredDocument:
    if user.role not in WRITER_ROLES:
        raise forbidden()
    if category not in DOCUMENT_CATEGORIES:
        raise ApiError(422, "invalid_category", "Categoria documental inválida.")
    opp = get_opportunity(db, user, opportunity_id)
    org_id = user.organization_id
    info: Inspection = inspect(filename, content, max_bytes)

    # Arquivo identico ja recebido nesta oportunidade nao vira fonte independente.
    existing = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.opportunity_id == opp.id, DocumentVersion.sha256 == info.sha256
        )
    )
    if existing is not None:
        document = db.get(Document, existing.document_id)
        db.commit()
        audit(
            "document.upload",
            actor=user.id,
            organization_id=org_id,
            target=f"document_version:{existing.id}",
            outcome="duplicate",
            data={"sha256": info.sha256, "opportunity_id": opp.id},
        )
        return StoredDocument(existing, document, True, 0, 0)

    superseded_claims = 0
    superseded_runs = 0
    if document_id:
        document = db.scalar(
            select(Document).where(
                Document.id == document_id,
                Document.organization_id == org_id,
                Document.opportunity_id == opp.id,
            )
        )
        if document is None:
            raise not_found("Documento")
        version_no = document.current_version_no + 1
    else:
        document = Document(
            organization_id=org_id,
            opportunity_id=opp.id,
            title=title.strip() or filename,
            doc_type=doc_type.strip() or "nao_classificado",
            category=category,
            current_version_no=1,
            created_by=user.id,
        )
        db.add(document)
        db.flush()
        version_no = 1

    path, key = _storage_path(storage_dir, org_id, info.sha256)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        tmp = path.with_suffix(".part")
        tmp.write_bytes(content)
        tmp.replace(path)

    version = DocumentVersion(
        organization_id=org_id,
        opportunity_id=opp.id,
        document_id=document.id,
        version_no=version_no,
        sha256=info.sha256,
        filename=filename,
        media_type=info.media_type,
        size_bytes=info.size_bytes,
        page_count=info.page_count,
        state=info.state,
        origin=origin,
        uploaded_by=user.id,
        storage_key=key,
    )
    db.add(version)
    document.current_version_no = version_no
    opp.dossier_version += 1
    opp.updated_at = utcnow()

    if version_no > 1:
        # Nova versao: o que dependia das anteriores permanece consultavel, sinalizado
        # como desatualizado (AC04). Nada e apagado.
        reason = f"Documento '{document.title}' recebeu a versão {version_no}"
        old_ids = select(DocumentVersion.id).where(
            DocumentVersion.document_id == document.id, DocumentVersion.version_no < version_no
        )
        superseded_claims = db.execute(
            update(Claim)
            .where(Claim.document_version_id.in_(old_ids), Claim.stale.is_(False))
            .values(stale=True, stale_reason=reason, updated_at=utcnow())
        ).rowcount
    # Qualquer mudanca documental torna desatualizados os calculos da oportunidade.
    superseded_runs = db.execute(
        update(CalculationRun)
        .where(CalculationRun.opportunity_id == opp.id, CalculationRun.stale.is_(False))
        .values(stale=True, stale_reason="Dossiê alterado após o cálculo")
    ).rowcount
    db.execute(
        update(Memo)
        .where(Memo.opportunity_id == opp.id, Memo.stale.is_(False))
        .values(stale=True, stale_reason="Dossiê alterado após o memorando")
    )
    # Idem para execucoes de motor: o resultado continua consultavel, mas nao representa
    # mais o dossie atual (RF04).
    db.execute(
        update(EngineRun)
        .where(EngineRun.opportunity_id == opp.id, EngineRun.stale.is_(False))
        .values(stale=True, stale_reason="Dossiê alterado após a execução")
    )

    db.commit()
    audit(
        "document.upload",
        actor=user.id,
        organization_id=org_id,
        target=f"document_version:{version.id}",
        outcome="stored",
        data={
            "sha256": info.sha256,
            "opportunity_id": opp.id,
            "version_no": version_no,
            "state": info.state,
            "page_count": info.page_count,
            "superseded_claims": superseded_claims,
            "superseded_runs": superseded_runs,
        },
    )
    return StoredDocument(version, document, False, superseded_claims, superseded_runs)


def _resolve_citation(
    db: Session,
    opp: Opportunity,
    version_id: str | None,
    page_start: int | None,
    page_end: int | None,
) -> DocumentVersion | None:
    if version_id is None:
        if page_start is not None or page_end is not None:
            raise ApiError(
                422, "citation_unresolvable", "Página informada sem documento de origem."
            )
        return None
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.organization_id == opp.organization_id,
            DocumentVersion.opportunity_id == opp.id,
        )
    )
    if version is None:
        raise ApiError(422, "citation_unresolvable", "Documento citado não pertence a este dossiê.")
    if page_start is not None:
        end = page_end if page_end is not None else page_start
        if page_start < 1 or end < page_start:
            raise ApiError(422, "citation_unresolvable", "Intervalo de páginas inválido.")
        if version.page_count is not None and end > version.page_count:
            raise ApiError(
                422,
                "citation_unresolvable",
                f"Pagina {end} não existe: o arquivo recebido tem {version.page_count} paginas.",
            )
    return version


def create_claim(db: Session, user: User, opportunity_id: str, data: dict[str, Any]) -> Claim:
    if user.role not in WRITER_ROLES:
        raise forbidden()
    opp = get_opportunity(db, user, opportunity_id)
    if data["nature"] not in CLAIM_NATURES:
        raise ApiError(422, "invalid_nature", "Natureza da afirmação inválida.")
    _resolve_citation(
        db, opp, data.get("document_version_id"), data.get("page_start"), data.get("page_end")
    )
    premises = list(dict.fromkeys(data.get("premise_claim_ids") or []))
    if premises:
        found = db.scalars(
            select(Claim.id).where(Claim.id.in_(premises), Claim.opportunity_id == opp.id)
        ).all()
        if len(found) != len(premises):
            raise ApiError(
                422, "premise_not_found", "Premissa referenciada não existe neste dossiê."
            )
    claim = Claim(
        organization_id=user.organization_id,
        opportunity_id=opp.id,
        document_version_id=data.get("document_version_id"),
        page_start=data.get("page_start"),
        page_end=data.get("page_end") or data.get("page_start"),
        excerpt=data.get("excerpt") or "",
        text=data["text"],
        nature=data["nature"],
        asserted_by=data.get("asserted_by") or "",
        subject=data.get("subject") or "",
        premise_claim_ids=premises,
        dossier_version=opp.dossier_version,
        created_by=user.id,
        origin=data.get("origin") or "manual",
        extraction_confidence=data.get("extraction_confidence"),
    )
    db.add(claim)
    db.commit()
    audit(
        "claim.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"claim:{claim.id}",
        outcome="created",
        data={"opportunity_id": opp.id, "nature": claim.nature},
    )
    return claim


def validation_blockers(claim: Claim) -> list[dict[str, str]]:
    """Pendencias que impedem promover a afirmacao a 'validada' (AC05, RF03)."""
    blockers: list[dict[str, str]] = []
    if claim.nature == "analytical_inference":
        if not claim.premise_claim_ids:
            blockers.append(
                {
                    "code": "inference_without_premises",
                    "message": "Inferência exige premissas referenciadas.",
                }
            )
    elif claim.document_version_id is None or claim.page_start is None:
        if claim.nature != "human_conclusion" or not claim.premise_claim_ids:
            blockers.append(
                {
                    "code": "evidence_pending",
                    "message": "Afirmação sem citação resolvível (documento e página).",
                }
            )
    if claim.stale:
        blockers.append(
            {
                "code": "claim_stale",
                "message": "Afirmação baseada em versão anterior do documento; revise a citação.",
            }
        )
    return blockers


def review_claim(db: Session, user: User, claim_id: str, data: dict[str, Any]) -> Claim:
    if user.role not in REVIEWER_ROLES:
        raise forbidden("Revisão exige papel de revisor.")
    claim = db.scalar(
        select(Claim).where(Claim.id == claim_id, Claim.organization_id == user.organization_id)
    )
    if claim is None:
        raise not_found("Afirmação", feminine=True)

    before = {
        "review_state": claim.review_state,
        "text": claim.text,
        "nature": claim.nature,
        "document_version_id": claim.document_version_id,
        "page_start": claim.page_start,
        "page_end": claim.page_end,
    }
    new_state = data.get("review_state") or claim.review_state
    if new_state not in REVIEW_STATES:
        raise ApiError(422, "invalid_review_state", "Estado de revisão inválido.")
    if data.get("nature") is not None:
        if data["nature"] not in CLAIM_NATURES:
            raise ApiError(422, "invalid_nature", "Natureza da afirmação inválida.")
        claim.nature = data["nature"]
    if data.get("text") is not None:
        claim.text = data["text"]
    if "document_version_id" in data or "page_start" in data:
        opp = get_opportunity(db, user, claim.opportunity_id)
        version_id = data.get("document_version_id", claim.document_version_id)
        page_start = data.get("page_start", claim.page_start)
        page_end = data.get("page_end", page_start)
        _resolve_citation(db, opp, version_id, page_start, page_end)
        claim.document_version_id = version_id
        claim.page_start = page_start
        claim.page_end = page_end
        if version_id:
            version = db.get(DocumentVersion, version_id)
            document = db.get(Document, version.document_id)
            if version.version_no == document.current_version_no:
                claim.stale = False
                claim.stale_reason = None

    if new_state == "validated":
        blockers = validation_blockers(claim)
        if blockers:
            db.rollback()
            raise ApiError(
                409,
                "validation_blocked",
                "A afirmação não pode ser validada enquanto houver pendências.",
                {"blockers": blockers},
            )
    claim.review_state = new_state
    claim.updated_at = utcnow()
    after = {
        "review_state": claim.review_state,
        "text": claim.text,
        "nature": claim.nature,
        "document_version_id": claim.document_version_id,
        "page_start": claim.page_start,
        "page_end": claim.page_end,
    }
    db.add(
        ClaimReview(
            organization_id=user.organization_id,
            claim_id=claim.id,
            reviewer_id=user.id,
            reviewer_name=user.display_name or user.username,
            before=before,
            after=after,
            comment=data.get("comment") or "",
        )
    )
    db.commit()
    audit(
        "claim.review",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"claim:{claim.id}",
        outcome=claim.review_state,
        data={"from": before["review_state"], "to": claim.review_state},
    )
    return claim


def bulk_send_to_review(
    db: Session, user: User, opportunity_id: str, ids: list[str]
) -> tuple[int, list[dict[str, str]]]:
    """Encaminha afirmacoes pendentes para revisao, em lote.

    A autorizacao e o estado sao conferidos linha a linha no servidor: a selecao da tela nao
    e confiada. Cada linha alterada ganha seu proprio registro de historico. Validar ou
    descartar continua individual, porque exige fundamento e conferencia da evidencia.
    """
    if user.role not in WRITER_ROLES:
        raise forbidden()
    opp = get_opportunity(db, user, opportunity_id)
    wanted = list(dict.fromkeys(ids))
    found = {
        claim.id: claim
        for claim in db.scalars(
            select(Claim).where(
                Claim.organization_id == user.organization_id,
                Claim.opportunity_id == opp.id,
                Claim.id.in_(wanted),
            )
        )
    }
    updated = 0
    skipped: list[dict[str, str]] = []
    for claim_id in wanted:
        claim = found.get(claim_id)
        if claim is None:
            # De outra oportunidade ou organizacao: tratada como inexistente.
            skipped.append({"id": claim_id, "reason": "not_found"})
        elif claim.stale:
            skipped.append({"id": claim_id, "reason": "stale"})
        elif claim.review_state != "pending":
            skipped.append({"id": claim_id, "reason": "not_pending"})
        else:
            snapshot = {
                "text": claim.text,
                "nature": claim.nature,
                "document_version_id": claim.document_version_id,
                "page_start": claim.page_start,
                "page_end": claim.page_end,
            }
            claim.review_state = "in_review"
            claim.updated_at = utcnow()
            db.add(
                ClaimReview(
                    organization_id=user.organization_id,
                    claim_id=claim.id,
                    reviewer_id=user.id,
                    reviewer_name=user.display_name or user.username,
                    before={"review_state": "pending", **snapshot},
                    after={"review_state": "in_review", **snapshot},
                    comment="Encaminhada para revisão em lote.",
                )
            )
            updated += 1
    db.commit()
    audit(
        "claim.bulk_review",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"opportunity:{opp.id}",
        outcome="ok",
        data={"requested": len(wanted), "updated": updated, "skipped": len(skipped)},
    )
    return updated, skipped
