from enum import StrEnum

from pydantic import BaseModel, Field

from src.constants import (
    EMPLOYER_SICK_DAYS_SENIOR,
    EMPLOYER_SICK_DAYS_STANDARD,
    MANDATORY_WAITING_PERIOD_DAYS,
    MAX_PREGNANCY_SICK_LEAVE_DAYS,
    MIN_WAGE_2026,
    PREGNANCY_SICK_LEAVE_RATE,
    SENIOR_AGE_THRESHOLD,
    SOCIAL_CONTRIBUTIONS_RATE,
    STANDARD_SICK_LEAVE_RATE,
    VOLUNTARY_WAITING_PERIOD_DAYS,
    ZUS_DEBT_LIMIT,
)


class EmploymentType(StrEnum):
    EMPLOYMENT_CONTRACT = "EMPLOYMENT_CONTRACT"
    MANDATE_CONTRACT = "MANDATE_CONTRACT"
    B2B = "B2B"
    NONE = "NONE"


class PayerSize(StrEnum):
    ABOVE_20 = "ABOVE_20"
    UP_TO_20 = "UP_TO_20"


class CompanyStatus(StrEnum):
    NORMAL = "NORMAL"
    BANKRUPTCY_OR_LIQUIDATION = "BANKRUPTCY_OR_LIQUIDATION"
    UNLAWFUL_TERMINATION = "UNLAWFUL_TERMINATION"


class BenefitType(StrEnum):
    NONE = "NONE"
    SICK_PAY = "SICK_PAY"
    SICKNESS_BENEFIT = "SICKNESS_BENEFIT"
    REHABILITATION_BENEFIT = "REHABILITATION_BENEFIT"
    MATERNITY_EQUIVALENT_BENEFIT = "MATERNITY_EQUIVALENT_BENEFIT"


class PayerType(StrEnum):
    NONE = "NONE"
    EMPLOYER = "EMPLOYER"
    ZUS = "ZUS"
    EMPLOYER_AND_ZUS = "EMPLOYER_AND_ZUS"


class PregnancyBenefitInput(BaseModel):
    employment_type: EmploymentType
    gross_monthly_income: float = Field(..., gt=0)
    insurance_duration_days: int = Field(..., ge=0)
    exempt_from_waiting_period: bool = Field(False)
    has_pregnancy_code_b: bool = Field(True)
    employee_age: int = Field(30, ge=16, le=100)
    prior_sick_days_current_year: int = Field(0, ge=0)
    sick_leave_duration_days: int = Field(30, gt=0)
    payer_size: PayerSize = PayerSize.ABOVE_20
    zus_debt_amount: float = Field(0.0, ge=0.0)
    company_status: CompanyStatus = CompanyStatus.NORMAL
    pregnancy_week: int | None = Field(None, ge=1, le=42)
    exhausted_sickness_period: bool = Field(False)


class PregnancyBenefitResult(BaseModel):
    is_eligible: bool
    benefit_type: BenefitType
    benefit_percentage: float
    disbursing_entity: PayerType

    calculation_base_net: float
    daily_rate: float
    total_amount: float

    employer_days: int
    employer_amount: float
    zus_days: int
    zus_amount: float

    max_coverage_days: int

    refusal_reasons: list[str] = []
    required_documents: list[str] = []
    legal_notes: list[str] = []


def _calculate_net_base(gross: float) -> float:
    return round(gross * (1 - SOCIAL_CONTRIBUTIONS_RATE / 100), 2)


def _build_ineligible_result(
    reasons: list[str],
    documents: list[str] | None = None,
    legal_notes: list[str] | None = None,
) -> PregnancyBenefitResult:
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
        max_coverage_days=MAX_PREGNANCY_SICK_LEAVE_DAYS,
        refusal_reasons=reasons,
        required_documents=documents or [],
        legal_notes=legal_notes or [],
    )


def calculate_pregnancy_benefit(data: PregnancyBenefitInput) -> PregnancyBenefitResult:
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
        MANDATORY_WAITING_PERIOD_DAYS
        if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT
        else VOLUNTARY_WAITING_PERIOD_DAYS
    )
    if not data.exempt_from_waiting_period and data.insurance_duration_days < required_waiting_days:
        missing_days = required_waiting_days - data.insurance_duration_days
        refusal_reasons.append(
            f"Nie upłynął wymagany okres wyczekiwania: {required_waiting_days} dni. "
            + f"Aktualny staż: {data.insurance_duration_days} dni (brakuje {missing_days} dni)."
        )

    if data.employment_type == EmploymentType.B2B and data.zus_debt_amount > ZUS_DEBT_LIMIT:
        refusal_reasons.append(
            f"Zadłużenie w ZUS ({data.zus_debt_amount:.2f} zł) przekracza limit "
            + f"{ZUS_DEBT_LIMIT:.2f} zł. Spłata w ciągu 6 miesięcy przywraca prawo do zasiłku."
        )

    if refusal_reasons:
        return _build_ineligible_result(refusal_reasons)

    calculation_base = _calculate_net_base(data.gross_monthly_income)
    if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT:
        min_base = _calculate_net_base(MIN_WAGE_2026)
        calculation_base = max(calculation_base, min_base)

    daily_rate = round(calculation_base / 30, 2)
    benefit_rate = (
        PREGNANCY_SICK_LEAVE_RATE if data.has_pregnancy_code_b else STANDARD_SICK_LEAVE_RATE
    )

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
                EMPLOYER_SICK_DAYS_SENIOR
                if data.employee_age >= SENIOR_AGE_THRESHOLD
                else EMPLOYER_SICK_DAYS_STANDARD
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
            disbursing_entity = (
                PayerType.EMPLOYER if data.payer_size == PayerSize.ABOVE_20 else PayerType.ZUS
            )

    total_amount = round(employer_amount + zus_amount, 2)

    if data.employment_type == EmploymentType.EMPLOYMENT_CONTRACT:
        required_documents.append("e-ZLA z kodem B (elektronicznie do ZUS i pracodawcy)")
        if data.payer_size == PayerSize.UP_TO_20:
            required_documents.append("Zaświadczenie płatnika składek Z-3")
        legal_notes.append("Ochrona stosunku pracy pracownicy w ciąży (art. 177 KP).")
        if data.pregnancy_week and data.pregnancy_week >= 13:
            legal_notes.append("Przedłużenie umowy do dnia porodu (art. 177 § 3 KP).")
    elif data.employment_type == EmploymentType.MANDATE_CONTRACT:
        required_documents.extend(["e-ZLA z kodem B", "Zaświadczenie płatnika składek Z-3a"])
    elif data.employment_type == EmploymentType.B2B:
        required_documents.extend(["e-ZLA z kodem B", "Wniosek o zasiłek chorobowy ZAS-53"])

    legal_notes.append(f"Maksymalny okres zasiłkowy w ciąży: {MAX_PREGNANCY_SICK_LEAVE_DAYS} dni.")
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
        max_coverage_days=MAX_PREGNANCY_SICK_LEAVE_DAYS,
        refusal_reasons=[],
        required_documents=required_documents,
        legal_notes=legal_notes,
    )
