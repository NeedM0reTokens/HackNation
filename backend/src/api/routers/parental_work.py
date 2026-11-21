from typing import Any

from fastapi import APIRouter

from ..models.parental_work import (
    ParentalWorkInput,
    ParentalWorkResult,
)
from ..services.parental_work import calculate_parental_work_combination


class ParentalWorkRouter(APIRouter):
    """Router for combining parental leave with part-time work (BE-19)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Parental Work Combination"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/parental-work-combination",
            self.calculate_parental_work_combination_route,
            methods=["POST"],
            response_model=ParentalWorkResult,
            summary="Kalkulator łączenia urlopu rodzicielskiego z pracą (BE-19)",
            description=(
                "Oblicza proporcjonalne wydłużenie urlopu rodzicielskiego (max 1/2 etatu) "
                "oraz redukcję zasiłku macierzyńskiego i łączny budżet rodzica "
                "zgodnie z art. 182(1e)-182(1f) Kodeksu Pracy i art. 31 ustawy zasiłkowej."
            ),
        )

    def calculate_parental_work_combination_route(
        self, payload: ParentalWorkInput
    ) -> ParentalWorkResult:
        return calculate_parental_work_combination(payload)


router = ParentalWorkRouter()
ParentalWorkAPI = ParentalWorkRouter
