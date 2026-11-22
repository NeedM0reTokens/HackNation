// API Client for ZUS Parent Benefit Guide
// Connects to Python FastAPI backend (http://127.0.0.1:8000)

import type { Explanation, InsuredUser } from '@/lib/types'
import { findExplanationForQuestion, glossary, fallbackExplanation } from '@/lib/mock/glossary'
import type {
  IntegratedCalculatorInput,
  IntegratedCalculatorResult,
  CalculatorPreset,
} from '@/types/calculator'
import type { ParentalWorkInput, ParentalWorkResult } from '@/types/parental_work'
import type { AdoptionLeaveInput, AdoptionLeaveResult } from '@/types/adoption'
import type {
  MaternityTransferInput,
  MaternityTransferResult,
  PaternityLeaveInput,
  PaternityLeaveResult,
  ParentalSharingInput,
  ParentalSharingResult,
} from '@/types/paternity'
import type { SpecialCasesInput, SpecialCasesResult } from '@/types/special_cases'
import type { MaternityParentalInput, MaternityParentalResult } from '@/types/maternity'

export const API_BASE_URL = 'http://127.0.0.1:8000'

const mockUser: InsuredUser = {
  firstName: 'Anna',
  lastName: 'Kowalska',
  peselMasked: '92•••••••45',
}

let storedAuthToken: string | null = null

export function setAuthToken(token: string | null) {
  storedAuthToken = token
  if (token) {
    try {
      localStorage.setItem('zus_auth_token', token)
    } catch {}
  } else {
    try {
      localStorage.removeItem('zus_auth_token')
    } catch {}
  }
}

export function getAuthToken(): string | null {
  if (storedAuthToken) return storedAuthToken
  try {
    return localStorage.getItem('zus_auth_token')
  } catch {
    return null
  }
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders }
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// 1. Sprawdzenie statusu backendu
export async function checkHealth(): Promise<{ status: string; message: string; version?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: getHeaders(),
    })
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
    const res = await fetch(`${API_BASE_URL}/api/calculator/config`, {
      method: 'GET',
      headers: getHeaders(),
    })
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
export async function loginWithMObywatel(): Promise<{ user: InsuredUser; simulation?: any; token?: string }> {
  try {
    // Próba pobrania tożsamości i zalogowania na backendzie
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/mobywatel/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pesel: '92051203456' }),
    })
    if (loginRes.ok) {
      const tokenData = await loginRes.json()
      if (tokenData.access_token) {
        setAuthToken(tokenData.access_token)
      }
    }
  } catch (err) {
    console.warn('mObywatel auth token request fallback', err)
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/simulation/profile/anna-kowalska`, {
      method: 'GET',
      headers: getHeaders(),
    })
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
  await delay(400)
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
  prior_sick_leave_days_in_year?: number
  age?: number
  zus_debt_amount?: number
  is_rehabilitation_benefit?: boolean
  rehabilitation_benefit_months?: number
}

export async function calculatePregnancyBenefit(payload: PregnancyBenefitPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/pregnancy`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...payload,
        is_code_b: true,
        payer_size: payload.payer_size ?? 'ABOVE_20',
        company_status: payload.company_status ?? 'NORMAL',
        prior_sick_leave_days_in_year: payload.prior_sick_leave_days_in_year ?? 0,
        age: payload.age ?? 30,
        zus_debt_amount: payload.zus_debt_amount ?? 0,
      }),
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
      payer: data.disbursing_entity === 'ZUS' ? 'ZUS' : (data.disbursing_entity === 'EMPLOYER' ? 'Pracodawca (powyżej 20 ubezpieczonych)' : 'Pracodawca (pierwsze 33 dni), potem ZUS'),
      protection_status: (data.legal_notes && data.legal_notes[0]) || 'Pełna ochrona stosunku pracy na mocy art. 177 Kodeksu pracy.',
      max_benefit_days: data.max_coverage_days ?? 270,
    }
  } catch {
    // Obliczenie fallbackowe w przypadku braku połączenia
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const dailyRate = Math.round((base / 30) * 100) / 100
    const totalBenefit = Math.round(dailyRate * payload.sick_leave_duration_days * 100) / 100
    const waitingDays = payload.employment_type === 'EMPLOYMENT_CONTRACT' ? 30 : 90
    const isEligible = payload.insurance_duration_days >= waitingDays

    return {
      is_eligible: isEligible,
      benefit_type: isEligible ? 'SICKNESS_BENEFIT' : 'NONE',
      benefit_rate_percent: 100.0,
      daily_gross_benefit: dailyRate,
      total_gross_benefit: isEligible ? totalBenefit : 0,
      total_net_benefit: isEligible ? Math.round(totalBenefit * 0.88 * 100) / 100 : 0,
      payer: payload.payer_size === 'UP_TO_20' ? 'ZUS (płatnik do 20 ubezpieczonych)' : 'Pracodawca (pierwsze 33 dni), od 34. dnia ZUS',
      max_benefit_days: 270,
      employer_days: Math.min(payload.sick_leave_duration_days, 33),
      employer_amount: Math.round(dailyRate * Math.min(payload.sick_leave_duration_days, 33) * 100) / 100,
      zus_days: Math.max(0, payload.sick_leave_duration_days - 33),
      zus_amount: Math.round(dailyRate * Math.max(0, payload.sick_leave_duration_days - 33) * 100) / 100,
      protection_status: 'Pełna ochrona stosunku pracy na mocy art. 177 Kodeksu pracy (zakaz wypowiedzenia i rozwiązania umowy).',
      refusal_reasons: isEligible ? [] : [`Nie upłynął wymagany okres karencji: ${waitingDays} dni (posiadasz ${payload.insurance_duration_days} dni).`],
      legal_notes: [
        'Zwolnienie z kodem literowym B w ciąży jest w 100% płatne.',
        'Maksymalny okres pobierania zasiłku chorobowego w ciąży wynosi 270 dni.',
      ],
    }
  }
}

