export type ApplicationCategory = 'EMPLOYER_LEAVE' | 'ZUS_BENEFIT';

export type ApplicationType =
  | 'UNIFIED_MATERNITY_PARENTAL_81_5'
  | 'PATERNITY_LEAVE'
  | 'SUPPLEMENTARY_MATERNITY_LEAVE'
  | 'PARENTAL_WORK_COMBINATION'
  | 'PARENTAL_LEAVE_PORTION'
  | 'ZUS_ZAM'
  | 'ZUS_ZAS_53'
  | 'ZUS_Z3'
  | 'ZUS_Z3A';

export interface RequiredAttachment {
  code: string;
  title: string;
  description: string;
  is_mandatory: boolean;
  is_provided: boolean;
  legal_basis: string;
}

export interface ApplicationTemplateInfo {
  type: ApplicationType;
  category: ApplicationCategory;
  title: string;
  legal_basis: string;
  recipient_type: string;
  deadline_description: string;
  description: string;
  required_attachments: RequiredAttachment[];
  is_custom_designed: boolean;
  official_form_number?: string | null;
}

export interface ApplicantData {
  first_name: string;
  last_name: string;
  pesel: string;
  date_of_birth?: string | null;
  id_document_number?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address_street?: string | null;
  address_postal_code?: string | null;
  address_city?: string | null;
}

export interface EmployerData {
  company_name: string;
  nip?: string | null;
  regon?: string | null;
  address_street?: string | null;
  address_postal_code?: string | null;
  address_city?: string | null;
  representative_name?: string | null;
  payer_size?: string;
}

export interface ChildData {
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  birth_certificate_number?: string | null;
  usc_city?: string | null;
  gestational_age_weeks?: number | null;
  birth_weight_grams?: number | null;
  hospital_stay_weeks?: number | null;
  has_za_zyciem_certificate?: boolean;
}

export interface LeavePeriodData {
  start_date: string;
  end_date: string;
  weeks_count: number;
  days_count: number;
  portion_number?: number;
  work_time_fraction?: string | null;
  selected_rate_variant?: string;
  is_second_parent_exclusive_9w?: boolean;
  other_parent_name?: string | null;
  other_parent_pesel?: string | null;
  other_parent_declaration_attached?: boolean;
}

export interface ApplicationPrefillRequest {
  application_type?: ApplicationType;
  pesel_or_user_id?: string | null;
  child_birth_date?: string | null;
  selected_variant?: string;
  calculator_state?: Record<string, unknown> | null;
}

export interface ApplicationPrefillResponse {
  application_type: ApplicationType;
  template_info: ApplicationTemplateInfo;
  applicant: ApplicantData;
  employer: EmployerData;
  child: ChildData;
  leave_period: LeavePeriodData;
  required_attachments: RequiredAttachment[];
  advisory_notes: string[];
}

export interface ApplicationCreateRequest {
  application_type: ApplicationType;
  applicant: ApplicantData;
  employer?: EmployerData | null;
  child?: ChildData | null;
  leave_period: LeavePeriodData;
  bank_account_number?: string | null;
  place_of_signing?: string;
  signing_date?: string | null;
  additional_notes?: string | null;
  attachments_provided?: string[];
}

export interface SubmissionConfirmation {
  application_id: string;
  case_number: string;
  submitted_at: string;
  recipient_name: string;
  channel: string;
  status: string;
  upo_reference_code: string;
  next_steps: string[];
  legal_notices: string[];
}

export interface ApplicationDetailResponse {
  id: string;
  application_type: ApplicationType;
  category: ApplicationCategory;
  title: string;
  legal_basis: string;
  recipient_header: string;
  created_at: string;
  status: string;
  applicant: ApplicantData;
  employer?: EmployerData | null;
  child?: ChildData | null;
  leave_period: LeavePeriodData;
  required_attachments: RequiredAttachment[];
  formal_content_text: string;
  submission_confirmation?: SubmissionConfirmation | null;
}

export interface SubmissionRequest {
  delivery_channel?: string;
  destination?: string | null;
  delivery_method?: string | null;
  recipient_email?: string | null;
  notes?: string | null;
  confirm_truthfulness?: boolean;
}
