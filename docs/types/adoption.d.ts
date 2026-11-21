/**
 * BE-20: Urlop na warunkach macierzyńskiego i rodzicielski dla adopcji / rodziny zastępczej
 */

export type CaregiverType =
  | "ADOPTION"
  | "FOSTER_FAMILY_NON_PROFESSIONAL"
  | "FOSTER_FAMILY_PROFESSIONAL";

export type BenefitPaymentVariant = "UNIFIED_81_5" | "VARIABLE_100_70";

export interface PeriodBreakdown {
  name: string;
  weeks: number;
  days: number;
  rate_percentage: number;
  monthly_amount: number;
  total_amount: number;
  taken_by: string;
}

export interface AdoptionLeaveInput {
  gross_monthly_income: number;
  employment_type?: string;
  is_insured?: boolean;
  caregiver_type?: CaregiverType;
  children_adopted_count?: number;
  child_age_years?: number;
  child_age_months?: number;
  has_deferred_school_obligation?: boolean;
  has_za_zyciem_certificate?: boolean;
  applied_within_21_days?: boolean;
  chosen_variant?: BenefitPaymentVariant;
}

export interface AdoptionLeaveResult {
  is_eligible: boolean;
  caregiver_type: CaregiverType;

  maternity_condition_weeks: number;
  is_minimum_guaranteed_weeks_applied: boolean;
  parental_weeks_available: number;
  non_transferable_parental_weeks: number;
  total_leave_weeks: number;

  child_age_limit_maternity_years: number;
  child_age_limit_parental_years: number;

  calculation_base_net: number;
  daily_benefit_rate: number;
  maternity_benefit_amount: number;
  parental_benefit_amount: number;
  total_benefit_amount: number;

  periods_breakdown: PeriodBreakdown[];
  refusal_reasons: string[];
  legal_basis: string[];
  required_documents: string[];
  practical_tips: string[];
}
