from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(examples=["ok"])
    message: str = Field(examples=["Backend ZUS Przewodnika działa poprawnie!"])
    version: str = Field(default="1.0.0", examples=["1.0.0"])
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HealthRouter(APIRouter):
    """Osobna klasa routera dla sprawdzania stanu aplikacji (Healthcheck)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(tags=["Health"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/health",
            self.get_health,
            methods=["GET"],
            response_model=HealthResponse,
            summary="Sprawdzenie stanu aplikacji (/health)",
        )
        self.add_api_route(
            "/api/health",
            self.get_health,
            methods=["GET"],
            response_model=HealthResponse,
            summary="Sprawdzenie stanu aplikacji (/api/health)",
        )

    def get_health(self) -> HealthResponse:
        return HealthResponse(
            status="ok",
            message="Backend ZUS Przewodnika działa poprawnie!",
            version="1.0.0",
        )


# Alias dla kompatybilności
HealthAPI = HealthRouter
