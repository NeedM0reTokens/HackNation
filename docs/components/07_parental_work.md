# Komponent: Łączenie Urlopu Rodzicielskiego z Pracą (BE-19)

## 1. Rola i Odpowiedzialność
Implementuje zasady Kodeksu Pracy (art. 182¹ᵉ i 182¹ᶠ) oraz ustawy zasiłkowej (art. 31 ust. 4a-4b):
- Prawo pracownika do łączenia urlopu rodzicielskiego z pracą u macierzystego pracodawcy na maksymalnie 1/2 pełnego wymiaru czasu pracy (np. 1/4, 1/3, 1/2 etatu),
- Proporcjonalne wydłużenie urlopu rodzicielskiego wg kodeksowego algorytmu:
  - Wariant z czystym urlopem w okresie wydłużenia: $E = T \times \text{etat}$,
  - Wariant z kontynuacją pracy na część etatu (wzór domknięty): $W = T / (1 - \text{etat})$ (np. dla 32 tygodni i 1/2 etatu daje to 64 tygodnie!),
- Proporcjonalna redukcja zasiłku macierzyńskiego: $\text{zasiłek} \times (1 - \text{etat})$,
- Obliczenie łącznego zysku finansowego rodziny (część pensji z etatu + pomniejszony zasiłek z ZUS).

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/parental_work.py` (`ParentalWorkRouter`, `ParentalWorkAPI`)
- **Serwis**: `backend/src/api/services/parental_work.py` (`calculate_parental_work_combination`)
- **Modele**: `backend/src/api/models/parental_work.py` (`ParentalWorkInput`, `ParentalWorkResult`, `ParentalWorkPeriod`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/calculators/parental-work-combination`** – Pełne wyliczenie proporcjonalnego wydłużenia urlopu oraz dochodów rodzica.

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent kieruje tutaj pytania rodziców rozważających powrót do pracy: „Chcę wrócić do pracy na pół etatu po macierzyńskim. Czy urlop mi się wydłuży i ile stracę z zasiłku?”.

### Twarde Reguły Prawne i Inwarianty
1. **Limit 1/2 etatu**:
   - Wymiar czasu pracy nie może przekraczać 0.50 (np. 0.75 lub pełny etat w trakcie urlopu rodzicielskiego u tego samego pracodawcy jest niedozwolony – skutkuje `is_eligible = false`).
2. **Maksymalny kodeksowy limit wydłużenia**:
   - Dla 1 dziecka: max 82 tygodnie.
   - Dla porodu wielorakiego: max 86 tygodni.
   - Dla zaświadczenia „Za życiem”: max 130 lub 134 tygodnie.
3. **Zysk finansowy**:
   - Agent powinien uświadomić rodzicowi, że łączenie urlopu z pracą na 1/2 etatu **nie oznacza straty finansowej**. Rodzic otrzymuje 50% pensji z umowy o pracę + 50% zasiłku, a urlop trwa dwa razy dłużej, co sumarycznie podwaja korzyść finansową w okresie opieki.

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Zarabiam 8000 zł brutto. Chcę wziąć 32 tygodnie rodzicielskiego i pracować na 1/2 etatu. Ile będę zarabiać miesięcznie i ile potrwa mój urlop?”
- **Akcja Agenta**: Wywołaj `POST /api/calculators/parental-work-combination`. Wskaż:
  - Urlop ulega wydłużeniu z 32 do 64 tygodni (o kolejne 32 tygodnie),
  - Miesięcznie rodzic otrzymuje: 4000 zł brutto z etatu + 2416,20 zł netto pomniejszonego zasiłku z ZUS,
  - Łączny budżet w całym okresie wynosi ponad 95 800 zł, co oznacza zysk ponad 59 700 zł względem rezygnacji z pracy.
