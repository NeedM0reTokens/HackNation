# Komponent: Symulacja mObywatel / ZUS (BE-26)

## 1. Rola i Odpowiedzialność
Dostarcza środowisko mockowe do testowania integracji z mObywatel oraz PUE ZUS / eZUS:
- Zwracanie profilu ubezpieczonego bez konieczności podłączania produkcyjnych certyfikatów Węzła Krajowego na etapie hackathonu,
- Weryfikacja stanu zadłużenia z tytułu składek ZUS dla przedsiębiorców (limit dopuszczalnego zadłużenia do 1% minimalnego wynagrodzenia – art. 2a ustawy zasiłkowej),
- Podgląd wystawionych elektronicznych zaświadczeń lekarskich (e-ZLA) oraz historii tytułów ubezpieczeniowych (UoP, zlecenie, JDG).

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/simulation.py` (`SimulationRouter`, `SimulationAPI`)
- **Serwis**: `backend/src/api/services/simulation.py` (`get_mock_user_profile_service`)
- **Modele**: `backend/src/api/models/simulation.py` (`UserProfileResponse`, `InsuranceTitle`, `ZusDebtStatus`)

---

## 3. Specyfikacja Endpointów
- **`GET /api/simulation/profile/{user_id}`**
  - Zwraca zamockowany profil ubezpieczonego, w tym:
    - `employment_type` (UoP, zlecenie, działalność),
    - `average_monthly_income_last_12m` (podstawa wymiaru składek),
    - `zus_debt_amount` (zadłużenie w ZUS),
    - `has_blocking_zus_debt` (flaga blokująca prawo do zasiłku w przypadku JDG z długiem powyżej limitu).

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent wykorzystuje ten komponent do symulacji "Logowania przez mObywatel / Profil Zaufany" oraz do prezentacji gotowych profili testowych dla jury:
- Profil 1: Pracownik etatowy z umową o pracę (UoP, 8000 zł, bez zadłużenia),
- Profil 2: Zleceniobiorca z krótkim stażem (weryfikacja 90 dni wyczekiwania),
- Profil 3: Przedsiębiorczyni na JDG z zaległościami składkowymi (blokada wypłaty zasiłku do czasu uregulowania długu).

### Niezmienniki i Zasada Zadłużenia (art. 2a Ustawy Zasiłkowej)
- Osobie prowadzącej pozarolniczą działalność gospodarczą, której zadłużenie z tytułu składek na ubezpieczenia społeczne w dniu powstania prawa do zasiłku przekracza **1% minimalnego wynagrodzenia** (w 2026 r. ok. 48,06 zł), zasiłek **nie przysługuje** do czasu spłaty całości zadłużenia.
- Jeśli zadłużenie zostanie spłacone w ciągu 6 miesięcy, prawo do zasiłku przysługuje od dnia powstania prawa. Po 6 miesiącach – prawo ulega przedawnieniu.

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Prowadzę firmę jednoosobową i mam 300 zł długu w ZUS za styczeń. Czy dostanę macierzyński?”
- **Akcja Agenta**: Wyjaśnij na podstawie art. 2a ustawy zasiłkowej, że dług 300 zł przekracza 1% minimalnego wynagrodzenia (48,06 zł), co blokuje wypłatę zasiłku. Poinformuj, że natychmiastowe uregulowanie zaległości w ZUS odblokuje wypłatę świadczenia wstecz.
