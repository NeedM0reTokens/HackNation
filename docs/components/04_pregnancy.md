# Komponent: Kalkulator Zasiłków w Ciąży (BE-04 do BE-08)

## 1. Rola i Odpowiedzialność
Odpowiada za logikę prawną i wyliczenia finansowe świadczeń przysługujących w okresie ciąży:
- Zasiłek chorobowy z kodem „B” (100% podstawy wymiaru zamiast standardowych 80%),
- Weryfikacja okresu wyczekiwania (30 dni przy ubezpieczeniu obowiązkowym UoP vs 90 dni przy dobrowolnym na zleceniu / JDG),
- Podział kosztów: wynagrodzenie chorobowe od pracodawcy (pierwsze 33 dni lub 14 dni po 50. roku życia) vs zasiłek chorobowy z ZUS,
- Limit zasiłku chorobowego w ciąży: wydłużony do 270 dni (zamiast 182 dni),
- Logika świadczenia rehabilitacyjnego po 270 dniach,
- Ochrona ciężarnej w przypadku upadłości, likwidacji pracodawcy lub bezprawnego zwolnienia (zasiłek w wysokości macierzyńskiego).

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/pregnancy.py` (`PregnancyRouter`, `PregnancyAPI`)
- **Serwis**: `backend/src/api/services/pregnancy.py` (`calculate_pregnancy_benefit`)
- **Modele**: `backend/src/api/models/pregnancy.py` (`PregnancyBenefitInput`, `PregnancyBenefitResult`, `EmploymentType`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculators/pregnancy`** – Pełne wyliczenie prawa do zasiłku w ciąży i kwot PLN.
- **`GET /api/calculators/pregnancy/example`** – Szybki podgląd przykładowego wyliczenia.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent kieruje tutaj pytania ciężarnych kobiet przebywających na zwolnieniu lekarskim (L4 z kodem B): „Jestem w 5. miesiącu ciąży, czy na L4 dostanę 100% pensji?”, „Pracuję na zleceniu od miesiąca, czy mam prawo do płatnego zwolnienia?”.

### Twarde Reguły Prawne i Inwarianty
1. **Okres wyczekiwania**:
   - Dla `EMPLOYMENT_CONTRACT` (UoP): wymagane min. 30 dni nieprzerwanego ubezpieczenia.
   - Dla `MANDATE_CONTRACT` i `B2B` (dobrowolne chorobowe): wymagane min. 90 dni. Jeśli staż ubezpieczenia $<$ 90 dni, prawo nie przysługuje (`is_eligible = false`, komunikat o braku uprawnień).
2. **Stawka świadczenia**:
   - Zwolnienie z kodem B (ciąża) wynosi zawsze **100% podstawy wymiaru** netto (brak potrącenia 20%).
3. **Płatnik świadczenia**:
   - Pierwsze 33 dni w roku kalendarzowym (lub 14 dni dla wieku $\ge 50$ lat) płaci pracodawca jako wynagrodzenie chorobowe (art. 92 KP).
   - Od 34. dnia (lub 15. dnia) płaci ZUS jako zasiłek chorobowy.
4. **Maksymalny czas trwania**:
   - Ciężarna ma prawo do max 270 dni zwolnienia. Po 270 dniach wniosek o świadczenie rehabilitacyjne (do 12 miesięcy).

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Zarabiam 7500 zł brutto na etacie. Poszłam na L4 w ciąży na 40 dni. Kto mi zapłaci i ile?”
- **Akcja Agenta**: Wywołaj `POST /api/calculators/pregnancy`. Wskaż:
  - 33 dni finansuje pracodawca, a 7 dni ZUS,
  - Dzienna stawka 100% wynosi ok. 215,73 zł netto,
  - Brak straty finansowej względem normalnego wynagrodzenia netto.
