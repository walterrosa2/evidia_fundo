"""Importacao idempotente de oportunidade a partir da originacao (US01, AC01–AC02).

Chave de idempotencia: organizacao + origem + ID externo + posicao + hash do snapshot.
A transacao inteira roda sob trava de escrita (BEGIN IMMEDIATE no SQLite); em bancos
com escrita concorrente real, a restricao de unicidade resolve a corrida e a operacao
existente e relida.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from evidia.adapters.origination import (
    OriginationClient,
    OriginationError,
    RawOrigin,
    normalize_snapshot,
    snapshot_hash,
)
from evidia.domain.cnj import InvalidCnj, parse_cnj
from evidia.logging_setup import audit
from evidia.models import (
    Document,
    ImportConflict,
    ImportOperation,
    MissingPiece,
    Opportunity,
    OriginSnapshot,
    Process,
    User,
    utcnow,
)

POSITION_SIDES = ("claimant", "defendant")
# Mudanca nestes campos nunca substitui o valor anterior em silencio: vira conflito.
IDENTITY_FIELDS = ("cnj_raw", "parties")
_COMPARED_FIELDS = (
    "cnj_raw",
    "title",
    "parties",
    "lawyers",
    "judge",
    "court_body",
    "case_class",
    "subject",
    "procedural_stage",
    "study",
    "document_refs",
    "gaps",
)


@dataclass(frozen=True)
class ImportResult:
    operation_id: str
    opportunity_id: str
    snapshot_id: str
    outcome: str  # created | new_version | reused
    attempts: int
    is_draft: bool
    conflicts: int


def idempotency_key(
    org_id: str, system: str, external_id: str, side: str, content_hash: str
) -> str:
    raw = "|".join((org_id, system, external_id, side, content_hash))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _differences(previous: dict[str, Any], incoming: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {"field": f, "previous": previous.get(f), "incoming": incoming.get(f)}
        for f in _COMPARED_FIELDS
        if previous.get(f) != incoming.get(f)
    ]


def _reuse(db: Session, key: str) -> ImportResult | None:
    op = db.scalar(select(ImportOperation).where(ImportOperation.idempotency_key == key))
    if op is None:
        return None
    op.attempts += 1
    op.last_attempt_at = utcnow()
    opp = db.get(Opportunity, op.opportunity_id)
    process = db.get(Process, opp.process_id) if opp else None
    db.commit()
    return ImportResult(
        operation_id=op.id,
        opportunity_id=op.opportunity_id,
        snapshot_id=op.snapshot_id,
        outcome="reused",
        attempts=op.attempts,
        is_draft=bool(process and process.status == "draft"),
        conflicts=0,
    )


def import_raw(
    db: Session,
    user: User,
    raw: RawOrigin,
    *,
    position_side: str,
    represented_party: str,
) -> ImportResult:
    if position_side not in POSITION_SIDES:
        raise ValueError("position_side inválido")

    org_id = user.organization_id
    snapshot = normalize_snapshot(raw)
    content_hash = snapshot_hash(snapshot)
    key = idempotency_key(org_id, raw.system, raw.external_id, position_side, content_hash)

    try:
        result = _import_tx(
            db, user, raw, snapshot, content_hash, key, position_side, represented_party
        )
    except IntegrityError:
        # Outra requisicao concluiu a mesma operacao entre a leitura e a escrita.
        db.rollback()
        result = _reuse(db, key)
        if result is None:
            raise

    audit(
        "opportunity.import",
        actor=user.id,
        organization_id=org_id,
        target=f"opportunity:{result.opportunity_id}",
        outcome=result.outcome,
        data={
            "origin_system": raw.system,
            "origin_external_id": raw.external_id,
            "operation_id": result.operation_id,
            "attempts": result.attempts,
            "is_synthetic": raw.is_synthetic,
            "conflicts": result.conflicts,
        },
    )
    return result


def _import_tx(
    db: Session,
    user: User,
    raw: RawOrigin,
    snapshot: dict[str, Any],
    content_hash: str,
    key: str,
    position_side: str,
    represented_party: str,
) -> ImportResult:
    org_id = user.organization_id

    reused = _reuse(db, key)
    if reused is not None:
        return reused

    opp = db.scalar(
        select(Opportunity).where(
            Opportunity.organization_id == org_id,
            Opportunity.origin_system == raw.system,
            Opportunity.origin_external_id == raw.external_id,
            Opportunity.position_side == position_side,
        )
    )

    conflicts = 0
    if opp is None:
        process = _resolve_process(db, org_id, snapshot.get("cnj_raw"))
        opp = Opportunity(
            organization_id=org_id,
            process_id=process.id,
            position_side=position_side,
            represented_party=represented_party.strip(),
            title=snapshot.get("title") or "",
            origin_system=raw.system,
            origin_external_id=raw.external_id,
            is_synthetic=raw.is_synthetic,
            created_by=user.id,
        )
        db.add(opp)
        db.flush()
        snap = OriginSnapshot(
            organization_id=org_id,
            opportunity_id=opp.id,
            version_no=1,
            origin_system=raw.system,
            origin_external_id=raw.external_id,
            content_hash=content_hash,
            payload=snapshot,
            differences=[],
            is_synthetic=raw.is_synthetic,
            source_updated_at=snapshot.get("source_updated_at"),
            created_by=user.id,
        )
        db.add(snap)
        for gap in snapshot.get("gaps", []):
            db.add(
                MissingPiece(
                    organization_id=org_id,
                    opportunity_id=opp.id,
                    description=gap["description"],
                    reason=gap.get("reason", ""),
                    source="import",
                    created_by=user.id,
                )
            )
        outcome = "created"
    else:
        process = db.get(Process, opp.process_id)
        last = db.scalar(
            select(OriginSnapshot)
            .where(OriginSnapshot.opportunity_id == opp.id)
            .order_by(OriginSnapshot.version_no.desc())
        )
        diffs = _differences(last.payload, snapshot) if last else []
        snap = OriginSnapshot(
            organization_id=org_id,
            opportunity_id=opp.id,
            version_no=(last.version_no + 1) if last else 1,
            origin_system=raw.system,
            origin_external_id=raw.external_id,
            content_hash=content_hash,
            payload=snapshot,
            differences=diffs,
            is_synthetic=raw.is_synthetic,
            source_updated_at=snapshot.get("source_updated_at"),
            created_by=user.id,
        )
        db.add(snap)
        db.flush()
        for diff in diffs:
            if diff["field"] in IDENTITY_FIELDS:
                conflicts += 1
                db.add(
                    ImportConflict(
                        organization_id=org_id,
                        opportunity_id=opp.id,
                        snapshot_id=snap.id,
                        field=diff["field"],
                        previous_value=str(diff["previous"]),
                        incoming_value=str(diff["incoming"]),
                    )
                )
        opp.updated_at = utcnow()
        outcome = "new_version"

    db.flush()
    op = ImportOperation(
        organization_id=org_id,
        idempotency_key=key,
        opportunity_id=opp.id,
        snapshot_id=snap.id,
        outcome=outcome,
    )
    db.add(op)
    db.commit()
    return ImportResult(
        operation_id=op.id,
        opportunity_id=opp.id,
        snapshot_id=snap.id,
        outcome=outcome,
        attempts=1,
        is_draft=process.status == "draft",
        conflicts=conflicts,
    )


def _resolve_process(db: Session, org_id: str, cnj_raw: str | None) -> Process:
    try:
        cnj = parse_cnj(cnj_raw)
    except InvalidCnj as exc:
        # Sem CNJ valido: rascunho com motivo; nunca ligado a outro processo por nome.
        process = Process(
            organization_id=org_id,
            cnj=None,
            status="draft",
            draft_reason=f"CNJ ausente ou inválido na origem: {exc}",
        )
        db.add(process)
        db.flush()
        return process

    process = db.scalar(
        select(Process).where(Process.organization_id == org_id, Process.cnj == cnj.masked)
    )
    if process is None:
        process = Process(
            organization_id=org_id,
            cnj=cnj.masked,
            court_code=cnj.court_code,
            court_label=cnj.court_label,
        )
        db.add(process)
        db.flush()
    return process


def import_from_origin(
    db: Session,
    user: User,
    client: OriginationClient,
    external_id: str,
    *,
    position_side: str,
    represented_party: str,
) -> ImportResult:
    # A consulta a origem acontece fora da transacao de escrita.
    raw = client.fetch(external_id)
    return import_raw(
        db, user, raw, position_side=position_side, represented_party=represented_party
    )


DERIVED_TITLES = {
    "estudo_pdf": "Estudo da originação (relatório derivado)",
    "dossie_pdf": "Dossiê da originação (relatório derivado)",
}


def import_derived_documents(
    db: Session,
    user: User,
    client: OriginationClient,
    opp: Opportunity,
    *,
    storage_dir,
    max_bytes: int,
) -> list[dict[str, Any]]:
    """Traz para o dossie os relatorios derivados listados no snapshot mais recente (T005).

    Sao relatorios GERADOS pela originacao, nunca os autos: entram como `derived_report` e
    nao liberam o bloqueio de autos integrais. A leitura e so GET. Erro da origem como um
    todo (fora do ar, credencial, contrato) sobe como erro; relatorio que a origem nao tem
    vira resultado `not_available`, sem substituto.
    """
    from evidia.domain.documents import DocumentRejected
    from evidia.services import dossier

    snapshot = db.scalar(
        select(OriginSnapshot)
        .where(OriginSnapshot.opportunity_id == opp.id)
        .order_by(OriginSnapshot.version_no.desc())
        .limit(1)
    )
    refs = (snapshot.payload.get("document_refs") or []) if snapshot else []
    results: list[dict[str, Any]] = []
    for ref in refs:
        kind = ref.get("kind", "")
        title = DERIVED_TITLES.get(kind)
        if title is None or ref.get("category") != "derived_report":
            continue
        base = {"kind": kind, "title": title}
        try:
            content = client.fetch_document(ref["path"])
        except OriginationError as exc:
            if exc.code != "origination_document_not_found":
                raise
            results.append({**base, "outcome": "not_available", "reason": exc.message})
            continue
        # Relatorio do mesmo tipo ja importado recebe nova versao, nao novo documento.
        existing = db.scalar(
            select(Document).where(
                Document.opportunity_id == opp.id,
                Document.category == "derived_report",
                Document.title == title,
            )
        )
        try:
            stored = dossier.store_document(
                db,
                user,
                storage_dir,
                max_bytes,
                opportunity_id=opp.id,
                filename=f"{kind}.pdf",
                content=content,
                title=title,
                doc_type="relatorio_originacao",
                category="derived_report",
                document_id=existing.id if existing else None,
                origin="origination",
            )
        except DocumentRejected as exc:
            db.rollback()
            results.append({**base, "outcome": "rejected", "reason": exc.message})
            continue
        results.append(
            {
                **base,
                "outcome": "duplicate" if stored.duplicate else "stored",
                "document_id": stored.document.id,
                "version_id": stored.version.id,
                "_stored": None if stored.duplicate else stored,
            }
        )
    audit(
        "opportunity.import_documents",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"opportunity:{opp.id}",
        outcome="ok",
        data={r["kind"]: r["outcome"] for r in results},
    )
    return results
