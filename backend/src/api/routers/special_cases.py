from typing import Any

from fastapi import APIRouter

from src.api.models.special_cases import SpecialCasesInput, SpecialCasesResult
from src.api.services.special_cases import calculate_special_cases

router = APIRouter(prefix="/api/calculators", tags=["Special Cases"])


@router.post(
    "/special-cases",
    response_model=SpecialCasesResult,
    summary="Kalkulator przypadków szczególnych",
    description=(
        "Oblicza wymiary urlopów i zasiłków dla przypadków szczególnych: "
        "zaświadczenie 'Za życiem' (BE-13), wcześniak/hospitalizacja (BE-14) "
        "oraz urodzenie martwego dziecka / zgon dziecka (BE-15)."
    ),
)
def get_special_cases_calculation(payload: SpecialCasesInput) -> SpecialCasesResult:
    return calculate_special_cases(payload)


class SpecialCasesRouter(APIRouter):
    """Router class for special maternity cases (BE-13, BE-14, BE-15)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Special Cases"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/special-cases",
            self.calculate_special_cases_route,
            methods=["POST"],
            response_model=SpecialCasesResult,
            summary="Kalkulator przypadków szczególnych",
            description=(
                "Oblicza wymiary urlopów i zasiłków dla przypadków szczególnych: "
                "zaświadczenie 'Za życiem' (BE-13), wcześniak/hospitalizacja (BE-14) "
                "oraz urodzenie martwego dziecka / zgon dziecka (BE-15)."
            ),
        )

    def calculate_special_cases_route(self, payload: SpecialCasesInput) -> SpecialCasesResult:
        return calculate_special_cases(payload)


SpecialCasesAPI = SpecialCasesRouter
