"""Contraditorio bilateral: pedidos, cenarios e comparacao (T010)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from evidia.config import Settings
from evidia.deps import current_user, get_db, get_llm, get_settings_dep
from evidia.llm import LLMClient
from evidia.models import User
from evidia.schemas_engines import (
    PleaIn,
    PleaOut,
    ScenarioArgumentIn,
    ScenarioComparisonOut,
    ScenarioRunCreate,
    ScenarioRunOut,
)
from evidia.services import dossier, scenarios

router = APIRouter(prefix="/api/v1", tags=["contraditorio"])


@router.get("/opportunities/{opportunity_id}/pleas", response_model=list[PleaOut])
def list_pleas(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[PleaOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    return [scenarios.plea_out(p) for p in scenarios.list_pleas(db, opp.id)]


@router.post("/opportunities/{opportunity_id}/pleas", response_model=PleaOut, status_code=201)
def create_plea(
    opportunity_id: str,
    body: PleaIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> PleaOut:
    return scenarios.plea_out(scenarios.create_plea(db, user, opportunity_id, body.model_dump()))


@router.get("/opportunities/{opportunity_id}/scenario-runs", response_model=list[ScenarioRunOut])
def list_runs(
    opportunity_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ScenarioRunOut]:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    return [scenarios.run_out(db, run) for run in scenarios.list_runs(db, opp.id)]


@router.post("/pleas/{plea_id}/scenario-runs", response_model=ScenarioRunOut, status_code=201)
def create_run(
    plea_id: str,
    body: ScenarioRunCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    settings: Settings = Depends(get_settings_dep),
) -> ScenarioRunOut:
    """Cria o cenario de um participante. `manual` fica em elaboracao ate ser concluido;
    `model` usa o modelo de linguagem configurado no servidor."""
    run = scenarios.create_run(db, user, llm, settings, plea_id, body.model_dump())
    return scenarios.run_out(db, run)


@router.post("/scenario-runs/{run_id}/arguments", response_model=ScenarioRunOut, status_code=201)
def add_argument(
    run_id: str,
    body: ScenarioArgumentIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ScenarioRunOut:
    run = scenarios.add_argument(db, user, run_id, body.model_dump())
    return scenarios.run_out(db, run)


@router.delete("/scenario-arguments/{argument_id}", response_model=ScenarioRunOut)
def delete_argument(
    argument_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ScenarioRunOut:
    return scenarios.run_out(db, scenarios.delete_argument(db, user, argument_id))


@router.post("/scenario-runs/{run_id}/complete", response_model=ScenarioRunOut)
def complete_run(
    run_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ScenarioRunOut:
    return scenarios.run_out(db, scenarios.complete_run(db, user, run_id))


@router.get("/pleas/{plea_id}/comparison", response_model=ScenarioComparisonOut)
def plea_comparison(
    plea_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ScenarioComparisonOut:
    """Comparacao dos dois lados. Nao depende da posicao economica da oportunidade."""
    return scenarios.comparison(db, user, plea_id)
