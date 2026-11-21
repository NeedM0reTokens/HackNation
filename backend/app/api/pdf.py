from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel


class PdfParseResponse(BaseModel):
    filename: str
    status: str
    extracted_data: dict


class PdfRouter(APIRouter):
    """Osobna klasa routera dla obsługi i parsowania formularzy ZUS w formacie PDF."""

    def __init__(self, **kwargs):
        super().__init__(prefix="/pdf", tags=["Obsługa PDF"], **kwargs)
        self._setup_routes()

    def _setup_routes(self):
        self.add_api_route(
            "/parse",
            self.parse_pdf,
            methods=["POST"],
            response_model=PdfParseResponse,
            summary="Parsowanie formularza ZUS z PDF (np. ZAM, Z-3)",
        )

    async def parse_pdf(self, file: Annotated[UploadFile, File(...)]) -> PdfParseResponse:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Plik musi mieć rozszerzenie .pdf")

        return PdfParseResponse(
            filename=file.filename,
            status="parsed_mock",
            extracted_data={
                "pesel": "90010112345",
                "typ_wniosku": "ZAM",
                "okres_ubezpieczenia_dni": 180,
            },
        )


# Alias dla kompatybilności
PdfAPI = PdfRouter
