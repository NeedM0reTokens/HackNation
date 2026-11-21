from calculators.pregnancy import (
    PregnancyBenefitInput,
    PregnancyBenefitResult,
    calculate_pregnancy_benefit,
)
from fastapi import APIRouter

router = APIRouter(prefix="/api/calculators", tags=["Pregnancy Benefits"])


@router.post("/pregnancy", response_model=PregnancyBenefitResult)
def get_pregnancy_benefit_calculation(
    payload: PregnancyBenefitInput,
) -> PregnancyBenefitResult:
    return calculate_pregnancy_benefit(payload)
