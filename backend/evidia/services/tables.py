"""Consulta comum de tabelas (RF16–RF18, AC17, AC19).

Filtro, ordenacao, paginacao, facetas e exportacao sao resolvidos no servidor, sobre o
conjunto inteiro da organizacao do usuario — nunca apenas sobre a pagina exibida.

Regras:
- valores de uma coluna combinam por OU; colunas diferentes combinam por E;
- as opcoes (facetas) de uma coluna refletem os filtros das OUTRAS colunas e mantem
  visiveis os valores ja selecionados;
- ordenacao com tipo correto, nulos sempre no fim e ID como desempate estavel;
- tabela do dossie e escopada a uma oportunidade, conferida contra a organizacao da
  sessao;
- coluna nao permitida ao papel e tratada como inexistente em filtro, ordenacao,
  exportacao e visao salva: preferencia do cliente nao amplia permissao.

Limite declarado: o conjunto e montado em memoria por organizacao. Adequado ao volume
local; operacao com muitos milhares de registros pede consulta em SQL (D6).
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from evidia.errors import ApiError
from evidia.models import (
    CalculationRun,
    Claim,
    Document,
    DocumentVersion,
    EngineFinding,
    EngineRun,
    ImportConflict,
    MissingPiece,
    Occurrence,
    Opportunity,
    P4Item,
    Participant,
    Process,
    ProcessRole,
    User,
)
from evidia.schemas import (
    ColumnFilter,
    FacetValue,
    TableColumnOut,
    TableQuery,
    TableQueryOut,
    TableRow,
    TableViewConfig,
    ViewColumn,
)
from evidia.services import dossier
from evidia.services.table_help import help_for

Row = dict[str, Any]


@dataclass(frozen=True)
class Column:
    key: str
    label: str
    kind: str  # text | number | date | enum | bool
    help: str = ""
    sortable: bool = True
    filterable: bool = True
    facet: bool = False
    # Identificador minimo: sempre visivel e sempre exportado.
    required: bool = False
    default_visible: bool = True
    # None: todos os papeis. Caso contrario, apenas os listados enxergam a coluna.
    allowed_roles: frozenset[str] | None = None
    labels: tuple[tuple[Any, str], ...] = ()
    # Largura inicial sugerida (px). None: padrao do tipo, decidido pela tela.
    width: int | None = None

    def label_for(self, value: Any) -> str:
        if value is None or value == "":
            return "Vazio"
        for known, text in self.labels:
            if known == value:
                return text
        if isinstance(value, bool):
            return "Sim" if value else "Não"
        return str(value)


@dataclass(frozen=True)
class TableDef:
    key: str
    columns: tuple[Column, ...]
    # Recebe o ID da oportunidade ja autorizada quando a tabela e escopada.
    load: Callable[[Session, User, str | None], list[Row]]
    # Tabela do dossie: so existe dentro de uma oportunidade.
    scoped: bool = False
    # (coluna, decrescente) aplicado quando a consulta nao pede ordenacao.
    default_sort: tuple[tuple[str, bool], ...] = ()


# ------------------------------------------------------------- oportunidades


def _load_opportunities(db: Session, user: User, _scope: str | None) -> list[Row]:
    org = user.organization_id

    def counts(model, *conditions) -> dict[str, int]:
        return dict(
            db.execute(
                select(model.opportunity_id, func.count())
                .where(model.organization_id == org, *conditions)
                .group_by(model.opportunity_id)
            ).all()
        )

    documents = counts(Document)
    full_records = counts(Document, Document.category == "full_record")
    gaps = counts(MissingPiece, MissingPiece.status == "open")
    conflicts = counts(ImportConflict, ImportConflict.status == "open")
    claims = counts(Claim)

    rows: list[Row] = []
    for opp, process in db.execute(
        select(Opportunity, Process)
        .join(Process, Process.id == Opportunity.process_id)
        .where(Opportunity.organization_id == org)
    ).all():
        rows.append(
            {
                "id": opp.id,
                "is_synthetic": opp.is_synthetic,
                "cnj": process.cnj,
                "title": opp.title or None,
                "court": process.court_label,
                "position_side": opp.position_side,
                "represented_party": opp.represented_party or None,
                "origin_system": opp.origin_system,
                "origin_external_id": opp.origin_external_id,
                "process_status": process.status,
                "documents_count": documents.get(opp.id, 0),
                "has_full_record": full_records.get(opp.id, 0) > 0,
                "open_gaps_count": gaps.get(opp.id, 0),
                "open_conflicts_count": conflicts.get(opp.id, 0),
                "claims_count": claims.get(opp.id, 0),
                "contract_status": opp.contract_status,
                "dossier_version": opp.dossier_version,
                "created_at": opp.created_at,
                "updated_at": opp.updated_at,
            }
        )
    return rows


OPPORTUNITIES = TableDef(
    key="opportunities",
    load=_load_opportunities,
    default_sort=(("updated_at", True),),
    columns=(
        Column(
            "cnj",
            "Processo (CNJ)",
            "text",
            required=True,
            help="Número único do processo. Vazio indica rascunho sem CNJ válido.",
        ),
        Column("title", "Título", "text", help="Título informado pela origem."),
        Column("court", "Tribunal", "enum", facet=True, help="Derivado do número CNJ."),
        Column(
            "position_side",
            "Posição Avaliada",
            "enum",
            facet=True,
            labels=(("claimant", "Autor"), ("defendant", "Réu")),
            help="Lado do processo avaliado nesta oportunidade.",
        ),
        Column("represented_party", "Parte Representada", "text"),
        Column(
            "origin_system",
            "Origem",
            "enum",
            facet=True,
            labels=(
                ("fixture-sintetica", "Fixture sintética"),
                ("originacao-pipeline", "Originação"),
            ),
        ),
        Column("origin_external_id", "ID na Origem", "text", default_visible=False),
        Column(
            "process_status",
            "Situação do Cadastro",
            "enum",
            facet=True,
            default_visible=False,
            labels=(("active", "Ativo"), ("draft", "Rascunho")),
        ),
        Column("documents_count", "Documentos", "number"),
        Column(
            "has_full_record",
            "Autos Integrais",
            "bool",
            facet=True,
            labels=((True, "Recebidos"), (False, "Pendentes")),
            help="Sem os autos integrais o parecer integral fica bloqueado.",
        ),
        Column("open_gaps_count", "Lacunas", "number", help="Peças pendentes em aberto."),
        Column(
            "open_conflicts_count",
            "Conflitos",
            "number",
            default_visible=False,
            help="Divergências de identidade entre snapshots ainda não revisadas.",
        ),
        Column("claims_count", "Afirmações", "number"),
        Column(
            "contract_status",
            "Contrato",
            "enum",
            facet=True,
            labels=(("not_defined", "Não definido"),),
        ),
        Column("dossier_version", "Versão do Dossiê", "number", default_visible=False),
        Column(
            "is_synthetic",
            "Dado Sintético",
            "bool",
            facet=True,
            default_visible=False,
            labels=((True, "Sintético"), (False, "Real")),
        ),
        Column("created_at", "Criado", "date", default_visible=False),
        Column("updated_at", "Atualizado", "date"),
    ),
)

# ------------------------------------------------------- documentos do dossie


def _load_documents(db: Session, user: User, scope: str | None) -> list[Row]:
    """Uma linha por versao: a versao anterior continua consultavel (RF02)."""
    rows: list[Row] = []
    for version, document in db.execute(
        select(DocumentVersion, Document)
        .join(Document, Document.id == DocumentVersion.document_id)
        .where(
            DocumentVersion.organization_id == user.organization_id,
            DocumentVersion.opportunity_id == scope,
        )
    ).all():
        is_current = version.version_no == document.current_version_no
        rows.append(
            {
                "id": version.id,
                "_refs": {"document_id": document.id},
                # Chegada de versao nova muda a linha da anterior sem mudar seu ID.
                "_stamp": is_current,
                "title": document.title,
                "doc_type": document.doc_type,
                "category": document.category,
                "version_no": version.version_no,
                "is_current": is_current,
                "page_count": version.page_count,
                "state": version.state,
                "filename": version.filename,
                "media_type": version.media_type,
                "size_bytes": version.size_bytes,
                "sha256": version.sha256,
                "origin": version.origin,
                "obtained_at": version.obtained_at,
            }
        )
    return rows


DOCUMENTS = TableDef(
    key="documents",
    load=_load_documents,
    scoped=True,
    default_sort=(("title", False), ("version_no", True)),
    columns=(
        Column("title", "Documento", "text", required=True, width=300),
        Column(
            "doc_type",
            "Tipo Documental",
            "enum",
            facet=True,
            labels=(
                ("nao_classificado", "Não classificado"),
                ("processo_integral", "Processo integral"),
                ("peticao_inicial", "Petição inicial"),
                ("contestacao", "Contestação"),
                ("laudo_pericial", "Laudo pericial"),
                ("parecer_assistente", "Parecer do assistente técnico"),
                ("contrato", "Contrato"),
                ("decisao", "Decisão"),
                ("comprovante", "Comprovante"),
                ("relatorio_originacao", "Relatório da originação"),
            ),
            help="Tipo do documento. Não define a natureza das afirmações que ele contém.",
        ),
        Column(
            "category",
            "Categoria",
            "enum",
            facet=True,
            labels=(
                ("full_record", "Autos integrais"),
                ("piece", "Peça avulsa"),
                ("derived_report", "Relatório derivado"),
                ("metadata", "Metadado"),
            ),
            help="Relatório derivado não substitui os autos nem as peças.",
        ),
        Column("version_no", "Versão", "number", width=130),
        Column(
            "is_current",
            "Vigência",
            "bool",
            facet=True,
            labels=((True, "Atual"), (False, "Anterior")),
            help="Versão nova não apaga a anterior; a anterior deixa de ser a vigente.",
        ),
        Column(
            "page_count",
            "Páginas",
            "number",
            width=150,
            help="Contagem real do arquivo recebido. Vazio: formato sem paginação conhecida.",
        ),
        Column(
            "state",
            "Estado",
            "enum",
            facet=True,
            labels=(
                ("stored", "Processado"),
                ("needs_ocr", "Requer OCR"),
                ("password_protected", "Protegido por senha"),
            ),
        ),
        Column("sha256", "Hash (SHA-256)", "text", width=200),
        Column("obtained_at", "Recebido", "date"),
        Column("size_bytes", "Tamanho (bytes)", "number", default_visible=False),
        Column("filename", "Arquivo", "text", default_visible=False),
        Column("media_type", "Formato", "enum", facet=True, default_visible=False),
        Column(
            "origin",
            "Como Chegou",
            "enum",
            facet=True,
            default_visible=False,
            labels=(("upload", "Envio manual"),),
        ),
    ),
)


# ------------------------------------------------------- afirmacoes do dossie


def _load_claims(db: Session, user: User, scope: str | None) -> list[Row]:
    # So as colunas exibidas: carregar objetos inteiros custa varias vezes mais em volume alto
    # (medido em scripts/table_volume.py).
    rows = db.execute(
        select(
            Claim.id,
            Claim.text,
            Claim.nature,
            Claim.asserted_by,
            Document.title,
            DocumentVersion.version_no,
            Claim.page_start,
            Claim.review_state,
            Claim.stale,
            Claim.dossier_version,
            Claim.created_at,
            Claim.updated_at,
        )
        .outerjoin(DocumentVersion, DocumentVersion.id == Claim.document_version_id)
        .outerjoin(Document, Document.id == DocumentVersion.document_id)
        .where(Claim.organization_id == user.organization_id, Claim.opportunity_id == scope)
    ).all()
    return [
        {
            "id": row[0],
            "text": row[1],
            "nature": row[2],
            "asserted_by": row[3] or None,
            "document_title": row[4],
            "document_version_no": row[5],
            "page_start": row[6],
            "review_state": row[7],
            "stale": row[8],
            "dossier_version": row[9],
            "created_at": row[10],
            "updated_at": row[11],
        }
        for row in rows
    ]


CLAIMS = TableDef(
    key="claims",
    load=_load_claims,
    scoped=True,
    default_sort=(("created_at", False),),
    columns=(
        Column("text", "Afirmação", "text", required=True, width=420),
        Column(
            "nature",
            "Natureza",
            "enum",
            facet=True,
            labels=(
                ("documentary_finding", "Constatação documental"),
                ("attributed_allegation", "Alegação atribuída"),
                ("analytical_inference", "Inferência analítica"),
                ("human_conclusion", "Conclusão humana"),
            ),
            help=(
                "Constatação documental, alegação atribuída, inferência analítica ou "
                "conclusão humana. Não mede confiabilidade."
            ),
        ),
        Column("asserted_by", "Quem Afirma", "text", width=200),
        Column(
            "document_title",
            "Documento de Origem",
            "text",
            help="Vazio: afirmação sem citação resolvível, pendente de evidência.",
        ),
        Column("document_version_no", "Versão Citada", "number", width=170),
        Column("page_start", "Página", "number", width=130),
        Column(
            "review_state",
            "Revisão",
            "enum",
            facet=True,
            labels=(
                ("pending", "Pendente"),
                ("in_review", "Em revisão"),
                ("validated", "Validada"),
                ("discarded", "Descartada"),
                ("contested", "Contestada"),
                ("inconclusive", "Inconclusiva"),
            ),
            help="“Validada” significa revisada por responsável, não verdade judicial.",
        ),
        Column(
            "stale",
            "Atualidade",
            "bool",
            facet=True,
            labels=((True, "Desatualizada"), (False, "Em dia")),
            width=180,
            help="Desatualizada: a versão citada foi substituída por outra mais nova.",
        ),
        Column("dossier_version", "Versão do Dossiê", "number", default_visible=False),
        Column("created_at", "Registrada", "date", default_visible=False),
        Column("updated_at", "Atualizada", "date"),
    ),
)

# ------------------------------------------------- diligencia: atuacoes e ocorrencias

_ROLE_LABELS = (
    ("court_expert", "Perito do juízo"),
    ("party_assistant", "Assistente técnico"),
    ("lawyer", "Advogado"),
    ("judge", "Magistrado"),
    ("party", "Parte"),
    ("other", "Outro"),
)
_SIDE_LABELS = (
    ("claimant", "Autor"),
    ("defendant", "Réu"),
    ("court", "Juízo"),
    ("none", "Não se aplica"),
)


def _midnight(value) -> datetime | None:
    return datetime.combine(value, time.min, tzinfo=UTC) if value else None


def _load_roles(db: Session, user: User, scope: str | None) -> list[Row]:
    rows: list[Row] = []
    for role, person in db.execute(
        select(ProcessRole, Participant)
        .join(Participant, Participant.id == ProcessRole.participant_id)
        .where(
            ProcessRole.organization_id == user.organization_id,
            ProcessRole.opportunity_id == scope,
            Participant.merged_into_id.is_(None),
        )
    ).all():
        rows.append(
            {
                "id": role.id,
                "is_synthetic": role.is_synthetic,
                "_refs": {"participant_id": person.id},
                "_stamp": f"{role.event_date}|{person.name}",
                "participant": person.name,
                "role": role.role,
                "side": role.side,
                "cnj": role.cnj,
                "court": role.court or None,
                "event_date": _midnight(role.event_date),
                "event_label": role.event_label or None,
                "source_kind": role.source_kind,
            }
        )
    return rows


ROLES_TABLE = TableDef(
    key="process_roles",
    load=_load_roles,
    scoped=True,
    default_sort=(("event_date", True), ("participant", False)),
    columns=(
        Column("participant", "Participante", "text", required=True, width=280),
        Column("role", "Papel", "enum", facet=True, labels=_ROLE_LABELS),
        Column("side", "Lado", "enum", facet=True, labels=_SIDE_LABELS, width=150),
        Column("cnj", "Processo (CNJ)", "text", width=250),
        Column("court", "Tribunal", "enum", facet=True, default_visible=False),
        Column(
            "event_date",
            "Data do Ato",
            "date",
            help="Data da nomeação, do laudo ou da decisão. Não é a data de distribuição.",
        ),
        Column("event_label", "Ato", "text", width=220),
        Column(
            "source_kind",
            "Origem do Registro",
            "enum",
            facet=True,
            labels=(
                ("dossier", "Documento do dossiê"),
                ("connector", "Fonte consultada"),
                ("manual", "Registro manual"),
            ),
        ),
    ),
)


def _load_occurrences(db: Session, user: User, scope: str | None) -> list[Row]:
    names = dict(
        db.execute(
            select(Participant.id, Participant.name).where(Participant.opportunity_id == scope)
        ).all()
    )
    rows: list[Row] = []
    for item in db.scalars(
        select(Occurrence).where(
            Occurrence.organization_id == user.organization_id,
            Occurrence.opportunity_id == scope,
        )
    ).all():
        rows.append(
            {
                "id": item.id,
                "is_synthetic": item.is_synthetic,
                "subject": names.get(item.subject_participant_id),
                "kind": item.kind,
                "state": item.state,
                "related": names.get(item.related_participant_id),
                "cnj": item.cnj or None,
                "fact_date": _midnight(item.fact_date),
                "what_found": (item.sheet or {}).get("what_found") or None,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
        )
    return rows


OCCURRENCES_TABLE = TableDef(
    key="occurrences",
    load=_load_occurrences,
    scoped=True,
    default_sort=(("created_at", False),),
    columns=(
        Column("subject", "Profissional", "text", required=True, width=260),
        Column(
            "kind",
            "Tipo",
            "enum",
            facet=True,
            labels=(
                ("cooccurrence", "Coocorrência em processo"),
                ("qualification", "Qualificação profissional"),
                ("disciplinary", "Procedimento disciplinar"),
                ("social", "Material de rede social"),
                ("other", "Outra"),
            ),
        ),
        Column(
            "state",
            "Situação",
            "enum",
            facet=True,
            labels=(
                ("candidate", "Candidata"),
                ("identity_pending", "Identidade pendente"),
                ("identity_confirmed", "Identidade confirmada"),
                ("evidence_collected", "Evidência coletada"),
                ("in_review", "Em revisão"),
                ("validated", "Validada"),
                ("discarded", "Descartada"),
                ("inconclusive", "Inconclusiva"),
                ("contested", "Contestada"),
                ("forwarded_legal", "Encaminhada ao jurídico"),
            ),
            help="Só ocorrência validada pode seguir para avaliação jurídica.",
        ),
        Column("related", "Relacionado", "text"),
        Column("cnj", "Processo (CNJ)", "text", default_visible=False),
        Column("fact_date", "Data do Fato", "date"),
        Column("what_found", "O Que Foi Encontrado", "text", width=360),
        Column("created_at", "Registrada", "date", default_visible=False),
        Column("updated_at", "Atualizada", "date"),
    ),
)

# ------------------------------------------------- motores: achados e itens do P4

_ENGINE_LABELS = (("nulidade360", "Nulidade360"), ("p4", "P4"))
_REVIEW_LABELS = (
    ("pending", "Pendente"),
    ("in_review", "Em revisão"),
    ("validated", "Validada"),
    ("discarded", "Descartada"),
    ("contested", "Contestada"),
    ("inconclusive", "Inconclusiva"),
)


def _risk(value: str | None):
    try:
        return float(value) if value is not None else None
    except ValueError:
        return None


def _load_findings(db: Session, user: User, scope: str | None) -> list[Row]:
    rows: list[Row] = []
    for finding, run in db.execute(
        select(EngineFinding, EngineRun)
        .join(EngineRun, EngineRun.id == EngineFinding.run_id)
        .where(
            EngineFinding.organization_id == user.organization_id,
            EngineFinding.opportunity_id == scope,
        )
    ).all():
        rows.append(
            {
                "id": finding.id,
                "is_synthetic": run.is_synthetic,
                "_refs": {"run_id": run.id},
                "_stamp": f"{finding.review_state}|{len(finding.pendencies or [])}|{run.stale}",
                "title": finding.title,
                "block_key": finding.block_key,
                "review_state": finding.review_state,
                "has_evidence": bool(finding.citations),
                "pendencies_count": len(finding.pendencies or []),
                "risk_index": _risk(finding.risk_index),
                "support_strength": finding.support_strength,
                "simulated_side": run.simulated_side,
                "is_mock": run.is_mock,
                "run_stale": run.stale,
                "created_at": finding.created_at,
            }
        )
    return rows


FINDINGS_TABLE = TableDef(
    key="engine_findings",
    load=_load_findings,
    scoped=True,
    default_sort=(("created_at", True), ("block_key", False)),
    columns=(
        Column("title", "Achado", "text", required=True, width=420),
        Column("block_key", "Bloco", "enum", facet=True, width=130),
        Column("review_state", "Revisão", "enum", facet=True, labels=_REVIEW_LABELS),
        Column(
            "has_evidence",
            "Evidência",
            "bool",
            facet=True,
            labels=((True, "Com página de origem"), (False, "Sem página de origem")),
            help="Sem página de origem o achado fica pendente e não pode ser validado.",
            width=210,
        ),
        Column("pendencies_count", "Pendências", "number", width=150),
        Column(
            "risk_index",
            "Índice de Risco",
            "number",
            help="Índice do motor, de 0 a 100. Não é estimativa de êxito nem probabilidade.",
            width=180,
        ),
        Column(
            "support_strength",
            "Suporte",
            "enum",
            facet=True,
            labels=(
                ("strong", "Forte"),
                ("moderate", "Moderado"),
                ("weak", "Fraco"),
                ("not_assessed", "Não avaliado"),
            ),
            default_visible=False,
        ),
        Column("simulated_side", "Lado Simulado", "enum", facet=True, labels=_SIDE_LABELS[:2]),
        Column(
            "is_mock",
            "Modo do Motor",
            "bool",
            facet=True,
            labels=((True, "Simulado"), (False, "Real")),
            help="Achado de execução simulada é dado de teste e não pode ser validado.",
        ),
        Column(
            "run_stale",
            "Execução",
            "bool",
            facet=True,
            labels=((True, "Desatualizada"), (False, "Atual")),
            default_visible=False,
        ),
        Column("created_at", "Registrado", "date", default_visible=False),
    ),
)


def _load_p4_items(db: Session, user: User, scope: str | None) -> list[Row]:
    rows: list[Row] = []
    for item, run in db.execute(
        select(P4Item, EngineRun)
        .join(EngineRun, EngineRun.id == P4Item.run_id)
        .where(P4Item.organization_id == user.organization_id, P4Item.opportunity_id == scope)
    ).all():
        text = item.summary if item.kind == "evidence" else item.question
        rows.append(
            {
                "id": item.id,
                "is_synthetic": run.is_synthetic,
                "_refs": {"run_id": run.id},
                "_stamp": run.stale,
                "text": text or None,
                "kind": item.kind,
                "index_key": item.index_key or None,
                "evidence_type": item.evidence_type or None,
                "page": item.page,
                "reference_raw": item.reference_raw or None,
                "answer": item.answer or None,
                "technical_status": item.technical_status or None,
                "pendencies_count": len(item.pendencies or []),
                "position": item.position,
                "run_stale": run.stale,
                "imported_at": run.created_at,
            }
        )
    return rows


P4_ITEMS_TABLE = TableDef(
    key="p4_items",
    load=_load_p4_items,
    scoped=True,
    default_sort=(("imported_at", True), ("position", False)),
    columns=(
        Column("text", "Prova ou Quesito", "text", required=True, width=420),
        Column(
            "kind",
            "Categoria",
            "enum",
            facet=True,
            labels=(("evidence", "Prova"), ("question", "Quesito"), ("answer", "Resposta")),
            width=150,
        ),
        Column("index_key", "Bloco", "enum", facet=True, width=130),
        Column("evidence_type", "Tipo de Prova", "enum", facet=True),
        Column(
            "page",
            "Página",
            "number",
            help="Extraída da referência em texto livre do P4. Vazio: sem página identificável.",
            width=130,
        ),
        Column("reference_raw", "Referência do P4", "text", default_visible=False),
        Column("answer", "Resposta Técnica", "text", width=360),
        Column("technical_status", "Status Técnico", "enum", facet=True),
        Column("pendencies_count", "Pendências", "number", width=150),
        Column("position", "Ordem no Relatório", "number", default_visible=False),
        Column(
            "run_stale",
            "Execução",
            "bool",
            facet=True,
            labels=((True, "Desatualizada"), (False, "Atual")),
            default_visible=False,
        ),
        Column("imported_at", "Importado", "date", default_visible=False),
    ),
)

# ------------------------------------------------------- lacunas documentais

_GAP_STATUS = (("open", "Em aberto"), ("received", "Recebida"), ("dismissed", "Dispensada"))


def _load_gaps(db: Session, user: User, scope: str | None) -> list[Row]:
    return [
        {
            "id": gap.id,
            "_stamp": gap.status,
            "description": gap.description,
            "reason": gap.reason,
            "status": gap.status,
            "source": gap.source,
            "created_at": gap.created_at,
        }
        for gap in db.scalars(
            select(MissingPiece).where(
                MissingPiece.organization_id == user.organization_id,
                MissingPiece.opportunity_id == scope,
            )
        )
    ]


GAPS_TABLE = TableDef(
    key="missing_pieces",
    load=_load_gaps,
    scoped=True,
    default_sort=(("status", False), ("created_at", False)),
    columns=(
        Column("description", "Lacuna", "text", required=True, width=360),
        Column(
            "status",
            "Situação",
            "enum",
            facet=True,
            labels=_GAP_STATUS,
            width=160,
            help="Lacuna em aberto é peça esperada e não recebida; não equivale a ausência "
            "de irregularidade.",
        ),
        Column("reason", "Motivo", "text", width=320),
        Column(
            "source",
            "Como Surgiu",
            "enum",
            facet=True,
            labels=(("import", "Identificada na importação"), ("manual", "Registrada manualmente")),
            width=220,
        ),
        Column("created_at", "Registrada", "date", width=180),
    ),
)

# -------------------------------------------- cenarios dos demonstrativos


def _load_calculation_scenarios(db: Session, user: User, scope: str | None) -> list[Row]:
    """Uma linha por cenario de cada execucao: os numeros sao os gravados, sem recalculo."""
    rows: list[Row] = []
    for run in db.scalars(
        select(CalculationRun).where(
            CalculationRun.organization_id == user.organization_id,
            CalculationRun.opportunity_id == scope,
        )
    ):
        for side, result_key in (("claimant", "net_receipt"), ("defendant", "net_reduction")):
            statement = run.result.get(side)
            if not statement:
                continue
            for scenario in statement["scenarios"]:
                present = scenario.get("net_present_value")
                probability = scenario.get("probability")
                impacts = scenario.get("impacts", [])
                rows.append(
                    {
                        "id": f"{run.id}:{side}:{scenario['id']}",
                        "_refs": {"detail": f"{run.id}:{side}:{scenario['id']}"},
                        "_stamp": run.stale,
                        "scenario": scenario["label"],
                        "side": side,
                        "net_result": Decimal(scenario[result_key]),
                        "present_value": None if present is None else Decimal(present),
                        "probability": None if probability is None else Decimal(probability),
                        "impacts_applied": sum(1 for i in impacts if i["applied"]),
                        "impacts_not_applied": sum(1 for i in impacts if not i["applied"]),
                        "stale": run.stale,
                        "formula_version": run.formula_version,
                        "dossier_version": run.dossier_version,
                        "created_at": run.created_at,
                    }
                )
    return rows


CALCULATIONS_TABLE = TableDef(
    key="calculation_scenarios",
    load=_load_calculation_scenarios,
    scoped=True,
    default_sort=(("created_at", True), ("side", False)),
    columns=(
        Column("scenario", "Cenário", "text", required=True, width=260),
        Column(
            "side",
            "Demonstrativo",
            "enum",
            facet=True,
            labels=(("claimant", "Recebimento do autor"), ("defendant", "Redução de passivo")),
            width=220,
        ),
        Column(
            "net_result",
            "Resultado Líquido",
            "money",
            width=200,
            help="Recebimento líquido do autor ou redução líquida de passivo do réu, como "
            "gravado na execução. Metodologia não homologada.",
        ),
        Column("present_value", "Valor Presente", "money", width=190),
        Column("probability", "Probabilidade", "number", width=160, default_visible=False),
        Column("impacts_applied", "Impactos Aplicados", "number", width=190),
        Column(
            "impacts_not_applied",
            "Impactos Não Aplicados",
            "number",
            width=220,
            default_visible=False,
        ),
        Column(
            "stale",
            "Situação",
            "bool",
            facet=True,
            labels=((False, "Vigente"), (True, "Desatualizado")),
            width=160,
        ),
        Column("formula_version", "Fórmula", "text", facet=True, width=150),
        Column("dossier_version", "Versão do Dossiê", "number", default_visible=False),
        Column("created_at", "Calculado", "date", width=180),
    ),
)

TABLES: dict[str, TableDef] = {
    t.key: t
    for t in (
        OPPORTUNITIES,
        DOCUMENTS,
        CLAIMS,
        ROLES_TABLE,
        OCCURRENCES_TABLE,
        FINDINGS_TABLE,
        P4_ITEMS_TABLE,
        GAPS_TABLE,
        CALCULATIONS_TABLE,
    )
}


# ------------------------------------------------------------------ consulta


def get_table(table_key: str) -> TableDef:
    table = TABLES.get(table_key)
    if table is None:
        raise ApiError(404, "not_found", "Tabela não encontrada.")
    return table


ALL_ROLES = frozenset({"admin", "analyst", "reviewer", "viewer"})
STAFF_ROLES = frozenset({"admin", "analyst", "reviewer"})

# Politica padrao de colunas por papel (D5, assumida e configuravel): o papel de leitura nao
# ve identificadores tecnicos da origem nem dados de integridade e armazenamento do arquivo.
# Tudo o mais e visivel a todos os papeis da organizacao.
DEFAULT_COLUMN_POLICY: dict[str, frozenset[str]] = {
    "opportunities.origin_external_id": STAFF_ROLES,
    "documents.sha256": STAFF_ROLES,
    "documents.filename": STAFF_ROLES,
}
_column_policy: dict[str, frozenset[str]] = dict(DEFAULT_COLUMN_POLICY)


def configure_column_policy(overrides: dict[str, list[str]] | None) -> None:
    """Aplica a politica: padrao + ajustes de `EVIDIA_COLUMN_POLICY` ({"tabela.coluna": [papeis]}).

    `["*"]` libera a coluna a todos os papeis. Chave ou papel desconhecido e erro de
    configuracao: politica com erro de digitacao nao pode valer em silencio. Coluna que
    identifica o registro (obrigatoria) nao pode ser restrita.
    """
    policy = dict(DEFAULT_COLUMN_POLICY)
    for key, roles in (overrides or {}).items():
        table_key, _, column_key = key.partition(".")
        table = TABLES.get(table_key)
        column = next((c for c in table.columns if c.key == column_key), None) if table else None
        if column is None:
            raise ValueError(f"EVIDIA_COLUMN_POLICY: coluna desconhecida: {key}")
        if column.required:
            raise ValueError(
                f"EVIDIA_COLUMN_POLICY: {key} identifica o registro e não pode ser restrita"
            )
        wanted = ALL_ROLES if list(roles) == ["*"] else frozenset(roles)
        if not wanted or not wanted <= ALL_ROLES:
            raise ValueError(f"EVIDIA_COLUMN_POLICY: papéis inválidos em {key}: {sorted(roles)}")
        policy[key] = wanted
    _column_policy.clear()
    _column_policy.update(policy)


def column_roles(table: TableDef, column: Column) -> frozenset[str] | None:
    """Papeis que enxergam a coluna; None = todos. A restricao da definicao da coluna vence."""
    if column.allowed_roles is not None:
        return column.allowed_roles
    return _column_policy.get(f"{table.key}.{column.key}")


def visible_columns(table: TableDef, user: User) -> dict[str, Column]:
    out: dict[str, Column] = {}
    for column in table.columns:
        roles = column_roles(table, column)
        if roles is None or user.role in roles:
            out[column.key] = column
    return out


def _unknown(column: str) -> ApiError:
    # Coluna proibida responde como inexistente: nao revela que existe.
    return ApiError(422, "unknown_column", f"Coluna desconhecida: {column}.")


def _invalid(message: str) -> ApiError:
    return ApiError(422, "invalid_filter", message)


def canon(value: Any) -> str | None:
    """Forma textual estavel de um valor, usada em facetas e filtros por valor."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, datetime):
        return _as_utc(value).isoformat()
    return str(value)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _parse_bound(raw: str, kind: str, *, upper: bool) -> Any:
    try:
        if kind in ("number", "money"):
            return Decimal(raw)
        if len(raw) == 10:  # AAAA-MM-DD: o dia inteiro, em UTC
            day = date.fromisoformat(raw)
            return datetime.combine(day, time.max if upper else time.min, tzinfo=UTC)
        return _as_utc(datetime.fromisoformat(raw))
    except (ValueError, InvalidOperation) as exc:
        raise _invalid(f"Limite inválido para o filtro: {raw!r}.") from exc


