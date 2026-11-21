# Kontrakt Danych: Zintegrowany Kalkulator Rodzicielski z Osią Czasu (BE-21) oraz System Presetów dla Zakładek

Niniejszy kontrakt dokumentuje endpointy wspólne pozwalające na:
1. **Pobranie predefiniowanych konfiguracji (presetów)** dla poszczególnych zakładek aplikacji (np. Macierzyński, Ojcowski, Ciąża, Praca 1/2 etatu, Adopcja, Wcześniak, Za życiem).
2. **Uruchomienie pełnego zintegrowanego kalkulatora rodzicielskiego** z generowaniem kalendarzowej osi czasu (`start_date`, `end_date`), kamieni milowych i miesięcznych przepływów pieniężnych.

---

## 1. Presety dla zakładek frontendowych

### Endpoints
- `GET /api/calculators/presets` – pobiera listę wszystkich dostępnych presetów pod zakładki.
- `GET /api/calculators/presets/{preset_key}` – pobiera konkretny preset na podstawie klucza.

### Dostępne klucze presetów (`preset_key`)
| Klucz presetu | Zakładka frontendowa (`tab`) | Docelowy endpoint | Opis |
|---|---|---|---|
| `maternity_standard` | `macierzynski` | `/api/calculators/maternity-parental` | Standardowy macierzyński + rodzicielski (81,5% vs 100/70) |
| `paternity` | `ojcowski` | `/api/calculators/paternity-leave` | Urlop ojcowski (14 dni, 100%, 1 lub 2 części) |
| `pregnancy` | `ciaza` | `/api/calculators/pregnancy` | Zwolnienie lekarskie w ciąży (kod B, 100%, 270 dni) |
| `parental_work` | `praca` | `/api/calculators/parental-work-combination` | Łączenie rodzicielskiego z pracą na 1/2 etatu |
| `adoption` | `adopcja` | `/api/calculators/adoption-leave` | Adopcja i rodzina zastępcza (limity 7/10/14 lat, min. 9 tyg.) |
| `special_cases_za_zyciem` | `przypadki_szczegolne` | `/api/calculators/special-cases` | Ustawa "Za życiem" (65 tyg. rodzicielskiego + 4000 zł) |
| `special_cases_premature` | `przypadki_szczegolne` | `/api/calculators/special-cases` | Wcześniak / hospitalizacja (uzupełniający macierzyński) |
| `special_cases_stillbirth` | `przypadki_szczegolne` | `/api/calculators/special-cases` | Urodzenie martwe lub zgon dziecka (8 tyg. macierzyńskiego) |
| `parental_sharing` | `podzial_opieki` | `/api/calculators/parental-sharing` | Podział opieki między rodziców (matka 32 tyg., ojciec 9 tyg.) |
| `integrated_full` | `zintegrowany` | `/api/calculator/parental` | Pełny zintegrowany kalkulator z osią czasu |

### Przykładowa odpowiedź `GET /api/calculators/presets/maternity_standard`
```json
{
  "key": "maternity_standard",
  "title": "Urlop macierzyński i rodzicielski (Standard)",
  "description": "Jedno dziecko, umowa o pracę, porównanie wariantu 81,5% z wariantem 100%/70%.",
  "tab": "macierzynski",
  "target_endpoint": "/api/calculators/maternity-parental",
  "default_payload": {
    "employment_type": "EMPLOYMENT_CONTRACT",
    "gross_monthly_income": 8000.0,
    "children_born_count": 1,
    "is_insured_at_birth": true,
    "has_za_zyciem_certificate": false,
    "applied_within_21_days": true,
    "chosen_variant": "UNIFIED_81_5",
    "mother_maternity_weeks": 20,
    "father_parental_weeks": 9,
    "mother_parental_weeks": 32,
    "parental_leave_parts_count": 1,
    "child_age_years": 0
  }
}
```

---

## 2. BE-21: Główny zintegrowany kalkulator rodzicielski z osią czasu

### Endpoints
- `POST /api/calculator/parental` (główny endpoint z zadania BE-21)
- `POST /api/calculators/integrated` (alias)

