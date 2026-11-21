from typing import Any

from fastapi import APIRouter

from ..models.auth import (
    CitizenIdentity,
    MobywatelLoginRequest,
    TokenResponse,
)
from ..models.simulation import UserProfileResponse
from ..services.mobywatel import MobywatelService, mobywatel_service
from ..services.simulation import get_mock_user_profile_service

ZUS_ENDPOINT_DESCRIPTION = (
    "Symuluje pobranie danych z systemów ZUS (Centralny Rejestr Ubezpieczonych / eZUS / PUE ZUS) "
    "dla wskazanego numeru PESEL w celu ustalenia uprawnień do świadczeń:\n\n"
    "- **Dane ubezpieczenia**: status ubezpieczenia (aktywne, brak), tytuł ubezpieczenia.\n"
    "- **Ubezpieczenie chorobowe**: tryb (obowiązkowe/dobrowolne), data objęcia, staż.\n"
    "- **Okres wyczekiwania (karencja)**: weryfikacja 30 dni dla UoP / 90 dni dla innych.\n"
    "- **Podstawa wymiaru składek**: średnia z 12 miesięcy i wykaz miesięczny (-13,71%).\n"
    "- **Płatnik składek**: NIP, nazwa, status wielkości płatnika (>20 pracowników).\n"
    "- **Zadłużenie (art. 2a ustawy)**: limit 1% minimalnego wynagrodzenia (48,06 zł).\n"
    "- **Zaświadczenia e-ZLA**: aktywne zwolnienia lekarskich (kod B) i limit dni."
)


class MockRouter(APIRouter):
    """Router for mocking external government services (mObywatel IdP, PUE ZUS / eZUS)."""

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

        # Dedicated simulated ZUS insurance status endpoints by PESEL
        self.add_api_route(
            "/zus/insurance/{pesel}",
            self.get_zus_insurance_data_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie danych o ubezpieczeniu osoby z systemów ZUS (PESEL)",
            description=ZUS_ENDPOINT_DESCRIPTION,
            response_description="Dane o ubezpieczeniu osoby z systemów ZUS",
            responses={
                200: {"description": "Pomyślnie pobrano dane ubezpieczeniowe z ZUS."},
                404: {
                    "description": "Osoba o podanym PESEL nie została znaleziona w rejestrze ZUS."
                },
            },
        )

        self.add_api_route(
            "/insurance/{pesel}",
            self.get_zus_insurance_data_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie danych o ubezpieczeniu osoby (alias do /zus/insurance/{pesel})",
            description="Alias dla pobierania danych o ubezpieczeniu z ZUS po numerze PESEL.",
            include_in_schema=False,
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

    def get_zus_insurance_data_route(self, pesel: str) -> UserProfileResponse:
        """Returns simulated ZUS insurance data for the given PESEL."""
        return get_mock_user_profile_service(pesel)

    def list_mobywatel_identities_route(self) -> list[CitizenIdentity]:
        """Returns mock citizen identities for mObywatel login simulation."""
        return self.mobywatel.list_identities()

    def mobywatel_login_route(self, payload: MobywatelLoginRequest) -> TokenResponse:
        """Simulates mObywatel authentication via PESEL and returns JWT token."""
        return self.mobywatel.authenticate(payload.pesel)


class ZusRouter(APIRouter):
    """Direct router for simulated ZUS government registry endpoints (prefix /zus)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/zus", tags=["Symulacje zewnętrznych serwisów (Mock)"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/insurance/{pesel}",
            self.get_zus_insurance_data_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie danych o ubezpieczeniu osoby z systemów ZUS (PESEL)",
            description=ZUS_ENDPOINT_DESCRIPTION,
            response_description="Dane o ubezpieczeniu osoby z systemów ZUS",
            responses={
                200: {"description": "Pomyślnie pobrano dane ubezpieczeniowe z ZUS."},
                404: {
                    "description": "Osoba o podanym PESEL nie została znaleziona w rejestrze ZUS."
                },
            },
        )

    def get_zus_insurance_data_route(self, pesel: str) -> UserProfileResponse:
        """Returns simulated ZUS insurance data for the given PESEL."""
        return get_mock_user_profile_service(pesel)


class SimulationRouter(APIRouter):
    """Router for simulation endpoints under /simulation."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(
            prefix="/simulation", tags=["Symulacje zewnętrznych serwisów (Mock)"], **kwargs
        )
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/profile/{user_id}",
            self.get_simulation_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie profilu symulacji ZUS po PESEL / ID",
            description="Alias dla symulacji profilu ubezpieczeniowego ZUS.",
            include_in_schema=False,
        )
        self.add_api_route(
            "/zus/insurance/{pesel}",
            self.get_simulation_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            include_in_schema=False,
        )
        self.add_api_route(
            "/insurance/{pesel}",
            self.get_simulation_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            include_in_schema=False,
        )

    def get_simulation_profile_route(self, user_id: str) -> UserProfileResponse:
        return get_mock_user_profile_service(user_id)

router = MockRouter()
MockAPI = MockRouter
SimulationAPI = SimulationRouter
