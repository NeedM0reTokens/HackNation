import json
import logging
import os
import uuid
from typing import Any

import httpx

from ..models.assistant import (
    AssistantAskRequest,
    AssistantAskResponse,
    AssistantStatusResponse,
    AssistantTopicResponse,
)

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
FALLBACK_GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_ENDPOINT_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
)

ZUS_ASSISTANT_SYSTEM_INSTRUCTION = (
    "Jesteś oficjalnym Doradcą AI portalu Zasiłkowy Przewodnik Przyszłego Rodzica (ZUS 2026).\n"
    "Tłumaczysz skomplikowane przepisy ubezpieczeniowe na prosty język urzędowy (Plain Polish),\n"
    "z zachowaniem 100% precyzji prawnej na stan prawny 2026 roku.\n\n"
    "ZASADY PRAWNE 2026:\n"
    "1. Płaca minimalna 2026: 4 806,00 zł brutto. Składki finansowane przez pracownika: 13,71%.\n"
    "2. Okres wyczekiwania: 30 dni (umowa o pracę), 90 dni (zlecenie / JDG dobrowolnie).\n"
    "   Zasiłek macierzyński nie ma okresu wyczekiwania - wystarczy ubezpieczenie w dniu porodu.\n"
    "3. Ciąża: kod 'B' w e-ZLA daje 100% podstawy wymiaru, max 270 dni pobierania.\n"
    "   Płatnik >20 pracowników płaci wynagrodzenie do 33 dni (14 dni po 50. r.ż.), potem ZUS.\n"
    "   Płatnik <=20 pracowników: ZUS płaci od 1. dnia.\n"
    "   Świadczenie rehabilitacyjne w ciąży: 100% podstawy (art. 19 ust. 1 ustawy zasiłkowej).\n"
    "4. Urlop macierzyński: 20 tyg. (1 dziecko), 31 (bliźnięta), 33 (3), 35 (4), 37 (5+).\n"
    "   14 tyg. obowiązkowo dla matki; po 14 tyg. resztę może przejąć ojciec.\n"
    "5. Urlop rodzicielski: 41 tyg. (1 dziecko), 43 tyg. (bliźnięta).\n"
    "   W tym 9 tygodni nieprzenoszalnych wyłącznie dla drugiego rodzica (art. 182(1a) § 4 KP).\n"
    "6. Warianty zasiłku: 81,5% stałe (długi wniosek w 21 dni) LUB 100% macierzyński i 70% "
    "rodzicielski. 9 tyg. ojca zawsze 70%.\n"
    "7. Urlop ojcowski: 14 dni, 100% podstawy, do 12 mies. życia dziecka (art. 182(3) KP).\n"
    "8. Zaświadczenie 'Za życiem': wydłużony urlop rodzicielski do 65/67 tyg. i 4 000 zł.\n"
    "9. Wcześniak / hospitalizacja noworodka: uzupełniający urlop macierzyński 100% (do 15 tyg.).\n"
    "10. Łączenie rodzicielskiego z pracą: max 1/2 etatu, proporcjonalne wydłużenie urlopu.\n"
    "11. Adopcja: urlop na warunkach macierzyńskiego do 7 lat (10/14 lat), min. 9 tyg.\n\n"
    'Zwróć odpowiedź WYŁĄCZNIE jako JSON: {"title": "...", "summary": "...", '
    '"details": ["..."], "legal_basis": "..."}'
)

