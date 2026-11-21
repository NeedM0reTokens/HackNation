from typing import Any

from fastapi import APIRouter, Security

from ..models.auth import (
    CitizenIdentity,
    MobywatelLoginRequest,
    TokenResponse,
)
from ..models.simulation import UserProfileResponse
from ..security import Permission, authorization_manager
from ..services.mobywatel import MobywatelService, mobywatel_service
from ..services.simulation import get_mock_user_profile_service


class MockRouter(APIRouter):
    """Router for mocking external government services (mObywatel IdP, PUE ZUS)."""

    def __init__(
        self,
        mobywatel: MobywatelService | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(prefix="/mock", tags=["Symulacje zewnętrznych serwisów (Mock)"], **kwargs)
        self.mobywatel: MobywatelService = mobywatel or mobywatel_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        # PUE ZUS mock profile (BE-26)
        self.add_api_route(
            "/profile/{user_id}",
            self.get_mock_user_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.simulation_run],
                )
            ],
            summary="Pobranie profilu ubezpieczonego z symulacji PUE ZUS / mObywatel (BE-26)",
            description=(
                "Zwraca zamockowany profil obywatela z PUE ZUS / mObywatel na potrzeby "
                "demonstracji:\n\n"
                "- Podstawowe dane osobowe i identyfikatory.\n"
                "- Tytuł ubezpieczenia (UoP, umowa zlecenie, działalność gospodarcza).\n"
                "- Średnia podstawa wymiaru składek z ostatnich 12 miesięcy.\n"
                "- Weryfikacja zadłużenia składkowego dla JDG (art. 2a ustawy zasiłkowej - "
                "limit 1% minimalnego wynagrodzenia)."
            ),
            response_description="Profil ubezpieczonego wraz ze statusem zadłużenia w ZUS",
            responses={
                200: {"description": "Pomyślnie pobrano profil użytkownika."},
                404: {"description": "Użytkownik o podanym ID nie został znaleziony w bazie."},
            },
        )

        # mObywatel IdP mock endpoints (BE-27)
        self.add_api_route(
            "/mobywatel/identities",
            self.list_mobywatel_identities_route,
            methods=["GET"],
            response_model=list[CitizenIdentity],
            summary="Pobierz listę profili mObywatel (symulacja IdP) (BE-27)",
            description=(
                "Zwraca zestaw predefiniowanych tożsamości obywateli "
                "(UoP, Zlecenie, JDG z długiem, Brak ubezpieczenia, Administrator ZUS) "
                "do wyboru w demonstracyjnym przełączniku kont na frontendzie."
            ),
        )

        self.add_api_route(
            "/mobywatel/login",
            self.mobywatel_login_route,
            methods=["POST"],
            response_model=TokenResponse,
            summary="Logowanie tożsamością mObywatel (symulacja IdP) (BE-27)",
            description=(
                "Symuluje zewnętrzny proces logowania przez aplikację mObywatel. "
                "Przyjmuje PESEL obywatela i wydaje podpisany token JWT wraz z danymi profilu."
            ),
        )

    def get_mock_user_profile_route(self, user_id: str) -> UserProfileResponse:
        """Returns mock PUE ZUS profile for given user ID / PESEL."""
        return get_mock_user_profile_service(user_id)

    def list_mobywatel_identities_route(self) -> list[CitizenIdentity]:
        """Returns mock citizen identities for mObywatel login simulation."""
        return self.mobywatel.list_identities()

    def mobywatel_login_route(self, payload: MobywatelLoginRequest) -> TokenResponse:
        """Simulates mObywatel authentication via PESEL and returns JWT token."""
        return self.mobywatel.authenticate(payload.pesel)


class SimulationRouter(APIRouter):
    """Router alias for PUE ZUS and mObywatel simulation (BE-26)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(
            prefix="/simulation",
            tags=["Symulacje zewnętrznych serwisów (Mock)"],
            **kwargs,
        )
        self.add_api_route(
            "/profile/{user_id}",
            get_mock_user_profile_service,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie profilu ubezpieczonego z symulacji PUE ZUS / mObywatel (BE-26)",
            description="Zwraca profil ubezpieczonego dla wybranego ID / PESEL.",
        )


router = MockRouter()
MockAPI = MockRouter
SimulationAPI = SimulationRouter

