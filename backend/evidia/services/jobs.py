"""Fila de trabalhos no banco (ADR-004; AC20).

Estados: queued → running → completed | failed | cancelled. Uma nova tentativa reaproveita
o mesmo registro. Trabalho que ficou "running" quando o processo caiu volta para a fila na
inicializacao; cada executor precisa, portanto, ser idempotente.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from evidia.config import Settings
from evidia.logging_setup import audit
from evidia.models import Job, utcnow

ACTIVE = ("queued", "running")
Handler = Callable[[Session, Job, Settings], dict[str, Any]]
HANDLERS: dict[str, Handler] = {}


class JobFailed(Exception):
    """Falha de um trabalho. `retryable` decide se ele volta para a fila."""

    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.message = message
        self.retryable = retryable


def handler(kind: str) -> Callable[[Handler], Handler]:
    def register(fn: Handler) -> Handler:
        HANDLERS[kind] = fn
        return fn

    return register


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def enqueue(
    db: Session,
    *,
    organization_id: str,
    opportunity_id: str | None,
    kind: str,
    target_id: str,
    created_by: str,
    payload: dict[str, Any] | None = None,
    max_attempts: int = 3,
) -> tuple[Job, bool]:
    """Coloca um trabalho na fila. Devolve (trabalho, criado). Pedido repetido para o mesmo
    alvo, com outro ainda ativo, devolve o existente."""
    existing = db.scalar(
        select(Job).where(
            Job.organization_id == organization_id,
            Job.kind == kind,
            Job.target_id == target_id,
            Job.status.in_(ACTIVE),
        )
    )
    if existing is not None:
        return existing, False
    job = Job(
        organization_id=organization_id,
        opportunity_id=opportunity_id,
        kind=kind,
        target_id=target_id,
        status="queued",
        payload=payload or {},
        max_attempts=max_attempts,
        created_by=created_by,
    )
    db.add(job)
    db.flush()
    return job, True


def recover_orphans(db: Session) -> int:
    """Trabalhos interrompidos por queda do processo voltam para a fila (AC20)."""
    count = db.execute(
        update(Job).where(Job.status == "running").values(status="queued", started_at=None)
    ).rowcount
    db.commit()
    return count


def claim_next(db: Session) -> Job | None:
    now = utcnow()
    job = db.scalar(
        select(Job)
        .where(Job.status == "queued")
        .order_by(Job.created_at, Job.id)
        .limit(20)
        .where((Job.next_attempt_at.is_(None)) | (Job.next_attempt_at <= now))
    )
    if job is None:
        db.rollback()
        return None
    job.status = "running"
    job.attempts += 1
    job.started_at = now
    job.error = None
    db.commit()
    return job


def run(db: Session, job: Job, settings: Settings) -> Job:
    """Executa um trabalho ja reservado e grava o desfecho."""
    fn = HANDLERS.get(job.kind)
    try:
        if fn is None:
            raise JobFailed(f"Tipo de trabalho desconhecido: {job.kind}.")
        result = fn(db, job, settings)
    except JobFailed as exc:
        db.rollback()
        job = db.get(Job, job.id)
        retry = exc.retryable and job.attempts < job.max_attempts
        job.error = exc.message[:500]
        if retry:
            job.status = "queued"
            job.next_attempt_at = utcnow() + timedelta(seconds=min(300, 5 * 2**job.attempts))
        else:
            job.status = "failed"
            job.finished_at = utcnow()
        db.commit()
        audit(
            "job.run",
            actor="system",
            organization_id=job.organization_id,
            target=f"job:{job.id}",
            outcome="retry" if retry else "failed",
            data={"kind": job.kind, "attempts": job.attempts},
        )
        return job
    job = db.get(Job, job.id)
    job.status = "completed"
    job.result = result
    job.finished_at = utcnow()
    db.commit()
    audit(
        "job.run",
        actor="system",
        organization_id=job.organization_id,
        target=f"job:{job.id}",
        outcome="completed",
        data={"kind": job.kind, "attempts": job.attempts},
    )
    return job


def drain(db: Session, settings: Settings, *, limit: int = 20) -> int:
    """Processa os trabalhos disponiveis agora. Usado pelo trabalhador e pelos testes."""
    done = 0
    while done < limit:
        job = claim_next(db)
        if job is None:
            break
        run(db, job, settings)
        done += 1
    return done