def _matches(column: Column, flt: ColumnFilter, value: Any) -> bool:
    empty = value is None or value == ""
    if flt.values is not None and canon(value) not in set(flt.values):
        return False
    if flt.op == "empty":
        return empty
    if flt.op == "not_empty":
        return not empty
    if flt.op in ("contains", "equals"):
        needle = (flt.text or "").strip().casefold()
        if not needle:
            return True
        haystack = column.label_for(value).casefold() if not empty else ""
        raw = "" if empty else str(value).casefold()
        if flt.op == "equals":
            return needle in (haystack, raw)
        return needle in haystack or needle in raw
    if flt.op == "between":
        if column.kind not in ("number", "money", "date"):
            raise _invalid(f"Intervalo não se aplica à coluna {column.key}.")
        if empty:
            return False
        comparable = (
            _as_utc(value) if column.kind == "date" else Decimal(value)  # type: ignore[arg-type]
        )
        if flt.min and comparable < _parse_bound(flt.min, column.kind, upper=False):
            return False
        if flt.max and comparable > _parse_bound(flt.max, column.kind, upper=True):
            return False
    return True


def _apply(rows: list[Row], filters: list[tuple[Column, ColumnFilter]]) -> list[Row]:
    return [r for r in rows if all(_matches(c, f, r[c.key]) for c, f in filters)]


