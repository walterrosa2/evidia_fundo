"""Configuracao lida do ambiente (.env ignorado pelo Git).

Falta de configuracao obrigatoria gera erro explicito e sanitizado (AC22): o modo
operacional nunca cai para dados demonstrativos por conta propria.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BACKEND_DIR / ".env", override=True)
# Perfil opcional aplicado por cima do .env (ex.: qa-profile.env, para rodar os roteiros de
# teste com dados sinteticos sem editar o .env). So nomes de modo: nunca segredo.
if os.environ.get("EVIDIA_ENV_OVERLAY"):
    load_dotenv(BACKEND_DIR / os.environ["EVIDIA_ENV_OVERLAY"], override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EVIDIA_", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    api_host: str = "127.0.0.1"
    api_port: int = 8007

    database_url: str = Field(
        default=f"sqlite:///{(BACKEND_DIR / 'data' / 'evidia.db').as_posix()}"
    )
    storage_dir: Path = BACKEND_DIR / "data" / "storage"
    log_dir: Path = BACKEND_DIR / "logs"

    # Origens do navegador autorizadas; nunca "*" (cookies de sessao exigem origem explicita).
    cors_origins: str = "http://localhost:5180"

    # Administrador inicial. Sem senha definida, nenhum usuario e criado.
    admin_username: str = "admin"
    admin_password: str = ""
    admin_org_name: str = "Organizacao local"

    session_ttl_hours: int = 12
    session_cookie_name: str = "evidia_session"
    max_upload_mb: int = 200

    # Originacao: "disabled" devolve erro de configuracao; "fixture" usa dados
    # sinteticos rotulados; "http" consulta a API real (homologacao pendente — D3).
    # fixture: casos sinteticos. http: API da originacao (exige a aplicacao no ar e credencial).
    # sqlite: leitura direta e somente-leitura do banco da originacao (origination_db_path).
    origination_mode: Literal["disabled", "fixture", "http", "sqlite"] = "disabled"
    origination_db_path: str = ""
    origination_base_url: str = ""
    origination_email: str = ""
    origination_password: str = ""
    origination_timeout_seconds: float = 15.0
    origination_max_retries: int = 2

    # Nulidade360: "disabled" devolve erro de configuracao; "mock" fala com o servico
    # rodando em modo simulado (MOCK_AI), aceitando apenas .txt/.md — sem custo.
    # Execucao real (API paga) nao esta habilitada: depende de autorizacao especifica.
    # mock: motor com MOCK_AI (sem custo). live: motor real — cada execucao consome API paga
    # e depende de autorizacao de custo do usuario.
    nulidade360_mode: Literal["disabled", "mock", "live"] = "disabled"
    nulidade360_base_url: str = ""
    nulidade360_timeout_seconds: float = 30.0
    nulidade360_deadline_minutes: int = 30

    # Diligencia de vinculos: "disabled" ou "fixture" (fonte SINTETICA rotulada).
    # Fonte real depende de autorizacao, credencial e contrato (D3): nao ha conector real.
    diligence_mode: Literal["disabled", "fixture"] = "disabled"

    # Ajustes da politica de colunas por papel: JSON {"tabela.coluna": ["admin", ...]}.
    # Vazio = politica padrao (ver services/tables.py).
    column_policy: dict[str, list[str]] = Field(default_factory=dict)
    # Exige que o memorando seja aprovado por pessoa diferente de quem o emitiu.
    memo_distinct_approver: bool = False

    # Trabalhador em segundo plano (fila e reconciliacao de execucoes).
    worker_enabled: bool = True
    worker_interval_seconds: float = 5.0

    # Texto e OCR. PDF acima do limite tem o texto extraido pela fila, nao no envio.
    inline_text_max_pages: int = 200
    tesseract_cmd: str = "tesseract"
    ocr_language: str = "por"
    ocr_max_pages: int = 500
    ocr_page_timeout_seconds: float = 120.0

    # Modelo de linguagem para sugestao de afirmacoes: disabled | mock | gemini.
    # "gemini" consome API paga e so deve ser ligado com autorizacao de custo.
    llm_mode: Literal["disabled", "mock", "gemini"] = "disabled"
    llm_api_key: str = ""
    llm_model: str = "gemini-2.5-flash"
    llm_base_url: str = "https://generativelanguage.googleapis.com"
    llm_timeout_seconds: float = 60.0
    llm_max_retries: int = 3
    llm_max_pages_per_call: int = 20
    llm_max_chars_per_call: int = 120000

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
