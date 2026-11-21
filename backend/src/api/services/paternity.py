from ...constants import (
    FULL_MATERNITY_RATE,
    MANDATORY_MOTHER_MATERNITY_WEEKS,
    MAX_CHILD_AGE_PATERNITY_ADOPTION_YEARS,
    MAX_CHILD_AGE_PATERNITY_MONTHS,
    MAX_PATERNITY_PARTS,
    MIN_MOTHER_WEEKS_BEFORE_TRANSFER_SPECIAL,
    MIN_PATERNITY_PART_DAYS,
    MIN_WAGE_2026,
    NON_TRANSFERABLE_PARENTAL_WEEKS,
    PATERNITY_BENEFIT_RATE,
    PATERNITY_LEAVE_DAYS,
    STANDARD_PARENTAL_RATE,
    UNIFIED_BENEFIT_RATE,
)
from ..models.maternity import (
    BenefitPaymentVariant,
    MaternityEmploymentType,
    PeriodBreakdown,
)
from ..models.paternity import (
    MaternityTransferInput,
    MaternityTransferReason,
    MaternityTransferResult,
    ParentalSharingInput,
    ParentalSharingResult,
    ParentBenefitBreakdown,
    PaternityLeaveInput,
    PaternityLeaveResult,
    SharingMode,
)
from .maternity import (
    _calculate_net_base,
    get_maternity_weeks,
    get_parental_weeks,
)


def calculate_paternity_leave(data: PaternityLeaveInput) -> PaternityLeaveResult:
    refusal_reasons: list[str] = []

    if not data.is_insured or data.employment_type == MaternityEmploymentType.NONE:
        refusal_reasons.append("Brak ubezpieczenia chorobowego ojca uniemożliwia pobranie zasiłku.")

    if data.is_adopted:
        if (
            data.adopted_child_age_years is not None
            and data.adopted_child_age_years > MAX_CHILD_AGE_PATERNITY_ADOPTION_YEARS
        ):
            refusal_reasons.append(
                f"Urlop przysługuje do ukończenia {MAX_CHILD_AGE_PATERNITY_ADOPTION_YEARS} r.ż."
            )
        if data.months_since_adoption is not None and data.months_since_adoption > 12:
            refusal_reasons.append(
                "Urlop przysługuje do 12 miesięcy od uprawomocnienia postanowienia o adopcji."
            )
    else:
        if data.child_age_months > MAX_CHILD_AGE_PATERNITY_MONTHS:
            refusal_reasons.append(
                f"Urlop przysługuje do ukończenia {MAX_CHILD_AGE_PATERNITY_MONTHS} m-cy życia."
            )

    if len(data.parts) > MAX_PATERNITY_PARTS:
        refusal_reasons.append(
            f"Urlop ojcowski można podzielić na maksymalnie {MAX_PATERNITY_PARTS} części."
        )

    total_days = sum(p.days for p in data.parts)
    if total_days > PATERNITY_LEAVE_DAYS:
        refusal_reasons.append(f"Łączny wymiar to max {PATERNITY_LEAVE_DAYS} dni.")

    for p in data.parts:
        if p.days < MIN_PATERNITY_PART_DAYS:
            refusal_reasons.append(
                f"Żadna część nie może być krótsza niż {MIN_PATERNITY_PART_DAYS} dni."
            )

    if refusal_reasons:
        return PaternityLeaveResult(
            is_eligible=False,
            total_days=0,
            calculation_base_net=0.0,
            daily_rate=0.0,
            total_benefit_amount=0.0,
            refusal_reasons=refusal_reasons,
        )

    calc_base = _calculate_net_base(data.gross_monthly_income)
    if data.employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        calc_base = max(calc_base, _calculate_net_base(MIN_WAGE_2026))

    daily_rate = round(calc_base / 30, 2)
    total_amount = round(daily_rate * total_days * PATERNITY_BENEFIT_RATE / 100, 2)

    parts_breakdown = [
        {
            "part_number": p.part_number,
            "days": p.days,
            "rate_percentage": PATERNITY_BENEFIT_RATE,
            "amount": round(daily_rate * p.days * PATERNITY_BENEFIT_RATE / 100, 2),
        }
        for p in data.parts
    ]

    return PaternityLeaveResult(
        is_eligible=True,
        total_days=total_days,
        calculation_base_net=calc_base,
        daily_rate=daily_rate,
        total_benefit_amount=total_amount,
        parts_breakdown=parts_breakdown,
        legal_basis=[
            "Art. 182(3) Kodeksu Pracy (prawo do urlopu ojcowskiego w wymiarze 14 dni)",
            "Art. 29a ustawy zasiłkowej (zasiłek macierzyński za okres ojcowskiego - 100%)",
        ],
        required_documents=[
            "Wniosek o urlop ojcowski (złożony min. 7 dni przed rozpoczęciem)",
            "Skrócony odpis aktu urodzenia dziecka lub postanowienie o przysposobieniu",
            "Oświadczenie, czy urlop był już wykorzystany w części",
        ],
        important_notes=[
            "Urlop ojcowski jest niezależny od urlopu matki (mogą trwać równolegle).",
            "Zasiłek wynosi 100% podstawy wymiaru.",
        ],
    )


