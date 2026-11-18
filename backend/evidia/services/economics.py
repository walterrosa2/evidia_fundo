"""Economia no dossie: fonte dos impactos, limitacoes declaradas e memorando (T013/T017).

O calculo em si e de `domain/economics.py`. Aqui fica o que depende do dossie:
- impacto ligado a achado, ocorrencia ou afirmacao so entra se a fonte estiver VALIDADA;
- o demonstrativo declara as limitacoes do dossie no momento do calculo;
- o memorando e um retrato versionado do demonstrativo gravado, sem recalculo.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from evidia.errors import ApiError, not_found
from evidia.models import (
    CalculationRun,
    Claim,
    EngineFinding,
    Memo,
    Occurrence,
    Opportunity,
    ScenarioRun,
    User,
)
from evidia.schemas import EconomicsRequest, ImpactIn

SOURCE_NAME = {"finding": "Achado", "occurrence": "Ocorrência", "claim": "Afirmação"}
CONFIDENCE_LABEL = {"low": "baixa", "medium": "média", "high": "alta", "": "não declarada"}
AFFECTS_LABEL = {
    "value": "valor",
    "cost": "custo",
    "term": "prazo",
    "probability": "probabilidade",
    "contract": "condição contratual",
}
REASON_LABEL = {
    "same_dependency_group": "mesma causa de outro impacto já aplicado (grupo de dependência)",
    "probability_is_an_approved_assumption": (
        "probabilidade é premissa aprovada por pessoa; o impacto fica como informação"
    ),
    "contract_not_defined": "contrato não definido",
    "no_discounting_in_this_statement": "este demonstrativo não desconta no tempo",
}


def _short(text: str, limit: int = 120) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _source(db: Session, opp: Opportunity, impact: ImpactIn) -> str:
    """Rotulo da fonte validada do impacto; recusa fonte ausente ou nao validada."""
    name = SOURCE_NAME[impact.source_type]
    if not impact.source_id:
        raise ApiError(
            422, "impact_source_missing", f"Impacto {impact.id}: informe a fonte ({name.lower()})."
        )
    if impact.source_type == "finding":
        row = db.get(EngineFinding, impact.source_id)
        state, text = (row.review_state, row.title) if row else (None, "")
    elif impact.source_type == "occurrence":
        row = db.get(Occurrence, impact.source_id)
        state = row.state if row else None
        text = (row.cnj or row.kind) if row else ""
    else:
        row = db.get(Claim, impact.source_id)
        state, text = (row.review_state, row.text) if row else (None, "")
        if row is not None and row.stale:
            state = "stale"
    # Fonte de outra oportunidade ou organizacao e tratada como inexistente.
    if row is None or row.opportunity_id != opp.id or row.organization_id != opp.organization_id:
        raise ApiError(
            422,
            "impact_source_not_found",
            f"Impacto {impact.id}: a fonte indicada não existe neste dossiê.",
        )
    if state != "validated":
        raise ApiError(
            422,
            "impact_source_not_validated",
            f"Impacto {impact.id}: a fonte ainda não foi validada por pessoa; "
            "valide-a ou registre o impacto como premissa manual.",
        )
    return (
        f"{name} validado: {_short(text)}"
        if name == "Achado"
        else f"{name} validada: {_short(text)}"
    )


def impact_source_labels(db: Session, opp: Opportunity, body: EconomicsRequest) -> dict[str, str]:
    """Rotulo de fonte por (tipo, id) dos impactos nao manuais dos dois demonstrativos."""
    labels: dict[str, str] = {}
    for statement in (body.claimant, body.defendant):
        if statement is None:
            continue
        for scenario in statement.scenarios:
            for impact in scenario.impacts:
                if impact.source_type != "manual":
                    key = f"{impact.source_type}:{impact.source_id}"
                    if key not in labels:
                        labels[key] = _source(db, opp, impact)
    return labels


def limitations(db: Session, opp: Opportunity, result: dict[str, Any]) -> list[dict[str, str]]:
    """Limitacoes que o leitor precisa ver junto do numero."""
    items = [
        {
            "code": "methodology_not_homologated",
            "message": "Metodologia econômica não homologada: os números são demonstrativos.",
        },
        {
            "code": "contract_not_defined",
            "message": "Sem contrato definido: preço, retorno do investidor e remuneração "
            "contratual não são calculados.",
        },
    ]
    completed = db.scalar(
        select(func.count())
        .select_from(ScenarioRun)
        .where(
            ScenarioRun.opportunity_id == opp.id,
            ScenarioRun.status == "completed",
            ScenarioRun.dossier_version == opp.dossier_version,
        )
    )
    if not completed:
        items.append(
            {
                "code": "no_adversarial_analysis",
                "message": "Não há análise adversarial concluída para a versão atual do dossiê: "
                "os cenários não foram confrontados com a tese contrária.",
            }
        )
    for side in ("claimant", "defendant"):
        statement = result.get(side)
        if statement and not statement["weighted"]["available"]:
            items.append(
                {
                    "code": f"{side}_not_weighted",
                    "message": (
                        "Recebimento do autor" if side == "claimant" else "Redução de passivo"
                    )
                    + " sem ponderação: não há probabilidades aprovadas.",
                }
            )
    return items


# ------------------------------------------------------------------ memorando


def _brl(value: str | None) -> str:
    if value is None:
        return "não definido"
    negative = value.startswith("-")
    whole, _, cents = value.lstrip("-").partition(".")
    groups = []
    while whole:
        groups.insert(0, whole[-3:])
        whole = whole[:-3]
    return ("-" if negative else "") + ".".join(groups or ["0"]) + "," + (cents or "00")


def _cell(text: object) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ")


def _scenario_md(scenario: dict[str, Any], side: str) -> list[str]:
    result_key = "net_receipt" if side == "claimant" else "net_reduction"
    probability = scenario["probability"]
    lines = [
        f"### Cenário: {scenario['label']}",
        "",
        f"- Probabilidade: {'não informada' if probability is None else probability}",
        f"- Fórmula: {scenario['formula']}",
        "",
        "| Componente | Operação | Valor | Valor presente | Fonte | Responsável | Confiança |",
        "|---|---|---:|---:|---|---|---|",
    ]
    for step in scenario.get("steps", []):
        operation = {"+": "soma", "-": "subtrai"}.get(step["sign"], "informativo")
        pv = "" if step["present_value"] is None else _brl(step["present_value"])
        lines.append(
            f"| {_cell(step['label'])} | {operation} | {_brl(step['amount'])} | {pv} | "
            f"{_cell(step['source'])} | {_cell(step.get('responsible', ''))} | "
            f"{CONFIDENCE_LABEL.get(step.get('confidence', ''), '')} |"
        )
    pv = scenario.get("net_present_value")
    lines.append(
        f"| **Resultado líquido** | total | **{_brl(scenario[result_key])}** | "
        f"{'' if pv is None else _brl(pv)} | | | |"
    )
    impacts = scenario.get("impacts", [])
    if impacts:
        lines += ["", "Impactos informados:", ""]
        for impact in impacts:
            size = (
                f"{impact['years']} ano(s)"
                if impact["affects"] == "term"
                else ("sem valor" if impact["amount"] is None else _brl(impact["amount"]))
            )
            status = (
                "aplicado"
                if impact["applied"]
                else "não aplicado — "
                + REASON_LABEL.get(impact["not_applied_reason"], impact["not_applied_reason"])
            )
            source = impact["source"]["label"] or "Premissa manual"
            lines.append(
                f"- {impact['label']} (grupo «{impact['dependency_group']}», incide em "
                f"{AFFECTS_LABEL[impact['affects']]}, {size}): {status}. Fonte: {source}."
            )
    sensitivity = scenario.get("sensitivity", [])
    if sensitivity:
        parameter = {
            "gross_receipt": "Recebimento bruto",
            "disbursement": "Desembolso",
            "years": "Prazo",
            "discount_rate": "Taxa de desconto",
        }
        lines += [
            "",
            "Sensibilidade (uma premissa por vez, demais constantes):",
            "",
            "| Premissa | Variação | Resultado líquido | Valor presente |",
            "|---|---|---:|---:|",
        ]
        for row in sensitivity:
            pv = row.get("net_present_value")
            lines.append(
                f"| {parameter.get(row['parameter'], row['parameter'])} | {row['change']} | "
                f"{_brl(row[result_key])} | {'' if pv is None else _brl(pv)} |"
            )
    return [*lines, ""]


def memo_body(
    opp: Opportunity, run: CalculationRun, limits: list[dict[str, str]], notes: str, version: int
) -> str:
    """Texto do memorando, montado só com o resultado gravado (sem recalculo)."""
    lines = [
        f"# Memorando econômico — versão {version}",
        "",
        f"- Oportunidade: {opp.id}",
        f"- Demonstrativo: {run.id}",
        f"- Fórmula: {run.formula_version}",
        f"- Versão do dossiê no cálculo: {run.dossier_version}",
        f"- Situação do demonstrativo: {'desatualizado' if run.stale else 'vigente'}",
        "",
        "## Limitações",
        "",
        *(f"- {item['message']}" for item in limits),
        "",
    ]
    if notes.strip():
        lines += ["## Observações de quem emitiu", "", notes.strip(), ""]
    titles = (
        ("claimant", "Recebimento do autor"),
        ("defendant", "Redução de passivo do réu"),
    )
    for side, title in titles:
        statement = run.result.get(side)
        if not statement:
            continue
        rate = statement["discount_rate"]
        lines += [
            f"## {title}",
            "",
            f"- Moeda: {statement['currency']}",
            f"- Data-base: {statement['base_date']}",
            "- Taxa de desconto: "
            + (
                "não informada (sem valor presente)"
                if rate is None
                else f"{rate} ao ano, aprovada por {statement['discount_rate_approved_by']}"
            ),
            f"- Arredondamento: {statement['rounding']}",
            "- Preço, retorno do investidor e remuneração contratual: não definidos (sem contrato)",
        ]
        if side == "defendant":
            lines += [
                f"- Exposição de referência: {_brl(statement['reference_exposure'])}"
                + (f" ({statement['reference_label']})" if statement["reference_label"] else ""),
                "- A redução de passivo é economia do cliente; não é receita da Evidia.",
            ]
        lines.append("")
        for scenario in statement["scenarios"]:
            lines += _scenario_md(scenario, side)
        weighted = statement["weighted"]
        expected = weighted.get("expected_net_receipt", weighted.get("expected_net_reduction"))
        lines += [
            "Valor ponderado: "
            + (
                f"{_brl(expected)} ({weighted['formula']})"
                if weighted["available"]
                else "indisponível — sem probabilidades aprovadas; os cenários não são somados."
            ),
            "",
        ]
    return "\n".join(lines).rstrip() + "\n"


def create_memo(db: Session, user: User, opp: Opportunity, run_id: str, notes: str) -> Memo:
    run = db.scalar(
        select(CalculationRun).where(
            CalculationRun.id == run_id,
            CalculationRun.opportunity_id == opp.id,
            CalculationRun.organization_id == user.organization_id,
        )
    )
    if run is None:
        raise not_found("Demonstrativo")
    if run.stale:
        raise ApiError(
            409,
            "calculation_stale",
            "O demonstrativo está desatualizado: recalcule antes de emitir o memorando.",
        )
    # As limitacoes sao as do momento da emissao (o contraditorio pode ter sido concluido).
    limits = limitations(db, opp, run.result)
    version = (
        db.scalar(select(func.max(Memo.version)).where(Memo.opportunity_id == opp.id)) or 0
    ) + 1
    memo = Memo(
        organization_id=user.organization_id,
        opportunity_id=opp.id,
        version=version,
        calculation_run_id=run.id,
        formula_version=run.formula_version,
        dossier_version=run.dossier_version,
        title=f"Memorando econômico v{version}",
        body=memo_body(opp, run, limits, notes, version),
        notes=notes.strip(),
        limitations=limits,
        created_by=user.id,
    )
    db.add(memo)
    return memo


def validated_sources(db: Session, opp: Opportunity) -> list[dict[str, str]]:
    """Achados, ocorrencias e afirmacoes VALIDADOS do dossie: o que pode justificar impacto."""
    out: list[dict[str, str]] = []
    claims = db.scalars(
        select(Claim)
        .where(
            Claim.opportunity_id == opp.id,
            Claim.review_state == "validated",
            Claim.stale.is_(False),
        )
        .order_by(Claim.created_at)
    )
    out += [
        {"type": "claim", "id": c.id, "label": f"Afirmação: {_short(c.text, 90)}"} for c in claims
    ]
    findings = db.scalars(
        select(EngineFinding)
        .where(EngineFinding.opportunity_id == opp.id, EngineFinding.review_state == "validated")
        .order_by(EngineFinding.created_at)
    )
    out += [
        {"type": "finding", "id": f.id, "label": f"Achado: {_short(f.title, 90)}"} for f in findings
    ]
    occurrences = db.scalars(
        select(Occurrence)
        .where(Occurrence.opportunity_id == opp.id, Occurrence.state == "validated")
        .order_by(Occurrence.created_at)
    )
    out += [
        {"type": "occurrence", "id": o.id, "label": f"Ocorrência: {_short(o.cnj or o.kind, 90)}"}
        for o in occurrences
    ]
    return out
