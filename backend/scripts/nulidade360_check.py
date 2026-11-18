"""Verificacao do adaptador contra o Nulidade360 em MODO SIMULADO (sem custo).

Uso (em backend/):  python scripts/nulidade360_check.py

Pre-requisitos:
- API da Evidia no ar com EVIDIA_NULIDADE360_MODE=mock e EVIDIA_ORIGINATION_MODE=fixture
  (perfil de testes: EVIDIA_ENV_OVERLAY=qa-profile.env antes de subir a API);
- Nulidade360 no ar com MOCK_AI=true (ver docs/desenvolvimento/NULIDADE360_LOCAL.md).

Envia apenas um arquivo .txt SINTETICO. Em modo simulado o motor nao chama o provedor de
IA para texto; PDF nunca e enviado por este roteiro. Nao imprime senha nem token.
"""

from __future__ import annotations

import sys
import time
import uuid

import httpx

from evidia.config import get_settings

sys.path.insert(0, ".")
from scripts.smoke_e2e import Check  # noqa: E402


def main() -> int:
    settings = get_settings()
    api = f"http://localhost:{settings.api_port}"
    check = Check()
    tag = uuid.uuid4().hex[:8]

    with httpx.Client(base_url=api, timeout=40, headers={"x-evidia-request": "1"}) as c:
        login = c.post(
            "/api/v1/auth/login",
            json={"username": settings.admin_username, "password": settings.admin_password},
        )
        if login.status_code != 200:
            print("[FAIL] login do administrador configurado")
            return 1

        opp = c.post(
            "/api/v1/origination/imports",
            json={
                "external_id": "caso:1",
                "position_side": "defendant",
                "represented_party": "Ré Sintética Beta S.A.",
            },
        ).json()["opportunity_id"]

        text = f"LAUDO PERICIAL SINTÉTICO {tag}\nDocumento de teste. Nenhum dado real.\n"
        doc = c.post(
            f"/api/v1/opportunities/{opp}/documents",
            files={"file": (f"laudo-sintetico-{tag}.txt", text.encode(), "text/plain")},
            data={"title": f"Laudo sintético {tag}", "doc_type": "laudo_pericial"},
        ).json()
        version_id = doc["version"]["id"]

        body = {"engine": "nulidade360", "document_version_id": version_id}
        missing_side = c.post(f"/api/v1/opportunities/{opp}/engine-runs", json=body)
        check("pedido sem lado simulado e recusado", missing_side.status_code == 422)

        started = c.post(
            f"/api/v1/opportunities/{opp}/engine-runs",
            json={**body, "simulated_side": "defendant"},
        )
        if started.status_code == 503:
            code = started.json()["error"]["code"]
            print(f"[FAIL] motor indisponivel ou integracao desligada ({code})")
            return 1
        check("execucao criada e em andamento", started.status_code == 201, started.text[:300])
        run = started.json()
        check(
            "lado, documento, hash e versoes do motor registrados",
            run["simulated_side"] == "defendant"
            and run["document_version_ids"] == [version_id]
            and len(run["input_hash"]) == 64
            and bool(run["checklist_version"])
            and bool(run["external_ref"]),
            str({k: run[k] for k in ("checklist_version", "engine_version", "model")}),
        )

        again = c.post(
            f"/api/v1/opportunities/{opp}/engine-runs",
            json={**body, "simulated_side": "defendant"},
        )
        check(
            "repetir o pedido reaproveita a execucao (sem novo envio)",
            again.status_code == 200 and again.json()["id"] == run["id"],
        )

        for _ in range(30):
            run = c.post(f"/api/v1/engine-runs/{run['id']}/refresh").json()
            if run["status"] not in ("queued", "running"):
                break
            time.sleep(1)
        check("execucao concluida pelo motor", run["status"] == "completed", run["status"])
        check(
            "motor declarou modo simulado e a execucao esta marcada como simulada",
            run["is_mock"] is True and any("modo simulado" in t for t in run["limitations"]),
            str(run["limitations"]),
        )
        check(
            "nenhum alerta de possivel consumo de API paga",
            not any("consumo de API paga" in t for t in run["limitations"]),
        )
        check(
            "blocos da auditoria preservados, todos concluidos",
            len(run["blocks"]) >= 1 and all(b["status"] == "completed" for b in run["blocks"]),
            f"{len(run['blocks'])} blocos",
        )
        check("custo desconhecido permanece nulo", run["cost_amount"] is None)

        findings = c.get(f"/api/v1/engine-runs/{run['id']}/findings").json()
        check(
            "achados normalizados", len(findings) == run["findings_count"] > 0, str(len(findings))
        )
        check(
            "achado sem citacao resolvivel fica pendente e nao validado (AC05)",
            all(
                (f["citations"] or any(p["code"] == "evidence_pending" for p in f["pendencies"]))
                and f["review_state"] == "pending"
                for f in findings
            ),
        )
        check(
            "saida original do motor preservada em cada achado",
            all("question" in f["original"] and "human_status" in f["original"] for f in findings),
        )

        calls_before = run["findings_count"]
        run = c.post(f"/api/v1/engine-runs/{run['id']}/refresh").json()
        check(
            "reconciliar de novo nao duplica achados (AC20)", run["findings_count"] == calls_before
        )

        # Relatorio .docx: o motor so o monta com achados aceitos nele; as duas respostas valem.
        report = c.get(f"/api/v1/engine-runs/{run['id']}/report")
        unavailable = (
            report.status_code == 409
            and report.json()["error"]["code"] == "nulidade360_report_unavailable"
        )
        check(
            "relatorio do motor: baixado como .docx ou ausencia explicada (sem achado aceito)",
            unavailable or (report.status_code == 200 and report.content[:2] == b"PK"),
            f"{report.status_code}",
        )

        # Mapa de evidencias: planilha SINTETICA no formato que o motor le (sem IA).
        def sheet(title: str, columns: list[str], rows: int) -> bytes:
            import io

            from openpyxl import Workbook

            wb = Workbook()
            wb.active.title = title
            wb.active.append(columns)
            for n in range(rows):
                wb.active.append([f"valor sintetico {n}"] * len(columns))
            buffer = io.BytesIO()
            wb.save(buffer)
            return buffer.getvalue()

        columns = [
            "Tipo de Evidência",
            "Trecho",
            "Conteúdo",
            "Resumo",
            "Referência",
            "Run ID",
            "Arquivo Origem",
            "Data Processamento",
        ]
        xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        def send(name: str, content: bytes, title: str) -> str:
            out = c.post(
                f"/api/v1/opportunities/{opp}/documents",
                files={"file": (name, content, "text/plain" if name.endswith(".txt") else xlsx)},
                data={"title": title},
            )
            return out.json()["version"]["id"]

        good_map = send(f"mapa-{tag}.xlsx", sheet("Sheet1", columns, 3), f"Mapa sintético {tag}")
        bad_map = send(f"outra-{tag}.xlsx", sheet("Outra", ["a", "b"], 1), f"Planilha {tag}")
        text_b = send(
            f"laudo-b-{tag}.txt", f"SEGUNDO LAUDO SINTÉTICO {tag}".encode(), f"Laudo B {tag}"
        )
        text_c = send(
            f"laudo-c-{tag}.txt", f"TERCEIRO LAUDO SINTÉTICO {tag}".encode(), f"Laudo C {tag}"
        )

        def start_with(version: str, evidence: str):
            return c.post(
                f"/api/v1/opportunities/{opp}/engine-runs",
                json={
                    "engine": "nulidade360",
                    "document_version_id": version,
                    "simulated_side": "defendant",
                    "evidence_map_version_id": evidence,
                },
            )

        with_map = start_with(text_b, good_map)
        check(
            "mapa de evidencias aceito pelo motor e registrado na execucao",
            with_map.status_code == 201
            and (with_map.json().get("evidence_map") or {}).get("total_items") == 3,
            with_map.text[:300],
        )
        rejected = start_with(text_c, bad_map)
        check(
            "planilha fora do formato e recusada pelo motor e a analise nao prossegue",
            rejected.status_code == 422
            and rejected.json()["error"]["code"] == "nulidade360_evidence_map_rejected",
            rejected.text[:300],
        )

        print(
            f"\nexecucao {run['id']} | blocos={len(run['blocks'])} achados={len(findings)} "
            f"indice={run['overall_risk_index']} (indice de risco de TESTE, modo simulado)"
        )

    print(f"\n{'APROVADO' if check.failures == 0 else 'REPROVADO'} — falhas: {check.failures}")
    return 0 if check.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
