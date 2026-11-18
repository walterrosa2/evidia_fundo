"""Tabela comum: consulta, exportacao e visoes salvas (T015)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from evidia.deps import current_user, get_db
from evidia.domain.csvsafe import render_csv
from evidia.errors import ApiError, not_found
from evidia.logging_setup import audit
from evidia.models import TableView, User, utcnow
from evidia.schemas import (
    TableExportRequest,
    TableQuery,
    TableQueryOut,
    TableViewConfig,
    TableViewOut,
    TableViewSave,
)
from evidia.services import tables

router = APIRouter(prefix="/api/v1", tags=["tabelas"])


def _parse_query(raw: str | None) -> TableQuery:
    if not raw:
        return TableQuery()
    try:
        return TableQuery.model_validate_json(raw)
    except ValidationError as exc:
        fields = [
            {"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()
        ]
        raise ApiError(
            422, "invalid_request", "Consulta de tabela inválida.", {"fields": fields}
        ) from exc


@router.get("/tables/{table_key}/rows", response_model=TableQueryOut)
def query_table(
    table_key: str,
    q: str | None = Query(default=None, max_length=20000, description="TableQuery em JSON"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> TableQueryOut:
    return tables.run_query(db, user, table_key, _parse_query(q))


@router.post(
    "/tables/{table_key}/export",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}, "description": "CSV (UTF-8, separador ;)"}},
)
def export_table(
    table_key: str,
    body: TableExportRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> Response:
    rows, count = tables.export_rows(db, user, table_key, body.query, body.columns, body.ids)
    db.rollback()
    audit(
        "table.export",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"table:{table_key}",
        outcome="ok",
        data={"rows": count, "columns": len(rows[0]), "selection": body.ids is not None},
    )
    return Response(
        content=render_csv(rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{table_key}.csv"',
            "Cache-Control": "no-store",
        },
    )


def _view_out(view: TableView, user: User) -> TableViewOut:
    table = tables.get_table(view.table_key)
    config = tables.sanitize_view(table, user, TableViewConfig.model_validate(view.config))
    return TableViewOut(
        id=view.id,
        table=view.table_key,
        name=view.name,
        config=config,
        is_default=view.is_default,
        updated_at=view.updated_at,
    )


def _own_views(db: Session, user: User, table_key: str):
    # Visao e pessoal: a consulta parte sempre do usuario da sessao.
    return select(TableView).where(TableView.user_id == user.id, TableView.table_key == table_key)


@router.get("/tables/{table_key}/views", response_model=list[TableViewOut])
def list_views(
    table_key: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[TableViewOut]:
    tables.get_table(table_key)
    views = db.scalars(_own_views(db, user, table_key).order_by(TableView.name)).all()
    return [_view_out(v, user) for v in views]


@router.post("/tables/{table_key}/views", response_model=TableViewOut)
def save_view(
    table_key: str,
    body: TableViewSave,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> TableViewOut:
    table = tables.get_table(table_key)
    name = body.name.strip()
    if not name:
        raise ApiError(422, "invalid_request", "Informe um nome para a visão.")
    config = tables.sanitize_view(table, user, body.config).model_dump(mode="json")
    view = db.scalar(_own_views(db, user, table_key).where(TableView.name == name))
    if view is None:
        view = TableView(
            organization_id=user.organization_id,
            user_id=user.id,
            table_key=table_key,
            name=name,
            config=config,
        )
        db.add(view)
        db.flush()
    else:
        view.config = config
        view.updated_at = utcnow()
    if body.is_default:
        db.execute(
            update(TableView)
            .where(
                TableView.user_id == user.id,
                TableView.table_key == table_key,
                TableView.id != view.id,
            )
            .values(is_default=False)
        )
    view.is_default = body.is_default
    db.commit()
    return _view_out(view, user)


@router.delete("/table-views/{view_id}", status_code=204)
def delete_view(
    view_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    view = db.scalar(select(TableView).where(TableView.id == view_id, TableView.user_id == user.id))
    if view is None:
        raise not_found("Visão", feminine=True)
    db.delete(view)
    db.commit()
    return Response(status_code=204)
