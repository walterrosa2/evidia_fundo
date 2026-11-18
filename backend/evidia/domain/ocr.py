"""OCR local com Tesseract (RF02). Nada sai da maquina: nao ha servico externo nem custo.

O OCR e uma leitura aproximada do documento. O texto resultante fica marcado como `ocr` e
nunca substitui o original, que continua sendo a fonte.
"""

from __future__ import annotations

import io
import shutil
import subprocess
from dataclasses import dataclass

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg")
RENDER_DPI = 200


class OcrUnavailable(RuntimeError):
    """Tesseract ou idioma ausente nesta maquina."""


class OcrFailed(RuntimeError):
    pass


@dataclass(frozen=True)
class OcrEngine:
    command: str = "tesseract"
    language: str = "por"
    timeout_seconds: float = 120.0

    def _resolve(self) -> str:
        path = shutil.which(self.command)
        if path is None:
            raise OcrUnavailable(f"Tesseract não encontrado ({self.command}).")
        return path

    def check(self) -> None:
        """Falha com mensagem clara se o OCR nao puder rodar aqui."""
        exe = self._resolve()
        try:
            listed = subprocess.run(
                [exe, "--list-langs"], capture_output=True, text=True, timeout=20, check=False
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise OcrUnavailable("Tesseract não pôde ser executado.") from exc
        languages = {line.strip() for line in (listed.stdout + listed.stderr).splitlines()}
        missing = [lang for lang in self.language.split("+") if lang not in languages]
        if missing:
            raise OcrUnavailable(f"Idioma de OCR não instalado: {', '.join(missing)}.")

    def available(self) -> bool:
        try:
            self.check()
        except OcrUnavailable:
            return False
        return True

    def image_to_text(self, image_png: bytes) -> str:
        exe = self._resolve()
        try:
            done = subprocess.run(
                [exe, "stdin", "stdout", "-l", self.language],
                input=image_png,
                capture_output=True,
                timeout=self.timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise OcrFailed("OCR excedeu o tempo limite da página.") from exc
        except OSError as exc:
            raise OcrUnavailable("Tesseract não pôde ser executado.") from exc
        if done.returncode != 0:
            raise OcrFailed("Tesseract não conseguiu ler a imagem.")
        return done.stdout.decode("utf-8", errors="replace").strip()


def _to_png(image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def pdf_page_images(content: bytes, pages: list[int] | None = None):
    """Gera (numero_da_pagina, PNG) para as paginas pedidas de um PDF."""
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(content)
    try:
        total = len(pdf)
        # Lista vazia significa "nenhuma pagina", nao "todas".
        for number in range(1, total + 1) if pages is None else pages:
            if not 1 <= number <= total:
                continue
            page = pdf[number - 1]
            try:
                bitmap = page.render(scale=RENDER_DPI / 72)
                yield number, _to_png(bitmap.to_pil())
            finally:
                page.close()
    finally:
        pdf.close()


def image_file_to_png(content: bytes) -> bytes:
    from PIL import Image

    with Image.open(io.BytesIO(content)) as image:
        return _to_png(image.convert("RGB"))
