# Komponent: Adopcja i Rodzina Zastępcza Niezawodowa (BE-20)

## 1. Rola i Odpowiedzialność
Obsługuje specyfikę urlopu na warunkach urlopu macierzyńskiego oraz urlopu rodzicielskiego dla osób przyjmujących dziecko na wychowanie (art. 183 Kodeksu Pracy i art. 29 ust. 1 pkt 2 ustawy zasiłkowej):
- Rodzaje opiekunów: przysposobienie (`ADOPTION`) oraz rodzina zastępcza niezawodowa (`FOSTER_FAMILY_NON_PROFESSIONAL`),
- Wykluczenie rodziny zastępczej zawodowej (`FOSTER_FAMILY_PROFESSIONAL`) z prawa do urlopu pracowniczego (otrzymują wynagrodzenie ze starostwa),
- Wymiary: 20 tyg. (1 dziecko), 31 tyg. (2 dzieci), 33 tyg. (3 dzieci), 35 tyg. (4 dzieci), 37 tyg. (5+ dzieci),
- Limity wieku dziecka dla urlopu na warunkach macierzyńskiego:
  - Standardowo: do ukończenia **7. roku życia**,
  - Przy odroczeniu obowiązku szkolnego: do ukończenia **10. roku życia**,
- **Gwarantowane ustawowo minimum 9 tygodni** (art. 183 § 2 KP) nawet gdy dziecko kończy 7 (lub 10) lat w trakcie urlopu,
- Urlop rodzicielski dla rodziców adopcyjnych: aż do ukończenia przez dziecko **14. roku życia**!

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/adoption.py` (`AdoptionRouter`, `AdoptionAPI`)
- **Serwis**: `backend/src/api/services/adoption.py` (`calculate_adoption_leave`)
- **Modele**: `backend/src/api/models/adoption.py` (`AdoptionLeaveInput`, `AdoptionLeaveResult`, `CaregiverType`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculators/adoption-leave`** – Weryfikacja prawa, limitów wieku i wyliczenie kwot świadczeń dla rodziców adopcyjnych.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent kieruje tutaj pytania rodziców adopcyjnych i rodzin zastępczych: „Adoptujemy dziecko w wieku 6 lat i 11 miesięcy, ile urlopu nam przysługuje?”, „Czy rodzina zastępcza niezawodowa ma prawo do zasiłku macierzyńskiego?”.

### Twarde Reguły Prawne i Inwarianty
1. **Gwarancja 9 tygodni**:
   - Jeżeli dziecko ma np. 6 lat i 11 miesięcy (został 1 miesiąc do 7. roku życia), pracownikowi z mocy art. 183 § 2 KP przysługuje **minimum 9 tygodni** urlopu na warunkach macierzyńskiego.
2. **Limit 14 lat na rodzicielski**:
   - Urlop rodzicielski po adopcji przysługuje aż do 14. roku życia dziecka (w odróżnieniu od dzieci biologicznych, gdzie limit wynosi 6 lat).
3. **Rodzina zawodowa**:
   - Rodzina zastępcza zawodowa nie ma prawa do urlopu pracowniczego. Agent musi to jasno zakomunikować.

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Adoptowaliśmy 4-letniego chłopca. Oboje pracujemy na etacie. Jakie urlopy możemy wziąć?”
- **Akcja Agenta**: Wywołaj `POST /api/calculators/adoption-leave`. Wskaż:
  - 20 tygodni urlopu na warunkach macierzyńskiego + 41 tygodni urlopu rodzicielskiego (łącznie 61 tygodni),
  - 9 tygodni urlopu rodzicielskiego jest wyłącznym prawem drugiego rodzica adopcyjnego,
  - Wniosek złożony w ciągu 21 dni od przyjęcia dziecka i złożenia wniosku do sądu daje prawo do 81,5% zasiłku.
