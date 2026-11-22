.PHONY: help up down build logs docs test lint

help:
	@echo "Komendy projektu Zasiłkowy Przewodnik Przyszłego Rodzica:"
	@echo "  make up      - Uruchamia aplikację w Dockerze (frontend + backend)"
	@echo "  make down    - Zatrzymuje kontenery Dockera"
	@echo "  make build   - Przebudowuje kontenery Dockera od zera"
	@echo "  make logs    - Wyświetla logi kontenerów na żywo"
	@echo "  make docs    - Uruchamia lokalny serwer dokumentacji MkDocs (Material)"
	@echo "  make test    - Uruchamia 146 testów jednostkowych backendu"
	@echo "  make lint    - Sprawdza poprawność kodu (ruff + basedpyright)"

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

docs:
	mkdocs serve

test:
	cd backend && .venv/bin/python3 -m unittest discover -t . -s tests

lint:
	cd backend && .venv/bin/ruff check src && .venv/bin/basedpyright