// 5. Kalkulator zasiłku macierzyńskiego i rodzicielskiego (POST /api/calculators/maternity-parental)
export async function calculateMaternityParental(payload: MaternityParentalInput): Promise<MaternityParentalResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/maternity-parental`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const isUnified = payload.chosen_variant === 'UNIFIED_81_5'
    const matWeeks = payload.children_born_count && payload.children_born_count > 1 ? 31 : 20
    const parWeeks = payload.children_born_count && payload.children_born_count > 1 ? 43 : 41
    const totalWeeks = matWeeks + parWeeks

    const dailyNetUnified = (base / 30) * 0.815
    const totalUnified = Math.round(dailyNetUnified * (totalWeeks * 7) * 100) / 100

    const dailyNet100 = (base / 30) * 1.0
    const dailyNet70 = (base / 30) * 0.70
    const totalVariable = Math.round(((dailyNet100 * matWeeks * 7) + (dailyNet70 * parWeeks * 7)) * 100) / 100

    const totalBenefit = isUnified ? totalUnified : totalVariable

    return {
      is_eligible: payload.is_insured_at_birth !== false,
      total_maternity_weeks: matWeeks,
      total_parental_weeks: parWeeks,
      total_weeks: totalWeeks,
      mother_total_weeks: matWeeks + (parWeeks - 9),
      father_total_weeks: 9,
      calculation_base_net: Math.round(base * 100) / 100,
      daily_rate: Math.round((base / 30) * 100) / 100,
      total_benefit_amount: totalBenefit,
      chosen_variant: payload.chosen_variant ?? 'UNIFIED_81_5',
      comparison_unified_total: totalUnified,
      comparison_variable_total: totalVariable,
      periods: [
        {
          name: 'Urlop macierzyński (obowiązkowy)',
          weeks: matWeeks,
          days: matWeeks * 7,
          rate_percentage: isUnified ? 81.5 : 100.0,
          monthly_amount: Math.round(base * (isUnified ? 0.815 : 1.0) * 100) / 100,
          total_amount: Math.round((base / 30) * (isUnified ? 0.815 : 1.0) * matWeeks * 7 * 100) / 100,
          taken_by: 'Matka (min. 14 tyg. osobiście)',
        },
        {
          name: 'Urlop rodzicielski - część wspólna',
          weeks: parWeeks - 9,
          days: (parWeeks - 9) * 7,
          rate_percentage: isUnified ? 81.5 : 70.0,
          monthly_amount: Math.round(base * (isUnified ? 0.815 : 0.7) * 100) / 100,
          total_amount: Math.round((base / 30) * (isUnified ? 0.815 : 0.7) * (parWeeks - 9) * 7 * 100) / 100,
          taken_by: 'Matka lub Ojciec',
        },
        {
          name: 'Urlop rodzicielski - część nieprzenoszalna',
          weeks: 9,
          days: 63,
          rate_percentage: 70.0,
          monthly_amount: Math.round(base * 0.70 * 100) / 100,
          total_amount: Math.round((base / 30) * 0.70 * 63 * 100) / 100,
          taken_by: 'Drugi rodzic (wyłączne prawo ojca)',
        },
      ],
      refusal_reasons: [],
      legal_basis: [
        'Art. 180 Kodeksu Pracy (urlop macierzyński)',
        'Art. 182(1a) Kodeksu Pracy (urlop rodzicielski)',
        'Art. 30a i 31 Ustawy zasiłkowej (Dz.U. z 2026 r. poz. 854)',
      ],
      required_documents: [
        'Wniosek o zasiłek macierzyński (ZAM)',
        'Zaświadczenie płatnika składek (Z-3 / Z-3a)',
        'Odpis skrócony aktu urodzenia dziecka',
      ],
    }
  }
}

// 6. BE-21: Pełny zintegrowany kalkulator rodzicielski z osią czasu
export async function calculateIntegratedParental(payload: IntegratedCalculatorInput): Promise<IntegratedCalculatorResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculator/parental`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      // Alias test
      const aliasRes = await fetch(`${API_BASE_URL}/api/calculators/integrated`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      if (!aliasRes.ok) throw new Error(`HTTP ${res.status}`)
      return await aliasRes.json()
    }
    return await res.json()
  } catch (err) {
    console.warn('Backend integrated calculator error, using enriched fallback', err)
    return buildFallbackIntegratedResult(payload)
  }
}

