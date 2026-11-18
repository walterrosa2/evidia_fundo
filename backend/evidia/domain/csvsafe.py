"""CSV seguro para planilhas: neutraliza formulas injetadas (US06)."""

from __future__ import annotations

import csv
import io
from collections.abc import Iterable

_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def neutralize(value: str) -> str:
    """Texto que uma planilha interpretaria como formula passa a ser texto literal."""
    if value.startswith(_FORMULA_PREFIXES):
        return "'" + value
    return value


class Trusted(str):
    """Valor gerado pelo sistema (numero, data): nao e neutralizado."""


def render_csv(rows: Iterable[Iterable[object]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n", quoting=csv.QUOTE_MINIMAL)
    for row in rows:
        out = []
        for cell in row:
            if cell is None:
                out.append("")
            elif isinstance(cell, Trusted):
                out.append(str(cell))
            elif isinstance(cell, bool):
                out.append("sim" if cell else "nao")
            elif isinstance(cell, int):
                out.append(str(cell))
            else:
                out.append(neutralize(str(cell)))
        writer.writerow(out)
    # BOM: planilhas reconhecem UTF-8 e preservam acentos.
    return ("﻿" + buffer.getvalue()).encode("utf-8")


def decimal_br(value: str) -> Trusted:
    """Texto decimal do contrato ("-1500.50") com virgula decimal, sem milhar."""
    return Trusted(value.replace(".", ","))
