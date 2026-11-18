"""Diligencia de vinculos: participantes, papeis, pesquisas, cruzamentos e ocorrencias.

Tudo aqui e escopado ao dossie e a organizacao da sessao. Identidade nunca e unida pelo
nome; unir duas fichas e ato de revisor, com motivo, e pode ser desfeito.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from evidia.adapters.diligence import ConnectorResult, DiligenceConnector, DiligenceError
from evidia.domain import diligence as rules
from evidia.domain.cnj import InvalidCnj, parse_cnj
from evidia.errors import ApiError, forbidden, not_found
from evidia.logging_setup import audit
from evidia.models import (
    DiligenceSearch,
    DocumentVersion,
    Occurrence,
    OccurrenceReview,
    Opportunity,
    Participant,
    ProcessRole,
    User,
    utcnow,
)
from evidia.schemas_diligence import (
    CooccurrenceOut,
    CrosscheckOut,
    OccurrenceOut,
    OccurrenceReviewOut,
    OccurrenceSheet,
    ParticipantOut,
    RecurrenceOut,
    RoleOut,
    SearchOut,
    SubjectCrosscheck,
)
from evidia.services import dossier

TIMEZONE = "America/Sao_Paulo"


def today() -> date:
    return datetime.now(ZoneInfo(TIMEZONE)).date()


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def normalize_cnj(raw: str) -> str:
    """CNJ valido e guardado na forma canonica; texto invalido e mantido como veio, para
    nao inventar um numero."""
    try:
        return parse_cnj(raw).masked
    except (InvalidCnj, AttributeError):
        return raw.strip()


# ------------------------------------------------------------- participantes


def get_participant(db: Session, user: User, participant_id: str) -> Participant:
    found = db.scalar(
        select(Participant).where(
            Participant.id == participant_id, Participant.organization_id == user.organization_id
        )
    )
    if found is None:
        raise not_found("Participante")
    return found


def _active(db: Session, opportunity_id: str) -> list[Participant]:
    return list(
        db.scalars(
            select(Participant)
            .where(
                Participant.opportunity_id == opportunity_id, Participant.merged_into_id.is_(None)
            )
            .order_by(Participant.name, Participant.id)
        ).all()
    )


def _roles(db: Session, opportunity_id: str) -> list[ProcessRole]:
    return list(
        db.scalars(
            select(ProcessRole)
            .where(ProcessRole.opportunity_id == opportunity_id)
            .order_by(ProcessRole.event_date, ProcessRole.cnj, ProcessRole.id)
        ).all()
    )


def role_out(role: ProcessRole) -> RoleOut:
    return RoleOut.model_validate(role)


def participants_out(db: Session, opportunity_id: str) -> list[ParticipantOut]:
    people = _active(db, opportunity_id)
    roles = _roles(db, opportunity_id)
    groups = rules.homonym_groups([rules.Person(p.id, p.name, p.identifiers or []) for p in people])
    homonyms: dict[str, list[str]] = {}
    for group in groups:
        for person_id in group:
            homonyms[person_id] = [other for other in group if other != person_id]
    return [
        ParticipantOut(
            id=p.id,
            opportunity_id=p.opportunity_id,
            kind=p.kind,
            name=p.name,
            identifiers=p.identifiers or [],
            specialty=p.specialty,
            locality=p.locality,
            note=p.note,
            identity_status=p.identity_status,
            identity_note=p.identity_note,
            merged_into_id=p.merged_into_id,
            is_synthetic=p.is_synthetic,
            roles=[role_out(r) for r in roles if r.participant_id == p.id],
            homonym_ids=homonyms.get(p.id, []),
            created_at=_as_utc(p.created_at),
            updated_at=_as_utc(p.updated_at),
        )
        for p in people
    ]


def participant_out(db: Session, participant: Participant) -> ParticipantOut:
    return next(
        p for p in participants_out(db, participant.opportunity_id) if p.id == participant.id
    )


def create_participant(
    db: Session, user: User, opportunity_id: str, data: dict[str, Any]
) -> Participant:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    participant = Participant(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        kind=data["kind"],
        name=data["name"].strip(),
        name_key=rules.normalize_name(data["name"]),
        identifiers=data.get("identifiers") or [],
        specialty=data.get("specialty") or "",
        locality=data.get("locality") or "",
        note=data.get("note") or "",
        is_synthetic=opp.is_synthetic,
        created_by=user.id,
    )
    db.add(participant)
    db.commit()
    audit(
        "diligence.participant.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{participant.id}",
        outcome="created",
        data={"opportunity_id": opp.id, "kind": participant.kind},
    )
    return participant


def update_participant(
    db: Session, user: User, participant_id: str, data: dict[str, Any]
) -> Participant:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    participant = get_participant(db, user, participant_id)
    changed = []
    for key in ("name", "identifiers", "specialty", "locality", "note"):
        if data.get(key) is not None:
            setattr(
                participant, key, data[key].strip() if isinstance(data[key], str) else data[key]
            )
            changed.append(key)
    if "name" in changed:
        participant.name_key = rules.normalize_name(participant.name)
    status = data.get("identity_status")
    if status is not None and status != participant.identity_status:
        if user.role not in dossier.REVIEWER_ROLES:
            raise forbidden("Confirmar identidade exige papel de revisor.")
        note = (data.get("identity_note") or "").strip()
        if status == "confirmed" and len(note) < 3:
            raise ApiError(
                422,
                "identity_basis_required",
                "Informe com base em que a identidade foi confirmada.",
            )
        participant.identity_status = status
        participant.identity_note = note
        changed.append("identity_status")
    participant.updated_at = utcnow()
    db.commit()
    audit(
        "diligence.participant.update",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{participant.id}",
        outcome="updated",
        data={"fields": changed, "identity_status": participant.identity_status},
    )
    return participant


def merge_participants(
    db: Session, user: User, participant_id: str, into_id: str, reason: str
) -> Participant:
    """Une duas fichas por decisao de revisor. A ficha de origem e preservada e a uniao
    guarda o que moveu, para poder ser desfeita."""
    if user.role not in dossier.REVIEWER_ROLES:
        raise forbidden("Unir fichas exige papel de revisor.")
    source = get_participant(db, user, participant_id)
    target = get_participant(db, user, into_id)
    if source.id == target.id or source.opportunity_id != target.opportunity_id:
        raise ApiError(422, "invalid_merge", "As fichas precisam ser distintas e do mesmo dossiê.")
    if source.merged_into_id or target.merged_into_id:
        raise ApiError(409, "invalid_merge", "Uma das fichas já foi unida a outra.")
    roles = db.scalars(select(ProcessRole).where(ProcessRole.participant_id == source.id)).all()
    subject_of = db.scalars(
        select(Occurrence).where(Occurrence.subject_participant_id == source.id)
    ).all()
    related_of = db.scalars(
        select(Occurrence).where(Occurrence.related_participant_id == source.id)
    ).all()
    for role in roles:
        role.participant_id = target.id
    for item in subject_of:
        item.subject_participant_id = target.id
    for item in related_of:
        item.related_participant_id = target.id
    source.merged_into_id = target.id
    source.merge_log = {
        "reason": reason.strip(),
        "merged_by": user.id,
        "merged_at": utcnow().isoformat(),
        "role_ids": [r.id for r in roles],
        "subject_occurrence_ids": [o.id for o in subject_of],
        "related_occurrence_ids": [o.id for o in related_of],
    }
    source.updated_at = target.updated_at = utcnow()
    db.commit()
    audit(
        "diligence.participant.merge",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{source.id}",
        outcome="merged",
        data={"into": target.id, "roles": len(roles)},
    )
    return target


def unmerge_participant(db: Session, user: User, participant_id: str) -> Participant:
    if user.role not in dossier.REVIEWER_ROLES:
        raise forbidden("Desfazer união exige papel de revisor.")
    source = get_participant(db, user, participant_id)
    if not source.merged_into_id:
        raise ApiError(409, "invalid_merge", "Esta ficha não está unida a outra.")
    log = source.merge_log or {}
    for role in db.scalars(
        select(ProcessRole).where(ProcessRole.id.in_(log.get("role_ids") or []))
    ).all():
        role.participant_id = source.id
    for item in db.scalars(
        select(Occurrence).where(Occurrence.id.in_(log.get("subject_occurrence_ids") or []))
    ).all():
        item.subject_participant_id = source.id
    for item in db.scalars(
        select(Occurrence).where(Occurrence.id.in_(log.get("related_occurrence_ids") or []))
    ).all():
        item.related_participant_id = source.id
    previous = source.merged_into_id
    source.merged_into_id = None
    source.merge_log = None
    source.updated_at = utcnow()
    db.commit()
    audit(
        "diligence.participant.unmerge",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{source.id}",
        outcome="unmerged",
        data={"from": previous},
    )
    return source


# -------------------------------------------------------------------- papeis


def add_role(db: Session, user: User, participant_id: str, data: dict[str, Any]) -> ProcessRole:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    participant = get_participant(db, user, participant_id)
    version_id = data.get("document_version_id")
    page = data.get("page_start")
    source_kind = "manual"
    if version_id:
        version = db.scalar(
            select(DocumentVersion).where(
                DocumentVersion.id == version_id,
                DocumentVersion.opportunity_id == participant.opportunity_id,
                DocumentVersion.organization_id == user.organization_id,
            )
        )
        if version is None:
            raise ApiError(422, "invalid_citation", "Documento citado não pertence a este dossiê.")
        if page is None:
            raise ApiError(422, "invalid_citation", "Informe a página do documento citado.")
        if version.page_count is not None and page > version.page_count:
            raise ApiError(
                422,
                "invalid_citation",
                f"Página {page} não existe: o arquivo recebido tem {version.page_count}.",
            )
        source_kind = "dossier"
    elif page is not None:
        raise ApiError(422, "invalid_citation", "Página informada sem documento de origem.")
    role = ProcessRole(
        organization_id=participant.organization_id,
        opportunity_id=participant.opportunity_id,
        participant_id=participant.id,
        cnj=normalize_cnj(data["cnj"]),
        court=data.get("court") or "",
        role=data["role"],
        side=data.get("side") or "none",
        event_date=data.get("event_date"),
        event_label=data.get("event_label") or "",
        filing_date=data.get("filing_date"),
        source_kind=source_kind,
        document_version_id=version_id,
        page_start=page,
        source_ref=data.get("source_ref") or "",
        is_synthetic=participant.is_synthetic,
        created_by=user.id,
    )
    db.add(role)
    db.commit()
    audit(
        "diligence.role.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{participant.id}",
        outcome="created",
        data={"role_id": role.id, "role": role.role, "source_kind": source_kind},
    )
    return role


def delete_role(db: Session, user: User, role_id: str) -> None:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    role = db.scalar(
        select(ProcessRole).where(
            ProcessRole.id == role_id, ProcessRole.organization_id == user.organization_id
        )
    )
    if role is None:
        raise not_found("Papel")
    participant_id = role.participant_id
    db.delete(role)
    db.commit()
    audit(
        "diligence.role.delete",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{participant_id}",
        outcome="deleted",
        data={"role_id": role_id},
    )


# ----------------------------------------------------------------- pesquisas


def search_out(search: DiligenceSearch) -> SearchOut:
    return SearchOut.model_validate(search)


def _resolve_co_participant(db: Session, opp: Opportunity, user: User, co) -> Participant:
    """Reaproveita uma ficha so quando ha identificador forte identico. Nome igual, sem
    identificador comum, gera ficha nova: o homonimo fica separado (AC09)."""
    wanted = rules.strong_keys(co.identifiers)
    if wanted:
        for existing in _active(db, opp.id):
            if wanted & rules.strong_keys(existing.identifiers or []):
                return existing
    created = Participant(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        kind=co.kind,
        name=co.name,
        name_key=rules.normalize_name(co.name),
        identifiers=co.identifiers,
        is_synthetic=True,
        created_by=user.id,
    )
    db.add(created)
    db.flush()
    return created


def _store_result(
    db: Session,
    opp: Opportunity,
    user: User,
    subject: Participant,
    search: DiligenceSearch,
    result: ConnectorResult,
) -> int:
    def exists(participant_id: str, item, role: str) -> bool:
        return (
            db.scalar(
                select(ProcessRole.id).where(
                    ProcessRole.participant_id == participant_id,
                    ProcessRole.cnj == normalize_cnj(item.cnj),
                    ProcessRole.role == role,
                    ProcessRole.source_ref == item.source_ref,
                )
            )
            is not None
        )

    def add(participant: Participant, item, role: str, side: str, event_date) -> None:
        db.add(
            ProcessRole(
                organization_id=opp.organization_id,
                opportunity_id=opp.id,
                participant_id=participant.id,
                cnj=normalize_cnj(item.cnj),
                court=item.court,
                role=role,
                side=side,
                event_date=event_date,
                event_label=item.event_label if participant.id == subject.id else "",
                filing_date=item.filing_date,
                source_kind="connector",
                source_ref=item.source_ref,
                search_id=search.id,
                is_synthetic=result.is_synthetic,
                created_by=user.id,
            )
        )

    stored = 0
    for item in result.items:
        # Repetir a pesquisa nao duplica o que a fonte ja tinha devolvido.
        if not exists(subject.id, item, item.role):
            add(subject, item, item.role, item.side, item.event_date)
            stored += 1
        for co in item.co_participants:
            other = _resolve_co_participant(db, opp, user, co)
            if not exists(other.id, item, co.role):
                add(other, item, co.role, co.side, None)
    return stored


def run_search(
    db: Session,
    user: User,
    connector: DiligenceConnector,
    opportunity_id: str,
    participant_id: str,
    reference: date | None,
) -> DiligenceSearch:
    """Consulta a fonte para um profissional. Falha e 'nada encontrado' sao gravados como
    estados diferentes, com a cobertura que a fonte declara."""
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    subject = get_participant(db, user, participant_id)
    if subject.opportunity_id != opp.id:
        raise not_found("Participante")
    reference = reference or today()
    start, end = rules.window_for(reference)
    search = DiligenceSearch(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        participant_id=subject.id,
        connector=connector.name,
        reference_date=reference,
        window_start=start,
        window_end=end,
        timezone=TIMEZONE,
        criteria={
            "name": subject.name,
            "identifier_types": sorted({i["type"] for i in subject.identifiers or []}),
        },
        status="failed",
        coverage="",
        created_by=user.id,
    )
    name, identifiers = subject.name, list(subject.identifiers or [])
    db.rollback()  # nao segura o banco enquanto a fonte responde
    try:
        result = connector.search(name=name, identifiers=identifiers, start=start, end=end)
    except DiligenceError as exc:
        if exc.code == "diligence_not_configured":
            raise ApiError(exc.status, exc.code, exc.message) from exc
        search.error_code = exc.code
        search.coverage = "Não foi possível consultar a fonte: esta pesquisa não permite conclusão."
        db.add(search)
        db.commit()
        audit(
            "diligence.search",
            actor=user.id,
            organization_id=user.organization_id,
            target=f"participant:{participant_id}",
            outcome=exc.code,
            data={"connector": connector.name, "search_id": search.id},
        )
        return search
    db.add(search)
    db.flush()
    opp = db.get(Opportunity, opportunity_id)
    subject = db.get(Participant, participant_id)
    stored = _store_result(db, opp, user, subject, search, result)
    search.status = "completed" if result.items else "no_results"
    search.coverage = result.coverage
    search.filter_field = result.filter_field
    search.results_count = len(result.items)
    search.is_synthetic = result.is_synthetic
    db.commit()
    audit(
        "diligence.search",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{participant_id}",
        outcome=search.status,
        data={
            "connector": connector.name,
            "search_id": search.id,
            "results": len(result.items),
            "roles_stored": stored,
            "window": [start.isoformat(), end.isoformat()],
        },
    )
    return search


def import_search_file(
    db: Session,
    user: User,
    storage_dir,
    opportunity_id: str,
    data: dict[str, Any],
) -> DiligenceSearch:
    """Grava como pesquisa o resultado de uma consulta feita fora, lido de planilha do dossie.

    Vale o mesmo que para qualquer fonte: os vinculos entram como candidatos, a cobertura e a
    declarada, e planilha invalida e recusada inteira.
    """
    from pathlib import Path

    from evidia.adapters.diligence import parse_result_file

    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    subject = get_participant(db, user, data["participant_id"])
    if subject.opportunity_id != opp.id:
        raise not_found("Participante")
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == data["file_version_id"],
            DocumentVersion.opportunity_id == opp.id,
            DocumentVersion.organization_id == user.organization_id,
        )
    )
    if version is None or not version.filename.lower().endswith(".xlsx"):
        raise ApiError(
            422, "invalid_request", "O resultado precisa ser uma planilha .xlsx deste dossiê."
        )
    path = Path(storage_dir) / version.storage_key
    if not path.is_file():
        raise ApiError(410, "document_content_missing", "Conteúdo da planilha indisponível.")
    try:
        result = parse_result_file(
            path.read_bytes(), coverage=data["coverage"].strip(), is_synthetic=opp.is_synthetic
        )
    except DiligenceError as exc:
        raise ApiError(exc.status, exc.code, exc.message) from exc

    reference = data.get("reference_date") or today()
    start, end = rules.window_for(reference)
    search = DiligenceSearch(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        participant_id=subject.id,
        connector=f"arquivo: {data['source_name'].strip()}",
        reference_date=reference,
        window_start=start,
        window_end=end,
        timezone=TIMEZONE,
        criteria={
            "name": subject.name,
            "identifier_types": sorted({i["type"] for i in subject.identifiers or []}),
            "file_version_id": version.id,
            "file_sha256": version.sha256,
            "collected_by": user.id,
        },
        status="completed" if result.items else "no_results",
        coverage=result.coverage,
        filter_field=result.filter_field,
        results_count=len(result.items),
        is_synthetic=result.is_synthetic,
        created_by=user.id,
    )
    db.add(search)
    db.flush()
    stored = _store_result(db, opp, user, subject, search, result)
    db.commit()
    audit(
        "diligence.search",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"participant:{subject.id}",
        outcome=search.status,
        data={
            "connector": search.connector,
            "search_id": search.id,
            "results": len(result.items),
            "roles_stored": stored,
            "file_sha256": version.sha256,
        },
    )
    return search


def list_searches(db: Session, opportunity_id: str) -> list[DiligenceSearch]:
    return list(
        db.scalars(
            select(DiligenceSearch)
            .where(DiligenceSearch.opportunity_id == opportunity_id)
            .order_by(DiligenceSearch.created_at.desc())
        ).all()
    )


# --------------------------------------------------------------- cruzamentos


def _rule_role(role: ProcessRole) -> rules.Role:
    return rules.Role(
        id=role.id,
        participant_id=role.participant_id,
        cnj=role.cnj,
        role=role.role,
        side=role.side,
        event_date=role.event_date,
        filing_date=role.filing_date,
    )


def crosscheck(
    db: Session, user: User, opportunity_id: str, reference: date | None
) -> CrosscheckOut:
    opp = dossier.get_opportunity(db, user, opportunity_id)
    reference = reference or today()
    start, end = rules.window_for(reference)
    people = {p.id: p for p in _active(db, opp.id)}
    roles = [r for r in _roles(db, opp.id) if r.participant_id in people]
    searches = list_searches(db, opp.id)
    rule_roles = [_rule_role(r) for r in roles]

    subjects: list[SubjectCrosscheck] = []
    limitations: list[str] = []
    experts = sorted(
        {r.participant_id for r in roles if r.role in rules.EXPERT_ROLES},
        key=lambda pid: people[pid].name,
    )
    for pid in experts:
        mine = [r for r in rule_roles if r.participant_id == pid]
        out = rules.crosscheck(pid, mine, rule_roles, start, end)
        own_searches = [s for s in searches if s.participant_id == pid]
        subjects.append(
            SubjectCrosscheck(
                participant_id=pid,
                name=people[pid].name,
                identity_status=people[pid].identity_status,
                roles_in_dossier=sorted({r.role for r in mine}),
                cooccurrences=[
                    CooccurrenceOut(
                        **{k: getattr(c, k) for k in c.__dataclass_fields__},
                        other_name=people[c.other_participant_id].name,
                    )
                    for c in out.cooccurrences
                ],
                recurrences=[
                    RecurrenceOut(
                        **{k: getattr(r, k) for k in r.__dataclass_fields__},
                        other_name=people[r.other_participant_id].name,
                    )
                    for r in out.recurrences
                ],
                searches=[search_out(s) for s in own_searches],
            )
        )
        name = people[pid].name
        if not own_searches:
            limitations.append(
                f"{name}: nenhuma fonte externa consultada; o cruzamento usa só o que está "
                "registrado neste dossiê."
            )
        for search in own_searches:
            if search.status == "failed":
                limitations.append(
                    f"{name}: não foi possível consultar a fonte {search.connector}. "
                    "Isso não indica ausência de vínculo."
                )
            elif search.filter_field == "filing_date":
                limitations.append(
                    f"{name}: a fonte {search.connector} filtra pela data de distribuição, "
                    "não pela data da atuação; a cobertura da janela não é integral."
                )
        if people[pid].identity_status != "confirmed":
            limitations.append(f"{name}: identidade ainda não confirmada.")
        if any(c.timing == "undated" for c in out.cooccurrences):
            limitations.append(f"{name}: há atuações sem data, fora da contagem até revisão.")
    return CrosscheckOut(
        opportunity_id=opp.id,
        reference_date=reference,
        window_start=start,
        window_end=end,
        timezone=TIMEZONE,
        subjects=subjects,
        limitations=list(dict.fromkeys(limitations)),
    )


# ---------------------------------------------------------------- ocorrencias


def _parse_date(raw: str) -> date | None:
    try:
        return date.fromisoformat(raw.strip()) if raw and raw.strip() else None
    except ValueError:
        return None


def occurrence_out(db: Session, item: Occurrence) -> OccurrenceOut:
    subject = db.get(Participant, item.subject_participant_id)
    related = (
        db.get(Participant, item.related_participant_id) if item.related_participant_id else None
    )
    sheet = OccurrenceSheet.model_validate(item.sheet or {})
    start, end = rules.window_for(today())
    expected = False
    if related is not None and item.cnj:
        roles = db.scalars(
            select(ProcessRole).where(
                ProcessRole.opportunity_id == item.opportunity_id, ProcessRole.cnj == item.cnj
            )
        ).all()
        mine = [_rule_role(r) for r in roles if r.participant_id == subject.id]
        others = [_rule_role(r) for r in roles if r.participant_id == related.id]
        expected = bool(mine and others) and all(
            rules.relation_is_expected(m, o) for m in mine for o in others
        )
    qualification = None
    if item.kind == "qualification":
        qualification = rules.qualification_status(
            _parse_date(sheet.registry_valid_from),
            _parse_date(sheet.registry_valid_to),
            item.fact_date,
        )
    reviews = db.scalars(
        select(OccurrenceReview)
        .where(OccurrenceReview.occurrence_id == item.id)
        .order_by(OccurrenceReview.created_at, OccurrenceReview.id)
    ).all()
    blockers = (
        []
        if item.state == "validated"
        else rules.occurrence_blockers(
            kind=item.kind,
            subject_identity_confirmed=subject.identity_status == "confirmed",
            has_source=bool(item.document_version_id or item.source_url.strip()),
            sheet=sheet.model_dump(),
        )
    )
    return OccurrenceOut(
        id=item.id,
        opportunity_id=item.opportunity_id,
        kind=item.kind,
        relation=item.relation,
        state=item.state,
        subject_participant_id=subject.id,
        subject_name=subject.name,
        related_participant_id=related.id if related else None,
        related_name=related.name if related else None,
        cnj=item.cnj,
        fact_date=item.fact_date,
        collected_at=_as_utc(item.collected_at),
        timing=rules.classify_event(item.fact_date, start, end),
        document_version_id=item.document_version_id,
        page_start=item.page_start,
        source_url=item.source_url,
        material_hash=item.material_hash,
        sheet=sheet,
        expected_relation=expected,
        qualification_status=qualification,
        is_current_sanction=(
            item.kind == "disciplinary" and rules.is_current_sanction(sheet.proceeding_status)
        ),
        validation_blockers=blockers,
        is_synthetic=item.is_synthetic,
        reviews=[OccurrenceReviewOut.model_validate(r) for r in reviews],
        created_at=_as_utc(item.created_at),
        updated_at=_as_utc(item.updated_at),
    )


def list_occurrences(db: Session, opportunity_id: str) -> list[Occurrence]:
    return list(
        db.scalars(
            select(Occurrence)
            .where(Occurrence.opportunity_id == opportunity_id)
            .order_by(Occurrence.created_at, Occurrence.id)
        ).all()
    )


def create_occurrence(
    db: Session, user: User, opportunity_id: str, data: dict[str, Any]
) -> Occurrence:
    if user.role not in dossier.WRITER_ROLES:
        raise forbidden()
    opp = dossier.get_opportunity(db, user, opportunity_id)
    subject = get_participant(db, user, data["subject_participant_id"])
    related_id = data.get("related_participant_id")
    related = get_participant(db, user, related_id) if related_id else None
    if subject.opportunity_id != opp.id or (related and related.opportunity_id != opp.id):
        raise ApiError(422, "invalid_request", "Participante não pertence a este dossiê.")
    version_id, page = data.get("document_version_id"), data.get("page_start")
    if version_id:
        version = db.scalar(
            select(DocumentVersion).where(
                DocumentVersion.id == version_id,
                DocumentVersion.opportunity_id == opp.id,
                DocumentVersion.organization_id == user.organization_id,
            )
        )
        if version is None:
            raise ApiError(422, "invalid_citation", "Documento citado não pertence a este dossiê.")
        if page is None or (version.page_count is not None and page > version.page_count):
            raise ApiError(
                422, "invalid_citation", "Página do documento citado ausente ou inexistente."
            )
    material_hash = (data.get("material_hash") or "").strip().lower()
    if material_hash and (
        len(material_hash) != 64 or any(c not in "0123456789abcdef" for c in material_hash)
    ):
        raise ApiError(
            422, "invalid_request", "O hash do material precisa ser SHA-256 em hexadecimal."
        )
    item = Occurrence(
        organization_id=opp.organization_id,
        opportunity_id=opp.id,
        kind=data["kind"],
        relation=data.get("relation"),
        # Toda ocorrencia nasce candidata; nada entra validado.
        state="candidate" if subject.identity_status == "confirmed" else "identity_pending",
        subject_participant_id=subject.id,
        related_participant_id=related.id if related else None,
        cnj=normalize_cnj(data.get("cnj") or "") if data.get("cnj") else "",
        fact_date=data.get("fact_date"),
        document_version_id=version_id,
        page_start=page,
        source_url=(data.get("source_url") or "").strip(),
        material_hash=material_hash,
        sheet=data.get("sheet") or {},
        is_synthetic=opp.is_synthetic,
        created_by=user.id,
    )
    db.add(item)
    db.commit()
    audit(
        "diligence.occurrence.create",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"occurrence:{item.id}",
        outcome=item.state,
        data={"kind": item.kind, "opportunity_id": opp.id},
    )
    return item


def review_occurrence(
    db: Session, user: User, occurrence_id: str, data: dict[str, Any]
) -> Occurrence:
    """Revisao da ocorrencia. Qualquer estado pode ser reaberto; o historico guarda cada
    mudanca. Validar exige ausencia de impedimentos."""
    if user.role not in dossier.REVIEWER_ROLES:
        raise forbidden("Revisão exige papel de revisor.")
    item = db.scalar(
        select(Occurrence).where(
            Occurrence.id == occurrence_id, Occurrence.organization_id == user.organization_id
        )
    )
    if item is None:
        raise not_found("Ocorrência", feminine=True)
    subject = db.get(Participant, item.subject_participant_id)
    before = {"state": item.state, "sheet": dict(item.sheet or {})}
    sheet = data.get("sheet") if data.get("sheet") is not None else dict(item.sheet or {})
    new_state = data.get("state") or item.state
    comment = (data.get("comment") or "").strip()
    if new_state != item.state and new_state in ("validated", "discarded") and len(comment) < 3:
        raise ApiError(
            422,
            "review_reason_required",
            "Informe o fundamento da revisão para validar ou descartar a ocorrência.",
        )
    if new_state in ("validated", "forwarded_legal"):
        blockers = rules.occurrence_blockers(
            kind=item.kind,
            subject_identity_confirmed=subject.identity_status == "confirmed",
            has_source=bool(item.document_version_id or item.source_url.strip()),
            sheet=sheet,
        )
        if new_state == "forwarded_legal" and item.state != "validated":
            blockers.append(
                {
                    "code": "not_validated",
                    "message": "Só ocorrência validada segue para avaliação jurídica.",
                }
            )
        if blockers:
            db.rollback()
            raise ApiError(
                409,
                "validation_blocked",
                "A ocorrência não pode avançar enquanto houver pendências.",
                {"blockers": blockers},
            )
    item.sheet = sheet
    item.state = new_state
    item.updated_at = utcnow()
    db.add(
        OccurrenceReview(
            organization_id=user.organization_id,
            occurrence_id=item.id,
            reviewer_id=user.id,
            reviewer_name=user.display_name or user.username,
            before=before,
            after={"state": item.state, "sheet": dict(sheet)},
            comment=comment,
        )
    )
    db.commit()
    audit(
        "diligence.occurrence.review",
        actor=user.id,
        organization_id=user.organization_id,
        target=f"occurrence:{item.id}",
        outcome=item.state,
        data={"from": before["state"]},
    )
    return item


STATE_LABEL = {
    "candidate": "Candidata",
    "identity_pending": "Identidade pendente",
    "identity_confirmed": "Identidade confirmada",
    "evidence_collected": "Evidência coletada",
    "in_review": "Em revisão",
    "validated": "Validada",
    "discarded": "Descartada",
    "inconclusive": "Inconclusiva",
    "contested": "Contestada",
    "forwarded_legal": "Encaminhada à avaliação jurídica",
}
KIND_LABEL = {
    "cooccurrence": "Coocorrência em processo",
    "qualification": "Qualificação profissional",
    "disciplinary": "Procedimento disciplinar",
    "social": "Material de rede social",
    "other": "Outra",
}
TIMING_LABEL = {
    "in_window": "Dentro da janela",
    "out_of_window": "Fora da janela",
    "undated": "Sem data",
}


def export_rows(db: Session, user: User, opportunity_id: str) -> list[list[object]]:
    """Dossie exportavel (RF12). Material nao validado sai rotulado como tal."""
    opp = dossier.get_opportunity(db, user, opportunity_id)
    header = [
        "Situação",
        "Tipo",
        "Profissional",
        "Relacionado",
        "Processo (CNJ)",
        "Data do fato",
        "Janela de cinco anos",
        "O que foi encontrado",
        "O que permite afirmar",
        "O que não permite afirmar",
        "O que falta verificar",
        "Possível impacto se confirmado",
        "Fonte",
    ]
    rows: list[list[object]] = [header]
    for item in list_occurrences(db, opp.id):
        out = occurrence_out(db, item)
        source = out.source_url or (
            f"Documento do dossiê, página {out.page_start}" if out.document_version_id else ""
        )
        rows.append(
            [
                STATE_LABEL[out.state] + ("" if out.state == "validated" else " (não validada)"),
                KIND_LABEL[out.kind],
                out.subject_name,
                out.related_name,
                out.cnj or None,
                out.fact_date.isoformat() if out.fact_date else None,
                TIMING_LABEL[out.timing],
                out.sheet.what_found or None,
                out.sheet.allows_to_state or None,
                out.sheet.does_not_allow or None,
                out.sheet.missing_to_verify or None,
                out.sheet.possible_impact or None,
                source or None,
            ]
        )
    return rows
