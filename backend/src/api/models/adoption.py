from enum import StrEnum

from pydantic import BaseModel, Field

from src.api.models.maternity import (
    BenefitPaymentVariant,
    MaternityEmploymentType,
    PeriodBreakdown,
)


class CaregiverType(StrEnum):
    ADOPTION = "ADOPTION"
    FOSTER_FAMILY_NON_PROFESSIONAL = "FOSTER_FAMILY_NON_PROFESSIONAL"
    FOSTER_FAMILY_PROFESSIONAL = "FOSTER_FAMILY_PROFESSIONAL"


class AdoptionLeaveInput(BaseModel):
    gross_monthly_income: float = Field(
        ..., gt=0, description="Gross monthly income before leave in PLN"
    )
    employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    is_insured: bool = Field(True, description="Active sickness insurance at the date of takeover")
    caregiver_type: CaregiverType = Field(
        CaregiverType.ADOPTION,
        description="Type of foster custody or adoption",
    )
    children_adopted_count: int = Field(
        1, ge=1, le=10, description="Number of children adopted/fostered simultaneously"
    )
    child_age_years: int = Field(
        3, ge=0, le=18, description="Child's age in full years at placement"
    )
    child_age_months: int = Field(0, ge=0, le=11, description="Additional months of child's age")
    has_deferred_school_obligation: bool = Field(
        False,
        description="Decision on postponing school duty (extends limit to 10 years)",
    )
    has_za_zyciem_certificate: bool = Field(
        False,
        description="Child has certificate under 'Za życiem' Act (severe disability)",
    )
    applied_within_21_days: bool = Field(
        True,
        description="Application submitted within 21 days of child placement and court filing",
    )
    chosen_variant: BenefitPaymentVariant = BenefitPaymentVariant.UNIFIED_81_5


class AdoptionLeaveResult(BaseModel):
    is_eligible: bool
    caregiver_type: CaregiverType

    maternity_condition_weeks: int
    is_minimum_guaranteed_weeks_applied: bool
    parental_weeks_available: int
    non_transferable_parental_weeks: int
    total_leave_weeks: int

    child_age_limit_maternity_years: int
    child_age_limit_parental_years: int

    calculation_base_net: float
    daily_benefit_rate: float
    maternity_benefit_amount: float
    parental_benefit_amount: float
    total_benefit_amount: float

    periods_breakdown: list[PeriodBreakdown] = Field(default_factory=list)
    refusal_reasons: list[str] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    practical_tips: list[str] = Field(default_factory=list)
