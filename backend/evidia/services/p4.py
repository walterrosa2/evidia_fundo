"""Importacao do relatorio do P4 para o dossie (T009; RF05).

A execucao do P4 acontece fora da Evidia (consome IA paga). Aqui entra o relatorio ja
gerado, como documento do dossie, e o documento que o P4 analisou. As paginas citadas sao
conferidas contra esse documento; o que nao confere vira pendencia, nunca citacao.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.adapters import p4 as adapter
from evidia.config import Settings
from evidia.errors import ApiError, forbidden
from evidia.logging_setup import audit
from evidia.models import (
    Document,
    DocumentPage,
    DocumentVersion,
    EngineRun,
    P4Item,
    P4Request,
    User,
    utcnow,
)
from evidia.schemas_engines import EVIDENCE_PENDING, P4ItemOut, P4RequestOut
from evidia.services import dossier


def _version(db: Session, user: User, opportunity_id: str, version_id: str) -> DocumentVersion:
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.opportunity_id == opportunity_id,
            DocumentVersion.organization_id == user.organization_id,
        )
    )
    if version is None:
        raise ApiError(422, "invalid_request", "Documento não pertence a este dossiê.")
    return version


def _known_pages(db: Session, version: DocumentVersion) -> set[int] | None:
    """Paginas que existem no documento analisado. None: nao ha como conferir."""
    numbers = set(
        db.scalars(
            select(DocumentPage.page_no).where(DocumentPage.document_version_id == version.id)
        ).all()
    )
    if version.page_count is not None:
        return set(range(1, version.page_count + 1))
    return numbers or None


def _evidence_fields(
    item: adapter.P4Item, source: DocumentVersion, known: set[int] | None
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    if item.kind != "evidence":
        return [], []
    if item.page is None:
        return [], [
            {
                "code": EVIDENCE_PENDING,
                "message": (
                    "A referência do P4 não traz página identificável"
                    + (f" (“{item.reference_raw[:80]}”)." if item.reference_raw else ".")
                ),
            }
        ]
    if known is not None and item.page not in known:
        return [], [
            {
                "code": "page_out_of_range",
                "message": (
                    f"A página {item.page} citada pelo P4 não existe no documento analisado."
                ),
            }
        ]
    pendencies = []
    if known is None:
        pendencies.append(
            {
                "code": "page_not_verified",
                "message": "Não foi possível conferir a página: o documento analisado não tem "
                "texto paginado.",
            }
        )
    citation = {
        "document_version_id": source.id,
        "page_start": item.page,
        "page_end": None,
        "excerpt": "",
        "source": "engine",
    }
    return [citation], pendencies


def import_report(
    db: Session,
    user: User,
    settings: Settings,
    opportunity_id: str,
    data: dict[str, Any],
) -> tuple[EngineRun, bool]:
    """Le o relatorio e grava a execucao e seus itens. Devolve (execucao, reaproveitada)."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    report = _version(db, user, opp.id, data["report_version_id"])
    source = _version(db, user, opp.id, data["source_version_id"])
    if report.id == source.id:
        raise ApiError(
            422, "invalid_request", "O relatório e o documento analisado são arquivos distintos."
        )
    if not report.filename.lower().endswith(".xlsx"):
        raise ApiError(422, "p4_report_invalid", "O relatório do P4 é uma planilha .xlsx.")
    source_doc = db.get(Document, source.document_id)
    if source_doc is not None and source.version_no != source_doc.current_version_no:
        raise ApiError(
            409,
            "document_version_not_current",
            "O documento analisado foi substituído. Indique a versão vigente.",
        )

    side = data["simulated_side"]
    key = hashlib.sha256(
        "|".join(
            [opp.organization_id, opp.id, adapter.ENGINE, report.sha256, source.sha256, side]
        ).encode()
    ).hexdigest()
    existing = db.scalar(select(EngineRun).where(EngineRun.idempotency_key == key))
    if existing is not None:
        return existing, True

    path = Path(settings.storage_dir) / report.storage_key
    if not path.is_file():
        raise ApiError(410, "document_content_missing", "Conteúdo do documento indisponível.")
    try:
        parsed = adapter.parse_report(path.read_bytes())
    except adapter.P4ReportError as exc:
        raise ApiError(422, "p4_report_invalid", str(exc)) from exc

    counts = {kind: sum(1 for i in parsed.items if i.kind == kind) for kind in adapter.KINDS}
    blocks = [
        {
            "key": kind,
            "label": adapter.STAGE_LABEL[kind],
            "status": "completed" if counts[kind] else "skipped",
            "message": "" if counts[kind] else "Etapa sem itens no relatório.",
        }
        for kind in adapter.KINDS
    ]
    limitations = [
        "Relatório importado: a execução do P4 ocorreu fora da Evidia.",
        "O relatório não informa custo, modelo nem versão do P4.",
    ]
    missing = [adapter.STAGE_LABEL[k] for k in adapter.KINDS if not counts[k]]
    if missing:
        limitations.append(f"Etapas sem itens: {', '.join(missing)}. A análise está incompleta.")
    unanswered = sum(1 for i in parsed.items if i.kind == "answer" and not i.answer)
    if unanswered:
        limitations.append(f"{unanswered} resposta(s) sem texto no relatório.")
    no_status = sum(1 for i in parsed.items if i.kind == "answer" and not i.technical_status)
    if no_status:
        limitations.append(f"{no_status} resposta(s) sem status técnico.")

    engine_version = (data.get("engine_version") or "").strip() or None
    if engine_version:
        limitations.append("Versão do P4 informada por quem importou, não pelo relatório.")
    now = utcnow()
    run = EngineRun(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        engine=adapter.ENGINE,
        status="partial" if missing else "completed",
        engine_status=f"relatorio:{parsed.layout}",
        dossier_version=opp.dossier_version,
        input_hash=source.sha256,
        idempotency_key=key,
        document_version_id=source.id,
        sent_filename=source.filename,
        simulated_side=side,
        side_confirmed_by=user.id,
        engine_version=engine_version,
        blocks=blocks,
        limitations=limitations,
        attempts=1,
        is_mock=False,
        is_synthetic=opp.is_synthetic,
        original={
            "report_version_id": report.id,
            "report_sha256": report.sha256,
            "report_filename": report.filename,
            "layout": parsed.layout,
            "counts": counts,
        },
        created_by=user.id,
        started_at=now,
        finished_at=now,
    )
    db.add(run)
    db.flush()

    known = _known_pages(db, source)
    for position, item in enumerate(parsed.items, start=1):
        citations, pendencies = _evidence_fields(item, source, known)
        db.add(
            P4Item(
                organization_id=opp.organization_id,
                opportunity_id=opp.id,
                run_id=run.id,
                position=position,
                kind=item.kind,
                index_key=item.index_key,
                evidence_type=item.evidence_type,
                summary=item.summary,
                reference_raw=item.reference_raw,
                page=item.page,
                question=item.question,
                answer=item.answer,
                technical_status=item.technical_status,
                justification=item.justification,
                notes=item.notes,
                citations=citations,
                pendencies=pendencies,
                original=item.original,
            )
        )
    db.commit()
    audit(
        "engine.p4.import",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"engine_run:{run.id}",
        outcome=run.status,
        data={
            "layout": parsed.layout,
            "counts": counts,
            "report_sha256": report.sha256,
            "source_version_id": source.id,
            "simulated_side": side,
        },
    )
    return run, False


