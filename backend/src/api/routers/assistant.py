from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..models.assistant import (
    AssistantAskRequest,
    AssistantAskResponse,
    AssistantStatusResponse,
    AssistantTopicResponse,
)
from ..services.assistant import assistant_service


class AssistantRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(
            prefix="/assistant",
            tags=["Asystent AI ZUS (Gemini)"],
            **kwargs,
        )
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/ask",
            self.ask_assistant_route,
            methods=["POST"],
            response_model=AssistantAskResponse,
            status_code=status.HTTP_200_OK,
            summary="Zadaj pytanie Asystentowi AI (Google Gemini)",
            description=(
                "Przesyła zapytanie obywatela do modułu Asystenta AI opartego na Google Gemini. "
                "W przypadku pytań o uprawnienia rodzicielskie generuje prostą odpowiedź "
                "z precyzyjną podstawą prawną (KP, ustawa zasiłkowa 2026). "
                "W przypadku braku klucza API bezpiecznie korzysta z bazy wiedzy ZUS."
            ),
            response_description="Ustrukturyzowana odpowiedź AI z punktami i podstawą prawną",
        )

        self.add_api_route(
            "/explain/{topic_id}",
            self.explain_topic_route,
            methods=["GET"],
            response_model=AssistantTopicResponse,
            status_code=status.HTTP_200_OK,
            summary="Pobierz wyjaśnienie konkretnego zagadnienia prawnego (ExplainSparkle)",
            description=(
                "Zwraca proste wyjaśnienie wybranego zagadnienia prawnego "
                "(np. podstawa-wymiaru, wariant-815, okres-wyczekiwania, za-zyciem, ojcowski) "
                "do wyświetlenia w dymkach informacyjnych w portalu."
            ),
            response_description="Wyjaśnienie zagadnienia prawnego",
        )

        self.add_api_route(
            "/status",
            self.get_assistant_status_route,
            methods=["GET"],
            response_model=AssistantStatusResponse,
            status_code=status.HTTP_200_OK,
            summary="Status modułu Asystenta AI i dostępność Google Gemini",
            description="Informacja o stanie konfiguracji klucza API Gemini oraz aktywnym modelu.",
            response_description="Status konfiguracji AI",
        )

    async def ask_assistant_route(self, request: AssistantAskRequest) -> AssistantAskResponse:
        try:
            return await assistant_service.ask_assistant(request)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Błąd przetwarzania zapytania AI: {e!s}",
            ) from e

    async def explain_topic_route(self, topic_id: str) -> AssistantTopicResponse:
        return assistant_service.get_topic_explanation(topic_id)

    async def get_assistant_status_route(self) -> AssistantStatusResponse:
        return assistant_service.get_status()


router = AssistantRouter()
AssistantAPI = AssistantRouter
