from typing import Annotated, Any

from fastapi import APIRouter, File, UploadFile

from ..models.pdf import PdfParseResponse
from ..services.pdf import parse_pdf_service

router = APIRouter(prefix="/pdf", tags=["Obsługa PDF"])

@router.post("/parse", response_model=PdfParseResponse)
async def parse_pdf(file: Annotated[UploadFile, File(...)]) -> PdfParseResponse:
    return await parse_pdf_service(file)

class PdfRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)

PdfAPI = PdfRouter
