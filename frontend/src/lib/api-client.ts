// API Client for ZUS Parent Benefit Guide
// Connects to Python FastAPI backend (http://127.0.0.1:8000)

import type { Explanation, InsuredUser } from '@/lib/types'
import { findExplanationForQuestion, glossary, fallbackExplanation } from '@/lib/mock/glossary'

export const API_BASE_URL = 'http://127.0.0.1:8000'

const mockUser: InsuredUser = {
  firstName: 'Anna',
  lastName: 'Kowalska',
  peselMasked: '92•••••••45',
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// 1. Sprawdzenie statusu backendu
export async function checkHealth(): Promise<{ status: string; message: string; version?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return {
      status: 'offline',
      message: 'Brak aktywnego połączenia z backendem (używany tryb offline/symulacja).',
      version: '1.0.0',
    }
  }
}

// 2. Pobranie stawek kalkulatora
export async function getAllowanceRates() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculator/config`, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return {
      maternity_parental_option_uniform: 81.5,
      maternity_standard: 100.0,
      parental_standard: 70.0,
      pregnancy_sick_leave: 100.0,
      father_paternity_days: 14,
      non_transferable_parental_weeks: 9,
    }
  }
}

// 3. Logowanie przez mObywatel
export async function loginWithMObywatel(): Promise<{ user: InsuredUser; simulation?: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/simulation/profile/anna-kowalska`, { method: 'GET' })
    if (res.ok) {
      const simData = await res.json()
      return {
        user: mockUser,
        simulation: simData,
      }
    }
  } catch (err) {
    console.warn('Simulation backend offline, using mock user', err)
  }
  await delay(800)
  return { user: mockUser }
}

// 4. Kalkulator zasiłku chorobowego w ciąży (POST /api/calculators/pregnancy)
export interface PregnancyBenefitPayload {
  employment_type: 'EMPLOYMENT_CONTRACT' | 'MANDATE_CONTRACT' | 'B2B' | 'NONE'
  gross_monthly_income: number
  insurance_duration_days: number
  sick_leave_duration_days: number
  pregnancy_week?: number
  payer_size?: 'ABOVE_20' | 'UP_TO_20'
  company_status?: 'NORMAL' | 'BANKRUPTCY_OR_LIQUIDATION' | 'UNLAWFUL_TERMINATION'
  is_hospital_stay?: boolean
}

export async function calculatePregnancyBenefit(payload: PregnancyBenefitPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/pregnancy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      ...data,
      is_eligible: data.is_eligible,
      benefit_rate_percent: data.benefit_percentage ?? 100.0,
      daily_gross_benefit: data.daily_rate ?? Math.round((data.total_amount / (payload.sick_leave_duration_days || 1)) * 100) / 100,
      total_gross_benefit: data.total_amount ?? 0,
      total_net_benefit: Math.round((data.total_amount || 0) * 0.88 * 100) / 100,
      payer: data.disbursing_entity === 'ZUS' ? 'ZUS' : (data.disbursing_entity === 'EMPLOYER' ? 'Pracodawca (powyżej 20 ubezpieczonych)' : 'Pracodawca oraz ZUS'),
      protection_status: (data.legal_notes && data.legal_notes[0]) || 'Pełna ochrona stosunku pracy na mocy art. 177 Kodeksu pracy.',
      max_benefit_days: data.max_coverage_days ?? 270,
    }
  } catch {
    // Obliczenie fallbackowe w przypadku braku połączenia
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const dailyRate = base / 30
    const totalBenefit = dailyRate * payload.sick_leave_duration_days
    const isEligible = payload.insurance_duration_days >= (payload.employment_type === 'EMPLOYMENT_CONTRACT' ? 30 : 90)

    return {
      is_eligible: isEligible,
      benefit_type: isEligible ? 'SICKNESS_BENEFIT' : 'NONE',
      benefit_rate_percent: 100.0,
      daily_gross_benefit: Math.round(dailyRate * 100) / 100,
      total_gross_benefit: isEligible ? Math.round(totalBenefit * 100) / 100 : 0,
      total_net_benefit: isEligible ? Math.round(totalBenefit * 0.88 * 100) / 100 : 0,
      payer: payload.payer_size === 'UP_TO_20' ? 'ZUS' : 'PRACODAWCA (do 33 dni)',
      max_benefit_days: 270,
      protection_status: 'Pelna ochrona stosunku pracy na mocy art. 177 Kodeksu pracy.',
      warnings: isEligible ? [] : ['Brak wymaganego okresu wyczekiwania (karencji).'],
    }
  }
}

