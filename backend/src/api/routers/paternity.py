from typing import Any

from fastapi import APIRouter

from ..models.paternity import (
    MaternityTransferInput,
    MaternityTransferResult,
    ParentalSharingInput,
    ParentalSharingResult,
    PaternityLeaveInput,
    PaternityLeaveResult,
)
from ..services.paternity import (
    calculate_maternity_transfer,
    calculate_parental_sharing,
    calculate_paternity_leave,
)


class PaternityRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(
            prefix="/calculators",
            tags=["Paternity & Family Sharing"],
            **kwargs,
        )
        self._setup_routes()

    def _setup_routes(self) -> None:
        paternity_routes = [
            "/paternity-leave",
            "/paternity/calculate",
            "/calculate",
        ]
        for route_path in paternity_routes:
            self.add_api_route(
                route_path,
                self.calculate_paternity_leave_route,
                methods=["POST"],
                response_model=PaternityLeaveResult,
                summary="Kalkulator urlopu ojcowskiego (14 dni, 100%, 12/14 m-cy) (BE-16)",
                description=(
                    "Oblicza urlop ojcowski przysługujący wyłącznie ojcu (nieprzenoszalny):\n\n"
                    "- Wymiar: 14 dni kalendarzowych płatne 100% podstawy zasiłku.\n"
                    "- Możliwość podziału na max 2 części po min. 7 dni.\n"
                    "- Limit wieku dziecka: do ukończenia 12 miesięcy (lub do 14 lat przy adopcji)."
                ),
                response_description="Szczegółowy wynik kalkulacji urlopu ojcowskiego",
            )

        transfer_routes = [
            "/maternity-transfer",
            "/paternity/transfer-to-father",
            "/transfer-to-father",
        ]
        for route_path in transfer_routes:
            self.add_api_route(
                route_path,
                self.calculate_maternity_transfer_route,
                methods=["POST"],
                response_model=MaternityTransferResult,
                summary=(
                    "Przejęcie urlopu macierzyńskiego przez ojca "
                    "(standard 14 tyg. / sytuacje szczególne) (BE-17)"
                ),
                description=(
                    "Weryfikuje warunki i oblicza wymiar urlopu przekazywanego ojcu:\n\n"
                    "- Standard: matka min. 14 tyg. po porodzie, pozostałe max 6 tyg. dla ojca.\n"
                    "- Sytuacje szczególne (zgon, porzucenie, niezdolność do egzystencji): "
                    "ojciec przejmuje urlop natychmiast lub po 8 tyg. pobytu matki w szpitalu.\n"
                    "- Wymóg ubezpieczenia chorobowego ojca (etat, zlecenie, DG)."
                ),
                response_description="Wynik weryfikacji i wymiar urlopu do przejęcia przez ojca",
            )

        sharing_routes = [
            "/parental-sharing",
            "/paternity/family-sharing",
            "/family-sharing",
        ]
        for route_path in sharing_routes:
            self.add_api_route(
                route_path,
                self.calculate_parental_sharing_route,
                methods=["POST"],
                response_model=ParentalSharingResult,
                summary="Symulacja podziału opieki i budżetu domowego rodziców (BE-18)",
                description=(
                    "Kompleksowa symulacja podziału urlopu rodzicielskiego (41 tygodni):\n\n"
                    "- Gwarantowane 9 tygodni nieprzenoszalne dla każdego z rodziców.\n"
                    "- Maksymalnie 5 części urlopu do ukończenia przez dziecko 6. roku życia.\n"
                    "- Symulacja sumarycznego budżetu domowego w ujęciu wariantowym."
                ),
                response_description="Szczegółowy plan podziału opieki i bilans finansowy rodziny",
            )

    def calculate_paternity_leave_route(self, payload: PaternityLeaveInput) -> PaternityLeaveResult:
        return calculate_paternity_leave(payload)

    def calculate_maternity_transfer_route(
        self, payload: MaternityTransferInput
    ) -> MaternityTransferResult:
        return calculate_maternity_transfer(payload)

    def calculate_parental_sharing_route(
        self, payload: ParentalSharingInput
    ) -> ParentalSharingResult:
        return calculate_parental_sharing(payload)


router = PaternityRouter()
PaternityAPI = PaternityRouter
