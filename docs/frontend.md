# Frontend

## Technologie

Frontend znajduje się w katalogu `frontend/` i używa:

- React 19,
- TypeScript,
- Vite,
- Tailwind CSS,
- SWR do pobierania i buforowania danych,
- bibliotekę ikon Lucide.

## Uruchomienie

```bash
cd frontend
npm install
npm run dev
```

Adres domyślny:

```text
http://localhost:5173
```

## Build produkcyjny

```bash
cd frontend
npm run build
npm run preview
```

Build zostanie wygenerowany przez Vite i można go serwować jako statyczną aplikację SPA.

## Komunikacja z API

Adres backendu jest przekazywany przez zmienną środowiskową `VITE_API_URL` lub można go ustawić w konfiguracji aplikacji.

Przykładowy URL API:

```text
http://localhost:8000
```

## Przygotowanie stron formularzy

Frontend powinien prezentować:

- etapowe formularze zamiast jednego długiego panelu,
- pola zależne od rodzaju zatrudnienia,
- walidację niezbędnych pól,
- komunikaty o brakach i odmowie świadczenia,
- kwoty pracodawcy i ZUS osobno,
- listę wymaganych dokumentów,
- informację o charakterze demonstracyjnym wyników.

## Przykład połączenia

```typescript
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/health`);

if (!response.ok) {
  throw new Error('Backend API jest niedostępne');
}

const data = await response.json();
```

## CORS

Backend w trybie deweloperskim dopuszcza originy portów `5173` i `3000`. Przy wdrożeniu należy zastąpić symbole zastępcze i gwiazdkę dokładną listą domen produkcyjnych.
