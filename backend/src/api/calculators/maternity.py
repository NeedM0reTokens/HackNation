from enum import StrEnum

from pydantic import BaseModel, Field

from src.constants import (
    FULL_MATERNITY_RATE,
    LONG_APPLICATION_DEADLINE_DAYS,
    MANDATORY_MOTHER_MATERNITY_WEEKS,
    MATERNITY_WEEKS_BY_CHILD_COUNT,
    MAX_CHILD_AGE_PARENTAL_LEAVE_YEARS,
    MAX_PARENTAL_LEAVE_PARTS,
    MIN_WAGE_2026,
    NON_TRANSFERABLE_PARENTAL_WEEKS,
    PARENTAL_WEEKS_MULTIPLE_BIRTH,
    PARENTAL_WEEKS_STANDARD,
    PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE,
    PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE,
    SOCIAL_CONTRIBUTIONS_RATE,
    STANDARD_PARENTAL_RATE,
    UNIFIED_BENEFIT_RATE,
)


class MaternityEmploymentType(StrEnum):
    EMPLOYMENT_CONTRACT = "EMPLOYMENT_CONTRACT"
    MANDATE_CONTRACT = "MANDATE_CONTRACT"
    B2B = "B2B"
    NONE = "NONE"


class BenefitPaymentVariant(StrEnum):
    UNIFIED_81_5 = "UNIFIED_81_5"
    VARIABLE_100_70 = "VARIABLE_100_70"


class MaternityParentalInput(BaseModel):
    employment_type: MaternityEmploymentType
    gross_monthly_income: float = Field(..., gt=0)
    children_born_count: int = Field(1, ge=1, le=10)
    is_insured_at_birth: bool = Field(True)
    has_za_zyciem_certificate: bool = Field(False)
    applied_within_21_days: bool = Field(True)
    chosen_variant: BenefitPaymentVariant = BenefitPaymentVariant.UNIFIED_81_5
    mother_maternity_weeks: int = Field(20, ge=14)
    father_parental_weeks: int = Field(9, ge=0)
    mother_parental_weeks: int = Field(32, ge=0)
    parental_leave_parts_count: int = Field(1, ge=1, le=10)
    child_age_years: int = Field(0, ge=0, le=18)


class PeriodBreakdown(BaseModel):
    name: str
    weeks: int
    days: int
    rate_percentage: float
    monthly_amount: float
    total_amount: float
    taken_by: str


class MaternityParentalResult(BaseModel):
    is_eligible: bool
    total_maternity_weeks: int
    total_parental_weeks: int
    total_weeks: int

    mother_total_weeks: int
    father_total_weeks: int

    calculation_base_net: float
    daily_rate: float
    total_benefit_amount: float

    chosen_variant: BenefitPaymentVariant
    comparison_unified_total: float
    comparison_variable_total: float

    periods: list[PeriodBreakdown] = []
    refusal_reasons: list[str] = []
    warning_notes: list[str] = []
    required_documents: list[str] = []
    legal_notes: list[str] = []


def _calculate_net_base(gross: float) -> float:
    return round(gross * (1 - SOCIAL_CONTRIBUTIONS_RATE / 100), 2)


def get_maternity_weeks(children_count: int) -> int:
    return MATERNITY_WEEKS_BY_CHILD_COUNT.get(
        children_count,
        MATERNITY_WEEKS_BY_CHILD_COUNT[5],
    )


def get_parental_weeks(children_count: int, has_za_zyciem: bool) -> int:
    if has_za_zyciem:
        return (
            PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE
            if children_count == 1
            else PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE
        )
    return PARENTAL_WEEKS_STANDARD if children_count == 1 else PARENTAL_WEEKS_MULTIPLE_BIRTH


