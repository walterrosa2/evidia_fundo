"""Infraestrutura de teste. Todos os dados sao sinteticos."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from evidia.config import Settings
from evidia.main import create_app
from evidia.models import Organization, User
from evidia.security import hash_password

PASSWORD = "senha-de-teste-sintetica"


def make_pdf(pages: int = 1, text: str | None = "Texto sintetico de teste") -> bytes:
    """PDF minimo e valido. Sem texto, simula documento digitalizado."""
    objects: list[bytes] = []
    kids = " ".join(f"{3 + i * 2} 0 R" for i in range(pages))
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {pages} >>".encode())
    for i in range(pages):
        content_ref = 4 + i * 2
        objects.append(
            (
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] "
                f"/Contents {content_ref} 0 R /Resources << /Font << /F1 "
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>"
            ).encode()
        )
        stream = f"BT /F1 12 Tf 20 150 Td ({text} p{i + 1}) Tj ET".encode() if text else b""
        objects.append(
            b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"
        )
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode() + b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)


@dataclass
class Actor:
    client: TestClient
    user_id: str
    organization_id: str
    username: str

    def headers(self) -> dict[str, str]:
        return {"x-evidia-request": "1"}


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        env="test",
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        storage_dir=tmp_path / "storage",
        log_dir=tmp_path / "logs",
        admin_password="",
        origination_mode="fixture",
        max_upload_mb=5,
    )


@pytest.fixture
def app(settings):
    application = create_app(settings)
    with TestClient(application):
        yield application


def _login(app, org_name: str, username: str, role: str) -> Actor:
    with app.state.write_session_factory() as db:
        org = db.query(Organization).filter_by(name=org_name).one_or_none()
        if org is None:
            org = Organization(name=org_name)
            db.add(org)
            db.flush()
        user = User(
            organization_id=org.id,
            username=username,
            display_name=username,
            password_hash=hash_password(PASSWORD),
            role=role,
        )
        db.add(user)
        db.commit()
        user_id, org_id = user.id, org.id
    client = TestClient(app)
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": PASSWORD})
    assert resp.status_code == 200, resp.text
    client.headers.update({"x-evidia-request": "1"})
    return Actor(client, user_id, org_id, username)


@pytest.fixture
def actor_factory(app):
    def factory(org_name: str, username: str, role: str = "analyst") -> Actor:
        return _login(app, org_name, username, role)

    return factory


@pytest.fixture
def analyst(actor_factory) -> Actor:
    return actor_factory("Org A", "analista.a", "analyst")


@pytest.fixture
def reviewer(actor_factory) -> Actor:
    return actor_factory("Org A", "revisor.a", "reviewer")


@pytest.fixture
def outsider(actor_factory) -> Actor:
    return actor_factory("Org B", "analista.b", "admin")


@pytest.fixture
def opportunity(analyst) -> Iterator[dict]:
    resp = analyst.client.post(
        "/api/v1/origination/imports",
        json={
            "external_id": "caso:1",
            "position_side": "claimant",
            "represented_party": "Autora Sintética Alfa Ltda.",
        },
    )
    assert resp.status_code == 200, resp.text
    yield resp.json()


def upload(actor: Actor, opportunity_id: str, content: bytes, filename="peca.pdf", **form):
    return actor.client.post(
        f"/api/v1/opportunities/{opportunity_id}/documents",
        files={"file": (filename, content, "application/octet-stream")},
        data=form,
    )
