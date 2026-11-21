# Zasiłkowy Przewodnik Przyszłego Rodzica (HackNation 2026)

Monorepo projektu zawierające:

- **`backend/`**: FastAPI (Python 3.12+)
- **`frontend/`**: React + Vite

---

## Szybki start z Makefile (rekomendowany)

Dla wygody przygotowano plik `Makefile` ze skrótami najpopularniejszych poleceń:

```bash
make          # Wyświetla pomoc i listę wszystkich komend
make up       # Buduje i uruchamia aplikację (frontend + backend)
make up-d     # Uruchamia aplikację w tle (detached)
make logs     # Podgląd logów na żywo
make down     # Zatrzymuje działające kontenery
make restart  # Restartuje kontenery
make clean    # Zatrzymuje kontenery i usuwa wolumeny
```

Po uruchomieniu aplikacji:

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

Kod źródłowy jest podmontowany jako wolumeny, więc zmiany w plikach odświeżają się automatycznie (live reload / HMR).

---

## Uruchomienie bezpośrednio przez Docker Compose

```bash
docker compose up --build
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
