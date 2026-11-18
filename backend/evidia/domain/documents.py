"""Inspecao de arquivos recebidos (RF02).

O conteudo de um arquivo e sempre dado: nada aqui interpreta texto como instrucao.
"""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass

from pypdf import PdfReader
from pypdf.errors import PdfReadError

ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}

DOCUMENT_CATEGORIES = ("full_record", "piece", "derived_report", "metadata")


class DocumentRejected(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Inspection:
    sha256: str
    size_bytes: int
    media_type: str
    page_count: int | None
    state: str  # stored | needs_ocr | password_protected


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot >= 0 else ""


def inspect(filename: str, content: bytes, max_bytes: int) -> Inspection:
    if not content:
        raise DocumentRejected("empty_file", "arquivo vazio")
    if len(content) > max_bytes:
        raise DocumentRejected("file_too_large", "arquivo excede o tamanho máximo permitido")
    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise DocumentRejected(
            "unsupported_format", f"formato {ext or '(sem extensão)'} não aceito"
        )

    sha256 = hashlib.sha256(content).hexdigest()
    media_type = ALLOWED_EXTENSIONS[ext]
    page_count: int | None = None
    state = "stored"

    if ext == ".pdf":
        # A extensao nao prova o conteudo: o arquivo precisa abrir como PDF.
        if not content.lstrip()[:5].startswith(b"%PDF-"):
            raise DocumentRejected("document_corrupted", "arquivo não é um PDF válido")
        try:
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                state = "password_protected"
            else:
                page_count = len(reader.pages)
                if page_count == 0:
                    raise DocumentRejected("document_corrupted", "PDF sem páginas")
                sample = reader.pages[: min(page_count, 3)]
                if not any((page.extract_text() or "").strip() for page in sample):
                    state = "needs_ocr"
        except DocumentRejected:
            raise
        except (PdfReadError, ValueError, KeyError, OSError, AttributeError) as exc:
            raise DocumentRejected("document_corrupted", "PDF corrompido ou ilegivel") from exc
    elif ext in {".png", ".jpg", ".jpeg"}:
        state = "needs_ocr"

    return Inspection(
        sha256=sha256,
        size_bytes=len(content),
        media_type=media_type,
        page_count=page_count,
        state=state,
    )
