# Kontrakt Danych: Łączenie urlopu rodzicielskiego z pracą (BE-19) oraz Adopcja / Rodzina zastępcza (BE-20)

Niniejszy dokument definiuje specyfikację API dla kalkulatorów:
- **BE-19**: Łączenie urlopu rodzicielskiego z wykonywaniem pracy (art. 182¹ᵉ - 182¹ᶠ Kodeksu Pracy, art. 31 ust. 4a-4b ustawy zasiłkowej).
- **BE-20**: Urlop na warunkach urlopu macierzyńskiego i rodzicielski dla rodziców adopcyjnych oraz rodzin zastępczych niezawodowych (art. 183 Kodeksu Pracy).

---

## 1. BE-19: Łączenie urlopu rodzicielskiego z pracą

### Endpoint
`POST /api/calculators/parental-work-combination`

### Zasady prawne i biznesowe
1. **Maksymalny wymiar etatu**: 1/2 pełnego wymiaru czasu pracy (np. 0.5, 0.25, 0.33). Wyższe wartości skutkują brakiem prawa (`is_eligible = false`).
2. **Zasada proporcjonalnego wydłużenia (art. 182¹ᶠ KP)**:
   - Przy kontynuacji pracy w okresie wydłużenia stosuje się wzór: $W = T / (1 - \text{etat})$ (np. dla 32 tygodni i 1/2 etatu $32 / 0.5 = 64$ tygodnie; wydłużenie o 32 tygodnie).
   - Maksymalne kodeksowe limity: 82 tyg. (1 dziecko), 86 tyg. (poród wieloraki), 130 tyg. (Za życiem 1 dziecko), 134 tyg. (Za życiem wieloraki).
3. **Wypłata świadczeń finansowych (art. 31 ust. 4a ustawy zasiłkowej)**:
   - Zasiłek macierzyński ulega proporcjonalnemu zmniejszeniu o wymiar etatu: $\text{zasiłek pomniejszony} = \text{pełny zasiłek} \times (1 - \text{etat})$.
   - Rodzic pobiera równolegle wynagrodzenie za pracę (np. 50% pensji brutto) oraz pomniejszony zasiłek (np. 50% z 70% lub 81.5% podstawy netto).

### Request Payload (`ParentalWorkInput`)
```json
{
  "gross_monthly_income": 8000.0,
  "work_fraction": 0.5,
  "parental_weeks_to_combine": 32,
  "work_during_extended_period": true,
  "children_born_count": 1,
  "has_za_zyciem_certificate": false,
  "benefit_rate_percentage": 70.0
}
```

### Response Payload (`ParentalWorkResult`)
```json
{
  "is_eligible": true,
  "work_fraction": 0.5,
  "original_parental_weeks": 32,
  "extension_weeks": 32,
  "extension_days": 0,
  "total_parental_weeks_with_extension": 64,
  "total_parental_days_with_extension": 448,
  "maximum_legal_limit_weeks": 82,
  "calculation_base_net": 6903.2,
  "daily_benefit_without_work": 161.07,
  "reduced_daily_benefit_with_work": 80.54,
  "monthly_salary_from_work_gross": 4000.0,
  "standard_monthly_benefit_without_work": 4832.1,
  "reduced_monthly_benefit_with_work": 2416.2,
  "combined_monthly_income": 6416.2,
  "total_benefit_amount": 36081.92,
  "total_work_salary_amount": 59733.33,
  "total_combined_income": 95815.25,
  "pure_leave_total_benefit": 36079.68,
  "financial_gain_compared_to_pure_leave": 59735.57,
  "periods": [
    {
      "period_name": "Czesc bazowa laczona z praca",
      "weeks": 32,
      "days": 224,
      "work_fraction": 0.5,
      "monthly_salary_gross": 4000.0,
      "monthly_benefit_net": 2416.2,
      "total_period_salary_gross": 29866.67,
      "total_period_benefit_net": 18040.96,
      "total_period_combined_income": 47907.63
    },
    {
      "period_name": "Czesc wydluzona z kontynuacja pracy na czesc etatu",
      "weeks": 32,
      "days": 224,
      "work_fraction": 0.5,
      "monthly_salary_gross": 4000.0,
      "monthly_benefit_net": 2416.2,
      "total_period_salary_gross": 29866.67,
      "total_period_benefit_net": 18040.96,
      "total_period_combined_income": 47907.63
    }
  ],
  "refusal_reasons": [],
  "legal_basis": [
    "Art. 182(1e) Kodeksu Pracy - laczenie urlopu rodzicielskiego z praca (max 1/2 etatu)",
    "Art. 182(1f) Kodeksu Pracy - zasada proporcjonalnego wydluzenia wymiaru urlopu",
    "Art. 31 ust. 4a-4b Ustawy zasilkowej - proporcjonalne zmniejszenie zasilku"
  ],
  "practical_tips": [
    "Wniosek o laczenie urlopu z praca zloz u pracodawcy min. 21 dni przed rozpoczeciem pracy.",
    "Pracodawca ma obowiazek uwzglednic wniosek, chyba ze organizacja pracy to uniemozliwia.",
    "Laczenie pracy z urlopem pozwala wydluzyc realny okres opieki i podniesc budzet domowy."
  ]
}
```

---

## 2. BE-20: Adopcja i rodzina zastępcza niezawodowa

### Endpoint
`POST /api/calculators/adoption-leave`

