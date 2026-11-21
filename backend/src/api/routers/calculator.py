from typing import Any

from fastapi import APIRouter

from src.api.models.calculator import AllowanceRatesResponse
from src.api.services.calculator import get_allowance_rates_service

router = APIRouter(prefix="/calculator", tags=["Kalkulator Zasiłków"])


@router.get(
    "/config",
    response_model=AllowanceRatesResponse,
    summary="Pobierz stawki i parametry zasiłków",
    description="Zwraca bazowe stawki zasiłków (np. 100%, 70%, 81.5%) i wymiary urlopów.",
)
def get_allowance_rates() -> AllowanceRatesResponse:
    return get_allowance_rates_service()


class CalculatorRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


CalculatorAPI = CalculatorRouter
