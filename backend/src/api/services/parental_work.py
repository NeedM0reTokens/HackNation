import math

from src.constants import (
    PARENTAL_MAX_WORK_FRACTION,
    PARENTAL_WEEKS_MULTIPLE_BIRTH,
    PARENTAL_WEEKS_STANDARD,
    PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE,
    PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE,
    PARENTAL_WORK_EXT_LIMIT_MULTIPLE,
    PARENTAL_WORK_EXT_LIMIT_SINGLE,
    PARENTAL_WORK_EXT_LIMIT_ZA_ZYCIEM_MULTIPLE,
    PARENTAL_WORK_EXT_LIMIT_ZA_ZYCIEM_SINGLE,
    SOCIAL_CONTRIBUTIONS_RATE,
)

from ..models.parental_work import (
    ParentalWorkInput,
    ParentalWorkPeriod,
    ParentalWorkResult,
)


def _get_maximum_extension_limit(children_count: int, has_za_zyciem: bool) -> int:
    if has_za_zyciem:
        return (
            PARENTAL_WORK_EXT_LIMIT_ZA_ZYCIEM_SINGLE
            if children_count == 1
            else PARENTAL_WORK_EXT_LIMIT_ZA_ZYCIEM_MULTIPLE
        )
    return (
        PARENTAL_WORK_EXT_LIMIT_SINGLE
        if children_count == 1
        else PARENTAL_WORK_EXT_LIMIT_MULTIPLE
    )


def _get_base_parental_pool(children_count: int, has_za_zyciem: bool) -> int:
    if has_za_zyciem:
        return (
            PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE
            if children_count == 1
            else PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE
        )
    return PARENTAL_WEEKS_STANDARD if children_count == 1 else PARENTAL_WEEKS_MULTIPLE_BIRTH


