from fastapi import APIRouter
from pydantic import BaseModel


class UserProfileResponse(BaseModel):
    user_id: str
    source: str
    has_active_insurance: bool
    insurance_type: str
    overdue_contributions: bool


class SimulationRouter(APIRouter):
    """Osobna klasa routera dla symulacji mObywatela i danych profilowych ZUS."""

    def __init__(self, **kwargs):
        super().__init__(prefix="/simulation", tags=["Symulacja mObywatel / ZUS"], **kwargs)
        self._setup_routes()

    def _setup_routes(self):
        self.add_api_route(
            "/profile/{user_id}",
            self.get_mock_user_profile,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie profilu ubezpieczonego z symulacji mObywatel / ZUS",
        )

    def get_mock_user_profile(self, user_id: str) -> UserProfileResponse:
        return UserProfileResponse(
            user_id=user_id,
            source="mObywatel / ZUS mock",
            has_active_insurance=True,
            insurance_type="UoP",
            overdue_contributions=False,
        )


# Alias dla kompatybilności
SimulationAPI = SimulationRouter