STATUTORY_GLOSSARY: dict[str, dict[str, Any]] = {
    "podstawa-wymiaru": {
        "id": "podstawa-wymiaru",
        "title": "Podstawa wymiaru zasiłku",
        "summary": (
            "Podstawa wymiaru to kwota, od której ZUS oblicza wysokość Twojego świadczenia. "
            "Dla pracowników na etacie stanowi ją przeciętne miesięczne wynagrodzenie brutto "
            "z 12 miesięcy poprzedzających poród lub chorobę, pomniejszone o 13,71% składek."
        ),
        "details": [
            "Na umowie o pracę: średnia z 12 pełnych miesięcy kalendarzowych przed zwolnieniem.",
            "Na działalności: zadeklarowana kwota podstawy składek z ostatnich 12 miesięcy.",
            "Krótszy staż: średnia z pełnych miesięcy kalendarzowych ubezpieczenia.",
        ],
        "legal_basis": "Art. 36 i art. 48 ustawy zasiłkowej",
    },
    "platnik-skladek": {
        "id": "platnik-skladek",
        "title": "Płatnik składek i wypłata zasiłku",
        "summary": (
            "Płatnikiem jest podmiot zgłaszający Cię do ubezpieczeń społecznych. "
            "Kto wypłaca zasiłek, zależy od liczby ubezpieczonych na dzień 30 listopada."
        ),
        "details": [
            "Płatnik zgłaszający powyżej 20 osób sam nalicza i wypłaca zasiłki pracownikom.",
            "Płatnik zgłaszający do 20 osób przekazuje dokumentację, a zasiłek wypłaca ZUS.",
            "W przypadku działalności gospodarczej wypłaty zawsze dokonuje ZUS.",
        ],
        "legal_basis": "Art. 61 ustawy zasiłkowej",
    },
    "okres-wyczekiwania": {
        "id": "okres-wyczekiwania",
        "title": "Okres wyczekiwania (karencja)",
        "summary": (
            "Okres wyczekiwania to minimalny czas podlegania ubezpieczeniu chorobowemu, "
            "wymagany do nabycia prawa do zasiłku chorobowego. Zasiłek macierzyński "
            "jest z tego wymogu całkowicie zwolniony."
        ),
        "details": [
            "Umowa o pracę (obowiązkowe): 30 dni nieprzerwanego ubezpieczenia.",
            "Działalność i zlecenie (dobrowolne): 90 dni nieprzerwanego ubezpieczenia.",
            "Zasiłek macierzyński: brak karencji - wystarczy opłacona składka w dniu porodu.",
        ],
        "legal_basis": "Art. 4 ustawy zasiłkowej",
    },
    "kod-b": {
        "id": "kod-b",
        "title": "Kod 'B' na zwolnieniu e-ZLA (ciąża)",
        "summary": (
            "Kod 'B' na elektronicznym zwolnieniu lekarskim oznacza niezdolność do pracy w ciąży. "
            "Gwarantuje wypłatę zasiłku chorobowego w pełnej wysokości 100% podstawy."
        ),
        "details": [
            "Zasiłek w ciąży wynosi 100% podstawy wymiaru (zamiast standardowych 80%).",
            "Maksymalny okres zasiłkowy w ciąży wynosi aż 270 dni (zamiast 182 dni).",
            "Lekarz oznacza kod automatycznie w e-ZLA - dane natychmiast trafiają do ZUS.",
        ],
        "legal_basis": "Art. 11 ust. 2 pkt 1 ustawy zasiłkowej",
    },
    "wariant-815": {
        "id": "wariant-815",
        "title": "Wariant uśredniony 81,5% vs 100% i 70%",
        "summary": (
            "Przyszła mama może wybrać wypłatę stałej kwoty 81,5% przez cały okres macierzyńskiego "
            "i rodzicielskiego LUB wariant zmienny: 100% za macierzyński i 70% za rodzicielski. "
            "Suma wypłaconych świadczeń w obu opcjach jest zbliżona."
        ),
        "details": [
            "Wniosek o stawkę 81,5% należy złożyć w ciągu 21 dni po porodzie (długi wniosek).",
            "Zapewnia stałe, równe wpływy na konto przez cały rok opieki nad dzieckiem.",
            "9 tygodni urlopu nieprzenoszalnego dla drugiego rodzica jest zawsze płatne 70%.",
        ],
        "legal_basis": "Art. 30a i art. 31 ustawy zasiłkowej",
    },
    "ojcowski": {
        "id": "ojcowski",
        "title": "Urlop ojcowski (14 dni)",
        "summary": (
            "Urlop ojcowski to wyłączne i samodzielne uprawnienie pracownika-ojca. "
            "Wynosi 14 dni kalendarzowych, jest płatny 100% podstawy i nie uszczupla urlopu matki."
        ),
        "details": [
            "Wymiar: 14 dni kalendarzowych z prawem do 100% zasiłku macierzyńskiego.",
            "Podział: można wykorzystać jednorazowo lub w 2 częściach po minimum 7 dni.",
            "Termin: do ukończenia przez dziecko 12. miesiąca życia (lub 14 lat przy adopcji).",
        ],
        "legal_basis": "Art. 182(3) Kodeksu pracy",
    },
    "nieprzenoszalne-9-tygodni": {
        "id": "nieprzenoszalne-9-tygodni",
        "title": "9 tygodni nieprzenoszalnego urlopu rodzicielskiego",
        "summary": (
            "Zgodnie z unijną dyrektywą Work-Life Balance, każdemu z rodziców przysługuje "
            "wyłączne prawo do 9 tygodni urlopu rodzicielskiego, którego nie można przekazać."
        ),
        "details": [
            "Łączny wymiar rodzicielskiego to 41 tygodni (lub 43 tyg. przy bliźniętach).",
            "Jeden rodzic może wykorzystać max 32 tygodnie; 9 tygodni pozostaje dla drugiego.",
            "Część 9 tygodni jest płatna w wysokości 70% podstawy wymiaru.",
        ],
        "legal_basis": "Art. 182(1a) § 4 Kodeksu pracy",
    },
    "za-zyciem": {
        "id": "za-zyciem",
        "title": "Ustawa 'Za życiem' i wydłużony urlop",
        "summary": (
            "W przypadku narodzin dziecka ze zdiagnozowanym ciężkim i nieodwracalnym upośledzeniem "
            "albo nieuleczalną chorobą zagrażającą życiu, rodzicom przysługują szczególne prawa."
        ),
        "details": [
            "Wydłużony urlop rodzicielski: do 65 tyg. (jedno dziecko) lub 67 tyg. (bliźnięta).",
            "Jednorazowe świadczenie pieniężne: 4 000 zł z tytułu urodzenia dziecka z orzeczeniem.",
            "Wymagane zaświadczenie od lekarza ze specjalizacją II stopnia lub specjalisty.",
        ],
        "legal_basis": "Ustawa o wsparciu kobiet w ciąży i rodzin 'Za życiem'",
    },
    "wczesniak": {
        "id": "wczesniak",
        "title": "Wcześniak i hospitalizacja dziecka (urlop uzupełniający)",
        "summary": (
            "Rodzicom wcześniaków oraz noworodków hospitalizowanych po porodzie przysługuje "
            "prawo do uzupełniającego urlopu macierzyńskiego, płatnego 100% podstawy."
        ),
        "details": [
            "Do 15 tygodni uzupełniającego urlopu przy porodzie przed 28. tyg. lub wadze <= 1000g.",
            "Do 8 tygodni uzupełniającego urlopu dla wcześniaków urodzonych między 28. a 36. tyg.",
            "Tydzień uzupełniającego urlopu za każdy pełny tydzień hospitalizacji noworodka.",
        ],
        "legal_basis": "Art. 180(1) i 180(2) Kodeksu pracy",
    },
    "laczenie-z-praca": {
        "id": "laczenie-z-praca",
        "title": "Łączenie urlopu rodzicielskiego z pracą na część etatu",
        "summary": (
            "Pracownik może łączyć urlop rodzicielski z wykonywaniem pracy u dotychczasowego "
            "pracodawcy w wymiarze nie wyższym niż połowa pełnego etatu (max 1/2 etatu)."
        ),
        "details": [
            "Maksymalny wymiar pracy u obecnego pracodawcy to 1/2 etatu.",
            "Urlop ulega proporcjonalnemu wydłużeniu (np. z 32 tygodni do 64 tygodni).",
            "Zasiłek ulega redukcji o połowę, a za przepracowany etat przysługuje wynagrodzenie.",
        ],
        "legal_basis": "Art. 182(1e) i art. 182(1f) Kodeksu pracy",
    },
    "adopcja": {
        "id": "adopcja",
        "title": "Adopcja i rodzina zastępcza niezawodowa",
        "summary": (
            "Rodzice przyjmujący dziecko na wychowanie w ramach przysposobienia lub rodziny "
            "zastępczej mają pełne prawo do urlopu na warunkach macierzyńskiego."
        ),
        "details": [
            "Urlop przysługuje zasadniczo do ukończenia przez dziecko 7. roku życia.",
            "W przypadku dziecka z odroczonym obowiązkiem szkolnym limit wynosi 10 lat.",
            "Gwarantowany minimalny wymiar urlopu wynosi 9 tygodni.",
        ],
        "legal_basis": "Art. 183 Kodeksu pracy",
    },
    "martwe-urodzenie": {
        "id": "martwe-urodzenie",
        "title": "Urodzenie martwe lub zgon dziecka po porodzie",
        "summary": (
            "W chwilach straty rodzice są chronieni przepisami Kodeksu pracy. "
            "Matce przysługuje urlop macierzyński w wymiarze skróconym oraz zasiłek pogrzebowy."
        ),
        "details": [
            "Wymiar urlopu macierzyńskiego: 8 tygodni (56 dni) płatne 100% podstawy.",
            "Zasiłek pogrzebowy z ZUS: 4 000 zł na podstawie wniosku Z-12 i aktu urodzenia.",
            "Nie jest wymagany minimalny okres hospitalizacji.",
        ],
        "legal_basis": "Art. 180(1) Kodeksu pracy oraz art. 77 ustawy emerytalnej",
    },
    "przejecie-urlopu-ojciec": {
        "id": "przejecie-urlopu-ojciec",
        "title": "Przejęcie urlopu macierzyńskiego przez ojca",
        "summary": (
            "Ojciec dziecka może przejąć pozostałą część urlopu macierzyńskiego po matce. "
            "Zasadą jest wykorzystanie przez matkę minimum 14 tygodni po porodzie."
        ),
        "details": [
            "Standardowo: po 14 tygodniach matka może wrócić do pracy i przekazać urlop ojcu.",
            "Wyjątek (szpital / stan zdrowia): ojciec może przejąć urlop już po 8 tygodniach.",
            "Zgon matki lub porzucenie: ojciec ma prawo do urlopu od dnia zdarzenia bez karencji.",
        ],
        "legal_basis": "Art. 180 § 4 - § 17 Kodeksu pracy",
    },
}

