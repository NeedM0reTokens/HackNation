# Komponent: Health & Diagnostyka API

## 1. Rola i Odpowiedzialność
Komponent odpowiada za diagnostykę dostępności aplikacji (liveness & readiness probe), weryfikację stanu połączenia oraz udostępnianie podstawowych metadanych serwera (wersja API, status, czas odpowiedzi).

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/health.py` (`HealthRouter`, `HealthAPI`)
- **Serwis**: `backend/src/api/services/health.py` (`get_health_status`)
- **Model**: `backend/src/api/models/health.py` (`HealthResponse`)

---

## 3. Specyfikacja Endpointów
- **`GET /health`** oraz **`GET /api/health`**
  - **Odpowiedź (200 OK)**:
    ```json
    {
      "status": "ok",
      "version": "1.0.0",
      "environment": "production"
    }
    ```

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent wykorzystuje ten endpoint do weryfikacji, czy środowisko backendowe FastAPI jest aktywne, dostępne sieciowo oraz czy konfiguracja CORS i routerów nie uległa awarii przed rozpoczęciem wykonywania zapytań kalkulatora.

### Niezmienniki i Zasady
- Endpoint jest bezstanowy, publiczny i nie wymaga autoryzacji ani podawania parametrów.
- Jeśli endpoint zwraca kod różny od 200 lub timeout, agent nie powinien ponawiać ciężkich zapytań kalkulacyjnych, lecz natychmiast zgłosić awarię serwera.

### Przykładowy Prompt Użytkownika i Reakcja Agenta
- **Użytkownik**: „Czy backend działa i czy mogę połączyć się z API?”
- **Akcja Agenta**: Wywołaj `GET /health`. Przy odpowiedzi `status == "ok"` potwierdź gotowość serwera do obliczeń świadczeń rodzicielskich.
