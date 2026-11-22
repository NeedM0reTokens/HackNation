from typing import Any

from fastapi import APIRouter

from ..models.auth import (
    CitizenIdentity,
    MobywatelLoginRequest,
    TokenResponse,
)
from ..models.simulation import (
    ContributionDebtCertificateResponse,
    EzlaCertificateResponse,
    EzlaCitizenResponse,
    UserProfileResponse,
)
from ..services.mobywatel import MobywatelService, mobywatel_service
from ..services.simulation import (
    get_citizen_debt_certificate_service,
    get_citizen_ezla_service,
    get_mock_user_profile_service,
    get_single_ezla_certificate_service,
)

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

EZLA_ENDPOINT_DESCRIPTION = (
    "Symuluje podgląd danych o zaświadczeniach lekarskich e-ZLA wystawionych z powodu "
    "niezdolności do pracy ze względu na chorobę (w tym kod B - ciąża) zarejestrowanych "
    "w rejestrze ZUS dla wskazanego numeru PESEL:\n\n"
    "- **Identyfikator dokumentu**: seria, numer i unikalne ID e-ZLA.\n"
    "- **Kod literowy ZUS**: kod B (ciąża, 100% podstawy), kod A (ponowna choroba <60 dni).\n"
    "- **Okres zwolnienia**: data początkowa, data końcowa, łączna liczba dni.\n"
    "- **Zalecenia lekarskie**: kod 1 (powinien leżeć) / kod 2 (może chodzić).\n"
    "- **Lekarz i placówka**: lekarz wystawiający, PWZ, specjalizacja, placówka medyczna.\n"
    "- **Prawo do świadczeń**: stawka procentowa (100% / 80%), podmiot wypłacający.\n"
    "- **Status orzeczenia**: aktywne (trwające) lub historyczne (zakończone)."
)

ZUS_DEBT_ENDPOINT_DESCRIPTION = (
    "Symuluje pobranie danych o stanie zadłużenia ze składek na ubezpieczenia społeczne "
    "na dzień powstania prawa do świadczenia (w tym zaświadczenie ZUS RD-3 / ZAS-W):\n\n"
    "- **Dzień powstania prawa**: data weryfikacji konta płatnika (parametr `entitlement_date`).\n"
    "- **Podstawa prawna (art. 2a)**: weryfikacja progu 1% minimalnego wynagrodzenia (48,06 zł).\n"
    "- **Wpływ na przedsiębiorców (JDG)**: wstrzymanie wypłaty świadczeń przy długu >48,06 zł.\n"
    "- **Termin przedawnienia**: pouczenie o 6-miesięcznym terminie spłaty (art. 2a ust. 2).\n"
    "- **Zaświadczenie ZUS**: symulowany numer i treść zaświadczenia o niezaleganiu / zaległości."
)


class MockRouter(APIRouter):
    """Router for mocking external mObywatel IdP service."""

    def __init__(
        self,
        mobywatel: MobywatelService | None = None,
        prefix: str = "/mock",
        **kwargs: Any,
    ) -> None:
        super().__init__(prefix=prefix, tags=["Symulacje zewnętrznych serwisów (Mock)"], **kwargs)
        self.mobywatel: MobywatelService = mobywatel or mobywatel_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        # PUE ZUS mock profile (BE-26 / BE-28)
        self.add_api_route(
            "/profile/{user_id}",
            self.get_mock_user_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie profilu ubezpieczonego z symulacji PUE ZUS / mObywatel",
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

        self.add_api_route(
            "/zus/profile",
            self.get_zus_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            summary="Pobranie profilu ubezpieczenia ZUS (BE-28)",
            description=(
                "Alias dla integracji z mockiem ZUS "
                "(zwraca status ubezpieczenia i weryfikację zadłużenia)."
            ),
        )
        # mObywatel IdP mock endpoints (BE-27)
        # mObywatel IdP mock endpoints (BE-27)
        self.add_api_route(
            "/mobywatel/identities",
            self.list_mobywatel_identities_route,
            methods=["GET"],
            response_model=list[CitizenIdentity],
            summary="Pobierz listę profili mObywatel (symulacja IdP) (BE-27)",
            description=(
                "Zwraca zestaw tożsamości obywateli zarejestrowanych w systemie "
                "do wyboru w przełączniku kont demonstracyjnych."
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

    def get_zus_profile_route(self, user_id: str = "anna-kowalska") -> UserProfileResponse:
        """Returns mock PUE ZUS profile (BE-28)."""
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
    """Router for simulated ZUS government registry endpoints (prefix /zus)."""

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

        self.add_api_route(
            "/ezla/{pesel}",
            self.get_citizen_ezla_route,
            methods=["GET"],
            response_model=EzlaCitizenResponse,
            summary="Podgląd zaświadczeń lekarskich e-ZLA osoby z systemów ZUS (PESEL)",
            description=EZLA_ENDPOINT_DESCRIPTION,
            response_description="Lista zaświadczeń lekarskich e-ZLA zarejestrowanych w ZUS",
        )

        self.add_api_route(
            "/ezla/certificate/{document_id:path}",
            self.get_single_ezla_certificate_route,
            methods=["GET"],
            response_model=EzlaCertificateResponse,
            summary="Szczegóły pojedynczego zaświadczenia lekarskiego e-ZLA",
            description="Zwraca szczegółowe dane pojedynczego zaświadczenia e-ZLA po ID dokumentu.",
        )

        self.add_api_route(
            "/debt/{pesel}",
            self.get_zus_debt_certificate_route,
            methods=["GET"],
            response_model=ContributionDebtCertificateResponse,
            summary="Zaświadczenie o stanie zadłużenia z tytułu składek ZUS (art. 2a)",
            description=ZUS_DEBT_ENDPOINT_DESCRIPTION,
            response_description="Zaświadczenie o stanie zadłużenia składkowego w ZUS",
            responses={
                200: {
                    "description": "Pomyślnie wygenerowano zaświadczenie o stanie zadłużenia z ZUS."
                },
                404: {
                    "description": "Osoba o podanym PESEL nie została znaleziona w rejestrze ZUS."
                },
            },
        )

    def get_zus_insurance_data_route(self, pesel: str) -> UserProfileResponse:
        """Returns simulated ZUS insurance data for the given PESEL."""
        return get_mock_user_profile_service(pesel)

    def get_citizen_ezla_route(self, pesel: str) -> EzlaCitizenResponse:
        """Returns simulated e-ZLA certificates for citizen by PESEL."""
        return get_citizen_ezla_service(pesel)

    def get_single_ezla_certificate_route(self, document_id: str) -> EzlaCertificateResponse:
        """Returns details of a single e-ZLA certificate by document ID."""
        return get_single_ezla_certificate_service(document_id)

    def get_zus_debt_certificate_route(
        self,
        pesel: str,
        entitlement_date: str | None = None,
    ) -> ContributionDebtCertificateResponse:
        """Returns simulated contribution debt certificate on entitlement date for given PESEL."""
        return get_citizen_debt_certificate_service(pesel, entitlement_date=entitlement_date)

router = MockRouter()
