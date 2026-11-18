"""Loguru: stdout para operacao, arquivo rotativo e trilha de auditoria em JSONL.

Logs gerais nao recebem autos, segredos ou dados pessoais brutos. Eventos de auditoria
carregam apenas identificadores, acao, alvo e resultado (P07).
"""

from __future__ import annotations

import json
import re
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from loguru import logger

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="-")

_CPF = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
_CNPJ = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_SECRET_KEYS = ("password", "senha", "token", "secret", "api_key", "authorization", "cookie")


def sanitize(value: Any) -> Any:
    """Remove segredos e mascara identificadores pessoais antes de registrar."""
    if isinstance(value, dict):
        return {
            k: ("***" if any(s in str(k).lower() for s in _SECRET_KEYS) else sanitize(v))
            for k, v in value.items()
        }
    if isinstance(value, list | tuple):
        return [sanitize(v) for v in value]
    if isinstance(value, str):
        value = _CNPJ.sub("[cnpj]", value)
        value = _CPF.sub("[cpf]", value)
        return _EMAIL.sub("[email]", value)
    return value


def _audit_sink_factory(path: Path):
    def _format(record) -> str:
        record["extra"]["serialized"] = json.dumps(
            record["extra"]["audit_event"], ensure_ascii=False, default=str
        )
        return "{extra[serialized]}\n"

    return _format


_configured_dir: Path | None = None


def setup_logging(log_dir: Path) -> None:
    global _configured_dir
    if _configured_dir == log_dir:
        return
    log_dir.mkdir(parents=True, exist_ok=True)
    logger.remove()
    fmt = "{time:YYYY-MM-DDTHH:mm:ss.SSSZ} | {level} | {extra[correlation_id]} | {message}"
    logger.configure(extra={"correlation_id": "-"})
    logger.add(
        sys.stdout, format=fmt, level="INFO", filter=lambda r: "audit_event" not in r["extra"]
    )
    logger.add(
        log_dir / "app.log",
        format=fmt,
        level="INFO",
        rotation="10 MB",
        retention="30 days",
        encoding="utf-8",
        filter=lambda r: "audit_event" not in r["extra"],
    )
    logger.add(
        log_dir / "audit.jsonl",
        format=_audit_sink_factory(log_dir),
        level="INFO",
        rotation="10 MB",
        retention="90 days",
        encoding="utf-8",
        filter=lambda r: "audit_event" in r["extra"],
    )
    _configured_dir = log_dir


def log() -> Any:
    return logger.bind(correlation_id=correlation_id_var.get())


def audit(
    action: str,
    *,
    actor: str,
    target: str,
    outcome: str,
    organization_id: str | None = None,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Registra um evento de auditoria sanitizado e o devolve (util em testes)."""
    event = {
        "timestamp": datetime.now(UTC).isoformat(),
        "correlation_id": correlation_id_var.get(),
        "actor": actor,
        "organization_id": organization_id,
        "action": action,
        "target": target,
        "outcome": outcome,
        "data": sanitize(data or {}),
    }
    logger.bind(audit_event=event, correlation_id=event["correlation_id"]).info(action)
    return event
