from typing import Any

from fastapi import APIRouter

from ..models.simulation import UserProfileResponse
from ..services.simulation import get_mock_user_profile_service

router = APIRouter(prefix="/simulation", tags=["Symulacja mObywatel / ZUS"])


@router.get(
    "/profile/{user_id}",
    response_model=UserProfileResponse,
    summary="Pobranie profilu ubezpieczonego z symulacji mObywatel / ZUS (BE-26)",
    description=(
        "Zwraca zamockowany profil obywatela z PUE ZUS / mObywatel na potrzeby demonstracji:\n\n"
        "- Podstawowe dane osobowe i identyfikatory.\n"
        "- Tytuł ubezpieczenia (UoP, umowa zlecenie, działalność gospodarcza).\n"
        "- Średnia podstawa wymiaru składek z ostatnich 12 miesięcy.\n"
        "- Weryfikacja zadłużenia składkowego dla JDG (art. 2a ustawy zasiłkowej - limit 1% "
        "minimalnego wynagrodzenia)."
    ),
    response_description="Profil ubezpieczonego wraz ze statusem zadłużenia w ZUS",
    responses={
        200: {"description": "Pomyślnie pobrano profil użytkownika."},
        404: {"description": "Użytkownik o podanym ID nie został znaleziony w bazie symulacyjnej."},
    },
)
def get_mock_user_profile(user_id: str) -> UserProfileResponse:
    """Zwraca profil ubezpieczonego z danymi symulacyjnymi."""
    return get_mock_user_profile_service(user_id)


class SimulationRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


SimulationAPI = SimulationRouter
