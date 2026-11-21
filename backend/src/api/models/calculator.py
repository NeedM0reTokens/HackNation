from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from src.api.models.maternity import (
    BenefitPaymentVariant,
    MaternityEmploymentType,
)


class AllowanceRatesResponse(BaseModel):
    maternity_parental_option_uniform: float
    maternity_standard: float
    parental_standard: float
    pregnancy_sick_leave: float
    father_paternity_days: int
    non_transferable_parental_weeks: int


class CalculatorPreset(BaseModel):
    key: str
    title: str
    description: str
    tab: str
    target_endpoint: str
    default_payload: dict[str, Any]


class PresetsListResponse(BaseModel):
    presets: list[CalculatorPreset]


class TimelinePeriod(BaseModel):
    id: str
    name: str
    person: str  # "mother", "father", "caregiver"
    start_date: date
    end_date: date
    weeks: int
    days: int
    rate_percentage: float
    daily_benefit_net: float
    monthly_benefit_net: float
    total_benefit_net: float
    work_fraction: float = 0.0
    monthly_salary_gross: float = 0.0
    total_salary_gross: float = 0.0
    combined_period_income: float
    payer: str  # "ZUS", "Pracodawca", "ZUS + Pracodawca"
    description: str


class TimelineMilestone(BaseModel):
    milestone_date: date
    title: str
    importance: str  # "CRITICAL", "HIGH", "INFO"
    legal_basis: str
    action_required: str


class MonthlyCashflow(BaseModel):
    year_month: str  # "YYYY-MM"
    mother_benefit: float
    father_benefit: float
    work_salary: float
    total_month_income: float


class IntegratedWorkCombination(BaseModel):
    enabled: bool = False
    parent_working: str = "mother"
    work_fraction: float = 0.5
    weeks_to_combine: int = 32
    work_during_extended_period: bool = True


class IntegratedParentalSharing(BaseModel):
    enabled: bool = False
    mode: str = "SEQUENTIAL"  # "SEQUENTIAL" or "SIMULTANEOUS"
    mother_weeks: int = 32
    father_weeks: int = 9


class IntegratedCalculatorInput(BaseModel):
    child_birth_date: date = Field(
        ..., description="Date of child birth or custody handover (YYYY-MM-DD)"
    )
    mother_gross_monthly_income: float = Field(default=8000.0, ge=0.0)
    mother_employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    is_mother_insured: bool = True

    father_gross_monthly_income: float = Field(default=9000.0, ge=0.0)
    father_employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    is_father_insured: bool = True

    children_count: int = Field(default=1, ge=1, le=10)
    chosen_variant: BenefitPaymentVariant = BenefitPaymentVariant.UNIFIED_81_5
    applied_within_21_days: bool = True

    include_paternity_leave: bool = False
    paternity_start_offset_days: int = Field(
        default=14, ge=0, description="Days after birth when father starts paternity leave"
    )

    include_pregnancy_sick_leave: bool = False
    pregnancy_sick_leave_days: int = Field(default=30, ge=0, le=270)

    special_case_type: str | None = Field(
        default=None,
        description="None, 'ZA_ZYCIEM', 'PREMATURE', 'STILLBIRTH_OR_DEATH', 'ADOPTION'",
    )
    has_za_zyciem_certificate: bool = False
    premature_birth_week: int | None = Field(default=None, ge=20, le=40)
    hospitalization_weeks: int = Field(default=0, ge=0, le=30)
    is_adoption: bool = False
    adoption_child_age_years: int = Field(default=3, ge=0, le=18)

    work_combination: IntegratedWorkCombination = Field(default_factory=IntegratedWorkCombination)
    parental_sharing: IntegratedParentalSharing = Field(default_factory=IntegratedParentalSharing)


class IntegratedCalculatorResult(BaseModel):
    is_eligible: bool
    child_birth_date: date
    timeline_start_date: date
    timeline_end_date: date
    total_leave_weeks: int
    total_leave_days: int

    total_family_benefit_amount: float
    total_work_salary_amount: float
    total_family_combined_income: float

    timeline_periods: list[TimelinePeriod] = Field(default_factory=list)
    milestones: list[TimelineMilestone] = Field(default_factory=list)
    monthly_cashflow: list[MonthlyCashflow] = Field(default_factory=list)

    comparison_unified_81_5_total: float
    comparison_variable_100_70_total: float
    recommended_variant: str
    recommendation_reason: str

    summary_notes: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
