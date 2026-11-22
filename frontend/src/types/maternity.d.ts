export type MaternityEmploymentType =
  | 'EMPLOYMENT_CONTRACT'
  | 'MANDATE_CONTRACT'
  | 'B2B'
  | 'NONE';

export type BenefitPaymentVariant = 'UNIFIED_81_5' | 'VARIABLE_100_70';

export interface PeriodBreakdown {
  name: string;
  weeks: number;
  days: number;
  rate_percentage: number;
  monthly_amount: number;
  total_amount: number;
  taken_by: string;
}

export interface MaternityParentalInput {
  employment_type: MaternityEmploymentType;
  gross_monthly_income: number;
  children_born_count?: number;
  is_insured_at_birth?: boolean;
  has_za_zyciem_certificate?: boolean;
  applied_within_21_days?: boolean;
  chosen_variant?: BenefitPaymentVariant;
  mother_maternity_weeks?: number;
  father_parental_weeks?: number;
  mother_parental_weeks?: number;
  parental_leave_parts_count?: number;
  child_age_years?: number;
}

export interface MaternityParentalResult {
  is_eligible: boolean;
  total_maternity_weeks: number;
  total_parental_weeks: number;
  total_weeks: number;
  mother_total_weeks: number;
  father_total_weeks: number;
  calculation_base_net: number;
  daily_rate: number;
  total_benefit_amount: number;
  chosen_variant: BenefitPaymentVariant;
  comparison_unified_total: number;
  comparison_variable_total: number;
  periods: PeriodBreakdown[];
  refusal_reasons: string[];
  legal_basis: string[];
  required_documents: string[];
}
