import base64
import json
import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

OCR_PROMPT = """Przeanalizuj załączony dokument urzędowy ZUS (skan formularza w formacie PDF)
i wyekstrahuj z niego dane strukturalne do weryfikacji prawa do świadczeń.

Zwróć wynik WYŁĄCZNIE jako obiekt JSON o następującym schemacie:
{
  "document_type": "Z-3 | Z-3a | ZAM | ZAS-53 | e-ZLA | HOSPITAL_CERTIFICATE | OTHER",
  "document_title": "Dokładny tytuł lub nazwa formularza",
  "first_name": "Imię ubezpieczonego",
  "last_name": "Nazwisko ubezpieczonego",
  "pesel": "11-cyfrowy numer PESEL lub null",
  "company_name": "Nazwa firmy / płatnika składek",
  "nip": "10-cyfrowy numer NIP płatnika (same cyfry) lub null",
  "payer_size": "ABOVE_20 lub UP_TO_20",
  "employment_type": "EMPLOYMENT_CONTRACT | MANDATE_CONTRACT | B2B",
  "gross_monthly_income": 0.0,
  "insurance_duration_days": 365,
  "has_pregnancy_code_b": false,
  "has_za_zyciem_certificate": false,
  "is_premature_or_hospitalized": false,
  "hospital_stay_weeks": 0,
  "children_count": 1,
  "child_birth_date": "YYYY-MM-DD lub null",
  "sick_leave_duration_days": 0,
  "has_overdue_debt": false,
  "debt_amount": 0.0,
  "is_eligible": true,
  "status_badge": "ELIGIBLE | NOT_ELIGIBLE_NO_INSURANCE | WARNING_DEBT",
  "summary": "Podsumowanie ustaleń",
  "validation_messages": ["Lista kluczowych wniosków prawnych"]
}
"""


def get_gemini_api_key() -> str | None:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return key if key else None


def is_gemini_ocr_available() -> bool:
    return get_gemini_api_key() is not None


def ocr_pdf_with_gemini(file_bytes: bytes, filename: str) -> dict[str, Any] | None:
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    b64_data = base64.b64encode(file_bytes).decode("ascii")

    models_to_try = ["gemini-2.5-flash", "gemini-1.5-flash"]
    for model_name in models_to_try:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
        url = f"{endpoint}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": "application/pdf",
                                "data": b64_data,
                            }
                        },
                        {
                            "text": OCR_PROMPT,
                        },
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
                "topP": 0.9,
                "topK": 40,
                "maxOutputTokens": 4096,
                "mediaResolution": "MEDIA_RESOLUTION_HIGH",
                "thinkingConfig": {
                    "thinkingBudget": 4096,
                },
            },
        }
        if not model_name.startswith("gemini-2.5"):
            payload["generationConfig"].pop("mediaResolution", None)
            payload["generationConfig"].pop("thinkingConfig", None)

        try:
            resp = requests.post(url, json=payload, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text_resp = parts[0].get("text", "")
                        return json.loads(text_resp)
            elif resp.status_code in (404, 400):
                continue
        except Exception:
            continue

    return None
