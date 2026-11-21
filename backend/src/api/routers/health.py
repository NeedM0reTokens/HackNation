from typing import Any

from fastapi import APIRouter

from ..models.health import HealthResponse
from ..services.health import get_health_status

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Sprawdzenie stanu aplikacji (/health)",
)
@router.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Sprawdzenie stanu aplikacji (/api/health)",
)
def get_health() -> HealthResponse:
    return get_health_status()


class HealthRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


HealthAPI = HealthRouter