def _sort_key(column: Column, value: Any) -> Any:
    if column.kind == "date":
        return _as_utc(value)
    if column.kind in ("number", "money", "bool"):
        return value
    return column.label_for(value).casefold()


def _sorted(rows: list[Row], order: list[tuple[Column, bool]]) -> list[Row]:
    out = sorted(rows, key=lambda r: r["id"])  # desempate estavel por ID
    for column, descending in reversed(order):
        present = [r for r in out if r[column.key] not in (None, "")]
        missing = [r for r in out if r[column.key] in (None, "")]
        present.sort(key=lambda r: _sort_key(column, r[column.key]), reverse=descending)
        out = present + missing  # nulos no fim, nas duas direcoes
    return out


def _result_version(rows: list[Row]) -> str:
    digest = hashlib.sha256()
    for row in sorted(rows, key=lambda r: r["id"]):
        stamp = row["_stamp"] if "_stamp" in row else row.get("updated_at")
        digest.update(f"{row['id']}:{canon(stamp)}\n".encode())
    return digest.hexdigest()[:16]


def _cell(value: Any) -> str | int | bool | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return _as_utc(value).isoformat()
    if isinstance(value, Decimal):
        return str(value)  # dinheiro e fracao trafegam como texto decimal
    return value


@dataclass(frozen=True)
class Resolved:
    table: TableDef
    columns: dict[str, Column]
    all_rows: list[Row]
    filters: list[tuple[Column, ColumnFilter]]
    rows: list[Row]  # filtradas e ordenadas, conjunto inteiro


