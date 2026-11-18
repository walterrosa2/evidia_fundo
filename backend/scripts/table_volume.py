"""Mede a tabela comum com volume alto (T015, D6). So dados sinteticos, em banco temporario.

A tabela comum resolve filtro, ordenacao e paginacao no servidor, sobre as linhas que o banco
devolve para a organizacao (ou para o dossie). Este script mede quanto isso custa com N
registros, para que a capacidade seja declarada com numero e nao presumida.

    python scripts/table_volume.py            # 1.000, 10.000 e 50.000 afirmacoes
    python scripts/table_volume.py 100000     # um volume especifico
"""

from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from evidia.models import Base, Claim, Opportunity, Organization, Process, User
from evidia.schemas import ColumnFilter, SortSpec, TableQuery
from evidia.services import tables

NATURES = (
    "documentary_finding",
    "attributed_allegation",
    "analytical_inference",
    "human_conclusion",
)
STATES = ("pending", "in_review", "validated", "discarded")
# Limite de conforto para uma resposta de tabela: acima disso a tela parece travada.
BUDGET_SECONDS = 2.0


def build(session: Session, count: int) -> tuple[User, Opportunity]:
    org = Organization(name="Organizacao sintetica de volume")
    session.add(org)
    session.flush()
    user = User(organization_id=org.id, username="volume", password_hash="-", role="analyst")
    process = Process(organization_id=org.id, cnj="0000001-01.2024.8.26.0100")
    session.add_all([user, process])
    session.flush()
    opp = Opportunity(
        organization_id=org.id,
        process_id=process.id,
        position_side="claimant",
        origin_system="volume",
        origin_external_id="volume:1",
        is_synthetic=True,
        created_by=user.id,
    )
    session.add(opp)
    session.flush()
    session.bulk_save_objects(
        [
            Claim(
                organization_id=org.id,
                opportunity_id=opp.id,
                text=f"Afirmacao sintetica numero {n} sobre o atraso {n % 97}.",
                nature=NATURES[n % len(NATURES)],
                asserted_by=f"Parte {n % 13}",
                review_state=STATES[n % len(STATES)],
                page_start=(n % 400) + 1,
                created_by=user.id,
            )
            for n in range(count)
        ]
    )
    session.commit()
    return user, opp


def timed(label: str, fn) -> tuple[str, float, int]:
    start = time.perf_counter()
    out = fn()
    return label, time.perf_counter() - start, out.total


def measure(count: int) -> bool:
    with tempfile.TemporaryDirectory() as tmp:
        engine = create_engine(f"sqlite:///{(Path(tmp) / 'volume.db').as_posix()}")
        Base.metadata.create_all(engine)
        with Session(engine) as session:
            user, opp = build(session, count)
            scope = opp.id

            def run(**spec):
                return tables.run_query(session, user, "claims", TableQuery(scope_id=scope, **spec))

            results = [
                timed("primeira pagina, sem filtro", lambda: run()),
                timed(
                    "filtro de texto + ordenacao",
                    lambda: run(
                        filters=[ColumnFilter(column="text", op="contains", text="atraso 42")],
                        sort=[SortSpec(column="page_start", direction="desc")],
                    ),
                ),
                timed(
                    "filtro por valores + ultima pagina",
                    lambda: run(
                        filters=[
                            ColumnFilter(column="review_state", values=["pending", "validated"])
                        ],
                        page=10**6,
                        page_size=200,
                    ),
                ),
                timed("selecao de todos os resultados", lambda: run(include_ids=True)),
            ]
        engine.dispose()
    worst = max(seconds for _, seconds, _ in results)
    print(f"\n{count:>7} afirmacoes em um dossie")
    for label, seconds, total in results:
        print(f"  {seconds:6.2f}s  {label}  ({total} no resultado)")
    ok = worst <= BUDGET_SECONDS
    print(
        f"  pior caso {worst:.2f}s — {'dentro' if ok else 'ACIMA'} do limite de {BUDGET_SECONDS}s"
    )
    return ok


def main() -> int:
    counts = [int(arg) for arg in sys.argv[1:]] or [1000, 10000, 50000]
    outcomes = {count: measure(count) for count in counts}
    within = [count for count, ok in outcomes.items() if ok]
    print(
        "\nMaior volume medido dentro do limite: "
        + (f"{max(within)} registros por tabela." if within else "nenhum.")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
