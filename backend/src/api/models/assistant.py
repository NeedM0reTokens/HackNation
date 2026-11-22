from typing import Any

from pydantic import BaseModel, Field


class AssistantChatMessage(BaseModel):
    role: str = Field(..., description="Role of the speaker: 'user', 'assistant', 'system'")
    content: str = Field(..., description="Text content of the message")


class AssistantAskRequest(BaseModel):
    message: str = Field(
        ..., min_length=1, max_length=3000, description="Pytanie użytkownika do Asystenta AI"
    )
    history: list[AssistantChatMessage] | None = Field(
        default=None, description="Historia konwersacji ułatwiająca wieloturowy dialog"
    )
    topic_id: str | None = Field(
        default=None,
        description="Opcjonalny identyfikator tematu (np. podstawa-wymiaru, wariant-815)",
    )
    user_context: dict[str, Any] | None = Field(
        default=None, description="Opcjonalny kontekst symulacji lub profilu ubezpieczonego"
    )


class AssistantAskResponse(BaseModel):
    id: str = Field(..., description="Unikalny identyfikator odpowiedzi")
    title: str = Field(..., description="Zwięzły tytuł tematu")
    summary: str = Field(..., description="Główna, przystępna odpowiedź w prostym języku urzędowym")
    details: list[str] = Field(
        default_factory=list, description="Kluczowe punkty, wymagania i terminy"
    )
    legal_basis: str | None = Field(
        default=None, description="Podstawa prawna (art. Kodeksu pracy lub ustawy zasiłkowej)"
    )
    model_used: str = Field(
        default="gemini-2.0-flash", description="Model AI lub silnik wiedzy użyty do odpowiedzi"
    )
    is_live_ai: bool = Field(
        default=True, description="Czy odpowiedź została wygenerowana na żywo przez Gemini API"
    )


class AssistantTopicResponse(BaseModel):
    id: str = Field(..., description="Identyfikator tematu")
    title: str = Field(..., description="Tytuł tematu")
    summary: str = Field(..., description="Przystępne wyjaśnienie")
    details: list[str] = Field(default_factory=list, description="Szczegóły i wskazówki")
    legal_basis: str | None = Field(default=None, description="Podstawa prawna")


class AssistantStatusResponse(BaseModel):
    is_configured: bool = Field(..., description="Czy klucz API Gemini jest skonfigurowany")
    model: str = Field(..., description="Aktywny model Gemini")
    provider: str = Field(default="Google Gemini AI", description="Dostawca usługi AI")
