"""Texto por pagina, OCR, estrutura do documento e sugestao de afirmacoes (RF02, RF03)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from evidia.config import BACKEND_DIR, Settings
from evidia.domain import extraction, ocr
from evidia.domain.texts import PageText, extract_pages
from evidia.errors import ApiError, forbidden, not_found
from evidia.llm import LLMClient, LLMError, build_prompt, record_evidence
from evidia.logging_setup import audit
from evidia.models import (
    Document,
    DocumentPage,
    DocumentSegment,
    DocumentVersion,
    Job,
    User,
)
from evidia.services import dossier, jobs

PROMPT_PATH = BACKEND_DIR / "evidia" / "prompts" / "claim_extraction_v2.txt"
PROMPT_VERSION = "claim_extraction_v2"
EXTRACTION_TASK = (
    "Extraia as afirmações relevantes das páginas abaixo, seguindo as regras da instrução."
)

# Quem fala em cada tipo de documento: sem isso o modelo trata a narrativa de uma peca de
# parte como fato registrado (verificado com modelo real em 2026-11-17).
DOC_TYPE_CONTEXT = {
    "peticao_inicial": "petição inicial — peça de parte, assinada pelo autor",
    "contestacao": "contestação — peça de parte, assinada pelo réu",
    "laudo_pericial": "laudo pericial — documento do perito do juízo",
    "parecer_assistente": "parecer de assistente técnico — documento de auxiliar de uma parte",
    "contrato": "contrato — documento assinado pelas partes",
    "decisao": "decisão judicial",
    "comprovante": "comprovante",
    "relatorio_originacao": "relatório derivado gerado por sistema, não é peça dos autos",
    "processo_integral": "autos do processo — reúne peças de autores diferentes; identifique "
    "em cada página de quem é a peça",
}


def extraction_task(document: Document | None) -> str:
    kind = DOC_TYPE_CONTEXT.get(document.doc_type) if document else None
    if kind is None:
        kind = (
            "não classificado — identifique pelo texto se é peça de parte, laudo, decisão ou "
            "documento assinado"
        )
    return f"{EXTRACTION_TASK}\nTipo do documento: {kind}."


def get_version(db: Session, user: User, version_id: str) -> DocumentVersion:
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.organization_id == user.organization_id,
        )
    )
    if version is None:
        raise not_found("Documento")
    return version


def _content(version: DocumentVersion, settings: Settings) -> bytes:
    path = Path(settings.storage_dir) / version.storage_key
    if not path.is_file():
        raise ApiError(410, "document_content_missing", "Conteúdo do documento indisponível.")
    return path.read_bytes()


def _store_pages(db: Session, version: DocumentVersion, pages: list[PageText]) -> None:
    """Grava as paginas, substituindo as de mesmo numero. O original nunca e tocado."""
    numbers = [page.page_no for page in pages]
    if numbers:
        db.execute(
            delete(DocumentPage).where(
                DocumentPage.document_version_id == version.id,
                DocumentPage.page_no.in_(numbers),
            )
        )
    for page in pages:
        db.add(
            DocumentPage(
                organization_id=version.organization_id,
                document_version_id=version.id,
                page_no=page.page_no,
                text=page.text,
                source=page.source,
                char_count=len(page.text),
            )
        )
    db.flush()
    sources = set(
        db.scalars(
            select(DocumentPage.source).where(DocumentPage.document_version_id == version.id)
        ).all()
    )
    version.text_pages = len(
        db.scalars(
            select(DocumentPage.id).where(DocumentPage.document_version_id == version.id)
        ).all()
    )
    version.text_source = (
        "none" if not sources else next(iter(sources)) if len(sources) == 1 else "mixed"
    )


def ingest_text(db: Session, user: User, version: DocumentVersion, settings: Settings) -> None:
    """Depois do recebimento: extrai o texto disponivel sem OCR.

    Arquivos pequenos sao lidos na hora; os grandes vao para a fila, para o envio nao
    esperar. Falha aqui nunca invalida o recebimento do original.
    """
    is_pdf = version.filename.lower().endswith(".pdf")
    if is_pdf and (version.page_count or 0) > settings.inline_text_max_pages:
        jobs.enqueue(
            db,
            organization_id=version.organization_id,
            opportunity_id=version.opportunity_id,
            kind="extract_text",
            target_id=version.id,
            created_by=user.id,
        )
        db.commit()
        return
    try:
        pages = extract_pages(version.filename, _content(version, settings))
    except ApiError:
        return
    if pages:
        _store_pages(db, version, pages)
        db.commit()


@jobs.handler("extract_text")
def _extract_text_job(db: Session, job: Job, settings: Settings) -> dict[str, Any]:
    version = db.get(DocumentVersion, job.target_id)
    if version is None:
        raise jobs.JobFailed("Documento não existe mais.")
    try:
        pages = extract_pages(version.filename, _content(version, settings))
    except ApiError as exc:
        raise jobs.JobFailed(exc.message) from exc
    if pages:
        _store_pages(db, version, pages)
    db.commit()
    return {"pages_with_text": len(pages)}


def ocr_engine(settings: Settings) -> ocr.OcrEngine:
    return ocr.OcrEngine(
        command=settings.tesseract_cmd,
        language=settings.ocr_language,
        timeout_seconds=settings.ocr_page_timeout_seconds,
    )


def request_ocr(db: Session, user: User, version_id: str, settings: Settings) -> tuple[Job, bool]:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    version = get_version(db, user, version_id)
    name = version.filename.lower()
    if not (name.endswith(".pdf") or name.endswith(ocr.IMAGE_EXTENSIONS)):
        raise ApiError(422, "ocr_not_applicable", "OCR só se aplica a PDF e imagem.")
    if version.state == "password_protected":
        raise ApiError(
            409, "document_protected", "Documento protegido por senha: OCR indisponível."
        )
    try:
        ocr_engine(settings).check()
    except ocr.OcrUnavailable as exc:
        raise ApiError(503, "ocr_unavailable", str(exc)) from exc
    job, created = jobs.enqueue(
        db,
        organization_id=version.organization_id,
        opportunity_id=version.opportunity_id,
        kind="ocr",
        target_id=version.id,
        created_by=user.id,
        max_attempts=2,
    )
    db.commit()
    if created:
        audit(
            "document.ocr.request",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"document_version:{version.id}",
            outcome="queued",
            data={"job_id": job.id},
        )
    return job, created


@jobs.handler("ocr")
def _ocr_job(db: Session, job: Job, settings: Settings) -> dict[str, Any]:
    version = db.get(DocumentVersion, job.target_id)
    if version is None:
        raise jobs.JobFailed("Documento não existe mais.")
    engine = ocr_engine(settings)
    try:
        content = _content(version, settings)
    except ApiError as exc:
        raise jobs.JobFailed(exc.message) from exc

    # So paginas ainda sem texto: repetir o trabalho nao refaz o que ja foi lido.
    have = set(
        db.scalars(
            select(DocumentPage.page_no).where(DocumentPage.document_version_id == version.id)
        ).all()
    )
    db.rollback()  # libera a trava de escrita durante o reconhecimento, que e demorado
    read: list[PageText] = []
    empty: list[int] = []
    skipped = 0
    try:
        if version.filename.lower().endswith(".pdf"):
            total = version.page_count or 0
            wanted = [n for n in range(1, total + 1) if n not in have]
            if len(wanted) > settings.ocr_max_pages:
                skipped = len(wanted) - settings.ocr_max_pages
                wanted = wanted[: settings.ocr_max_pages]
            for number, png in ocr.pdf_page_images(content, wanted):
                text = engine.image_to_text(png)
                if text:
                    read.append(PageText(number, text, "ocr"))
                else:
                    empty.append(number)
        elif 1 not in have:
            text = engine.image_to_text(ocr.image_file_to_png(content))
            if text:
                read.append(PageText(1, text, "ocr"))
            else:
                empty.append(1)
    except ocr.OcrUnavailable as exc:
        raise jobs.JobFailed(str(exc)) from exc
    except ocr.OcrFailed as exc:
        raise jobs.JobFailed(str(exc), retryable=True) from exc
    except Exception as exc:  # arquivo ilegivel para o rasterizador
        raise jobs.JobFailed(
            f"Não foi possível preparar o documento para OCR ({type(exc).__name__})."
        ) from exc

    version = db.get(DocumentVersion, job.target_id)
    if read:
        _store_pages(db, version, read)
        if version.state == "needs_ocr":
            version.state = "stored"
    db.commit()
    return {
        "pages_read": len(read),
        "pages_without_text": len(empty),
        "pages_not_processed": skipped,
    }


def list_pages(db: Session, version: DocumentVersion) -> list[DocumentPage]:
    return list(
        db.scalars(
            select(DocumentPage)
            .where(DocumentPage.document_version_id == version.id)
            .order_by(DocumentPage.page_no)
        ).all()
    )


def get_page(db: Session, version: DocumentVersion, page_no: int) -> DocumentPage:
    page = db.scalar(
        select(DocumentPage).where(
            DocumentPage.document_version_id == version.id, DocumentPage.page_no == page_no
        )
    )
    if page is None:
        raise ApiError(404, "page_text_not_available", "Não há texto disponível para esta página.")
    return page


# ------------------------------------------------------- estrutura do documento


def add_segment(db: Session, user: User, version_id: str, data: dict[str, Any]) -> DocumentSegment:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    version = get_version(db, user, version_id)
    start, end = data["page_start"], data.get("page_end") or data["page_start"]
    if end < start:
        raise ApiError(422, "invalid_page_range", "Intervalo de páginas inválido.")
    if version.page_count is not None and end > version.page_count:
        raise ApiError(
            422,
            "page_out_of_range",
            f"Página {end} não existe: o arquivo recebido tem {version.page_count}.",
        )
    folio_start, folio_end = data.get("folio_start"), data.get("folio_end")
    if folio_start is not None:
        folio_end = folio_end if folio_end is not None else folio_start + (end - start)
        if folio_end - folio_start != end - start:
            raise ApiError(
                422,
                "invalid_folio_range",
                "O intervalo de folhas precisa ter o mesmo tamanho do intervalo de páginas.",
            )
    elif folio_end is not None:
        raise ApiError(422, "invalid_folio_range", "Informe a folha inicial.")
    segment = DocumentSegment(
        organization_id=version.organization_id,
        opportunity_id=version.opportunity_id,
        document_version_id=version.id,
        label=data["label"].strip(),
        piece_type=(data.get("piece_type") or "nao_classificado").strip(),
        page_start=start,
        page_end=end,
        folio_start=folio_start,
        folio_end=folio_end,
        note=(data.get("note") or "").strip(),
        created_by=user.id,
    )
    db.add(segment)
    db.commit()
    audit(
        "document.segment.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"document_version:{version.id}",
        outcome="created",
        data={"segment_id": segment.id, "pages": [start, end]},
    )
    return segment


def list_segments(db: Session, version: DocumentVersion) -> list[DocumentSegment]:
    return list(
        db.scalars(
            select(DocumentSegment)
            .where(DocumentSegment.document_version_id == version.id)
            .order_by(DocumentSegment.page_start, DocumentSegment.created_at)
        ).all()
    )


def delete_segment(db: Session, user: User, segment_id: str) -> None:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    segment = db.scalar(
        select(DocumentSegment).where(
            DocumentSegment.id == segment_id,
            DocumentSegment.organization_id == user.organization_id,
        )
    )
    if segment is None:
        raise not_found("Trecho")
    target = segment.document_version_id
    db.delete(segment)
    db.commit()
    audit(
        "document.segment.delete",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"document_version:{target}",
        outcome="deleted",
        data={"segment_id": segment_id},
    )


def folio_for_page(segments: list[DocumentSegment], page_no: int) -> int | None:
    """Folha processual impressa correspondente a uma pagina do arquivo, se mapeada."""
    for segment in segments:
        if segment.folio_start is not None and segment.page_start <= page_no <= segment.page_end:
            return segment.folio_start + (page_no - segment.page_start)
    return None


# ------------------------------------------------------- sugestao de afirmacoes


def _mock_responder(pages: list[PageText]):
    def respond(_prompt) -> dict[str, Any]:
        return {
            "suggestions": [
                {
                    "text": item.text,
                    "nature": item.nature,
                    "asserted_by": item.asserted_by,
                    "page": item.page_no,
                    "excerpt": item.excerpt,
                    "confidence": item.confidence,
                }
                for item in extraction.suggest_by_rules(pages)
            ]
        }

    return respond


def suggest_claims(
    db: Session,
    user: User,
    llm: LLMClient,
    settings: Settings,
    version_id: str,
    *,
    method: str,
    page_from: int | None,
    page_to: int | None,
) -> dict[str, Any]:
    """Devolve sugestoes de afirmacao. Nada e gravado: aceitar e um ato de quem revisa."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    version = get_version(db, user, version_id)
    document = db.get(Document, version.document_id)
    if document is not None and version.version_no != document.current_version_no:
        raise ApiError(
            409,
            "document_version_not_current",
            "A versão escolhida foi substituída. Use a versão vigente do documento.",
        )
    pages = [
        PageText(p.page_no, p.text, p.source)
        for p in list_pages(db, version)
        if (page_from is None or p.page_no >= page_from)
        and (page_to is None or p.page_no <= page_to)
    ]
    if not pages:
        raise ApiError(
            409,
            "text_not_available",
            "Não há texto disponível nas páginas escolhidas. Documento digitalizado precisa "
            "de OCR antes.",
        )

    if method == "rules":
        found = extraction.suggest_by_rules(pages)
        return {
            "method": "rules",
            "is_mock": False,
            "pages_analyzed": len(pages),
            "suggestions": found,
            "rejected": [],
            "nature_adjusted": 0,
            "usage": None,
            "model": None,
        }

    # Custo controlado: o pedido ao modelo e limitado em paginas e em caracteres.
    if len(pages) > settings.llm_max_pages_per_call:
        raise ApiError(
            422,
            "too_many_pages",
            f"Escolha no máximo {settings.llm_max_pages_per_call} páginas por pedido ao modelo.",
        )
    if sum(len(p.text) for p in pages) > settings.llm_max_chars_per_call:
        raise ApiError(
            422, "too_much_text", "As páginas escolhidas excedem o limite de texto por pedido."
        )
    client = llm
    if getattr(llm, "provider", "") == "mock":
        from evidia.llm import MockLLM

        client = MockLLM(_mock_responder(pages))
    document = db.get(Document, version.document_id)
    # Lido antes de liberar a transacao para a chamada externa.
    doc_type = document.doc_type if document else None
    prompt = build_prompt(PROMPT_PATH.read_text(encoding="utf-8"), extraction_task(document), pages)
    target = f"document_version:{version.id}"
    db.rollback()  # nao segura o banco enquanto espera o provedor
    try:
        result = client.complete_json(prompt)
    except LLMError as exc:
        record_evidence(
            Path(settings.log_dir),
            task=PROMPT_VERSION,
            actor=user.id,
            organization_id=user.organization_id,
            target=target,
            prompt=prompt,
            result=None,
            error=exc.code,
        )
        audit(
            "claim.suggest",
            actor=user.id,
            organization_id=user.organization_id,
            target=target,
            outcome=exc.code,
            data={"method": "llm", "pages": len(pages)},
        )
        raise ApiError(exc.status, exc.code, exc.message, {"retryable": exc.retryable}) from exc
    # Resposta bruta registrada antes de qualquer conferencia.
    record_evidence(
        Path(settings.log_dir),
        task=PROMPT_VERSION,
        actor=user.id,
        organization_id=user.organization_id,
        target=target,
        prompt=prompt,
        result=result,
    )
    checked = extraction.validate_model_output(result.data, pages, method="llm")
    accepted, nature_adjusted = extraction.demote_pleading_findings(checked.accepted, doc_type)
    audit(
        "claim.suggest",
        actor=user.id,
        organization_id=user.organization_id,
        target=target,
        outcome="ok",
        data={
            "method": "llm",
            "provider": result.provider,
            "is_mock": result.is_mock,
            "pages": len(pages),
            "accepted": len(checked.accepted),
            "rejected": len(checked.rejected),
            "nature_adjusted": nature_adjusted,
            "usage": result.usage,
            "prompt_version": PROMPT_VERSION,
        },
    )
    return {
        "method": "llm",
        "is_mock": result.is_mock,
        "pages_analyzed": len(pages),
        "suggestions": accepted,
        "rejected": checked.rejected,
        "nature_adjusted": nature_adjusted,
        "usage": result.usage,
        "model": result.model,
    }