def item_out(item: P4Item) -> P4ItemOut:
    return P4ItemOut.model_validate(item)


def list_items(db: Session, run: EngineRun, kind: str | None) -> list[P4Item]:
    query = select(P4Item).where(P4Item.run_id == run.id)
    if kind:
        query = query.where(P4Item.kind == kind)
    return list(db.scalars(query.order_by(P4Item.position)).all())


# --------------------------------------------------- pedido de execucao


def _package(db: Session, version: DocumentVersion) -> tuple[str, int, int]:
    pages = db.execute(
        select(DocumentPage.page_no, DocumentPage.text)
        .where(DocumentPage.document_version_id == version.id)
        .order_by(DocumentPage.page_no)
    ).all()
    if not pages:
        raise ApiError(
            409,
            "document_text_missing",
            "O documento ainda não tem texto por página. Leia o texto (ou faça o OCR) antes de "
            "preparar a execução do P4.",
        )
    text, ambiguous = adapter.build_input_package([(n, t) for n, t in pages])
    return text, len(pages), ambiguous


def request_out(db: Session, request: P4Request) -> P4RequestOut:
    version = db.get(DocumentVersion, request.document_version_id)
    document = db.get(Document, version.document_id) if version else None
    stale = request.status == "awaiting_external" and (
        document is None or version.version_no != document.current_version_no
    )
    return P4RequestOut(
        id=request.id,
        opportunity_id=request.opportunity_id,
        document_version_id=request.document_version_id,
        simulated_side=request.simulated_side,
        note=request.note,
        status=request.status,
        dossier_version=request.dossier_version,
        pages=request.pages,
        package_sha256=request.package_sha256,
        ambiguous_markers=request.ambiguous_markers,
        run_id=request.run_id,
        is_synthetic=request.is_synthetic,
        stale=stale,
        created_by=request.created_by,
        created_at=request.created_at,
        closed_at=request.closed_at,
    )


