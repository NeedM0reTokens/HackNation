from fastapi import APIRouter
from pydantic import BaseModel


class AllowanceRatesResponse(BaseModel):
    maternity_parental_option_uniform: float
    maternity_standard: float
    parental_standard: float
    pregnancy_sick_leave: float
    father_paternity_days: int
    non_transferable_parental_weeks: int


class CalculatorRouter(APIRouter):
    """
    Osobna klasa routera dla kalkulatora zasiłków
    (macierzyński, rodzicielski, ojcowski, chorobowy).
    """

    def __init__(self, **kwargs):
        super().__init__(prefix="/calculator", tags=["Kalkulator Zasiłków"], **kwargs)
        self._setup_routes()

    def _setup_routes(self):
        self.add_api_route(
            "/config",
            self.get_allowance_rates,
            methods=["GET"],
            response_model=AllowanceRatesResponse,
            summary="Pobierz stawki i parametry zasiłków",
            description="Zwraca bazowe stawki zasiłków (np. 100%, 70%, 81.5%) i wymiary urlopów.",
        )

    def get_allowance_rates(self) -> AllowanceRatesResponse:
        return AllowanceRatesResponse(
            maternity_parental_option_uniform=81.5,
            maternity_standard=100.0,
            parental_standard=70.0,
            pregnancy_sick_leave=100.0,
            father_paternity_days=14,
            non_transferable_parental_weeks=9,
        )


# Alias dla kompatybilności
CalculatorAPI = CalculatorRouter
