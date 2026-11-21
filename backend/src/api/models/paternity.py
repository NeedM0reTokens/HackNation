from enum import StrEnum

from pydantic import BaseModel, Field

from src.api.models.maternity import (
    BenefitPaymentVariant,
    MaternityEmploymentType,
    PeriodBreakdown,
)


# --- BE-16: Urlop ojcowski ---
class PaternityLeavePart(BaseModel):
    part_number: int = Field(1, ge=1, le=2, description="Part number (1 or 2)")
    days: int = Field(7, ge=7, le=14, description="Days count (min 7, max 14)")


class PaternityLeaveInput(BaseModel):
    gross_monthly_income: float = Field(
        ..., gt=0, description="Father's gross monthly income in PLN"
    )
    employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    is_insured: bool = Field(True, description="Father has active sickness insurance")
    child_age_months: int = Field(2, ge=0, le=24, description="Child's age in months")
    is_adopted: bool = Field(False, description="True if child is adopted")
    adopted_child_age_years: int | None = Field(
        None, ge=0, le=18, description="Adopted child's age in years"
    )
    months_since_adoption: int | None = Field(
        None, ge=0, le=24, description="Months since legal adoption ruling"
    )
    parts: list[PaternityLeavePart] = Field(
        default_factory=lambda: [PaternityLeavePart(part_number=1, days=14)]
    )


class PaternityLeaveResult(BaseModel):
    is_eligible: bool
    total_days: int
    calculation_base_net: float
    daily_rate: float
    total_benefit_amount: float
    refusal_reasons: list[str] = Field(default_factory=list)
    parts_breakdown: list[dict] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    important_notes: list[str] = Field(default_factory=list)


# --- BE-17: Przejęcie macierzyńskiego przez ojca ---
class MaternityTransferReason(StrEnum):
    STANDARD_AFTER_14_WEEKS = "STANDARD_AFTER_14_WEEKS"
    MOTHER_HOSPITALIZATION = "MOTHER_HOSPITALIZATION"
    MOTHER_DISABILITY = "MOTHER_DISABILITY"
    MOTHER_DEATH = "MOTHER_DEATH"
    MOTHER_ABANDONMENT = "MOTHER_ABANDONMENT"
    MOTHER_UNINSURED = "MOTHER_UNINSURED"


class MaternityTransferInput(BaseModel):
    father_gross_monthly_income: float = Field(..., gt=0)
    father_employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    is_father_insured: bool = Field(True)
    children_born_count: int = Field(1, ge=1, le=10)
    transfer_reason: MaternityTransferReason = MaternityTransferReason.STANDARD_AFTER_14_WEEKS
    mother_used_weeks: int = Field(14, ge=0, le=37)
    applied_within_21_days: bool = Field(True)


class MaternityTransferResult(BaseModel):
    is_eligible: bool
    total_maternity_weeks: int
    mother_weeks_used: int
    father_transferred_weeks: int
    father_calculation_base_net: float
    father_daily_rate: float
    father_total_benefit_amount: float
    benefit_rate_percentage: float
    refusal_reasons: list[str] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    important_notes: list[str] = Field(default_factory=list)


# --- BE-18: Symulacja podziału opieki ---
class SharingMode(StrEnum):
    SEQUENTIAL = "SEQUENTIAL"
    SIMULTANEOUS = "SIMULTANEOUS"


class ParentBenefitBreakdown(BaseModel):
    parent_name: str
    gross_income: float
    calculation_base_net: float
    daily_rate: float
    maternity_weeks: int
    parental_weeks: int
    total_weeks: int
    total_benefit_amount: float
    periods: list[PeriodBreakdown] = Field(default_factory=list)


class ParentalSharingInput(BaseModel):
    sharing_mode: SharingMode = SharingMode.SEQUENTIAL
    children_born_count: int = Field(1, ge=1, le=10)
    has_za_zyciem_certificate: bool = Field(False)
    applied_within_21_days: bool = Field(True)
    chosen_variant: BenefitPaymentVariant = BenefitPaymentVariant.UNIFIED_81_5

    mother_gross_income: float = Field(..., gt=0)
    mother_employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    mother_maternity_weeks: int = Field(14, ge=0)
    mother_parental_weeks: int = Field(32, ge=0)

    father_gross_income: float = Field(..., gt=0)
    father_employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    father_maternity_weeks: int = Field(0, ge=0)
    father_parental_weeks: int = Field(9, ge=0)


class ParentalSharingResult(BaseModel):
    is_valid_division: bool
    sharing_mode: SharingMode
    total_pool_parental_weeks: int
    total_pool_maternity_weeks: int
    combined_total_weeks: int

    mother: ParentBenefitBreakdown
    father: ParentBenefitBreakdown

    total_family_benefit_amount: float
    non_transferable_respected: bool
    validation_messages: list[str] = Field(default_factory=list)
    financial_comparison_note: str
    legal_basis: list[str] = Field(default_factory=list)
    recommended_strategy_note: str
