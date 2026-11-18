"""Texto por pagina de um documento recebido (RF02).

O texto extraido e sempre DADO: nada aqui interpreta conteudo como instrucao. A pagina e a
do arquivo recebido (pagina do PDF), nunca a folha processual impressa — a correspondencia
entre as duas e registrada a parte, nos segmentos do documento.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass

from pypdf import PdfReader
from pypdf.errors import PdfReadError

TEXT_EXTENSIONS = (".txt", ".md")

# Marcadores de pagina usados em textos pre-paginados (ex.: saidas preparadas para o P4).
_PAGE_MARKER = re.compile(
    r"^[ \t]*(?:<\s*p[aá]gina\s*>?\s*(\d+)\s*>?|<\s*pagina\s+(\d+)\s*>)[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)


@dataclass(frozen=True)
class PageText:
    page_no: int
    text: str
    # native: texto embutido no PDF | text: arquivo de texto | ocr: reconhecimento optico
    source: str


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot >= 0 else ""


def split_text_pages(text: str) -> list[PageText]:
    """Divide um arquivo de texto em paginas.

    Aceita quebra de pagina (form feed) ou marcadores `<pagina> N`. Sem nenhum dos dois, o
    arquivo inteiro e a pagina 1: nao se inventa paginacao.
    """
    if "\f" in text:
        parts = text.split("\f")
        return [PageText(i, part.strip("\n"), "text") for i, part in enumerate(parts, start=1)]

    markers = list(_PAGE_MARKER.finditer(text))
    if markers:
        pages: list[PageText] = []
        seen: set[int] = set()
        for index, marker in enumerate(markers):
            number = int(marker.group(1) or marker.group(2))
            end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
            body = text[marker.end() : end].strip("\n")
            if number in seen or number < 1:
                # Numeracao repetida ou invalida: os marcadores nao sao confiaveis.
                return [PageText(1, text, "text")]
            seen.add(number)
            pages.append(PageText(number, body, "text"))
        return sorted(pages, key=lambda page: page.page_no)

    return [PageText(1, text, "text")]


def extract_pages(filename: str, content: bytes) -> list[PageText]:
    """Texto disponivel sem OCR. Lista vazia quando o formato nao traz texto legivel."""
    ext = _extension(filename)
    if ext in TEXT_EXTENSIONS:
        try:
            return split_text_pages(content.decode("utf-8"))
        except UnicodeDecodeError:
            return []
    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                return []
            pages = []
            for number, page in enumerate(reader.pages, start=1):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append(PageText(number, text, "native"))
            return pages
        except (PdfReadError, ValueError, KeyError, OSError, AttributeError):
            return []
    return []


def normalize(text: str) -> str:
    """Forma usada para conferir se um trecho citado existe na pagina."""
    return re.sub(r"\s+", " ", text).strip().casefold()


def contains_excerpt(page_text: str, excerpt: str) -> bool:
    needle = normalize(excerpt)
    return bool(needle) and needle in normalize(page_text)
