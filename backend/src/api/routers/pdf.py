from typing import Annotated, Any

from fastapi import APIRouter, File, UploadFile

from ..models.pdf import PdfParseResponse
from ..services.pdf import parse_pdf_service

router = APIRouter(prefix="/pdf", tags=["PDF Processing & Extraction"])


@router.post(
    "/parse",
    response_model=PdfParseResponse,
    summary="Ekstrakcja i walidacja danych z druków ZUS w formacie PDF (BE-22 - BE-25)",
    description=(
        "Przetwarza przesłany plik PDF oficjalnego formularza ZUS "
        "(ZAM, Z-3, Z-3a, ZAS-53, e-ZLA):\n\n"
        "- Wyciąga surowy tekst i rozpoznaje typ dokumentu.\n"
        "- Weryfikuje sumy kontrolne numerów PESEL i NIP.\n"
        "- Bada spełnienie warunków ustawowych (np. okres wyczekiwania, ubezpieczenie).\n"
        "- Generuje gotowy obiekt `calculator_payload` do natychmiastowego zasilenia kalkulatora."
    ),
    response_description="Wyekstrahowane dane płatnika i ubezpieczonego oraz status walidacji",
    responses={
        200: {"description": "Dokument został pomyślnie przetworzony i zwalidowany."},
        400: {"description": "Błąd formatu pliku lub nieobsługiwany dokument."},
        422: {"description": "Błąd parsowania lub brak wymaganych pól w formularzu."},
    },
)
async def parse_pdf(
    file: Annotated[
        UploadFile, File(description="Plik formularza ZUS w formacie PDF do przetworzenia")
    ],
) -> PdfParseResponse:
    """Przetwarza dokument PDF z formularzem ZUS i wyciąga dane strukturalne."""
    return await parse_pdf_service(file)


class PdfRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


PdfAPI = PdfRouter