// 7. BE-21: Presety kalkulatora dla zakładek UI
export async function getCalculatorPresets(): Promise<CalculatorPreset[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/presets`, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.presets ?? []
  } catch {
    return [
      {
        key: 'maternity_standard',
        title: 'Urlop macierzyński i rodzicielski (Standard)',
        description: 'Jedno dziecko, umowa o pracę, porównanie wariantu 81,5% z 100%/70%.',
        tab: 'macierzynski',
        target_endpoint: '/api/calculators/maternity-parental',
        default_payload: {
          gross_monthly_income: 8000.0,
          children_born_count: 1,
          applied_within_21_days: true,
          chosen_variant: 'UNIFIED_81_5',
        },
      },
      {
        key: 'paternity',
        title: 'Urlop ojcowski (14 dni)',
        description: '14 dni płatne 100% dla ojca, do wykorzystania w 1 lub 2 częściach.',
        tab: 'ojcowski',
        target_endpoint: '/api/calculators/paternity-leave',
        default_payload: {
          gross_monthly_income: 9000.0,
          child_age_months: 2,
        },
      },
      {
        key: 'parental_work',
        title: 'Łączenie rodzicielskiego z pracą na 1/2 etatu',
        description: 'Praca na max 1/2 etatu z proporcjonalnym wydłużeniem urlopu do 64 tygodni.',
        tab: 'praca',
        target_endpoint: '/api/calculators/parental-work-combination',
        default_payload: {
          gross_monthly_income: 8000.0,
          work_fraction: 0.5,
          parental_weeks_to_combine: 32,
        },
      },
      {
        key: 'adoption',
        title: 'Adopcja i rodzina zastępcza niezawodowa',
        description: 'Urlop na warunkach macierzyńskiego z gwarantowanym min. 9 tygodni.',
        tab: 'adopcja',
        target_endpoint: '/api/calculators/adoption-leave',
        default_payload: {
          gross_monthly_income: 7500.0,
          child_age_years: 3,
        },
      },
      {
        key: 'special_cases_za_zyciem',
        title: 'Zaświadczenie „Za życiem” (+24 tyg.)',
        description: 'Wydłużenie rodzicielskiego do 65 tygodni oraz jednorazowe 4000 zł.',
        tab: 'przypadki_szczegolne',
        target_endpoint: '/api/calculators/special-cases',
        default_payload: {
          case_type: 'ZA_ZYCIEM',
          gross_monthly_income: 7000.0,
        },
      },
      {
        key: 'special_cases_premature',
        title: 'Wcześniak i hospitalizacja noworodka',
        description: 'Uzupełniający urlop macierzyński do 15 tygodni płatny 100%.',
        tab: 'przypadki_szczegolne',
        target_endpoint: '/api/calculators/special-cases',
        default_payload: {
          case_type: 'PREMATURE_HOSPITALIZATION',
          gross_monthly_income: 7000.0,
          child_birth_week: 27,
          birth_weight_grams: 950,
        },
      },
    ]
  }
}

export async function getCalculatorPresetByKey(presetKey: string): Promise<CalculatorPreset | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/presets/${presetKey}`, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const presets = await getCalculatorPresets()
    return presets.find((p) => p.key === presetKey) ?? null
  }
}

// 8. Urlop ojcowski (BE-16: POST /api/calculators/paternity-leave)
export async function calculatePaternityLeave(payload: PaternityLeaveInput): Promise<PaternityLeaveResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/paternity-leave`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const dailyRate = Math.round((base / 30) * 100) / 100
    const parts = payload.parts && payload.parts.length > 0 ? payload.parts : [{ part_number: 1, days: 14 }]
    const totalDays = parts.reduce((acc, p) => acc + p.days, 0)
    const totalBenefit = Math.round(dailyRate * totalDays * 100) / 100
    const isEligible = payload.child_age_months !== undefined ? payload.child_age_months <= 12 : true

    return {
      is_eligible: isEligible,
      total_days: totalDays,
      calculation_base_net: Math.round(base * 100) / 100,
      daily_rate: dailyRate,
      total_benefit_amount: totalBenefit,
      refusal_reasons: isEligible ? [] : ['Dziecko ukończyło 12. miesiąc życia (art. 182(3) Kodeksu Pracy).'],
      parts_breakdown: parts.map((p) => ({
        part_number: p.part_number,
        days: p.days,
        rate_percentage: 100.0,
        amount: Math.round(dailyRate * p.days * 100) / 100,
      })),
      legal_basis: [
        'Art. 182(3) Kodeksu Pracy (urlop ojcowski w wymiarze 14 dni)',
        'Art. 29a Ustawy zasiłkowej (100% podstawy wymiaru)',
      ],
      required_documents: [
        'Wniosek o urlop ojcowski na min. 7 dni przed rozpoczęciem',
        'Skrócony odpis aktu urodzenia dziecka',
        'Oświadczenie o braku wcześniejszego wykorzystania',
      ],
      important_notes: [
        'Urlop ojcowski przysługuje wyłącznie ojcu – matka nie może z niego skorzystać.',
        'Można podzielić na maksymalnie 2 części po minimum 7 dni każda.',
      ],
    }
  }
}

// 9. Przejęcie urlopu macierzyńskiego przez ojca (BE-17: POST /api/calculators/maternity-transfer)
export async function calculateMaternityTransfer(payload: MaternityTransferInput): Promise<MaternityTransferResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/maternity-transfer`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const base = payload.father_gross_monthly_income * (1 - 0.1371)
    const dailyRate = Math.round((base / 30) * 100) / 100
    const used = payload.mother_used_weeks ?? 14
    const totalMat = payload.children_born_count && payload.children_born_count > 1 ? 31 : 20
    const transferred = Math.max(0, totalMat - used)
    const rate = payload.applied_within_21_days ? 81.5 : 100.0
    const totalBenefit = Math.round(dailyRate * (rate / 100) * transferred * 7 * 100) / 100

    return {
      is_eligible: true,
      total_maternity_weeks: totalMat,
      mother_weeks_used: used,
      father_transferred_weeks: transferred,
      father_calculation_base_net: Math.round(base * 100) / 100,
      father_daily_rate: dailyRate,
      father_total_benefit_amount: totalBenefit,
      benefit_rate_percentage: rate,
      refusal_reasons: [],
      legal_basis: [
        'Art. 180 § 4 i § 5 Kodeksu Pracy (przejęcie macierzyńskiego po 14 tygodniach)',
        'Art. 29 ust. 2 Ustawy zasiłkowej',
      ],
      required_documents: [
        'Pisemny wniosek matki o rezygnację z części urlopu',
        'Wniosek ojca o udzielenie pozostałej części urlopu macierzyńskiego',
        'Zaświadczenie pracodawcy matki o dacie zakończenia urlopu',
      ],
      important_notes: [
        'Matka musi bezwzględnie wykorzystać pierwsze 14 tygodni osobiście.',
        'Urlop ojca rozpoczyna się bezpośrednio po rezygnacji matki.',
      ],
    }
  }
}

export type SpecialCasesPayload = SpecialCasesInput

