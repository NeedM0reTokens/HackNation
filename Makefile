.DEFAULT_GOAL := help

# Detect Docker Compose command (v2 plugin or standalone v1)
DOCKER_COMPOSE ?= $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)

.PHONY: help up up-d down stop restart build logs logs-backend logs-frontend status clean

help: ## Wyświetla pomoc i listę dostępnych poleceń
	@echo "========================================================================"
	@echo "  Zasiłkowy Przewodnik Rodzica - Polecenia Docker / Make"
	@echo "========================================================================"
	@echo "Dostępne komendy:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Przykłady:"
	@echo "  make up      - Buduje i uruchamia aplikację w kontenerach"
	@echo "  make up-d    - Uruchamia aplikację w tle (wygodne do pracy)"
	@echo "  make logs    - Pokazuje logi z działających kontenerów"
	@echo "  make down    - Zatrzymuje kontenery"
	@echo "========================================================================"

up: ## Zbuduj i uruchom aplikację w kontenerach (frontend + backend)
	@echo "🚀 Uruchamianie aplikacji w Dockerze..."
	$(DOCKER_COMPOSE) up --build

up-d: ## Zbuduj i uruchom aplikację w kontenerach w tle (detached)
	@echo "🚀 Uruchamianie aplikacji w tle..."
	$(DOCKER_COMPOSE) up --build -d
	@echo "✅ Aplikacja uruchomiona!"
	@echo "   Frontend: http://localhost:5173"
	@echo "   Backend:  http://localhost:8000"
	@echo "   Swagger:  http://localhost:8000/docs"
	@echo "Wpisz 'make logs' aby podejrzeć logi lub 'make down' aby zatrzymać."

down: ## Zatrzymaj kontenery
	@echo "🛑 Zatrzymywanie kontenerów..."
	$(DOCKER_COMPOSE) down

stop: down ## Alias do 'make down'

restart: ## Zrestartuj działające kontenery
	@echo "🔄 Restartowanie aplikacji..."
	$(DOCKER_COMPOSE) restart

build: ## Zbuduj obrazy kontenerów bez ich uruchamiania
	@echo "🔨 Budowanie obrazów..."
	$(DOCKER_COMPOSE) build

logs: ## Wyświetlaj logi na żywo ze wszystkich kontenerów
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## Wyświetlaj logi z kontenera backendu
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## Wyświetlaj logi z kontenera frontendowego
	$(DOCKER_COMPOSE) logs -f frontend

status: ## Sprawdź status kontenerów
	$(DOCKER_COMPOSE) ps

clean: ## Zatrzymaj kontenery i usuń wolumeny oraz osierocone kontenery
	@echo "🧹 Czyszczenie kontenerów i wolumenów..."
	$(DOCKER_COMPOSE) down -v --remove-orphans
