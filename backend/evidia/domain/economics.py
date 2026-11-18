"""Motor economico deterministico (RF13–RF14, AC13–AC16).

Dois demonstrativos independentes — recebimento do autor e reducao de passivo do reu —
calculados em Decimal, fora da interface e sem contrato comercial (D1).

Regras declaradas:
- Dinheiro em Decimal; calculo interno com 28 digitos; arredondamento somente na saida,
  ROUND_HALF_UP para 2 casas.
- Todas as moedas e a data-base do demonstrativo devem coincidir; nao ha conversao implicita.
- Tempo em anos: informado explicitamente (`years_from_base`) ou derivado de datas por ACT/365.
- Sem probabilidades aprovadas, os cenarios saem nao ponderados. Score heuristico nunca e
  convertido em probabilidade.
- Preco, retorno do investidor e remuneracao contratual ficam nulos com motivo
  `contract_not_defined`. Zero e valor conhecido; nulo e ausencia de definicao.
- Reducao de passivo e economia do cliente; nao e registrada como receita da Evidia.
- Impactos (ajustes motivados por achados, vinculos ou cenarios) tem identificador e grupo
  de dependencia. Dentro do mesmo grupo e da mesma dimensao so UM impacto e aplicado — o de
  maior efeito — para nao contar duas vezes a mesma causa. Impacto sobre probabilidade ou
  sobre condicao contratual e apenas informativo: probabilidade e premissa aprovada por
  pessoa e o contrato nao esta definido.
- Sensibilidade: cada variacao muda uma unica premissa e mantem as demais constantes.

Esta metodologia e parametrizada e testada, mas NAO esta homologada (D7).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Any

# 1.1.0: mesma formula da 1.0.0; a saida passa a trazer a memoria (`steps`) por cenario.
# 1.2.0: impactos com grupo de dependencia, sensibilidade e responsavel/confianca por
#        componente. Sem impactos informados, os resultados sao os mesmos da 1.1.0.
FORMULA_VERSION = "econ-1.2.0"
PROBABILITY_SUM_TOLERANCE = Decimal("0.0001")
CONTRACT_NOT_DEFINED = "contract_not_defined"
_CENT = Decimal("0.01")

IMPACT_AFFECTS = ("value", "cost", "term", "probability", "contract")
# Variacoes da analise de sensibilidade, uma premissa por vez.
SENSITIVITY_AMOUNT = Decimal("0.10")  # ±10% no valor principal
SENSITIVITY_YEARS = Decimal(1)  # ±1 ano no prazo
SENSITIVITY_RATE = Decimal("0.01")  # ±1 ponto percentual na taxa de desconto


class EconomicsError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class CostItem:
    label: str
    amount: Decimal
    currency: str = "BRL"
    years_from_base: Decimal | None = None
    on_date: date | None = None
    # Reu: custo ja contido no desembolso informado nao e deduzido outra vez (AC15).
    included_in_disbursement: bool = False
    source: str = ""
    responsible: str = ""
    confidence: str = ""


@dataclass(frozen=True)
class Impact:
    """Ajuste de um cenario motivado por um achado, vinculo, argumento ou premissa manual."""

    id: str
    label: str
    # Impactos com a mesma causa compartilham o grupo: so um deles e aplicado por dimensao.
    dependency_group: str
    affects: str  # value | cost | term | probability | contract
    # value: variacao com sinal sobre o valor principal. cost: custo adicional (>= 0).
    amount: Decimal | None = None
    # term: variacao do prazo em anos (com sinal).
    years: Decimal | None = None
    note: str = ""
    # Origem do impacto no dossie; vazio = premissa manual.
    source_type: str = ""
    source_id: str = ""
    source_label: str = ""
    responsible: str = ""
    confidence: str = ""


@dataclass(frozen=True)
class ClaimantScenario:
    id: str
    label: str
    gross_receipt: Decimal
    currency: str = "BRL"
    years_from_base: Decimal | None = None
    receipt_date: date | None = None
    costs: tuple[CostItem, ...] = ()
    probability: Decimal | None = None
    impacts: tuple[Impact, ...] = ()
    source: str = ""
    responsible: str = ""
    confidence: str = ""


@dataclass(frozen=True)
class DefendantScenario:
    id: str
    label: str
    disbursement: Decimal
    currency: str = "BRL"
    years_from_base: Decimal | None = None
    disbursement_date: date | None = None
    incremental_costs: tuple[CostItem, ...] = ()
    probability: Decimal | None = None
    impacts: tuple[Impact, ...] = ()
    source: str = ""
    responsible: str = ""
    confidence: str = ""


@dataclass(frozen=True)
class Assumptions:
    currency: str
    base_date: date
    # Taxa anual de desconto; premissa distinta da probabilidade. Nula => sem valor presente.
    discount_rate: Decimal | None = None
    discount_rate_approved_by: str | None = None
    probabilities_approved_by: str | None = None
    # Aceito apenas para registro: jamais usado como probabilidade.
    heuristic_score: Decimal | None = None
    notes: tuple[str, ...] = field(default_factory=tuple)


def money(value: Decimal) -> str:
    return str(value.quantize(_CENT, rounding=ROUND_HALF_UP))


def _years(base: date, explicit: Decimal | None, on_date: date | None) -> Decimal:
    if explicit is not None:
        if explicit < 0:
            raise EconomicsError("negative_time", "prazo em anos não pode ser negativo")
        return explicit
    if on_date is None:
        return Decimal(0)
    days = (on_date - base).days
    if days < 0:
        raise EconomicsError("date_before_base", "data anterior à data-base do demonstrativo")
    return Decimal(days) / Decimal(365)


def _present_value(amount: Decimal, rate: Decimal, years: Decimal) -> Decimal:
    if years == 0:
        return amount
    return amount / ((Decimal(1) + rate) ** years)


def _step(
    key: str,
    label: str,
    sign: str,
    amount: Decimal,
    *,
    years: Decimal | None = None,
    present_value: Decimal | None = None,
    source: str = "",
    responsible: str = "",
    confidence: str = "",
) -> dict[str, Any]:
    """Linha da memoria de calculo. `sign`: "+" soma, "-" subtrai, "info" nao entra na conta."""
    return {
        "key": key,
        "label": label,
        "sign": sign,
        "amount": money(amount),
        "years": None if years is None else str(years.quantize(Decimal("0.0001")).normalize()),
        "present_value": None if present_value is None else money(present_value),
        "source": source,
        "responsible": responsible,
        "confidence": confidence,
    }


def _check_currency(expected: str, *currencies: str) -> None:
    for currency in currencies:
        if currency != expected:
            raise EconomicsError(
                "currency_mismatch",
                f"moeda {currency} difere da moeda do demonstrativo ({expected}); "
                "informe conversão explícita antes de calcular",
            )


def _check_rate(a: Assumptions) -> None:
    if a.discount_rate is None:
        return
    if a.discount_rate <= Decimal(-1):
        raise EconomicsError("invalid_discount_rate", "taxa de desconto deve ser maior que -100%")
    if not a.discount_rate_approved_by:
        raise EconomicsError(
            "discount_rate_not_approved",
            "taxa de desconto exige responsável pela aprovação da premissa",
        )


def _weighting(probabilities: list[Decimal | None], a: Assumptions) -> tuple[bool, str | None]:
    """Decide se ha ponderacao valida. Devolve (ponderar, motivo_da_ausencia)."""
    informed = [p for p in probabilities if p is not None]
    if not informed:
        if a.heuristic_score is not None:
            return False, "heuristic_score_is_not_probability"
        return False, "probabilities_not_provided"
    if len(informed) != len(probabilities):
        raise EconomicsError(
            "incomplete_probabilities",
            "probabilidade informada em parte dos cenários; informe todas ou nenhuma",
        )
    for p in informed:
        if p < 0 or p > 1:
            raise EconomicsError("probability_out_of_range", "probabilidade fora de [0, 1]")
    total = sum(informed, Decimal(0))
    if abs(total - Decimal(1)) > PROBABILITY_SUM_TOLERANCE:
        raise EconomicsError(
            "probabilities_do_not_sum_to_one",
            f"probabilidades somam {total}; cenários mutuamente exclusivos devem somar 1 "
            f"(tolerância {PROBABILITY_SUM_TOLERANCE})",
        )
    if not a.probabilities_approved_by:
        return False, "probabilities_not_approved"
    return True, None


def _contract_block() -> dict[str, Any]:
    undefined = {"value": None, "reason": CONTRACT_NOT_DEFINED}
    return {
        "status": "not_defined",
        "price": dict(undefined),
        "investor_return": dict(undefined),
        "contractual_fee": dict(undefined),
    }


def _header(side: str, a: Assumptions) -> dict[str, Any]:
    return {
        "side": side,
        "formula_version": FORMULA_VERSION,
        "methodology_status": "not_homologated",
        "currency": a.currency,
        "base_date": a.base_date.isoformat(),
        "rounding": "Meio para cima (ROUND_HALF_UP), 2 casas, aplicado apenas na saída",
        "day_count": "ACT/365 quando o prazo deriva de datas",
        "discount_rate": None if a.discount_rate is None else str(a.discount_rate),
        "discount_rate_approved_by": a.discount_rate_approved_by,
        "probabilities_approved_by": a.probabilities_approved_by,
        "heuristic_score_ignored": a.heuristic_score is not None,
        "notes": list(a.notes),
        "contract": _contract_block(),
        "impact_rule": (
            "No mesmo grupo de dependência e na mesma dimensão, só o impacto de maior efeito é "
            "aplicado. Impacto sobre probabilidade ou contrato é apenas informativo."
        ),
        "sensitivity_parameters": {
            "amount": str(SENSITIVITY_AMOUNT),
            "years": str(SENSITIVITY_YEARS),
            "discount_rate": str(SENSITIVITY_RATE),
        },
    }


# ------------------------------------------------------------------- impactos


def _magnitude(impact: Impact) -> Decimal:
    return abs(impact.years if impact.affects == "term" else impact.amount)  # type: ignore[arg-type]


def resolve_impacts(impacts: tuple[Impact, ...], *, discounting: bool) -> list[dict[str, Any]]:
    """Decide quais impactos entram na conta e explica os que nao entram.

    Devolve uma linha por impacto, na ordem informada, com `applied` e o motivo quando nao
    aplicado. Nenhum impacto e descartado em silencio.
    """
    seen: set[str] = set()
    for impact in impacts:
        if impact.id in seen:
            raise EconomicsError("duplicate_impact", f"impacto repetido: {impact.id}")
        seen.add(impact.id)
        if impact.affects not in IMPACT_AFFECTS:
            raise EconomicsError(
                "invalid_impact", f"dimensão de impacto inválida: {impact.affects}"
            )
        if not impact.dependency_group.strip():
            raise EconomicsError("invalid_impact", f"impacto {impact.id} sem grupo de dependência")
        if impact.affects in ("value", "cost") and impact.amount is None:
            raise EconomicsError("invalid_impact", f"impacto {impact.id} sem valor")
        if impact.affects == "cost" and impact.amount < 0:  # type: ignore[operator]
            raise EconomicsError(
                "invalid_impact", f"impacto de custo {impact.id} não pode ser negativo"
            )
        if impact.affects == "term" and impact.years is None:
            raise EconomicsError("invalid_impact", f"impacto de prazo {impact.id} sem anos")

    reasons: dict[str, str] = {}
    winners: dict[tuple[str, str], Impact] = {}
    for impact in impacts:
        if impact.affects == "probability":
            reasons[impact.id] = "probability_is_an_approved_assumption"
        elif impact.affects == "contract":
            reasons[impact.id] = CONTRACT_NOT_DEFINED
        elif impact.affects == "term" and not discounting:
            reasons[impact.id] = "no_discounting_in_this_statement"
        else:
            key = (impact.dependency_group.strip().casefold(), impact.affects)
            current = winners.get(key)
            # Empate: fica o primeiro informado, para o resultado ser estavel.
            if current is None or _magnitude(impact) > _magnitude(current):
                winners[key] = impact
    chosen = {impact.id for impact in winners.values()}
    for impact in impacts:
        if impact.id not in reasons and impact.id not in chosen:
            reasons[impact.id] = "same_dependency_group"

    return [
        {
            "id": impact.id,
            "label": impact.label,
            "dependency_group": impact.dependency_group,
            "affects": impact.affects,
            "amount": None if impact.amount is None else money(impact.amount),
            "years": None if impact.years is None else str(impact.years),
            "applied": impact.id in chosen,
            "not_applied_reason": reasons.get(impact.id),
            "note": impact.note,
            "source": {
                "type": impact.source_type or "manual",
                "id": impact.source_id or None,
                "label": impact.source_label,
            },
            "responsible": impact.responsible,
            "confidence": impact.confidence,
        }
        for impact in impacts
    ]


def _applied(impacts: tuple[Impact, ...], resolved: list[dict[str, Any]], affects: str):
    chosen = {row["id"] for row in resolved if row["applied"] and row["affects"] == affects}
    return [impact for impact in impacts if impact.id in chosen]


def _impact_source(impact: Impact) -> str:
    return impact.source_label or ("Premissa manual" if not impact.source_type else "")


def _signed_step(key: str, label: str, amount: Decimal, positive_sign: str, **extra) -> dict:
    """Passo de impacto: o sinal informado vale para valor positivo e se inverte no negativo."""
    negative_sign = "-" if positive_sign == "+" else "+"
    return _step(key, label, positive_sign if amount >= 0 else negative_sign, abs(amount), **extra)


# -------------------------------------------------------------------- autor


def _claimant_numbers(
    gross: Decimal,
    costs: list[tuple[Decimal, Decimal]],
    years: Decimal,
    rate: Decimal | None,
) -> tuple[Decimal, Decimal | None]:
    """Liquido e valor presente. `costs` e uma lista de (valor, anos)."""
    net = gross - sum((amount for amount, _ in costs), Decimal(0))
    if rate is None:
        return net, None
    pv = _present_value(gross, rate, years)
    for amount, cost_years in costs:
        pv -= _present_value(amount, rate, cost_years)
    return net, pv


def _claimant_sensitivity(
    gross: Decimal,
    costs: list[tuple[Decimal, Decimal]],
    years: Decimal,
    rate: Decimal | None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    def add(parameter: str, change: str, **override: Any) -> None:
        net, pv = _claimant_numbers(
            override.get("gross", gross),
            costs,
            override.get("years", years),
            override.get("rate", rate),
        )
        rows.append(
            {
                "parameter": parameter,
                "change": change,
                "net_receipt": money(net),
                "net_present_value": None if pv is None else money(pv),
            }
        )

    pct = int(SENSITIVITY_AMOUNT * 100)
    add("gross_receipt", f"+{pct}%", gross=gross * (1 + SENSITIVITY_AMOUNT))
    add("gross_receipt", f"-{pct}%", gross=gross * (1 - SENSITIVITY_AMOUNT))
    if rate is not None:
        add("years", f"+{SENSITIVITY_YEARS} ano", years=years + SENSITIVITY_YEARS)
        if years - SENSITIVITY_YEARS >= 0:
            add("years", f"-{SENSITIVITY_YEARS} ano", years=years - SENSITIVITY_YEARS)
        points = SENSITIVITY_RATE * 100
        add("discount_rate", f"+{points.normalize()} p.p.", rate=rate + SENSITIVITY_RATE)
        if rate - SENSITIVITY_RATE > Decimal(-1):
            add("discount_rate", f"-{points.normalize()} p.p.", rate=rate - SENSITIVITY_RATE)
    return rows


def claimant_statement(scenarios: list[ClaimantScenario], a: Assumptions) -> dict[str, Any]:
    """Recebimento do autor: bruto, custos, liquido e valor presente por cenario."""
    if not scenarios:
        raise EconomicsError("no_scenarios", "informe ao menos um cenário")
    with localcontext() as ctx:
        ctx.prec = 28
        _check_rate(a)
        weighted, unweighted_reason = _weighting([s.probability for s in scenarios], a)
        rate = a.discount_rate
        rows: list[dict[str, Any]] = []
        expected_net = Decimal(0)
        expected_pv = Decimal(0)
        for s in scenarios:
            _check_currency(a.currency, s.currency, *(c.currency for c in s.costs))
            resolved = resolve_impacts(s.impacts, discounting=rate is not None)
            value_impacts = _applied(s.impacts, resolved, "value")
            cost_impacts = _applied(s.impacts, resolved, "cost")
            term_delta = sum((i.years for i in _applied(s.impacts, resolved, "term")), Decimal(0))
            value_delta = sum((i.amount for i in value_impacts), Decimal(0))

            years = Decimal(0)
            if rate is not None:
                years = _years(a.base_date, s.years_from_base, s.receipt_date) + term_delta
                if years < 0:
                    raise EconomicsError(
                        "negative_time",
                        "impacto de prazo leva o recebimento para antes da data-base",
                    )
            adjusted_gross = s.gross_receipt + value_delta
            # Custo de impacto entra na data-base.
            cost_rows = [
                (
                    c,
                    _years(a.base_date, c.years_from_base, c.on_date)
                    if rate is not None
                    else Decimal(0),
                )
                for c in s.costs
            ]
            numbers = [(c.amount, c_years) for c, c_years in cost_rows] + [
                (i.amount, Decimal(0)) for i in cost_impacts
            ]
            net, pv = _claimant_numbers(adjusted_gross, numbers, years, rate)
            total_costs = sum((amount for amount, _ in numbers), Decimal(0))

            def step_pv(amount: Decimal, at: Decimal) -> dict[str, Any]:
                if rate is None:
                    return {}
                return {"years": at, "present_value": _present_value(abs(amount), rate, at)}

            steps = [
                _step(
                    "gross_receipt",
                    "Recebimento bruto",
                    "+",
                    s.gross_receipt,
                    source=s.source,
                    responsible=s.responsible,
                    confidence=s.confidence,
                    **step_pv(s.gross_receipt, years),
                )
            ]
            steps += [
                _signed_step(
                    "impact_value",
                    f"Impacto: {i.label}",
                    i.amount,
                    "+",
                    source=_impact_source(i),
                    responsible=i.responsible,
                    confidence=i.confidence,
                    **step_pv(i.amount, years),
                )
                for i in value_impacts
            ]
            steps += [
                _step(
                    "cost",
                    c.label,
                    "-",
                    c.amount,
                    source=c.source,
                    responsible=c.responsible,
                    confidence=c.confidence,
                    **step_pv(c.amount, c_years),
                )
                for c, c_years in cost_rows
            ]
            steps += [
                _step(
                    "impact_cost",
                    f"Impacto: {i.label}",
                    "-",
                    i.amount,
                    source=_impact_source(i),
                    responsible=i.responsible,
                    confidence=i.confidence,
                    **step_pv(i.amount, Decimal(0)),
                )
                for i in cost_impacts
            ]
            if weighted:
                expected_net += s.probability * net  # type: ignore[operator]
                if pv is not None:
                    expected_pv += s.probability * pv  # type: ignore[operator]
            rows.append(
                {
                    "id": s.id,
                    "label": s.label,
                    "probability": None if s.probability is None else str(s.probability),
                    "gross_receipt": money(s.gross_receipt),
                    "impacts_on_value": money(value_delta),
                    "adjusted_gross_receipt": money(adjusted_gross),
                    "total_costs": money(total_costs),
                    "net_receipt": money(net),
                    "net_present_value": None if pv is None else money(pv),
                    "years": None
                    if rate is None
                    else str(years.quantize(Decimal("0.0001")).normalize()),
                    "formula": (
                        "líquido = recebimento bruto ± impactos de valor − soma dos custos"
                        if s.impacts
                        else "líquido = recebimento bruto − soma dos custos"
                    ),
                    "present_value_formula": (
                        None
                        if pv is None
                        else "valor presente = valor / (1 + taxa) ^ anos, aplicado a cada "
                        "componente na sua data"
                    ),
                    "steps": steps,
                    "impacts": resolved,
                    "sensitivity": _claimant_sensitivity(adjusted_gross, numbers, years, rate),
                    "costs": [
                        {"label": c.label, "amount": money(c.amount), "source": c.source}
                        for c in s.costs
                    ],
                }
            )
        return {
            **_header("claimant", a),
            "scenarios": rows,
            "weighted": {
                "available": weighted,
                "reason": unweighted_reason,
                "expected_net_receipt": money(expected_net) if weighted else None,
                "expected_net_present_value": (
                    money(expected_pv) if weighted and a.discount_rate is not None else None
                ),
                "formula": "soma(probabilidade × valor do cenário), cenários mutuamente exclusivos",
            },
        }


# ---------------------------------------------------------------------- reu


def defendant_statement(
    reference_exposure: Decimal,
    scenarios: list[DefendantScenario],
    a: Assumptions,
    reference_currency: str = "BRL",
    reference_label: str = "",
) -> dict[str, Any]:
    """Reducao de passivo do reu em relacao a uma exposicao de referencia explicita."""
    if not scenarios:
        raise EconomicsError("no_scenarios", "informe ao menos um cenário")
    with localcontext() as ctx:
        ctx.prec = 28
        _check_rate(a)
        _check_currency(a.currency, reference_currency)
        weighted, unweighted_reason = _weighting([s.probability for s in scenarios], a)
        rows: list[dict[str, Any]] = []
        expected_net = Decimal(0)
        for s in scenarios:
            _check_currency(a.currency, s.currency, *(c.currency for c in s.incremental_costs))
            # Este demonstrativo nao desconta no tempo: impacto de prazo fica informativo.
            resolved = resolve_impacts(s.impacts, discounting=False)
            value_impacts = _applied(s.impacts, resolved, "value")
            cost_impacts = _applied(s.impacts, resolved, "cost")
            value_delta = sum((i.amount for i in value_impacts), Decimal(0))
            adjusted_disbursement = s.disbursement + value_delta

            deductible = [c for c in s.incremental_costs if not c.included_in_disbursement]
            already = [c for c in s.incremental_costs if c.included_in_disbursement]
            gross_reduction = reference_exposure - adjusted_disbursement
            deductible_total = sum((c.amount for c in deductible), Decimal(0)) + sum(
                (i.amount for i in cost_impacts), Decimal(0)
            )
            # Valores negativos sao preservados: o cenario pode ser pior que a referencia.
            net_reduction = gross_reduction - deductible_total
            if weighted:
                expected_net += s.probability * net_reduction  # type: ignore[operator]

            pct = int(SENSITIVITY_AMOUNT * 100)
            sensitivity = [
                {
                    "parameter": "disbursement",
                    "change": f"{sign}{pct}%",
                    "net_reduction": money(
                        reference_exposure - adjusted_disbursement * factor - deductible_total
                    ),
                }
                for sign, factor in (
                    ("+", 1 + SENSITIVITY_AMOUNT),
                    ("-", 1 - SENSITIVITY_AMOUNT),
                )
            ]
            rows.append(
                {
                    "id": s.id,
                    "label": s.label,
                    "probability": None if s.probability is None else str(s.probability),
                    "disbursement": money(s.disbursement),
                    "impacts_on_value": money(value_delta),
                    "adjusted_disbursement": money(adjusted_disbursement),
                    "gross_reduction": money(gross_reduction),
                    "incremental_costs_deducted": money(deductible_total),
                    "net_reduction": money(net_reduction),
                    "residual_exposure": money(adjusted_disbursement),
                    "formula": (
                        "redução bruta = exposição de referência − desembolso; "
                        "redução líquida = redução bruta − custos incrementais ainda não incluídos"
                    ),
                    "steps": [
                        _step(
                            "reference_exposure", "Exposição de referência", "+", reference_exposure
                        ),
                        _step(
                            "disbursement",
                            "Desembolso no cenário",
                            "-",
                            s.disbursement,
                            source=s.source,
                            responsible=s.responsible,
                            confidence=s.confidence,
                        ),
                        *(
                            # Impacto positivo aumenta o desembolso: reduz a redução de passivo.
                            _signed_step(
                                "impact_value",
                                f"Impacto: {i.label}",
                                i.amount,
                                "-",
                                source=_impact_source(i),
                                responsible=i.responsible,
                                confidence=i.confidence,
                            )
                            for i in value_impacts
                        ),
                        *(
                            _step(
                                "cost",
                                c.label,
                                "-",
                                c.amount,
                                source=c.source,
                                responsible=c.responsible,
                                confidence=c.confidence,
                            )
                            for c in deductible
                        ),
                        *(
                            _step(
                                "impact_cost",
                                f"Impacto: {i.label}",
                                "-",
                                i.amount,
                                source=_impact_source(i),
                                responsible=i.responsible,
                                confidence=i.confidence,
                            )
                            for i in cost_impacts
                        ),
                        *(
                            _step("cost_included", c.label, "info", c.amount, source=c.source)
                            for c in already
                        ),
                    ],
                    "impacts": resolved,
                    "sensitivity": sensitivity,
                    "costs_deducted": [
                        {"label": c.label, "amount": money(c.amount), "source": c.source}
                        for c in deductible
                    ],
                    "costs_already_in_disbursement": [
                        {"label": c.label, "amount": money(c.amount), "source": c.source}
                        for c in already
                    ],
                }
            )
        return {
            **_header("defendant", a),
            "reference_exposure": money(reference_exposure),
            "reference_label": reference_label,
            "beneficiary": "client",
            "evidia_revenue": {"value": None, "reason": CONTRACT_NOT_DEFINED},
            "scenarios": rows,
            "weighted": {
                "available": weighted,
                "reason": unweighted_reason,
                "expected_net_reduction": money(expected_net) if weighted else None,
                "formula": "soma(probabilidade × redução líquida), cenários mutuamente exclusivos",
            },
        }