def resolve(db: Session, user: User, table_key: str, query: TableQuery) -> Resolved:
    table = get_table(table_key)
    if table.scoped:
        if not query.scope_id:
            raise ApiError(
                422, "scope_required", "Esta tabela pertence a um dossiê: informe a oportunidade."
            )
        # Oportunidade de outra organizacao responde como inexistente.
        dossier.get_opportunity(db, user, query.scope_id)
    elif query.scope_id:
        raise ApiError(422, "invalid_request", "Esta tabela não aceita escopo de oportunidade.")
    columns = visible_columns(table, user)

    filters: list[tuple[Column, ColumnFilter]] = []
    for flt in query.filters:
        column = columns.get(flt.column)
        if column is None or not column.filterable:
            raise _unknown(flt.column)
        filters.append((column, flt))

    order: list[tuple[Column, bool]] = []
    for spec in query.sort:
        column = columns.get(spec.column)
        if column is None or not column.sortable:
            raise _unknown(spec.column)
        order.append((column, spec.direction == "desc"))
    if not order:
        order = [(columns[key], desc) for key, desc in table.default_sort if key in columns]

    all_rows = table.load(db, user, query.scope_id if table.scoped else None)
    return Resolved(table, columns, all_rows, filters, _sorted(_apply(all_rows, filters), order))


