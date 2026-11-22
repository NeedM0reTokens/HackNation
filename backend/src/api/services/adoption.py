from ...constants import (
    ADOPTION_CHILD_DEFERRED_SCHOOL_AGE_LIMIT,
    ADOPTION_CHILD_STANDARD_AGE_LIMIT,
    ADOPTION_MAX_PARENTAL_LEAVE_CHILD_AGE,
    ADOPTION_MIN_GUARANTEED_MATERNITY_WEEKS,
    FULL_MATERNITY_RATE,
    MATERNITY_WEEKS_BY_CHILD_COUNT,
    NON_TRANSFERABLE_PARENTAL_WEEKS,
    PARENTAL_WEEKS_MULTIPLE_BIRTH,
    PARENTAL_WEEKS_STANDARD,
    PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE,
    PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE,
    SOCIAL_CONTRIBUTIONS_RATE,
    STANDARD_PARENTAL_RATE,
    UNIFIED_BENEFIT_RATE,
)
from ..models.adoption import (
    AdoptionLeaveInput,
    AdoptionLeaveResult,
    CaregiverType,
)
from ..models.maternity import (
    BenefitPaymentVariant,
    PeriodBreakdown,
)


def _get_maternity_condition_weeks(children_count: int) -> int:
    return MATERNITY_WEEKS_BY_CHILD_COUNT.get(
        children_count,
        MATERNITY_WEEKS_BY_CHILD_COUNT[5],
    )


def _get_parental_weeks(children_count: int, has_za_zyciem: bool) -> int:
    if has_za_zyciem:
        return (
            PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE
            if children_count == 1
            else PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE
        )
    return PARENTAL_WEEKS_STANDARD if children_count == 1 else PARENTAL_WEEKS_MULTIPLE_BIRTH


