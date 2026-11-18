"""Evidencias favoraveis e contrarias a uma afirmacao (RF03).

Cada evidencia aponta documento e pagina do dossie. Registrar evidencia contraria nao muda
o estado da afirmacao por conta propria: a decisao continua sendo de quem revisa.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.errors import ApiError, forbidden, not_found
from evidia.logging_setup import audit
from evidia.models import Claim, ClaimEvidence, Document, DocumentVersion, User
from evidia.schemas import ClaimEvidenceOut
from evidia.services import dossier

STANCES = ("supporting", "contrary")


def evidence_out(db: Session, evidence: ClaimEvidence) -> ClaimEvidenceOut:
    version = db.get(DocumentVersion, evidence.document_version_id)
    document = db.get(Document, version.document_id) if version else None
    return ClaimEvidenceOut(
        id=evidence.id,
        claim_id=evidence.claim_id,
        stance=evidence.stance,
        document_version_id=evidence.document_version_id,
        document_title=document.title if document else None,
        document_version_no=version.version_no if version else None,
        is_current_version=bool(
            version and document and version.version_no == document.current_version_no
        ),
        page_start=evidence.page_start,
        page_end=evidence.page_end,
        excerpt=evidence.excerpt,
        note=evidence.note,
        created_by=evidence.created_by,
        created_at=evidence.created_at,
    )


def list_for_claim(db: Session, claim_id: str) -> list[ClaimEvidenceOut]:
    found = db.scalars(
        select(ClaimEvidence)
        .where(ClaimEvidence.claim_id == claim_id)
        .order_by(ClaimEvidence.created_at, ClaimEvidence.id)
    ).all()
    return [evidence_out(db, item) for item in found]


def add_evidence(db: Session, user: User, claim_id: str, data: dict[str, Any]) -> ClaimEvidence:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    claim = db.scalar(
        select(Claim).where(Claim.id == claim_id, Claim.organization_id == user.organization_id)
    )
    if claim is None:
        raise not_found("Afirmação", feminine=True)
    if data["stance"] not in STANCES:
        raise ApiError(422, "invalid_request", "Posição da evidência inválida.")
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == data["document_version_id"],
            DocumentVersion.opportunity_id == claim.opportunity_id,
            DocumentVersion.organization_id == user.organization_id,
        )
    )
    if version is None:
        raise ApiError(422, "invalid_citation", "Documento citado não pertence a este dossiê.")
    start = data["page_start"]
    end = data.get("page_end") or start
    if end < start:
        raise ApiError(422, "invalid_citation", "Intervalo de páginas inválido.")
    if version.page_count is not None and end > version.page_count:
        raise ApiError(
            422,
            "invalid_citation",
            f"Página {end} não existe: o arquivo recebido tem {version.page_count}.",
        )
    evidence = ClaimEvidence(
        organization_id=user.organization_id,
        claim_id=claim.id,
        stance=data["stance"],
        document_version_id=version.id,
        page_start=start,
        page_end=end,
        excerpt=(data.get("excerpt") or "").strip(),
        note=(data.get("note") or "").strip(),
        created_by=user.id,
    )
    db.add(evidence)
    db.commit()
    audit(
        "claim.evidence.add",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"claim:{claim.id}",
        outcome=evidence.stance,
        data={"evidence_id": evidence.id, "document_version_id": version.id, "page": start},
    )
    return evidence


def delete_evidence(db: Session, user: User, evidence_id: str) -> None:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    evidence = db.scalar(
        select(ClaimEvidence).where(
            ClaimEvidence.id == evidence_id,
            ClaimEvidence.organization_id == user.organization_id,
        )
    )
    if evidence is None:
        raise not_found("Evidência", feminine=True)
    claim_id = evidence.claim_id
    db.delete(evidence)
    db.commit()
    audit(
        "claim.evidence.delete",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"claim:{claim_id}",
        outcome="deleted",
        data={"evidence_id": evidence_id},
    )
