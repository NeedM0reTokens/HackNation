# Komponent: Zintegrowany Kalkulator Macierzyńskiego i Rodzicielskiego (BE-09 do BE-12)

## 1. Rola i Odpowiedzialność
Kalkuluje podstawowe wymiary urlopu macierzyńskiego i rodzicielskiego dla matki i ojca:
- Wymiar macierzyńskiego wg liczby urodzonych dzieci: 20 tyg. (1 dziecko), 31 tyg. (bliźnięta), 33 tyg. (trojaczki), 35 tyg. (czworaczki), 37 tyg. (pięcioraczki i więcej),
- Obowiązkowe 14 tygodni dla matki (art. 180 § 4 KP),
- Wymiar rodzicielskiego: 41 tygodni (1 dziecko) lub 43 tygodnie (ciąża mnoga),
- Nieprzenoszalna część 9 tygodni dla drugiego rodzica,
- Zasada max 5 części urlopu do ukończenia przez dziecko 6. roku życia,
- Porównanie wariantów wypłaty:
  - Wariant jednolity: **81,5%** przez cały okres (wymaga wniosku w terminie do 21 dni po porodzie),
  - Wariant standardowy: **100%** za okres macierzyńskiego + **70%** za okres rodzicielskiego.

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/maternity.py` (`MaternityRouter`, `MaternityAPI`)
- **Serwis**: `backend/src/api/services/maternity.py` (`calculate_maternity_parental_benefit`)
- **Modele**: `backend/src/api/models/maternity.py` (`MaternityParentalInput`, `MaternityParentalResult`, `BenefitPaymentVariant`, `PeriodBreakdown`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculators/maternity-parental`** – Oblicza szczegółowy harmonogram tygodniowy, stawki dzienne i miesięczne oraz porównuje oba warianty wypłaty.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent kieruje tutaj pytania rodziców dotyczące dylematu: „Który wariant bardziej mi się opłaca: 81,5% czy 100% i 70%?”, „Ile tygodni urlopu macierzyńskiego przypada na bliźnięta?”, „Jak podzielić urlop na części?”.

### Twarde Reguły Prawne i Inwarianty
1. **Termin 21 dni**:
   - Jeśli matka złoży wniosek po upływie 21 dni od porodu, wariant jednolity 81,5% **nie przysługuje** – z mocy prawa stosuje się wariant 100% / 70%.
2. **Pula 9 tygodni**:
   - 9 tygodni z puli rodzicielskiego (41 lub 43 tyg.) jest prawem wyłącznym drugiego rodzica (zazwyczaj ojca). Jeśli ojciec ich nie wykorzysta, te tygodnie przepadają i matka nie może ich przejąć.
3. **Maksymalny wiek dziecka**:
   - Wszystkie części urlopu rodzicielskiego (max 5) muszą zostać wykorzystane do końca roku kalendarzowego, w którym dziecko kończy 6. rok życia.

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Zarabiam 9000 zł brutto. Będziemy mieć jedno dziecko. Lepiej wziąć 81,5% czy 100/70?”
- **Akcja Agenta**: Wywołaj `POST /api/calculators/maternity-parental`. Przedstaw tabelę porównawczą:
  - Wariant 81,5%: równy dochód przez cały rok, brak spadku budżetu w drugiej połowie roku.
  - Wariant 100%/70%: wyższe wpływy w pierwszych 20 tygodniach, ale spadek do 70% w części rodzicielskiej.
  - Wyjaśnij, że łączne sumy przy pełnym wykorzystaniu urlopu przez oboje rodziców różnią się minimalnie, więc wybór zależy od preferencji płynności finansowej.