KEYWORD_PATTERNS: list[tuple[list[str], str]] = [
    (["podstaw", "zarobk", "średni", "wyliczan", "dochód"], "podstawa-wymiaru"),
    (["płatnik", "platnik", "kto wypłac", "pracodawc czy zus"], "platnik-skladek"),
    (["wyczekiw", "karencj", "staż", "30 dni", "90 dni"], "okres-wyczekiwania"),
    (["kod b", "kod 'b'", "ciąży", "chora w ciąży", "l4 w ciąży"], "kod-b"),
    (["81", "wariant", "81,5", "81.5", "100 i 70", "długi wniosek", "21 dni"], "wariant-815"),
    (["ojcowsk", "tata", "ojciec", "14 dni", "urlop dla taty"], "ojcowski"),
    (["9 tygodni", "nieprzenoszaln", "work life", "work-life"], "nieprzenoszalne-9-tygodni"),
    (["życiem", "zyciem", "niepełnosprawn", "orzeczeni", "4000"], "za-zyciem"),
    (["wcześniak", "wczesniak", "hospitalizacj", "inkubator", "uzupełniając"], "wczesniak"),
    (["prac", "etat", "pół etatu", "1/2", "dorabian", "wydłużeni"], "laczenie-z-praca"),
    (["adopc", "zastępcz", "przysposobien", "adoptowan"], "adopcja"),
    (["martw", "zgon", "strata", "śmierć", "poronien", "pogrzebow"], "martwe-urodzenie"),
    (["przejęci", "przekazani", "tata po 14", "rezygnacj matki"], "przejecie-urlopu-ojciec"),
]


