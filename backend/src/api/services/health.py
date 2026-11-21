from ..models.health import HealthResponse


def get_health_status() -> HealthResponse:
    return HealthResponse(
        status="ok",
        message="Backend ZUS Przewodnika działa poprawnie!",
        version="1.0.0",
    )
