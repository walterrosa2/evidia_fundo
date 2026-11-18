"""Contratos da diligencia de vinculos (RF07–RF12). Espelho em src/lib/operacao/types.ts."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from evidia.schemas import Model

ParticipantRole = Literal["court_expert", "party_assistant", "lawyer", "judge", "party", "other"]
RoleSide = Literal["claimant", "defendant", "court", "none"]
IdentifierType = Literal[
    "cpf", "cnpj", "oab", "crea", "professional_registry", "source_id", "other"
]
OccurrenceState = Literal[
    "candidate",
    "identity_pending",
    "identity_confirmed",
    "evidence_collected",
    "in_review",
    "validated",
    "discarded",
    "inconclusive",
    "contested",
    "forwarded_legal",
]
OccurrenceKind = Literal["cooccurrence", "qualification", "disciplinary", "social", "other"]
Relation = Literal[
    "expert_lawyer", "expert_party", "expert_judge", "expert_attribution", "expert_disciplinary"
]


class Identifier(Model):
    type: IdentifierType
    value: str = Field(min_length=1, max_length=120)
    uf: str | None = Field(default=None, min_length=2, max_length=2)


class ParticipantIn(Model):
    kind: Literal["person", "company"] = "person"
    name: str = Field(min_length=2, max_length=300)
    identifiers: list[Identifier] = Field(default=[], max_length=10)
    specialty: str = Field(default="", max_length=200)
    locality: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=1000)


class ParticipantUpdate(Model):
    name: str | None = Field(default=None, min_length=2, max_length=300)
    identifiers: list[Identifier] | None = Field(default=None, max_length=10)
    specialty: str | None = Field(default=None, max_length=200)
    locality: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=1000)
    # Confirmar identidade e ato de revisor e exige dizer com base em que.
    identity_status: Literal["candidate", "confirmed"] | None = None
    identity_note: str | None = Field(default=None, max_length=1000)


class MergeRequest(Model):
    into_participant_id: str = Field(min_length=1, max_length=36)
    reason: str = Field(min_length=3, max_length=1000)


class RoleIn(Model):
    cnj: str = Field(min_length=1, max_length=40)
    court: str = Field(default="", max_length=80)
    role: ParticipantRole
    side: RoleSide = "none"
    # Data do ato ou atuacao (nomeacao, laudo, decisao). Nula se desconhecida.
    event_date: date | None = None
    event_label: str = Field(default="", max_length=200)
    filing_date: date | None = None
    document_version_id: str | None = None
    page_start: int | None = Field(default=None, ge=1)
    source_ref: str = Field(default="", max_length=500)


class RoleOut(Model):
    id: str
    participant_id: str
    cnj: str
    court: str
    role: ParticipantRole
    side: RoleSide
    event_date: date | None
    event_label: str
    filing_date: date | None
    source_kind: Literal["dossier", "connector", "manual"]
    document_version_id: str | None
    page_start: int | None
    source_ref: str
    search_id: str | None
    is_synthetic: bool
    created_at: datetime


class ParticipantOut(Model):
    id: str
    opportunity_id: str
    kind: Literal["person", "company"]
    name: str
    identifiers: list[Identifier]
    specialty: str
    locality: str
    note: str
    identity_status: Literal["candidate", "confirmed"]
    identity_note: str
    merged_into_id: str | None
    is_synthetic: bool
    roles: list[RoleOut]
    # Outras fichas com o mesmo nome e sem identificador comum: possiveis homonimos.
    homonym_ids: list[str]
    created_at: datetime
    updated_at: datetime


class SearchRequest(Model):
    participant_id: str = Field(min_length=1, max_length=36)
    # Data final da janela de cinco anos. Padrao: hoje.
    reference_date: date | None = None


class SearchFileImport(Model):
    """Resultado de consulta feita por pessoa autorizada em fonte real, trazido por planilha."""

    participant_id: str = Field(min_length=1, max_length=36)
    # Planilha .xlsx ja recebida no dossie: e a prova da coleta (hash, quem enviou, quando).
    file_version_id: str = Field(min_length=1, max_length=36)
    # Nome da fonte consultada (ex.: "e-SAJ TJSP", "CREA-SP").
    source_name: str = Field(min_length=2, max_length=80)
    # O que a consulta cobre e o que nao cobre. Obrigatorio: sem isso o vazio seria lido
    # como "nenhum vinculo".
    coverage: str = Field(min_length=10, max_length=2000)
    reference_date: date | None = None


class SearchOut(Model):
    id: str
    participant_id: str
    connector: str
    reference_date: date
    window_start: date
    window_end: date
    timezone: str
    # completed: trouxe resultados | no_results: consulta feita, nada encontrado nesta
    # cobertura | failed: nao foi possivel consultar.
    status: Literal["completed", "no_results", "failed"]
    coverage: str
    filter_field: str | None
    error_code: str | None
    results_count: int
    is_synthetic: bool
    created_at: datetime


class CooccurrenceOut(Model):
    subject_role_id: str
    other_role_id: str
    other_participant_id: str
    other_name: str
    relation: Relation
    cnj: str
    event_date: date | None
    timing: Literal["in_window", "out_of_window", "undated"]
    expected: bool
    filed_before_window: bool


class RecurrenceOut(Model):
    other_participant_id: str
    other_name: str
    relation: Relation
    count: int
    # Nulo: sem base para falar em frequencia.
    universe: int | None
    expected: bool


class SubjectCrosscheck(Model):
    participant_id: str
    name: str
    identity_status: Literal["candidate", "confirmed"]
    roles_in_dossier: list[ParticipantRole]
    cooccurrences: list[CooccurrenceOut]
    recurrences: list[RecurrenceOut]
    # Consultas feitas para este profissional, com cobertura e falhas.
    searches: list[SearchOut]


class CrosscheckOut(Model):
    opportunity_id: str
    reference_date: date
    window_start: date
    window_end: date
    timezone: str
    subjects: list[SubjectCrosscheck]
    limitations: list[str]


class OccurrenceSheet(Model):
    """Ficha da ocorrencia (RF11, RF12). Todos os campos sao texto livre de quem revisa."""

    what_found: str = Field(default="", max_length=4000)
    allows_to_state: str = Field(default="", max_length=4000)
    does_not_allow: str = Field(default="", max_length=4000)
    missing_to_verify: str = Field(default="", max_length=4000)
    possible_impact: str = Field(default="", max_length=4000)
    interpretation: str = Field(default="", max_length=4000)
    alternative_hypothesis: str = Field(default="", max_length=4000)
    contrary_evidence: str = Field(default="", max_length=4000)
    coverage: str = Field(default="", max_length=2000)
    access_method: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=1000)
    # Material de rede social (AC12).
    author_attributed: str = Field(default="", max_length=300)
    content_date: str = Field(default="", max_length=40)
    relevance_justification: str = Field(default="", max_length=2000)
    # Procedimento disciplinar e qualificacao.
    proceeding_status: Literal[
        "", "ongoing", "archived", "acquitted", "sanction_in_force", "sanction_served"
    ] = ""
    registry_valid_from: str = Field(default="", max_length=40)
    registry_valid_to: str = Field(default="", max_length=40)
    # Avaliacao juridica (RF11).
    affected_act: str = Field(default="", max_length=1000)
    legal_basis: str = Field(default="", max_length=2000)
    prejudice: str = Field(default="", max_length=2000)
    causal_nexus: str = Field(default="", max_length=2000)
    timeliness: str = Field(default="", max_length=2000)
    possible_remedy: str = Field(default="", max_length=2000)


class OccurrenceIn(Model):
    kind: OccurrenceKind
    relation: Relation | None = None
    subject_participant_id: str = Field(min_length=1, max_length=36)
    related_participant_id: str | None = None
    cnj: str = Field(default="", max_length=40)
    fact_date: date | None = None
    document_version_id: str | None = None
    page_start: int | None = Field(default=None, ge=1)
    source_url: str = Field(default="", max_length=1000)
    # SHA-256 do material preservado. Confere integridade da copia, nao autenticidade.
    material_hash: str = Field(default="", max_length=64)
    sheet: OccurrenceSheet = OccurrenceSheet()


class OccurrenceReviewRequest(Model):
    state: OccurrenceState | None = None
    sheet: OccurrenceSheet | None = None
    comment: str = Field(default="", max_length=2000)


class OccurrenceReviewOut(Model):
    id: str
    reviewer_id: str
    reviewer_name: str
    before: dict[str, Any]
    after: dict[str, Any]
    comment: str
    created_at: datetime


class OccurrenceOut(Model):
    id: str
    opportunity_id: str
    kind: OccurrenceKind
    relation: Relation | None
    state: OccurrenceState
    subject_participant_id: str
    subject_name: str
    related_participant_id: str | None
    related_name: str | None
    cnj: str
    fact_date: date | None
    collected_at: datetime
    # Situacao do fato em relacao a janela de cinco anos da data de referencia de hoje.
    timing: Literal["in_window", "out_of_window", "undated"]
    document_version_id: str | None
    page_start: int | None
    source_url: str
    material_hash: str
    sheet: OccurrenceSheet
    # Relacao esperada (ex.: assistente com a parte que o indicou): nao gera alerta.
    expected_relation: bool
    # Situacao do registro profissional na data do fato: covered | not_covered | unknown.
    qualification_status: Literal["covered", "not_covered", "unknown"] | None
    is_current_sanction: bool
    validation_blockers: list[dict[str, str]]
    is_synthetic: bool
    reviews: list[OccurrenceReviewOut]
    created_at: datetime
    updated_at: datetime
