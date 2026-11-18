"""Erros de API com codigo estavel. Mensagens nunca carregam stack trace ou segredo."""

from __future__ import annotations

from typing import Any


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def not_found(what: str = "Registro", *, feminine: bool = False) -> ApiError:
    # Recurso de outra organizacao responde como inexistente: nao revela que existe.
    found = "encontrada" if feminine else "encontrado"
    return ApiError(404, "not_found", f"{what} não {found}.")


def forbidden(message: str = "Operação não permitida para o seu papel.") -> ApiError:
    return ApiError(403, "forbidden", message)
