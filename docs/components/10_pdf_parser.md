# Komponent: Moduł Parsowania i Ekstrakcji Dokumentów PDF ZUS (BE-22 do BE-25)

## 1. Rola i Odpowiedzialność
Odpowiada za automatyczne wyciąganie tekstu i danych strukturalnych z oficjalnych formularzy i zaświadczeń ZUS:
- Druk **Z-3** (Zaświadczenie płatnika składek dla pracowników na etacie),
- Druk **Z-3a** (Zaświadczenie płatnika składek dla osób wykonujących umowę zlecenie),
- Druk **Z-3b** / oświadczenie ubezpieczonego (dla osób prowadzących działalność gospodarczą),
- Wniosek **ZAM** (Wniosek o zasiłek macierzyński),
- Zaświadczenie lekarskie **e-ZLA** (zwolnienie lekarskie z kodem B),
- Zaświadczenie **ZAS-53** (oświadczenie o stanie ubezpieczenia i okresie wyczekiwania),
- Walidacja sum kontrolnych numerów PESEL i NIP,
- Automatyczne mapowanie wyciągniętych danych do formatu wejściowego kalkulatorów.

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/pdf.py` (`PdfRouter`, `PdfAPI`)
- **Serwis**: `backend/src/api/services/pdf.py` (`parse_pdf_service`)
- **Modele**: `backend/src/api/models/pdf.py` (`PdfParseResponse`, `PdfFormType`, `ExtractedZusData`, `DocumentValidationIssue`)

---

## 3. Specyfikacja Endpointów
- **`POST /api/pdf/parse`**
  - Obsługuje upload pliku binarnego (`multipart/form-data`, parametr `file`).
  - Zwraca wyekstrahowany typ formularza, dane ubezpieczonego, kwoty podstawy wymiaru składek z ostatnich 12 miesięcy, datę porodu/zdarzenia oraz gotowy obiekt do zasilenia kalkulatora (`calculator_payload`).

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent wykorzystuje ten komponent, gdy użytkownik wgrywa plik PDF: „Wgrałem druk Z-3 od mojego pracodawcy, ile dostanę zasiłku?”.
Agent wywołuje `POST /api/pdf/parse`, odczytuje strukturalny wynik, waliduje czy dokument nie zawiera błędów (np. błędny PESEL, brak pieczęci płatnika) i natychmiast przekazuje sparsowany payload do odpowiedniego kalkulatora (`POST /api/calculator/parental` lub `POST /api/calculators/maternity-parental`).

### Niezmienniki i Zabezpieczenia
1. **Bezpieczeństwo danych**:
   - Zgodnie z wytycznymi konkursowymi HackNation 2026, surowe pliki PDF z danymi wrażliwymi **nie mogą być zapisywane na stałe w publicznym repozytorium**. Pliki są przetwarzane w pamięci RAM / strumieniowo.
2. **Weryfikacja sumy kontrolnej**:
   - PESEL i NIP są weryfikowane algorytmem wag wagowych modulo 10 / modulo 11. Błędny numer generuje ostrzeżenie `DocumentValidationIssue`.
3. **Automatyczne wykrywanie typu dokumentu**:
   - Parser po nagłówkach i unikalnych sekcjach rozpoznaje czy to Z-3, Z-3a czy ZAM, i odpowiednio interpretuje pola kwotowe (brutto vs podstawa po potrąceniu 13,71%).

### Przykładowy Przypadek dla Agenta
- **Użytkownik**: „Oto mój formularz ZAM w PDF. Sprawdź czy wszystko się zgadza.”
- **Akcja Agenta**: Prześlij plik do `POST /api/pdf/parse`. Potwierdź poprawność numeru PESEL, odczytaj wnioskowany wariant (np. jednolity 81,5%), datę porodu oraz wyliczoną podstawę zasiłku i zaprezentuj podsumowanie.
