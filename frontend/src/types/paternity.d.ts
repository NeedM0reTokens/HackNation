import { BenefitPaymentVariant, MaternityEmploymentType, PeriodBreakdown } from './maternity';

export interface PaternityLeavePart {
  part_number: number;
  days: number;
}

export interface PaternityLeaveInput {
  gross_monthly_income: number;
  employment_type?: MaternityEmploymentType;
  is_insured?: boolean;
  child_age_months?: number;
  is_adopted?: boolean;
  adopted_child_age_years?: number;
  months_since_adoption?: number;
  parts?: PaternityLeavePart[];
}

export interface PaternityLeaveResult {
  is_eligible: boolean;
  total_days: number;
  calculation_base_net: number;
  daily_rate: number;
  total_benefit_amount: number;
  refusal_reasons: string[];
  parts_breakdown: Array<{
    part_number: number;
    days: number;
    rate_percentage: number;
    amount: number;
  }>;
  legal_basis: string[];
  required_documents: string[];
  important_notes: string[];
}

export type MaternityTransferReason =
  | 'STANDARD_AFTER_14_WEEKS'
  | 'MOTHER_HOSPITALIZATION'
  | 'MOTHER_DISABILITY'
  | 'MOTHER_DEATH'
  | 'MOTHER_ABANDONMENT'
  | 'MOTHER_UNINSURED';

export interface MaternityTransferInput {
  father_gross_monthly_income: number;
  father_employment_type?: MaternityEmploymentType;
  is_father_insured?: boolean;
  children_born_count?: number;
  transfer_reason?: MaternityTransferReason;
  mother_used_weeks?: number;
  applied_within_21_days?: boolean;
}

export interface MaternityTransferResult {
  is_eligible: boolean;
  total_maternity_weeks: number;
  mother_weeks_used: number;
  father_transferred_weeks: number;
  father_calculation_base_net: number;
  father_daily_rate: number;
  father_total_benefit_amount: number;
  benefit_rate_percentage: number;
  refusal_reasons: string[];
  legal_basis: string[];
  required_documents: string[];
  important_notes: string[];
}

export type SharingMode = 'SEQUENTIAL' | 'SIMULTANEOUS';

export interface ParentBenefitBreakdown {
  parent_name: string;
  gross_income: number;
  calculation_base_net: number;
  daily_rate: number;
  maternity_weeks: number;
  parental_weeks: number;
  total_weeks: number;
  total_benefit_amount: number;
  periods: PeriodBreakdown[];
}

export interface ParentalSharingInput {
  sharing_mode?: SharingMode;
  children_born_count?: number;
  has_za_zyciem_certificate?: boolean;
  applied_within_21_days?: boolean;
  chosen_variant?: BenefitPaymentVariant;

  mother_gross_income: number;
  mother_employment_type?: MaternityEmploymentType;
  mother_maternity_weeks?: number;
  mother_parental_weeks?: number;

  father_gross_income: number;
  father_employment_type?: MaternityEmploymentType;
  father_maternity_weeks?: number;
  father_parental_weeks?: number;
}

export interface ParentalSharingResult {
  is_valid_division: boolean;
  sharing_mode: SharingMode;
  total_pool_parental_weeks: number;
  total_pool_maternity_weeks: number;
  combined_total_weeks: number;

  mother: ParentBenefitBreakdown;
  father: ParentBenefitBreakdown;

  total_family_benefit_amount: number;
  non_transferable_respected: boolean;
  validation_messages: string[];
  financial_comparison_note: string;
  legal_basis: string[];
  recommended_strategy_note: string;
}