class GeminiAssistantService:
    def __init__(self) -> None:
        self.api_key = self._resolve_api_key()
        self.active_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    def _resolve_api_key(self) -> str | None:
        return (
            os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("GEMINI_KEY")
            or os.getenv("GOOGLE_AI_KEY")
        )

    def get_status(self) -> AssistantStatusResponse:
        key = self._resolve_api_key()
        return AssistantStatusResponse(
            is_configured=bool(key and key.strip()),
            model=self.active_model,
            provider="Google Gemini AI",
        )

    def get_topic_explanation(self, topic_id: str) -> AssistantTopicResponse:
        normalized_id = topic_id.strip().lower()
        if normalized_id in STATUTORY_GLOSSARY:
            item = STATUTORY_GLOSSARY[normalized_id]
            return AssistantTopicResponse(
                id=item["id"],
                title=item["title"],
                summary=item["summary"],
                details=item.get("details", []),
                legal_basis=item.get("legal_basis"),
            )
        return AssistantTopicResponse(
            id=topic_id,
            title="Zagadnienie ZUS",
            summary=(
                "Szczegółowe wyjaśnienie przepisów Kodeksu pracy i ustawy zasiłkowej. "
                "Skorzystaj z kalkulatorów portalu, aby obliczyć przysługujące kwoty."
            ),
            details=["W sprawach indywidualnych skontaktuj się z COT ZUS: 22 560 16 00."],
            legal_basis="Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych",
        )

    async def ask_assistant(self, request: AssistantAskRequest) -> AssistantAskResponse:
        api_key = self._resolve_api_key()

        if api_key and api_key.strip():
            try:
                gemini_result = await self._call_gemini_api(request, api_key)
                if gemini_result:
                    return gemini_result
            except Exception as e:
                logger.warning(
                    f"Gemini API call failed, falling back to statutory knowledge base: {e}"
                )

        return self._answer_from_knowledge_base(request)

    async def _call_gemini_api(
        self, request: AssistantAskRequest, api_key: str
    ) -> AssistantAskResponse | None:
        prompt_content = self._build_gemini_prompt(request)
        url = GEMINI_ENDPOINT_TEMPLATE.format(model=self.active_model, key=api_key)

        request_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt_content}],
                }
            ],
            "systemInstruction": {
                "parts": [{"text": ZUS_ASSISTANT_SYSTEM_INSTRUCTION}],
            },
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=request_body)

            if resp.status_code == 404 and self.active_model != FALLBACK_GEMINI_MODEL:
                fallback_url = GEMINI_ENDPOINT_TEMPLATE.format(
                    model=FALLBACK_GEMINI_MODEL, key=api_key
                )
                resp = await client.post(fallback_url, json=request_body)

            if resp.status_code != 200:
                logger.warning(f"Gemini API returned error {resp.status_code}: {resp.text[:200]}")
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                return None

            text = parts[0].get("text", "")
            return self._parse_gemini_json_response(text, self.active_model)

    def _build_gemini_prompt(self, request: AssistantAskRequest) -> str:
        prompt_parts: list[str] = []

        if request.user_context:
            ctx_str = json.dumps(request.user_context, ensure_ascii=False)
            prompt_parts.append(f"KONTEKST UŻYTKOWNIKA: {ctx_str}")

        if request.history:
            history_str = "\n".join(
                [f"{msg.role.upper()}: {msg.content}" for msg in request.history[-4:]]
            )
            prompt_parts.append(f"POPRZEDNIE WIADOMOŚCI:\n{history_str}")

        prompt_parts.append(f"PYTANIE OBYWATELA: {request.message}")
        return "\n\n".join(prompt_parts)

    def _parse_gemini_json_response(
        self, text: str, model_used: str
    ) -> AssistantAskResponse | None:
        try:
            cleaned_text = text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            parsed = json.loads(cleaned_text)
            title = parsed.get("title") or "Wyjaśnienie przepisów ZUS"
            summary = parsed.get("summary") or "Odpowiedź na Twoje pytanie."
            details = parsed.get("details") or []
            if isinstance(details, str):
                details = [details]
            legal_basis = parsed.get("legal_basis")

            return AssistantAskResponse(
                id=f"gemini-{uuid.uuid4().hex[:8]}",
                title=title,
                summary=summary,
                details=details,
                legal_basis=legal_basis,
                model_used=model_used,
                is_live_ai=True,
            )
        except Exception as e:
            logger.error(f"Failed to parse JSON from Gemini response: {e}, raw: {text[:200]}")
            return None

    def _answer_from_knowledge_base(self, request: AssistantAskRequest) -> AssistantAskResponse:
        msg_lower = request.message.lower()

        if request.topic_id and request.topic_id in STATUTORY_GLOSSARY:
            item = STATUTORY_GLOSSARY[request.topic_id]
            return AssistantAskResponse(
                id=f"kb-{uuid.uuid4().hex[:8]}",
                title=item["title"],
                summary=item["summary"],
                details=item.get("details", []),
                legal_basis=item.get("legal_basis"),
                model_used="statutory-knowledge-engine",
                is_live_ai=False,
            )

        best_match_key: str | None = None
        for patterns, key in KEYWORD_PATTERNS:
            if any(p in msg_lower for p in patterns):
                best_match_key = key
                break

        if best_match_key and best_match_key in STATUTORY_GLOSSARY:
            item = STATUTORY_GLOSSARY[best_match_key]
            return AssistantAskResponse(
                id=f"kb-{uuid.uuid4().hex[:8]}",
                title=item["title"],
                summary=item["summary"],
                details=item.get("details", []),
                legal_basis=item.get("legal_basis"),
                model_used="statutory-knowledge-engine",
                is_live_ai=False,
            )

        return AssistantAskResponse(
            id=f"kb-{uuid.uuid4().hex[:8]}",
            title="Doradca Zasiłkowy ZUS",
            summary=(
                "W portalu Zasiłkowy Przewodnik Przyszłego Rodzica możesz sprawdzić i precyzyjnie "
                "obliczyć zasiłek macierzyński, rodzicielski, ojcowski oraz świadczenia w ciąży. "
                "Zapytaj np. o wariant 81,5%, 9 tygodni dla taty, podstawę wymiaru lub kod B."
            ),
            details=[
                "Skorzystaj z kalkulatora na górze strony, aby zobaczyć harmonogram i daty.",
                "Zaloguj się przez mObywatel, aby pobrać swoje dane o ubezpieczeniu i e-ZLA.",
                "Infolinia ZUS (COT): 22 560 16 00 (pon.-pt. 7:00-18:00).",
            ],
            legal_basis="Kodeks pracy (Dz.U. 2026) oraz ustawa zasiłkowa",
            model_used="statutory-knowledge-engine",
            is_live_ai=False,
        )


assistant_service = GeminiAssistantService()