def calculate_maternity_parental_benefit(
    data: MaternityParentalInput,
) -> MaternityParentalResult:
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

    maternity_total_weeks = get_maternity_weeks(data.children_born_count)
    parental_total_weeks = get_parental_weeks(
        data.children_born_count, data.has_za_zyciem_certificate
    )
    grand_total_weeks = maternity_total_weeks + parental_total_weeks

    if data.mother_maternity_weeks < MANDATORY_MOTHER_MATERNITY_WEEKS:
        refusal_reasons.append(
            f"Matka musi wykorzystać co najmniej {MANDATORY_MOTHER_MATERNITY_WEEKS} tygodni "
            + "urlopu macierzyńskiego osobiście (art. 180 § 4 KP)."
        )

    if data.mother_maternity_weeks > maternity_total_weeks:
        refusal_reasons.append(
            f"Wymiar urlopu macierzyńskiego dla {data.children_born_count} dzieci "
            + f"wynosi maksymalnie {maternity_total_weeks} tygodni."
        )

    father_maternity_weeks = max(0, maternity_total_weeks - data.mother_maternity_weeks)

    shared_pool_limit = parental_total_weeks - NON_TRANSFERABLE_PARENTAL_WEEKS
    if data.mother_parental_weeks > shared_pool_limit:
        refusal_reasons.append(
            f"Maksymalna pula rodzicielskiego dla jednego rodzica to {shared_pool_limit} tyg. "
            + f"(z puli {parental_total_weeks} tyg., 9 tyg. jest wyłączne dla drugiego rodzica)."
        )

    if data.parental_leave_parts_count > MAX_PARENTAL_LEAVE_PARTS:
        refusal_reasons.append(
            f"Urlop rodzicielski można podzielić na maksymalnie {MAX_PARENTAL_LEAVE_PARTS} części."
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

    calculation_base = _calculate_net_base(data.gross_monthly_income)
    if data.employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        min_base = _calculate_net_base(MIN_WAGE_2026)
        calculation_base = max(calculation_base, min_base)

    daily_rate = round(calculation_base / 30, 2)

    active_variant = data.chosen_variant
    if active_variant == BenefitPaymentVariant.UNIFIED_81_5 and not data.applied_within_21_days:
        active_variant = BenefitPaymentVariant.VARIABLE_100_70
        warning_notes.append(
            f"Wniosek złożony po terminie {LONG_APPLICATION_DEADLINE_DAYS} dni po porodzie. "
            + "Automatycznie zastosowano wariant zmienny (100% / 70%)."
        )

    total_parental_pool_taken = data.mother_parental_weeks + data.father_parental_weeks

    var_maternity_days = maternity_total_weeks * 7
    var_parental_days = total_parental_pool_taken * 7
    variable_total = round(
        (daily_rate * var_maternity_days * FULL_MATERNITY_RATE / 100)
        + (daily_rate * var_parental_days * STANDARD_PARENTAL_RATE / 100),
        2,
    )

    mother_pool_days = (
        maternity_total_weeks + min(data.mother_parental_weeks, shared_pool_limit)
    ) * 7
    father_guaranteed_days = data.father_parental_weeks * 7
    unified_total = round(
        (daily_rate * mother_pool_days * UNIFIED_BENEFIT_RATE / 100)
        + (daily_rate * father_guaranteed_days * STANDARD_PARENTAL_RATE / 100),
        2,
    )

    periods: list[PeriodBreakdown] = []

    if active_variant == BenefitPaymentVariant.UNIFIED_81_5:
        periods.append(
            PeriodBreakdown(
                name="Urlop macierzyński matki (wariant uśredniony)",
                weeks=data.mother_maternity_weeks,
                days=data.mother_maternity_weeks * 7,
                rate_percentage=UNIFIED_BENEFIT_RATE,
                monthly_amount=round(daily_rate * 30 * UNIFIED_BENEFIT_RATE / 100, 2),
                total_amount=round(
                    daily_rate * data.mother_maternity_weeks * 7 * UNIFIED_BENEFIT_RATE / 100, 2
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
                    rate_percentage=UNIFIED_BENEFIT_RATE,
                    monthly_amount=round(daily_rate * 30 * UNIFIED_BENEFIT_RATE / 100, 2),
                    total_amount=round(
                        daily_rate * father_maternity_weeks * 7 * UNIFIED_BENEFIT_RATE / 100, 2
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
                    rate_percentage=UNIFIED_BENEFIT_RATE,
                    monthly_amount=round(daily_rate * 30 * UNIFIED_BENEFIT_RATE / 100, 2),
                    total_amount=round(
                        daily_rate * data.mother_parental_weeks * 7 * UNIFIED_BENEFIT_RATE / 100, 2
                    ),
                    taken_by="Matka",
                )
            )
        if data.father_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name="Część urlopu rodzicielskiego ojca (9 tyg.)",
                    weeks=data.father_parental_weeks,
                    days=data.father_parental_weeks * 7,
                    rate_percentage=STANDARD_PARENTAL_RATE,
                    monthly_amount=round(daily_rate * 30 * STANDARD_PARENTAL_RATE / 100, 2),
                    total_amount=round(
                        daily_rate * data.father_parental_weeks * 7 * STANDARD_PARENTAL_RATE / 100,
                        2,
                    ),
                    taken_by="Ojciec",
                )
            )
        chosen_total = unified_total
    else:
        periods.append(
            PeriodBreakdown(
                name="Urlop macierzyński matki (wariant 100%)",
                weeks=data.mother_maternity_weeks,
                days=data.mother_maternity_weeks * 7,
                rate_percentage=FULL_MATERNITY_RATE,
                monthly_amount=round(daily_rate * 30 * FULL_MATERNITY_RATE / 100, 2),
                total_amount=round(
                    daily_rate * data.mother_maternity_weeks * 7 * FULL_MATERNITY_RATE / 100, 2
                ),
                taken_by="Matka",
            )
        )
        if father_maternity_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name="Przejęta część urlopu macierzyńskiego (100%)",
                    weeks=father_maternity_weeks,
                    days=father_maternity_weeks * 7,
                    rate_percentage=FULL_MATERNITY_RATE,
                    monthly_amount=round(daily_rate * 30 * FULL_MATERNITY_RATE / 100, 2),
                    total_amount=round(
                        daily_rate * father_maternity_weeks * 7 * FULL_MATERNITY_RATE / 100, 2
                    ),
                    taken_by="Ojciec",
                )
            )
        if data.mother_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name="Urlop rodzicielski matki (70%)",
                    weeks=data.mother_parental_weeks,
                    days=data.mother_parental_weeks * 7,
                    rate_percentage=STANDARD_PARENTAL_RATE,
                    monthly_amount=round(daily_rate * 30 * STANDARD_PARENTAL_RATE / 100, 2),
                    total_amount=round(
                        daily_rate * data.mother_parental_weeks * 7 * STANDARD_PARENTAL_RATE / 100,
                        2,
                    ),
                    taken_by="Matka",
                )
            )
        if data.father_parental_weeks > 0:
            periods.append(
                PeriodBreakdown(
                    name="Urlop rodzicielski ojca (70%)",
                    weeks=data.father_parental_weeks,
                    days=data.father_parental_weeks * 7,
                    rate_percentage=STANDARD_PARENTAL_RATE,
                    monthly_amount=round(daily_rate * 30 * STANDARD_PARENTAL_RATE / 100, 2),
                    total_amount=round(
                        daily_rate * data.father_parental_weeks * 7 * STANDARD_PARENTAL_RATE / 100,
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
        f"Każdemu rodzicowi przysługuje nieprzenoszalne prawo do {NON_TRANSFERABLE_PARENTAL_WEEKS} "
        + "tygodni urlopu rodzicielskiego (art. 1821a § 4 KP)."
    )
    legal_notes.append(
        "Niewykorzystanie 9 tygodni przez ojca powoduje bezpowrotne przepadnięcie tej części."
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
