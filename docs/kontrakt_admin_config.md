# Data Contract: Admin Panel (Legal & Calculation Parameters Configuration)

**Module:** `BE-03` / `SETUP-06`  
**Contract Version:** `1.1.0`  
**API Prefix:** `/api/admin`  
**Data Exchange Format:** `application/json`

---

## 1. Endpoints Overview

| Method | Path | Description | Success Status |
|---|---|---|---|
| `GET` | `/api/admin/config` | Retrieve current legal parameters and rates | `200 OK` |
| `PUT` | `/api/admin/config` | Update parameters in runtime (without server restart) | `200 OK` / `422 Unprocessable` |

---

## 2. Data Model (`AdminConfig`)

The configuration is divided into 3 logical sections:
1. **`benefit_rates`** – Benefit percentage rates (e.g., 100%, 81.5%, 70%).
2. **`leave_durations`** – Leave durations in weeks and days (compliant with Polish Labour Code and EU Work-Life Balance Directive).
3. **`periods_and_limits`** – Waiting periods, child age thresholds, minimum wage and statutory limits.

---

## 3. Endpoints Details

### 3.1. `GET /api/admin/config`
Returns current legal configuration state.

#### Request Headers:
```http
Accept: application/json
```

#### Example Response (`200 OK`):
```json
{
  "benefit_rates": {
    "pregnancy_sick_leave_rate": 100.0,
    "standard_sick_leave_rate": 80.0,
    "unified_benefit_rate": 81.5,
    "full_maternity_rate": 100.0,
    "standard_parental_rate": 70.0,
    "paternity_benefit_rate": 100.0,
    "rehabilitation_benefit_rate_first_3_months": 90.0,
    "rehabilitation_benefit_rate_remaining": 75.0,
    "rehabilitation_benefit_rate_pregnancy": 100.0
  },
  "leave_durations": {
    "maternity_weeks_single_child": 20,
    "maternity_weeks_twins": 31,
    "maternity_weeks_triplets": 33,
    "maternity_weeks_quadruplets": 35,
    "maternity_weeks_quintuplets_plus": 37,
    "mandatory_mother_maternity_weeks": 14,
    "parental_weeks_standard": 41,
    "parental_weeks_multiple_birth": 43,
    "non_transferable_parental_weeks": 9,
    "paternity_leave_days": 14,
    "max_parental_leave_parts": 5
  },
  "periods_and_limits": {
    "mandatory_waiting_period_days": 30,
    "voluntary_waiting_period_days": 90,
    "employer_sick_days_standard": 33,
    "employer_sick_days_senior": 14,
    "senior_age_threshold": 50,
    "max_pregnancy_sick_leave_days": 270,
    "max_standard_sick_leave_days": 182,
    "max_child_age_paternity_months": 12,
    "max_child_age_paternity_adoption_years": 14,
    "long_application_deadline_days": 21,
    "min_wage_2026": 4806.0,
    "social_contributions_rate": 13.71,
    "zus_debt_limit_percentage": 1.0
  }
}
```

---

### 3.2. `PUT /api/admin/config`
Allows updating any section or individual parameter. Changes are immediately applied in memory and persisted to `config.json`.

#### Request Headers:
```http
Content-Type: application/json
Accept: application/json
```

#### Example Request Body (updating unified benefit rate to 82% and paternity days to 16):
```json
{
  "benefit_rates": {
    "unified_benefit_rate": 82.0
  },
  "leave_durations": {
    "paternity_leave_days": 16
  }
}
```

#### Success Response (`200 OK`):
Returns the full updated `AdminConfig` object.

#### Validation Error (`422 Unprocessable Entity`):
```json
{
  "detail": "Configuration validation error: 1 validation error for AdminConfig..."
}
```

---

## 4. Parameter Dictionary

