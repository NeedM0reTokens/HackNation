/**
 * BE-19: Łączenie urlopu rodzicielskiego z pracą na max 1/2 etatu
 */

export interface ParentalWorkPeriod {
  period_name: string;
  weeks: number;
  days: number;
  work_fraction: number;
  monthly_salary_gross: number;
  monthly_benefit_net: number;
  total_period_salary_gross: number;
  total_period_benefit_net: number;
  total_period_combined_income: number;
}

export interface ParentalWorkInput {
  gross_monthly_income: number;
  work_fraction?: number; // default: 0.5 (max 0.5)
  parental_weeks_to_combine?: number; // default: 32
  work_during_extended_period?: boolean; // default: true
  children_born_count?: number; // default: 1
  has_za_zyciem_certificate?: boolean; // default: false
  benefit_rate_percentage?: number; // default: 70.0 or 81.5
}

export interface ParentalWorkResult {
  is_eligible: boolean;
  work_fraction: number;
  original_parental_weeks: number;
  extension_weeks: number;
  extension_days: number;
  total_parental_weeks_with_extension: number;
  total_parental_days_with_extension: number;
  maximum_legal_limit_weeks: number;

  calculation_base_net: number;
  daily_benefit_without_work: number;
  reduced_daily_benefit_with_work: number;

  monthly_salary_from_work_gross: number;
  standard_monthly_benefit_without_work: number;
  reduced_monthly_benefit_with_work: number;
  combined_monthly_income: number;

  total_benefit_amount: number;
  total_work_salary_amount: number;
  total_combined_income: number;
  pure_leave_total_benefit: number;
  financial_gain_compared_to_pure_leave: number;

  periods: ParentalWorkPeriod[];
  refusal_reasons: string[];
  legal_basis: string[];
  practical_tips: string[];
}
