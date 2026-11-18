"""Engine e sessao do banco transacional."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def make_engine(database_url: str) -> Engine:
    is_sqlite = database_url.startswith("sqlite")
    if is_sqlite and ":memory:" not in database_url:
        path = database_url.split("///", 1)[-1]
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False, "timeout": 30} if is_sqlite else {},
    )

    if is_sqlite:

        @event.listens_for(engine, "connect")
        def _pragmas(dbapi_conn, _record) -> None:
            # O pysqlite abre transacoes implicitamente e de forma tardia; desligamos
            # isso para emitir BEGIN IMMEDIATE e serializar escritas concorrentes.
            dbapi_conn.isolation_level = None
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA foreign_keys=ON")
            cur.execute("PRAGMA busy_timeout=30000")
            cur.close()

        @event.listens_for(engine, "begin")
        def _begin(conn) -> None:
            # Requisicoes que alteram estado tomam a trava de escrita ja no inicio:
            # promover uma transacao de leitura a escrita falharia sob concorrencia.
            if conn.get_execution_options().get(WRITE_OPTION):
                conn.exec_driver_sql("BEGIN IMMEDIATE")
            else:
                conn.exec_driver_sql("BEGIN")

    return engine


WRITE_OPTION = "evidia_write"


def make_session_factory(engine: Engine, *, write: bool = False) -> sessionmaker[Session]:
    bind = engine.execution_options(**{WRITE_OPTION: True}) if write else engine
    return sessionmaker(bind=bind, expire_on_commit=False)


def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    session = factory()
    try:
        yield session
    finally:
        session.close()
