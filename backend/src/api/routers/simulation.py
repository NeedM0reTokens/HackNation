from typing import Any

from fastapi import APIRouter

from src.api.models.simulation import UserProfileResponse
from src.api.services.simulation import get_mock_user_profile_service

router = APIRouter(prefix="/simulation", tags=["Symulacja mObywatel / ZUS"])


@router.get(
    "/profile/{user_id}",
    response_model=UserProfileResponse,
    summary="Pobranie profilu ubezpieczonego z symulacji mObywatel / ZUS",
)
def get_mock_user_profile(user_id: str) -> UserProfileResponse:
    return get_mock_user_profile_service(user_id)


class SimulationRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


SimulationAPI = SimulationRouter
