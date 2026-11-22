# Moduły backendowe

Backend FastAPI znajduje się w `backend/src/` i dzieli odpowiedzialność na routery, modele oraz serwisy.

## Główne moduły

| Moduł | Odpowiedzialność |
| --- | --- |
| `api/api.py` | Tworzenie aplikacji i rejestracja routerów |
| `api/models/` | Modele wejścia i odpowiedzi Pydantic |
| `api/services/` | Obliczenia i logika biznesowa |
| `api/routers/` | Definicje endpointów HTTP |
| `api/data/` | Dane demonstracyjne i profile testowe |
| `api/calculators/` | Wspólne eksporty i helpery kalkulatorów |
| `main.py` | Punkt wejścia aplikacji dla uvicorn |

## Routery

### Diagnostyka i administracja

- `HealthRouter` — status aplikacji,
- `AdminRouter` — parametry i konfiguracja prawna,
- `CasesRouter` — przypadki testowe i ich ocena.

### Kalkulatory

- ciąża i zwolnienie lekarskie kod B,
- urlop macierzyński i rodzicielski,
- urlop ojcowski i podział opieki,
- łączenie urlopu z pracą,
- adopcja i rodzina zastępcza,
- przypadki szczególne.

### Integracje i dokumenty

- `PdfRouter` — ekstrakcja danych z PDF,
- `MockRouter` — profily mObywatel i ZUS,
- `ZusRouter` — dane ubezpieczeniowe po PESEL-u,
- `SimulationRouter` — symulacje profili i rejestrów,
- `ApplicationsRouter` i `AssistantRouter` — obsługa formularzy i asystenta.

## Warstwa modeli

Modele Pydantic pełnią jednocześnie dwa zadania:

- dokumentują schemat OpenAPI,
- walidują dane wejściowe przed wykonaniem obliczeń.

## Warstwa serwisów

Routery wywołują serwisy, które:

- przetwarzają dane wejściowe,
- korzystają z parametrów prawnych,
- wykonują obliczenia,
- tworzą listę dokumentów i informacji prawnych,
- zwracają modele odpowiedzi.

## Dokumentacja szczegółowa

Dalszy opis komponentów znajduje się w:

- [Health](../components/01_health.md)
- [Panel administracyjny](../components/02_admin.md)
- [Kalkulator zintegrowany](../components/03_calculator_integrated.md)
- [Ciąża](../components/04_pregnancy.md)
- [Macierzyński i rodzicielski](../components/05_maternity.md)
- [Ojcostwo i podział opieki](../components/06_paternity.md)
- [Praca i urlop rodzicielski](../components/07_parental_work.md)
- [Adopcja](../components/08_adoption.md)
- [Przypadki szczególne](../components/09_special_cases.md)
- [Parser PDF](../components/10_pdf_parser.md)
- [Symulacje ZUS i mObywatel](../components/11_simulation.md)
