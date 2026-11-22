from typing import Any

from fastapi import APIRouter

from ..models.admin import (
    AdminConfig,
    AdminConfigUpdate,
    BenefitAmountsUpdate,
    BenefitRatesUpdate,
    LeaveDurationsUpdate,
    PeriodsAndLimitsUpdate,
    SingleParameterUpdate,
)
from ..services.admin import (
    config_service,
    get_admin_config_service,
    update_admin_config_service,
)


class AdminRouter(APIRouter):
    """
    Router for administrative inspection and dynamic modification of statutory parameters
    (benefit rates, statutory amounts, minimum wage, leave durations, and waiting limits).
    All changes are persisted to the JSON database file and take effect immediately.
    """

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/admin", tags=["Admin Panel"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        # 1. Full configuration (GET & PUT)
        self.add_api_route(
            "/config",
            self.get_admin_config,
            methods=["GET"],
            response_model=AdminConfig,
            summary="Pobierz aktualne parametry prawne i konfiguracyjne z bazy JSON",
            description=(
                "Zwraca zestaw aktualnie obowiązujących wskaźników prawnych z bazy JSON DB: "
                "stopy procentowe, kwoty świadczeń, minimalne wynagrodzenie, wymiary urlopów "
                "oraz okresy i limity ustawowe."
            ),
            response_description="Aktualny obiekt konfiguracji prawnej z bazy JSON",
        )
        self.add_api_route(
            "/config",
            self.update_admin_config,
            methods=["PUT"],
            response_model=AdminConfig,
            summary="Zaktualizuj konfigurację ustawową w bazie JSON",
            description=(
                "Umożliwia dynamiczną aktualizację pełnej konfiguracji prawnej lub jej sekcji "
                "w bazie JSON w locie bez restartu serwera."
            ),
            response_description="Zaktualizowana konfiguracja prawna zapisana w bazie JSON",
        )

        # 2. Granular endpoint: Benefit rates (Stopy procentowe)
        self.add_api_route(
            "/config/rates",
            self.update_benefit_rates,
            methods=["PUT", "PATCH"],
            response_model=AdminConfig,
            summary="Edycja stóp procentowych zasiłków w bazie JSON",
            description=(
                "Umożliwia aktualizację stóp procentowych: zasiłek chorobowy w ciąży (kod B), "
                "zasiłek standardowy (80%), jednolity (81,5%), macierzyński (100%), rodzicielski "
                "(70%), ojcowski (100%), rehabilitacyjny oraz składki społeczne (13,71%)."
            ),
        )

        # 3. Granular endpoint: Benefit amounts & minimum wage (Kwoty i płaca minimalna)
        self.add_api_route(
            "/config/amounts",
            self.update_benefit_amounts,
            methods=["PUT", "PATCH"],
            response_model=AdminConfig,
            summary="Edycja kwot zasiłków, płacy minimalnej i limitów finansowych w bazie JSON",
            description=(
                "Umożliwia aktualizację parametrów kwotowych: minimalne wynagrodzenie (4806 zł), "
                "dopuszczalny limit długu ZUS (1% płacy minimalnej), "
                "zapomoga 'Za życiem' (4000 zł), zasiłek pogrzebowy "
                "oraz maksymalna podstawa dobrowolnego chorobowego."
            ),
        )

        # 4. Granular endpoint: Leave durations (Wymiary urlopów)
        self.add_api_route(
            "/config/durations",
            self.update_leave_durations,
            methods=["PUT", "PATCH"],
            response_model=AdminConfig,
            summary="Edycja wymiarów urlopów macierzyńskich i rodzicielskich w bazie JSON",
            description=(
                "Umożliwia aktualizację wymiarów urlopów (tygodnie): macierzyński pojedynczy (20), "
                "bliźnięta (31), trojaczki (33), rodzicielski standardowy (41/43), część ojca (9), "
                "oraz urlop ojcowski (14 dni)."
            ),
        )

        # 5. Granular endpoint: Periods and limits (Okresy i terminy)
        self.add_api_route(
            "/config/limits",
            self.update_periods_and_limits,
            methods=["PUT", "PATCH"],
            response_model=AdminConfig,
            summary="Edycja okresów wyczekiwania, terminów i limitów wiekowych w bazie JSON",
            description=(
                "Umożliwia aktualizację okresów wyczekiwania (30/90 dni), limitu chorobowego "
                "(270/182 dni), terminu na długi wniosek (21 dni) oraz dni pracodawcy (33/14)."
            ),
        )

        # 6. Single parameter update (Edycja pojedynczej wartości)
        self.add_api_route(
            "/config/parameter",
            self.update_single_parameter,
            methods=["POST", "PATCH"],
            response_model=AdminConfig,
            summary="Edycja pojedynczego parametru ustawowego po nazwie klucza w bazie JSON",
            description=(
                "Przyjmuje nazwę dowolnego parametru ustawowego (np. 'min_wage_2026', "
                "'unified_benefit_rate') oraz nową wartość i zapisuje ją w bazie JSON."
            ),
        )

        # 7. Reset to statutory defaults
        self.add_api_route(
            "/config/reset",
            self.reset_admin_config,
            methods=["POST"],
            response_model=AdminConfig,
            summary="Przywrócenie domyślnych wartości ustawowych w bazie JSON",
            description="Przywraca fabryczne wartości parametrów ustawowych w pliku bazy JSON.",
        )

    def get_admin_config(self) -> AdminConfig:
        """Returns current statutory configuration from the JSON database."""
        return get_admin_config_service()

    def update_admin_config(self, data: AdminConfigUpdate) -> AdminConfig:
        """Updates statutory configuration and saves changes to the JSON database."""
        return update_admin_config_service(data)

    def update_benefit_rates(self, data: BenefitRatesUpdate) -> AdminConfig:
        """Updates percentage benefit rates in the JSON database."""
        return config_service.update_rates(data)

    def update_benefit_amounts(self, data: BenefitAmountsUpdate) -> AdminConfig:
        """Updates statutory amounts, minimum wage, and limits in the JSON database."""
        return config_service.update_amounts(data)

    def update_leave_durations(self, data: LeaveDurationsUpdate) -> AdminConfig:
        """Updates leave durations in the JSON database."""
        return config_service.update_durations(data)

    def update_periods_and_limits(self, data: PeriodsAndLimitsUpdate) -> AdminConfig:
        """Updates periods, deadlines, and limits in the JSON database."""
        return config_service.update_limits(data)

    def update_single_parameter(self, data: SingleParameterUpdate) -> AdminConfig:
        """Updates an individual statutory parameter by key name in the JSON database."""
        return config_service.update_single_parameter(data)

    def reset_admin_config(self) -> AdminConfig:
        """Resets the JSON database back to statutory defaults."""
        return config_service.reset_to_defaults()


router = AdminRouter()
AdminAPI = AdminRouter
