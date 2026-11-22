# Szybki start

## Wymagania

- Docker Engine lub Docker Desktop,
- Docker Compose,
- opcjonalnie Python 3.12+ i Node.js do uruchomienia lokalnego.

## Uruchomienie przez Docker Compose

Z katalogu głównego projektu wykonaj:

```bash
docker compose up --build
```

Aplikacja będzie dostępna pod adresami:

- frontend: `http://localhost:5173`,
- backend: `http://localhost:8000`,
- Swagger: `http://localhost:8000/docs`,
- ReDoc: `http://localhost:8000/redoc`.

Po uruchomieniu w tle:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend frontend
```

Zatrzymanie:

```bash
docker compose down
```

## Backend lokalnie

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend lokalnie

```bash
cd frontend
npm install
npm run dev
```

Domyślny adres frontendowy to `http://localhost:5173`.

## Sprawdzenie działania

```bash
curl http://localhost:8000/api/health
```

Przykładowe wywołanie kalkulatora ciąży:

```bash
curl http://localhost:8000/api/calculators/pregnancy/example
```

## Dokumentacja MkDocs

Z katalogu głównego projektu:

```bash
python -m pip install -r requirements.txt
mkdocs serve --dev-addr 127.0.0.1:8001
```

Strona dokumentacji będzie dostępna pod `http://127.0.0.1:8001`.