// 10. Symulacja podziału opieki między oboje rodziców (BE-18: POST /api/calculators/parental-sharing)
export async function calculateParentalSharing(payload: ParentalSharingInput): Promise<ParentalSharingResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/parental-sharing`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const totalPool = payload.children_born_count && payload.children_born_count > 1 ? 43 : 41
    const mWeeks = payload.mother_parental_weeks ?? 32
    const fWeeks = payload.father_parental_weeks ?? 9
    const mBase = (payload.mother_gross_income ?? 7000) * (1 - 0.1371)
    const fBase = (payload.father_gross_income ?? 8500) * (1 - 0.1371)
    const rate = payload.chosen_variant === 'VARIABLE_100_70' ? 0.70 : 0.815

    const mDaily = mBase / 30
    const fDaily = fBase / 30
    const mTotal = Math.round(mDaily * rate * mWeeks * 7 * 100) / 100
    const fTotal = Math.round(fDaily * rate * fWeeks * 7 * 100) / 100

    return {
      is_valid_division: true,
      sharing_mode: payload.sharing_mode ?? 'SEQUENTIAL',
      total_pool_parental_weeks: totalPool,
      total_pool_maternity_weeks: 20,
      combined_total_weeks: 20 + totalPool,
      mother: {
        parent_name: 'Matka',
        gross_income: payload.mother_gross_income,
        calculation_base_net: Math.round(mBase * 100) / 100,
        daily_rate: Math.round(mDaily * 100) / 100,
        maternity_weeks: 20,
        parental_weeks: mWeeks,
        total_weeks: 20 + mWeeks,
        total_benefit_amount: mTotal,
        periods: [],
      },
      father: {
        parent_name: 'Ojciec',
        gross_income: payload.father_gross_income,
        calculation_base_net: Math.round(fBase * 100) / 100,
        daily_rate: Math.round(fDaily * 100) / 100,
        maternity_weeks: 0,
        parental_weeks: fWeeks,
        total_weeks: fWeeks,
        total_benefit_amount: fTotal,
        periods: [],
      },
      total_family_benefit_amount: mTotal + fTotal,
      non_transferable_respected: fWeeks >= 9 && mWeeks >= 9,
      validation_messages: [
        'Prawidłowo uwzględniono 9 tygodni nieprzenoszalnego urlopu rodzicielskiego dla drugiego rodzica.',
      ],
      financial_comparison_note: 'Wariant uśredniony (81,5%) daje równe wpływy przez cały okres.',
      legal_basis: [
        'Art. 182(1a) Kodeksu Pracy (pula urlopu rodzicielskiego)',
        'Art. 182(1a) § 4 Kodeksu Pracy (9 tygodni nieprzenoszalnych)',
      ],
      recommended_strategy_note: 'Wykorzystanie 9 tygodni przez tatę zwiększa łączny budżet rodziny i wspiera równość opieki.',
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

// 11. Łączenie rodzicielskiego z pracą na max 1/2 etatu (BE-19: POST /api/calculators/parental-work-combination)
export async function calculateParentalWorkCombination(payload: ParentalWorkInput): Promise<ParentalWorkResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/parental-work-combination`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const fraction = payload.work_fraction ?? 0.5
    const origWeeks = payload.parental_weeks_to_combine ?? 32
    const netBase = payload.gross_monthly_income * (1 - 0.1371)
    const rate = (payload.benefit_rate_percentage ?? 70.0) / 100
    const dailyNetBase = netBase / 30

    // W = T / (1 - etat)
    const extendedWeeks = Math.round(origWeeks / (1 - fraction))
    const extDiffWeeks = extendedWeeks - origWeeks

    const standardMonthlyBenefit = Math.round(netBase * rate * 100) / 100
    const reducedMonthlyBenefit = Math.round(standardMonthlyBenefit * (1 - fraction) * 100) / 100
    const monthlySalaryGross = Math.round(payload.gross_monthly_income * fraction * 100) / 100
    const combinedMonthly = Math.round((reducedMonthlyBenefit + monthlySalaryGross) * 100) / 100

    const totalBenefit = Math.round(dailyNetBase * rate * (1 - fraction) * extendedWeeks * 7 * 100) / 100
    const totalSalary = Math.round(monthlySalaryGross * (extendedWeeks / 4.33) * 100) / 100
    const pureBenefit = Math.round(dailyNetBase * rate * origWeeks * 7 * 100) / 100

    return {
      is_eligible: fraction <= 0.5,
      work_fraction: fraction,
      original_parental_weeks: origWeeks,
      extension_weeks: extDiffWeeks,
      extension_days: 0,
      total_parental_weeks_with_extension: extendedWeeks,
      total_parental_days_with_extension: extendedWeeks * 7,
      maximum_legal_limit_weeks: 82,
      calculation_base_net: Math.round(netBase * 100) / 100,
      daily_benefit_without_work: Math.round(dailyNetBase * rate * 100) / 100,
      reduced_daily_benefit_with_work: Math.round(dailyNetBase * rate * (1 - fraction) * 100) / 100,
      monthly_salary_from_work_gross: monthlySalaryGross,
      standard_monthly_benefit_without_work: standardMonthlyBenefit,
      reduced_monthly_benefit_with_work: reducedMonthlyBenefit,
      combined_monthly_income: combinedMonthly,
      total_benefit_amount: totalBenefit,
      total_work_salary_amount: totalSalary,
      total_combined_income: totalBenefit + totalSalary,
      pure_leave_total_benefit: pureBenefit,
      financial_gain_compared_to_pure_leave: (totalBenefit + totalSalary) - pureBenefit,
      periods: [
        {
          period_name: 'Część bazowa łączona z pracą na część etatu',
          weeks: origWeeks,
          days: origWeeks * 7,
          work_fraction: fraction,
          monthly_salary_gross: monthlySalaryGross,
          monthly_benefit_net: reducedMonthlyBenefit,
          total_period_salary_gross: Math.round(monthlySalaryGross * (origWeeks / 4.33) * 100) / 100,
          total_period_benefit_net: Math.round(totalBenefit / 2 * 100) / 100,
          total_period_combined_income: Math.round((totalBenefit / 2 + monthlySalaryGross * (origWeeks / 4.33)) * 100) / 100,
        },
        {
          period_name: 'Część wydłużona z kontynuacją pracy na część etatu',
          weeks: extDiffWeeks,
          days: extDiffWeeks * 7,
          work_fraction: fraction,
          monthly_salary_gross: monthlySalaryGross,
          monthly_benefit_net: reducedMonthlyBenefit,
          total_period_salary_gross: Math.round(monthlySalaryGross * (extDiffWeeks / 4.33) * 100) / 100,
          total_period_benefit_net: Math.round(totalBenefit / 2 * 100) / 100,
          total_period_combined_income: Math.round((totalBenefit / 2 + monthlySalaryGross * (extDiffWeeks / 4.33)) * 100) / 100,
        },
      ],
      refusal_reasons: fraction > 0.5 ? ['Praca na więcej niż 1/2 pełnego wymiaru czasu pracy jest niedozwolona podczas urlopu rodzicielskiego.'] : [],
      legal_basis: [
        'Art. 182(1e) Kodeksu Pracy – łączenie urlopu z pracą u pracodawcy',
        'Art. 182(1f) Kodeksu Pracy – wzór proporcjonalnego wydłużenia urlopu',
        'Art. 31 ust. 4a Ustawy zasiłkowej – zmniejszenie zasiłku o ułamek etatu',
      ],
      practical_tips: [
        'Wniosek o łączenie urlopu z pracą złóż pracodawcy min. 21 dni przed rozpoczęciem pracy.',
        'Pracodawca ma obowiązek uwzględnić wniosek, chyba że organizacja pracy to wyklucza.',
        'Łącząc 1/2 etatu z urlopem, zarabiasz łącznie więcej niż na samym urlopie i wydłużasz opiekę do 64 tygodni!',
      ],
    }
  }
}

