"""Dependencias de requisicao: sessao de banco e usuario autenticado."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.adapters.diligence import DiligenceConnector
from evidia.adapters.nulidade360 import Nulidade360Client
from evidia.adapters.origination import OriginationClient
from evidia.config import Settings
from evidia.errors import ApiError
from evidia.llm import LLMClient
from evidia.models import AuthSession, User
from evidia.security import token_hash

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_HEADER = "x-evidia-request"


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Iterator[Session]:
    state = request.app.state
    factory = (
        state.session_factory if request.method in SAFE_METHODS else state.write_session_factory
    )
    db: Session = factory()
    try:
        yield db
    finally:
        db.close()


def get_origination(request: Request) -> OriginationClient:
    return request.app.state.origination_client


def get_diligence(request: Request) -> DiligenceConnector:
    return request.app.state.diligence_connector


def get_llm(request: Request) -> LLMClient:
    return request.app.state.llm_client


def get_nulidade360(request: Request) -> Nulidade360Client:
    return request.app.state.nulidade360_client


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def current_user(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> User:
    token: str | None = None
    via_cookie = False
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        token = header[7:].strip()
    elif cookie := request.cookies.get(settings.session_cookie_name):
        token = cookie
        via_cookie = True
    if not token:
        raise ApiError(401, "not_authenticated", "Autenticação necessária.")

    # Sessao por cookie em metodo que altera estado exige cabecalho proprio: um
    # formulario de outro site nao consegue envia-lo (protecao contra CSRF).
    if via_cookie and request.method not in SAFE_METHODS and CSRF_HEADER not in request.headers:
        raise ApiError(403, "csrf_header_required", "Cabeçalho de requisição ausente.")

    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(token)))
    now = datetime.now(UTC)
    if session is None or session.revoked_at is not None or _as_utc(session.expires_at) <= now:
        raise ApiError(401, "not_authenticated", "Sessão inválida ou expirada.")
    user = db.get(User, session.user_id)
    if user is None or not user.active:
        raise ApiError(401, "not_authenticated", "Sessão inválida ou expirada.")
    request.state.auth_session_id = session.id
    return user
