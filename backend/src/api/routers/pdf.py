from typing import Annotated, Any

from fastapi import APIRouter, File, UploadFile

from ..models.pdf import PdfParseResponse
from ..services.pdf import parse_pdf_service

router = APIRouter(prefix="/pdf", tags=["PDF Processing & Extraction"])


@router.post(
    "/parse",
    response_model=PdfParseResponse,
    summary="Extract and validate ZUS form from uploaded PDF",
    description=(
        "Uploads a ZUS PDF document (e.g., ZAM, Z-3, Z-3a, ZAS-53, e-ZLA), "
        "extracts text, validates PESEL/NIP checksums, checks statutory eligibility, "
        "and produces structured pre-fill data for allowance calculators."
    ),
)
async def parse_pdf(
    file: Annotated[UploadFile, File(description="ZUS PDF document file to process")],
) -> PdfParseResponse:
    return await parse_pdf_service(file)


class PdfRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.include_router(router)


PdfAPI = PdfRouter