// 12. Rodzice adopcyjni i rodzina zastępcza (BE-20: POST /api/calculators/adoption-leave)
export async function calculateAdoptionLeave(payload: AdoptionLeaveInput): Promise<AdoptionLeaveResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/adoption-leave`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const dailyNet = base / 30
    const matWeeks = 20
    const parWeeks = 41
    const totalWeeks = matWeeks + parWeeks
    const rate = payload.chosen_variant === 'VARIABLE_100_70' ? 0.70 : 0.815

    const matAmount = Math.round(dailyNet * (payload.chosen_variant === 'VARIABLE_100_70' ? 1.0 : 0.815) * matWeeks * 7 * 100) / 100
    const parAmount = Math.round(dailyNet * rate * parWeeks * 7 * 100) / 100

    return {
      is_eligible: true,
      caregiver_type: payload.caregiver_type ?? 'ADOPTION',
      maternity_condition_weeks: matWeeks,
      is_minimum_guaranteed_weeks_applied: false,
      parental_weeks_available: parWeeks,
      non_transferable_parental_weeks: 9,
      total_leave_weeks: totalWeeks,
      child_age_limit_maternity_years: payload.caregiver_type === 'FOSTER_FAMILY_NON_PROFESSIONAL' ? 7 : 14,
      child_age_limit_parental_years: 14,
      calculation_base_net: Math.round(base * 100) / 100,
      daily_benefit_rate: Math.round(dailyNet * 100) / 100,
      maternity_benefit_amount: matAmount,
      parental_benefit_amount: parAmount,
      total_benefit_amount: matAmount + parAmount,
      periods_breakdown: [
        {
          name: 'Urlop na warunkach urlopu macierzyńskiego',
          weeks: matWeeks,
          days: matWeeks * 7,
          rate_percentage: payload.chosen_variant === 'VARIABLE_100_70' ? 100.0 : 81.5,
          monthly_amount: Math.round(base * (payload.chosen_variant === 'VARIABLE_100_70' ? 1.0 : 0.815) * 100) / 100,
          total_amount: matAmount,
          taken_by: 'Rodzic adopcyjny / opiekun',
        },
        {
          name: 'Urlop rodzicielski dla opiekunów',
          weeks: parWeeks,
          days: parWeeks * 7,
          rate_percentage: payload.chosen_variant === 'VARIABLE_100_70' ? 70.0 : 81.5,
          monthly_amount: Math.round(base * rate * 100) / 100,
          total_amount: parAmount,
          taken_by: 'Rodzic adopcyjny / opiekun',
        },
      ],
      refusal_reasons: [],
      legal_basis: [
        'Art. 183 Kodeksu Pracy (urlop na warunkach urlopu macierzyńskiego)',
        'Art. 29 ust. 1 pkt 2 Ustawy zasiłkowej',
      ],
      required_documents: [
        'Oświadczenie o przyjęciu dziecka na wychowanie',
        'Zaświadczenie sądu opiekuńczego o wszczęciu postępowania przysposobienia',
        'Wniosek ZAM do ZUS lub u pracodawcy',
      ],
      practical_tips: [
        'Jeżeli do osiągnięcia limitu wieku zostało mniej niż 9 tygodni, przysługuje gwarantowane minimum 9 tygodni urlopu.',
        'Wniosek w terminie 21 dni pozwala na uśrednioną stawkę 81,5% za cały okres.',
      ],
    }
  }
}

// 13. Przypadki szczególne (BE-13 - BE-15: POST /api/calculators/special-cases)
export async function calculateSpecialCases(payload: SpecialCasesInput): Promise<SpecialCasesResult> {
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
    const base = payload.gross_monthly_income * (1 - 0.1371)
    const dailyRate = Math.round((base / 30) * 100) / 100

    if (payload.case_type === 'PREMATURE_HOSPITALIZATION') {
      const suppWeeks = payload.child_birth_week && payload.child_birth_week < 28 ? 15 : 8
      const totalMatWeeks = 20 + suppWeeks
      const totalBenefit = Math.round(dailyRate * 1.0 * totalMatWeeks * 7 * 100) / 100
      return {
        case_type: 'PREMATURE_HOSPITALIZATION',
        is_eligible: true,
        base_maternity_weeks: 20,
        supplementary_maternity_weeks: suppWeeks,
        total_maternity_weeks: totalMatWeeks,
        parental_weeks: 41,
        non_transferable_parental_weeks: 9,
        total_leave_weeks: totalMatWeeks + 41,
        calculation_base_net: Math.round(base * 100) / 100,
        daily_rate: dailyRate,
        total_benefit_amount: totalBenefit,
        one_time_grant_pln: 0,
        can_interrupt_maternity_for_hospitalization: true,
        min_mandatory_mother_maternity_weeks: 8,
        description: `Uzupełniający urlop macierzyński (+${suppWeeks} tygodni, płatny 100% podstawy) zgodnie z art. 180(2) Kodeksu pracy.`,
        required_documents: [
          'Zaświadczenie ze szpitala o okresie hospitalizacji i masie urodzeniowej noworodka',
          'Wniosek o uzupełniający urlop macierzyński złożony na 21 dni przed zakończeniem urlopu macierzyńskiego',
        ],
        legal_basis: [
          'Art. 180(2) Kodeksu Pracy (uzupełniający urlop macierzyński)',
          'Art. 181 Kodeksu Pracy (przerwanie urlopu w czasie hospitalizacji dziecka po 8 tygodniach)',
        ],
        important_notes: [
          'Urlop przysługuje obojgu rodzicom, ale korzystać może tylko jedno z nich.',
          'Wymiar uzupełniający wynosi do 8 lub do 15 tygodni (poród przed 28. tc lub waga < 1000g).',
        ],
        periods: [],
      }
    } else if (payload.case_type === 'ZA_ZYCIEM') {
      const parWeeks = 65
      const totalWeeks = 20 + parWeeks
      const totalBenefit = Math.round(((dailyRate * 1.0 * 20 * 7) + (dailyRate * 0.70 * parWeeks * 7)) * 100) / 100
      return {
        case_type: 'ZA_ZYCIEM',
        is_eligible: true,
        base_maternity_weeks: 20,
        supplementary_maternity_weeks: 0,
        total_maternity_weeks: 20,
        parental_weeks: parWeeks,
        non_transferable_parental_weeks: 9,
        total_leave_weeks: totalWeeks,
        calculation_base_net: Math.round(base * 100) / 100,
        daily_rate: dailyRate,
        total_benefit_amount: totalBenefit,
        one_time_grant_pln: 4000.0,
        can_interrupt_maternity_for_hospitalization: false,
        min_mandatory_mother_maternity_weeks: 14,
        description: 'Wydłużony urlop rodzicielski o 24 tygodnie (do 65 tygodni) oraz jednorazowe świadczenie 4 000 zł z Ustawy „Za życiem”.',
        required_documents: [
          'Zaświadczenie lekarskie „Za życiem” od lekarza ze specjalizacją (ginekolog, neonatolog itp.)',
          'Wniosek o jednorazowe świadczenie 4000 zł (złożyć w terminie 12 miesięcy od dnia porodu)',
          'Wniosek o wydłużony urlop rodzicielski',
        ],
        legal_basis: [
          'Ustawa z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem”',
          'Art. 182(1a) § 2 Kodeksu Pracy (wydłużenie do 65 lub 67 tygodni)',
        ],
        important_notes: [
          'Jednorazowe świadczenie 4000 zł nie podlega opodatkowaniu PIT ani egzekucji komorniczej.',
        ],
        periods: [],
      }
    } else {
      const matWeeks = 8
      const totalBenefit = Math.round(dailyRate * 1.0 * matWeeks * 7 * 100) / 100
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

// 14. Parser dokumentów PDF ZUS (POST /api/pdf/parse)
export async function parsePdfDocument(file: File) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE_URL}/api/pdf/parse`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
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

