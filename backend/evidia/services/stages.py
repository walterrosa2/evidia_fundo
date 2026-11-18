"""Estado das seis etapas da jornada (RF15), derivado do dossie no servidor.

A regra de cada etapa e pura (`domain`-like, sem banco) para ser testada com contagens;
`stages_for` so coleta as contagens. Nenhum estado e presumido: sem dado, a etapa fica
"nao iniciada".
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from evidia.models import (
    CalculationRun,
    Claim,
    Document,
    DocumentVersion,
    EngineFinding,
    EngineRun,
    ImportConflict,
    Memo,
    MissingPiece,
    Occurrence,
    Opportunity,
    Plea,
    ScenarioRun,
)

STATUSES = (
    "not_started",
    "in_progress",
    "partial",
    "waiting_document",
    "waiting_review",
    "completed",
    "stale",
    "failed",
)

TITLES = (
    ("entry", "Entrada do ativo"),
    ("structuring", "Estruturação e rastreabilidade"),
    ("engines", "Motores de inteligência"),
    ("adversarial", "Contraditório: autor e réu"),
    ("economics", "Avaliação econômica"),
    ("decision", "Decisão e negociação"),
)


@dataclass
class Counts:
    """Contagens do dossie usadas pelas regras de etapa."""

    draft_process: bool = False
    has_full_record: bool = False
    open_gaps: int = 0
    open_conflicts: int = 0
    documents: int = 0
    documents_needing_ocr: int = 0
    claims: int = 0
    claims_pending: int = 0
    claims_stale: int = 0
    engine_runs: dict[str, int] = field(default_factory=dict)  # por status, so vigentes
    engine_runs_stale: int = 0
    findings_pending: int = 0
    occurrences: int = 0
    occurrences_pending: int = 0
    pleas: int = 0
    scenarios_running: int = 0
    scenario_sides_current: set[str] = field(default_factory=set)  # lados concluidos, versao atual
    scenarios_completed_old: int = 0
    calculations: int = 0
    calculations_current: int = 0
    memos: int = 0
    latest_memo_stale: bool = False
    latest_memo_decision: str | None = None


def _plural(n: int, one: str, many: str) -> str:
    return f"{n} {one if n == 1 else many}"


def _stage(status: str, summary: str, pending: list[str] | None = None) -> dict:
    return {"status": status, "summary": summary, "pending": pending or []}


def entry(c: Counts) -> dict:
    pending = []
    if c.draft_process:
        pending.append("Processo em rascunho: CNJ ausente ou inválido.")
    if c.open_conflicts:
        pending.append(
            _plural(c.open_conflicts, "conflito de identidade", "conflitos de identidade")
            + " a revisar."
        )
    if not c.has_full_record:
        pending.append("Autos integrais não recebidos.")
    if c.open_gaps:
        pending.append(
            _plural(c.open_gaps, "lacuna documental aberta", "lacunas documentais abertas") + "."
        )
    if c.open_conflicts or c.draft_process:
        return _stage("waiting_review", "Identificação do ativo depende de revisão.", pending)
    if pending:
        return _stage("waiting_document", "Ativo identificado; documentação pendente.", pending)
    return _stage("completed", "Ativo identificado, sem lacuna documental aberta.")


def structuring(c: Counts) -> dict:
    if c.documents == 0:
        return _stage("not_started", "Nenhum documento no dossiê.")
    pending = []
    if c.documents_needing_ocr:
        pending.append(
            _plural(c.documents_needing_ocr, "documento sem texto", "documentos sem texto")
            + " (leitura por OCR pendente)."
        )
    if c.claims_stale:
        pending.append(
            _plural(c.claims_stale, "afirmação desatualizada", "afirmações desatualizadas")
            + " por nova versão de documento."
        )
    if c.claims_pending:
        pending.append(
            _plural(c.claims_pending, "afirmação aguarda", "afirmações aguardam") + " revisão."
        )
    docs = _plural(c.documents, "documento", "documentos")
    claims = _plural(c.claims, "afirmação", "afirmações")
    if c.claims == 0:
        return _stage("in_progress", f"{docs}; nenhuma afirmação registrada.", pending)
    if c.claims_stale:
        return _stage("stale", f"{docs}, {claims}; há afirmações desatualizadas.", pending)
    if c.claims_pending:
        return _stage("waiting_review", f"{docs}, {claims}.", pending)
    return _stage(
        "completed" if not pending else "partial", f"{docs}, {claims} revisadas.", pending
    )


def engines(c: Counts) -> dict:
    current = sum(c.engine_runs.values())
    if current == 0 and c.engine_runs_stale == 0 and c.occurrences == 0:
        return _stage("not_started", "Nenhum motor executado e nenhuma diligência registrada.")
    pending = []
    if c.findings_pending:
        pending.append(
            _plural(c.findings_pending, "achado aguarda", "achados aguardam") + " revisão."
        )
    if c.occurrences_pending:
        pending.append(
            _plural(
                c.occurrences_pending,
                "ocorrência de diligência aguarda",
                "ocorrências de diligência aguardam",
            )
            + " revisão."
        )
    runs = c.engine_runs
    summary = (
        f"{_plural(current, 'execução vigente', 'execuções vigentes')} de motor; "
        f"{_plural(c.occurrences, 'ocorrência', 'ocorrências')} de diligência."
    )
    if runs.get("queued", 0) + runs.get("running", 0):
        return _stage("in_progress", summary, pending)
    if current == 0 and c.engine_runs_stale:
        pending.insert(0, "As execuções de motor são anteriores à versão atual do dossiê.")
        return _stage("stale", summary, pending)
    if runs.get("failed", 0) and not runs.get("completed", 0) and not runs.get("partial", 0):
        pending.insert(0, "A execução de motor falhou.")
        return _stage("failed", summary, pending)
    if runs.get("partial", 0):
        pending.insert(0, "Há execução parcial: blocos não concluídos.")
        return _stage("partial", summary, pending)
    if pending:
        return _stage("waiting_review", summary, pending)
    return _stage("completed", summary)


def adversarial(c: Counts) -> dict:
    sides = c.scenario_sides_current
    if c.pleas == 0 and not sides and not c.scenarios_running and not c.scenarios_completed_old:
        return _stage("not_started", "Nenhum pedido individualizado.")
    if c.scenarios_running:
        return _stage(
            "in_progress",
            _plural(c.scenarios_running, "cenário em elaboração", "cenários em elaboração") + ".",
        )
    if not sides:
        if c.scenarios_completed_old:
            return _stage(
                "stale",
                "Os cenários concluídos são anteriores à versão atual do dossiê.",
                ["Refazer os cenários sobre a versão atual das evidências."],
            )
        return _stage(
            "in_progress",
            _plural(c.pleas, "pedido", "pedidos") + "; nenhum cenário concluído.",
            ["Nenhum lado foi analisado."],
        )
    if sides >= {"claimant", "defendant"}:
        return _stage("completed", "Autor e réu com cenário concluído na versão atual do dossiê.")
    missing = "réu" if "claimant" in sides else "autor"
    return _stage(
        "partial",
        "Só um lado tem cenário concluído.",
        [f"Lado do {missing} não analisado: não há valor substituto."],
    )


def economics(c: Counts) -> dict:
    if c.calculations == 0:
        return _stage("not_started", "Nenhum demonstrativo calculado.")
    if c.calculations_current == 0:
        return _stage(
            "stale",
            "Os demonstrativos são anteriores à versão atual do dossiê.",
            ["Calcular novamente com os documentos atuais."],
        )
    return _stage(
        "completed",
        "Demonstrativo vigente. Metodologia não homologada; contrato não definido.",
    )


def decision(c: Counts) -> dict:
    if c.memos == 0:
        return _stage("not_started", "Nenhum memorando emitido.")
    if c.latest_memo_stale:
        return _stage(
            "stale",
            "O memorando mais recente é anterior à versão atual do dossiê.",
            ["Recalcular e emitir novo memorando."],
        )
    if c.latest_memo_decision == "approved":
        return _stage("completed", "Memorando vigente aprovado por responsável.")
    if c.latest_memo_decision == "returned":
        return _stage(
            "in_progress",
            "Memorando devolvido pelo responsável.",
            ["Tratar a devolução e emitir nova versão."],
        )
    return _stage(
        "waiting_review",
        "Memorando emitido, sem decisão do responsável.",
        ["Memorando aguarda aprovação ou devolução."],
    )


RULES = (entry, structuring, engines, adversarial, economics, decision)


def build(c: Counts) -> list[dict]:
    return [
        {"number": n, "key": key, "title": title, **rule(c)}
        for n, ((key, title), rule) in enumerate(zip(TITLES, RULES, strict=True), start=1)
    ]


def _count(db: Session, model, *where) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*where)) or 0


def collect(db: Session, opp: Opportunity, *, draft_process: bool) -> Counts:
    oid = opp.id
    c = Counts(draft_process=draft_process)
    c.has_full_record = (
        _count(db, Document, Document.opportunity_id == oid, Document.category == "full_record") > 0
    )
    c.open_gaps = _count(
        db, MissingPiece, MissingPiece.opportunity_id == oid, MissingPiece.status == "open"
    )
    c.open_conflicts = _count(
        db, ImportConflict, ImportConflict.opportunity_id == oid, ImportConflict.status == "open"
    )
    c.documents = _count(db, Document, Document.opportunity_id == oid)
    c.documents_needing_ocr = (
        db.scalar(
            select(func.count(func.distinct(DocumentVersion.document_id)))
            .join(Document, Document.id == DocumentVersion.document_id)
            .where(Document.opportunity_id == oid, DocumentVersion.state == "needs_ocr")
        )
        or 0
    )
    c.claims = _count(db, Claim, Claim.opportunity_id == oid)
    c.claims_stale = _count(db, Claim, Claim.opportunity_id == oid, Claim.stale.is_(True))
    c.claims_pending = _count(
        db,
        Claim,
        Claim.opportunity_id == oid,
        Claim.stale.is_(False),
        Claim.review_state.in_(("pending", "in_review")),
    )
    rows = db.execute(
        select(EngineRun.status, func.count())
        .where(EngineRun.opportunity_id == oid, EngineRun.stale.is_(False))
        .group_by(EngineRun.status)
    ).all()
    c.engine_runs = {status: n for status, n in rows if status != "cancelled"}
    c.engine_runs_stale = _count(
        db, EngineRun, EngineRun.opportunity_id == oid, EngineRun.stale.is_(True)
    )
    c.findings_pending = (
        db.scalar(
            select(func.count())
            .select_from(EngineFinding)
            .join(EngineRun, EngineRun.id == EngineFinding.run_id)
            .where(
                EngineFinding.opportunity_id == oid,
                EngineRun.stale.is_(False),
                EngineFinding.review_state.in_(("pending", "in_review")),
            )
        )
        or 0
    )
    c.occurrences = _count(db, Occurrence, Occurrence.opportunity_id == oid)
    c.occurrences_pending = _count(
        db,
        Occurrence,
        Occurrence.opportunity_id == oid,
        Occurrence.state.notin_(("validated", "discarded", "forwarded_legal")),
    )
    c.pleas = _count(db, Plea, Plea.opportunity_id == oid)
    c.scenarios_running = _count(
        db, ScenarioRun, ScenarioRun.opportunity_id == oid, ScenarioRun.status == "running"
    )
    c.scenario_sides_current = set(
        db.scalars(
            select(ScenarioRun.simulated_side)
            .where(
                ScenarioRun.opportunity_id == oid,
                ScenarioRun.status == "completed",
                ScenarioRun.dossier_version == opp.dossier_version,
            )
            .distinct()
        )
    )
    c.scenarios_completed_old = _count(
        db,
        ScenarioRun,
        ScenarioRun.opportunity_id == oid,
        ScenarioRun.status == "completed",
        ScenarioRun.dossier_version != opp.dossier_version,
    )
    c.calculations = _count(db, CalculationRun, CalculationRun.opportunity_id == oid)
    c.calculations_current = _count(
        db, CalculationRun, CalculationRun.opportunity_id == oid, CalculationRun.stale.is_(False)
    )
    c.memos = _count(db, Memo, Memo.opportunity_id == oid)
    latest = db.scalar(
        select(Memo).where(Memo.opportunity_id == oid).order_by(Memo.version.desc()).limit(1)
    )
    if latest is not None:
        c.latest_memo_stale = latest.stale
        c.latest_memo_decision = latest.decision
    return c
