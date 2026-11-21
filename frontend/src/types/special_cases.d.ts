import { MaternityEmploymentType, PeriodBreakdown } from './maternity';

export type SpecialCaseType = 'ZA_ZYCIEM' | 'PREMATURE_HOSPITALIZATION' | 'STILLBIRTH_OR_DEATH';

export interface SpecialCasesInput {
  case_type: SpecialCaseType;
  gross_monthly_income: number;
  employment_type?: MaternityEmploymentType;
  children_born_count?: number;
  is_insured_at_birth?: boolean;

  // BE-13: Za życiem
  has_za_zyciem_certificate?: boolean;

  // BE-14: Premature / Hospitalization
  child_birth_week?: number;
  birth_weight_grams?: number;
  hospitalization_weeks?: number;

  // BE-15: Stillbirth / Death
  is_stillbirth?: boolean;
  child_death_after_birth?: boolean;
  child_age_days_at_death?: number;
  surviving_children_count?: number;
}

export interface SpecialCasesResult {
  case_type: SpecialCaseType;
  is_eligible: boolean;

  base_maternity_weeks: number;
  supplementary_maternity_weeks: number;
  total_maternity_weeks: number;
  parental_weeks: number;
  non_transferable_parental_weeks: number;
  total_leave_weeks: number;

  calculation_base_net: number;
  daily_rate: number;
  total_benefit_amount: number;
  one_time_grant_pln: number;

  can_interrupt_maternity_for_hospitalization: boolean;
  min_mandatory_mother_maternity_weeks: number;

  periods: PeriodBreakdown[];
  description: string;
  legal_basis: string[];
  required_documents: string[];
  important_notes: string[];
}
