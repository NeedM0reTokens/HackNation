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

---

## Dokumentacja Komponentów Backendowych i Kontekst Agentowy (Agentic Context)

Wszystkie moduły i domeny biznesowe backendu posiadają dedykowaną dokumentację techniczną wraz z wytycznymi i regułami decyzyjnymi dla autonomicznych Agentów AI (**Agentic Context**):

1. **[Health & Diagnostyka API](docs/components/01_health.md)** – Weryfikacja stanu działania serwera, wersji API i gotowości CORS.
2. **[Panel Administracyjny i Konfiguracja Parametrów Prawnych (BE-01, BE-02, BE-03)](docs/components/02_admin.md)** – Dynamiczny odczyt i aktualizacja stawek prawnych oraz kwot w locie (`config.json`).
3. **[Zintegrowany Kalkulator Rodzicielski z Osią Czasu i Systemem Presetów (BE-21)](docs/components/03_calculator_integrated.md)** – Główny silnik harmonogramu dat dziennych, kamieni milowych, miesięcznego cashflow i presetów pod zakładki UI.
4. **[Kalkulator Ciąży i Zwolnień Lekarskich Kod B (BE-04 - BE-08)](docs/components/04_pregnancy.md)** – Zasiłek chorobowy 100%, okres wyczekiwania 30/90 dni, limit 270 dni, ochrona przed upadłością.
5. **[Kalkulator Macierzyński i Rodzicielski (BE-09 - BE-12)](docs/components/05_maternity.md)** – Porównanie wariantu 81,5% vs 100%/70%, 14 tyg. matki, 41/43 tyg. rodzicielskiego, 9 tyg. nieprzenoszalne.
6. **[Urlop Ojcowski, Przejęcie Urlopu i Podział Opieki (BE-16, BE-17, BE-18)](docs/components/06_paternity.md)** – 14 dni urlopu ojcowskiego (100%), warunki przekazania urlopu ojcu, symulacja budżetu obojga rodziców.
7. **[Łączenie Urlopu Rodzicielskiego z Pracą (BE-19)](docs/components/07_parental_work.md)** – Praca na max 1/2 etatu, proporcjonalne wydłużenie urlopu (do 64/82 tyg.) oraz dochód łączony.
8. **[Adopcja i Rodzina Zastępcza Niezawodowa (BE-20)](docs/components/08_adoption.md)** – Urlop na warunkach macierzyńskiego, limity wieku 7/10/14 lat, gwarantowane minimum 9 tygodni.
9. **[Przypadki Szczególne (BE-13, BE-14, BE-15)](docs/components/09_special_cases.md)** – Ustawa „Za życiem” (+24 tyg., 4000 zł), wcześniak/hospitalizacja (uzupełniający urlop do 15 tyg.), martwe urodzenie/zgon (8 tyg.).
10. **[Moduł Obsługi i Parsowania Dokumentów PDF ZUS (BE-22 - BE-25)](docs/components/10_pdf_parser.md)** – Ekstrakcja danych z druków Z-3, Z-3a, ZAM, e-ZLA, walidacja PESEL/NIP i zasilanie kalkulatora.
11. **[Symulacja mObywatel / ZUS (BE-26)](docs/components/11_simulation.md)** – Profile testowe ubezpieczonych, weryfikacja zadłużenia przedsiębiorców w ZUS (art. 2a ustawy zasiłkowej).

### Interaktywna Dokumentacja API (Swagger & ReDoc)
Po uruchomieniu backendu pełna dokumentacja OpenAPI z opisami pól, kodami błędów i przykładami dostępna jest pod adresami:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