def _facets(resolved: Resolved) -> dict[str, list[FacetValue]]:
    out: dict[str, list[FacetValue]] = {}
    for column in resolved.columns.values():
        if not column.facet:
            continue
        others = [(c, f) for c, f in resolved.filters if c.key != column.key]
        tally: dict[str | None, int] = {}
        samples: dict[str | None, Any] = {}
        for row in _apply(resolved.all_rows, others):
            key = canon(row[column.key])
            tally[key] = tally.get(key, 0) + 1
            samples[key] = row[column.key]
        # Valores ja selecionados continuam visiveis mesmo sem ocorrencias.
        for _, flt in ((c, f) for c, f in resolved.filters if c.key == column.key):
            for selected in flt.values or []:
                if selected not in tally:
                    tally[selected] = 0
                    samples[selected] = _from_canon(column, selected)
        values = [
            FacetValue(value=key, label=column.label_for(samples[key]), count=count)
            for key, count in tally.items()
        ]
        values.sort(key=lambda v: (v.value is None, v.label.casefold()))
        out[column.key] = values
    return out


def _from_canon(column: Column, value: str | None) -> Any:
    if value is None:
        return None
    if column.kind == "bool":
        return value == "true"
    return value


def column_out(table: TableDef, column: Column) -> TableColumnOut:
    return TableColumnOut(
        key=column.key,
        label=column.label,
        kind=column.kind,  # type: ignore[arg-type]
        sortable=column.sortable,
        filterable=column.filterable,
        facet=column.facet,
        required=column.required,
        default_visible=column.default_visible,
        # O texto de ajuda vem de table_help (formato do guia editorial); o da definicao da
        # coluna so vale para coluna que ainda nao esteja la.
        help=help_for(table.key, column.key, column.help),
        default_width=column.width,
    )


