"""Migracao aditiva, inicializacao e restauracao em copia (T004, P10)."""

import sqlite3

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect

from evidia.config import BACKEND_DIR, Settings
from evidia.db import Base
from evidia.main import create_app
from evidia.ops import backup_database, table_counts
from tests.conftest import make_pdf, upload


def alembic_upgrade(url: str) -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.cmd_opts = type("Opts", (), {"x": [f"url={url}"]})()
    command.upgrade(cfg, "head")


def test_migracao_cria_o_mesmo_esquema_que_os_modelos(tmp_path):
    url = f"sqlite:///{(tmp_path / 'migrado.db').as_posix()}"
    alembic_upgrade(url)
    engine = create_engine(url)
    migrated = inspect(engine)
    tables = set(migrated.get_table_names()) - {"alembic_version"}
    assert tables == set(Base.metadata.tables)
    for name, table in Base.metadata.tables.items():
        assert {c["name"] for c in migrated.get_columns(name)} == {c.name for c in table.columns}
    engine.dispose()


def test_servico_recusa_iniciar_sem_migracoes_aplicadas(tmp_path):
    settings = Settings(
        env="development",
        database_url=f"sqlite:///{(tmp_path / 'vazio.db').as_posix()}",
        storage_dir=tmp_path / "s",
        log_dir=tmp_path / "l",
        admin_password="",
    )
    with pytest.raises(RuntimeError, match="alembic upgrade head"):
        with TestClient(create_app(settings)):
            pass


def test_smoke_inicializa_migrado_cria_admin_e_autentica(tmp_path):
    url = f"sqlite:///{(tmp_path / 'smoke.db').as_posix()}"
    alembic_upgrade(url)
    settings = Settings(
        env="development",
        database_url=url,
        storage_dir=tmp_path / "s",
        log_dir=tmp_path / "l",
        admin_username="Admin",
        admin_password="senha-admin-sintetica",
        origination_mode="disabled",
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/health").json()["status"] == "ok"
        login = client.post(
            "/api/v1/auth/login", json={"username": "admin", "password": "senha-admin-sintetica"}
        )
        assert login.status_code == 200
        assert login.json()["role"] == "admin"
        # Operacao vazia e honesta: nenhuma oportunidade demonstrativa aparece.
        assert client.get("/api/v1/opportunities").json() == []
    # Reiniciar nao duplica o administrador.
    with TestClient(create_app(settings)):
        pass
    assert sqlite3.connect(tmp_path / "smoke.db").execute(
        "SELECT COUNT(*) FROM users"
    ).fetchone() == (1,)


def test_sem_senha_de_admin_nenhum_usuario_e_criado(tmp_path):
    url = f"sqlite:///{(tmp_path / 'semadmin.db').as_posix()}"
    alembic_upgrade(url)
    settings = Settings(
        env="development",
        database_url=url,
        storage_dir=tmp_path / "s",
        log_dir=tmp_path / "l",
        admin_password="",
    )
    with TestClient(create_app(settings)):
        pass
    assert sqlite3.connect(tmp_path / "semadmin.db").execute(
        "SELECT COUNT(*) FROM users"
    ).fetchone() == (0,)


def test_backup_restaurado_em_copia_preserva_contagens(settings, analyst, opportunity, tmp_path):
    upload(analyst, opportunity["opportunity_id"], make_pdf(pages=2))
    source = tmp_path / "test.db"
    copy = backup_database(source, tmp_path / "backups" / "copia.db")
    original = table_counts(source)
    restored = table_counts(copy)
    assert restored == original
    assert restored["opportunities"] == 1
    assert restored["document_versions"] == 1
    assert restored["origin_snapshots"] == 1
