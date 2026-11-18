"""Verificacao ponta a ponta contra os servicos em execucao (API + frontend).

Uso (em backend/):  python scripts/smoke_e2e.py [--frontend http://localhost:5180]

Percorre a jornada entrada -> snapshot -> dossie -> revisao -> demonstrativos usando a
fixture SINTETICA da originacao (exige EVIDIA_ORIGINATION_MODE=fixture; use o perfil de
testes: EVIDIA_ENV_OVERLAY=qa-profile.env antes de subir a API). Cria registros
sinteticos rotulados no banco local. Nao imprime senha, token ou conteudo de documento.
"""

from __future__ import annotations

import argparse
import sys
import uuid

import httpx

from evidia.config import get_settings


def make_pdf(pages: int, text: str) -> bytes:
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>"]
    kids = " ".join(f"{3 + i * 2} 0 R" for i in range(pages))
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {pages} >>".encode())
    for i in range(pages):
        objects.append(
            (
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] "
                f"/Contents {4 + i * 2} 0 R /Resources << /Font << /F1 "
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>"
            ).encode()
        )
        stream = f"BT /F1 12 Tf 20 150 Td ({text} p{i + 1}) Tj ET".encode()
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


class Check:
    def __init__(self) -> None:
        self.failures = 0

    def __call__(self, label: str, condition: bool, detail: str = "") -> None:
        mark = "OK  " if condition else "FAIL"
        print(f"[{mark}] {label}" + (f" — {detail}" if detail and not condition else ""))
        if not condition:
            self.failures += 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend", default="http://localhost:5180")
    args = parser.parse_args()

    settings = get_settings()
    api = f"http://localhost:{settings.api_port}"
    origin = args.frontend
    check = Check()
    run = uuid.uuid4().hex[:8]

    with httpx.Client(base_url=api, timeout=20, headers={"x-evidia-request": "1"}) as c:
        health = c.get("/health")
        check("API responde ao healthcheck em modo operacional", health.status_code == 200)
        check("originacao em modo fixture", health.json().get("origination_mode") == "fixture")

        check("rota protegida exige sessao", c.get("/api/v1/opportunities").status_code == 401)

        preflight = c.options(
            "/api/v1/origination/imports",
            headers={
                "origin": origin,
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type,x-evidia-request",
            },
        )
        check(
            "CORS autoriza a origem do frontend com credenciais",
            preflight.headers.get("access-control-allow-origin") == origin
            and preflight.headers.get("access-control-allow-credentials") == "true",
            str(dict(preflight.headers)),
        )
        foreign = c.options(
            "/api/v1/origination/imports",
            headers={
                "origin": "http://outra-origem.invalid",
                "access-control-request-method": "POST",
            },
        )
        check(
            "CORS recusa origem desconhecida",
            "access-control-allow-origin" not in foreign.headers,
        )

        login = c.post(
            "/api/v1/auth/login",
            json={"username": settings.admin_username, "password": settings.admin_password},
            headers={"origin": origin},
        )
        check("login do administrador configurado", login.status_code == 200, login.text[:200])
        if login.status_code != 200:
            return 1
        cookie = login.headers.get("set-cookie", "").lower()
        check(
            "cookie de sessao HttpOnly + SameSite=Strict",
            "httponly" in cookie and "strict" in cookie,
        )

        candidates = c.get("/api/v1/origination/candidates").json()
        check("candidatos vem marcados como sinteticos", candidates["is_synthetic"] is True)

        body = {
            "external_id": "caso:2",
            "position_side": "defendant",
            "represented_party": "Ré Sintética Delta S.A.",
        }
        first = c.post("/api/v1/origination/imports", json=body).json()
        second = c.post("/api/v1/origination/imports", json=body).json()
        check(
            "reimportacao devolve a mesma oportunidade",
            first["opportunity_id"] == second["opportunity_id"] and second["outcome"] == "reused",
        )
        oid = first["opportunity_id"]

        detail = c.get(f"/api/v1/opportunities/{oid}").json()
        check("oportunidade rotulada como sintetica", detail["is_synthetic"] is True)
        check("contrato permanece nao definido", detail["contract_status"] == "not_defined")
        check(
            "sem autos: parecer integral bloqueado e lacuna visivel",
            detail["integral_opinion_allowed"] is False and detail["open_gaps_count"] >= 1,
        )

        pdf_v1 = make_pdf(3, f"laudo sintetico {run} v1")
        up1 = c.post(
            f"/api/v1/opportunities/{oid}/documents",
            files={"file": ("laudo.pdf", pdf_v1, "application/pdf")},
            data={"title": f"Laudo sintetico {run}", "doc_type": "laudo_pericial"},
        ).json()
        check("upload guarda hash e contagem real de paginas", up1["version"]["page_count"] == 3)
        dup = c.post(
            f"/api/v1/opportunities/{oid}/documents",
            files={"file": ("copia.pdf", pdf_v1, "application/pdf")},
        ).json()
        check("arquivo identico nao cria segunda fonte", dup["duplicate"] is True)
        bad = c.post(
            f"/api/v1/opportunities/{oid}/documents",
            files={"file": ("ruim.pdf", b"nao e pdf", "application/pdf")},
        )
        check(
            "PDF corrompido e recusado",
            bad.status_code == 422 and bad.json()["error"]["code"] == "document_corrupted",
        )

        claim = c.post(
            f"/api/v1/opportunities/{oid}/claims",
            json={
                "text": f"A re alegou entrega no prazo (sintetico {run}).",
                "nature": "attributed_allegation",
                "asserted_by": "Ré",
                "document_version_id": up1["version"]["id"],
                "page_start": 2,
            },
        ).json()
        bare = c.post(
            f"/api/v1/opportunities/{oid}/claims",
            json={
                "text": f"Alegacao sem citacao (sintetico {run}).",
                "nature": "attributed_allegation",
            },
        ).json()
        blocked = c.post(f"/api/v1/claims/{bare['id']}/reviews", json={"review_state": "validated"})
        check("afirmacao sem citacao nao pode ser validada", blocked.status_code == 409)
        ok = c.post(
            f"/api/v1/claims/{claim['id']}/reviews",
            json={"review_state": "validated", "comment": "Conferido na pagina 2."},
        )
        check(
            "afirmacao com citacao e validada e continua alegacao",
            ok.status_code == 200
            and ok.json()["review_state"] == "validated"
            and ok.json()["nature"] == "attributed_allegation",
        )

        calc = c.post(
            f"/api/v1/opportunities/{oid}/calculations",
            json={
                "claimant": {
                    "assumptions": {"base_date": "2026-11-16"},
                    "scenarios": [{"id": "c", "label": "Procedencia", "gross_receipt": "500000"}],
                },
                "defendant": {
                    "assumptions": {"base_date": "2026-11-16"},
                    "reference_exposure": "1000000",
                    "scenarios": [
                        {
                            "id": "d",
                            "label": "Acordo",
                            "disbursement": "700000",
                            "incremental_costs": [
                                {"label": "Custo incremental", "amount": "50000"}
                            ],
                        }
                    ],
                },
            },
        ).json()
        row = calc["result"]["defendant"]["scenarios"][0]
        check(
            "reu: reducao bruta 300.000 e liquida 250.000",
            row["gross_reduction"] == "300000.00" and row["net_reduction"] == "250000.00",
        )
        check(
            "sem contrato: retorno nulo e nenhuma receita da Evidia",
            calc["result"]["claimant"]["contract"]["investor_return"]["value"] is None
            and calc["result"]["defendant"]["evidia_revenue"]["value"] is None,
        )

        up2 = c.post(
            f"/api/v1/opportunities/{oid}/documents",
            files={
                "file": (
                    "laudo-v2.pdf",
                    make_pdf(4, f"laudo sintetico {run} v2"),
                    "application/pdf",
                )
            },
            data={"document_id": up1["document"]["id"]},
        ).json()
        check("nova versao recebida como v2", up2["version"]["version_no"] == 2)
        claims = c.get(f"/api/v1/opportunities/{oid}/claims").json()
        stale = next(x for x in claims if x["id"] == claim["id"])
        check(
            "analise antiga permanece consultavel e sinalizada como desatualizada",
            stale["stale"] is True and stale["review_state"] == "validated",
        )
        runs = c.get(f"/api/v1/opportunities/{oid}/calculations").json()
        check("calculo anterior marcado como desatualizado", runs[-1]["stale"] is True)
        old = c.get(f"/api/v1/document-versions/{up1['version']['id']}/content")
        check("versao anterior do documento continua acessivel", old.content == pdf_v1)

        check("logout revoga a sessao", c.post("/api/v1/auth/logout").status_code == 204)
        check(
            "sessao revogada perde acesso", c.get(f"/api/v1/opportunities/{oid}").status_code == 401
        )

    with httpx.Client(base_url=origin, timeout=60, follow_redirects=True) as f:
        for path in ("/operacao", "/operacao/login", "/operacao/entrada", f"/operacao/{oid}"):
            resp = f.get(path)
            check(f"frontend renderiza {path.replace(oid, '<id>')}", resp.status_code == 200)
        login_html = f.get("/operacao/login").text
        check("tela de login operacional identificada", "Acesso à Operação" in login_html)
        demo = f.get("/pipeline")
        check("demonstracao continua acessivel", demo.status_code == 200)

    print(f"\n{'APROVADO' if check.failures == 0 else 'REPROVADO'} — falhas: {check.failures}")
    return 0 if check.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
