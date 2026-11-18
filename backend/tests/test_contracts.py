"""Contratos versionados (T003): o que esta em specs/.../contracts acompanha o codigo."""

import json

from scripts.export_contracts import build_documents, render


def test_contratos_exportados_estao_em_dia_com_o_codigo():
    stale = []
    for path, document in build_documents().items():
        if not path.is_file() or path.read_text(encoding="utf-8") != render(document):
            stale.append(path.name)
    assert stale == [], f"Rode scripts/export_contracts.py; defasados: {stale}"


def test_toda_rota_operacional_declara_envelope_de_erro_versionado():
    openapi = next(d for p, d in build_documents().items() if p.name == "openapi.json")
    paths = openapi["paths"]
    assert all(p == "/health" or p.startswith("/api/v1/") for p in paths)
    assert "ErrorResponse" not in paths  # envelope e schema, nao rota
    # Nenhuma rota aceita corpo generico: todo POST/PATCH com JSON referencia um schema nomeado.
    for path, operations in paths.items():
        for method, operation in operations.items():
            body = operation.get("requestBody", {}).get("content", {}).get("application/json")
            if body:
                assert "$ref" in body["schema"], f"{method.upper()} {path} sem schema nomeado"


def test_fixture_e_snapshot_sinteticos_se_declaram_como_tal():
    documents = {p.name: d for p, d in build_documents().items()}
    assert "SINTETICOS" in documents["originacao_sintetica.json"]["_aviso"]
    snapshot = documents["snapshot_sintetico.json"]
    assert snapshot["is_synthetic"] is True
    assert snapshot["schema_version"] == "snapshot-1"
    text = json.dumps(documents["originacao_sintetica.json"], ensure_ascii=False)
    assert "Sintétic" in text or "Sintetic" in text
