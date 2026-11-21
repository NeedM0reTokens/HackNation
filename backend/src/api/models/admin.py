# paste all models from admin.py here
import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


class BenefitRates(BaseModel):
    pregnancy_sick_leave_rate: float = Field(
        100.0, description="% pregnancy sick leave (code B)"
    )
    standard_sick_leave_rate: float = Field(
        80.0, description="% standard sick leave"
    )
    unified_benefit_rate: float = Field(
        81.5, description="% long application (maternity + parental)"
    )
    full_maternity_rate: float = Field(
        100.0, description="% full maternity allowance"
    )
    standard_parental_rate: float = Field(
        70.0, description="% standard parental allowance"
    )
    paternity_benefit_rate: float = Field(
        100.0, description="% paternity allowance"
    )
    rehabilitation_benefit_rate_first_3_months: float = Field(
        90.0, description="% rehabilitation benefit first 3 months"
    )
    rehabilitation_benefit_rate_remaining: float = Field(
        75.0, description="% rehabilitation benefit remaining months"
    )
    rehabilitation_benefit_rate_pregnancy: float = Field(
        100.0, description="% rehabilitation benefit during pregnancy"
    )


class LeaveDurations(BaseModel):
    maternity_weeks_single_child: int = 20
    maternity_weeks_twins: int = 31
    maternity_weeks_triplets: int = 33
    maternity_weeks_quadruplets: int = 35
    maternity_weeks_quintuplets_plus: int = 37
    mandatory_mother_maternity_weeks: int = 14
    parental_weeks_standard: int = 41
    parental_weeks_multiple_birth: int = 43
    non_transferable_parental_weeks: int = 9
    paternity_leave_days: int = 14
    max_parental_leave_parts: int = 5


class PeriodsAndLimits(BaseModel):
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
    min_wage_2026: float = 4806.00
    social_contributions_rate: float = 13.71
    zus_debt_limit_percentage: float = 1.0



class AdminConfig(BaseModel):
    benefit_rates: BenefitRates = Field(default_factory=BenefitRates)
    leave_durations: LeaveDurations = Field(default_factory=LeaveDurations)
    periods_and_limits: PeriodsAndLimits = Field(default_factory=PeriodsAndLimits)


class AdminConfigUpdate(BaseModel):
    benefit_rates: dict[str, Any] | None = None
    leave_durations: dict[str, Any] | None = None
    periods_and_limits: dict[str, Any] | None = None
