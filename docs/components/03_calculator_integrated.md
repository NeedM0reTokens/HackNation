# Komponent: Zintegrowany Kalkulator Rodzicielski z Osią Czasu i Systemem Presetów (BE-21)

## 1. Rola i Odpowiedzialność
Centralny silnik orkiestracji świadczeń rodzicielskich. Spina w jeden spójny ciąg zdarzeń:
- Chorobowe w ciąży (kod B),
- Urlop macierzyński matki (z podziałem na 14 tygodni obowiązkowych),
- Uzupełniający urlop macierzyński (wcześniak / pobyt w szpitalu),
- Urlop rodzicielski z opcją łączenia z pracą na 1/2 etatu lub podziału między rodziców,
- 9 nieprzenoszalnych tygodni dla każdego rodzica,
- Urlop ojcowski (14 dni).

Generuje kompletną **oś czasu z kalendarzowymi datami dziennymi (`start_date`, `end_date`)**, **kamienie milowe (terminy kodeksowe)** oraz **miesięczny cashflow rodziny**.
Dostarcza także system presetów (`/api/calculators/presets`), pozwalający frontendowi predefiniować formularze dla każdej zakładki.

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/calculator.py` (`CalculatorRouter`, `CalculatorAPI`)
- **Serwis**: `backend/src/api/services/calculator.py` (`calculate_integrated_parental_service`, `get_presets_service`)
- **Modele**: `backend/src/api/models/calculator.py` (`IntegratedCalculatorInput`, `IntegratedCalculatorResult`, `TimelinePeriod`, `TimelineMilestone`, `MonthlyCashflow`, `CalculatorPreset`, `PresetsListResponse`)
- **Stałe bazowe**: `backend/src/constants.py`

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculator/parental`** (oraz alias **`POST /api/calculators/integrated`**)
  - Główny endpoint zintegrowanego kalkulatora rodzicielskiego z osią czasu.
- **`GET /api/calculators/presets`**
  - Pobiera listę 10 gotowych konfiguracji pod poszczególne zakładki UI.
- **`GET /api/calculators/presets/{preset_key}`**
  - Pobiera szczegółowy obiekt presetu dla danej zakładki.
- **`GET /api/calculator/config`**
  - Zwraca bazowe stawki zasiłków.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Główny punkt wejścia przy kompleksowych zapytaniach rodziców: „Urodzę w maju 2026, zarabiam 8000 zł, mąż 9000 zł, jak zaplanować urlopy i ile dostaniemy?”.
Agent powinien w pierwszej kolejności korzystać z tego endpointu, aby dostarczyć użytkownikowi pełny harmonogram (daty od-do) oraz podsumowanie finansowe.

### Zasady Interpretacji i Niezmienniki
1. **Oś czasu**:
   - Dzień 0 to zawsze `child_birth_date`.
   - Zasiłek chorobowy w ciąży (jeśli zaznaczony) cofa się w czasie przed dzień porodu.
   - Macierzyński rozpoczyna się w dniu porodu i trwa $N \times 7$ dni.
   - Rodzicielski rozpoczyna się dzień po zakończeniu macierzyńskiego.
2. **Kamienie milowe**:
   - Agent musi poinformować rodzica o nieprzekraczalnym terminie 21 dni od porodu na złożenie wniosku o stawkę ujednoliconą 81,5%.
   - Agent musi przypomnieć ojcu o terminie 12 miesięcy na wykorzystanie 14 dni urlopu ojcowskiego.
3. **Miesięczny cashflow**:
   - Dni są mapowane precyzyjnie do miesięcy kalendarzowych (`YYYY-MM`). Jeśli urlop zaczyna się w połowie miesiąca, kwota jest wyliczana proporcjonalnie do dni w danym miesiącu.

### Przykładowy Prompt Użytkownika i Reakcja Agenta
- **Użytkownik**: „Termin mam na 1 września 2026. Chcę pracować na pół etatu po macierzyńskim. Ile dostaniemy łącznie z mężem?”
- **Akcja Agenta**: Przygotuj payload dla `POST /api/calculator/parental` z włączonym `work_combination`: `work_fraction: 0.5`, `weeks_to_combine: 32`. Zwróć użytkownikowi harmonogram z wydłużeniem urlopu o 32 tygodnie (łącznie 64 tyg. rodzicielskiego) oraz łączny dochód rodziny (pensja z 1/2 etatu + 50% zasiłku).
