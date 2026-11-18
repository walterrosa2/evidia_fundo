"""Operacao local: backup consistente do banco SQLite e verificacao de restauracao.

Uso:  python -m evidia.ops backup            (grava em data/backups/)
      python -m evidia.ops verify <arquivo>  (confere integridade e contagens)

O backup cobre o banco; os arquivos em data/storage sao enderecados por conteudo
(nunca sobrescritos) e devem ser copiados junto. Politica de retencao: pendente (D6).
"""

from __future__ import annotations

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

from evidia.config import BACKEND_DIR, get_settings


def sqlite_path(database_url: str) -> Path:
    if not database_url.startswith("sqlite"):
        raise ValueError("backup local disponível apenas para SQLite")
    return Path(database_url.split("///", 1)[-1])


def backup_database(source: Path, destination: Path) -> Path:
    """Copia consistente mesmo com o servico em execucao (API de backup do SQLite)."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    src = sqlite3.connect(source)
    dst = sqlite3.connect(destination)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    return destination


def table_counts(path: Path) -> dict[str, int]:
    conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("integrity_check falhou")
        tables = [
            r[0]
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
        ]
        return {
            t: conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] for t in sorted(tables)
        }
    finally:
        conn.close()


def main(argv: list[str]) -> int:
    if len(argv) >= 1 and argv[0] == "backup":
        source = sqlite_path(get_settings().database_url)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = BACKEND_DIR / "data" / "backups" / f"evidia_{stamp}.db"
        backup_database(source, dest)
        same = table_counts(source) == table_counts(dest)
        print(f"backup: {dest} | contagens conferem: {same}")
        return 0 if same else 1
    if len(argv) == 2 and argv[0] == "verify":
        for table, total in table_counts(Path(argv[1])).items():
            print(f"{table}: {total}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
