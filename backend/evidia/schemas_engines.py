"""Contratos de execucao de motor, achado e contraditorio (T003; RF04–RF06, AC05–AC08).

Execucao e achado sao servidos pelas rotas de motores (T008) e tem espelho em
src/lib/operacao/types.ts. Cenario e comparacao ainda nao tem rota (T010). Todos sao
exportados como JSON Schema em specs/001-evidia-operacional/contracts/schemas/.

Invariantes que o proprio schema recusa:
- execucao com bloco falho ou pulado nao pode se declarar concluida (AC06);
- achado ou argumento sem citacao carrega pendencia de evidencia e nao pode estar validado
  nem ser tratado como sustentado (AC05, RF06);
- custo desconhecido e nulo, nunca zero;
- o lado simulado e sempre informado e confirmado por alguem: nao ha valor padrao (RF04).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Self

from pydantic import Field, model_validator

from evidia.schemas import Dec, Model, PositionSide, ReviewState

EngineName = Literal["nulidade360", "p4"]
# Fila, executando, parcial, concluido, falhou e cancelado (spec, secao de jobs).
RunStatus = Literal["queued", "running", "partial", "completed", "failed", "cancelled"]
BlockStatus = Literal["completed", "failed", "skipped"]
SupportStrength = Literal["strong", "moderate", "weak", "not_assessed"]
Confidence = Literal["high", "medium", "low", "not_assessed"]

EVIDENCE_PENDING = "evidence_pending"


class Citation(Model):
    """Referencia resolvivel: versao de documento do dossie e pagina do arquivo."""

    document_version_id: str = Field(min_length=1, max_length=36)
    page_start: int = Field(ge=1)
    page_end: int | None = Field(default=None, ge=1)
    excerpt: str = Field(default="", max_length=4000)
    # 'engine': veio da saida do motor. 'review': informada por revisor humano.
    source: Literal["engine", "review"] = "engine"

    @model_validator(mode="after")
    def _ordered(self) -> Self:
        if self.page_end is not None and self.page_end < self.page_start:
            raise ValueError("page_end não pode ser menor que page_start")
        return self


class Pendency(Model):
    code: str = Field(min_length=1, max_length=60)
    message: str = Field(min_length=1, max_length=400)


class EngineBlock(Model):
    """Bloco ou pilar da auditoria, com o estado que o motor devolveu."""

    key: str = Field(min_length=1, max_length=80)
    label: str = Field(default="", max_length=200)
    status: BlockStatus
    message: str = Field(default="", max_length=1000)


class EngineRunOut(Model):
    """Envelope minimo de uma execucao de motor."""

    id: str
    opportunity_id: str
    dossier_version: int = Field(ge=0)
    engine: EngineName
    # Nulo quando o motor nao expoe versao (o Nulidade360 nao e repositorio versionado).
    engine_version: str | None = None
    checklist_version: str | None = None
    prompt_version: str | None = None
    model: str | None = None
    input_hash: str = Field(min_length=64, max_length=64)
    document_version_ids: list[str] = Field(min_length=1)
    simulated_side: PositionSide
    # Quem confirmou o lado. O padrao silencioso do motor nao substitui esta confirmacao.
    side_confirmed_by: str = Field(min_length=1, max_length=36)
    status: RunStatus
    # Rotulo de estado como veio do motor, preservado para conferencia.
    engine_status: str | None = None
    blocks: list[EngineBlock] = []
    attempts: int = Field(ge=1)
    # Nulo = custo desconhecido. Zero so quando o motor informou zero (ex.: modo simulado).
    cost_amount: Dec | None = None
    cost_currency: str | None = Field(default=None, min_length=3, max_length=3)
    usage: dict[str, int] | None = None
    limitations: list[str] = []
    # Mapa de evidencias entregue ao motor nesta execucao (nulo = nenhum).
    evidence_map: dict[str, Any] | None = None
    request_id: str | None = None
    # Execucao em modo simulado do motor: nunca e apresentada como analise real.
    is_mock: bool
    is_synthetic: bool = False
    stale: bool = False
    stale_reason: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    # Identificador do caso no motor, usado na reconciliacao.
    external_ref: str | None = None
    # Indice global de risco do motor (0–100); nulo se a auditoria nao ficou completa.
    # Nao e estimativa de exito nem probabilidade.
    overall_risk_index: Dec | None = Field(default=None, ge=0, le=100)
    findings_count: int = Field(default=0, ge=0)
    # Itens importados de relatorio (provas, quesitos e respostas do P4).
    items_count: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def _coherent(self) -> Self:
        incomplete = [b.key for b in self.blocks if b.status != "completed"]
        if self.status == "completed" and incomplete:
            raise ValueError(
                f"execução com bloco falho ou pulado não pode ser 'completed': {incomplete}"
            )
        if self.status in ("partial", "completed", "failed", "cancelled") and not self.finished_at:
            raise ValueError("execução encerrada exige finished_at")
        if (self.cost_amount is None) != (self.cost_currency is None):
            raise ValueError(
                "custo e moeda são informados juntos; desconhecido deixa os dois nulos"
            )
        return self


class EngineRunCreate(Model):
    """Pedido de execucao. O lado simulado e confirmado por quem pede: nao ha padrao."""

    engine: Literal["nulidade360"]
    document_version_id: str = Field(min_length=1, max_length=36)
    simulated_side: PositionSide
    # Opcional: planilha .xlsx do dossie entregue ao motor como mapa de evidencias.
    evidence_map_version_id: str | None = Field(default=None, min_length=1, max_length=36)


class FindingCitationIn(Model):
    document_version_id: str = Field(min_length=1, max_length=36)
    page_start: int = Field(ge=1)
    page_end: int | None = Field(default=None, ge=1)


class FindingReviewRequest(Model):
    review_state: ReviewState | None = None
    # Citacao informada pelo revisor: documento vigente do dossie e pagina do arquivo.
    citation: FindingCitationIn | None = None
    comment: str = Field(default="", max_length=2000)


class FindingReviewOut(Model):
    id: str
    reviewer_id: str
    reviewer_name: str
    before: dict[str, Any]
    after: dict[str, Any]
    comment: str
    created_at: datetime


FindingClaimRelation = Literal["supports", "contradicts", "related"]


class FindingClaimLinkIn(Model):
    claim_id: str = Field(min_length=1, max_length=36)
    relation: FindingClaimRelation
    note: str = Field(default="", max_length=1000)


class FindingClaimLinkOut(Model):
    """Afirmacao do dossie ligada ao achado, com o estado dela no momento da leitura."""

    id: str
    claim_id: str
    claim_text: str
    claim_review_state: ReviewState
    claim_stale: bool
    relation: FindingClaimRelation
    note: str
    created_by: str
    created_at: datetime


class FindingOut(Model):
    """Achado normalizado. O original do motor fica em `original`, sem alteracao."""

    id: str
    run_id: str
    opportunity_id: str
    engine: EngineName
    engine_version: str | None = None
    block_key: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=400)
    basis: str = Field(default="", max_length=8000)
    consequence_hypothesis: str = Field(default="", max_length=4000)
    support_strength: SupportStrength = "not_assessed"
    # Indice de risco do motor (0–100). Nao e estimativa de exito nem probabilidade.
    risk_index: Dec | None = Field(default=None, ge=0, le=100)
    citations: list[Citation] = []
    pendencies: list[Pendency] = []
    review_state: ReviewState = "pending"
    original: dict[str, Any]
    is_synthetic: bool = False
    # O que impede promover o achado a 'validado' agora (pendencias, modo simulado...).
    validation_blockers: list[Pendency] = []
    reviews: list[FindingReviewOut] = []
    # Afirmacoes do dossie que uma pessoa relacionou a este achado.
    claim_links: list[FindingClaimLinkOut] = []

    @model_validator(mode="after")
    def _evidence(self) -> Self:
        codes = {p.code for p in self.pendencies}
        if not self.citations and EVIDENCE_PENDING not in codes:
            raise ValueError("achado sem citação exige a pendência 'evidence_pending'")
        if self.review_state == "validated" and self.pendencies:
            raise ValueError("achado com pendência não pode estar validado")
        return self


# ------------------------------------------------------------- contraditorio


class ScenarioArgument(Model):
    id: str
    # Participantes do processo; nao a posicao economica de quem investe.
    formulated_by: str = Field(min_length=1, max_length=36)
    against: str = Field(min_length=1, max_length=36)
    plea_id: str | None = None
    affected_act: str | None = Field(default=None, max_length=400)
    # 'source_evidence': apoia-se em documento do dossie. 'scenario_inference': construcao
    # do proprio cenario, que nao entra como fato no cenario do outro lado.
    origin: Literal["source_evidence", "scenario_inference"]
    hypothesis: str = Field(min_length=1, max_length=4000)
    counter_evidence: str = Field(default="", max_length=4000)
    mitigation: str = Field(default="", max_length=4000)
    confidence: Confidence = "not_assessed"
    citations: list[Citation] = []
    pendencies: list[Pendency] = []
    status: Literal["supported", "hypothesis_for_validation"]

    @model_validator(mode="after")
    def _evidence(self) -> Self:
        if not self.citations and self.status == "supported":
            raise ValueError("argumento sem evidência fica como 'hypothesis_for_validation'")
        if self.origin == "source_evidence" and not self.citations:
            raise ValueError("origem 'source_evidence' exige ao menos uma citação")
        if self.formulated_by == self.against:
            raise ValueError("um participante não argumenta contra si mesmo")
        return self


class ScenarioRunOut(Model):
    """Execucao de um cenario: um participante, um pedido, um lado simulado."""

    id: str
    opportunity_id: str
    dossier_version: int = Field(ge=0)
    participant_id: str = Field(min_length=1, max_length=36)
    plea_id: str = Field(min_length=1, max_length=36)
    simulated_side: PositionSide
    status: RunStatus
    arguments: list[ScenarioArgument] = []
    limitations: list[str] = []
    is_mock: bool
    is_synthetic: bool = False
    created_at: datetime
    finished_at: datetime | None = None
    # manual: argumentos registrados por pessoa. model: gerados por modelo de linguagem.
    source: Literal["manual", "model"] = "manual"
    stale: bool = False


SideStatus = Literal["not_analyzed", "running", "partial", "completed", "failed", "stale"]


class ParticipantScenario(Model):
    """Situacao do cenario de um participante do pedido."""

    participant_id: str
    status: SideStatus
    run_id: str | None = None
    arguments_count: int | None = None
    hypotheses_count: int | None = None


class ScenarioSideView(Model):
    side: PositionSide
    status: SideStatus
    run_id: str | None = None
    # Um por participante do pedido neste lado (varios autores ou reus).
    participants: list[ParticipantScenario] = []
    # Nulo enquanto o lado nao foi analisado: ausencia de ataque nao e exito.
    arguments_count: int | None = None
    hypotheses_count: int | None = None

    @model_validator(mode="after")
    def _no_substitute(self) -> Self:
        if self.status == "not_analyzed" and (
            self.run_id is not None
            or self.arguments_count is not None
            or self.hypotheses_count is not None
        ):
            raise ValueError("lado não analisado não carrega contagem nem execução")
        return self


class ScenarioComparisonOut(Model):
    """Comparacao dos dois lados para um pedido. Nao depende da posicao economica."""

    opportunity_id: str
    plea_id: str
    dossier_version: int
    claimant: ScenarioSideView
    defendant: ScenarioSideView
    # So verdadeiro com os dois lados concluidos sobre a versao atual do dossie.
    comparable: bool
    # Versoes de documento citadas pelos dois lados (evidencia original compartilhada).
    common_sources: list[str] = []
    limitations: list[str] = []

    @model_validator(mode="after")
    def _comparable(self) -> Self:
        both = self.claimant.status == "completed" and self.defendant.status == "completed"
        if self.comparable and not both:
            raise ValueError("comparação exige os dois lados concluídos e atuais")
        return self


# ---------------------------------------------- pedidos e cenarios (requisicoes)


class PleaIn(Model):
    """Pedido individualizado. Com varios autores ou reus, cada um entra na lista."""

    title: str = Field(min_length=3, max_length=300)
    description: str = Field(default="", max_length=4000)
    claimant_participant_ids: list[str] = Field(min_length=1, max_length=20)
    defendant_participant_ids: list[str] = Field(min_length=1, max_length=20)


class PleaOut(Model):
    id: str
    opportunity_id: str
    title: str
    description: str
    claimant_participant_ids: list[str]
    defendant_participant_ids: list[str]
    is_synthetic: bool
    created_at: datetime


class ScenarioRunCreate(Model):
    participant_id: str = Field(min_length=1, max_length=36)
    # Lado simulado: papel de quem argumenta, nao a posicao economica de quem investe.
    simulated_side: PositionSide
    # manual: a pessoa registra os argumentos. model: modelo de linguagem do servidor.
    method: Literal["manual", "model"] = "manual"


class ScenarioCitationIn(Model):
    document_version_id: str = Field(min_length=1, max_length=36)
    page_start: int = Field(ge=1)
    page_end: int | None = Field(default=None, ge=1)
    excerpt: str = Field(default="", max_length=4000)


class ScenarioArgumentIn(Model):
    against: str = Field(min_length=1, max_length=36)
    affected_act: str = Field(default="", max_length=400)
    hypothesis: str = Field(min_length=3, max_length=4000)
    counter_evidence: str = Field(default="", max_length=4000)
    mitigation: str = Field(default="", max_length=4000)
    confidence: Confidence = "not_assessed"
    citations: list[ScenarioCitationIn] = Field(default=[], max_length=20)


# ---------------------------------------------------------------------- P4


class P4ImportRequest(Model):
    """Importa o relatorio de uma execucao do P4 feita fora da Evidia."""

    # Versao de documento do dossie com o relatorio (.xlsx).
    report_version_id: str = Field(min_length=1, max_length=36)
    # Versao de documento do dossie que o P4 analisou: as paginas citadas sao conferidas nela.
    source_version_id: str = Field(min_length=1, max_length=36)
    # Lado para o qual o P4 foi executado. Confirmado por quem importa; nao ha padrao.
    simulated_side: PositionSide
    # Opcional: versao do P4 (ex.: commit), ja que o relatorio nao a informa.
    engine_version: str = Field(default="", max_length=60)
    # Opcional: pedido de execucao que este relatorio atende; fecha o pedido.
    request_id: str | None = Field(default=None, min_length=1, max_length=36)


class P4RequestCreate(Model):
    """Pedido de execucao do P4. O lado e confirmado por quem pede: nao ha padrao."""

    document_version_id: str = Field(min_length=1, max_length=36)
    simulated_side: PositionSide
    note: str = Field(default="", max_length=2000)


class P4RequestOut(Model):
    id: str
    opportunity_id: str
    document_version_id: str
    simulated_side: PositionSide
    note: str
    status: Literal["awaiting_external", "imported", "cancelled"]
    dossier_version: int
    pages: int
    package_sha256: str
    ambiguous_markers: int
    run_id: str | None
    is_synthetic: bool
    # O documento ou o dossie mudou depois do pedido: o pacote nao representa mais o atual.
    stale: bool = False
    created_by: str
    created_at: datetime
    closed_at: datetime | None


class P4ItemOut(Model):
    id: str
    run_id: str
    position: int
    kind: Literal["evidence", "question", "answer"]
    index_key: str
    evidence_type: str
    summary: str
    reference_raw: str
    page: int | None
    question: str
    answer: str
    technical_status: str
    justification: str
    notes: str
    citations: list[Citation]
    pendencies: list[Pendency]
    original: dict[str, Any]
