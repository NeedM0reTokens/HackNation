# Zasiłkowy Przewodnik Przyszłego Rodzica (HackNation 2026)

> **Kompleksowa platforma cyfrowa wspierająca przyszłych i obecnych rodziców w przejściu przez labirynt formalności, kalkulacji zasiłkowych oraz wniosków urzędowych ZUS, Pracodawcy i Urzędu Stanu Cywilnego (USC) – w oparciu o stan prawny na rok 2026.**

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-146%20passed-success.svg)]()

---

## Szybki Start (One-Click Setup)

Najwygodniejszy sposób uruchomienia całego środowiska za pomocą `make`:

```bash
# 1. Uruchomienie aplikacji w Dockerze (Frontend + Backend):
make up

# 2. Zatrzymanie aplikacji:
make down

# 3. Uruchomienie serwera dokumentacji technicznej MkDocs (Material):
make docs

# 4. Uruchomienie automatycznych testów jednostkowych (146 testów):
make test

# 5. Podgląd logów kontenerów na żywo:
make logs
```

### Dostępne adresy w przeglądarce:
* **Aplikacja Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:8000](http://localhost:8000)
* **Interaktywna dokumentacja Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Dokumentacja ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Portal Dokumentacji MkDocs (Material)**: [http://127.0.0.1:8000](http://127.0.0.1:8000) *(po `make docs`)*

---

## Uruchomienie alternatywne

### Bezpośrednio przez Docker Compose:
```bash
docker compose up --build -d   # Start
docker compose down            # Stop
docker compose logs -f         # Logi
```

### Lokalnie bez Dockera (Dev mode):

#### 1. Backend:
```bash
# Utworzenie i aktywacja środowiska wirtualnego:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start serwera API:
cd backend
uvicorn src.main:app --reload --port 8000
```

#### 2. Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Moduły AI / LLM w architekturze rozwiązania

> [!IMPORTANT]
> **Sztuczna Inteligencja (LLM) w naszym projekcie to nie narzędzie pomocnicze przy pisaniu kodu, lecz integralny, produkcyjny komponent aplikacji**, wdrożony w architekturze hybrydowej (*Multimodal Vision + Domain-Guarded Legal Reasoning + Deterministic Fallback*).

### 1. Multimodal Document AI (Ekstrakcja Danych ze Skanów i PDF)
* **Gdzie działa:** Moduł *Strefa PDF* ([backend/src/api/services/ocr.py](backend/src/api/services/ocr.py) oraz `pdf.py`).
* **Model:** Google Gemini 2.5 Flash / 1.5 Flash (*Multimodal Document Understanding*).
* **Zadanie biznesowe:** Obywatel nie musi ręcznie przepisywać skomplikowanych danych płatnika, zarobków ani numerów zaświadczeń.
* **Działanie:** 
  - Użytkownik upuszcza plik PDF lub skan (druk ZUS Z-3 / Z-3a, zaświadczenie lekarskie e-ZLA z kodem chorobowym „B”, zaświadczenie szpitalne o hospitalizacji noworodka).
  - Model analizuje układ wizualny i treść dokumentu, ekstrahując ustrukturyzowane encje (NIP, kwoty brutto/netto z 12 miesięcy, daty, wymiar etatu, kody medyczne).
  - Wynik jest walidowany schematem Pydantic JSON i automatycznie zasila formularze kalkulatora oraz kreatora wniosków.
  - Posiada wbudowany awaryjny parser heurystyczny (PyPDF) w razie braku połączenia internetowego.

### 2. Kontekstowy Doradca Prawny „Plain Polish” z Guardrails
* **Gdzie działa:** Moduł *Wirtualny Doradca ZUS* ([backend/src/api/services/assistant.py](backend/src/api/services/assistant.py)).
* **Model:** Google Gemini 3.8 Flash (z automatycznym fallbackiem do 3.5 / 3.1 Flash-Lite).
* **Zadanie biznesowe:** Tłumaczenie skomplikowanego żargonu ustawowego na prosty, zrozumiały język urzędowy (*Standard Prostego Języka*), rozwiewając wątpliwości rodziców w nietypowych sytuacjach życiowych.
* **Architektura bezpieczeństwa i precyzji prawnej:**
  - **Twarde Guardrails dziedzinowe:** Ścisła instrukcja systemowa kategorycznie blokuje odpowiedzi na tematy pozadziedzinowe (ochrona przed prompt injection i dryfem tematycznym).
  - **Ustrukturyzowany format prawny:** Odpowiedź zawsze zwraca: podsumowanie, kluczowe punkty, praktyczne wytyczne oraz **obowiązkową podstawę prawną** (konkretny artykuł Kodeksu Pracy lub ustawy zasiłkowej).
  - **Deterministic Statutory Fallback (Zero-Downtime):** Gdy klucz API nie jest skonfigurowany lub sieć zawiedzie, zapytanie jest bezstratnie przejmowane przez wbudowany, deterministyczny silnik wiedzy statuarycznej (`STATUTORY_GLOSSARY`), gwarantując 100% niezawodności.

---

## Główne Funkcjonalności Platformy

### 1. Zintegrowany Kalkulator Rodzicielski & Harmonogram Cashflow (16 miesięcy)
* **Porównanie wariantów zasiłku:** 
  - Wariant uśredniony **81,5%** (tzw. „długi wniosek” składany w terminie do 21 dni od porodu) vs wariant standardowy **100% / 70%**.
* **Prawa obojga rodziców:**
  - 14 tygodni macierzyńskiego zarezerwowane wyłącznie dla matki.
  - **9 tygodni urlopu rodzicielskiego na wyłączność dla ojca** (zgodnie z dyrektywą *Work-Life Balance*).
  - Urlop ojcowski (14 dni, 100% zasiłku do 12. miesiąca życia dziecka).
* **Dynamiczny Cashflow:** Miesięczna prognoza wpływów na konto netto dzień po dniu z uwzględnieniem potrąceń składkowych.

### 2. Wykrywanie Ryzyk i Czerwonych Flag ZUS
* Automatyczny audyt sytuacji ubezpieczeniowej obywatela:
  - Weryfikacja okresu wyczekiwania (30 dni UoP, 90 dni zlecenie/działalność).
  - Ryzyko zarzutu pozorności zatrudnienia lub sztucznego zawyżenia podstawy składek krótko przed ciążą.
  - Weryfikacja zadłużenia przedsiębiorcy w ZUS (blokada świadczeń powyżej limitu ustawowego z art. 2a ustawy zasiłkowej).
  - Ochrona przed zwolnieniem z pracy i limity zasiłku chorobowego w ciąży (kod B – 270 dni, 100%).

### 3. Przypadki Szczególne (Trudne Sytuacje Życiowe)
* **Wcześniaki i hospitalizacja noworodka:** Uzupełniający urlop macierzyński (do 15 tygodni, 100% podstawy – art. 180¹ KP).
* **Program „Za życiem”:** Wydłużony urlop rodzicielski o 24 tygodnie (do 65/67 tyg.) oraz jednorazowe świadczenie 4 000 zł.
* **Łączenie rodzicielskiego z pracą:** Praca na maks. 1/2 etatu z proporcjonalnym wydłużeniem okresu urlopu (do 64/82 tyg.) i symulacją dochodu łączonego.
* **Adopcja i rodzina zastępcza:** Urlop na warunkach macierzyńskiego z gwarantowanym minimum 9 tygodni.

### 4. Interaktywny Kreator Wniosków i Generator Urzędowych PDF z UPO
* **Obsługiwane ścieżki i druki:**
  - **Do Pracodawcy:** wnioski o urlop macierzyński, rodzicielski (81,5%), ojcowski (14 dni) oraz uzupełniający.
  - **Do ZUS:** oficjalne druki **ZUS ZAM**, **ZUS ZAS-53** oraz zaświadczenia płatnika **Z-3 / Z-3a**.
  - **Do Urzędu Stanu Cywilnego (USC / gov.pl):** wniosek o odpis aktu urodzenia dziecka ze zwolnieniem z opłaty skarbowej (0 zł na cele zasiłkowe).
* **Format urzędowy PDF:** 
  - Restrykcyjny układ **1 strona A4 (`Strona 1 z 1`)**,
  - Wersja czarno-biała, bez zbędnych ramek i teł, gotowa do druku lub podpisu cyfrowego,
  - 100% poprawnych polskich znaków diakrytycznych.
* **Symulacja wysyłki elektronicznej:** Generowanie oficjalnego **Urzędowego Poświadczenia Odbioru (UPO)** z numerem sprawy, kodem referencyjnym i kwalifikowanym znacznikiem czasu.

### 5. Symulator Tożsamości mObywatel & e-ZLA
* Wbudowane realistyczne profile testowe obywateli (kobieta w ciąży na etacie, ojciec na UoP, przedsiębiorca z zadłużeniem, zleceniobiorca, matka wcześniaka, osoba nieubezpieczona).
* Możliwość testowania dowolnego własnego numeru PESEL z dynamicznym wyliczaniem daty urodzenia i płci.

---

## Pełna Dokumentacja MkDocs (Material)

Projekt zawiera obszerną dokumentację techniczną, diagramy architektury oraz schematy prawne zbudowane w **MkDocs Material**.

Aby ją uruchomić:
```bash
make docs
# lub bezpośrednio:
mkdocs serve
```
Dokumentacja zawiera m.in.:
* `architecture.md` – Architektura systemu, przepływ danych, diagramy C4 / Mermaid.
* `formulas.md` – Matematyczne wzory wyliczeń podstawy wymiaru, stawek i proporcji.
* `backend/` – Specyfikacja 11 domenowych modułów backendowych i reguł decyzyjnych.
* `testing.md` – Zestawienie 146 testów jednostkowych i scenariuszy brzegowych.

---

## Stack Technologiczny

| Warstwa | Technologie |
| :--- | :--- |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, PyCairo / Pure-Python PDF Engine, Uvicorn |
| **Frontend** | React 18, TypeScript, Vite, ZUS Design System, Lucide Icons, WCAG 2.1 |
| **Sztuczna Inteligencja** | Google Gemini API (2.5 Flash Vision OCR, 3.8 Flash Plain Polish Advisor) |
| **Dokumentacja** | MkDocs Material, Swagger UI (OpenAPI 3.1), ReDoc |
| **DevOps & QA** | Docker, Docker Compose, Makefile, Ruff, Basedpyright, Unittest (146 testów) |

---

## Zespół (HackNation 2026)

Projekt przygotowany w ramach wyzwania hackathonowego **HackNation 2026**.
Wszystkie algorytmy finansowe oraz wytyczne formalne zostały zweryfikowane pod kątem zgodności z przepisami Kodeksu Pracy oraz ustawy zasiłkowej na rok 2026.
