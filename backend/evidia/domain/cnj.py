"""Numeracao unica do CNJ (Resolucao CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.

O digito verificador segue o modulo 97 base 10 (ISO 7064). O tribunal e derivado dos
segmentos J.TR do proprio numero; a originacao nao expoe esse campo.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_DIGITS = re.compile(r"\D")

_SEGMENTS = {
    "1": "STF",
    "2": "CNJ",
    "3": "STJ",
    "4": "Justica Federal",
    "5": "Justica do Trabalho",
    "6": "Justica Eleitoral",
    "7": "Justica Militar da Uniao",
    "8": "Justica Estadual",
    "9": "Justica Militar Estadual",
}

_STATE_COURTS = {
    "01": "AC", "02": "AL", "03": "AP", "04": "AM", "05": "BA", "06": "CE", "07": "DFT",
    "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA",
    "15": "PB", "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS",
    "22": "RO", "23": "RR", "24": "SC", "25": "SE", "26": "SP", "27": "TO",
}  # fmt: skip


@dataclass(frozen=True)
class Cnj:
    masked: str
    digits: str
    segment: str
    court: str

    @property
    def court_code(self) -> str:
        return f"{self.segment}.{self.court}"

    @property
    def court_label(self) -> str:
        if self.segment == "8" and self.court in _STATE_COURTS:
            return f"TJ{_STATE_COURTS[self.court]}"
        if self.segment == "4" and self.court != "00":
            return f"TRF{int(self.court)}"
        if self.segment == "5" and self.court != "00":
            return f"TRT{int(self.court)}"
        return _SEGMENTS.get(self.segment, "Tribunal não identificado")


class InvalidCnj(ValueError):
    pass


def check_digits(sequential: str, year: str, segment: str, court: str, origin: str) -> str:
    remainder = int(sequential) % 97
    remainder = int(f"{remainder}{year}{segment}{court}") % 97
    remainder = int(f"{remainder}{origin}00") % 97
    return f"{98 - remainder:02d}"


def parse_cnj(raw: str | None) -> Cnj:
    """Normaliza para a forma mascarada e valida o digito verificador."""
    digits = _DIGITS.sub("", raw or "")
    if len(digits) != 20:
        raise InvalidCnj("CNJ deve conter 20 dígitos")
    seq, dv, year, seg, court, origin = (
        digits[0:7],
        digits[7:9],
        digits[9:13],
        digits[13],
        digits[14:16],
        digits[16:20],
    )
    if check_digits(seq, year, seg, court, origin) != dv:
        raise InvalidCnj("dígito verificador do CNJ não confere")
    return Cnj(
        masked=f"{seq}-{dv}.{year}.{seg}.{court}.{origin}",
        digits=digits,
        segment=seg,
        court=court,
    )
