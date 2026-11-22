from ..models.admin import LeaveDurations
from ..models.maternity import (
    BenefitPaymentVariant,
    MaternityEmploymentType,
    MaternityParentalInput,
    MaternityParentalResult,
    PeriodBreakdown,
)
from .admin import config_service

MAX_CHILD_AGE_PARENTAL_LEAVE_YEARS = 6


def _calculate_net_base(gross: float, social_rate: float | None = None) -> float:
    if social_rate is None:
        social_rate = config_service.get_config().benefit_rates.social_contributions_rate
    return round(gross * (1.0 - social_rate / 100.0), 2)


def get_maternity_weeks(children_count: int, durations: LeaveDurations | None = None) -> int:
    if children_count <= 0:
        return 0
    if durations is None:
        durations = config_service.get_config().leave_durations
    mapping = {
        1: durations.maternity_weeks_single_child,
        2: durations.maternity_weeks_twins,
        3: durations.maternity_weeks_triplets,
        4: durations.maternity_weeks_quadruplets,
    }
    return mapping.get(children_count, durations.maternity_weeks_quintuplets_plus)


def get_parental_weeks(
    children_count: int,
    has_za_zyciem: bool,
    durations: LeaveDurations | None = None,
) -> int:
    if children_count <= 0:
        return 0
    if durations is None:
        durations = config_service.get_config().leave_durations
    if has_za_zyciem:
        return (
            durations.parental_weeks_za_zyciem_single
            if children_count == 1
            else durations.parental_weeks_za_zyciem_multiple
        )
    return (
        durations.parental_weeks_standard
        if children_count == 1
        else durations.parental_weeks_multiple_birth
    )


