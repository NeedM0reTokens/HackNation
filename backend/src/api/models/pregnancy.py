from enum import StrEnum

from pydantic import BaseModel, Field


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

    refusal_reasons: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    legal_notes: list[str] = Field(default_factory=list)