### Zasady prawne i biznesowe
1. **Podmioty uprawnione (art. 183 § 1 KP)**:
   - `ADOPTION` (przyjęcie dziecka na wychowanie i wszczęcie postępowania o przysposobienie)
   - `FOSTER_FAMILY_NON_PROFESSIONAL` (rodzina zastępcza niezawodowa)
   - *Wykluczenie*: `FOSTER_FAMILY_PROFESSIONAL` (rodzina zastępcza zawodowa nie ma prawa do urlopu, otrzymuje wynagrodzenie ze starostwa).
2. **Wymiary urlopu**:
   - 20 tyg. (1 dziecko), 31 tyg. (2 dzieci), 33 tyg. (3 dzieci), 35 tyg. (4 dzieci), 37 tyg. (5+ dzieci).
   - Urlop rodzicielski po przysposobieniu: 41 tyg. (1 dziecko) / 43 tyg. (wieloraki) / 65/67 tyg. (Za życiem).
3. **Limity wieku i gwarancja minimum 9 tygodni (art. 183 § 1 i § 2 KP)**:
   - Standardowy limit wieku dziecka dla urlopu na warunkach macierzyńskiego: **7 lat**.
   - Dziecko z odroczonym obowiązkiem szkolnym: **10 lat**.
   - **Gwarantowane minimum 9 tygodni**: Jeżeli dziecko ma blisko 7 (lub 10) lat i z ogólnego wymiaru pozostało mniej niż 9 tygodni, rodzic ma gwarantowane ustawowo min. 9 tygodni urlopu.
   - Limit wieku dziecka dla urlopu rodzicielskiego: do ukończenia **14. roku życia**.

### Request Payload (`AdoptionLeaveInput`)
```json
{
  "gross_monthly_income": 8000.0,
  "employment_type": "EMPLOYMENT_CONTRACT",
  "is_insured": true,
  "caregiver_type": "ADOPTION",
  "children_adopted_count": 1,
  "child_age_years": 2,
  "child_age_months": 0,
  "has_deferred_school_obligation": false,
  "has_za_zyciem_certificate": false,
  "applied_within_21_days": true,
  "chosen_variant": "UNIFIED_81_5"
}
```

### Response Payload (`AdoptionLeaveResult`)
```json
{
  "is_eligible": true,
  "caregiver_type": "ADOPTION",
  "maternity_condition_weeks": 20,
  "is_minimum_guaranteed_weeks_applied": false,
  "parental_weeks_available": 41,
  "non_transferable_parental_weeks": 9,
  "total_leave_weeks": 61,
  "child_age_limit_maternity_years": 7,
  "child_age_limit_parental_years": 14,
  "calculation_base_net": 6903.2,
  "daily_benefit_rate": 187.53,
  "maternity_benefit_amount": 26254.2,
  "parental_benefit_amount": 53821.11,
  "total_benefit_amount": 80075.31,
  "periods_breakdown": [
    {
      "name": "Urlop na warunkach urlopu macierzynskiego",
      "weeks": 20,
      "days": 140,
      "rate_percentage": 81.5,
      "monthly_amount": 5625.9,
      "total_amount": 26254.2,
      "taken_by": "caregiver"
    },
    {
      "name": "Urlop rodzicielski po przysposobieniu",
      "weeks": 41,
      "days": 287,
      "rate_percentage": 81.5,
      "monthly_amount": 5625.9,
      "total_amount": 53821.11,
      "taken_by": "caregiver"
    }
  ],
  "refusal_reasons": [],
  "legal_basis": [
    "Art. 183 § 1 Kodeksu Pracy - wymiar urlopu na warunkach urlopu macierzynskiego",
    "Art. 183 § 2 Kodeksu Pracy - gwarantowany minimalny wymiar 9 tygodni urlopu",
    "Art. 183 § 4-5 Kodeksu Pracy - urlop rodzicielski dla opiekunow przyjmujacych dziecko (do 14 r.z.)",
    "Art. 29 ust. 1 pkt 2 Ustawy zasilkowej - prawo do zasilku macierzynskiego dla opiekunow"
  ],
  "required_documents": [
    "Zaswiadczenie sadu opiekunczego o wystapieniu z wnioskiem o wszczecie postepowania o przysposobienie LUB orzeczenie sadu o umieszczeniu w rodzinie zastepczej niezawodowej",
    "Oswiadczenie pracownika o dacie przyjecia dziecka na wychowanie",
    "Dokument potwierdzajacy wiek dziecka (skrocony odpis aktu urodzenia)",
    "Decyzja o odroczeniu obowiazku szkolnego wydana przez dyrektora szkoly (jesli dziecko ma 7-10 lat)",
    "Zaswiadczenie lekarskie 'Za zyciem' (jesli dotyczy)",
    "Wniosek o udzielenie urlopu na warunkach macierzynskiego i rodzicielskiego zlozony do pracodawcy"
  ],
  "practical_tips": [
    "Wniosek o pelny pakiet urlopow ze stawka 81.5% nalezy zlozyc w ciagu 21 dni od przyjecia dziecka i zlozenia wniosku do sadu.",
    "Nawet jesli dziecko ma blisko 7 lat (np. 6 lat i 11 miesiecy), przysluguje Ci gwarantowane ustawowo min. 9 tygodni urlopu.",
    "Urlop rodzicielski po przysposobieniu mozna wykorzystac az do ukonczenia przez dziecko 14. roku zycia."
  ]
}
```
