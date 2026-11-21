from typing import Any

from pydantic import BaseModel


class PdfParseResponse(BaseModel):
    filename: str
    status: str
    extracted_data: dict[str, Any]
