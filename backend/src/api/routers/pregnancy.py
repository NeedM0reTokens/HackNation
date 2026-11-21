from fastapi import APIRouter

from src.api.models.pregnancy import (
    PregnancyBenefitInput,
    PregnancyBenefitResult,
)
from src.api.services.pregnancy import calculate_pregnancy_benefit

router = APIRouter(prefix="/api/calculators", tags=["Pregnancy Benefits"])


@router.post("/pregnancy", response_model=PregnancyBenefitResult)
def get_pregnancy_benefit_calculation(
    payload: PregnancyBenefitInput,
) -> PregnancyBenefitResult:
    return calculate_pregnancy_benefit(payload)
