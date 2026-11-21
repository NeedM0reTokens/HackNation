from typing import Any

from fastapi import APIRouter

from ..models.maternity import (
    MaternityParentalInput,
    MaternityParentalResult,
)
from ..services.maternity import calculate_maternity_parental_benefit


class MaternityRouter(APIRouter):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, prefix="/calculators", tags=["Maternity Benefits"], **kwargs)
        self.add_api_route(
            "/maternity-parental",
            self.get_maternity_parental_calculation,
            methods=["POST"],
            response_model=MaternityParentalResult,
            summary="Zintegrowany kalkulator macierzyńskiego i rodzicielskiego (BE-09 - BE-12)",
            description=(
                "Oblicza wymiary i kwoty urlopów macierzyńskiego i rodzicielskiego:\n\n"
                "- **Wymiar urlopu macierzyńskiego**: 20 tyg. (1 dziecko), 31 tyg. (bliźnięta), "
                "33 tyg. (trojaczki), 35 tyg. (czworaczki), 37 tyg. (pięcioraczki i więcej).\n"
                "- **Obowiązkowe 14 tygodni matki**: pierwsze 14 tygodni urlopu macierzyńskiego "
                "jest zarezerwowane wyłącznie dla matki (art. 180 § 4 KP).\n"
                "- **Urlop rodzicielski**: 41 tygodni (1 dziecko) lub 43 tygodnie (ciąża mnoga), "
                "w tym **9 tygodni nieprzenoszalnych** dla drugiego rodzica.\n"
                "- **Porównanie wariantów**: symulacja wariantu jednolitego **81,5%** (wniosek "
                "w terminie 21 dni po porodzie) vs wariantu zmiennego **100%** (macierzyński) "
                "+ **70%** (rodzicielski)."
            ),
            response_description="Szczegółowy wynik z harmonogramem tygodniowym i kwotami PLN",
        )

    def get_maternity_parental_calculation(
        self, payload: MaternityParentalInput
    ) -> MaternityParentalResult:
        return calculate_maternity_parental_benefit(payload)


router = MaternityRouter()
MaternityAPI = MaternityRouter
