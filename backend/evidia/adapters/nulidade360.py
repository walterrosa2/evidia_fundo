"""Adaptador do Nulidade360 (T008; RF04, AC05, AC06, AC20).

O Nulidade360 e um servico a parte, sem autenticacao propria: a Evidia fala com ele por
HTTP e nunca importa seus modulos (ver specs/001-evidia-operacional/research.md, secao 4).

O que este adaptador garante:
- a posicao processual e sempre enviada de forma explicita; o padrao silencioso do motor
  ("Polo Passivo") nunca e usado;
- a saida original e preservada; a normalizacao nao apaga nem completa campos;
- bloco falho ou pulado mantem a execucao parcial, mesmo que o motor diga "completed";
- evidencia sem pagina, ou atribuida a outro arquivo, vira pendencia — nao citacao;
- falha do servico e erro tipado, nunca resultado vazio ou simulado.

Somente o modo simulado do motor (MOCK_AI, arquivo .txt/.md) esta habilitado. Execucao real
consome API paga e depende de autorizacao especifica.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Any, Protocol

import httpx

from evidia.domain.engines import EngineContractViolation, nulidade_run_status
from evidia.schemas_engines import EVIDENCE_PENDING, Citation, EngineBlock, Pendency, RunStatus

ENGINE = "nulidade360"
POSITION_LABEL = {"claimant": "Polo Ativo", "defendant": "Polo Passivo"}
# O modo simulado do motor so e livre de custo com texto: PDF e enviado ao provedor antes
# da checagem de MOCK_AI.
MOCK_SAFE_EXTENSIONS = (".txt", ".md")
MOCK_NOTE = "MOCK_AI"

_SUPPORT = {
    "fraca": "weak",
    "moderada": "moderate",
    "forte": "strong",
    "documento_essencial_ausente": "not_assessed",
}


XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class Nulidade360Error(Exception):
    def __init__(self, code: str, message: str, *, status: int = 502, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.retryable = retryable


class Nulidade360Client(Protocol):
    def engine_info(self) -> dict[str, Any]: ...

    def create_case(
        self,
        *,
        name: str,
        process_number: str,
        represented_party: str,
        position_label: str,
        filename: str,
        content: bytes,
    ) -> str: ...

    def start_analysis(self, case_ref: str) -> None: ...

    def list_analyses(self, case_ref: str) -> list[dict[str, Any]]: ...

    def send_evidence_map(self, case_ref: str, filename: str, content: bytes) -> dict[str, Any]: ...

    def fetch_report(self, case_ref: str) -> bytes: ...


class DisabledNulidade360Client:
    """Integracao desligada: toda chamada e erro de configuracao explicito."""

    def _fail(self) -> Nulidade360Error:
        return Nulidade360Error(
            "nulidade360_not_configured",
            "Integração com o Nulidade360 não configurada neste ambiente.",
            status=503,
        )

    def engine_info(self) -> dict[str, Any]:
        raise self._fail()

    def create_case(self, **_: Any) -> str:
        raise self._fail()

    def start_analysis(self, case_ref: str) -> None:
        raise self._fail()

    def list_analyses(self, case_ref: str) -> list[dict[str, Any]]:
        raise self._fail()

    def send_evidence_map(self, case_ref: str, filename: str, content: bytes) -> dict[str, Any]:
        raise self._fail()

    def fetch_report(self, case_ref: str) -> bytes:
        raise self._fail()


class HttpNulidade360Client:
    def __init__(
        self,
        base_url: str,
        *,
        timeout: float = 30.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not base_url.strip():
            raise Nulidade360Error(
                "nulidade360_not_configured",
                "Integração com o Nulidade360 sem URL configurada.",
                status=503,
            )
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=httpx.Timeout(timeout, connect=5.0),
            transport=transport,
        )

    def _send(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = self._client.request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            # Tempo esgotado nao confirma falha remota: quem chama decide se reconcilia.
            raise Nulidade360Error(
                "nulidade360_timeout",
                "Nulidade360 não respondeu no tempo limite.",
                status=504,
                retryable=True,
            ) from exc
        except httpx.HTTPError as exc:
            raise Nulidade360Error(
                "nulidade360_unavailable",
                "Nulidade360 indisponível.",
                status=503,
                retryable=True,
            ) from exc
        if response.status_code == 404:
            raise Nulidade360Error(
                "nulidade360_not_found", "Registro não encontrado no Nulidade360.", status=502
            )
        if response.status_code >= 400:
            raise Nulidade360Error(
                "nulidade360_rejected",
                f"Nulidade360 respondeu {response.status_code}.",
                status=502,
                retryable=response.status_code >= 500,
            )
        if "application/json" not in response.headers.get("content-type", ""):
            raise Nulidade360Error(
                "nulidade360_contract_violation",
                "Nulidade360 devolveu conteúdo que não é JSON em rota de API.",
            )
        try:
            return response.json()
        except ValueError as exc:
            raise Nulidade360Error(
                "nulidade360_contract_violation", "JSON inválido na resposta do Nulidade360."
            ) from exc

    def engine_info(self) -> dict[str, Any]:
        data = self._send("GET", "/api/checklist/active")
        if not isinstance(data, dict):
            raise Nulidade360Error(
                "nulidade360_contract_violation", "Formato inesperado em /api/checklist/active."
            )
        checklist = data.get("checklist") if isinstance(data.get("checklist"), dict) else {}
        return {
            "taxonomy_version": data.get("taxonomy_version"),
            "checklist_version": checklist.get("checklist_version"),
            "model": data.get("active_model"),
        }

    def create_case(
        self,
        *,
        name: str,
        process_number: str,
        represented_party: str,
        position_label: str,
        filename: str,
        content: bytes,
    ) -> str:
        data = self._send(
            "POST",
            "/api/cases",
            data={
                "name": name,
                "process_number": process_number,
                "parte_representada": represented_party,
                "posicao_processual": position_label,
            },
            files={"file": (filename, content, "text/plain")},
        )
        case_id = data.get("case_id") if isinstance(data, dict) else None
        if case_id is None:
            raise Nulidade360Error(
                "nulidade360_contract_violation",
                "Nulidade360 não devolveu o identificador do caso.",
            )
        return str(case_id)

    def start_analysis(self, case_ref: str) -> None:
        self._send("POST", f"/api/cases/{case_ref}/analyze")

    def list_analyses(self, case_ref: str) -> list[dict[str, Any]]:
        data = self._send("GET", f"/api/cases/{case_ref}/analyses")
        if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
            raise Nulidade360Error(
                "nulidade360_contract_violation", "Formato inesperado na lista de análises."
            )
        return data

    def send_evidence_map(self, case_ref: str, filename: str, content: bytes) -> dict[str, Any]:
        """Entrega ao caso o mapa de evidencias (.xlsx). O motor le a planilha localmente."""
        try:
            data = self._send(
                "POST",
                f"/api/cases/{case_ref}/evidence-map",
                files={"file": (filename, content, XLSX_MEDIA_TYPE)},
            )
        except Nulidade360Error as exc:
            if exc.code == "nulidade360_rejected" and not exc.retryable:
                # 4xx: a planilha nao esta no formato que o motor aceita.
                raise Nulidade360Error(
                    "nulidade360_evidence_map_rejected",
                    "O Nulidade360 recusou a planilha: não está no formato de mapa de evidências.",
                    status=422,
                ) from exc
            raise
        info = data.get("evidence_map") if isinstance(data, dict) else None
        if not isinstance(info, dict):
            raise Nulidade360Error(
                "nulidade360_contract_violation",
                "Nulidade360 não confirmou a importação do mapa de evidências.",
            )
        return {"total_items": info.get("total_items"), "run_id": info.get("run_id")}

    def fetch_report(self, case_ref: str) -> bytes:
        """Relatorio .docx que o motor monta a partir dos achados aceitos nele (GET, sem IA)."""
        try:
            response = self._client.get(f"/api/cases/{case_ref}/report.docx")
        except httpx.TimeoutException as exc:
            raise Nulidade360Error(
                "nulidade360_timeout",
                "Nulidade360 não respondeu no tempo limite.",
                status=504,
                retryable=True,
            ) from exc
        except httpx.HTTPError as exc:
            raise Nulidade360Error(
                "nulidade360_unavailable", "Nulidade360 indisponível.", status=503, retryable=True
            ) from exc
        if response.status_code in (400, 404):
            # 400: o motor so gera relatorio com achados aceitos ou editados nele. 404: sem analise.
            raise Nulidade360Error(
                "nulidade360_report_unavailable",
                "O Nulidade360 não tem relatório para esta execução: ele só o gera quando há "
                "achados aceitos ou editados no próprio motor.",
                status=409,
            )
        if response.status_code >= 400:
            raise Nulidade360Error(
                "nulidade360_rejected",
                f"Nulidade360 respondeu {response.status_code}.",
                status=502,
                retryable=response.status_code >= 500,
            )
        if "wordprocessingml" not in response.headers.get("content-type", ""):
            raise Nulidade360Error(
                "nulidade360_contract_violation",
                "Nulidade360 devolveu conteúdo que não é o relatório .docx.",
            )
        return response.content


# -------------------------------------------------------------- normalizacao


@dataclass(frozen=True)
class NormalizedFinding:
    external_id: str
    block_key: str
    title: str
    basis: str
    consequence_hypothesis: str
    support_strength: str
    risk_index: Decimal | None
    citations: list[Citation]
    pendencies: list[Pendency]
    original: dict[str, Any]


@dataclass(frozen=True)
class NormalizedAnalysis:
    external_id: str
    status: RunStatus
    engine_status: str
    blocks: list[EngineBlock]
    findings: list[NormalizedFinding]
    limitations: list[str]
    # O proprio motor declarou, em todos os blocos concluidos, que respondeu em modo simulado.
    mock_reported: bool
    overall_risk_index: Decimal | None
    model: str | None
    original: dict[str, Any] = field(repr=False, default_factory=dict)


def _violation(message: str) -> Nulidade360Error:
    return Nulidade360Error("nulidade360_contract_violation", message)


def _decimal(value: Any) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = Decimal(str(value))
    except InvalidOperation:
        return None
    return number if Decimal(0) <= number <= Decimal(100) else None


def _blocks(raw: dict[str, Any]) -> list[EngineBlock]:
    meta = raw.get("blocks_meta")
    if not isinstance(meta, dict):
        raise _violation("Análise do Nulidade360 sem o mapa de blocos (blocks_meta).")
    errors = {
        str(item.get("block_id")): str(item.get("error") or "")
        for item in raw.get("failed_blocks") or []
        if isinstance(item, dict)
    }
    blocks: list[EngineBlock] = []
    for key, info in meta.items():
        if not isinstance(info, dict):
            raise _violation(f"Bloco {key} em formato inesperado.")
        # Bloco concluido nao traz o campo; falho e pulado trazem.
        status = info.get("status") or "completed"
        if status not in ("completed", "failed", "skipped"):
            raise _violation(f"Estado desconhecido do bloco {key}: {status!r}.")
        if key in errors and status == "completed":
            status = "failed"  # a lista de falhas prevalece sobre a ausencia do campo
        message = errors.get(key, "") if status != "completed" else ""
        blocks.append(
            EngineBlock(
                key=str(key)[:80],
                label=str(info.get("block_name") or "")[:200],
                status=status,
                message=message[:1000],
            )
        )
    # Falha registrada para bloco que nao aparece no mapa tambem conta.
    known = {block.key for block in blocks}
    for key, message in errors.items():
        if key not in known:
            blocks.append(EngineBlock(key=key[:80], status="failed", message=message[:1000]))
    return blocks


def _citations(
    evidences: Any, *, sent_filename: str, document_version_id: str, page_count: int | None
) -> tuple[list[Citation], list[Pendency]]:
    citations: list[Citation] = []
    pendencies: list[Pendency] = []
    for evidence in evidences if isinstance(evidences, list) else []:
        if not isinstance(evidence, dict):
            continue
        name = evidence.get("file_name")
        page = evidence.get("page")
        if name and str(name) != sent_filename:
            pendencies.append(
                Pendency(
                    code="citation_unresolved",
                    message=(
                        f"O motor atribuiu a evidência ao arquivo “{str(name)[:120]}”, "
                        "que não é o documento enviado."
                    ),
                )
            )
            continue
        if not isinstance(page, int) or isinstance(page, bool) or page < 1:
            continue
        if page_count is not None and page > page_count:
            pendencies.append(
                Pendency(
                    code="page_out_of_range",
                    message=f"Página {page} não existe: o arquivo enviado tem {page_count}.",
                )
            )
            continue
        citations.append(
            Citation(
                document_version_id=document_version_id,
                page_start=page,
                excerpt=str(evidence.get("excerpt") or "")[:4000],
            )
        )
    if not citations and EVIDENCE_PENDING not in {p.code for p in pendencies}:
        pendencies.insert(
            0,
            Pendency(
                code=EVIDENCE_PENDING,
                message="Sem citação resolvível (documento e página): pendente de evidência.",
            ),
        )
    return citations, pendencies


def normalize_analysis(
    raw: dict[str, Any],
    *,
    sent_filename: str,
    document_version_id: str,
    page_count: int | None,
) -> NormalizedAnalysis:
    """Converte uma analise do Nulidade360 no contrato da Evidia, sem ocultar o original."""
    engine_status = raw.get("status")
    if not isinstance(engine_status, str) or raw.get("id") is None:
        raise _violation("Análise do Nulidade360 sem identificador ou estado.")

    if engine_status == "processing":
        # O motor so grava blocos e achados ao final; nada a normalizar ainda.
        return NormalizedAnalysis(
            external_id=str(raw["id"]),
            status="running",
            engine_status=engine_status,
            blocks=[],
            findings=[],
            limitations=[],
            mock_reported=False,
            overall_risk_index=None,
            model=None,
            original=raw,
        )

    if engine_status == "error" and not isinstance(raw.get("blocks_meta"), dict):
        blocks: list[EngineBlock] = []
    else:
        blocks = _blocks(raw)
    try:
        status = nulidade_run_status(engine_status, blocks)
    except EngineContractViolation as exc:
        raise _violation(str(exc)) from exc

    raw_findings = raw.get("findings")
    if not isinstance(raw_findings, list):
        raise _violation("Análise do Nulidade360 sem a lista de achados.")
    findings: list[NormalizedFinding] = []
    for item in raw_findings:
        if not isinstance(item, dict) or item.get("id") is None or not item.get("question"):
            raise _violation("Achado do Nulidade360 sem identificador ou enunciado.")
        citations, pendencies = _citations(
            item.get("evidences"),
            sent_filename=sent_filename,
            document_version_id=document_version_id,
            page_count=page_count,
        )
        findings.append(
            NormalizedFinding(
                external_id=str(item["id"]),
                block_key=str(item.get("block_id") or item.get("pillar_id") or "")[:80],
                title=str(item["question"])[:400],
                basis=str(item.get("inference") or "")[:8000],
                consequence_hypothesis=str(item.get("procedural_impact") or "")[:4000],
                support_strength=_SUPPORT.get(str(item.get("evidence_strength")), "not_assessed"),
                risk_index=_decimal(item.get("risk_score")),
                citations=citations,
                pendencies=pendencies,
                original=item,
            )
        )

    limitations: list[str] = []
    for block in blocks:
        if block.status != "completed":
            verb = "não foi executado" if block.status == "skipped" else "falhou"
            name = block.label or block.key
            detail = f": {block.message}" if block.message else "."
            limitations.append(f"Bloco {block.key} ({name}) {verb}{detail}")
    if status == "partial":
        limitations.append("Análise parcial: o parecer integral permanece indisponível.")
    if status == "failed":
        limitations.append("O motor registrou erro na análise; nenhum resultado foi completado.")
    checkpoint = raw.get("checkpoint") if isinstance(raw.get("checkpoint"), dict) else {}
    if checkpoint.get("status") not in (None, "valid"):
        reason = str(checkpoint.get("reason") or "situação do modelo não confirmada")
        limitations.append(f"Checkpoint do motor: {reason}")

    completed = [
        info
        for info in (raw.get("blocks_meta") or {}).values()
        if isinstance(info, dict) and not info.get("status")
    ]
    mock_reported = bool(completed) and all(
        any(MOCK_NOTE in str(note) for note in info.get("processing_notes") or [])
        for info in completed
    )
    return NormalizedAnalysis(
        external_id=str(raw["id"]),
        status=status,
        engine_status=engine_status,
        blocks=blocks,
        findings=findings,
        limitations=limitations,
        mock_reported=mock_reported,
        # Com bloco faltando, o indice global do motor nao representa a auditoria inteira.
        overall_risk_index=_decimal(raw.get("overall_score")) if status == "completed" else None,
        model=checkpoint.get("analysis_model"),
        original=raw,
    )