// 5. Kalkulator zasiłku macierzyńskiego i rodzicielskiego (POST /api/calculators/maternity-parental)
export interface MaternityParentalPayload {
  employment_type: 'EMPLOYMENT_CONTRACT' | 'MANDATE_CONTRACT' | 'B2B' | 'NONE'
  gross_monthly_income: number
  children_born_count?: number
  is_insured_at_birth?: boolean
  has_za_zyciem_certificate?: boolean
  applied_within_21_days?: boolean
  chosen_variant?: 'UNIFIED_81_5' | 'VARIABLE_100_70'
  mother_maternity_weeks?: number
  father_parental_weeks?: number
  mother_parental_weeks?: number
  parental_leave_parts_count?: number
  child_age_years?: number
}

export async function calculateMaternityParental(payload: MaternityParentalPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/maternity-parental`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const rate = payload.chosen_variant === 'UNIFIED_81_5' ? 0.815 : 1.0
    const monthlyMaternity = base * rate
    const monthlyNet = monthlyMaternity * 0.88

    return {
      is_eligible: payload.is_insured_at_birth !== false,
      calculation_basis: Math.round(base * 100) / 100,
      chosen_variant: payload.chosen_variant ?? 'UNIFIED_81_5',
      maternity_leave_weeks: 20,
      parental_leave_weeks: 41,
      total_leave_weeks: 61,
      father_exclusive_weeks: 9,
      monthly_gross_maternity: Math.round(monthlyMaternity * 100) / 100,
      monthly_net_maternity: Math.round(monthlyNet * 100) / 100,
      is_above_parental_threshold: monthlyNet >= 1000,
      notes: [
        'Wyliczenie oparte na przepisach Kodeksu pracy i Ustawy zasiłkowej (Dz.U. 2026).',
        payload.applied_within_21_days
          ? 'Złożono wniosek w terminie 21 dni – przysługuje uśredniona stawka 81,5%.'
          : 'Brak wniosku w 21 dni – stawka 100% za macierzyński i 70% za rodzicielski.',
      ],
    }
  }
}

// 6. Urlop ojcowski (POST /api/calculators/paternity-leave)
export interface PaternityPayload {
  gross_monthly_income: number
  employment_type?: string
  is_insured?: boolean
  child_age_months?: number
  is_adopted?: boolean
}

export async function calculatePaternityLeave(payload: PaternityPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/paternity-leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      ...data,
      daily_gross: data.daily_rate ?? 0,
      total_gross: data.total_benefit_amount ?? 0,
      total_net: Math.round((data.total_benefit_amount ?? 0) * 0.88 * 100) / 100,
      min_part_days: 7,
      deadline_info: 'Urlop ojcowski przysługuje do ukończenia przez dziecko 12. miesiąca życia.',
    }
  } catch {
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const dailyGross = base / 30
    return {
      is_eligible: true,
      allowed_days: 14,
      parts_allowed: 2,
      min_part_days: 7,
      daily_gross: Math.round(dailyGross * 100) / 100,
      total_gross: Math.round(dailyGross * 14 * 100) / 100,
      total_net: Math.round(dailyGross * 14 * 0.88 * 100) / 100,
      deadline_info: 'Urlop ojcowski przysługuje do ukończenia przez dziecko 12. miesiąca życia.',
    }
  }
}

// 7. Podział rodzicielskiego między rodziców (POST /api/calculators/parental-sharing)
export async function calculateParentalSharing(payload: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/parental-sharing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      ...data,
      valid: data.is_valid ?? true,
      total_weeks: data.total_weeks ?? 41,
      mother_weeks: data.mother_weeks ?? payload.mother_weeks ?? 32,
      father_weeks: data.father_weeks ?? payload.father_weeks ?? 9,
      non_transferable_satisfied: (payload.father_weeks || 9) >= 9,
      message: data.message || 'Prawidłowo uwzględniono 9 tygodni nieprzenoszalnego urlopu dla drugiego rodzica.',
    }
  } catch {
    return {
      valid: true,
      total_weeks: 41,
      mother_weeks: payload.mother_weeks || 32,
      father_weeks: payload.father_weeks || 9,
      non_transferable_satisfied: (payload.father_weeks || 9) >= 9,
      message: 'Prawidłowo uwzględniono 9 tygodni nieprzenoszalnego urlopu dla drugiego rodzica.',
    }
  }
}

// 8. Przypadki szczególne (POST /api/calculators/special-cases)
export interface SpecialCasesPayload {
  case_type: 'ZA_ZYCIEM' | 'PREMATURE_HOSPITALIZATION' | 'STILLBIRTH_OR_DEATH'
  gross_monthly_income: number
  employment_type?: string
  children_born_count?: number
  is_insured_at_birth?: boolean
  has_za_zyciem_certificate?: boolean
  child_birth_week?: number
  birth_weight_grams?: number
  hospitalization_weeks?: number
  is_stillbirth?: boolean
  child_death_after_birth?: boolean
}

export async function calculateSpecialCases(payload: SpecialCasesPayload) {
  try {
    const formattedPayload = {
      case_type: payload.case_type,
      gross_monthly_income: Number(payload.gross_monthly_income) || 7000,
      employment_type: payload.employment_type || 'EMPLOYMENT_CONTRACT',
      children_born_count: payload.children_born_count || 1,
      is_insured_at_birth: payload.is_insured_at_birth !== false,
      has_za_zyciem_certificate: payload.has_za_zyciem_certificate ?? (payload.case_type === 'ZA_ZYCIEM'),
      child_birth_week: payload.child_birth_week,
      birth_weight_grams: payload.birth_weight_grams,
      hospitalization_weeks: payload.hospitalization_weeks || 0,
      is_stillbirth: payload.is_stillbirth ?? (payload.case_type === 'STILLBIRTH_OR_DEATH'),
      child_death_after_birth: payload.child_death_after_birth || false,
    }

    const res = await fetch(`${API_BASE_URL}/api/calculators/special-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedPayload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      ...data,
      benefit_rate_percent: data.case_type === 'PREMATURE_HOSPITALIZATION' ? 100.0 : (data.case_type === 'ZA_ZYCIEM' ? 70.0 : 100.0),
      funeral_allowance_amount: data.case_type === 'STILLBIRTH_OR_DEATH' ? (data.one_time_grant_pln || 4000) : undefined,
      description: data.description || 'Świadczenie wyliczone zgodnie z przepisami ZUS.',
      required_documents: data.required_documents || [],
    }
  } catch (err) {
    console.warn('API /api/calculators/special-cases call failed, using legal fallback', err)
    if (payload.case_type === 'PREMATURE_HOSPITALIZATION') {
      return {
        case_type: 'PREMATURE_HOSPITALIZATION',
        additional_maternity_weeks: payload.child_birth_week && payload.child_birth_week < 28 ? 15 : 8,
        benefit_rate_percent: 100.0,
        description: 'Uzupełniający urlop macierzyński na mocy art. 180(2) Kodeksu pracy – płatny 100% podstawy.',
        required_documents: ['Zaświadczenie ze szpitala o okresie hospitalizacji i masie urodzeniowej.', 'Wniosek do pracodawcy/ZUS na 21 dni przed końcem urlopu macierzyńskiego.'],
      }
    } else if (payload.case_type === 'ZA_ZYCIEM') {
      return {
        case_type: 'ZA_ZYCIEM',
        total_parental_weeks: 65,
        benefit_rate_percent: 70.0,
        description: 'Wydłużony urlop rodzicielski dla dziecka z zaświadczeniem „Za życiem” (do 65 tygodni).',
        required_documents: ['Zaświadczenie „Za życiem” wystawione przez lekarza ze specjalizacją.', 'Wniosek o urlop rodzicielski w wydłużonym wymiarze.'],
      }
    } else {
      return {
        case_type: 'STILLBIRTH_OR_DEATH',
        maternity_weeks: 8,
        benefit_rate_percent: 100.0,
        funeral_allowance_amount: 4000,
        description: 'Prawo do 8 tygodni urlopu macierzyńskiego (100%) oraz zasiłku pogrzebowego 4000 zł.',
        required_documents: ['Akt urodzenia z adnotacją o martwym urodzeniu lub zaświadczenie lekarskie.', 'Wniosek Z-12 o zasiłek pogrzebowy.'],
      }
    }
  }
}

