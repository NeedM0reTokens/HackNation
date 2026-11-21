# Komponent: Przypadki Szczególne (BE-13, BE-14, BE-15)

## 1. Rola i Odpowiedzialność
Obsługuje wrażliwe i niestandardowe sytuacje życiowe rodziców:
1. **BE-13 (Zaświadczenie „Za życiem”)**:
   - Dziecko z ciężkim i nieodwracalnym upośledzeniem lub nieuleczalną chorobą zagrażającą życiu, powstałą w prenatalnym okresie rozwoju lub w czasie porodu.
   - Wydłużenie urlopu rodzicielskiego: o **24 tygodnie** (z 41 do **65 tygodni** przy 1 dziecku, z 43 do **67 tygodni** przy ciąży mnogiej).
   - Jednorazowe świadczenie z ustawy „Za życiem”: **4000 zł**.
2. **BE-14 (Wcześniak / Hospitalizacja dziecka po porodzie)**:
   - Poród przed 28. tygodniem ciąży lub waga $\le 1000$ g: uzupełniający urlop macierzyński do **15 tygodni**.
   - Poród między 28. a 36. tygodniem lub hospitalizacja noworodka urodzonego o czasie: uzupełniający urlop macierzyński do **8 tygodni** (zależnie od czasu hospitalizacji po minimum 2 dniach pobytu).
   - Możliwość przerwania urlopu macierzyńskiego po wykorzystaniu min. 8 tygodni na czas pobytu dziecka w szpitalu.
3. **BE-15 (Urodzenie martwego dziecka lub zgon dziecka po porodzie)**:
   - Skrócony wymiar urlopu macierzyńskiego: **8 tygodni** (56 dni kalendarzowych), płatny 100%.
   - Zgon dziecka po 8. tygodniu: pracownica zachowuje prawo do urlopu przez **7 dni od daty zgonu**.
   - Zasiłek pogrzebowy z ZUS: **4000 zł**.

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/special_cases.py` (`SpecialCasesRouter`, `SpecialCasesAPI`)
- **Serwis**: `backend/src/api/services/special_cases.py` (`calculate_special_cases`)
- **Modele**: `backend/src/api/models/special_cases.py` (`SpecialCasesInput`, `SpecialCasesResult`, `SpecialCaseType`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculators/special-cases`** – Główny zunifikowany endpoint przypadków szczególnych.
- **`POST /api/calculators/special-cases/za-zyciem`** – Dedykowany endpoint dla zaświadczenia „Za życiem”.
- **`POST /api/calculators/special-cases/premature`** – Dedykowany endpoint dla wcześniaków i hospitalizacji.
- **`POST /api/calculators/special-cases/stillbirth-or-death`** – Dedykowany endpoint dla urodzenia martwego / zgonu dziecka.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent obsługuje te scenariusze ze szczególną empatią i taktem. Kieruje tutaj zapytania rodziców w trudnych sytuacjach: „Dziecko urodziło się w 26. tygodniu i leży w inkubatorze, co z moim urlopem?”, „Urodziłam martwe dziecko, czy muszę od razu wracać do pracy?”.

### Twarde Reguły Prawne i Inwarianty
1. **Urodzenie martwe**:
   - Matce przysługuje zawsze **8 tygodni urlopu macierzyńskiego** (56 dni), płatnego 100%. Nie przysługuje urlop rodzicielski.
   - Wymagany akt urodzenia z adnotacją o martwym urodzeniu.
2. **Wcześniak i hospitalizacja**:
   - Dziecko urodzone przed 28. tygodniem lub $<$ 1000 g: tydzień za tydzień hospitalizacji, max 15 tygodni.
   - Wcześniak 28-36 tc.: max 8 tygodni.
   - Dziecko urodzone po 36 tc.: wymaga min. 2 dni hospitalizacji między 5. a 28. dniem życia, max 8 tygodni.

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Syn urodził się w 26. tc., ważył 900 g i spędził w szpitalu 12 tygodni. Ile dodatkowego urlopu dostanę?”
- **Akcja Agenta**: Wywołaj `POST /api/calculators/special-cases` z `case_type: PREMATURE_HOSPITALIZATION`, `child_birth_week: 26`, `hospitalization_weeks: 12`. Wskaż:
  - Przysługuje pełne 12 tygodni uzupełniającego urlopu macierzyńskiego (max do 15 tyg.),
  - Łączny urlop macierzyński wyniesie 32 tygodnie (20 bazowych + 12 uzupełniających), a po nim pełny urlop rodzicielski.