def calculate_maternity_transfer(data: MaternityTransferInput) -> MaternityTransferResult:
    refusal_reasons: list[str] = []
    total_maternity_weeks = get_maternity_weeks(data.children_born_count)

    if not data.is_father_insured or data.father_employment_type == MaternityEmploymentType.NONE:
        refusal_reasons.append("Brak ubezpieczenia chorobowego ojca uniemożliwia przejęcie urlopu.")

    min_required_mother = MANDATORY_MOTHER_MATERNITY_WEEKS
    if data.transfer_reason in (
        MaternityTransferReason.MOTHER_HOSPITALIZATION,
        MaternityTransferReason.MOTHER_DISABILITY,
        MaternityTransferReason.MOTHER_ABANDONMENT,
    ):
        min_required_mother = MIN_MOTHER_WEEKS_BEFORE_TRANSFER_SPECIAL
    elif data.transfer_reason in (
        MaternityTransferReason.MOTHER_DEATH,
        MaternityTransferReason.MOTHER_UNINSURED,
    ):
        min_required_mother = 0

    if data.mother_used_weeks < min_required_mother:
        refusal_reasons.append(
            f"W wybranym trybie ({data.transfer_reason.value}) matka musi wykorzystać min. "
            f"{min_required_mother} tygodni urlopu przed przekazaniem."
        )

    father_weeks = max(0, total_maternity_weeks - data.mother_used_weeks)
    if father_weeks <= 0:
        refusal_reasons.append("Brak pozostałego wymiaru urlopu macierzyńskiego do przejęcia.")

    if refusal_reasons:
        return MaternityTransferResult(
            is_eligible=False,
            total_maternity_weeks=total_maternity_weeks,
            mother_weeks_used=data.mother_used_weeks,
            father_transferred_weeks=0,
            father_calculation_base_net=0.0,
            father_daily_rate=0.0,
            father_total_benefit_amount=0.0,
            benefit_rate_percentage=0.0,
            refusal_reasons=refusal_reasons,
        )

    calc_base = _calculate_net_base(data.father_gross_monthly_income)
    if data.father_employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        calc_base = max(calc_base, _calculate_net_base(MIN_WAGE_2026))

    daily_rate = round(calc_base / 30, 2)
    rate = UNIFIED_BENEFIT_RATE if data.applied_within_21_days else FULL_MATERNITY_RATE
    total_amount = round(daily_rate * father_weeks * 7 * rate / 100, 2)

    legal_basis = [
        "Art. 180 § 4-17 Kodeksu Pracy (przejęcie urlopu macierzyńskiego przez ojca)",
        "Art. 29 ust. 5 ustawy zasiłkowej (prawo ubezpieczonego ojca do zasiłku)",
    ]

    docs = [
        "Wniosek ojca do pracodawcy o udzielenie części urlopu macierzyńskiego",
        "Oświadczenie matki o rezygnacji z pozostałej części urlopu macierzyńskiego",
        "Zaświadczenie pracodawcy matki o terminie zaprzestania korzystania z urlopu",
    ]
    if data.transfer_reason == MaternityTransferReason.MOTHER_HOSPITALIZATION:
        docs.append("Zaświadczenie szpitalne o pobycie matki w zakładzie leczniczym")
    elif data.transfer_reason == MaternityTransferReason.MOTHER_DISABILITY:
        docs.append("Orzeczenie o niezdolności matki do samodzielnej egzystencji")
    elif data.transfer_reason == MaternityTransferReason.MOTHER_DEATH:
        docs.append("Odpis skrócony aktu zgonu matki")

    return MaternityTransferResult(
        is_eligible=True,
        total_maternity_weeks=total_maternity_weeks,
        mother_weeks_used=data.mother_used_weeks,
        father_transferred_weeks=father_weeks,
        father_calculation_base_net=calc_base,
        father_daily_rate=daily_rate,
        father_total_benefit_amount=total_amount,
        benefit_rate_percentage=rate,
        legal_basis=legal_basis,
        required_documents=docs,
        important_notes=[
            f"Ojciec przejmuje {father_weeks} tygodni urlopu macierzyńskiego.",
            "Wysokość zasiłku ojca jest wyliczana z JEGO podstawy wynagrodzenia brutto.",
        ],
    )


