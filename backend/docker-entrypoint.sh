#!/bin/sh
# Aplica as migracoes e sobe a API. Falha de migracao interrompe: a API nao sobe sobre
# um banco em versao desconhecida.
set -e
python -m alembic upgrade head
exec python -m uvicorn evidia.main:app_factory --factory \
    --host "${EVIDIA_API_HOST:-0.0.0.0}" --port "${EVIDIA_API_PORT:-8007}"
