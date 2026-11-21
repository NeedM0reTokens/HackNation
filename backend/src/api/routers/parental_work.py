from typing import Any

from fastapi import APIRouter

from src.api.models.parental_work import (
    ParentalWorkInput,
    ParentalWorkResult,
)
from src.api.services.parental_work import calculate_parental_work_combination


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
            summary="Łączenie urlopu rodzicielskiego z pracą na max 1/2 etatu (BE-19)",
            description=(
                "Oblicza proporcjonalne wydłużenie urlopu rodzicielskiego i kwoty świadczeń "
                "zgodnie z art. 182(1e)-182(1f) KP i art. 31 ust. 4a ustawy zasiłkowej:\n\n"
                "- **Dopuszczalny wymiar**: praca na maksymalnie 1/2 pełnego wymiaru czasu pracy "
                "(np. 0.25, 0.33, 0.50 etatu).\n"
                "- **Wydłużenie urlopu**: proporcjonalne wydłużenie (np. praca na 1/2 "
                "etatu wydłuża okres z 32 do 64 tygodni).\n"
                "- **Proporcjonalna redukcja zasiłku**: zasiłek macierzyński jest pomniejszany "
                "o wymiar etatu (otrzymujesz 50% zasiłku + 50% pensji z umowy o pracę).\n"
                "- **Łączny dochód**: kalkulator prezentuje sumaryczny dochód w okresie opieki "
                "oraz zysk finansowy względem rezygnacji z pracy."
            ),
            response_description="Szczegółowy harmonogram wydłużenia i łączny budżet rodzica",
        )

    def calculate_parental_work_combination_route(
        self, payload: ParentalWorkInput
    ) -> ParentalWorkResult:
        """Oblicza proporcjonalne wydłużenie urlopu rodzicielskiego i dochody przy pracy na etat."""
        return calculate_parental_work_combination(payload)


router = ParentalWorkRouter()
ParentalWorkAPI = ParentalWorkRouter
