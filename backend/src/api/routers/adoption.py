from typing import Any

from fastapi import APIRouter

from ..models.adoption import (
    AdoptionLeaveInput,
    AdoptionLeaveResult,
)
from ..services.adoption import calculate_adoption_leave


class AdoptionRouter(APIRouter):
    """Router for adoption and foster care leave (BE-20)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Adoption & Foster Care"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/adoption-leave",
            self.calculate_adoption_leave_route,
            methods=["POST"],
            response_model=AdoptionLeaveResult,
            summary="Kalkulator urlopu dla adopcji i rodziny zastępczej niezawodowej (BE-20)",
            description=(
                "Oblicza wymiar urlopu na warunkach macierzyńskiego oraz rodzicielskiego "
                "dla rodziców adopcyjnych i rodzin zastępczych z uwzględnieniem limitów "
                "wieku (7/10/14 lat) oraz gwarantowanego minimum 9 tygodni (art. 183 KP)."
            ),
        )

    def calculate_adoption_leave_route(
        self, payload: AdoptionLeaveInput
    ) -> AdoptionLeaveResult:
        return calculate_adoption_leave(payload)


router = AdoptionRouter()
AdoptionAPI = AdoptionRouter
