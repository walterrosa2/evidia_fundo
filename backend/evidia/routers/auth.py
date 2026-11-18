"""Autenticacao local (ADR-003). Provedor de identidade definitivo depende de D5."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.config import Settings
from evidia.deps import current_user, get_db, get_settings_dep
from evidia.errors import ApiError
from evidia.logging_setup import audit
from evidia.models import AuthSession, Organization, User
from evidia.schemas import LoginRequest, UserOut
from evidia.security import new_session_token, token_hash, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def user_out(db: Session, user: User) -> UserOut:
    org = db.get(Organization, user.organization_id)
    return UserOut(
        id=user.id,
        username=user.username,
        display_name=user.display_name or user.username,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=org.name if org else "",
    )


@router.post("/login", response_model=UserOut)
def login(
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> UserOut:
    username = body.username.strip().lower()
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not user.active or not verify_password(body.password, user.password_hash):
        db.rollback()
        audit("auth.login", actor="anonymous", target="session", outcome="denied")
        raise ApiError(401, "invalid_credentials", "Usuário ou senha inválidos.")

    token = new_session_token()
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=token_hash(token),
            expires_at=datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours),
        )
    )
    db.commit()
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        samesite="strict",
        secure=settings.env == "production",
        path="/",
    )
    audit(
        "auth.login",
        actor=user.id,
        organization_id=user.organization_id,
        target="session",
        outcome="granted",
    )
    return user_out(db, user)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> Response:
    session = db.get(AuthSession, request.state.auth_session_id)
    if session is not None:
        session.revoked_at = datetime.now(UTC)
    db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.status_code = 204
    audit(
        "auth.logout",
        actor=user.id,
        organization_id=user.organization_id,
        target="session",
        outcome="revoked",
    )
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)) -> UserOut:
    return user_out(db, user)
