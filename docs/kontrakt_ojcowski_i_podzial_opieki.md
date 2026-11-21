# Kontrakt Danych: Urlop Ojcowski, Przejęcie Macierzyńskiego i Podział Opieki

**Moduły:** `BE-16`, `BE-17`, `BE-18`  
**Wersja:** `1.0.0`  
**Format danych:** `application/json`

---

## 1. Zestawienie Endpointów

| Metoda | Ścieżka | Opis | Kod sukcesu |
|---|---|---|---|
| `POST` | `/api/calculators/paternity-leave` | Urlop ojcowski (14 dni, 1-2 części, limit 12 m-cy / adopcja 14 lat) | `200 OK` |
| `POST` | `/api/calculators/maternity-transfer` | Przejęcie macierzyńskiego przez ojca (po 14 tyg. lub w sytuacjach szczególnych) | `200 OK` |
| `POST` | `/api/calculators/parental-sharing` | Symulacja podziału rodzicielskiego (równocześnie / naprzemiennie) | `200 OK` |

---

## 2. Przykłady Zapytań i Odpowiedzi

### 2.1. BE-16: Urlop ojcowski (`POST /api/calculators/paternity-leave`)

#### Żądanie (2 części po 7 dni):
```json
{
  "gross_monthly_income": 8000.0,
  "employment_type": "EMPLOYMENT_CONTRACT",
  "is_insured": true,
  "child_age_months": 4,
  "parts": [
    { "part_number": 1, "days": 7 },
    { "part_number": 2, "days": 7 }
  ]
}
```

#### Odpowiedź:
```json
{
  "is_eligible": true,
  "total_days": 14,
  "calculation_base_net": 6903.2,
  "daily_rate": 230.11,
  "total_benefit_amount": 3221.54,
  "parts_breakdown": [
    { "part_number": 1, "days": 7, "rate_percentage": 100.0, "amount": 1610.77 },
    { "part_number": 2, "days": 7, "rate_percentage": 100.0, "amount": 1610.77 }
  ],
  "legal_basis": [
    "Art. 182(3) Kodeksu Pracy (prawo do urlopu ojcowskiego w wymiarze 14 dni)",
    "Art. 29a ustawy zasiłkowej (zasiłek macierzyński za okres ojcowskiego - 100%)"
  ],
  "required_documents": [
    "Wniosek o urlop ojcowski (złożony min. 7 dni przed rozpoczęciem)",
    "Skrócony odpis aktu urodzenia dziecka lub postanowienie o przysposobieniu",
    "Oświadczenie, czy urlop był już wykorzystany w części"
  ]
}
```

---

### 2.2. BE-17: Przejęcie urlopu macierzyńskiego przez ojca (`POST /api/calculators/maternity-transfer`)

#### Żądanie:
```json
{
  "father_gross_monthly_income": 9000.0,
  "children_born_count": 1,
  "transfer_reason": "STANDARD_AFTER_14_WEEKS",
  "mother_used_weeks": 14,
  "applied_within_21_days": true
}
```

#### Odpowiedź:
```json
{
  "is_eligible": true,
  "total_maternity_weeks": 20,
  "mother_weeks_used": 14,
  "father_transferred_weeks": 6,
  "father_calculation_base_net": 7766.1,
  "father_daily_rate": 258.87,
  "father_total_benefit_amount": 8868.99,
  "benefit_rate_percentage": 81.5
}
```

---

### 2.3. BE-18: Symulacja podziału opieki (`POST /api/calculators/parental-sharing`)

#### Żądanie:
```json
{
  "sharing_mode": "SEQUENTIAL",
  "children_born_count": 1,
  "chosen_variant": "UNIFIED_81_5",
  "mother_gross_income": 6000.0,
  "mother_maternity_weeks": 20,
  "mother_parental_weeks": 32,
  "father_gross_income": 8000.0,
  "father_maternity_weeks": 0,
  "father_parental_weeks": 9
}
```

#### Odpowiedź:
```json
{
  "is_valid_division": true,
  "sharing_mode": "SEQUENTIAL",
  "total_pool_parental_weeks": 41,
  "total_pool_maternity_weeks": 20,
  "combined_total_weeks": 61,
  "mother": {
    "parent_name": "Matka",
    "gross_income": 6000.0,
    "total_weeks": 52,
    "total_benefit_amount": 51100.94
  },
  "father": {
    "parent_name": "Ojciec",
    "gross_income": 8000.0,
    "total_weeks": 9,
    "total_benefit_amount": 10147.85
  },
  "total_family_benefit_amount": 61248.79,
  "non_transferable_respected": true,
  "recommended_strategy_note": "Wyższy dochód osiąga ojciec. Wykorzystanie przez ojca pełnych 9 tygodni rodzicielskiego przyniesie rodzinie 10147.85 zł z jego wyższej podstawy wymiaru."
}
```
