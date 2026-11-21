from pydantic import BaseModel, Field


class ParentalWorkPeriod(BaseModel):
    period_name: str
    weeks: int
    days: int
    work_fraction: float
    monthly_salary_gross: float
    monthly_benefit_net: float
    total_period_salary_gross: float
    total_period_benefit_net: float
    total_period_combined_income: float


class ParentalWorkInput(BaseModel):
    gross_monthly_income: float = Field(
        ..., gt=0, description="Gross monthly income before parental leave in PLN"
    )
    work_fraction: float = Field(
        0.5,
        gt=0.0,
        le=1.0,
        description="Work time fraction, maximum 0.5 (half-time) allowed by Labor Code",
    )
    parental_weeks_to_combine: int = Field(
        32,
        ge=1,
        le=67,
        description="Number of parental leave weeks to combine with work (default 32)",
    )
    work_during_extended_period: bool = Field(
        True,
        description=(
            "If True, employee continues working part-time during extended period "
            "(closed formula W = T / (1 - fraction), art. 182(1f) § 2 KP). "
            "If False, extended period is full leave without work."
        ),
    )
    children_born_count: int = Field(1, ge=1, le=10, description="Number of children born")
    has_za_zyciem_certificate: bool = Field(
        False, description="Certificate under 'Za życiem' Act (higher leave limits)"
    )
    benefit_rate_percentage: float = Field(
        70.0,
        ge=1.0,
        le=100.0,
        description="Benefit rate for parental leave: 70.0% standard or 81.5% unified",
    )


class ParentalWorkResult(BaseModel):
    is_eligible: bool
    work_fraction: float
    original_parental_weeks: int
    extension_weeks: int
    extension_days: int
    total_parental_weeks_with_extension: int
    total_parental_days_with_extension: int
    maximum_legal_limit_weeks: int

    calculation_base_net: float
    daily_benefit_without_work: float
    reduced_daily_benefit_with_work: float

    monthly_salary_from_work_gross: float
    standard_monthly_benefit_without_work: float
    reduced_monthly_benefit_with_work: float
    combined_monthly_income: float

    total_benefit_amount: float
    total_work_salary_amount: float
    total_combined_income: float
    pure_leave_total_benefit: float
    financial_gain_compared_to_pure_leave: float

    periods: list[ParentalWorkPeriod] = Field(default_factory=list)
    refusal_reasons: list[str] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
    practical_tips: list[str] = Field(default_factory=list)
