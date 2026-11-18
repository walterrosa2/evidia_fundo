"""Regras puras da diligencia de vinculos e qualificacao tecnica (RF07–RF12, AC09–AC12).

O que estas regras NAO fazem, de proposito:
- nao mesclam pessoas pelo nome: homonimo sem identificador comum continua separado (AC09);
- nao tratam coocorrencia em processo como amizade, contratacao ou parcialidade;
- nao chamam uma frequencia de "anormal": sem denominador, a recorrencia e so contagem;
- nao convertem a relacao esperada de um assistente com a parte que o contratou em
  suspeicao (AC11);
- nao leem "nenhum resultado" como "nenhum vinculo": falha de fonte e outro estado.
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date

WINDOW_YEARS = 5

# Papeis no processo. O papel pertence a relacao pessoa-processo, nao a pessoa.
EXPERT_ROLES = ("court_expert", "party_assistant")
ROLES = (*EXPERT_ROLES, "lawyer", "judge", "party", "other")
SIDES = ("claimant", "defendant", "court", "none")
# Identificadores que sustentam identidade quando legitimamente disponiveis.
# "source_id" e o identificador da pessoa dentro de uma fonte: indica a mesma entidade
# segundo aquela fonte, e so. A identidade continua candidata ate revisao humana.
STRONG_IDENTIFIERS = ("cpf", "cnpj", "oab", "crea", "professional_registry", "source_id")

OCCURRENCE_STATES = (
    "candidate",
    "identity_pending",
    "identity_confirmed",
    "evidence_collected",
    "in_review",
    "validated",
    "discarded",
    "inconclusive",
    "contested",
    "forwarded_legal",
)
OCCURRENCE_KINDS = ("cooccurrence", "qualification", "disciplinary", "social", "other")
# Estado de procedimento disciplinar. So "sanction_in_force" e sancao vigente.
PROCEEDING_STATUSES = ("ongoing", "archived", "acquitted", "sanction_in_force", "sanction_served")


def normalize_name(name: str) -> str:
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", plain.casefold()).strip()


def identifier_key(kind: str, value: str, uf: str | None = None) -> str:
    """Forma comparavel de um identificador. OAB e registro profissional incluem a UF."""
    digits = re.sub(r"[^0-9a-z]", "", value.casefold())
    suffix = f"/{uf.strip().casefold()}" if uf and uf.strip() else ""
    return f"{kind}:{digits}{suffix}"


def strong_keys(identifiers: list[dict]) -> set[str]:
    return {
        identifier_key(item["type"], item["value"], item.get("uf"))
        for item in identifiers or []
        if item.get("type") in STRONG_IDENTIFIERS and str(item.get("value") or "").strip()
    }


def same_identity(a: list[dict], b: list[dict]) -> bool:
    """Duas fichas so sao a mesma pessoa, sem decisao humana, se tem um identificador forte
    identico. Nome igual nunca basta."""
    return bool(strong_keys(a) & strong_keys(b))


@dataclass(frozen=True)
class Person:
    id: str
    name: str
    identifiers: list[dict] = field(default_factory=list)


def homonym_groups(people: list[Person]) -> list[list[str]]:
    """Fichas com o mesmo nome e sem identificador forte em comum: candidatas a mesma
    pessoa, a confirmar por revisao. Nunca sao unidas aqui."""
    by_name: dict[str, list[Person]] = defaultdict(list)
    for person in people:
        key = normalize_name(person.name)
        if key:
            by_name[key].append(person)
    groups = []
    for same in by_name.values():
        if len(same) < 2:
            continue
        unresolved = [
            p.id
            for p in same
            if not any(
                other.id != p.id and same_identity(p.identifiers, other.identifiers)
                for other in same
            )
        ]
        if len(unresolved) >= 2:
            groups.append(sorted(unresolved))
    return sorted(groups)


def window_for(reference: date, years: int = WINDOW_YEARS) -> tuple[date, date]:
    """Janela inclusiva: da mesma data `years` anos antes ate a data de referencia."""
    try:
        start = reference.replace(year=reference.year - years)
    except ValueError:  # 29/02 em ano de destino nao bissexto
        start = reference.replace(year=reference.year - years, day=28)
    return start, reference


def classify_event(event_date: date | None, start: date, end: date) -> str:
    """A data que conta e a do ato ou atuacao, nao a de distribuicao do processo."""
    if event_date is None:
        return "undated"
    return "in_window" if start <= event_date <= end else "out_of_window"


@dataclass(frozen=True)
class Role:
    id: str
    participant_id: str
    cnj: str
    role: str
    side: str
    event_date: date | None
    filing_date: date | None = None


def relation_is_expected(subject: Role, other: Role) -> bool:
    """Assistente tecnico e de confianca da parte que o indicou: aparecer com essa parte ou
    com o advogado dela e a relacao esperada, nao um alerta (AC11)."""
    return (
        subject.role == "party_assistant"
        and subject.side in ("claimant", "defendant")
        and other.role in ("party", "lawyer")
        and other.side == subject.side
    )


RELATION_FOR_ROLE = {"lawyer": "expert_lawyer", "party": "expert_party", "judge": "expert_judge"}


@dataclass(frozen=True)
class Cooccurrence:
    subject_role_id: str
    other_role_id: str
    other_participant_id: str
    relation: str
    cnj: str
    event_date: date | None
    timing: str  # in_window | out_of_window | undated
    expected: bool
    # A atuacao esta na janela, mas o processo foi distribuido antes dela (AC10).
    filed_before_window: bool


@dataclass(frozen=True)
class Recurrence:
    other_participant_id: str
    relation: str
    # Processos distintos, com atuacao datada dentro da janela, em que os dois aparecem.
    count: int
    # Processos distintos do profissional com atuacao datada na janela, entre os que foram
    # efetivamente consultados. Nulo ou zero: nao ha base para falar em frequencia.
    universe: int | None
    expected: bool


@dataclass(frozen=True)
class Crosscheck:
    subject_participant_id: str
    cooccurrences: list[Cooccurrence]
    recurrences: list[Recurrence]


def crosscheck(
    subject_participant_id: str,
    subject_roles: list[Role],
    other_roles: list[Role],
    start: date,
    end: date,
) -> Crosscheck:
    """Cruza um perito ou assistente com advogados, partes e magistrados (RF09).

    Coocorrencia e so isto: os dois aparecem no mesmo processo. Evento fora da janela e
    evento sem data sao devolvidos, mas nao entram na contagem de recorrencia.
    """
    by_cnj: dict[str, list[Role]] = defaultdict(list)
    for other in other_roles:
        if other.participant_id != subject_participant_id and other.role in RELATION_FOR_ROLE:
            by_cnj[other.cnj].append(other)

    found: list[Cooccurrence] = []
    for mine in subject_roles:
        if mine.role not in EXPERT_ROLES:
            continue
        timing = classify_event(mine.event_date, start, end)
        for other in by_cnj.get(mine.cnj, []):
            found.append(
                Cooccurrence(
                    subject_role_id=mine.id,
                    other_role_id=other.id,
                    other_participant_id=other.participant_id,
                    relation=RELATION_FOR_ROLE[other.role],
                    cnj=mine.cnj,
                    event_date=mine.event_date,
                    timing=timing,
                    expected=relation_is_expected(mine, other),
                    filed_before_window=(
                        timing == "in_window"
                        and mine.filing_date is not None
                        and mine.filing_date < start
                    ),
                )
            )

    universe = {
        r.cnj
        for r in subject_roles
        if r.role in EXPERT_ROLES and classify_event(r.event_date, start, end) == "in_window"
    }
    grouped: dict[tuple[str, str], set[str]] = defaultdict(set)
    expected: dict[tuple[str, str], bool] = {}
    for item in found:
        if item.timing != "in_window":
            continue
        key = (item.other_participant_id, item.relation)
        grouped[key].add(item.cnj)
        expected[key] = expected.get(key, True) and item.expected
    recurrences = [
        Recurrence(
            other_participant_id=other_id,
            relation=relation,
            count=len(cnjs),
            universe=len(universe) or None,
            expected=expected[(other_id, relation)],
        )
        for (other_id, relation), cnjs in grouped.items()
    ]
    recurrences.sort(key=lambda r: (-r.count, r.relation, r.other_participant_id))
    found.sort(key=lambda c: (c.cnj, c.relation, c.other_participant_id))
    return Crosscheck(subject_participant_id, found, recurrences)


def qualification_status(
    valid_from: date | None, valid_to: date | None, act_date: date | None
) -> str:
    """Situacao do registro profissional NA DATA do ato questionado.

    Registro atual nao prova habilitacao na data do laudo: sem inicio de vigencia conhecido
    a resposta e 'unknown', e a lacuna historica fica visivel.
    """
    if act_date is None or valid_from is None:
        return "unknown"
    if act_date < valid_from:
        return "not_covered"
    if valid_to is not None and act_date > valid_to:
        return "not_covered"
    return "covered"


def is_current_sanction(proceeding_status: str | None) -> bool:
    """Procedimento arquivado, absolvicao ou sancao ja cumprida nao sao sancao vigente."""
    return proceeding_status == "sanction_in_force"


def occurrence_blockers(
    *,
    kind: str,
    subject_identity_confirmed: bool,
    has_source: bool,
    sheet: dict,
) -> list[dict[str, str]]:
    """O que impede promover uma ocorrencia a 'validada' (RF11, AC12)."""
    blockers: list[dict[str, str]] = []
    if not subject_identity_confirmed:
        blockers.append(
            {
                "code": "identity_not_confirmed",
                "message": "A identidade do profissional ainda não foi confirmada.",
            }
        )
    if not has_source:
        blockers.append(
            {
                "code": "source_missing",
                "message": "Sem fonte original: informe documento e página do dossiê ou endereço.",
            }
        )
    if kind == "social":
        required = (
            ("content_date", "data do conteúdo"),
            ("author_attributed", "autoria atribuída"),
            ("relevance_justification", "justificativa de relevância"),
        )
        for key, label in required:
            if not str(sheet.get(key) or "").strip():
                blockers.append(
                    {
                        "code": f"social_{key}_missing",
                        "message": f"Material de rede social sem {label} confirmada.",
                    }
                )
    if kind == "disciplinary" and not str(sheet.get("proceeding_status") or "").strip():
        blockers.append(
            {
                "code": "proceeding_status_missing",
                "message": (
                    "Informe o estado do procedimento: notícia de denúncia não é condenação."
                ),
            }
        )
    return blockers