def calculate_parental_work_combination(data: ParentalWorkInput) -> ParentalWorkResult:
    refusal_reasons: list[str] = []
    legal_basis: list[str] = [
        "Art. 182(1e) Kodeksu Pracy - laczenie urlopu rodzicielskiego z praca (max 1/2 etatu)",
        "Art. 182(1f) Kodeksu Pracy - zasada proporcjonalnego wydluzenia wymiaru urlopu",
        "Art. 31 ust. 4a-4b Ustawy zasilkowej - proporcjonalne zmniejszenie zasilku",
    ]
    practical_tips: list[str] = [
        "Wniosek o laczenie urlopu z praca zloz u pracodawcy min. 21 dni przed rozpoczeciem pracy.",
        "Pracodawca ma obowiazek uwzglednic wniosek, chyba ze organizacja pracy to uniemozliwia.",
        "Laczenie pracy z urlopem pozwala wydluzyc realny okres opieki i podniesc budzet domowy.",
    ]

    max_limit = _get_maximum_extension_limit(
        data.children_born_count, data.has_za_zyciem_certificate
    )
    base_pool = _get_base_parental_pool(data.children_born_count, data.has_za_zyciem_certificate)

    if data.work_fraction > PARENTAL_MAX_WORK_FRACTION:
        refusal_reasons.append(
            f"Wymiar czasu pracy ({data.work_fraction:.2f} etatu) przekracza ustawowy limit "
            f"1/2 pelnego wymiaru czasu pracy (art. 182(1e) KP)."
        )

    if data.parental_weeks_to_combine > base_pool:
        refusal_reasons.append(
            f"Liczba wnioskowanych tygodni ({data.parental_weeks_to_combine}) przekracza ustawowy "
            f"wymiar urlopu rodzicielskiego ({base_pool} tyg.)."
        )

    is_eligible = len(refusal_reasons) == 0

    net_base = round(data.gross_monthly_income * (1.0 - SOCIAL_CONTRIBUTIONS_RATE / 100.0), 2)
    daily_base = round(net_base / 30.0, 2)
    daily_benefit_without_work = round(daily_base * (data.benefit_rate_percentage / 100.0), 2)
    reduced_daily_benefit_with_work = (
        round(daily_benefit_without_work * (1.0 - data.work_fraction), 2) if is_eligible else 0.0
    )

    monthly_salary_from_work_gross = (
        round(data.gross_monthly_income * data.work_fraction, 2) if is_eligible else 0.0
    )
    standard_monthly_benefit_without_work = round(daily_benefit_without_work * 30.0, 2)
    reduced_monthly_benefit_with_work = round(reduced_daily_benefit_with_work * 30.0, 2)
    combined_monthly_income = round(
        monthly_salary_from_work_gross + reduced_monthly_benefit_with_work, 2
    )

    if not is_eligible:
        return ParentalWorkResult(
            is_eligible=False,
            work_fraction=data.work_fraction,
            original_parental_weeks=data.parental_weeks_to_combine,
            extension_weeks=0,
            extension_days=0,
            total_parental_weeks_with_extension=data.parental_weeks_to_combine,
            total_parental_days_with_extension=data.parental_weeks_to_combine * 7,
            maximum_legal_limit_weeks=max_limit,
            calculation_base_net=net_base,
            daily_benefit_without_work=daily_benefit_without_work,
            reduced_daily_benefit_with_work=0.0,
            monthly_salary_from_work_gross=0.0,
            standard_monthly_benefit_without_work=standard_monthly_benefit_without_work,
            reduced_monthly_benefit_with_work=0.0,
            combined_monthly_income=0.0,
            total_benefit_amount=0.0,
            total_work_salary_amount=0.0,
            total_combined_income=0.0,
            pure_leave_total_benefit=0.0,
            financial_gain_compared_to_pure_leave=0.0,
            periods=[],
            refusal_reasons=refusal_reasons,
            legal_basis=legal_basis,
            practical_tips=practical_tips,
        )

    base_weeks = data.parental_weeks_to_combine
    base_days = base_weeks * 7

    if data.work_during_extended_period:
        total_weeks_float = base_weeks / (1.0 - data.work_fraction)
        if total_weeks_float > max_limit:
            total_weeks_float = float(max_limit)
        total_days = math.floor(total_weeks_float * 7)
        extension_days_total = total_days - base_days
    else:
        ext_weeks_float = base_weeks * data.work_fraction
        extension_days_total = math.floor(ext_weeks_float * 7)
        total_days = base_days + extension_days_total
        if total_days > max_limit * 7:
            total_days = max_limit * 7
            extension_days_total = total_days - base_days

    extension_weeks = extension_days_total // 7
    extension_days = extension_days_total % 7
    total_weeks = total_days // 7

    periods: list[ParentalWorkPeriod] = []

    period1_benefit = round(reduced_daily_benefit_with_work * base_days, 2)
    period1_salary = round((monthly_salary_from_work_gross / 30.0) * base_days, 2)
    periods.append(
        ParentalWorkPeriod(
            period_name="Czesc bazowa laczona z praca",
            weeks=base_weeks,
            days=base_days,
            work_fraction=data.work_fraction,
            monthly_salary_gross=monthly_salary_from_work_gross,
            monthly_benefit_net=reduced_monthly_benefit_with_work,
            total_period_salary_gross=period1_salary,
            total_period_benefit_net=period1_benefit,
            total_period_combined_income=round(period1_salary + period1_benefit, 2),
        )
    )

    if extension_days_total > 0:
        if data.work_during_extended_period:
            period2_benefit = round(reduced_daily_benefit_with_work * extension_days_total, 2)
            period2_salary = round(
                (monthly_salary_from_work_gross / 30.0) * extension_days_total, 2
            )
            periods.append(
                ParentalWorkPeriod(
                    period_name="Czesc wydluzona z kontynuacja pracy na czesc etatu",
                    weeks=extension_weeks,
                    days=extension_days_total,
                    work_fraction=data.work_fraction,
                    monthly_salary_gross=monthly_salary_from_work_gross,
                    monthly_benefit_net=reduced_monthly_benefit_with_work,
                    total_period_salary_gross=period2_salary,
                    total_period_benefit_net=period2_benefit,
                    total_period_combined_income=round(period2_salary + period2_benefit, 2),
                )
            )
        else:
            period2_benefit = round(daily_benefit_without_work * extension_days_total, 2)
            period2_salary = 0.0
            periods.append(
                ParentalWorkPeriod(
                    period_name="Czesc wydluzona jako pelny urlop (bez swiadczenia pracy)",
                    weeks=extension_weeks,
                    days=extension_days_total,
                    work_fraction=0.0,
                    monthly_salary_gross=0.0,
                    monthly_benefit_net=standard_monthly_benefit_without_work,
                    total_period_salary_gross=0.0,
                    total_period_benefit_net=period2_benefit,
                    total_period_combined_income=period2_benefit,
                )
            )

    total_benefit = round(sum(p.total_period_benefit_net for p in periods), 2)
    total_salary = round(sum(p.total_period_salary_gross for p in periods), 2)
    total_combined = round(total_benefit + total_salary, 2)

    pure_leave_benefit = round(daily_benefit_without_work * base_days, 2)
    financial_gain = round(total_combined - pure_leave_benefit, 2)

    return ParentalWorkResult(
        is_eligible=True,
        work_fraction=data.work_fraction,
        original_parental_weeks=base_weeks,
        extension_weeks=extension_weeks,
        extension_days=extension_days,
        total_parental_weeks_with_extension=total_weeks,
        total_parental_days_with_extension=total_days,
        maximum_legal_limit_weeks=max_limit,
        calculation_base_net=net_base,
        daily_benefit_without_work=daily_benefit_without_work,
        reduced_daily_benefit_with_work=reduced_daily_benefit_with_work,
        monthly_salary_from_work_gross=monthly_salary_from_work_gross,
        standard_monthly_benefit_without_work=standard_monthly_benefit_without_work,
        reduced_monthly_benefit_with_work=reduced_monthly_benefit_with_work,
        combined_monthly_income=combined_monthly_income,
        total_benefit_amount=total_benefit,
        total_work_salary_amount=total_salary,
        total_combined_income=total_combined,
        pure_leave_total_benefit=pure_leave_benefit,
        financial_gain_compared_to_pure_leave=financial_gain,
        periods=periods,
        refusal_reasons=[],
        legal_basis=legal_basis,
        practical_tips=practical_tips,
    )
