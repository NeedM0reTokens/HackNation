from fastapi import HTTPException, UploadFile

from ..models.pdf import PdfParseResponse


async def parse_pdf_service(file: UploadFile) -> PdfParseResponse:
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