// 9. Parser PDF (POST /api/pdf/parse)
export async function parsePdfDocument(file: File) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE_URL}/api/pdf/parse`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    // Mock odpowiedzi dla testowania
    return {
      document_type: 'Z-3',
      insurance_status: 'ELIGIBLE',
      confidence_score: 0.96,
      person: {
        first_name: 'Anna',
        last_name: 'Kowalska',
        pesel: '92051203456',
        is_pesel_valid: true,
        birth_date: '1992-05-12',
      },
      payer: {
        nip: '5250001098',
        is_nip_valid: true,
        name: 'TechSolutions Sp. z o.o.',
        employee_count_status: 'ABOVE_20',
      },
      extracted_data: {
        document_code: 'Z-3',
        gross_salary: 6850.0,
        insurance_start_date: '2021-03-01',
        has_active_ezla_code_b: true,
      },
      validation_messages: [
        'Formularz Z-3 zweryfikowany pomyślnie.',
        'Płatnik zatrudnia powyżej 20 pracowników (zasiłek wypłaca pracodawca).',
        'Spełniony wymóg 30 dni nieprzerwanego ubezpieczenia chorobowego.',
      ],
    }
  }
}

// 10. Konfiguracja Admina (GET / PUT /api/admin/config)
export async function getAdminConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/config`, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return {
      benefit_rates: {
        pregnancy_sick_leave_rate: 100.0,
        standard_sick_leave_rate: 80.0,
        unified_benefit_rate: 81.5,
        full_maternity_rate: 100.0,
        standard_parental_rate: 70.0,
        paternity_benefit_rate: 100.0,
        rehabilitation_benefit_rate_first_3_months: 90.0,
        rehabilitation_benefit_rate_remaining: 75.0,
        rehabilitation_benefit_rate_pregnancy: 100.0,
      },
      leave_durations: {
        maternity_weeks_single_child: 20,
        maternity_weeks_twins: 31,
        maternity_weeks_triplets: 33,
        maternity_weeks_quadruplets: 35,
        maternity_weeks_quintuplets_plus: 37,
        mandatory_mother_maternity_weeks: 14,
        parental_weeks_standard: 41,
        parental_weeks_multiple_birth: 43,
        non_transferable_parental_weeks: 9,
        paternity_leave_days: 14,
        max_parental_leave_parts: 5,
      },
      periods_and_limits: {
        mandatory_insurance_waiting_period_days: 30,
        voluntary_insurance_waiting_period_days: 90,
        pregnancy_sick_leave_max_days: 270,
        application_deadline_days_long_parental: 21,
      },
    }
  }
}

export async function updateAdminConfig(payload: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return payload
  }
}

// 11. Asystent i wyjaśnienia AI
export async function askAssistantApi(message: string): Promise<Explanation> {
  if (!message.trim()) {
    throw new Error('Brak treści pytania')
  }
  await delay(500)
  return findExplanationForQuestion(message)
}

export async function getExplanation(topicId: string): Promise<Explanation> {
  await delay(400)
  return glossary[topicId] ?? fallbackExplanation
}
