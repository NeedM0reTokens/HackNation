/**
 * TypeScript Typings for Admin Panel (ZUS Legal & Calculation Parameters)
 * Module: BE-03 / SETUP-06
 */

export interface BenefitRates {
  /** % pregnancy sick leave (code B, default: 100%) */
  pregnancy_sick_leave_rate: number;
  /** % standard sick leave (default: 80%) */
  standard_sick_leave_rate: number;
  /** % long application: maternity + parental within 21 days (default: 81.5%) */
  unified_benefit_rate: number;
  /** % standard maternity leave benefit (default: 100%) */
  full_maternity_rate: number;
  /** % standard parental leave benefit (default: 70%) */
  standard_parental_rate: number;
  /** % paternity leave benefit (default: 100%) */
  paternity_benefit_rate: number;
  /** % rehabilitation benefit first 3 months (default: 90%) */
  rehabilitation_benefit_rate_first_3_months: number;
  /** % rehabilitation benefit remaining months (default: 75%) */
  rehabilitation_benefit_rate_remaining: number;
  /** % rehabilitation benefit during pregnancy (default: 100%) */
  rehabilitation_benefit_rate_pregnancy: number;
  /** % employee social security deduction from gross base (default: 13.71%) */
  social_contributions_rate: number;
}

export interface BenefitAmounts {
  /** Statutory minimum gross monthly wage in 2026 (4806.00 PLN) */
  min_wage_2026: number;
  /** Permissible ZUS debt limit as % of minimum wage (1.0%) */
  zus_debt_limit_percentage: number;
  /** Maximum ZUS debt threshold not blocking benefits in PLN (48.06 PLN) */
  zus_debt_limit: number;
  /** One-time 'Za życiem' grant in PLN (4000.00 PLN) */
  za_zyciem_one_time_grant: number;
  /** Standard funeral grant from ZUS in PLN (4000.00 PLN) */
  death_grant_zus: number;
  /** Special case funeral allowance in PLN (7000.00 PLN) */
  funeral_allowance_special: number;
  /** Maximum monthly base for voluntary sickness insurance in PLN (23550.00 PLN) */
  max_voluntary_sickness_base: number;
  /** Minimum benefit base for employment contract after 13.71% deduction in PLN (4147.10 PLN) */
  min_benefit_base_uop: number;
}

export interface LeaveDurations {
  /** Maternity leave weeks for 1 child (20) */
  maternity_weeks_single_child: number;
  /** Maternity leave weeks for twins (31) */
  maternity_weeks_twins: number;
  /** Maternity leave weeks for triplets (33) */
  maternity_weeks_triplets: number;
  /** Maternity leave weeks for quadruplets (35) */
  maternity_weeks_quadruplets: number;
  /** Maternity leave weeks for quintuplets or more (37) */
  maternity_weeks_quintuplets_plus: number;
  /** Mandatory maternity weeks for mother before transfer (14) */
  mandatory_mother_maternity_weeks: number;
  /** Parental leave weeks for single child (41) */
  parental_weeks_standard: number;
  /** Parental leave weeks for multiple birth (43) */
  parental_weeks_multiple_birth: number;
  /** Parental leave weeks for 'Za życiem' single child (65) */
  parental_weeks_za_zyciem_single: number;
  /** Parental leave weeks for 'Za życiem' multiple birth (67) */
  parental_weeks_za_zyciem_multiple: number;
  /** Non-transferable parental weeks for the second parent under EU WLB Directive (9) */
  non_transferable_parental_weeks: number;
  /** Paternity leave days (14) */
  paternity_leave_days: number;
  /** Maximum parts of parental leave (5) */
  max_parental_leave_parts: number;
  /** Maternity leave weeks in case of stillbirth (8) */
  stillbirth_maternity_weeks: number;
}

export interface PeriodsAndLimits {
  /** Mandatory insurance waiting period in days for employment contract (30) */
  mandatory_waiting_period_days: number;
  /** Voluntary insurance waiting period in days for mandate/JDG (90) */
  voluntary_waiting_period_days: number;
  /** Sick leave days paid by employer (33) */
  employer_sick_days_standard: number;
  /** Sick leave days paid by employer after age 50 (14) */
  employer_sick_days_senior: number;
  /** Senior age threshold for employer sick leave (50) */
  senior_age_threshold: number;
  /** Maximum pregnancy sick leave period in days (270) */
  max_pregnancy_sick_leave_days: number;
  /** Standard maximum sick leave period in days (182) */
  max_standard_sick_leave_days: number;
  /** Maximum child age for paternity leave in months (12) */
  max_child_age_paternity_months: number;
  /** Maximum adopted child age for paternity leave in years (14) */
  max_child_age_paternity_adoption_years: number;
  /** Deadline for 81.5% long application in days from birth (21) */
  long_application_deadline_days: number;
  /** Minimum weeks mother must take before transfer in special hospital cases (8) */
  min_mother_weeks_before_transfer_special: number;
  /** Gestational week threshold for extreme prematurity (28) */
  premature_extreme_week_threshold: number;
  /** Birth weight threshold in grams for extreme prematurity (1000) */
  premature_extreme_weight_grams: number;
  /** Maximum supplementary leave weeks for extreme prematurity (15) */
  premature_extreme_max_supplementary_weeks: number;
  /** Gestational week threshold for moderate prematurity (36) */
  premature_moderate_week_threshold: number;
  /** Maximum supplementary leave weeks for standard prematurity (8) */
  premature_standard_max_supplementary_weeks: number;
  /** Standard upper age limit for adopted child eligibility (7) */
  adoption_child_standard_age_limit: number;
  /** Upper age limit for adopted child with deferred schooling (10) */
  adoption_child_deferred_school_age_limit: number;
  /** Minimum guaranteed maternity weeks for older adopted child (9) */
  adoption_min_guaranteed_maternity_weeks: number;
  /** Statutory minimum gross monthly wage in 2026 (4806.00 PLN) */
  min_wage_2026: number;
  /** Social contributions deduction percentage (13.71%) */
  social_contributions_rate: number;
  /** ZUS debt limit percentage of minimum wage (1.0%) */
  zus_debt_limit_percentage: number;
}

/** Full configuration object returned by GET /api/admin/config */
export interface AdminConfig {
  benefit_rates: BenefitRates;
  benefit_amounts: BenefitAmounts;
  leave_durations: LeaveDurations;
  periods_and_limits: PeriodsAndLimits;
}

/** Partial update payload for PUT /api/admin/config */
export interface AdminConfigUpdate {
  benefit_rates?: Partial<BenefitRates>;
  benefit_amounts?: Partial<BenefitAmounts>;
  leave_durations?: Partial<LeaveDurations>;
  periods_and_limits?: Partial<PeriodsAndLimits>;
}