def run_query(db: Session, user: User, table_key: str, query: TableQuery) -> TableQueryOut:
    resolved = resolve(db, user, table_key, query)
    total = len(resolved.rows)
    page_count = max(1, -(-total // query.page_size))
    page = min(query.page, page_count)
    start = (page - 1) * query.page_size
    return TableQueryOut(
        table=resolved.table.key,
        columns=[column_out(resolved.table, c) for c in resolved.columns.values()],
        rows=[
            TableRow(
                id=row["id"],
                is_synthetic=bool(row.get("is_synthetic")),
                values={key: _cell(row[key]) for key in resolved.columns},
                refs=row.get("_refs", {}),
            )
            for row in resolved.rows[start : start + query.page_size]
        ],
        total=total,
        unfiltered_total=len(resolved.all_rows),
        page=page,
        page_size=query.page_size,
        page_count=page_count,
        facets=_facets(resolved),
        result_version=_result_version(resolved.rows),
        all_ids=[row["id"] for row in resolved.rows] if query.include_ids else None,
    )


def export_rows(
    db: Session,
    user: User,
    table_key: str,
    query: TableQuery,
    requested: list[str],
    ids: list[str] | None,
) -> tuple[list[list[object]], int]:
    """Linhas para CSV. A autorizacao e reaplicada aqui: a exportacao nao confia na tela."""
    from evidia.domain.csvsafe import Trusted, decimal_br

    resolved = resolve(db, user, table_key, query)
    chosen: list[Column] = [c for c in resolved.columns.values() if c.required]
    for key in requested:
        column = resolved.columns.get(key)
        if column is None:
            raise _unknown(key)
        if column not in chosen:
            chosen.append(column)

    rows = resolved.rows
    if ids is not None:
        wanted = set(ids)
        # IDs de outra organizacao simplesmente nao existem neste conjunto.
        rows = [r for r in rows if r["id"] in wanted]

    def cell(column: Column, value: Any) -> object:
        if value is None or value == "":
            return None
        if column.kind == "date":
            return Trusted(_as_utc(value).isoformat(timespec="seconds"))
        if column.kind == "money":
            return decimal_br(str(value))
        if column.kind == "number":
            return Trusted(str(value))
        if column.kind in ("enum", "bool"):
            return column.label_for(value)
        return str(value)

    table = [[c.label for c in chosen], *([cell(c, r[c.key]) for c in chosen] for r in rows)]
    return table, len(rows)


# -------------------------------------------------------------- visoes salvas


def sanitize_view(table: TableDef, user: User, config: TableViewConfig) -> TableViewConfig:
    """Remove da visao tudo o que o usuario nao pode ver. Aplicado ao gravar e ao ler:
    uma visao antiga nao devolve coluna que deixou de ser permitida."""
    columns = visible_columns(table, user)
    seen: set[str] = set()
    kept: list[ViewColumn] = []
    for entry in config.columns:
        column = columns.get(entry.key)
        if column is None or entry.key in seen:
            continue
        seen.add(entry.key)
        kept.append(entry.model_copy(update={"visible": entry.visible or column.required}))
    return TableViewConfig(
        columns=kept,
        filters=[f for f in config.filters if f.column in columns and columns[f.column].filterable],
        sort=[s for s in config.sort if s.column in columns and columns[s.column].sortable],
        page_size=config.page_size,
    )
