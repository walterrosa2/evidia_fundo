"""Conectores de diligencia: historico processual de um profissional (RF10; T012).

Cada conector declara a propria cobertura e o campo de data que consegue filtrar. Falha de
fonte e erro tipado ("nao foi possivel consultar"); lista vazia so significa "esta consulta,
com esta cobertura, nao trouxe resultado" — nunca "nenhum vinculo".

Fonte real por API (fornecedor contratado) depende de autorizacao, credencial e contrato (D3):
nao ha conector de API aqui. Existem o modo desligado, o conector sintetico rotulado e a
leitura de PLANILHA com o resultado de uma consulta feita por pessoa autorizada em fonte
real (tribunal, conselho, fornecedor): o arquivo entra no dossie e e a prova da coleta.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Protocol

from evidia.domain.diligence import normalize_name, strong_keys


class DiligenceError(Exception):
    def __init__(self, code: str, message: str, *, status: int = 502, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.retryable = retryable


@dataclass(frozen=True)
class CoParticipant:
    name: str
    role: str
    side: str = "none"
    kind: str = "person"
    identifiers: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class ConnectorItem:
    cnj: str
    court: str
    role: str
    side: str
    # Data do ato ou atuacao do profissional; nula quando a fonte nao informa.
    event_date: date | None
    event_label: str
    filing_date: date | None
    source_ref: str
    co_participants: list[CoParticipant] = field(default_factory=list)


@dataclass(frozen=True)
class ConnectorResult:
    items: list[ConnectorItem]
    # O que esta fonte cobre e o que nao cobre, em linguagem direta.
    coverage: str
    # Campo de data que a fonte consegue filtrar: "event_date" ou "filing_date".
    filter_field: str
    is_synthetic: bool


class DiligenceConnector(Protocol):
    name: str

    def search(
        self, *, name: str, identifiers: list[dict], start: date, end: date
    ) -> ConnectorResult: ...


class DisabledDiligenceConnector:
    name = "disabled"

    def search(self, **_: object) -> ConnectorResult:
        raise DiligenceError(
            "diligence_not_configured",
            "Nenhuma fonte de diligência configurada neste ambiente.",
            status=503,
        )


_JUDGE = CoParticipant(
    "Magistrado Sintético Um",
    "judge",
    "court",
    identifiers=[{"type": "source_id", "value": "fixture:magistrado-1"}],
)
_LAWYER = CoParticipant(
    "Advogada Sintética Um",
    "lawyer",
    "defendant",
    identifiers=[
        {"type": "oab", "value": "000001", "uf": "SP"},
        {"type": "source_id", "value": "fixture:advogada-1"},
    ],
)
_PARTY = CoParticipant(
    "Ré Sintética Beta S.A.",
    "party",
    "defendant",
    kind="company",
    identifiers=[{"type": "source_id", "value": "fixture:empresa-beta"}],
)


class FixtureDiligenceConnector:
    """Fonte SINTETICA: nenhum dos processos ou pessoas existe.

    Simula uma fonte que so filtra por data de distribuicao, para exercitar o caso em que a
    atuacao esta na janela mas o processo e anterior (AC10).
    """

    name = "fixture-sintetica"
    COVERAGE = (
        "Fonte sintética de teste. Simula um fornecedor que só filtra pela data de "
        "distribuição do processo e que não indexa todos os peritos como envolvidos: a "
        "cobertura não é integral."
    )

    def search(
        self, *, name: str, identifiers: list[dict], start: date, end: date
    ) -> ConnectorResult:
        key = normalize_name(name)
        if "fonte fora" in key:
            raise DiligenceError(
                "diligence_unavailable",
                "Não foi possível consultar a fonte de diligência.",
                status=503,
                retryable=True,
            )
        known = "crea:000001/sp" in strong_keys(identifiers) or "perito sintetico um" in key
        if not known:
            return ConnectorResult([], self.COVERAGE, "filing_date", True)
        year = end.year
        items = [
            ConnectorItem(  # atuacao na janela em processo distribuido muito antes
                cnj="9000011-10.2018.8.26.0100",
                court="TJSP",
                role="court_expert",
                side="court",
                event_date=date(year - 3, 5, 10),
                event_label="Nomeação como perito",
                filing_date=date(year - 8, 3, 2),
                source_ref="fixture:processo-11",
                co_participants=[_JUDGE, _LAWYER, _PARTY],
            ),
            ConnectorItem(
                cnj="9000012-55.2024.8.26.0100",
                court="TJSP",
                role="court_expert",
                side="court",
                event_date=date(year - 2, 9, 1),
                event_label="Entrega do laudo",
                filing_date=date(year - 2, 1, 15),
                source_ref="fixture:processo-12",
                co_participants=[_JUDGE],
            ),
            ConnectorItem(  # fora da janela de cinco anos
                cnj="9000013-90.2019.8.26.0100",
                court="TJSP",
                role="court_expert",
                side="court",
                event_date=date(year - 6, 2, 20),
                event_label="Nomeação como perito",
                filing_date=date(year - 7, 6, 1),
                source_ref="fixture:processo-13",
                co_participants=[_JUDGE],
            ),
            ConnectorItem(  # a fonte nao informa a data do ato
                cnj="9000014-35.2023.8.26.0100",
                court="TJSP",
                role="court_expert",
                side="court",
                event_date=None,
                event_label="Atuação sem data informada",
                filing_date=date(year - 3, 4, 4),
                source_ref="fixture:processo-14",
                co_participants=[_LAWYER],
            ),
        ]
        return ConnectorResult(items, self.COVERAGE, "filing_date", True)


# ---------------------------------------------------- resultado por planilha

FILE_COLUMNS = (
    ("cnj", "Processo (CNJ)", True),
    ("court", "Tribunal", False),
    ("role", "Papel", True),
    ("side", "Lado", False),
    ("event_date", "Data do ato", False),
    ("event_label", "Ato", False),
    ("filing_date", "Data de distribuição", False),
    ("source_ref", "Referência na fonte", True),
)
_FILE_ROLES = {
    "perito": "court_expert",
    "perito do juizo": "court_expert",
    "assistente tecnico": "party_assistant",
    "advogado": "lawyer",
    "juiz": "judge",
    "parte": "party",
    "outro": "other",
}
_FILE_SIDES = {"autor": "claimant", "reu": "defendant", "juizo": "court", "": "none"}
MAX_FILE_ROWS = 5000


def _file_date(value: object, row: int, label: str) -> date | None:
    from datetime import datetime as _dt

    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, _dt):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for pattern in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return _dt.strptime(text, pattern).date()
        except ValueError:
            continue
    raise DiligenceError(
        "diligence_file_invalid",
        f"Linha {row}: {label} “{text}” não é uma data (use AAAA-MM-DD ou DD/MM/AAAA).",
        status=422,
    )


def parse_result_file(content: bytes, *, coverage: str, is_synthetic: bool) -> ConnectorResult:
    """Le a planilha com o resultado de uma consulta feita fora (uma linha por atuacao).

    A planilha inteira e recusada se uma linha for invalida: importar parte do resultado
    esconderia o que ficou de fora. A cobertura e declarada por quem importa.
    """
    import io

    from openpyxl import load_workbook

    def bad(message: str) -> DiligenceError:
        return DiligenceError("diligence_file_invalid", message, status=422)

    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # nao abre como planilha
        raise bad("O arquivo não abre como planilha Excel.") from exc
    try:
        rows = workbook.worksheets[0].iter_rows(values_only=True)
        try:
            header = [normalize_name(str(cell or "")) for cell in next(rows)]
        except StopIteration:
            raise bad("Planilha vazia.") from None
        index: dict[str, int] = {}
        for key, label, required in FILE_COLUMNS:
            wanted = normalize_name(label)
            if wanted in header:
                index[key] = header.index(wanted)
            elif required:
                raise bad(f"Coluna obrigatória ausente: {label}.")

        def cell(values: tuple, key: str) -> object:
            position = index.get(key)
            return values[position] if position is not None and position < len(values) else None

        items: list[ConnectorItem] = []
        for number, values in enumerate(rows, start=2):
            if all(v is None or str(v).strip() == "" for v in values):
                continue
            if len(items) >= MAX_FILE_ROWS:
                raise bad(f"Planilha com mais de {MAX_FILE_ROWS} linhas.")
            cnj = str(cell(values, "cnj") or "").strip()
            if sum(ch.isdigit() for ch in cnj) != 20:
                raise bad(f"Linha {number}: CNJ “{cnj}” não tem 20 dígitos.")
            role = _FILE_ROLES.get(normalize_name(str(cell(values, "role") or "")))
            if role is None:
                raise bad(
                    f"Linha {number}: papel não reconhecido. Use: "
                    + ", ".join(sorted(_FILE_ROLES))
                    + "."
                )
            side = _FILE_SIDES.get(normalize_name(str(cell(values, "side") or "")))
            if side is None:
                raise bad(f"Linha {number}: lado não reconhecido (use autor, réu ou juízo).")
            source_ref = str(cell(values, "source_ref") or "").strip()
            if not source_ref:
                raise bad(f"Linha {number}: falta a referência na fonte (endereço ou protocolo).")
            items.append(
                ConnectorItem(
                    cnj=cnj,
                    court=str(cell(values, "court") or "").strip(),
                    role=role,
                    side=side,
                    event_date=_file_date(cell(values, "event_date"), number, "data do ato"),
                    event_label=str(cell(values, "event_label") or "").strip(),
                    filing_date=_file_date(
                        cell(values, "filing_date"), number, "data de distribuição"
                    ),
                    source_ref=source_ref[:300],
                )
            )
    finally:
        workbook.close()
    return ConnectorResult(items, coverage, "event_date", is_synthetic)
