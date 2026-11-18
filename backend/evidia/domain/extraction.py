"""Sugestao de afirmacoes a partir do texto de um documento (RF03).

Sugestao nao e afirmacao: nada e gravado sem que uma pessoa aceite. Toda sugestao aponta a
pagina e um trecho que existe literalmente nela; o que nao puder ser conferido e descartado.
O texto do documento e dado nao confiavel — nunca instrucao (AC21).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace

from evidia.domain.texts import PageText, contains_excerpt

# A natureza "conclusao humana" nunca vem de extracao: e de quem revisa.
SUGGESTABLE_NATURES = ("documentary_finding", "attributed_allegation", "analytical_inference")
MAX_EXCERPT = 600
MAX_SUGGESTIONS = 200

_SENTENCE = re.compile(r"(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ\"“(])")

# Verbos que atribuem a fala a alguem: a frase registra uma alegacao, nao um fato.
_ALLEGATION = re.compile(
    r"\b(aleg(?:a|ou|am|aram)|afirm(?:a|ou|am|aram)|sustent(?:a|ou|am|aram)|"
    r"aduz(?:iu|em|iram)?|argument(?:a|ou|am|aram)|narr(?:a|ou)|defend(?:e|eu|em|eram)|"
    r"impugn(?:a|ou|am|aram)|requer(?:eu|em|eram)?)\b",
    re.IGNORECASE,
)
_SPEAKER = re.compile(
    r"\b((?:a|o)s?\s+(?:autor(?:a|es|as)?|r[ée]u?s?|r[ée]s?|requerente|requerid[oa]|"
    r"embargante|embargad[oa]|apelante|apelad[oa]|exequente|executad[oa]|"
    r"perit[oa](?:\s+do\s+ju[ií]zo)?|assistente\s+t[ée]cnic[oa]))\b",
    re.IGNORECASE,
)
# Registros do proprio documento: o que consta dele, verificavel na pagina.
_FINDING = re.compile(
    r"\b(consta(?:m|tou(?:-se)?)?|verific(?:ou(?:-se)?|a-se)|constat(?:ou(?:-se)?|a-se)|"
    r"apur(?:ou(?:-se)?|ado)|conclui(?:u|-se)?|certific(?:o|a|ou))\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Suggestion:
    text: str
    nature: str
    asserted_by: str
    page_no: int
    excerpt: str
    confidence: float
    method: str  # rules | llm


def _sentences(text: str) -> list[str]:
    flat = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    return [part.strip() for part in _SENTENCE.split(flat) if part.strip()]


def suggest_by_rules(pages: list[PageText]) -> list[Suggestion]:
    """Regras locais, sem IA. Confianca baixa e fixa: e um ponto de partida para a revisao."""
    out: list[Suggestion] = []
    for page in pages:
        for sentence in _sentences(page.text):
            if not 25 <= len(sentence) <= MAX_EXCERPT:
                continue
            speaker = _SPEAKER.search(sentence)
            if _ALLEGATION.search(sentence):
                nature, confidence = "attributed_allegation", 0.4
                asserted_by = speaker.group(1).strip() if speaker else ""
            elif _FINDING.search(sentence):
                nature, confidence, asserted_by = "documentary_finding", 0.3, ""
            else:
                continue
            out.append(
                Suggestion(
                    text=sentence,
                    nature=nature,
                    asserted_by=asserted_by[:200],
                    page_no=page.page_no,
                    excerpt=sentence,
                    confidence=confidence,
                    method="rules",
                )
            )
            if len(out) >= MAX_SUGGESTIONS:
                return out
    return out


@dataclass(frozen=True)
class Validation:
    accepted: list[Suggestion]
    # Itens devolvidos pelo modelo e recusados, com o motivo. Nunca sao "corrigidos".
    rejected: list[dict[str, str]]


def validate_model_output(raw: object, pages: list[PageText], *, method: str) -> Validation:
    """Confere a saida de um modelo contra o documento.

    O modelo so pode devolver sugestoes. Campo fora do contrato e ignorado; item sem pagina
    existente ou com trecho que nao esta literalmente na pagina e recusado. Assim, uma
    instrucao embutida no documento nao consegue produzir estado, natureza ou citacao que o
    contrato nao preveja.
    """
    by_page = {page.page_no: page.text for page in pages}
    accepted: list[Suggestion] = []
    rejected: list[dict[str, str]] = []
    items = raw.get("suggestions") if isinstance(raw, dict) else None
    if not isinstance(items, list):
        return Validation([], [{"reason": "invalid_output", "detail": "sem lista de sugestões"}])

    for item in items[:MAX_SUGGESTIONS]:
        if not isinstance(item, dict):
            rejected.append({"reason": "invalid_item", "detail": "item não é objeto"})
            continue
        text = item.get("text")
        nature = item.get("nature")
        page_no = item.get("page")
        excerpt = item.get("excerpt")
        if not isinstance(text, str) or not 3 <= len(text.strip()) <= 5000:
            rejected.append({"reason": "invalid_text", "detail": "texto ausente ou fora do limite"})
            continue
        if nature not in SUGGESTABLE_NATURES:
            rejected.append({"reason": "invalid_nature", "detail": str(nature)[:60]})
            continue
        if not isinstance(page_no, int) or isinstance(page_no, bool) or page_no not in by_page:
            rejected.append({"reason": "page_not_found", "detail": str(page_no)[:20]})
            continue
        if not isinstance(excerpt, str) or len(excerpt) > MAX_EXCERPT:
            rejected.append({"reason": "invalid_excerpt", "detail": "trecho ausente ou longo"})
            continue
        if not contains_excerpt(by_page[page_no], excerpt):
            rejected.append({"reason": "excerpt_not_in_page", "detail": f"página {page_no}"})
            continue
        confidence = item.get("confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
            confidence = 0.0
        asserted_by = item.get("asserted_by")
        accepted.append(
            Suggestion(
                text=text.strip(),
                nature=nature,
                asserted_by=asserted_by.strip()[:200] if isinstance(asserted_by, str) else "",
                page_no=page_no,
                excerpt=excerpt.strip(),
                confidence=max(0.0, min(1.0, float(confidence))),
                method=method,
            )
        )
    return Validation(accepted, rejected)


# Pecas assinadas por uma parte: o que nelas se narra e alegacao de quem assina (P01).
PARTY_PLEADINGS = {"peticao_inicial": "autor", "contestacao": "réu"}


def demote_pleading_findings(
    suggestions: list[Suggestion], doc_type: str | None
) -> tuple[list[Suggestion], int]:
    """Em peca de parte, sugestao que o modelo classificou como constatacao documental entra
    como alegacao de quem assina. Promover a constatacao e ato de quem revisa, nunca do modelo.

    Devolve as sugestoes e quantas foram ajustadas. Regra deterministica: nao depende de o
    modelo obedecer ao prompt (com modelo real, ele ainda promove documento apenas citado).
    """
    signer = PARTY_PLEADINGS.get(doc_type or "")
    if signer is None:
        return suggestions, 0
    out: list[Suggestion] = []
    adjusted = 0
    for item in suggestions:
        if item.nature == "documentary_finding":
            adjusted += 1
            item = replace(
                item,
                nature="attributed_allegation",
                asserted_by=item.asserted_by or f"parte que assina a peça ({signer})",
            )
        out.append(item)
    return out, adjusted
