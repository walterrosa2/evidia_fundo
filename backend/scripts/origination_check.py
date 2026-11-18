"""Homologacao SOMENTE-LEITURA do adaptador contra a originacao real (T005, D3).

Uso (em backend/, com a originacao no ar e as credenciais de servico no .env):

    $env:EVIDIA_ORIGINATION_MODE = "http"
    python scripts/origination_check.py              # so metadados
    python scripts/origination_check.py --documents  # tambem baixa os PDFs derivados (GET)

O que este roteiro faz e nao faz:
- so emite GET (alem do login): nunca pede estudo novo, nunca altera a origem;
- nao grava nada no banco da Evidia: le, normaliza em memoria e confere;
- imprime apenas CONTAGENS e resultados de conferencia. Nomes de parte, numeros de processo e
  conteudo de relatorio nao sao exibidos nem gravados em arquivo.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter

from evidia.adapters.origination import (
    HttpOriginationClient,
    OriginationError,
    normalize_snapshot,
    snapshot_hash,
)
from evidia.config import get_settings

sys.path.insert(0, ".")
from scripts.smoke_e2e import Check  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--documents", action="store_true", help="baixar os PDFs derivados (GET)")
    parser.add_argument("--limit", type=int, default=25, help="quantos candidatos conferir")
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")

    settings = get_settings()
    if settings.origination_mode != "http":
        print("Originacao real nao selecionada: defina EVIDIA_ORIGINATION_MODE=http.")
        return 2
    if not (settings.origination_email and settings.origination_password):
        print("Credenciais de servico ausentes: EVIDIA_ORIGINATION_EMAIL e _PASSWORD no .env.")
        return 2

    check = Check()
    client = HttpOriginationClient(
        settings.origination_base_url,
        settings.origination_email,
        settings.origination_password,
        timeout=settings.origination_timeout_seconds,
        max_retries=settings.origination_max_retries,
    )
    try:
        try:
            candidates = client.list_candidates()
        except OriginationError as exc:
            print(f"[FAIL] origem nao respondeu como esperado: {exc.code}")
            return 1
        check("origem lista candidatos pelo contrato", True, f"{len(candidates)} candidato(s)")

        outcomes: Counter[str] = Counter()
        documents: Counter[str] = Counter()
        for candidate in candidates[: args.limit]:
            external_id = candidate.get("external_id")
            try:
                first = normalize_snapshot(client.fetch(external_id))
                second = normalize_snapshot(client.fetch(external_id))
            except OriginationError as exc:
                outcomes[exc.code] += 1
                continue
            outcomes["normalizado"] += 1
            if snapshot_hash(first) != snapshot_hash(second):
                outcomes["hash_instavel"] += 1
            outcomes["com_estudo" if first.get("study") else "sem_estudo"] += 1
            outcomes["com_partes" if first.get("parties") else "sem_partes"] += 1
            outcomes["cnj_ausente" if not first.get("cnj_raw") else "cnj_presente"] += 1
            if not any(g.get("code") == "full_record_not_provided" for g in first.get("gaps", [])):
                outcomes["sem_lacuna_de_autos"] += 1
            if args.documents:
                for ref in first.get("document_refs", []):
                    try:
                        content = client.fetch_document(ref["path"])
                        valid = content.lstrip()[:5].startswith(b"%PDF-")
                        documents[f"{ref['kind']}:{'pdf' if valid else 'nao_e_pdf'}"] += 1
                    except OriginationError as exc:
                        documents[f"{ref['kind']}:{exc.code}"] += 1

        checked = min(len(candidates), args.limit)
        check(
            "todos os candidatos conferidos foram normalizados",
            outcomes["normalizado"] == checked,
            dict(outcomes).__repr__(),
        )
        check(
            "duas leituras do mesmo registro geram o mesmo hash (origem inalterada)",
            outcomes["hash_instavel"] == 0,
        )
        check(
            "a lacuna de autos integrais e declarada em todos os registros",
            outcomes["sem_lacuna_de_autos"] == 0,
        )
        if args.documents:
            bad = {k: v for k, v in documents.items() if not k.endswith(":pdf")}
            ok_missing = all(k.endswith(":origination_document_not_found") for k in bad)
            check(
                "relatorios derivados baixados sao PDF (ausencia e estado legitimo)",
                ok_missing,
                dict(documents).__repr__(),
            )
    finally:
        client.close()

    print(f"\n{'APROVADO' if check.failures == 0 else 'REPROVADO'} — falhas: {check.failures}")
    print("Nenhum dado foi gravado na Evidia e nenhuma alteracao foi feita na origem.")
    return 0 if check.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