def calculate_parental_sharing(data: ParentalSharingInput) -> ParentalSharingResult:
    maternity_pool = get_maternity_weeks(data.children_born_count)
    parental_pool = get_parental_weeks(data.children_born_count, data.has_za_zyciem_certificate)
    combined_total = maternity_pool + parental_pool

    val_messages: list[str] = []

    non_transferable_ok = True
    shared_pool = parental_pool - NON_TRANSFERABLE_PARENTAL_WEEKS

    if data.mother_parental_weeks > shared_pool:
        non_transferable_ok = False
        val_messages.append(
            f"Matka może wziąć maksymalnie {shared_pool} tyg. rodzicielskiego. "
            f"9 tygodni jest nieprzenoszalne i przysługuje wyłącznie ojcu."
        )

    total_parental_taken = data.mother_parental_weeks + data.father_parental_weeks
    if total_parental_taken > parental_pool:
        val_messages.append(
            f"Suma rodzicielskiego ({total_parental_taken} tyg.) przekracza {parental_pool} tyg."
        )

    m_base = _calculate_net_base(data.mother_gross_income)
    if data.mother_employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        m_base = max(m_base, _calculate_net_base(MIN_WAGE_2026))
    m_daily = round(m_base / 30, 2)

    f_base = _calculate_net_base(data.father_gross_income)
    if data.father_employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        f_base = max(f_base, _calculate_net_base(MIN_WAGE_2026))
    f_daily = round(f_base / 30, 2)

    m_mat_rate = (
        UNIFIED_BENEFIT_RATE
        if data.chosen_variant == BenefitPaymentVariant.UNIFIED_81_5
        else FULL_MATERNITY_RATE
    )
    m_par_rate = (
        UNIFIED_BENEFIT_RATE
        if data.chosen_variant == BenefitPaymentVariant.UNIFIED_81_5
        else STANDARD_PARENTAL_RATE
    )
    f_rate = STANDARD_PARENTAL_RATE

    m_mat_amount = round(m_daily * data.mother_maternity_weeks * 7 * m_mat_rate / 100, 2)
    m_par_amount = round(m_daily * data.mother_parental_weeks * 7 * m_par_rate / 100, 2)
    m_total = round(m_mat_amount + m_par_amount, 2)

    m_periods = [
        PeriodBreakdown(
            name="Urlop macierzyński matki",
            weeks=data.mother_maternity_weeks,
            days=data.mother_maternity_weeks * 7,
            rate_percentage=m_mat_rate,
            monthly_amount=round(m_daily * 30 * m_mat_rate / 100, 2),
            total_amount=m_mat_amount,
            taken_by="Matka",
        ),
        PeriodBreakdown(
            name="Urlop rodzicielski matki",
            weeks=data.mother_parental_weeks,
            days=data.mother_parental_weeks * 7,
            rate_percentage=m_par_rate,
            monthly_amount=round(m_daily * 30 * m_par_rate / 100, 2),
            total_amount=m_par_amount,
            taken_by="Matka",
        ),
    ]

    f_mat_amount = round(f_daily * data.father_maternity_weeks * 7 * m_mat_rate / 100, 2)
    f_par_amount = round(f_daily * data.father_parental_weeks * 7 * f_rate / 100, 2)
    f_total = round(f_mat_amount + f_par_amount, 2)

    f_periods = []
    if data.father_maternity_weeks > 0:
        f_periods.append(
            PeriodBreakdown(
                name="Przejęty urlop macierzyński",
                weeks=data.father_maternity_weeks,
                days=data.father_maternity_weeks * 7,
                rate_percentage=m_mat_rate,
                monthly_amount=round(f_daily * 30 * m_mat_rate / 100, 2),
                total_amount=f_mat_amount,
                taken_by="Ojciec",
            )
        )
    f_periods.append(
        PeriodBreakdown(
            name="Urlop rodzicielski ojca (w tym 9 tyg. nieprzenoszalne)",
            weeks=data.father_parental_weeks,
            days=data.father_parental_weeks * 7,
            rate_percentage=f_rate,
            monthly_amount=round(f_daily * 30 * f_rate / 100, 2),
            total_amount=f_par_amount,
            taken_by="Ojciec",
        )
    )

    family_total = round(m_total + f_total, 2)

    mother_summary = ParentBenefitBreakdown(
        parent_name="Matka",
        gross_income=data.mother_gross_income,
        calculation_base_net=m_base,
        daily_rate=m_daily,
        maternity_weeks=data.mother_maternity_weeks,
        parental_weeks=data.mother_parental_weeks,
        total_weeks=data.mother_maternity_weeks + data.mother_parental_weeks,
        total_benefit_amount=m_total,
        periods=m_periods,
    )

    father_summary = ParentBenefitBreakdown(
        parent_name="Ojciec",
        gross_income=data.father_gross_income,
        calculation_base_net=f_base,
        daily_rate=f_daily,
        maternity_weeks=data.father_maternity_weeks,
        parental_weeks=data.father_parental_weeks,
        total_weeks=data.father_maternity_weeks + data.father_parental_weeks,
        total_benefit_amount=f_total,
        periods=f_periods,
    )

    mode_text = (
        "równocześnie (oboje rodzice w tym samym czasie)"
        if data.sharing_mode == SharingMode.SIMULTANEOUS
        else "naprzemiennie (sekwencyjnie)"
    )

    higher_earner = "ojciec" if data.father_gross_income > data.mother_gross_income else "matka"
    strategy_note = (
        f"Wyższy dochód osiąga {higher_earner}. "
        f"Wykorzystanie przez ojca pełnych 9 tygodni rodzicielskiego przyniesie rodzinie "
        f"{round(f_daily * 63 * f_rate / 100, 2)} zł z jego wyższej podstawy wymiaru."
    )

    return ParentalSharingResult(
        is_valid_division=len(val_messages) == 0,
        sharing_mode=data.sharing_mode,
        total_pool_parental_weeks=parental_pool,
        total_pool_maternity_weeks=maternity_pool,
        combined_total_weeks=combined_total,
        mother=mother_summary,
        father=father_summary,
        total_family_benefit_amount=family_total,
        non_transferable_respected=non_transferable_ok,
        validation_messages=val_messages,
        financial_comparison_note=(
            f"Łączny budżet rodziny w trybie {mode_text} wynosi {family_total} zł."
        ),
        legal_basis=[
            "Art. 182(1a) § 1-4 KP (wymiar urlopu rodzicielskiego i 9 tyg. nieprzenoszalne)",
            "Art. 182(1c) KP (możliwość korzystania równocześnie przez oboje rodziców)",
        ],
        recommended_strategy_note=strategy_note,
    )
