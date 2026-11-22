# Architektura Bezpieczeństwa: Panel Administratora (RBAC i Kontrola Dostępu)

Dokument opisuje zaimplementowaną architekturę bezpieczeństwa panelu administracyjnego ZUS, opartą na kontroli dostępu opartej na rolach (Role-Based Access Control – RBAC), autoryzacji opartej na zakresach uprawnień (scopes) oraz uwierzytelnianiu za pomocą tokenów JWT Bearer.

---

## 1. Model Bezpieczeństwa i Kontrola Dostępu (RBAC)

Dostęp do parametrów konfiguracyjnych i wskaźników prawnych ZUS jest chroniony na poziomie backendu FastAPI. Każde żądanie do endpointów administracyjnych podlega dwuetapowej weryfikacji:

1. **Uwierzytelnienie tożsamości (Authentication):** weryfikacja ważności i podpisu tokena Bearer JWT (`AuthenticationManager`).
2. **Autoryzacja uprawnień (Authorization):** sprawdzenie, czy rola przypisana do użytkownika posiada wymagane uprawnienie (scope) do wykonania danej operacji (`AuthorizationManager`).

```
[ Klient API / Frontend ]
          │
          │ 1. Żądanie HTTP z nagłówkiem: Authorization: Bearer <token_jwt>
          ▼
   [ FastAPI Backend ]
          │
          ▼
   [ AuthenticationManager ]
     ├── Token poprawny ──► Rozkodowanie tożsamości i roli (AuthContext)
     └── Brak tokena / token błędny ──► 401 Unauthorized
          │
          ▼
   [ AuthorizationManager (SecurityScopes) ]
     ├── Rola posiada wymagany scope ──► 200 OK (Wykonanie operacji)
     └── Brak wymaganego scope w roli ──► 403 Forbidden ("Action not permitted")
```

---

## 2. Uprawnienia i Zakresy (Scopes)

W systemie zdefiniowano dedykowane uprawnienia administracyjne w enumie `Permission` (`backend/src/api/security/roles.py`):

| Scope                 | Nazwa stałej                     | Opis                                                   |
| --------------------- | -------------------------------- | ------------------------------------------------------ |
| `admin:config:read`   | `Permission.admin_config_read`   | Odczyt aktualnej konfiguracji prawnej i stawek ZUS     |
| `admin:config:update` | `Permission.admin_config_update` | Modyfikacja wskaźników, kwot, okresów i stawek w locie |

Uprawnienia te są mapowane na bitmaski w repozytorium uprawnień (`PermissionRepository`) i przypisywane do ról w bazie (`backend/src/api/data/roles.json`):

- **Rola `admin`**: posiada pełne uprawnienia `admin:config:read` oraz `admin:config:update`.
- **Rola `user`**: posiada uprawnienia wyłącznie do kalkulatorów i symulacji; **nie posiada** uprawnień administracyjnych.

---

## 3. Zabezpieczenie Endpointów w FastAPI

Wszystkie trasy routera administracyjnego (`backend/src/api/routers/admin.py`) są zabezpieczone zależnością `Security` z biblioteki FastAPI:

### Odczyt konfiguracji:

- **`GET /api/admin/config`**
  ```python
  dependencies=[
      Security(
          authorization_manager.require,
          scopes=[Permission.admin_config_read],
      )
  ]
  ```

### Modyfikacja konfiguracji i reset:

- **`PUT /api/admin/config`**
- **`PUT, PATCH /api/admin/config/rates`**
- **`PUT, PATCH /api/admin/config/amounts`**
- **`PUT, PATCH /api/admin/config/durations`**
- **`PUT, PATCH /api/admin/config/limits`**
- **`POST, PATCH /api/admin/config/parameter`**
- **`POST /api/admin/config/reset`**
  ```python
  dependencies=[
      Security(
          authorization_manager.require,
          scopes=[Permission.admin_config_update],
      )
  ]
  ```

---

## 4. Uwierzytelnianie Tokenami JWT Bearer

1. **Format tokena:** Podpisany token JWT (algorytm HS256) zawierający identyfikator PESEL, rolę (`admin` / `user`) oraz znacznik czasu wygaśnięcia (`exp`).
2. **Pozyskanie tokena:** Token jest wydawany podczas logowania przez endpointy autentykacji (`/api/auth/mobywatel/login` lub `/api/auth/login`).
3. **Bypass deweloperski (`DEV_AUTH_BYPASS`):**
   - Przy włączonej zmiennej środowiskowej `DEV_AUTH_BYPASS="true"`, żądania bez tokena otrzymują domyślny kontekst administracyjny na potrzeby lokalnego developmentu i interaktywnej dokumentacji Swagger UI (`/docs`).
   - W środowisku produkcyjnym flaga `DEV_AUTH_BYPASS="false"` wymusza obecność ważnego tokena Bearer – brak nagłówka skutkuje natychmiastowym błędem `401 Unauthorized`.

---

## 5. Integracja z Warstwą Frontendową

1. **Przesyłanie tokena:** Klient API frontendu (`frontend/src/lib/api-client.ts`) automatycznie dołącza nagłówek `Authorization: Bearer <token>` pobierany z magazynu sesji (`zus_auth_token`).
2. **Obsługa kodów błędów:**
   - W przypadku odpowiedzi `401 Unauthorized` lub `403 Forbidden`, funkcja `handleAdminResponse` rzuca czytelny wyjątek informujący użytkownika o braku uprawnień administracyjnych.
   - Interfejs użytkownika prezentuje stosowny komunikat ostrzegawczy i uniemożliwia zapisanie modyfikacji bez odpowiedniej roli.