def calculate_adoption_leave(data: AdoptionLeaveInput) -> AdoptionLeaveResult:
    refusal_reasons: list[str] = []
    legal_basis: list[str] = [
        "Art. 183 § 1 Kodeksu Pracy - wymiar urlopu na warunkach urlopu macierzynskiego",
        "Art. 183 § 2 Kodeksu Pracy - gwarantowany minimalny wymiar 9 tygodni urlopu",
        (
            "Art. 183 § 4-5 Kodeksu Pracy - urlop rodzicielski dla opiekunow "
            "przyjmujacych dziecko (do 14 r.z.)"
        ),
        "Art. 29 ust. 1 pkt 2 Ustawy zasilkowej - prawo do zasilku macierzynskiego dla opiekunow",
    ]
    required_documents: list[str] = [
        (
            "Zaswiadczenie sadu opiekunczego o wystapieniu z wnioskiem o wszczecie "
            "postepowania o przysposobienie LUB orzeczenie sadu o umieszczeniu w rodzinie "
            "zastepczej niezawodowej"
        ),
        "Oswiadczenie pracownika o dacie przyjecia dziecka na wychowanie",
        "Dokument potwierdzajacy wiek dziecka (skrocony odpis aktu urodzenia)",
        (
            "Decyzja o odroczeniu obowiazku szkolnego wydana przez dyrektora szkoly "
            "(jesli dziecko ma 7-10 lat)"
        ),
        "Zaswiadczenie lekarskie 'Za zyciem' (jesli dotyczy)",
        (
            "Wniosek o udzielenie urlopu na warunkach macierzynskiego i rodzicielskiego "
            "zlozony do pracodawcy"
        ),
    ]
    practical_tips: list[str] = [
        (
            "Wniosek o pelny pakiet urlopow ze stawka 81.5% nalezy zlozyc w ciagu 21 dni "
            "od przyjecia dziecka i zlozenia wniosku do sadu."
        ),
        (
            "Nawet jesli dziecko ma blisko 7 lat (np. 6 lat i 11 miesiecy), przysluguje Ci "
            "gwarantowane ustawowo min. 9 tygodni urlopu."
        ),
        (
            "Urlop rodzicielski po przysposobieniu mozna wykorzystac az do ukonczenia przez "
            "dziecko 14. roku zycia."
        ),
    ]

    if data.caregiver_type == CaregiverType.FOSTER_FAMILY_PROFESSIONAL:
        refusal_reasons.append(
            "Rodzinie zastepczej zawodowej nie przysluguje urlop na warunkach urlopu "
            "macierzynskiego ani rodzicielskiego (art. 183 § 1 KP). Osoby te wykonuja opieke "
            "zawodowo na podstawie umowy ze starosta."
        )

    if not data.is_insured:
        refusal_reasons.append(
            "Brak aktywnego ubezpieczenia chorobowego na dzien przyjecia dziecka na wychowanie "
            "wyklucza prawo do zasilku macierzynskiego z ZUS."
        )

    maternity_age_limit = (
        ADOPTION_CHILD_DEFERRED_SCHOOL_AGE_LIMIT
        if data.has_deferred_school_obligation
        else ADOPTION_CHILD_STANDARD_AGE_LIMIT
    )
    parental_age_limit = ADOPTION_MAX_PARENTAL_LEAVE_CHILD_AGE

    child_age_years = data.child_age_years
    child_age_months = data.child_age_months
    total_child_months = child_age_years * 12 + child_age_months
    max_maternity_months = maternity_age_limit * 12
    max_parental_months = parental_age_limit * 12

    if total_child_months >= max_maternity_months:
        refusal_reasons.append(
            f"Dziecko ukonczylo juz limit wieku dla urlopu na warunkach macierzynskiego "
            f"({maternity_age_limit} lat - art. 183 § 1 KP)."
        )

    if total_child_months >= max_parental_months:
        refusal_reasons.append(
            f"Dziecko ukonczylo limit wieku dla urlopu rodzicielskiego "
            f"({parental_age_limit} lat - art. 183 § 5 KP)."
        )

    is_eligible = len(refusal_reasons) == 0

    net_base = round(data.gross_monthly_income * (1.0 - SOCIAL_CONTRIBUTIONS_RATE / 100.0), 2)
    daily_base = round(net_base / 30.0, 2)

    if not is_eligible:
        return AdoptionLeaveResult(
            is_eligible=False,
            caregiver_type=data.caregiver_type,
            maternity_condition_weeks=0,
            is_minimum_guaranteed_weeks_applied=False,
            parental_weeks_available=0,
            non_transferable_parental_weeks=0,
            total_leave_weeks=0,
            child_age_limit_maternity_years=maternity_age_limit,
            child_age_limit_parental_years=parental_age_limit,
            calculation_base_net=net_base,
            daily_benefit_rate=0.0,
            maternity_benefit_amount=0.0,
            parental_benefit_amount=0.0,
            total_benefit_amount=0.0,
            periods_breakdown=[],
            refusal_reasons=refusal_reasons,
            legal_basis=legal_basis,
            required_documents=required_documents,
            practical_tips=practical_tips,
        )

    standard_maternity_weeks = _get_maternity_condition_weeks(data.children_adopted_count)
    months_left_to_maternity_limit = max_maternity_months - total_child_months
    weeks_left_to_maternity_limit = (months_left_to_maternity_limit * 365) // (12 * 7)

    is_min_guaranteed_applied = False
    if weeks_left_to_maternity_limit < standard_maternity_weeks:
        maternity_weeks = max(
            ADOPTION_MIN_GUARANTEED_MATERNITY_WEEKS, weeks_left_to_maternity_limit
        )
        is_min_guaranteed_applied = True
    else:
        maternity_weeks = standard_maternity_weeks

    parental_pool_weeks = _get_parental_weeks(
        data.children_adopted_count, data.has_za_zyciem_certificate
    )

    months_left_to_parental_limit = max_parental_months - total_child_months
    weeks_left_to_parental_limit = (months_left_to_parental_limit * 365) // (12 * 7)

    actual_parental_weeks = min(
        parental_pool_weeks, max(0, weeks_left_to_parental_limit - maternity_weeks)
    )
    total_weeks = maternity_weeks + actual_parental_weeks

    use_unified = (
        data.applied_within_21_days and data.chosen_variant == BenefitPaymentVariant.UNIFIED_81_5
    )
    maternity_rate = UNIFIED_BENEFIT_RATE if use_unified else FULL_MATERNITY_RATE
    parental_rate = UNIFIED_BENEFIT_RATE if use_unified else STANDARD_PARENTAL_RATE

    maternity_daily_benefit = round(daily_base * (maternity_rate / 100.0), 2)
    parental_daily_benefit = round(daily_base * (parental_rate / 100.0), 2)

    maternity_days = maternity_weeks * 7
    parental_days = actual_parental_weeks * 7

    maternity_benefit_amount = round(maternity_daily_benefit * maternity_days, 2)
    parental_benefit_amount = round(parental_daily_benefit * parental_days, 2)
    total_benefit_amount = round(maternity_benefit_amount + parental_benefit_amount, 2)

    periods_breakdown: list[PeriodBreakdown] = [
        PeriodBreakdown(
            name="Urlop na warunkach urlopu macierzynskiego",
            weeks=maternity_weeks,
            days=maternity_days,
            rate_percentage=maternity_rate,
            monthly_amount=round(maternity_daily_benefit * 30.0, 2),
            total_amount=maternity_benefit_amount,
            taken_by="caregiver",
        ),
        PeriodBreakdown(
            name="Urlop rodzicielski po przysposobieniu",
            weeks=actual_parental_weeks,
            days=parental_days,
            rate_percentage=parental_rate,
            monthly_amount=round(parental_daily_benefit * 30.0, 2),
            total_amount=parental_benefit_amount,
            taken_by="caregiver",
        ),
    ]

    return AdoptionLeaveResult(
        is_eligible=True,
        caregiver_type=data.caregiver_type,
        maternity_condition_weeks=maternity_weeks,
        is_minimum_guaranteed_weeks_applied=is_min_guaranteed_applied,
        parental_weeks_available=actual_parental_weeks,
        non_transferable_parental_weeks=NON_TRANSFERABLE_PARENTAL_WEEKS,
        total_leave_weeks=total_weeks,
        child_age_limit_maternity_years=maternity_age_limit,
        child_age_limit_parental_years=parental_age_limit,
        calculation_base_net=net_base,
        daily_benefit_rate=maternity_daily_benefit,
        maternity_benefit_amount=maternity_benefit_amount,
        parental_benefit_amount=parental_benefit_amount,
        total_benefit_amount=total_benefit_amount,
        periods_breakdown=periods_breakdown,
        refusal_reasons=[],
        legal_basis=legal_basis,
        required_documents=required_documents,
        practical_tips=practical_tips,
    )
