from enum import StrEnum

from pydantic import BaseModel, Field


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
    children_born_count: int = Field(default=1, ge=1, le=10)
    is_insured_at_birth: bool = Field(default=True)
    has_za_zyciem_certificate: bool = Field(default=False)
    applied_within_21_days: bool = Field(default=True)
    chosen_variant: BenefitPaymentVariant = BenefitPaymentVariant.UNIFIED_81_5
    mother_maternity_weeks: int = Field(default=20, ge=14)
    father_parental_weeks: int = Field(default=9, ge=0)
    mother_parental_weeks: int = Field(default=32, ge=0)
    parental_leave_parts_count: int = Field(default=1, ge=1, le=10)
    child_age_years: int = Field(default=0, ge=0, le=18)


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

    periods: list[PeriodBreakdown] = Field(default_factory=list)
    refusal_reasons: list[str] = Field(default_factory=list)
    warning_notes: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    legal_notes: list[str] = Field(default_factory=list)
