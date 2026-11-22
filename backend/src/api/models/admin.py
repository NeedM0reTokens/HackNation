from typing import Any

from pydantic import BaseModel, Field


class BenefitRates(BaseModel):
    """Statutory percentage rates for social security benefits."""

    pregnancy_sick_leave_rate: float = Field(
        default=100.0, description="% pregnancy sick leave (code B)"
    )
    standard_sick_leave_rate: float = Field(default=80.0, description="% standard sick leave")
    unified_benefit_rate: float = Field(
        default=81.5, description="% long application (maternity + parental)"
    )
    full_maternity_rate: float = Field(default=100.0, description="% full maternity allowance")
    standard_parental_rate: float = Field(default=70.0, description="% standard parental allowance")
    paternity_benefit_rate: float = Field(default=100.0, description="% paternity allowance")
    rehabilitation_benefit_rate_first_3_months: float = Field(
        default=90.0, description="% rehabilitation benefit first 3 months"
    )
    rehabilitation_benefit_rate_remaining: float = Field(
        default=75.0, description="% rehabilitation benefit remaining months"
    )
    rehabilitation_benefit_rate_pregnancy: float = Field(
        default=100.0, description="% rehabilitation benefit during pregnancy"
    )
    social_contributions_rate: float = Field(
        default=13.71, description="% employee social security deduction from gross base"
    )


class BenefitAmounts(BaseModel):
    """Statutory financial parameters and benefit amounts in PLN."""

    min_wage_2026: float = Field(
        default=4806.00, description="Ustawowe minimalne wynagrodzenie za pracę (PLN)"
    )
    zus_debt_limit_percentage: float = Field(
        default=1.0, description="Dopuszczalny limit zadłużenia ZUS jako % płacy minimalnej"
    )
    zus_debt_limit: float = Field(
        default=48.06, description="Maksymalna kwota zadłużenia nieblokująca świadczeń (PLN)"
    )
    za_zyciem_one_time_grant: float = Field(
        default=4000.00, description="Jednorazowa zapomoga 'Za życiem' (PLN)"
    )
    death_grant_zus: float = Field(
        default=4000.00, description="Zasiłek pogrzebowy podstawowy (PLN)"
    )
    funeral_allowance_special: float = Field(
        default=7000.00, description="Zasiłek pogrzebowy w przypadkach szczególnych (PLN)"
    )
    max_voluntary_sickness_base: float = Field(
        default=23550.00, description="Maksymalna podstawa dobrowolnego chorobowego (PLN)"
    )
    min_benefit_base_uop: float = Field(
        default=4147.10, description="Minimalna podstawa zasiłku dla UoP po potrąceniu 13.71% (PLN)"
    )


class LeaveDurations(BaseModel):
    """Statutory leave dimensions in weeks and days."""

    maternity_weeks_single_child: int = 20
    maternity_weeks_twins: int = 31
    maternity_weeks_triplets: int = 33
    maternity_weeks_quadruplets: int = 35
    maternity_weeks_quintuplets_plus: int = 37
    mandatory_mother_maternity_weeks: int = 14
    parental_weeks_standard: int = 41
    parental_weeks_multiple_birth: int = 43
    parental_weeks_za_zyciem_single: int = 65
    parental_weeks_za_zyciem_multiple: int = 67
    non_transferable_parental_weeks: int = 9
    paternity_leave_days: int = 14
    max_parental_leave_parts: int = 5
    stillbirth_maternity_weeks: int = 8


class PeriodsAndLimits(BaseModel):
    """Statutory periods, deadlines and waiting limits."""

    mandatory_waiting_period_days: int = 30
    voluntary_waiting_period_days: int = 90
    employer_sick_days_standard: int = 33
    employer_sick_days_senior: int = 14
    senior_age_threshold: int = 50
    max_pregnancy_sick_leave_days: int = 270
    max_standard_sick_leave_days: int = 182
    max_child_age_paternity_months: int = 12
    max_child_age_paternity_adoption_years: int = 14
    long_application_deadline_days: int = 21
    min_mother_weeks_before_transfer_special: int = 8
    premature_extreme_week_threshold: int = 28
    premature_extreme_weight_grams: int = 1000
    premature_extreme_max_supplementary_weeks: int = 15
    premature_moderate_week_threshold: int = 36
    premature_standard_max_supplementary_weeks: int = 8
    adoption_child_standard_age_limit: int = 7
    adoption_child_deferred_school_age_limit: int = 10
    adoption_min_guaranteed_maternity_weeks: int = 9
    min_wage_2026: float = 4806.00
    social_contributions_rate: float = 13.71
    zus_debt_limit_percentage: float = 1.0


