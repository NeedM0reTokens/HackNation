# Dokumentacja API

## Interaktywne interfejsy

Po uruchomieniu backendu dostępne są:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs),
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc),
- OpenAPI JSON: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json).

## Health-check

```http
GET /api/health
```

Odpowiedź potwierdza działanie serwera i konfiguracji routingu.

## Grupy endpointów

| Grupa | Podstawowy prefiks |
| --- | --- |
| Health | `/api/health` |
| Kalkulator ciąży | `/api/calculators/pregnancy` |
| Kalkulator macierzyński | `/api/calculators/maternity-parental` |
| Kalkulator ogólny | `/api/calculator` |
| Przypadki | `/api/cases` |
| PDF | `/api/pdf` |
| Mock ZUS/mObywatel | `/api/mock`, `/api/zus`, `/api/simulation` |
| Autoryzacja | `/api/auth` |
| Panel administracyjny | `/api/admin` |

## Profil demonstracyjny

```http
GET /api/simulation/profile/anna-kowalska
```

Odpowiedź rozpoznaje alias i zawiera dane profilu oraz numer PESEL demonstracyjny.

## Format błędów

FastAPI automatycznie zwraca `422 Unprocessable Entity`, jeśli dane wejściowe nie spełniają ograniczeń Pydantic.

Przykładowy błąd może zawierać:

- nazwę pola,
- lokalizację parametru,
- komunikat walidacji,
- typ błędu.

## Ręczne testowanie

Swagger pozwala:

1. otworzyć endpoint,
2. przełączyć parametr na przykład,
3. uzupełnić JSON,
4. kliknąć `Execute`,
5. sprawdzić status i odpowiedź HTTP.

W terminalu można używać `curl`, `httpx` lub dowolnego klienta REST.

## Przykład z `httpx`

```python
import httpx

response = httpx.get(
    "http://localhost:8000/api/calculators/pregnancy/example",
    timeout=10,
)
response.raise_for_status()
print(response.json())
```

## CORS

Frontend może komunikować się z API z adresów lokalnych portów `5173` i `3000`. Dla produkcji należy ograniczyć listę originów do konkretnej domeny.
