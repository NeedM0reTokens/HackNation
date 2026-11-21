# Zasiłkowy Przewodnik Przyszłego Rodzica (HackNation 2026)

Monorepo projektu zawierające:

- **`backend/`**: FastAPI (Python 3.12+)
- **`frontend/`**: React + Vite

---

## Uruchomienie bezpośrednio przez Docker Compose

Zawsze uruchamiaj komendy compose w root folderze projektu:

Uruchom aplikację:

```bash
docker compose up --build -d
```

Zatrzymaj:

```bash
docker compose down
```

Logi:

```bash
docker compose logs -f
```

---

## Uruchomienie lokalne (bez Dockera)

### 1. Backend

```bash
# Wirtualne środowisko w katalogu głównym projektu:
source .venv/bin/activate
pip install -r requirements.txt

# Start serwera:
cd backend
uvicorn src.main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
