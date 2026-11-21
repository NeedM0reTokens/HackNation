from typing import Any

from fastapi import APIRouter

from ..models.special_cases import SpecialCasesInput, SpecialCasesResult
from ..services.special_cases import calculate_special_cases


class SpecialCasesRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Special Cases"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        special_routes = [
            "/special-cases",
            "/special-cases/za-zyciem",
            "/special-cases/premature",
            "/special-cases/stillbirth-or-death",
        ]
        for route_path in special_routes:
            self.add_api_route(
                route_path,
                self.calculate_special_cases_route,
                methods=["POST"],
                response_model=SpecialCasesResult,
                summary="Zunifikowany kalkulator przypadków szczególnych (BE-13, BE-14, BE-15)",
                description=(
                    "Kompleksowy moduł obliczający uprawnienia i świadczenia w sytuacjach "
                    "szczególnych:\n\n"
                    "- **BE-13 (Zaświadczenie 'Za życiem')**: wydłużenie urlopu rodzicielskiego "
                    "o 24 tygodnie (z 41 do 65 tyg. przy 1 dziecku, z 43 do 67 tyg. przy ciąży "
                    "mnogiej) + 4000 zł jednorazowo.\n"
                    "- **BE-14 (Wcześniak / Hospitalizacja)**: uzupełniający urlop macierzyński "
                    "do 15 tygodni (poród przed 28. tc. lub waga < 1000g) lub do 8 tygodni "
                    "(poród 28-36 tc. lub hospitalizacja noworodka).\n"
                    "- **BE-15 (Urodzenie martwe lub zgon dziecka)**: 8 tygodni urlopu "
                    "macierzyńskiego (56 dni, 100%) oraz zasiłek pogrzebowy 4000 zł."
                ),
                response_description=(
                    "Szczegółowy wynik z wymiarem urlopu, kwotami i podstawą prawną"
                ),
            )

    def calculate_special_cases_route(self, payload: SpecialCasesInput) -> SpecialCasesResult:
        return calculate_special_cases(payload)


router = SpecialCasesRouter()
SpecialCasesAPI = SpecialCasesRouter
