# Architektura Bezpieczeństwa: Ochrona Plików Panelu Administratora

Dokument opisuje wzorce architektoniczne zapobiegające wyciekowi plików źródłowych, struktury komponentów oraz interfejsu panelu administratora do nieuprawnionych użytkowników (obywateli) w architekturze Single Page Application (SPA).

---

## 1. Problem architektoniczny w klasycznym SPA

W typowej aplikacji SPA (React / Vite) domyślny proces budowania łączy cały kod JavaScript w jeden lub kilka publicznie dostępnych plików bundle'a. 

**Zagrożenie:**
Nawet jeśli backend API poprawnie odrzuca zapytania nieautoryzowanych użytkowników (HTTP 401/403), to nieuprawniony użytkownik może:
1. Pobrać pliki `.js` aplikacji w przeglądarce.
2. Odczytać strukturę formularzy, nazwy wewnętrznych endpointów administracyjnych i logikę walidacji w DevTools.
3. Poznać pełny zakres możliwości i uprawnień przysługujących administratorom systemu.

---

## 2. Rozwiązanie: 3-etapowa strategia ochrony

```
[ Przeglądarka Klienta ]
          │
          │ 1. Żądanie pliku /assets/admin-*.js lub /admin
          ▼
   [ Nginx Reverse Proxy ]
          │
          │ 2. auth_request: GET /api/auth/verify-admin (Bearer / Cookie)
          ▼
   [ FastAPI Backend ]
     ├── Token poprawny & rola = admin  ──► 200 OK  ──► Nginx wydaje pliki panelu
     └── Brak uprawnień lub brak sesji ──► 403 / 401 ─► Nginx blokuje (403 Forbidden)
```

---

### Sposób 1: Code Splitting w React/Vite (Wydzielenie osobnego chunka)

Kod panelu admina nie może znajdować się w głównym pliku `index.js`. Należy zastosować dynamiczny import `React.lazy()`:

```tsx
// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react';

// Dynamiczny import - plik admina zostanie skompilowany do osobnego chunka
const AdminView = lazy(() => import('./components/views/AdminView'));

// Użycie w komponencie z Suspense:
{activeTab === 'admin' && (
  <Suspense fallback={<div className="p-4">Ładowanie panelu administracyjnego...</div>}>
    <AdminView />
  </Suspense>
)}
```

**Konfiguracja Vite (`vite.config.ts`):**
Można wymusić osobną nazwę pliku dla modułu administracyjnego:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('AdminView') || id.includes('/admin/')) {
            return 'admin-panel';
          }
        },
      },
    },
  },
});
```

---

### Sposób 2: Ochrona na poziomie Nginx (`auth_request`)

Serwer Nginx serwujący pliki statyczne frontendu weryfikuje uprawnienia w backendzie przed wysłaniem plików panelu admina.

#### A. Konfiguracja `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # 1. Dostęp do publicznych zasobów obywatela
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Ochrona plików chunka panelu admina (lub ścieżki /admin)
    location ~* /(assets/admin-.*\.js|admin) {
        # Każde żądanie tego pliku wymaga autoryzacji w backendzie
        auth_request /api/auth/verify-admin;

        # Przekaż błąd 401/403 do własnego komunikatu lub przekierowania
        error_page 401 403 =403 /403.html;

        try_files $uri $uri/ /index.html;
    }

    # 3. Wewnętrzny subrequest sprawdzający uprawnienia
    location = /api/auth/verify-admin {
        internal;
        proxy_pass http://backend:8000/api/auth/verify-admin;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;

        # Przekazanie tokena z nagłówka Authorization lub ciasteczka HttpOnly
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Cookie $http_cookie;
    }

    # 4. Proxy do API backendu
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### B. Dedykowany endpoint w FastAPI:

```python
# backend/src/api/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from ..security import AuthContext, authentication_manager

@router.get("/auth/verify-admin", status_code=status.HTTP_200_OK)
def verify_admin_access(
    auth: AuthContext = Depends(authentication_manager.get_auth_context),
) -> dict[str, str]:
    """
    Szybki endpoint autoryzacyjny dla Nginx auth_request.
    Zwraca 200 OK wyłącznie dla użytkowników z rolą 'admin'.
    """
    if auth.user_role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wymagane uprawnienia administratora ZUS",
        )
    return {"status": "authorized", "user": auth.pesel}
```

---

### Sposób 3: Dwa osobne buildy aplikacji (Standard produkcyjny gov.pl / ZUS)

Podejście stosowane w systemach o najwyższych wymogach bezpieczeństwa:

1. **`frontend-citizen` (Portal Obywatela):**
   - Zawiera wyłącznie widoki kalkulatorów, wniosków i logowania mObywatel.
   - Kod panelu admina w ogóle nie występuje w repozytorium / paczce wdrożeniowej.
2. **`frontend-admin` (Panel Inspektora ZUS):**
   - Osobny projekt / build wdrożony na innej subdomenie (np. `admin.zus.gov.pl` lub w intranecie).
   - Dostęp ograniczony na poziomie infrastruktury (VPN, Whitelist IP, mTLS, logowanie certyfikatem służbowym).

---

## 3. Podsumowanie rekomendacji dla projektu

| Etap projektu | Rekomendowane rozwiązanie | Narzut pracy | Bezpieczeństwo |
|---|---|---|---|
| **Hackathon / MVP** | `React.lazy()` (osobny chunk) + `DEV_AUTH_BYPASS` | Niski | Dobry (kod oddzielony od bundle'a głównego) |
| **Produkcja (Docker)** | `React.lazy()` + Nginx `auth_request` | Średni | Bardzo wysoki (serwer blokuje pobranie kodu) |
| **Enterprise / Gov** | Osobne repozytorium/build + VPN/Intranet | Wysoki | Maksymalny (pełna izolacja sieciowa) |
