from src.api.models.calculator import AllowanceRatesResponse
from src.constants import (
    FULL_MATERNITY_RATE,
    NON_TRANSFERABLE_PARENTAL_WEEKS,
    PATERNITY_LEAVE_DAYS,
    PREGNANCY_SICK_LEAVE_RATE,
    STANDARD_PARENTAL_RATE,
    UNIFIED_BENEFIT_RATE,
)


def get_allowance_rates_service() -> AllowanceRatesResponse:
    return AllowanceRatesResponse(
        maternity_parental_option_uniform=UNIFIED_BENEFIT_RATE,
        maternity_standard=FULL_MATERNITY_RATE,
        parental_standard=STANDARD_PARENTAL_RATE,
        pregnancy_sick_leave=PREGNANCY_SICK_LEAVE_RATE,
        father_paternity_days=PATERNITY_LEAVE_DAYS,
        non_transferable_parental_weeks=NON_TRANSFERABLE_PARENTAL_WEEKS,
    )
