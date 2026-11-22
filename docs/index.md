# Zasiłkowy Przewodnik Przyszłego Rodzica

Aplikacja demonstracyjna dla HackNation 2026, która pomaga użytkownikom zorientować się w podstawowych zasadach świadczeń związanych z ciążą, urlopem rodzicielskim i macierzyńskim, ojcostwem oraz sytuacjami szczególnymi.

## Co zawiera projekt

- kalkulatory świadczeń i harmonogramu dla rodzica,
- obsługę danych osobowych w środowisku demonstracyjnym,
- mockowane integracje z systemami mObywatel i ZUS,
- parser dokumentów ZUS w formacie PDF,
- panel administracyjny parametrów prawnych,
- interfejs Swagger i ReDoc dla API.

## Technologie

| Warstwa | Technologie |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic |
| Integracje demo | mObywatel mock, PUE/eZUS mock |
| Dokumenty | pypdf, generowanie i analiza formularzy ZUS |
| Uruchomienie | Docker Compose |
| Dokumentacja | MkDocs Material |

## Główne adresy

Po uruchomieniu aplikacji:

- aplikacja: [http://localhost:5173](http://localhost:5173),
- API: [http://localhost:8000](http://localhost:8000),
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs),
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc),
- health-check: [http://localhost:8000/api/health](http://localhost:8000/api/health).

## Ważna informacja

Projekt ma charakter demonstracyjny i edukacyjny. Wyniki kalkulatorów nie zastępują decyzji ZUS, interpretacji zakładu pracy ani indywidualnej porady prawnej.
