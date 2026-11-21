from enum import StrEnum

from pydantic import BaseModel, Field

from .maternity import MaternityEmploymentType, PeriodBreakdown


class SpecialCaseType(StrEnum):
    ZA_ZYCIEM = "ZA_ZYCIEM"
    PREMATURE_HOSPITALIZATION = "PREMATURE_HOSPITALIZATION"
    STILLBIRTH_OR_DEATH = "STILLBIRTH_OR_DEATH"


class SpecialCasesInput(BaseModel):
    case_type: SpecialCaseType
    gross_monthly_income: float = Field(..., gt=0, description="Gross monthly income in PLN")
    employment_type: MaternityEmploymentType = MaternityEmploymentType.EMPLOYMENT_CONTRACT
    children_born_count: int = Field(1, ge=1, le=10)
    is_insured_at_birth: bool = Field(True)

    has_za_zyciem_certificate: bool = Field(
        False, description="Certificate under 'Za życiem' Act (severe/irreversible disability)"
    )

    child_birth_week: int | None = Field(
        None, ge=20, le=44, description="Gestational week at birth (e.g. 26 for premature)"
    )
    birth_weight_grams: int | None = Field(
        None, ge=300, le=7000, description="Birth weight in grams (e.g. 950g)"
    )
    hospitalization_weeks: int = Field(
        0, ge=0, le=30, description="Total duration of child's hospital stay in full weeks"
    )

    is_stillbirth: bool = Field(False, description="True if child was stillborn (urodzenie martwe)")
    child_death_after_birth: bool = Field(
        False, description="True if child died after birth (zgon dziecka po porodzie)"
    )
    child_age_days_at_death: int | None = Field(
        None, ge=0, le=365, description="Child's age in days at the time of death"
    )
    surviving_children_count: int = Field(
        0, ge=0, le=10, description="Number of surviving children in case of multiple birth"
    )


class SpecialCasesResult(BaseModel):
    case_type: SpecialCaseType
    is_eligible: bool

    base_maternity_weeks: int
    supplementary_maternity_weeks: int
    total_maternity_weeks: int
    parental_weeks: int
    non_transferable_parental_weeks: int
    total_leave_weeks: int

    calculation_base_net: float
    daily_rate: float
    total_benefit_amount: float
    one_time_grant_pln: float = 0.0

    can_interrupt_maternity_for_hospitalization: bool = False
    min_mandatory_mother_maternity_weeks: int = 14

    periods: list[PeriodBreakdown] = Field(default_factory=list)
    description: str
    legal_basis: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    important_notes: list[str] = Field(default_factory=list)
