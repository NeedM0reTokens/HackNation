from typing import Any

from fastapi import APIRouter, Security

from ..models.admin import AdminConfig, AdminConfigUpdate
from ..security import Permission, authorization_manager
from ..services.admin import (
    config_service,
    get_admin_config_service,
    update_admin_config_service,
)

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


@router.get(
    "/config",
    response_model=AdminConfig,
    dependencies=[
        Security(
            authorization_manager.require,
            scopes=[Permission.admin_config_read],
        )
    ],
    summary="Pobierz aktualne parametry prawne i konfiguracyjne",
    description=(
        "Zwraca zestaw aktualnie obowiązujących wskaźników prawnych ZUS i parametrów makro: "
        "stawki procentowe zasiłków (100%, 70%, 81.5%), wymiary urlopów macierzyńskich, "
        "limity wieku oraz minimalne wynagrodzenie za pracę (BE-01, BE-03)."
    ),
    response_description="Aktualny obiekt konfiguracji prawnej",
)
def get_admin_config() -> AdminConfig:
    """Zwraca bieżącą konfigurację parametrów ustawowych."""
    return get_admin_config_service()


@router.put(
    "/config",
    response_model=AdminConfig,
    dependencies=[
        Security(
            authorization_manager.require,
            scopes=[Permission.admin_config_update],
        )
    ],
    summary="Zaktualizuj parametry w locie (bez restartu serwera)",
    description=(
        "Umożliwia administratorowi lub audytorowi dynamiczną aktualizację parametrów "
        "prawnych (np. podwyżka płacy minimalnej, zmiana stóp procentowych) bez restartu serwera. "
        "Zmiany są trwale zapisywane w pliku `config.json` i natychmiast uwzględniane "
        "przez silnik kalkulatorów (BE-02, BE-03)."
    ),
    response_description="Zaktualizowany obiekt konfiguracji prawnej",
    responses={
        200: {"description": "Parametry zostały pomyślnie zaktualizowane w locie."},
        422: {"description": "Błąd walidacji danych (np. stawka poza zakresem 0-100%)."},
    },
)
def update_admin_config(payload: AdminConfigUpdate) -> AdminConfig:
    """Aktualizuje parametry prawne i kwotowe w locie."""
    return update_admin_config_service(payload)


class AdminRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/admin", tags=["Admin Panel"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/config",
            self.get_admin_config,
            methods=["GET"],
            response_model=AdminConfig,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.admin_config_read],
                )
            ],
            summary="Pobierz aktualne parametry prawne i konfiguracyjne",
            description=(
                "Zwraca zestaw aktualnych wskaźników prawnych ZUS i parametrów makro: "
                "stawki procentowe zasiłków (100%, 70%, 81.5%), wymiary urlopów macierzyńskich, "
                "limity wieku oraz minimalne wynagrodzenie za pracę (BE-01, BE-03)."
            ),
            response_description="Aktualny obiekt konfiguracji prawnej",
        )
        self.add_api_route(
            "/config",
            self.update_admin_config,
            methods=["PUT"],
            response_model=AdminConfig,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.admin_config_update],
                )
            ],
            summary="Zaktualizuj parametry w locie (bez restartu serwera)",
            description=(
                "Umożliwia administratorowi dynamiczną aktualizację parametrów prawnych "
                "bez restartu serwera (BE-02, BE-03)."
            ),
            response_description="Zaktualizowany obiekt konfiguracji prawnej",
        )

    def get_admin_config(self) -> AdminConfig:
        return config_service.get_config()

    def update_admin_config(self, data: AdminConfigUpdate) -> AdminConfig:
        return config_service.update_config(data)


AdminAPI = AdminRouter