### Request Payload (`IntegratedCalculatorInput`)
```json
{
  "child_birth_date": "2026-06-01",
  "mother_gross_monthly_income": 8000.0,
  "mother_employment_type": "EMPLOYMENT_CONTRACT",
  "is_mother_insured": true,
  "father_gross_monthly_income": 9000.0,
  "father_employment_type": "EMPLOYMENT_CONTRACT",
  "is_father_insured": true,
  "children_count": 1,
  "chosen_variant": "UNIFIED_81_5",
  "applied_within_21_days": true,
  "include_paternity_leave": true,
  "paternity_start_offset_days": 14,
  "include_pregnancy_sick_leave": true,
  "pregnancy_sick_leave_days": 30,
  "work_combination": {
    "enabled": true,
    "parent_working": "mother",
    "work_fraction": 0.5,
    "weeks_to_combine": 32,
    "work_during_extended_period": true
  },
  "parental_sharing": {
    "enabled": false
  }
}
```

### Response Payload (`IntegratedCalculatorResult`)
```json
{
  "is_eligible": true,
  "child_birth_date": "2026-06-01",
  "timeline_start_date": "2026-05-02",
  "timeline_end_date": "2027-10-18",
  "total_leave_weeks": 72,
  "total_leave_days": 505,
  "total_family_benefit_amount": 71830.48,
  "total_work_salary_amount": 59733.33,
  "total_family_combined_income": 131563.81,
  "timeline_periods": [
    {
      "id": "p0_pregnancy_sick",
      "name": "Zasilek chorobowy w ciazy (kod B)",
      "person": "mother",
      "start_date": "2026-05-02",
      "end_date": "2026-05-31",
      "weeks": 4,
      "days": 30,
      "rate_percentage": 100.0,
      "daily_benefit_net": 230.11,
      "monthly_benefit_net": 6903.3,
      "total_benefit_net": 6903.3,
      "work_fraction": 0.0,
      "monthly_salary_gross": 0.0,
      "total_salary_gross": 0.0,
      "combined_period_income": 6903.3,
      "payer": "Pracodawca / ZUS",
      "description": "Zwolnienie lekarskie z kodem B platne 100% podstawy wymiaru."
    },
    {
      "id": "p1_maternity_leave",
      "name": "Urlop macierzynski matki",
      "person": "mother",
      "start_date": "2026-06-01",
      "end_date": "2026-10-18",
      "weeks": 20,
      "days": 140,
      "rate_percentage": 81.5,
      "daily_benefit_net": 187.54,
      "monthly_benefit_net": 5626.2,
      "total_benefit_net": 26255.6,
      "work_fraction": 0.0,
      "monthly_salary_gross": 0.0,
      "total_salary_gross": 0.0,
      "combined_period_income": 26255.6,
      "payer": "ZUS",
      "description": "Urlop macierzynski (20 tyg.). Pierwsze 14 tyg. jest obowiazkowe dla matki."
    },
    {
      "id": "p2_parental_mother_work",
      "name": "Urlop rodzicielski matki laczony z praca (0.50 etatu)",
      "person": "mother",
      "start_date": "2026-10-19",
      "end_date": "2028-01-09",
      "weeks": 64,
      "days": 448,
      "rate_percentage": 40.75,
      "daily_benefit_net": 93.77,
      "monthly_benefit_net": 2813.1,
      "total_benefit_net": 42008.96,
      "work_fraction": 0.5,
      "monthly_salary_gross": 4000.0,
      "total_salary_gross": 59733.33,
      "combined_period_income": 101742.29,
      "payer": "ZUS + Pracodawca",
      "description": "Wydluzony urlop rodzicielski (64 tyg.) z tytulu pracy na 0.50 etatu."
    },
    {
      "id": "p3_parental_father",
      "name": "Nieprzenoszalna czesc urlopu rodzicielskiego ojca (9 tyg.)",
      "person": "father",
      "start_date": "2028-01-10",
      "end_date": "2028-03-12",
      "weeks": 9,
      "days": 63,
      "rate_percentage": 81.5,
      "daily_benefit_net": 210.98,
      "monthly_benefit_net": 6329.4,
      "total_benefit_net": 13291.74,
      "work_fraction": 0.0,
      "monthly_salary_gross": 0.0,
      "total_salary_gross": 0.0,
      "combined_period_income": 13291.74,
      "payer": "ZUS",
      "description": "Indywidualne prawo ojca do 9 tygodni urlopu rodzicielskiego (Dyrektywa Work-Life Balance)."
    },
    {
      "id": "p4_paternity_leave",
      "name": "Urlop ojcowski (14 dni)",
      "person": "father",
      "start_date": "2026-06-15",
      "end_date": "2026-06-28",
      "weeks": 2,
      "days": 14,
      "rate_percentage": 100.0,
      "daily_benefit_net": 258.87,
      "monthly_benefit_net": 7766.1,
      "total_benefit_net": 3624.18,
      "work_fraction": 0.0,
      "monthly_salary_gross": 0.0,
      "total_salary_gross": 0.0,
      "combined_period_income": 3624.18,
      "payer": "ZUS",
      "description": "14 dni kalendarzowych urlopu ojcowskiego platne 100% do 12. miesiaca zycia dziecka."
    }
  ],
  "milestones": [
    {
      "milestone_date": "2026-06-01",
      "title": "Narodziny dziecka / przyjecie na wychowanie",
      "importance": "HIGH",
      "legal_basis": "Art. 180 § 1 Kodeksu Pracy",
      "action_required": "Zgloszenie urodzenia w USC, powiadomienie pracodawcy."
    },
    {
      "milestone_date": "2026-06-22",
      "title": "Termin 21 dni na wniosek o zasilek 81,5%",
      "importance": "CRITICAL",
      "legal_basis": "Art. 30a Ustawy zasilkowej",
      "action_required": "Zlozenie wniosku o caly okres macierzynskiego i rodzicielskiego."
    },
    {
      "milestone_date": "2026-09-07",
      "title": "Koniec 14 tyg. obowiazkowego urlopu matki",
      "importance": "INFO",
      "legal_basis": "Art. 180 § 4 Kodeksu Pracy",
      "action_required": "Mozliwosc rezygnacji i przekazania reszty macierzynskiego ojcu."
    },
    {
      "milestone_date": "2027-06-01",
      "title": "Koniec terminu na urlop ojcowski (12 miesiecy)",
      "importance": "HIGH",
      "legal_basis": "Art. 182(3) § 1 Kodeksu Pracy",
      "action_required": "Wykorzystanie 14 dni urlopu ojcowskiego przed 1. urodzinami."
    },
    {
      "milestone_date": "2032-06-01",
      "title": "Koniec terminu na urlop rodzicielski (6 lat)",
      "importance": "INFO",
      "legal_basis": "Art. 182(1a) Kodeksu Pracy",
      "action_required": "Ostateczna data na wykorzystanie wszystkich czesci rodzicielskiego."
    }
  ],
  "monthly_cashflow": [
    {
      "year_month": "2026-05",
      "mother_benefit": 6903.3,
      "father_benefit": 0.0,
      "work_salary": 0.0,
      "total_month_income": 6903.3
    },
    {
      "year_month": "2026-06",
      "mother_benefit": 5626.2,
      "father_benefit": 3624.18,
      "work_salary": 0.0,
      "total_month_income": 9250.38
    }
  ],
  "comparison_unified_81_5_total": 73787.96,
  "comparison_variable_100_70_total": 73063.13,
  "recommended_variant": "UNIFIED_81_5",
  "recommendation_reason": "Jednolita stawka 81,5% zapewnia staly, stabilny budzet przez caly okres opieki bez spadku dochodu do 70% w czesci rodzicielskiej.",
  "summary_notes": [
    "Calkowity budzet swiadczen rodziny wynosi 71830.48 PLN.",
    "Harmonogram obejmuje 5 etapow opieki od 2026-05-02 do 2028-03-12.",
    "Zarejestrowano 5 kluczowych terminow prawnych z Kodeksu Pracy."
  ],
  "required_documents": [
    "Skrocony odpis aktu urodzenia dziecka",
    "Wniosek o udzielenie urlopu macierzynskiego i rodzicielskiego (termin 21 dni)",
    "Oswiadczenie drugiego rodzica o braku jednoczesnego korzystania z urlopu",
    "Zaswiadczenie pracodawcy Z-3 (lub Z-3a dla zleceniobiorcy) potwierdzajace podstawe"
  ],
  "legal_basis": [
    "Art. 180, 182(1a), 182(1c), 182(1e), 182(1f), 182(3), 183 Kodeksu Pracy",
    "Art. 29, 30a, 31 Ustawy o swiadczeniach pienieznych z ubezpieczenia spolecznego",
    "Dyrektywa UE 2019/1158 (Work-Life Balance) dotyczaca uprawnien rodzicielskich"
  ]
}
```