def create_request(db: Session, user: User, opportunity_id: str, data: dict[str, Any]) -> P4Request:
    """Registra o pedido e fixa o pacote de entrada. Nada e enviado ao P4: ele nao tem API."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    version = _version(db, user, opp.id, data["document_version_id"])
    document = db.get(Document, version.document_id)
    if document is not None and version.version_no != document.current_version_no:
        raise ApiError(
            409,
            "document_version_not_current",
            "A versão escolhida foi substituída. Prepare a execução com a versão vigente.",
        )
    text, pages, ambiguous = _package(db, version)
    request = P4Request(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        document_version_id=version.id,
        simulated_side=data["simulated_side"],
        note=(data.get("note") or "").strip(),
        dossier_version=opp.dossier_version,
        pages=pages,
        package_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
        ambiguous_markers=ambiguous,
        is_synthetic=opp.is_synthetic,
        created_by=user.id,
    )
    db.add(request)
    db.commit()
    audit(
        "p4.request.create",
        actor=user.id,
        organization_id=opp.organization_id,
        target=f"p4_request:{request.id}",
        outcome="awaiting_external",
        data={"document_version_id": version.id, "pages": pages, "side": request.simulated_side},
    )
    return request


def get_request(db: Session, user: User, request_id: str) -> P4Request:
    request = db.scalar(
        select(P4Request).where(
            P4Request.id == request_id, P4Request.organization_id == user.organization_id
        )
    )
    if request is None:
        raise ApiError(404, "not_found", "Pedido de execução do P4 não encontrado.")
    return request


def request_package(db: Session, user: User, request_id: str) -> tuple[P4Request, str]:
    """Pacote de entrada do pedido. E recusado se o texto mudou desde o pedido."""
    request = get_request(db, user, request_id)
    version = db.get(DocumentVersion, request.document_version_id)
    text, _pages, _ambiguous = _package(db, version)
    if hashlib.sha256(text.encode("utf-8")).hexdigest() != request.package_sha256:
        raise ApiError(
            409,
            "p4_package_changed",
            "O texto do documento mudou depois do pedido. Cancele-o e prepare um novo.",
        )
    audit(
        "p4.request.package",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"p4_request:{request.id}",
        outcome="ok",
    )
    return request, text


def cancel_request(db: Session, user: User, request_id: str) -> P4Request:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    request = get_request(db, user, request_id)
    if request.status != "awaiting_external":
        raise ApiError(409, "p4_request_closed", "Este pedido já foi encerrado.")
    request.status = "cancelled"
    request.closed_at = utcnow()
    db.commit()
    audit(
        "p4.request.cancel",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"p4_request:{request.id}",
        outcome="cancelled",
    )
    return request


def check_request_for_import(
    db: Session, user: User, opportunity_id: str, data: dict[str, Any]
) -> P4Request | None:
    """Confere, antes de importar, que o relatorio atende ao pedido indicado."""
    if not data.get("request_id"):
        return None
    request = get_request(db, user, data["request_id"])
    if request.opportunity_id != opportunity_id:
        raise ApiError(404, "not_found", "Pedido de execução do P4 não encontrado.")
    if request.status != "awaiting_external":
        raise ApiError(409, "p4_request_closed", "Este pedido já foi encerrado.")
    if request.document_version_id != data["source_version_id"]:
        raise ApiError(
            422,
            "p4_request_mismatch",
            "O documento analisado não é o do pedido de execução.",
        )
    if request.simulated_side != data["simulated_side"]:
        raise ApiError(
            422, "p4_request_mismatch", "O lado informado não é o do pedido de execução."
        )
    return request


def close_request(db: Session, user: User, request: P4Request, run: EngineRun) -> None:
    request.status = "imported"
    request.run_id = run.id
    request.closed_at = utcnow()
    db.commit()
    audit(
        "p4.request.close",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"p4_request:{request.id}",
        outcome="imported",
        data={"run_id": run.id},
    )
