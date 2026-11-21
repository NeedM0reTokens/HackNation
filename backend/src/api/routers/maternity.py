from fastapi import APIRouter

from ..models.maternity import (
    MaternityParentalInput,
    MaternityParentalResult,
)
from ..services.maternity import calculate_maternity_parental_benefit


class MaternityRouter(APIRouter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, prefix="/api/calculators", tags=["Maternity Benefits"], **kwargs)
        self.add_api_route(
            "/maternity-parental",
            self.get_maternity_parental_calculation,
            methods=["POST"],
            response_model=MaternityParentalResult,
        )

    def get_maternity_parental_calculation(
        self, payload: MaternityParentalInput
    ) -> MaternityParentalResult:
        return calculate_maternity_parental_benefit(payload)


router = MaternityRouter()
MaternityAPI = MaternityRouter

