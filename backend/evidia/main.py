"""Aplicacao FastAPI da Evidia operacional.

Este servico expoe apenas a API. O frontend TanStack Start (SSR) continua sendo
servido pelo proprio runtime Node; nao ha catch-all de SPA aqui (ADR-001).
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect as sa_inspect
from sqlalchemy import select

from evidia import __version__
from evidia.adapters.diligence import DisabledDiligenceConnector, FixtureDiligenceConnector
from evidia.adapters.nulidade360 import (
    DisabledNulidade360Client,
    HttpNulidade360Client,
    Nulidade360Client,
    Nulidade360Error,
)
from evidia.adapters.origination import (
    DisabledOriginationClient,
    FixtureOriginationClient,
    HttpOriginationClient,
    OriginationClient,
    OriginationError,
    SqliteOriginationClient,
)
from evidia.config import Settings, get_settings
from evidia.db import Base, make_engine, make_session_factory
from evidia.errors import ApiError
from evidia.llm import DisabledLLM, GeminiLLM, LLMClient, LLMError, MockLLM
from evidia.logging_setup import audit, correlation_id_var, log, setup_logging
from evidia.models import Organization, User
from evidia.routers import (
    auth,
    diligence,
    documents,
    engines,
    operations,
    scenarios,
    tables,
)
from evidia.schemas import HealthOut
from evidia.security import hash_password
from evidia.services import tables as table_service
from evidia.worker import Worker


class _MisconfiguredOrigination(DisabledOriginationClient):
    def __init__(self, error: OriginationError) -> None:
        self._error = error

    def _fail(self):
        raise self._error


def build_llm_client(settings: Settings) -> LLMClient:
    if settings.llm_mode == "mock":
        # O respondedor real e montado a cada pedido, a partir das paginas escolhidas.
        return MockLLM(lambda _prompt: {"suggestions": []})
    if settings.llm_mode == "gemini":
        try:
            return GeminiLLM(
                settings.llm_api_key,
                settings.llm_model,
                base_url=settings.llm_base_url,
                timeout=settings.llm_timeout_seconds,
                max_retries=settings.llm_max_retries,
            )
        except LLMError:
            # Chave ausente: erro de configuracao a cada uso, sem trocar de modo (AC22).
            return DisabledLLM()
    return DisabledLLM()


def build_nulidade360_client(settings: Settings) -> Nulidade360Client:
    if settings.nulidade360_mode in ("mock", "live"):
        try:
            return HttpNulidade360Client(
                settings.nulidade360_base_url, timeout=settings.nulidade360_timeout_seconds
            )
        except Nulidade360Error:
            return DisabledNulidade360Client()
    return DisabledNulidade360Client()


def build_origination_client(settings: Settings) -> OriginationClient:
    if settings.origination_mode == "fixture":
        return FixtureOriginationClient()
    if settings.origination_mode == "http":
        try:
            return HttpOriginationClient(
                settings.origination_base_url,
                settings.origination_email,
                settings.origination_password,
                timeout=settings.origination_timeout_seconds,
                max_retries=settings.origination_max_retries,
            )
        except OriginationError as exc:
            # Segredo ausente: erro de configuracao sanitizado a cada uso; o modo
            # operacional nao muda para fixture ou demo (AC22).
            return _MisconfiguredOrigination(exc)
    if settings.origination_mode == "sqlite":
        try:
            return SqliteOriginationClient(settings.origination_db_path)
        except OriginationError as exc:
            # Caminho ausente ou errado: erro de configuracao a cada uso, sem cair em fixture.
            return _MisconfiguredOrigination(exc)
    return DisabledOriginationClient()


def bootstrap_admin(session_factory, settings: Settings) -> None:
    """Cria organizacao e administrador iniciais, se houver senha configurada."""
    if not settings.admin_password:
        log().warning("EVIDIA_ADMIN_PASSWORD ausente: nenhum usuário inicial foi criado.")
        return
    with session_factory() as db:
        username = settings.admin_username.strip().lower()
        if db.scalar(select(User).where(User.username == username)) is not None:
            db.rollback()
            return
        org = db.scalar(select(Organization).where(Organization.name == settings.admin_org_name))
        if org is None:
            org = Organization(name=settings.admin_org_name)
            db.add(org)
            db.flush()
        admin = User(
            organization_id=org.id,
            username=username,
            display_name="Administrador",
            password_hash=hash_password(settings.admin_password),
            role="admin",
        )
        db.add(admin)
        db.commit()
        audit(
            "user.bootstrap",
            actor="system",
            organization_id=org.id,
            target=f"user:{admin.id}",
            outcome="created",
        )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.log_dir)
    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    write_session_factory = make_session_factory(engine, write=True)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.env == "test":
            Base.metadata.create_all(engine)
        elif "alembic_version" not in sa_inspect(engine).get_table_names():
            raise RuntimeError(
                "Banco sem migracoes aplicadas. Execute: alembic upgrade head (em backend/)."
            )
        bootstrap_admin(write_session_factory, settings)
        log().info(
            f"Evidia API {__version__} iniciada | env={settings.env} "
            f"| originação={settings.origination_mode} "
            f"| nulidade360={settings.nulidade360_mode} | llm={settings.llm_mode}"
        )
        # Em teste o ciclo e chamado explicitamente; nao ha thread concorrendo com o banco.
        background = settings.worker_enabled and settings.env != "test"
        if background:
            app.state.worker.start()
        yield
        if background:
            app.state.worker.stop()
        engine.dispose()

    app = FastAPI(
        title="Evidia API operacional",
        version=__version__,
        lifespan=lifespan,
        description="Orquestração e persistência da jornada operacional. Contrato v1.",
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.write_session_factory = write_session_factory
    app.state.origination_client = build_origination_client(settings)
    app.state.nulidade360_client = build_nulidade360_client(settings)
    app.state.llm_client = build_llm_client(settings)
    app.state.diligence_connector = (
        FixtureDiligenceConnector()
        if settings.diligence_mode == "fixture"
        else DisabledDiligenceConnector()
    )
    app.state.worker = Worker(app.state)
    # Politica de colunas por papel: erro de configuracao impede a subida.
    table_service.configure_column_policy(settings.column_policy)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["content-type", "authorization", "x-evidia-request", "x-correlation-id"],
        expose_headers=["x-correlation-id"],
    )

    @app.middleware("http")
    async def correlation(request: Request, call_next):
        incoming = request.headers.get("x-correlation-id", "")
        cid = incoming if 8 <= len(incoming) <= 64 and incoming.isascii() else uuid.uuid4().hex
        token = correlation_id_var.set(cid)
        try:
            response = await call_next(request)
        finally:
            correlation_id_var.reset(token)
        response.headers["x-correlation-id"] = cid
        return response

    def _error(status: int, code: str, message: str, details=None) -> JSONResponse:
        return JSONResponse(
            status_code=status,
            content={
                "error": {"code": code, "message": message, "details": details},
                "correlation_id": correlation_id_var.get(),
            },
        )

    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError) -> JSONResponse:
        return _error(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return _error(422, "invalid_request", "Requisição inválida.", {"fields": fields})

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception) -> JSONResponse:
        log().exception(f"erro não tratado: {type(exc).__name__}")
        return _error(500, "internal_error", "Erro interno. Informe o correlation_id ao suporte.")

    @app.get("/health", response_model=HealthOut, tags=["operacao"])
    def health() -> HealthOut:
        return HealthOut(
            status="ok",
            service="evidia-api",
            version=__version__,
            mode="operational",
            origination_mode=settings.origination_mode,
            nulidade360_mode=settings.nulidade360_mode,
            llm_mode=settings.llm_mode,
        )

    app.include_router(auth.router)
    app.include_router(operations.router)
    app.include_router(tables.router)
    app.include_router(engines.router)
    app.include_router(documents.router)
    app.include_router(diligence.router)
    app.include_router(scenarios.router)
    return app


def app_factory() -> FastAPI:
    """Ponto de entrada do uvicorn: `uvicorn evidia.main:app_factory --factory`."""
    return create_app()
