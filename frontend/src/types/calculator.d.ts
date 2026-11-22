/**
 * BE-21: Zintegrowany kalkulator rodzicielski z osią czasu i systemem presetów
 */

export interface AllowanceRatesResponse {
  maternity_parental_option_uniform: number;
  maternity_standard: number;
  parental_standard: number;
  pregnancy_sick_leave: number;
  father_paternity_days: number;
  non_transferable_parental_weeks: number;
}

export interface CalculatorPreset {
  key: string;
  title: string;
  description: string;
  tab: string;
  target_endpoint: string;
  default_payload: Record<string, any>;
}

export interface PresetsListResponse {
  presets: CalculatorPreset[];
}

export interface TimelinePeriod {
  id: string;
  name: string;
  person: "mother" | "father" | "caregiver";
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  weeks: number;
  days: number;
  rate_percentage: number;
  daily_benefit_net: number;
  monthly_benefit_net: number;
  total_benefit_net: number;
  work_fraction: number;
  monthly_salary_gross: number;
  total_salary_gross: number;
  combined_period_income: number;
  payer: string;
  description: string;
}

export interface TimelineMilestone {
  milestone_date: string; // "YYYY-MM-DD"
  title: string;
  importance: "CRITICAL" | "HIGH" | "INFO";
  legal_basis: string;
  action_required: string;
}

export interface MonthlyCashflow {
  year_month: string; // "YYYY-MM"
  mother_benefit: number;
  father_benefit: number;
  work_salary: number;
  total_month_income: number;
}

export interface IntegratedWorkCombination {
  enabled: boolean;
  parent_working?: "mother" | "father";
  work_fraction?: number;
  weeks_to_combine?: number;
  work_during_extended_period?: boolean;
}

export interface IntegratedParentalSharing {
  enabled: boolean;
  mode?: "SEQUENTIAL" | "SIMULTANEOUS";
  mother_weeks?: number;
  father_weeks?: number;
}

export interface IntegratedCalculatorInput {
  child_birth_date: string; // "YYYY-MM-DD"
  mother_gross_monthly_income?: number;
  mother_employment_type?: string;
  is_mother_insured?: boolean;
  father_gross_monthly_income?: number;
  father_employment_type?: string;
  is_father_insured?: boolean;
  children_count?: number;
  chosen_variant?: "UNIFIED_81_5" | "VARIABLE_100_70";
  applied_within_21_days?: boolean;
  include_paternity_leave?: boolean;
  paternity_start_offset_days?: number;
  include_pregnancy_sick_leave?: boolean;
  pregnancy_sick_leave_days?: number;
  special_case_type?: "ZA_ZYCIEM" | "PREMATURE" | "STILLBIRTH_OR_DEATH" | "ADOPTION" | null;
  has_za_zyciem_certificate?: boolean;
  premature_birth_week?: number | null;
  hospitalization_weeks?: number;
  is_adoption?: boolean;
  adoption_child_age_years?: number;
  work_combination?: IntegratedWorkCombination;
  parental_sharing?: IntegratedParentalSharing;
  insurance_duration_days?: number;
  insured_days?: number;
  sickness_insurance?: boolean;
}

export interface IntegratedCalculatorResult {
  is_eligible: boolean;
  child_birth_date: string;
  timeline_start_date: string;
  timeline_end_date: string;
  total_leave_weeks: number;
  total_leave_days: number;

  total_family_benefit_amount: number;
  total_work_salary_amount: number;
  total_family_combined_income: number;

  timeline_periods: TimelinePeriod[];
  milestones: TimelineMilestone[];
  monthly_cashflow: MonthlyCashflow[];

  comparison_unified_81_5_total: number;
  comparison_variable_100_70_total: number;
  recommended_variant: string;
  recommendation_reason: string;

  summary_notes: string[];
  required_documents: string[];
  legal_basis: string[];
  risk_alerts?: { id: string; title: string; description: string; severity?: string }[];
}

export interface RiskAnalysisRequest {
  role?: string;
  employment_type: string;
  gross_monthly_income: number;
  insured_days: number;
  has_sickness_insurance: boolean;
}

export interface RiskAnalysisResponse {
  status: string;
  risk_count: number;
  alerts: { id: string; title: string; description: string; severity?: string }[];
}