| Field | Type | Unit | Legal Description |
|---|---|---|---|
| `pregnancy_sick_leave_rate` | `float` | `%` | Sick leave benefit during pregnancy (Code B: 100%) |
| `standard_sick_leave_rate` | `float` | `%` | Standard sick leave benefit (80%) |
| `unified_benefit_rate` | `float` | `%` | Long application within 21 days from birth (81.5% throughout entire period) |
| `full_maternity_rate` | `float` | `%` | Standard maternity leave rate (100%) |
| `standard_parental_rate` | `float` | `%` | Standard parental leave rate (70%) |
| `paternity_benefit_rate` | `float` | `%` | Paternity leave benefit rate (100%) |
| `rehabilitation_benefit_rate_pregnancy` | `float` | `%` | Rehabilitation benefit in pregnancy (100%) |
| `maternity_weeks_single_child` | `int` | weeks | 20 weeks for 1 child |
| `mandatory_mother_maternity_weeks` | `int` | weeks | 14 weeks mandatory for mother before transfer |
| `parental_weeks_standard` | `int` | weeks | 41 weeks parental leave total (1 child) |
| `non_transferable_parental_weeks` | `int` | weeks | 9 weeks non-transferable parental leave for the other parent (EU WLB Directive) |
| `paternity_leave_days` | `int` | days | 14 calendar days of paternity leave |
| `max_parental_leave_parts` | `int` | parts | Maximum 5 parts for parental leave |
| `mandatory_waiting_period_days` | `int` | days | Mandatory insurance waiting period (30 days for Employment Contract / UoP) |
| `voluntary_waiting_period_days` | `int` | days | Voluntary insurance waiting period (90 days for Mandate / JDG) |
| `employer_sick_days_standard` | `int` | days | 33 sick leave days paid by employer |
| `employer_sick_days_senior` | `int` | days | 14 sick leave days paid by employer after age 50 |
| `max_pregnancy_sick_leave_days` | `int` | days | Max sick leave benefit period in pregnancy (270 days) |
| `max_child_age_paternity_months` | `int` | months | Paternity leave validity window (up to 12 months of child age) |
| `long_application_deadline_days` | `int` | days | Deadline to submit 81.5% long application (21 days from birth) |
| `min_wage_2026` | `float` | PLN | Statutory minimum wage gross in 2026 (4806.00 PLN) |
| `social_contributions_rate` | `float` | `%` | Social contributions deducted from gross (13.71%) |
| `zus_debt_limit_percentage` | `float` | `%` | JDG ZUS debt limit threshold (1.0% of min wage = 48.06 PLN) |

---

## 5. TypeScript Definitions (for Frontend)

Available in `docs/types/admin_config.d.ts` and `frontend/src/types/admin.d.ts`:

```typescript
export interface BenefitRates {
  pregnancy_sick_leave_rate: number;
  standard_sick_leave_rate: number;
  unified_benefit_rate: number;
  full_maternity_rate: number;
  standard_parental_rate: number;
  paternity_benefit_rate: number;
  rehabilitation_benefit_rate_first_3_months: number;
  rehabilitation_benefit_rate_remaining: number;
  rehabilitation_benefit_rate_pregnancy: number;
}

export interface LeaveDurations {
  maternity_weeks_single_child: number;
  maternity_weeks_twins: number;
  maternity_weeks_triplets: number;
  maternity_weeks_quadruplets: number;
  maternity_weeks_quintuplets_plus: number;
  mandatory_mother_maternity_weeks: number;
  parental_weeks_standard: number;
  parental_weeks_multiple_birth: number;
  non_transferable_parental_weeks: number;
  paternity_leave_days: number;
  max_parental_leave_parts: number;
}

export interface PeriodsAndLimits {
  mandatory_waiting_period_days: number;
  voluntary_waiting_period_days: number;
  employer_sick_days_standard: number;
  employer_sick_days_senior: number;
  senior_age_threshold: number;
  max_pregnancy_sick_leave_days: number;
  max_standard_sick_leave_days: number;
  max_child_age_paternity_months: number;
  max_child_age_paternity_adoption_years: number;
  long_application_deadline_days: number;
  min_wage_2026: number;
  social_contributions_rate: number;
  zus_debt_limit_percentage: number;
}

export interface AdminConfig {
  benefit_rates: BenefitRates;
  leave_durations: LeaveDurations;
  periods_and_limits: PeriodsAndLimits;
}

export interface AdminConfigUpdate {
  benefit_rates?: Partial<BenefitRates>;
  leave_durations?: Partial<LeaveDurations>;
  periods_and_limits?: Partial<PeriodsAndLimits>;
}
```