def calculate_maternity_parental_benefit(
    data: MaternityParentalInput,
) -> MaternityParentalResult:
    cfg = config_service.get_config()
    rates = cfg.benefit_rates
    amounts = cfg.benefit_amounts
    durations = cfg.leave_durations
    limits = cfg.periods_and_limits

    refusal_reasons: list[str] = []
    warning_notes: list[str] = []
    required_documents: list[str] = []
    legal_notes: list[str] = []

    if data.employment_type == MaternityEmploymentType.NONE or not data.is_insured_at_birth:
        return MaternityParentalResult(
            is_eligible=False,
            total_maternity_weeks=0,
            total_parental_weeks=0,
            total_weeks=0,
            mother_total_weeks=0,
            father_total_weeks=0,
            calculation_base_net=0.0,
            daily_rate=0.0,
            total_benefit_amount=0.0,
            chosen_variant=data.chosen_variant,
            comparison_unified_total=0.0,
            comparison_variable_total=0.0,
            refusal_reasons=[
                "Brak ubezpieczenia chorobowego w dniu porodu uniemożliwia "
                + "nabycie prawa do zasiłku macierzyńskiego."
            ],
            required_documents=[
                "Wniosek o świadczenie rodzicielskie (kosiniakowe - 1000 zł/mc) do MOPS/GOPS"
            ],
            legal_notes=[
                "Osobie nieubezpieczonej przysługuje świadczenie rodzicielskie "
                + "z ustawy o świadczeniach rodzinnych."
            ],
        )

    maternity_total_weeks = get_maternity_weeks(data.children_born_count, durations)
    parental_total_weeks = get_parental_weeks(
        data.children_born_count, data.has_za_zyciem_certificate, durations
    )
    grand_total_weeks = maternity_total_weeks + parental_total_weeks

    if data.mother_maternity_weeks < durations.mandatory_mother_maternity_weeks:
        refusal_reasons.append(
            f"Matka musi wykorzystać co najmniej {durations.mandatory_mother_maternity_weeks} "
            + "tygodni urlopu macierzyńskiego osobiście (art. 180 § 4 KP)."
        )

    if data.mother_maternity_weeks > maternity_total_weeks:
        refusal_reasons.append(
            f"Wymiar urlopu macierzyńskiego dla {data.children_born_count} dzieci "
            + f"wynosi maksymalnie {maternity_total_weeks} tygodni."
        )

    father_maternity_weeks = max(0, maternity_total_weeks - data.mother_maternity_weeks)

    shared_pool_limit = parental_total_weeks - durations.non_transferable_parental_weeks
    if data.mother_parental_weeks > shared_pool_limit:
        refusal_reasons.append(
            f"Maksymalna pula rodzicielskiego dla jednego rodzica to {shared_pool_limit} tyg. "
            + f"(z puli {parental_total_weeks} tyg., {durations.non_transferable_parental_weeks} "
            + "tyg. jest wyłączne dla drugiego rodzica)."
        )

    if data.father_parental_weeks > shared_pool_limit:
        refusal_reasons.append(
            f"Maksymalna pula rodzicielskiego dla ojca to {shared_pool_limit} tyg. "
            + f"(z puli {parental_total_weeks} tyg., {durations.non_transferable_parental_weeks} "
            + "tyg. jest wyłączne dla drugiego rodzica)."
        )

    if (data.mother_parental_weeks + data.father_parental_weeks) > parental_total_weeks:
        refusal_reasons.append(
            "Łączny wymiar urlopu rodzicielskiego obojga rodziców nie może przekraczać "
            + f"{parental_total_weeks} tygodni (zgłoszono "
            + f"{data.mother_parental_weeks + data.father_parental_weeks} tyg.)."
        )

    if data.parental_leave_parts_count > durations.max_parental_leave_parts:
        refusal_reasons.append(
            f"Urlop rodzicielski można podzielić na maksymalnie "
            f"{durations.max_parental_leave_parts} części."
        )

    if data.child_age_years > MAX_CHILD_AGE_PARENTAL_LEAVE_YEARS:
        refusal_reasons.append(
            "Urlop rodzicielski może być wykorzystany nie później niż do zakończenia roku, "
            + f"w którym dziecko kończy {MAX_CHILD_AGE_PARENTAL_LEAVE_YEARS} lat."
        )

    if refusal_reasons:
        return MaternityParentalResult(
            is_eligible=False,
            total_maternity_weeks=maternity_total_weeks,
            total_parental_weeks=parental_total_weeks,
            total_weeks=grand_total_weeks,
            mother_total_weeks=0,
            father_total_weeks=0,
            calculation_base_net=0.0,
            daily_rate=0.0,
            total_benefit_amount=0.0,
            chosen_variant=data.chosen_variant,
            comparison_unified_total=0.0,
            comparison_variable_total=0.0,
            refusal_reasons=refusal_reasons,
        )

    calculation_base = _calculate_net_base(
        data.gross_monthly_income, rates.social_contributions_rate
    )
    if data.employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        min_base = amounts.min_benefit_base_uop
        calculation_base = max(calculation_base, min_base)

    daily_rate = round(calculation_base / 30.0, 2)

    active_variant = data.chosen_variant
    if active_variant == BenefitPaymentVariant.UNIFIED_81_5 and not data.applied_within_21_days:
        active_variant = BenefitPaymentVariant.VARIABLE_100_70
        warning_notes.append(
            f"Wniosek złożony po terminie {limits.long_application_deadline_days} dni po porodzie. "
            + f"Automatycznie zastosowano wariant zmienny ({rates.full_maternity_rate:.0f}% / "
            + f"{rates.standard_parental_rate:.0f}%)."
        )

    total_parental_pool_taken = data.mother_parental_weeks + data.father_parental_weeks

    var_maternity_days = maternity_total_weeks * 7
    var_parental_days = total_parental_pool_taken * 7
    variable_total = round(
        (daily_rate * var_maternity_days * rates.full_maternity_rate / 100.0)
        + (daily_rate * var_parental_days * rates.standard_parental_rate / 100.0),
        2,
    )

    mother_pool_days = (
        maternity_total_weeks + min(data.mother_parental_weeks, shared_pool_limit)
    ) * 7
    father_guaranteed_days = data.father_parental_weeks * 7
    unified_total = round(
        (daily_rate * mother_pool_days * rates.unified_benefit_rate / 100.0)
        + (daily_rate * father_guaranteed_days * rates.standard_parental_rate / 100.0),
        2,
    )

    periods: list[PeriodBreakdown] = []

    if active_variant == BenefitPaymentVariant.UNIFIED_81_5:
        periods.append(
            PeriodBreakdown(
                name="Urlop macierzyński matki (wariant uśredniony)",
                weeks=data.mother_maternity_weeks,
                days=data.mother_maternity_weeks * 7,
                rate_percentage=rates.unified_benefit_rate,
                monthly_amount=round(daily_rate * 30.0 * rates.unified_benefit_rate / 100.0, 2),
                total_amount=round(
                    daily_rate
                    * data.mother_maternity_weeks
                    * 7
                    * rates.unified_benefit_rate
                    / 100.0,
                    2,
                ),
                taken_by="Matka",
            )
        )
        if father_maternity_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name="Przejęta część urlopu macierzyńskiego",
                    weeks=father_maternity_weeks,
                    days=father_maternity_weeks * 7,
                    rate_percentage=rates.unified_benefit_rate,
                    monthly_amount=round(daily_rate * 30.0 * rates.unified_benefit_rate / 100.0, 2),
                    total_amount=round(
                        daily_rate
                        * father_maternity_weeks
                        * 7
                        * rates.unified_benefit_rate
                        / 100.0,
                        2,
                    ),
                    taken_by="Ojciec",
                )
            )
        if data.mother_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name="Urlop rodzicielski matki (wariant uśredniony)",
                    weeks=data.mother_parental_weeks,
                    days=data.mother_parental_weeks * 7,
                    rate_percentage=rates.unified_benefit_rate,
                    monthly_amount=round(daily_rate * 30.0 * rates.unified_benefit_rate / 100.0, 2),
                    total_amount=round(
                        daily_rate
                        * data.mother_parental_weeks
                        * 7
                        * rates.unified_benefit_rate
                        / 100.0,
                        2,
                    ),
                    taken_by="Matka",
                )
            )
        if data.father_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name=(
                        f"Część urlopu rodzicielskiego ojca "
                        f"({durations.non_transferable_parental_weeks} tyg.)"
                    ),
                    weeks=data.father_parental_weeks,
                    days=data.father_parental_weeks * 7,
                    rate_percentage=rates.standard_parental_rate,
                    monthly_amount=round(
                        daily_rate * 30.0 * rates.standard_parental_rate / 100.0, 2
                    ),
                    total_amount=round(
                        daily_rate
                        * data.father_parental_weeks
                        * 7
                        * rates.standard_parental_rate
                        / 100.0,
                        2,
                    ),
                    taken_by="Ojciec",
                )
            )
        chosen_total = unified_total
    else:
        periods.append(
            PeriodBreakdown(
                name=f"Urlop macierzyński matki (wariant {rates.full_maternity_rate:.0f}%)",
                weeks=data.mother_maternity_weeks,
                days=data.mother_maternity_weeks * 7,
                rate_percentage=rates.full_maternity_rate,
                monthly_amount=round(daily_rate * 30.0 * rates.full_maternity_rate / 100.0, 2),
                total_amount=round(
                    daily_rate
                    * data.mother_maternity_weeks
                    * 7
                    * rates.full_maternity_rate
                    / 100.0,
                    2,
                ),
                taken_by="Matka",
            )
        )
        if father_maternity_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name=(
                        f"Przejęta część urlopu macierzyńskiego ({rates.full_maternity_rate:.0f}%)"
                    ),
                    weeks=father_maternity_weeks,
                    days=father_maternity_weeks * 7,
                    rate_percentage=rates.full_maternity_rate,
                    monthly_amount=round(daily_rate * 30.0 * rates.full_maternity_rate / 100.0, 2),
                    total_amount=round(
                        daily_rate * father_maternity_weeks * 7 * rates.full_maternity_rate / 100.0,
                        2,
                    ),
                    taken_by="Ojciec",
                )
            )
        if data.mother_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name=f"Urlop rodzicielski matki ({rates.standard_parental_rate:.0f}%)",
                    weeks=data.mother_parental_weeks,
                    days=data.mother_parental_weeks * 7,
                    rate_percentage=rates.standard_parental_rate,
                    monthly_amount=round(
                        daily_rate * 30.0 * rates.standard_parental_rate / 100.0, 2
                    ),
                    total_amount=round(
                        daily_rate
                        * data.mother_parental_weeks
                        * 7
                        * rates.standard_parental_rate
                        / 100.0,
                        2,
                    ),
                    taken_by="Matka",
                )
            )
        if data.father_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name=f"Urlop rodzicielski ojca ({rates.standard_parental_rate:.0f}%)",
                    weeks=data.father_parental_weeks,
                    days=data.father_parental_weeks * 7,
                    rate_percentage=rates.standard_parental_rate,
                    monthly_amount=round(
                        daily_rate * 30.0 * rates.standard_parental_rate / 100.0, 2
                    ),
                    total_amount=round(
                        daily_rate
                        * data.father_parental_weeks
                        * 7
                        * rates.standard_parental_rate
                        / 100.0,
                        2,
                    ),
                    taken_by="Ojciec",
                )
            )
        chosen_total = variable_total

    if data.applied_within_21_days:
        required_documents.append("Wniosek o zasiłek macierzyński i rodzicielski (w 21 dni)")
    else:
        required_documents.append("Wniosek o zasiłek macierzyński")
        required_documents.append("Wniosek o zasiłek rodzicielski (min. 21 dni przed urlopem)")

    required_documents.append("Skrócony odpis aktu urodzenia dziecka")
    if data.has_za_zyciem_certificate:
        required_documents.append("Zaświadczenie ze szpitala / lekarza ('Za życiem')")

    legal_notes.append(
        f"Każdemu rodzicowi przysługuje nieprzenoszalne prawo do "
        f"{durations.non_transferable_parental_weeks} tygodni urlopu rodzicielskiego "
        "(art. 1821a § 4 KP)."
    )
    legal_notes.append(
        f"Niewykorzystanie {durations.non_transferable_parental_weeks} tygodni przez ojca "
        "powoduje bezpowrotne przepadnięcie tej części."
    )

    mother_total_weeks = data.mother_maternity_weeks + data.mother_parental_weeks
    father_total_weeks = father_maternity_weeks + data.father_parental_weeks

    return MaternityParentalResult(
        is_eligible=True,
        total_maternity_weeks=maternity_total_weeks,
        total_parental_weeks=parental_total_weeks,
        total_weeks=grand_total_weeks,
        mother_total_weeks=mother_total_weeks,
        father_total_weeks=father_total_weeks,
        calculation_base_net=calculation_base,
        daily_rate=daily_rate,
        total_benefit_amount=chosen_total,
        chosen_variant=active_variant,
        comparison_unified_total=unified_total,
        comparison_variable_total=variable_total,
        periods=periods,
        refusal_reasons=[],
        warning_notes=warning_notes,
        required_documents=required_documents,
        legal_notes=legal_notes,
    )