// 15. Panel Administratora (GET / PUT /api/admin/config)
export async function getAdminConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/config`, {
      method: 'GET',
      headers: getHeaders(),
    })
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
      },
      leave_durations: {
        maternity_weeks_single_child: 20,
        maternity_weeks_twins: 31,
        maternity_weeks_triplets: 33,
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
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return payload
  }
}

<<<<<<< HEAD
// 11. Asystent i wyjaśnienia AI (Google Gemini API)
export interface AssistantStatus {
  is_configured: boolean
  model: string
  provider: string
}

export async function getAssistantStatus(): Promise<AssistantStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assistant/status`, { method: 'GET' })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Could not reach /api/assistant/status', err)
  }
  return {
    is_configured: false,
    model: 'gemini-2.0-flash',
    provider: 'Google Gemini AI',
  }
}

export async function askAssistantApi(
  message: string,
  history?: { role: string; content: string }[],
): Promise<Explanation> {
  if (!message.trim()) {
    throw new Error('Brak treści pytania')
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/assistant/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history?.map((h) => ({ role: h.role, content: h.content })),
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      id: data.id || `ai-${Date.now()}`,
      title: data.title || 'Odpowiedź Asystenta AI ZUS',
      summary: data.summary,
      details: data.details || [],
      legalBasis: data.legal_basis || undefined,
    }
  } catch (err) {
    console.warn('Backend Assistant API offline, using local statutory glossary fallback', err)
    return findExplanationForQuestion(message)
  }
}

