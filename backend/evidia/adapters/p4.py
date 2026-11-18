"""Adaptador do P4: leitura e normalizacao do relatorio de uma execucao (T009; RF05).

O P4 e uma aplicacao a parte, sem API e sem modo simulado: cada execucao consome IA paga.
Por isso a Evidia NAO dispara o P4. A execucao e feita por quem tem autorizacao, fora daqui;
o relatorio gerado (`relatorio_final.xlsx`) entra no dossie e este adaptador o le.

O que o adaptador garante:
- os tres formatos de relatorio que o P4 ja produziu sao aceitos: abas Provas/Quesitos/
  Respostas, abas "Etapa Evidencias/Quesitos/Respostas" (mais antigo) e planilha unica
  "Relatorio" com a coluna Categoria. Planilha vazia e planilha de indices sao recusadas
  com motivo proprio;
- a divergencia de campo entre codigo e prompt do P4 (`resposta` x `resposta_tecnica`) e a
  resposta guardada so no JSON bruto sao resolvidas, sem inventar conteudo;
- a referencia de pagina, que no P4 e texto livre ("fls. 12", "pag. 12", "<pagina> 12"),
  vira numero quando ha numero; quando nao ha, o item fica com pendencia;
- cada linha preserva o original como veio.
"""

from __future__ import annotations

import io
import json
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from openpyxl import load_workbook

ENGINE = "p4"
KINDS = ("evidence", "question", "answer")
STAGE_LABEL = {"evidence": "Provas", "question": "Quesitos", "answer": "Respostas"}

# Mesmos padroes de referencia aceitos pelo P4 (page_utils.RE_PAG).
_PAGE = re.compile(r"(?:<\s*pagina\s*>\s*|p[áa]g\.?\s*|fls?\.?\s*)(\d+)", re.IGNORECASE)
_CATEGORY = {"prova": "evidence", "quesito": "question", "resposta": "answer"}
MAX_ROWS = 20000


class P4ReportError(ValueError):
    """O arquivo nao e um relatorio do P4 que este adaptador reconheca."""


@dataclass(frozen=True)
class P4Item:
    kind: str
    index_key: str
    evidence_type: str = ""
    summary: str = ""
    reference_raw: str = ""
    page: int | None = None
    question: str = ""
    answer: str = ""
    technical_status: str = ""
    justification: str = ""
    notes: str = ""
    original: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class P4Report:
    layout: str  # three_sheets | stage_sheets | single_sheet
    items: list[P4Item]


