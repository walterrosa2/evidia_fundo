"""Exporta os contratos versionados para specs/001-evidia-operacional/contracts/.

Uso (em backend/):  python scripts/export_contracts.py

- openapi.json: contrato v1 da API, gerado dos modelos Pydantic.
- fixtures/originacao_sintetica.json: respostas SINTETICAS no formato da originacao.
- fixtures/snapshot_sintetico.json: snapshot normalizado correspondente.
- schemas/*.json: JSON Schema dos contratos de motor e contraditorio, ainda sem rota.
- fixtures/motores_sinteticos.json: exemplos SINTETICOS desses contratos.

O teste tests/test_contracts.py falha se estes arquivos ficarem defasados do codigo.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from evidia.adapters.origination import FixtureOriginationClient, normalize_snapshot
from evidia.config import BACKEND_DIR, Settings
from evidia.fixtures.engines import build_examples
from evidia.fixtures.origination import build_fixture
from evidia.main import create_app
from evidia.schemas_engines import (
    EngineRunOut,
    FindingOut,
    ScenarioComparisonOut,
    ScenarioRunOut,
)

CONTRACTS_DIR = BACKEND_DIR.parent / "specs" / "001-evidia-operacional" / "contracts"


def build_openapi() -> dict[str, Any]:
    settings = Settings(
        env="test",
        database_url="sqlite:///:memory:",
        admin_password="",
        origination_mode="disabled",
    )
    return create_app(settings).openapi()


ENGINE_SCHEMAS = {
    "engine_run": EngineRunOut,
    "finding": FindingOut,
    "scenario_run": ScenarioRunOut,
    "scenario_comparison": ScenarioComparisonOut,
}


def build_documents() -> dict[Path, Any]:
    return {
        **{
            CONTRACTS_DIR / "schemas" / f"{name}.json": model.model_json_schema()
            for name, model in ENGINE_SCHEMAS.items()
        },
        CONTRACTS_DIR / "fixtures" / "motores_sinteticos.json": build_examples(),
        CONTRACTS_DIR / "openapi.json": build_openapi(),
        CONTRACTS_DIR / "fixtures" / "originacao_sintetica.json": build_fixture(),
        CONTRACTS_DIR / "fixtures" / "snapshot_sintetico.json": normalize_snapshot(
            FixtureOriginationClient().fetch("caso:1")
        ),
    }


def render(document: Any) -> str:
    return json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    for path, document in build_documents().items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render(document), encoding="utf-8", newline="\n")
        print(f"escrito: {path.relative_to(BACKEND_DIR.parent)}")


if __name__ == "__main__":
    main()
