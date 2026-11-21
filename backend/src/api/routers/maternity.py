from calculators.maternity import (
    MaternityParentalInput,
    MaternityParentalResult,
    calculate_maternity_parental_benefit,
)
from fastapi import APIRouter

router = APIRouter(prefix="/api/calculators", tags=["Maternity Benefits"])


@router.post("/maternity-parental", response_model=MaternityParentalResult)
def get_maternity_parental_calculation(
    payload: MaternityParentalInput,
) -> MaternityParentalResult:
    return calculate_maternity_parental_benefit(payload)
