# Komponent: Urlop Ojcowski, Przejęcie Urlopu i Podział Opieki (BE-16, BE-17, BE-18)

## 1. Rola i Odpowiedzialność
Odpowiada za uprawnienia ojca dziecka oraz symulację budżetu rodziny przy współdzieleniu opieki:
1. **BE-16 (Urlop ojcowski)**:
   - 14 dni kalendarzowych, płatne 100% podstawy wymiaru,
   - Możliwość podziału na max 2 części (każda min. 7 dni),
   - Limit: do ukończenia 12. miesiąca życia dziecka (lub 14 lat i 24 mies. od przysposobienia),
   - Całkowicie niezależny od urlopu matki (może trwać równolegle z macierzyńskim).
2. **BE-17 (Przejęcie urlopu macierzyńskiego przez ojca)**:
   - Standardowe: po wykorzystaniu przez matkę min. 14 tygodni,
   - Wyjątkowe: po 8 tygodniach (hospitalizacja matki, niepełnosprawność, porzucenie dziecka),
   - Natychmiastowe (od 0 tyg.): zgon matki lub podjęcie pracy przez nieubezpieczoną matkę.
   - Świadczenie ojca wyliczane jest **zawsze na bazie jego własnych zarobków**.
3. **BE-18 (Symulacja podziału opieki)**:
   - Symulacja trybu naprzemiennego (`SEQUENTIAL`) lub równoległego (`SIMULTANEOUS`),
   - Weryfikacja 9-tygodniowej puli dla każdego rodzica,
   - Wyliczenie łącznego budżetu gospodarstwa domowego.

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/paternity.py` (`PaternityRouter`, `PaternityAPI`)
- **Serwis**: `backend/src/api/services/paternity.py` (`calculate_paternity_leave`, `calculate_maternity_transfer`, `calculate_parental_sharing`)
- **Modele**: `backend/src/api/models/paternity.py` (`PaternityLeaveInput`, `PaternityLeaveResult`, `MaternityTransferInput`, `MaternityTransferResult`, `ParentalSharingInput`, `ParentalSharingResult`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculators/paternity-leave`** – Kalkulator urlopu ojcowskiego (14 dni, 100%).
- **`POST /api/calculators/maternity-transfer`** – Weryfikacja i wyliczenie przejęcia macierzyńskiego przez ojca.
- **`POST /api/calculators/parental-sharing`** – Symulator podziału tygodni i budżetu obojga rodziców.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent kieruje tutaj pytania ojców i par: „Ile dni urlopu przysługuje ojcu po porodzie?”, „Kiedy mogę przejąć urlop po żonie?”, „Żona zarabia 6000 zł, ja 10 000 zł – jak podzielić urlop, żeby rodzina dostała najwięcej?”.

### Twarde Reguły Prawne i Inwarianty
1. **Zasada 12 miesięcy**:
   - Po 1. urodzinach dziecka prawo do urlopu ojcowskiego definitywnie wygasa.
2. **Zasada części**:
   - Dopuszczalny jest 1 ciąg 14 dni LUB 2 części po min. 7 dni (np. $7+7$ dni). Część np. 5 dni lub 3 części są niedozwolone kodeksowo.
3. **Przejęcie urlopu**:
   - Jeśli matka nie wykorzystała 14 tygodni i nie zachodzi sytuacja szczególna (hospitalizacja/orzeczenie o niepełnosprawności/zgon), wniosek o przejęcie zostaje odrzucony (`can_transfer = false`).

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Dziecko ma 10 miesięcy. Czy ojciec może jeszcze wziąć urlop ojcowski i ile dostanie przy pensji 8000 zł brutto?”
- **Akcja Agenta**: Wywołaj `POST /api/calculators/paternity-leave`. Potwierdź, że ojciec ma prawo do 14 dni, ponieważ dziecko nie ukończyło 12 miesięcy. Wylicz świadczenie 100% podstawy netto (ok. 3221 zł za 14 dni) i przypomnij o konieczności złożenia wniosku min. 7 dni przed rozpoczęciem urlopu.
