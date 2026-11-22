# Testowanie

## Uruchomienie testów backendu

Po aktywacji środowiska zainstaluj zależności i przejdź do katalogu backendu:

```bash
cd backend
source .venv/bin/activate
python -m unittest discover -s src/tests -p "test_*.py"
```

Alternatywnie, jeśli testy są uruchamiane z katalogu głównego projektu:

```bash
PYTHONPATH=backend backend/.venv/bin/python -m unittest discover -s backend/src/tests -t backend
```

## Kontrola jakości Python

```bash
cd backend
ruff check src
ruff format --check src
basedpyright src
```

## Testy endpointów

Testy API mogą korzystać z `TestClient` FastAPI i sprawdzać:

- odpowiedź health-check,
- dane zwracane przez kalkulatory,
- walidację modeli Pydantic,
- aliasy profilów mockowanych,
- odpowiedzi 422 dla błędnych danych,
- działanie endpointów PDF i przypadków testowych.

## Frontend

```bash
cd frontend
npm install
npm run build
```

## Sprawdzenie Dockera

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:8000/api/health
```

Następnie sprawdź logi:

```bash
docker compose logs -f backend frontend
```

## Minimalna lista testów manualnych

1. Backend zwraca status `ok` z health-check.
2. Swagger jest dostępny pod `/docs`.
3. Frontend poprawnie łączy się z API.
4. Kalkulator ciąży zwraca przykład bez danych formularza.
5. Kalkulator przyjmuje i odrzuca niepoprawne dane zgodnie z Pydantic.
6. Alias `anna-kowalska` zwraca profil i numer PESEL demonstracyjny.
7. Logika mocków ZUS działa po PESEL-u i aliasie.
8. Parser PDF zwraca odpowiedź dla poprawnego pliku testowego.
