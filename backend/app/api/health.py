from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", example="ok")
    message: str = Field(..., example="Backend ZUS Przewodnika działa poprawnie!")
    version: str = Field(default="1.0.0", example="1.0.0")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthRouter(APIRouter):
    """Osobna klasa routera dla sprawdzania stanu aplikacji (Healthcheck)."""

    def __init__(self, **kwargs):
        super().__init__(tags=["Health"], **kwargs)
        self._setup_routes()

    def _setup_routes(self):
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
