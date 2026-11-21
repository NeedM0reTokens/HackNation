import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field











class AdminRouter(APIRouter):
    """
    Router class for Admin Panel (BE-03).
    Exposes GET and PUT endpoints for runtime configuration management.
    """

    def __init__(self, **kwargs):
        super().__init__(prefix="/admin", tags=["Admin Panel"], **kwargs)
        self._setup_routes()

    def _setup_routes(self):
        self.add_api_route(
            "/config",
            self.get_admin_config,
            methods=["GET"],
            response_model=AdminConfig,
            summary="Get current legal and configuration parameters",
            description="Returns current configuration of rates, limits and leave durations.",
        )
        self.add_api_route(
            "/config",
            self.update_admin_config,
            methods=["PUT"],
            response_model=AdminConfig,
            summary="Update parameters at runtime (without restarting server)",
            description="Allows modifying rates and limits and saves them to config.json.",
        )

    def get_admin_config(self) -> AdminConfig:
        return config_service.get_config()

    def update_admin_config(self, data: AdminConfigUpdate) -> AdminConfig:
        return config_service.update_config(data)


# Alias for compatibility
AdminAPI = AdminRouter