class AdminConfig(BaseModel):
    """Unified statutory configuration loaded from JSON DB."""

    benefit_rates: BenefitRates = Field(default_factory=BenefitRates)
    benefit_amounts: BenefitAmounts = Field(default_factory=BenefitAmounts)
    leave_durations: LeaveDurations = Field(default_factory=LeaveDurations)
    periods_and_limits: PeriodsAndLimits = Field(default_factory=PeriodsAndLimits)


class BenefitRatesUpdate(BaseModel):
    pregnancy_sick_leave_rate: float | None = None
    standard_sick_leave_rate: float | None = None
    unified_benefit_rate: float | None = None
    full_maternity_rate: float | None = None
    standard_parental_rate: float | None = None
    paternity_benefit_rate: float | None = None
    rehabilitation_benefit_rate_first_3_months: float | None = None
    rehabilitation_benefit_rate_remaining: float | None = None
    rehabilitation_benefit_rate_pregnancy: float | None = None
    social_contributions_rate: float | None = None


class BenefitAmountsUpdate(BaseModel):
    min_wage_2026: float | None = None
    zus_debt_limit_percentage: float | None = None
    zus_debt_limit: float | None = None
    za_zyciem_one_time_grant: float | None = None
    death_grant_zus: float | None = None
    funeral_allowance_special: float | None = None
    max_voluntary_sickness_base: float | None = None
    min_benefit_base_uop: float | None = None


class LeaveDurationsUpdate(BaseModel):
    maternity_weeks_single_child: int | None = None
    maternity_weeks_twins: int | None = None
    maternity_weeks_triplets: int | None = None
    maternity_weeks_quadruplets: int | None = None
    maternity_weeks_quintuplets_plus: int | None = None
    mandatory_mother_maternity_weeks: int | None = None
    parental_weeks_standard: int | None = None
    parental_weeks_multiple_birth: int | None = None
    parental_weeks_za_zyciem_single: int | None = None
    parental_weeks_za_zyciem_multiple: int | None = None
    non_transferable_parental_weeks: int | None = None
    paternity_leave_days: int | None = None
    max_parental_leave_parts: int | None = None
    stillbirth_maternity_weeks: int | None = None


class PeriodsAndLimitsUpdate(BaseModel):
    mandatory_waiting_period_days: int | None = None
    voluntary_waiting_period_days: int | None = None
    employer_sick_days_standard: int | None = None
    employer_sick_days_senior: int | None = None
    senior_age_threshold: int | None = None
    max_pregnancy_sick_leave_days: int | None = None
    max_standard_sick_leave_days: int | None = None
    max_child_age_paternity_months: int | None = None
    max_child_age_paternity_adoption_years: int | None = None
    long_application_deadline_days: int | None = None
    min_mother_weeks_before_transfer_special: int | None = None
    premature_extreme_week_threshold: int | None = None
    premature_extreme_weight_grams: int | None = None
    premature_extreme_max_supplementary_weeks: int | None = None
    premature_moderate_week_threshold: int | None = None
    premature_standard_max_supplementary_weeks: int | None = None
    adoption_child_standard_age_limit: int | None = None
    adoption_child_deferred_school_age_limit: int | None = None
    adoption_min_guaranteed_maternity_weeks: int | None = None
    min_wage_2026: float | None = None
    social_contributions_rate: float | None = None
    zus_debt_limit_percentage: float | None = None


class SingleParameterUpdate(BaseModel):
    parameter_name: str = Field(
        ...,
        alias="key",
        description="Nazwa parametru ustawowego (np. min_wage_2026, unified_benefit_rate)",
        examples=["min_wage_2026"],
    )
    value: Any = Field(..., description="Nowa wartość parametru", examples=[5000.0])

    model_config = {"populate_by_name": True}


class AdminConfigUpdate(BaseModel):
    benefit_rates: dict[str, Any] | None = None
    benefit_amounts: dict[str, Any] | None = None
    leave_durations: dict[str, Any] | None = None
    periods_and_limits: dict[str, Any] | None = None
