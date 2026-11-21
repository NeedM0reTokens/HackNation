"""Router: zasiłki w ciąży."""

from fastapi import APIRouter
from src.calculators.pregnancy import (
    PregnancyInput,
    PregnancyResult,
    oblicz_zasilek_ciaza,
)

router = APIRouter(prefix="/api", tags=["Zasiłki w ciąży"])


@router.post(
    "/zasilki-ciaza",
    response_model=PregnancyResult,
    summary="Kalkulator zasiłku chorobowego w ciąży",
    description=(
        "Oblicza zasiłek chorobowy w ciąży (kod B, 100% podstawy, max 270 dni). "
        "Uwzględnia formę zatrudnienia, okres wyczekiwania, podział kosztów "
        "pracodawca/ZUS, upadłość, świadczenie rehabilitacyjne."
    ),
)
def oblicz_zasilek_w_ciazy(dane: PregnancyInput) -> PregnancyResult:
    return oblicz_zasilek_ciaza(dane)
