from typing import Any

from fastapi import APIRouter

from src.api.models.admin import AdminConfig, AdminConfigUpdate
from src.api.services.admin import (
    config_service,
    get_admin_config_service,
    update_admin_config_service,
)

router = APIRouter(prefix="/admin", tags=["Panel Admina"])


@router.get(
    "/config",
    response_model=AdminConfig,
    summary="Get current legal and configuration parameters",
)
def get_admin_config() -> AdminConfig:
    return get_admin_config_service()


@router.put(
    "/config",
    response_model=AdminConfig,
    summary="Update parameters at runtime (without restarting server)",
)
def update_admin_config(payload: AdminConfigUpdate) -> AdminConfig:
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
            summary="Get current legal and configuration parameters",
        )
        self.add_api_route(
            "/config",
            self.update_admin_config,
            methods=["PUT"],
            response_model=AdminConfig,
            summary="Update parameters at runtime (without restarting server)",
        )

    def get_admin_config(self) -> AdminConfig:
        return config_service.get_config()

    def update_admin_config(self, data: AdminConfigUpdate) -> AdminConfig:
        return config_service.update_config(data)


AdminAPI = AdminRouter
