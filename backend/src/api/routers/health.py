from typing import Any

from fastapi import APIRouter

from ..models.health import HealthResponse
from ..services.health import get_health_status

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Sprawdzenie stanu aplikacji (/health)",
    description=(
        "Publiczny endpoint diagnostyczny (liveness/readiness probe). "
        "Zwraca aktualny stan serwera, wersję API oraz status środowiska."
    ),
    response_description="Obiekt diagnostyczny ze statusem serwera",
    responses={
        200: {
            "description": "Serwer działa poprawnie i jest gotowy do obsługi żądań.",
            "content": {
                "application/json": {
                    "example": {"status": "ok", "version": "1.0.0", "environment": "production"}
                }
            },
        }
    },
)
@router.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Sprawdzenie stanu aplikacji (/api/health)",
    description="Alias endpointu diagnostycznego pod prefiksem /api.",
    response_description="Obiekt diagnostyczny ze statusem serwera",
)
def get_health() -> HealthResponse:
    """Zwraca podstawowe metadane diagnostyczne i status serwera."""
    return get_health_status()


class HealthRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


HealthAPI = HealthRouter
