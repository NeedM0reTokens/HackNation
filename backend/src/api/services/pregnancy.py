from ..models.pregnancy import (
    BenefitType,
    CompanyStatus,
    EmploymentType,
    PayerSize,
    PayerType,
    PregnancyBenefitInput,
    PregnancyBenefitResult,
)
from .admin import config_service


def _calculate_net_base(gross: float) -> float:
    social_rate = config_service.get_config().benefit_rates.social_contributions_rate
    return round(gross * (1 - social_rate / 100), 2)


def _build_ineligible_result(
    reasons: list[str],
    documents: list[str] | None = None,
    legal_notes: list[str] | None = None,
) -> PregnancyBenefitResult:
    max_days = config_service.get_config().periods_and_limits.max_pregnancy_sick_leave_days
    return PregnancyBenefitResult(
        is_eligible=False,
        benefit_type=BenefitType.NONE,
        benefit_percentage=0.0,
        disbursing_entity=PayerType.NONE,
        calculation_base_net=0.0,
        daily_rate=0.0,
        total_amount=0.0,
        employer_days=0,
        employer_amount=0.0,
        zus_days=0,
        zus_amount=0.0,
        max_coverage_days=max_days,
        refusal_reasons=reasons,
        required_documents=documents or [],
        legal_notes=legal_notes or [],
    )


