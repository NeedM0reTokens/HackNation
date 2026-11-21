# Kontrakt Danych: Przypadki Szczególne (Za życiem, Wcześniak, Urodzenie Martwe / Zgon)

**Moduły:** `BE-13`, `BE-14`, `BE-15`  
**Wersja:** `1.0.0`  
**Endpoint:** `POST /api/calculators/special-cases`  
**Format danych:** `application/json`

---

## 1. Zestawienie Obsługiwanych Przypadków

| Kod zadania | Typ przypadku (`case_type`) | Opis | Kluczowe uprawnienie |
|---|---|---|---|
| **BE-13** | `ZA_ZYCIEM` | Zaświadczenie z ustawy "Za życiem" (ciężkie i nieodwracalne upośledzenie) | Wydłużenie urlopu rodzicielskiego do **65 tyg.** (1 dziecko) lub **67 tyg.** (poród mnogi) + jednorazowe **4000 zł** |
| **BE-14** | `PREMATURE_HOSPITALIZATION` | Wcześniak / hospitalizacja noworodka | Uzupełniający urlop macierzyński do **15 tyg.** (skrajny wcześniak) lub **8 tyg.** (średni wcześniak / hospitalizacja po terminie) + prawo do przerwania urlopu (art. 181 KP) |
| **BE-15** | `STILLBIRTH_OR_DEATH` | Urodzenie martwe lub zgon dziecka po porodzie | Skrócony urlop macierzyński **8 tygodni** (56 dni) lub min. **7 dni** od dnia zgonu (100% płatny, bez urlopu rodzicielskiego) + zasiłek pogrzebowy ZUS **4000 zł** |

---

## 2. Przykłady Zapytań i Odpowiedzi

### 2.1. BE-13: Zaświadczenie "Za życiem"

#### Żądanie:
```json
{
  "case_type": "ZA_ZYCIEM",
  "gross_monthly_income": 6000.0,
  "employment_type": "EMPLOYMENT_CONTRACT",
  "children_born_count": 1,
  "has_za_zyciem_certificate": true
}
```

#### Odpowiedź:
```json
{
  "case_type": "ZA_ZYCIEM",
  "is_eligible": true,
  "base_maternity_weeks": 20,
  "supplementary_maternity_weeks": 0,
  "total_maternity_weeks": 20,
  "parental_weeks": 65,
  "non_transferable_parental_weeks": 9,
  "total_leave_weeks": 85,
  "calculation_base_net": 5177.4,
  "daily_rate": 172.58,
  "total_benefit_amount": 78869.06,
  "one_time_grant_pln": 4000.0,
  "can_interrupt_maternity_for_hospitalization": true,
  "min_mandatory_mother_maternity_weeks": 14,
  "description": "Zaświadczenie 'Za życiem': rodzicielski 65 tyg., oraz jednorazowe świadczenie 4000 zł.",
  "legal_basis": [
    "Art. 182(1a) § 2 Kodeksu Pracy (wydłużony wymiar 65/67 tygodni)",
    "Ustawa z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem”",
    "Art. 10 ustawy 'Za życiem' - jednorazowe świadczenie 4000 zł"
  ],
  "required_documents": [
    "Zaświadczenie lekarskie potwierdzające ciężkie i nieodwracalne upośledzenie",
    "Wniosek o wydłużony urlop rodzicielski do pracodawcy",
    "Wniosek o jednorazowe świadczenie 4000 zł do MOPS/GOPS (do 12 m-cy)"
  ]
}
```

---

### 2.2. BE-14: Wcześniak / Hospitalizacja noworodka

#### Żądanie:
```json
{
  "case_type": "PREMATURE_HOSPITALIZATION",
  "gross_monthly_income": 6000.0,
  "employment_type": "EMPLOYMENT_CONTRACT",
  "child_birth_week": 26,
  "birth_weight_grams": 900,
  "hospitalization_weeks": 10
}
```

#### Odpowiedź:
```json
{
  "case_type": "PREMATURE_HOSPITALIZATION",
  "is_eligible": true,
  "base_maternity_weeks": 20,
  "supplementary_maternity_weeks": 10,
  "total_maternity_weeks": 30,
  "parental_weeks": 41,
  "total_leave_weeks": 71,
  "can_interrupt_maternity_for_hospitalization": true,
  "min_mandatory_mother_maternity_weeks": 8,
  "description": "Urodzenie < 28. tyg. lub waga <= 1000g: do 15 tyg. uzupełniającego urlopu. Dodano 10 tyg. uzupełniającego urlopu."
}
```

---

### 2.3. BE-15: Urodzenie martwe lub zgon dziecka

#### Żądanie:
```json
{
  "case_type": "STILLBIRTH_OR_DEATH",
  "gross_monthly_income": 6000.0,
  "is_stillbirth": true
}
```

#### Odpowiedź:
```json
{
  "case_type": "STILLBIRTH_OR_DEATH",
  "is_eligible": true,
  "base_maternity_weeks": 8,
  "supplementary_maternity_weeks": 0,
  "total_maternity_weeks": 8,
  "parental_weeks": 0,
  "total_leave_weeks": 8,
  "one_time_grant_pln": 4000.0,
  "description": "Urodzenie martwego dziecka: urlop macierzyński 8 tyg."
}
```