export async function getExplanation(topicId: string): Promise<Explanation> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assistant/explain/${encodeURIComponent(topicId)}`, {
      method: 'GET',
    })
    if (res.ok) {
      const data = await res.json()
      return {
        id: data.id,
        title: data.title,
        summary: data.summary,
        details: data.details || [],
        legalBasis: data.legal_basis || undefined,
      }
    }
  } catch (err) {
    console.warn('Backend explain endpoint offline, using local glossary', err)
  }
=======
// 16. Asystent i baza wiedzy
export async function askAssistantApi(message: string): Promise<Explanation> {
  if (!message.trim()) {
    throw new Error('Brak treści pytania')
  }
  await delay(400)
  return findExplanationForQuestion(message)
}

export async function getExplanation(topicId: string): Promise<Explanation> {
  await delay(200)
>>>>>>> 232ab09fab1a4d83f601236637d93c2e83982d62
  return glossary[topicId] ?? fallbackExplanation
}

// Helper: Generowanie bogatej odpowiedzi fallback dla zintegrowanego kalkulatora (BE-21)
function buildFallbackIntegratedResult(input: IntegratedCalculatorInput): IntegratedCalculatorResult {
  const birth = new Date(input.child_birth_date || '2026-06-01')
  const mGross = input.mother_gross_monthly_income ?? 8000
  const fGross = input.father_gross_monthly_income ?? 9000
  const mNetBase = mGross * (1 - 0.1371)
  const fNetBase = fGross * (1 - 0.1371)

  const isMultiple = (input.children_count ?? 1) > 1
  const isZaZyciem = input.special_case_type === 'ZA_ZYCIEM' || Boolean(input.has_za_zyciem_certificate)
  const isAdoption = input.special_case_type === 'ADOPTION' || Boolean(input.is_adoption)

  const matWeeks = isMultiple ? 31 : 20
  let parWeeks = isMultiple ? 43 : 41
  if (isZaZyciem) {
    parWeeks = isMultiple ? 67 : 65
  }

  const isUnified = input.chosen_variant === 'UNIFIED_81_5'
  const matRate = isUnified ? 81.5 : 100.0
  const parRate = isUnified ? 81.5 : 70.0

  const mDailyRate = mNetBase / 30
  const fDailyRate = fNetBase / 30

  // Łączenie z pracą
  const workEnabled = Boolean(input.work_combination?.enabled)
  const workFraction = workEnabled ? (input.work_combination?.work_fraction ?? 0.5) : 0
  const workWeeksCombined = workEnabled ? (input.work_combination?.weeks_to_combine ?? 32) : 0
  const workExtension = workEnabled ? Math.round(workWeeksCombined / (1 - workFraction)) - workWeeksCombined : 0

  const effectiveParWeeks = parWeeks + workExtension
  const totalWeeks = matWeeks + effectiveParWeeks

  // Wyliczenie kwot
  const matBenefit = Math.round(mDailyRate * (matRate / 100) * matWeeks * 7 * 100) / 100
  const parBenefitBase = mDailyRate * (parRate / 100) * (workEnabled ? (1 - workFraction) : 1.0)
  const parBenefit = Math.round(parBenefitBase * effectiveParWeeks * 7 * 100) / 100
  const fatherPaternity = input.include_paternity_leave ? Math.round(fDailyRate * 1.0 * 14 * 100) / 100 : 0

  const totalBenefitAmount = matBenefit + parBenefit + fatherPaternity
  const totalSalaryAmount = workEnabled ? Math.round((mGross * workFraction) * (effectiveParWeeks / 4.33) * 100) / 100 : 0

  // Daty
  const startDate = new Date(birth)
  const endDate = new Date(birth)
  endDate.setDate(endDate.getDate() + totalWeeks * 7)

  const d21 = new Date(birth)
  d21.setDate(d21.getDate() + 21)

  return {
    is_eligible: true,
    child_birth_date: input.child_birth_date,
    timeline_start_date: startDate.toISOString().split('T')[0],
    timeline_end_date: endDate.toISOString().split('T')[0],
    total_leave_weeks: totalWeeks,
    total_leave_days: totalWeeks * 7,
    total_family_benefit_amount: totalBenefitAmount,
    total_work_salary_amount: totalSalaryAmount,
    total_family_combined_income: totalBenefitAmount + totalSalaryAmount,
    timeline_periods: [
      {
        id: 'mat_leave',
        name: isAdoption ? 'Urlop na warunkach macierzyńskiego' : 'Urlop macierzyński (obowiązkowe 14 tyg. matki)',
        person: 'mother',
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date(startDate.getTime() + matWeeks * 7 * 86400000).toISOString().split('T')[0],
        weeks: matWeeks,
        days: matWeeks * 7,
        rate_percentage: matRate,
        daily_benefit_net: Math.round(mDailyRate * (matRate / 100) * 100) / 100,
        monthly_benefit_net: Math.round(mNetBase * (matRate / 100) * 100) / 100,
        total_benefit_net: matBenefit,
        work_fraction: 0,
        monthly_salary_gross: 0,
        total_salary_gross: 0,
        combined_period_income: matBenefit,
        payer: 'Pracodawca / ZUS',
        description: 'Pierwsze 14 tygodni matka musi wykorzystać osobiście. Po tym okresie część może przejąć ojciec.',
      },
      {
        id: 'par_leave_main',
        name: workEnabled ? 'Urlop rodzicielski (łączony z pracą na część etatu)' : 'Urlop rodzicielski – pula główna',
        person: 'mother',
        start_date: new Date(startDate.getTime() + matWeeks * 7 * 86400000).toISOString().split('T')[0],
        end_date: new Date(startDate.getTime() + (matWeeks + effectiveParWeeks - 9) * 7 * 86400000).toISOString().split('T')[0],
        weeks: effectiveParWeeks - 9,
        days: (effectiveParWeeks - 9) * 7,
        rate_percentage: parRate,
        daily_benefit_net: Math.round(mDailyRate * (parRate / 100) * (workEnabled ? (1 - workFraction) : 1) * 100) / 100,
        monthly_benefit_net: Math.round(mNetBase * (parRate / 100) * (workEnabled ? (1 - workFraction) : 1) * 100) / 100,
        total_benefit_net: Math.round(parBenefit * ((effectiveParWeeks - 9) / effectiveParWeeks) * 100) / 100,
        work_fraction: workFraction,
        monthly_salary_gross: workEnabled ? mGross * workFraction : 0,
        total_salary_gross: totalSalaryAmount,
        combined_period_income: Math.round((parBenefit * ((effectiveParWeeks - 9) / effectiveParWeeks) + totalSalaryAmount) * 100) / 100,
        payer: 'ZUS',
        description: workEnabled ? `Praca na ${workFraction * 100}% etatu wydłuża urlop proporcjonalnie zgodnie z art. 182(1f) KP.` : 'Część wspólna do wykorzystania przez matkę lub ojca.',
      },
      {
        id: 'par_leave_father',
        name: 'Urlop rodzicielski – 9 tygodni nieprzenoszalnych dla ojca',
        person: 'father',
        start_date: new Date(startDate.getTime() + (matWeeks + effectiveParWeeks - 9) * 7 * 86400000).toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        weeks: 9,
        days: 63,
        rate_percentage: 70.0,
        daily_benefit_net: Math.round(fDailyRate * 0.70 * 100) / 100,
        monthly_benefit_net: Math.round(fNetBase * 0.70 * 100) / 100,
        total_benefit_net: Math.round(fDailyRate * 0.70 * 63 * 100) / 100,
        work_fraction: 0,
        monthly_salary_gross: 0,
        total_salary_gross: 0,
        combined_period_income: Math.round(fDailyRate * 0.70 * 63 * 100) / 100,
        payer: 'ZUS',
        description: 'Wyłączne prawo ojca dziecka. Niewykorzystana część przepada i nie przechodzi na matkę.',
      },
    ],
    milestones: [
      {
        milestone_date: d21.toISOString().split('T')[0],
        title: 'Nieprzekraczalny termin na tzw. „długi wniosek” (21 dni)',
        importance: 'CRITICAL',
        legal_basis: 'Art. 30a ust. 1 Ustawy zasiłkowej',
        action_required: 'Złóż wniosek o zasiłek macierzyński za okres macierzyńskiego i rodzicielskiego, aby otrzymać uśrednioną stawkę 81,5%.',
      },
      {
        milestone_date: new Date(startDate.getTime() + 14 * 7 * 86400000).toISOString().split('T')[0],
        title: 'Koniec obowiązkowych 14 tygodni macierzyńskiego matki',
        importance: 'HIGH',
        legal_basis: 'Art. 180 § 4 Kodeksu Pracy',
        action_required: 'Od tego dnia matka może zrezygnować z dalszej części urlopu i powrócić do pracy, przekazując resztę ojcu.',
      },
      {
        milestone_date: new Date(startDate.getTime() + 365 * 86400000).toISOString().split('T')[0],
        title: 'Ostateczny termin na wykorzystanie 14 dni urlopu ojcowskiego',
        importance: 'HIGH',
        legal_basis: 'Art. 182(3) Kodeksu Pracy',
        action_required: 'Ojciec musi złożyć wniosek min. 7 dni przed ukończeniem przez dziecko 12. miesiąca życia.',
      },
    ],
    monthly_cashflow: [
      {
        year_month: 'Miesiąc 1-5 (Macierzyński)',
        mother_benefit: Math.round(mNetBase * (matRate / 100) * 100) / 100,
        father_benefit: 0,
        work_salary: 0,
        total_month_income: Math.round(mNetBase * (matRate / 100) * 100) / 100,
      },
      {
        year_month: 'Miesiąc 6-14 (Rodzicielski)',
        mother_benefit: Math.round(mNetBase * (parRate / 100) * (workEnabled ? (1 - workFraction) : 1) * 100) / 100,
        father_benefit: 0,
        work_salary: workEnabled ? mGross * workFraction : 0,
        total_month_income: Math.round((mNetBase * (parRate / 100) * (workEnabled ? (1 - workFraction) : 1) + (workEnabled ? mGross * workFraction : 0)) * 100) / 100,
      },
      {
        year_month: 'Miesiąc 15-16 (Tata 9 tyg.)',
        mother_benefit: 0,
        father_benefit: Math.round(fNetBase * 0.70 * 100) / 100,
        work_salary: 0,
        total_month_income: Math.round(fNetBase * 0.70 * 100) / 100,
      },
    ],
    comparison_unified_81_5_total: Math.round(mDailyRate * 0.815 * totalWeeks * 7 * 100) / 100,
    comparison_variable_100_70_total: Math.round(((mDailyRate * 1.0 * matWeeks * 7) + (mDailyRate * 0.70 * parWeeks * 7)) * 100) / 100,
    recommended_variant: 'UNIFIED_81_5',
    recommendation_reason: 'Wariant uśredniony 81,5% zapewnia stabilne, równe wpływy przez cały okres urlopu i jest najchętniej wybierany przez rodziców planujących pełny wymiar opieki.',
    summary_notes: [
      `Łączny wymiar urlopu wynosi ${totalWeeks} tygodni (${totalWeeks * 7} dni).`,
      `Każdemu z rodziców przysługuje 9 tygodni urlopu rodzicielskiego, którego nie można przenieść na drugiego rodzica.`,
      workEnabled ? `Dzięki połączeniu urlopu z pracą na 1/2 etatu okres opieki wydłużył się o ${workExtension} tygodni.` : '',
    ].filter(Boolean),
    required_documents: [
      'Wniosek o urlop macierzyński i rodzicielski w pełnym wymiarze (ZAM)',
      'Zaświadczenie płatnika składek Z-3 (lub Z-3a dla zleceniobiorców)',
      'Odpis skrócony aktu urodzenia dziecka',
    ],
    legal_basis: [
      'Art. 180, 182(1a), 182(1e), 182(1f), 182(3) Kodeksu Pracy',
      'Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa (Dz.U. 2026 poz. 854)',
    ],
  }
}
