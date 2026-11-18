"""Adaptador somente-leitura da originacao (RF01, P03).

Contrato verificado por leitura do codigo de originacao-pipeline em c81d41c
(ver specs/001-evidia-operacional/research.md). Ainda NAO homologado contra uma
instancia em execucao (D3).

Garantias deste adaptador:
- so emite GET, alem do POST de login; nunca chama POST /processos/{cnj}/estudo,
  que gera estudo pago na origem;
- nao acessa o banco da originacao;
- falha de autenticacao, indisponibilidade ou limite vira erro explicito — jamais
  lista vazia ou dado demonstrativo;
- a originacao nao entrega autos: estudo e PDFs sao relatorios derivados.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import time
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import httpx

SNAPSHOT_SCHEMA_VERSION = "snapshot-1"
ORIGIN_SYSTEM_HTTP = "originacao-pipeline"
ORIGIN_SYSTEM_FIXTURE = "fixture-sintetica"


class OriginationError(Exception):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


@dataclass(frozen=True)
class RawOrigin:
    """Respostas da origem, na forma em que foram fornecidas."""

    system: str
    external_id: str
    is_synthetic: bool
    case: dict[str, Any] | None
    analysed: dict[str, Any] | None
    study: dict[str, Any] | None
    # Dados do cadastro do processo na origem (tribunal, situacao, distribuicao), quando a
    # leitura e feita direto no banco. Ausente nas demais origens: o snapshot delas nao muda.
    details: dict[str, Any] | None = None


# Relatorios derivados que a origem gera por processo. Nenhum outro caminho e baixado.
_DOCUMENT_PATH = re.compile(r"^/api/v1/processos/[0-9.\-]{15,30}/(estudo|dossie)\.pdf$")


def check_document_path(path: str) -> None:
    if not _DOCUMENT_PATH.fullmatch(path):
        raise OriginationError(
            "origination_contract_violation", "Caminho de relatório fora do contrato da origem."
        )


class OriginationClient(Protocol):
    system: str
    is_synthetic: bool

    def list_candidates(self) -> list[dict[str, Any]]: ...

    def fetch(self, external_id: str) -> RawOrigin: ...

    def fetch_document(self, path: str) -> bytes: ...


# ---------------------------------------------------------------- normalizacao


def _party(name: Any, role: str) -> dict[str, str] | None:
    text = str(name).strip() if name else ""
    return {"name": text, "role": role} if text else None


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def normalize_snapshot(raw: RawOrigin) -> dict[str, Any]:
    """Converte as respostas da origem no snapshot da Evidia.

    Somente campos efetivamente fornecidos sao preenchidos; o que falta vira lacuna.
    """
    case = raw.case or {}
    analysed = raw.analysed or {}
    study = raw.study or {}
    data = study.get("dados") or {}

    cnj_raw = case.get("processo_cnj_principal") or study.get("cnj") or analysed.get("cnj")

    parties: list[dict[str, str]] = []
    claimant = data.get("autor") or analysed.get("autor")
    for name in _as_list(claimant):
        if p := _party(name, "claimant"):
            parties.append(p)
    defendants = data.get("reus") if data.get("reus") else analysed.get("reu")
    for name in _as_list(defendants):
        if p := _party(name, "defendant"):
            parties.append(p)

    lawyers = [
        {
            "name": str(adv.get("nome") or ""),
            "oab": adv.get("oab"),
            "side": adv.get("polo"),
            "represents": adv.get("representa"),
        }
        for adv in ((study.get("contatos") or {}).get("advogados") or [])
        if isinstance(adv, dict)
    ]

    base = study.get("base_da_analise") or {}
    study_block: dict[str, Any] | None = None
    if study:
        study_block = {
            "id": study.get("id"),
            "version": study.get("versao"),
            "generated_at": study.get("gerado_em"),
            "simulated": study.get("simulado"),
            "completeness": base.get("completude"),
            "has_full_record": bool(base.get("tem_autos", False)),
            "sources": base.get("fontes") or [],
        }

    document_refs: list[dict[str, str]] = []
    gaps: list[dict[str, str]] = []
    if study and cnj_raw:
        document_refs.append(
            {
                "kind": "estudo_pdf",
                "category": "derived_report",
                "path": f"/api/v1/processos/{cnj_raw}/estudo.pdf",
            }
        )
    if cnj_raw:
        document_refs.append(
            {
                "kind": "dossie_pdf",
                "category": "derived_report",
                "path": f"/api/v1/processos/{cnj_raw}/dossie.pdf",
            }
        )

    # A API da originacao nao expoe copia dos autos; a lacuna e estrutural (AC02).
    gaps.append(
        {
            "code": "full_record_not_provided",
            "description": "Autos integrais nao fornecidos pela origem",
            "reason": "A originacao entrega metadados e relatorios derivados, nao os autos.",
        }
    )
    if not study:
        gaps.append(
            {
                "code": "study_not_available",
                "description": "Estudo da originacao nao disponivel",
                "reason": "Nenhum estudo existente ou visivel para o usuario de servico.",
            }
        )
    if not parties:
        gaps.append(
            {
                "code": "parties_not_provided",
                "description": "Partes nao informadas pela origem",
                "reason": "Confirmar partes e polos a partir dos autos.",
            }
        )

    return {
        "schema_version": SNAPSHOT_SCHEMA_VERSION,
        "origin_system": raw.system,
        "origin_external_id": raw.external_id,
        "is_synthetic": raw.is_synthetic,
        "commercial_case_id": case.get("id"),
        "cnj_raw": cnj_raw,
        "title": study.get("titulo") or analysed.get("titulo"),
        "parties": parties,
        "lawyers": lawyers,
        "judge": data.get("juiz"),
        "court_body": data.get("orgao_julgador"),
        "case_class": data.get("classe") or analysed.get("classe"),
        "subject": data.get("assunto"),
        "procedural_stage": analysed.get("fase"),
        "source_updated_at": case.get("atualizado_em")
        or study.get("gerado_em")
        or analysed.get("estudo_em"),
        "study": study_block,
        "document_refs": document_refs,
        "access_restrictions": [],
        "gaps": gaps,
        # So entra quando a origem informa: snapshots das outras origens ficam identicos.
        **({"origin_details": raw.details} if raw.details else {}),
    }


def snapshot_hash(snapshot: dict[str, Any]) -> str:
    canonical = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def candidate_from(case: dict[str, Any] | None, analysed: dict[str, Any] | None) -> dict[str, Any]:
    case = case or {}
    analysed = analysed or {}
    cnj = case.get("processo_cnj_principal") or analysed.get("cnj")
    external_id = f"caso:{case['id']}" if case.get("id") is not None else f"cnj:{cnj}"
    return {
        "external_id": external_id,
        "commercial_case_id": case.get("id"),
        "cnj_raw": cnj,
        "title": analysed.get("titulo"),
        "claimant": analysed.get("autor"),
        "defendant": analysed.get("reu"),
        "case_class": analysed.get("classe"),
        "has_study": bool(analysed),
        "source_updated_at": case.get("atualizado_em") or analysed.get("estudo_em"),
    }


def merge_candidates(
    cases: list[dict[str, Any]], analysed: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    by_cnj = {row.get("cnj"): row for row in analysed if row.get("cnj")}
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for case in cases:
        cnj = case.get("processo_cnj_principal")
        if cnj:
            seen.add(cnj)
        result.append(candidate_from(case, by_cnj.get(cnj)))
    for cnj, row in by_cnj.items():
        if cnj not in seen:
            result.append(candidate_from(None, row))
    return result


# ------------------------------------------------------------------ cliente HTTP


class HttpOriginationClient:
    """Cliente da API real. Sessao por cookie `evid_sessao` obtido em /auth/login."""

    system = ORIGIN_SYSTEM_HTTP
    is_synthetic = False

    def __init__(
        self,
        base_url: str,
        email: str,
        password: str,
        *,
        timeout: float = 15.0,
        max_retries: int = 2,
        transport: httpx.BaseTransport | None = None,
        sleep=time.sleep,
    ) -> None:
        if not base_url or not email or not password:
            raise OriginationError(
                "origination_not_configured",
                "Integração com a originação sem configuração completa (URL, e-mail ou senha).",
            )
        self._email = email
        self._password = password
        self._max_retries = max_retries
        self._sleep = sleep
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"), timeout=timeout, transport=transport
        )
        self._logged_in = False

    def close(self) -> None:
        self._client.close()

    def _login(self) -> None:
        try:
            resp = self._client.post(
                "/api/v1/auth/login", json={"email": self._email, "senha": self._password}
            )
        except httpx.HTTPError as exc:
            raise OriginationError(
                "origination_unavailable", "Originação indisponível no login.", retryable=True
            ) from exc
        if resp.status_code == 429:
            raise OriginationError(
                "origination_rate_limited", "Login bloqueado temporariamente na originação."
            )
        if resp.status_code in (401, 422):
            raise OriginationError(
                "origination_auth_failed", "Credenciais da originação recusadas."
            )
        if resp.status_code >= 400:
            raise OriginationError(
                "origination_unavailable",
                f"Originação respondeu {resp.status_code} no login.",
                retryable=resp.status_code >= 500,
            )
        self._logged_in = True

    def _send(self, path: str, *, allow_404: bool = False) -> httpx.Response | None:
        """Unico caminho de leitura. GET e idempotente: retry limitado com backoff."""
        if not self._logged_in:
            self._login()
        relogged = False
        attempt = 0
        while True:
            try:
                resp = self._client.get(path)
            except httpx.HTTPError as exc:
                if attempt < self._max_retries:
                    attempt += 1
                    self._sleep(min(0.5 * 2**attempt, 8.0))
                    continue
                raise OriginationError(
                    "origination_unavailable",
                    "Originação indisponível ou sem resposta no tempo limite.",
                    retryable=True,
                ) from exc

            if resp.status_code == 401 and not relogged:
                relogged = True
                self._logged_in = False
                self._login()
                continue
            if resp.status_code == 401:
                raise OriginationError("origination_auth_failed", "Sessão da originação recusada.")
            if resp.status_code == 403:
                raise OriginationError(
                    "origination_forbidden", "Usuário de serviço sem permissão na originação."
                )
            if resp.status_code == 404:
                if allow_404:
                    return None
                raise OriginationError(
                    "origination_not_found", "Registro não encontrado na origem."
                )
            if resp.status_code == 429:
                raise OriginationError(
                    "origination_rate_limited", "Limite de requisições da originação atingido."
                )
            if resp.status_code >= 500:
                if attempt < self._max_retries:
                    attempt += 1
                    self._sleep(min(0.5 * 2**attempt, 8.0))
                    continue
                raise OriginationError(
                    "origination_unavailable",
                    f"Originação respondeu {resp.status_code}.",
                    retryable=True,
                )
            if resp.status_code >= 400:
                raise OriginationError(
                    "origination_contract_violation",
                    f"Resposta inesperada da originação ({resp.status_code}).",
                )
            return resp

    def _get(self, path: str, *, allow_404: bool = False) -> Any:
        resp = self._send(path, allow_404=allow_404)
        if resp is None:
            return None
        # A origem tem catch-all de SPA: rota errada devolve 200 com HTML.
        if "application/json" not in resp.headers.get("content-type", ""):
            raise OriginationError(
                "origination_contract_violation",
                "Originação devolveu conteúdo que não é JSON em rota de API.",
            )
        try:
            return resp.json()
        except ValueError as exc:
            raise OriginationError(
                "origination_contract_violation", "JSON inválido na resposta da originação."
            ) from exc

    def fetch_document(self, path: str) -> bytes:
        """Baixa um relatorio derivado (GET). So os caminhos de PDF conhecidos sao aceitos."""
        check_document_path(path)
        resp = self._send(path, allow_404=True)
        if resp is None:
            raise OriginationError(
                "origination_document_not_found", "A origem não tem este relatório."
            )
        # Rota errada cai no catch-all da SPA e devolve HTML com 200.
        if "application/pdf" not in resp.headers.get("content-type", ""):
            raise OriginationError(
                "origination_contract_violation",
                "Originação devolveu conteúdo que não é PDF na rota do relatório.",
            )
        return resp.content

    @staticmethod
    def _expect(value: Any, kind: type, what: str) -> Any:
        if not isinstance(value, kind):
            raise OriginationError(
                "origination_contract_violation", f"Formato inesperado em {what}."
            )
        return value

    def list_candidates(self) -> list[dict[str, Any]]:
        cases = self._expect(self._get("/api/v1/casos"), list, "/casos")
        analysed = self._expect(self._get("/api/v1/analisados"), list, "/analisados")
        return merge_candidates(cases, analysed)

    def fetch(self, external_id: str) -> RawOrigin:
        kind, _, value = external_id.partition(":")
        case: dict[str, Any] | None = None
        cnj: str | None = None
        if kind == "caso" and value.isdigit():
            case = self._expect(self._get(f"/api/v1/casos/{int(value)}"), dict, "/casos/{id}")
            cnj = case.get("processo_cnj_principal")
        elif kind == "cnj" and value:
            cnj = value
        else:
            raise OriginationError("origination_not_found", "Identificador de origem inválido.")

        study: dict[str, Any] | None = None
        analysed: dict[str, Any] | None = None
        if cnj:
            # 404 ESTUDO_NAO_EXISTE e estado legitimo: sem estudo, nao e falha.
            got = self._get(f"/api/v1/processos/{cnj}/estudo", allow_404=True)
            study = self._expect(got, dict, "/processos/{cnj}/estudo") if got is not None else None
            rows = self._expect(self._get("/api/v1/analisados"), list, "/analisados")
            analysed = next((r for r in rows if r.get("cnj") == cnj), None)
        if kind == "cnj" and study is None and analysed is None:
            raise OriginationError("origination_not_found", "Processo não encontrado na origem.")
        return RawOrigin(
            system=self.system,
            external_id=external_id,
            is_synthetic=False,
            case=case,
            analysed=analysed,
            study=study,
        )


# --------------------------------------------------------------- cliente fixture


class FixtureOriginationClient:
    """Dados sinteticos rotulados, no mesmo formato da API real.

    Serve para exercitar contrato e jornada sem acesso ao provedor. Tudo o que nasce
    daqui carrega is_synthetic=True ate a interface e a exportacao (P02).
    """

    system = ORIGIN_SYSTEM_FIXTURE
    is_synthetic = True

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        if data is None:
            from evidia.fixtures.origination import build_fixture

            data = build_fixture()
        self.data = data

    def list_candidates(self) -> list[dict[str, Any]]:
        return merge_candidates(self.data["casos"], self.data["analisados"])

    def fetch(self, external_id: str) -> RawOrigin:
        kind, _, value = external_id.partition(":")
        case = None
        cnj = None
        if kind == "caso":
            case = next((c for c in self.data["casos"] if str(c["id"]) == value), None)
            if case is None:
                raise OriginationError(
                    "origination_not_found", "Registro não encontrado na origem."
                )
            cnj = case.get("processo_cnj_principal")
        elif kind == "cnj":
            cnj = value
        else:
            raise OriginationError("origination_not_found", "Identificador de origem inválido.")
        study = self.data["estudos"].get(cnj) if cnj else None
        analysed = next((r for r in self.data["analisados"] if r.get("cnj") == cnj), None)
        if kind == "cnj" and study is None and analysed is None:
            raise OriginationError("origination_not_found", "Processo não encontrado na origem.")
        return RawOrigin(
            system=self.system,
            external_id=external_id,
            is_synthetic=True,
            case=case,
            analysed=analysed,
            study=study,
        )

    def fetch_document(self, path: str) -> bytes:
        check_document_path(path)
        cnj, _, name = path.removeprefix("/api/v1/processos/").partition("/")
        # O estudo so existe para processos com estudo na fixture; o dossie, para todos.
        if name == "estudo.pdf" and cnj not in self.data["estudos"]:
            raise OriginationError(
                "origination_document_not_found", "A origem não tem este relatório."
            )
        return synthetic_report_pdf(f"{name} {cnj}")


def synthetic_report_pdf(label: str) -> bytes:
    """PDF minimo, de uma pagina, rotulado como sintetico. Usado so pelo cliente de fixture."""
    stream = f"BT /F1 12 Tf 20 150 Td (RELATORIO SINTETICO - {label}) Tj ET".encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents 4 0 R /Resources "
        b"<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
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


class SqliteOriginationClient:
    """Leitura direta, SOMENTE-LEITURA, do banco da originacao (`coletor/originacao.sqlite`).

    O banco e aberto em modo `ro`: nenhuma escrita e possivel por este cliente e nada no
    projeto da originacao e alterado. Ele guarda as consultas feitas e os processos
    encontrados (CNJ, tribunal, situacao, distribuicao, marca de lead) — nao guarda partes,
    estudo nem autos. O que nao existe la vira lacuna na importacao, nunca valor presumido.
    """

    system = ORIGIN_SYSTEM_HTTP  # mesma origem, outro meio de leitura: a identidade nao muda
    is_synthetic = False

    def __init__(self, db_path: str) -> None:
        path = Path(db_path) if db_path.strip() else None
        if path is None or not path.is_file():
            raise OriginationError(
                "origination_not_configured",
                "Banco da originação não encontrado: confira EVIDIA_ORIGINATION_DB_PATH.",
            )
        self._path = path

    def _rows(self) -> list[dict[str, Any]]:
        from urllib.parse import quote

        uri = f"file:{quote(self._path.as_posix())}?mode=ro"
        try:
            with closing(sqlite3.connect(uri, uri=True, timeout=5)) as db:
                db.row_factory = sqlite3.Row
                found = db.execute(
                    "select p.cnj, p.tribunal, p.tribunal_tipo, p.status, p.data_inicio, "
                    "p.is_lead, p.consulta_id, c.data_consulta, c.empresa_cnpj "
                    "from processos_cnjs p left join consultas_processos c on c.id = p.consulta_id "
                    "order by coalesce(c.data_consulta, ''), p.id"
                ).fetchall()
        except sqlite3.DatabaseError as exc:
            # Arquivo que nao abre ou sem as tabelas esperadas: nao e "nenhum processo".
            raise OriginationError(
                "origination_contract_violation",
                "O banco da originação não tem a estrutura esperada (consultas e processos).",
            ) from exc
        return [dict(row) for row in found]

    def _by_cnj(self) -> dict[str, dict[str, Any]]:
        """Um registro por CNJ: vale a consulta mais recente; lead em qualquer consulta conta."""
        merged: dict[str, dict[str, Any]] = {}
        for row in self._rows():
            cnj = (row.get("cnj") or "").strip()
            if not cnj:
                continue
            previous = merged.get(cnj)
            merged[cnj] = {
                "cnj": cnj,
                "court": (row.get("tribunal") or "").strip() or None,
                "court_type": (row.get("tribunal_tipo") or "").strip() or None,
                "status": (row.get("status") or "").strip() or None,
                "filing_date": (row.get("data_inicio") or "").strip() or None,
                "is_lead": bool(row.get("is_lead")) or bool(previous and previous["is_lead"]),
                "searched_company_cnpj": (row.get("empresa_cnpj") or "").strip() or None,
                "last_query_at": row.get("data_consulta"),
                "queries": (previous["queries"] if previous else 0) + 1,
            }
        return merged

    def list_candidates(self) -> list[dict[str, Any]]:
        out = []
        for item in self._by_cnj().values():
            out.append(
                {
                    "external_id": f"cnj:{item['cnj']}",
                    "commercial_case_id": None,
                    "cnj_raw": item["cnj"],
                    "title": None,
                    "claimant": None,
                    "defendant": None,
                    "case_class": None,
                    "has_study": False,
                    "source_updated_at": item["last_query_at"],
                    "court": item["court"],
                    "origin_status": item["status"],
                    "filing_date": item["filing_date"],
                    "is_lead": item["is_lead"],
                    "searched_company_cnpj": item["searched_company_cnpj"],
                }
            )
        # Leads primeiro; depois os consultados mais recentemente.
        out.sort(key=lambda c: (not c["is_lead"], -_stamp(c["source_updated_at"]), c["cnj_raw"]))
        return out

    def fetch(self, external_id: str) -> RawOrigin:
        kind, _, value = external_id.partition(":")
        item = self._by_cnj().get(value) if kind == "cnj" else None
        if item is None:
            raise OriginationError("origination_not_found", "Processo não encontrado na origem.")
        return RawOrigin(
            system=self.system,
            external_id=external_id,
            is_synthetic=False,
            case={"processo_cnj_principal": item["cnj"], "atualizado_em": item["last_query_at"]},
            analysed=None,
            study=None,
            details={k: v for k, v in item.items() if k != "cnj"},
        )

    def fetch_document(self, path: str) -> bytes:
        check_document_path(path)
        # O banco nao guarda relatorios: so a API da originacao os gera.
        raise OriginationError("origination_document_not_found", "A origem não tem este relatório.")


def _stamp(value: Any) -> float:
    from datetime import datetime as _dt

    try:
        return _dt.fromisoformat(str(value)).timestamp()
    except (TypeError, ValueError):
        return 0.0


class DisabledOriginationClient:
    """Integracao nao configurada: erro explicito, sem fallback para demo (AC22)."""

    system = "nao-configurada"
    is_synthetic = False

    def _fail(self):
        raise OriginationError(
            "origination_not_configured",
            "Integração com a originação não configurada neste ambiente.",
        )

    def list_candidates(self) -> list[dict[str, Any]]:
        self._fail()
        return []

    def fetch(self, external_id: str) -> RawOrigin:
        self._fail()
        raise AssertionError("inalcancavel")

    def fetch_document(self, path: str) -> bytes:
        self._fail()
        raise AssertionError("inalcancavel")
