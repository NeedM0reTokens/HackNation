from fastapi import APIRouter

from ..models.pregnancy import (
    EmploymentType,
    PregnancyBenefitInput,
    PregnancyBenefitResult,
)
from ..services.pregnancy import calculate_pregnancy_benefit

router = APIRouter(prefix="/api/calculators", tags=["Pregnancy Benefits"])


@router.post("/pregnancy", response_model=PregnancyBenefitResult)
def get_pregnancy_benefit_calculation(
    payload: PregnancyBenefitInput,
) -> PregnancyBenefitResult:
    return calculate_pregnancy_benefit(payload)


@router.get(
    "/pregnancy/example",
    response_model=PregnancyBenefitResult,
    summary="Przykładowe wyliczenie bez danych wejściowych",
)
def get_pregnancy_benefit_example() -> PregnancyBenefitResult:
    """Zwraca przykładowy wynik do podłączenia frontendu przed dodaniem bazy."""
    example_payload = PregnancyBenefitInput(
        employment_type=EmploymentType.EMPLOYMENT_CONTRACT,
        gross_monthly_income=8000,
        insurance_duration_days=365,
        sick_leave_duration_days=30,
        pregnancy_week=20,
    )
    return calculate_pregnancy_benefit(example_payload)