def page_from_reference(reference: str) -> int | None:
    """Numero da pagina citado numa referencia em texto livre. Nulo se nao houver numero."""
    if not isinstance(reference, str):
        return None
    match = _PAGE.search(reference)
    if match:
        return int(match.group(1))
    numbers = re.findall(r"\d+", reference)
    return int(numbers[0]) if len(numbers) == 1 else None


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _norm(name: Any) -> str:
    """Nome de aba ou de coluna sem acento, caixa ou separadores, para comparar formatos."""
    plain = unicodedata.normalize("NFKD", _text(name)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", plain.casefold())


def _raw(value: Any) -> dict[str, Any]:
    """JSON bruto guardado pelo P4 na coluna Conteudo, quando for um objeto."""
    text = _text(value)
    if not text.startswith("{"):
        return {}
    try:
        parsed = json.loads(text)
    except ValueError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


@dataclass(frozen=True)
class _Row:
    """Linha lida: `get` busca pela coluna normalizada; `original` guarda como veio."""

    values: dict[str, Any]
    original: dict[str, Any]

    def get(self, *names: str) -> Any:
        for name in names:
            value = self.values.get(name)
            if _text(value):
                return value
        return None


def _rows(sheet) -> tuple[set[str], list[_Row]]:
    iterator = sheet.iter_rows(values_only=True)
    try:
        header = [_text(cell) for cell in next(iterator)]
    except StopIteration:
        return set(), []
    keys = [_norm(name) for name in header]
    rows = []
    for index, values in enumerate(iterator):
        if index >= MAX_ROWS:
            raise P4ReportError(f"Relatório com mais de {MAX_ROWS} linhas em uma aba.")
        if all(value is None or _text(value) == "" for value in values):
            continue
        rows.append(
            _Row(
                values=dict(zip(keys, values, strict=False)),
                original={name: value for name, value in zip(header, values, strict=False) if name},
            )
        )
    return {key for key in keys if key}, rows


def _evidence(row: _Row, index_key: str) -> P4Item:
    content = row.get("conteudo")
    raw = _raw(content)
    reference = _text(row.get("referencia")) or _text(raw.get("referencia"))
    # No formato antigo, "conteudo" e o proprio texto da prova, nao o JSON bruto.
    plain_content = "" if raw else _text(content)
    return P4Item(
        kind="evidence",
        index_key=index_key,
        evidence_type=_text(row.get("tipoprova", "tipo")) or _text(raw.get("tipo")),
        summary=_text(row.get("resumo")) or _text(raw.get("resumo")) or plain_content[:2000],
        reference_raw=reference,
        page=page_from_reference(reference),
        original=row.original,
    )


def _answer(row: _Row, index_key: str) -> P4Item:
    raw = _raw(row.get("conteudo"))
    # O codigo do P4 grava `resposta`; o prompt e os leitores usam `resposta_tecnica`.
    answer = (
        _text(row.get("respostatecnica", "resposta"))
        or _text(raw.get("resposta_tecnica"))
        or _text(raw.get("resposta"))
    )
    return P4Item(
        kind="answer",
        index_key=index_key,
        question=_text(row.get("quesito")) or _text(raw.get("quesito")),
        answer=answer,
        technical_status=_text(row.get("statustecnico")) or _text(raw.get("status_tecnico")),
        justification=(
            _text(row.get("justificativatecnica", "justificativa"))
            or _text(raw.get("justificativa_tecnica"))
        ),
        notes=_text(row.get("observacoes")) or _text(raw.get("observacoes_adicionais")),
        original=row.original,
    )


def _question(row: _Row, index_key: str) -> P4Item:
    return P4Item(
        kind="question",
        index_key=index_key,
        question=_text(row.get("quesito", "quesitos")),
        original=row.original,
    )


# (provas, quesitos, respostas): nomes de aba normalizados, por formato.
_SHEET_SETS = {
    "three_sheets": ("provas", "quesitos", "respostas"),
    "stage_sheets": ("etapaevidencias", "etapaquesitos", "etaparespostas"),
}
_REQUIRED = (
    {"referencia"},  # provas
    set(),  # quesitos: "quesito" ou "quesitos", conferido abaixo
    {"quesito"},  # respostas
)


def parse_report(content: bytes) -> P4Report:
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # arquivo que nao abre como planilha
        raise P4ReportError("O arquivo não abre como planilha Excel.") from exc
    try:
        sheets = {_norm(sheet.title): sheet for sheet in workbook.worksheets}
        builders = (_evidence, _question, _answer)

        for layout, names in _SHEET_SETS.items():
            if not set(names) <= set(sheets):
                continue
            items: list[P4Item] = []
            for name, required, build in zip(names, _REQUIRED, builders, strict=True):
                header, rows = _rows(sheets[name])
                if header and not required <= header:
                    raise P4ReportError("Aba do relatório sem as colunas esperadas do P4.")
                if build is _question and header and not header & {"quesito", "quesitos"}:
                    raise P4ReportError("Aba de quesitos sem a coluna de quesito.")
                items.extend(build(row, _text(row.get("bloco"))) for row in rows)
            if not items:
                raise P4ReportError(
                    "Relatório vazio: a execução do P4 não gravou provas, quesitos nem respostas."
                )
            return P4Report(layout, items)

        if "relatorio" in sheets:
            header, rows = _rows(sheets["relatorio"])
            if not {"indice", "categoria"} <= header:
                raise P4ReportError("Planilha Relatorio sem as colunas esperadas do P4.")
            by_kind = {"evidence": _evidence, "question": _question, "answer": _answer}
            items = []
            for row in rows:
                category = _text(row.get("categoria"))
                kind = _CATEGORY.get(category.casefold())
                if kind is None:
                    raise P4ReportError(f"Categoria desconhecida no relatório: {category!r}.")
                items.append(by_kind[kind](row, _text(row.get("indice"))))
            if not items:
                raise P4ReportError(
                    "Relatório vazio: a execução do P4 não gravou provas, quesitos nem respostas."
                )
            return P4Report("single_sheet", items)

        if len(sheets) == 1:
            header, rows = _rows(next(iter(sheets.values())))
            if not header and not rows:
                raise P4ReportError("Planilha vazia: a execução do P4 não gravou o relatório.")
            if {"indice", "tipo", "conteudo"} <= header:
                raise P4ReportError(
                    "Esta é a planilha de índices do P4, não o relatório de provas, quesitos e "
                    "respostas."
                )
        raise P4ReportError(
            "Planilha sem as abas do relatório do P4 (Provas, Quesitos e Respostas, ou Relatorio)."
        )
    finally:
        workbook.close()


# ------------------------------------------------------- pacote de entrada


def build_input_package(pages: list[tuple[int, str]]) -> tuple[str, int]:
    """Texto pre-paginado no formato que o P4 le: uma linha `<pagina> N` antes de cada pagina.

    O P4 trata como marcador QUALQUER linha com "pag. N", "fls. N" ou "<pagina> N". O texto do
    documento nao e alterado; devolve-se junto quantas linhas do corpo o P4 leria como marcador,
    para que quem executa saiba que a paginacao dele pode se deslocar.
    """
    parts: list[str] = []
    ambiguous = 0
    for number, text in pages:
        parts.append(f"<pagina> {number}")
        body = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip("\n")
        ambiguous += sum(1 for line in body.split("\n") if _PAGE.search(line))
        parts.append(body)
    return "\n".join(parts) + "\n", ambiguous