def calculate_pregnancy_benefit(data: PregnancyBenefitInput) -> PregnancyBenefitResult:
    cfg = config_service.get_config()
    rates = cfg.benefit_rates
    amounts = cfg.benefit_amounts
    limits = cfg.periods_and_limits

    min_wage = amounts.min_wage_2026
    debt_limit = amounts.zus_debt_limit
    sick_b_rate = rates.pregnancy_sick_leave_rate
    sick_std_rate = rates.standard_sick_leave_rate
    max_days = limits.max_pregnancy_sick_leave_days
    waiting_mandatory = limits.mandatory_waiting_period_days
    waiting_voluntary = limits.voluntary_waiting_period_days

    refusal_reasons: list[str] = []
    legal_notes: list[str] = []
    required_documents: list[str] = []

    if data.employment_type == EmploymentType.NONE:
        return _build_ineligible_result(
            reasons=["Brak tytułu do ubezpieczenia chorobowego."],
            documents=["Wniosek o świadczenie rodzicielskie (tzw. kosiniakowe) do MOPS/GOPS"],
            legal_notes=["Osobom nieubezpieczonym przysługuje świadczenie rodzicielskie."],
        )

    required_waiting_days = (
        waiting_mandatory
        if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT
        else waiting_voluntary
    )
    if not data.exempt_from_waiting_period and data.insurance_duration_days < required_waiting_days:
        missing_days = required_waiting_days - data.insurance_duration_days
        refusal_reasons.append(
            f"Nie upłynął wymagany okres wyczekiwania: {required_waiting_days} dni. "
            + f"Aktualny staż: {data.insurance_duration_days} dni (brakuje {missing_days} dni)."
        )

    if data.employment_type == EmploymentType.B2B and data.zus_debt_amount > debt_limit:
        refusal_reasons.append(
            f"Zadłużenie w ZUS ({data.zus_debt_amount:.2f} zł) przekracza limit "
            + f"{debt_limit:.2f} zł. Spłata w ciągu 6 miesięcy przywraca prawo do zasiłku."
        )

    if refusal_reasons:
        return _build_ineligible_result(refusal_reasons)

    calculation_base = _calculate_net_base(data.gross_monthly_income)
    if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT:
        min_base = _calculate_net_base(min_wage)
        calculation_base = max(calculation_base, min_base)

    daily_rate = round(calculation_base / 30, 2)
    benefit_rate = sick_b_rate if data.has_pregnancy_code_b else sick_std_rate

    is_terminated = data.company_status in (
        CompanyStatus.BANKRUPTCY_OR_LIQUIDATION,
        CompanyStatus.UNLAWFUL_TERMINATION,
    )

    if is_terminated:
        benefit_type = BenefitType.MATERNITY_EQUIVALENT_BENEFIT
        disbursing_entity = PayerType.ZUS
        employer_days, employer_amount = 0, 0.0
        zus_days = data.sick_leave_duration_days
        zus_amount = round(daily_rate * zus_days * benefit_rate / 100, 2)
        legal_notes.append("Zasiłek w wysokości macierzyńskiego do dnia porodu (wypłaca ZUS).")
        required_documents.extend(
            [
                "e-ZLA z kodem B lub zaświadczenie lekarskie",
                "Świadectwo pracy lub prawomocny wyrok sądu",
                "Oświadczenie o braku innego zatrudnienia",
            ]
        )
    elif data.exhausted_sickness_period:
        benefit_type = BenefitType.REHABILITATION_BENEFIT
        disbursing_entity = PayerType.ZUS
        employer_days, employer_amount = 0, 0.0
        zus_days = data.sick_leave_duration_days
        zus_amount = round(daily_rate * zus_days * benefit_rate / 100, 2)
        legal_notes.append("Świadczenie rehabilitacyjne po 270 dniach zasiłku (100% w ciąży).")
        required_documents.extend(
            [
                "Wniosek o świadczenie rehabilitacyjne",
                "Zaświadczenie o stanie zdrowia",
            ]
        )
    else:
        benefit_type = BenefitType.SICKNESS_BENEFIT
        if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT:
            employer_limit = (
                limits.employer_sick_days_senior
                if data.employee_age >= limits.senior_age_threshold
                else limits.employer_sick_days_standard
            )
            available_employer_days = max(0, employer_limit - data.prior_sick_days_current_year)
            employer_days = min(data.sick_leave_duration_days, available_employer_days)
            zus_days = data.sick_leave_duration_days - employer_days
            employer_amount = round(daily_rate * employer_days * benefit_rate / 100, 2)
            zus_amount = round(daily_rate * zus_days * benefit_rate / 100, 2)

            if employer_days > 0 and zus_days > 0:
                disbursing_entity = PayerType.EMPLOYER_AND_ZUS
            elif employer_days > 0:
                disbursing_entity = PayerType.EMPLOYER
            else:
                disbursing_entity = PayerType.ZUS
        else:
            employer_days, employer_amount = 0, 0.0
            zus_days = data.sick_leave_duration_days
            zus_amount = round(daily_rate * zus_days * benefit_rate / 100, 2)
            if data.employment_type == EmploymentType.B2B:
                disbursing_entity = PayerType.ZUS
            else:
                disbursing_entity = (
                    PayerType.EMPLOYER if data.payer_size == PayerSize.ABOVE_20 else PayerType.ZUS
                )

    total_amount = round(employer_amount + zus_amount, 2)

    if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT:
        required_documents.append("e-ZLA z kodem B (elektronicznie do ZUS i pracodawcy)")
        if data.payer_size == PayerSize.UP_TO_20:
            required_documents.append("Zaświadczenie płatnika składek Z-3")
        else:
            legal_notes.append(
                "Płatnik > 20 ubezpieczonych: pracodawca wypłaca zasiłek bezpośrednio "
                + "(rozliczając w ciężar składek FUS/ZUS w deklaracji ZUS DRA)."
            )
        legal_notes.append("Ochrona stosunku pracy pracownicy w ciąży (art. 177 KP).")
        if data.pregnancy_week and data.pregnancy_week >= 13:
            legal_notes.append("Przedłużenie umowy do dnia porodu (art. 177 § 3 KP).")
    elif data.employment_type == EmploymentType.MANDATE_CONTRACT:
        required_documents.extend(["e-ZLA z kodem B", "Zaświadczenie płatnika składek Z-3a"])
    elif data.employment_type == EmploymentType.B2B:
        required_documents.extend(["e-ZLA z kodem B", "Wniosek o zasiłek chorobowy ZAS-53"])

    legal_notes.append(f"Maksymalny okres zasiłkowy w ciąży: {max_days} dni.")
    legal_notes.append(f"Wysokość świadczenia: {benefit_rate}% podstawy wymiaru.")

    return PregnancyBenefitResult(
        is_eligible=True,
        benefit_type=benefit_type,
        benefit_percentage=benefit_rate,
        disbursing_entity=disbursing_entity,
        calculation_base_net=calculation_base,
        daily_rate=daily_rate,
        total_amount=total_amount,
        employer_days=employer_days,
        employer_amount=employer_amount,
        zus_days=zus_days,
        zus_amount=zus_amount,
        max_coverage_days=max_days,
        refusal_reasons=[],
        required_documents=required_documents,
        legal_notes=legal_notes,
    )
