"""Trabalhador em segundo plano, no proprio processo da API (ADR-004; AC20).

A cada ciclo: reconcilia as execucoes de motor em andamento e processa a fila de trabalhos.
Na inicializacao, o que estava em andamento quando o processo caiu e retomado: trabalhos
voltam para a fila e execucoes de motor sao consultadas pelo identificador do caso — sem
reenviar documento e sem duplicar achado.
"""

from __future__ import annotations

import threading
from typing import Any

from sqlalchemy import select

from evidia.errors import ApiError
from evidia.logging_setup import log
from evidia.models import EngineRun
from evidia.services import engines, jobs

SYSTEM_ACTOR = "system"


class Worker:
    def __init__(self, state: Any) -> None:
        # `state` e o app.state: fabrica de sessoes, configuracao e clientes de motor.
        self._state = state
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def recover(self) -> int:
        with self._state.write_session_factory() as db:
            return jobs.recover_orphans(db)

    def reconcile_engine_runs(self) -> int:
        """Consulta o motor para cada execucao em andamento. Devolve quantas mudaram."""
        settings = self._state.settings
        client = self._state.nulidade360_client
        with self._state.session_factory() as db:
            pending = db.scalars(
                select(EngineRun.id).where(EngineRun.status.in_(("queued", "running")))
            ).all()
        changed = 0
        for run_id in pending:
            with self._state.write_session_factory() as db:
                run = db.get(EngineRun, run_id)
                if run is None:
                    continue
                before = run.status
                try:
                    engines.refresh_run(db, SYSTEM_ACTOR, client, settings, run)
                except ApiError as exc:
                    # Motor indisponivel ou fora do contrato: a execucao segue em andamento
                    # e sera consultada de novo; nada e presumido.
                    db.rollback()
                    log().warning(f"reconciliacao adiada | execucao={run_id} | {exc.code}")
                    continue
                if run.status != before:
                    changed += 1
        return changed

    def tick(self) -> dict[str, int]:
        reconciled = self.reconcile_engine_runs()
        with self._state.write_session_factory() as db:
            processed = jobs.drain(db, self._state.settings)
        return {"reconciled": reconciled, "jobs": processed}

    def _loop(self) -> None:
        interval = self._state.settings.worker_interval_seconds
        while not self._stop.is_set():
            try:
                self.tick()
            except Exception as exc:  # o ciclo nunca derruba a API
                log().exception(f"ciclo do trabalhador falhou: {type(exc).__name__}")
            self._stop.wait(interval)

    def start(self) -> None:
        if self._thread is not None:
            return
        recovered = self.recover()
        if recovered:
            log().info(f"trabalhos retomados apos reinicio: {recovered}")
        self._thread = threading.Thread(target=self._loop, name="evidia-worker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=10)
            self._thread = None
