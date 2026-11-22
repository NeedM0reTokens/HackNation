import type { Explanation, InsuredUser } from "@/lib/types";
import { fallbackExplanation, glossary } from "@/lib/mock/glossary";
import type {
  IntegratedCalculatorInput,
  IntegratedCalculatorResult,
  RiskAnalysisRequest,
  RiskAnalysisResponse,
} from "@/types/calculator";
import type {
  PaternityLeaveInput,
  PaternityLeaveResult,
  MaternityTransferInput,
  MaternityTransferResult,
  ParentalSharingInput,
  ParentalSharingResult,
} from "@/types/paternity";
import type {
  ParentalWorkInput,
  ParentalWorkResult,
} from "@/types/parental_work";
import type { AdoptionLeaveInput, AdoptionLeaveResult } from "@/types/adoption";
import type {
  SpecialCasesInput,
  SpecialCasesResult,
} from "@/types/special_cases";
import type {
  MaternityParentalInput,
  MaternityParentalResult,
} from "@/types/maternity";
import type {
  ApplicationCategory,
  ApplicationType,
  ApplicationTemplateInfo,
  ApplicationPrefillRequest,
  ApplicationPrefillResponse,
  ApplicationCreateRequest,
  ApplicationDetailResponse,
  SubmissionRequest,
  SubmissionConfirmation,
} from "@/types/applications";

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

/**
 * Dedykowany błąd rzucany w przypadku braku połączenia z backendem ZUS.
 * Zawiera precyzyjną informację o brakującym endpointcie oraz komendach uruchomienia.
 */
export class BackendOfflineError extends Error {
  public readonly endpoint: string;
  public readonly statusCode?: number;

  constructor(endpoint: string, originalError?: any, statusCode?: number) {
    const detail = originalError?.message ? ` (${originalError.message})` : "";
    const statusText = statusCode ? ` [Kod HTTP ${statusCode}]` : "";
    super(
      `Brak połączenia z backendem ZUS (${endpoint})${statusText}${detail}. Upewnij się, że usługa backendu działa (np. w kontenerze Docker: docker compose up -d backend lub lokalnie: DEV_AUTH_BYPASS=true uvicorn src.main:app --port 8000 na http://127.0.0.1:8000).`,
    );
    this.name = "BackendOfflineError";
    this.endpoint = endpoint;
    this.statusCode = statusCode;
  }
}

const mockUser: InsuredUser = {
  firstName: "Anna",
  lastName: "Kowalska",
  peselMasked: "92•••••••45",
};

let storedAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  storedAuthToken = token;
  if (token) {
    try {
      localStorage.setItem("zus_auth_token", token);
    } catch {}
  } else {
    try {
      localStorage.removeItem("zus_auth_token");
    } catch {}
  }
}

export function getAuthToken(): string | null {
  if (storedAuthToken) return storedAuthToken;
  try {
    return localStorage.getItem("zus_auth_token");
  } catch {
    return null;
  }
}

function getHeaders(
  customHeaders: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// 1. Sprawdzenie statusu backendu
export async function checkHealth(): Promise<{
  status: string;
  message: string;
  version?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      status: "offline",
      message:
        "Brak aktywnego połączenia z backendem (http://127.0.0.1:8000). Uruchom: docker compose up -d backend",
      version: "offline",
    };
  }
}

// 2. Pobranie stawek kalkulatora
export async function getAllowanceRates() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculator/config`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      maternity_parental_option_uniform: 81.5,
      maternity_standard: 100.0,
      parental_standard: 70.0,
      pregnancy_sick_leave: 100.0,
      father_paternity_days: 14,
      non_transferable_parental_weeks: 9,
    };
  }
}

export interface MobywatelIdentity {
  pesel: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  role: string;
  label: string;
}

export async function getMobywatelIdentities(): Promise<MobywatelIdentity[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/mobywatel/identities`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Nie udało się pobrać tożsamości z backendu, użycie listy zapasowej:", err);
  }
  return [
    {
      pesel: "92011501234",
      first_name: "Anna",
      last_name: "Kowalska",
      date_of_birth: "1992-01-15",
      email: "anna.kowalska@obywatel.gov.pl",
      role: "user",
      label: "Anna Kowalska - Przyszła Matka (UoP, Ciąża)",
    },
    {
      pesel: "89032005678",
      first_name: "Piotr",
      last_name: "Zieliński",
      date_of_birth: "1989-03-20",
      email: "piotr.zielinski@obywatel.gov.pl",
      role: "user",
      label: "Piotr Zieliński - Przyszły Ojciec (UoP, Ojcowski)",
    },
    {
      pesel: "95081012345",
      first_name: "Karolina",
      last_name: "Wiśniewska",
      date_of_birth: "1995-08-10",
      email: "karolina.wisniewska@obywatel.gov.pl",
      role: "user",
      label: "Karolina Wiśniewska - Zleceniobiorca (Dobrowolne chorobowe)",
    },
    {
      pesel: "85040398765",
      first_name: "Tomasz",
      last_name: "Lewandowski",
      date_of_birth: "1985-04-03",
      email: "tomasz.lewandowski@obywatel.gov.pl",
      role: "user",
      label: "Tomasz Lewandowski - Przedsiębiorca (JDG, Zaległość ZUS)",
    },
    {
      pesel: "99010155555",
      first_name: "Julia",
      last_name: "Dąbrowska",
      date_of_birth: "1999-01-01",
      email: "julia.dabrowska@obywatel.gov.pl",
      role: "user",
      label: "Julia Dąbrowska - Brak ubezpieczenia (Obywatel)",
    },
    {
      pesel: "80051209876",
      first_name: "Marek",
      last_name: "Nowak",
      date_of_birth: "1980-05-12",
      email: "admin.nowak@zus.pl",
      role: "admin",
      label: "Marek Nowak - Inspektor ZUS (Administrator)",
    },
  ];
}

// 3. Logowanie przez mObywatel
export async function loginWithMObywatel(pesel: string = "92011501234"): Promise<{
  user: InsuredUser;
  simulation?: any;
  token?: string;
}> {
  try {
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/mobywatel/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesel }),
    });
    if (!loginRes.ok) throw new Error(`HTTP ${loginRes.status}`);
    const tokenData = await loginRes.json();
    if (tokenData.access_token) {
      setAuthToken(tokenData.access_token);
    }

    let simData: any = null;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/simulation/profile/${encodeURIComponent(pesel)}`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );
      if (res.ok) {
        simData = await res.json();
      }
    } catch {
      // Ignorujemy brak profilu w symulacji
    }

    const firstName = simData?.first_name || tokenData.user?.first_name || "Obywatel";
    const lastName = simData?.last_name || tokenData.user?.last_name || "";
    const cleanPesel = pesel.replace(/\D/g, "");
    const masked =
      cleanPesel.length === 11
        ? `${cleanPesel.slice(0, 2)}•••••••${cleanPesel.slice(-2)}`
        : cleanPesel;

    return {
      user: {
        firstName,
        lastName,
        peselMasked: masked,
        pesel: cleanPesel,
        role: tokenData.user?.role || "user",
        email: tokenData.user?.email,
        simulation: simData,
      },
      simulation: simData,
      token: tokenData.access_token,
    };
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/auth/mobywatel/login", err);
  }
}

// 4. Kalkulator zasiłku chorobowego w ciąży (POST /api/calculators/pregnancy)
export interface PregnancyBenefitPayload {
  employment_type: "EMPLOYMENT_CONTRACT" | "MANDATE_CONTRACT" | "B2B";
  gross_monthly_income: number;
  insurance_duration_days: number;
  sick_leave_duration_days: number;
  pregnancy_week?: number;
  payer_size?: "UP_TO_20" | "ABOVE_20";
  company_status?:
    | "NORMAL"
    | "BANKRUPTCY_OR_LIQUIDATION"
    | "UNLAWFUL_TERMINATION";
  is_rehabilitation_benefit?: boolean;
  rehabilitation_benefit_months?: number;
  prior_sick_leave_days_in_year?: number;
  age?: number;
  zus_debt_amount?: number;
}

export async function calculatePregnancyBenefit(
  payload: PregnancyBenefitPayload,
) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/pregnancy`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        ...payload,
        is_code_b: true,
        payer_size: payload.payer_size ?? "ABOVE_20",
        company_status: payload.company_status ?? "NORMAL",
        prior_sick_leave_days_in_year:
          payload.prior_sick_leave_days_in_year ?? 0,
        age: payload.age ?? 30,
        zus_debt_amount: payload.zus_debt_amount ?? 0,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      is_eligible: data.is_eligible,
      benefit_rate_percent: data.benefit_percentage ?? 100.0,
      daily_gross_benefit:
        data.daily_rate ??
        Math.round(
          (data.total_amount / (payload.sick_leave_duration_days || 1)) * 100,
        ) / 100,
      total_gross_benefit: data.total_amount ?? 0,
      total_net_benefit:
        Math.round((data.total_amount || 0) * 0.88 * 100) / 100,
      payer:
        data.disbursing_entity === "ZUS"
          ? "ZUS"
          : data.disbursing_entity === "EMPLOYER"
            ? "Pracodawca (powyżej 20 ubezpieczonych)"
            : "Pracodawca (pierwsze 33 dni), potem ZUS",
      protection_status:
        (data.legal_notes && data.legal_notes[0]) ||
        "Pełna ochrona stosunku pracy na mocy art. 177 Kodeksu pracy.",
      max_benefit_days: data.max_coverage_days ?? 270,
    };
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/calculators/pregnancy", err);
  }
}

// 5. Kalkulator zasiłku macierzyńskiego i rodzicielskiego (POST /api/calculators/maternity-parental)
export async function calculateMaternityParental(
  payload: MaternityParentalInput,
): Promise<MaternityParentalResult> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/calculators/maternity-parental`,
      {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError(
      "POST /api/calculators/maternity-parental",
      err,
    );
  }
}

// 6. BE-21: Pełny zintegrowany kalkulator rodzicielski z osią czasu
export async function calculateIntegratedParental(
  payload: IntegratedCalculatorInput,
): Promise<IntegratedCalculatorResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculator/parental`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Alias test
      const aliasRes = await fetch(
        `${API_BASE_URL}/api/calculators/integrated`,
        {
          method: "POST",
          headers: getHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        },
      );
      if (!aliasRes.ok) throw new Error(`HTTP ${res.status}`);
      return await aliasRes.json();
    }
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/calculator/parental", err);
  }
}

// 6b. Analiza ryzyk i czerwonych flag ZUS z backendu
export async function analyzeRisksApi(
  payload: RiskAnalysisRequest,
): Promise<RiskAnalysisResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculator/risks`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/calculator/risks", err);
  }
}

// 7. Presety kalkulatora dla zakładek UI
export interface CalculatorPreset {
  key: string;
  title: string;
  description: string;
  tab: "macierzynski" | "ojcowski" | "praca" | "podzial" | "adopcja";
  target_endpoint: string;
  default_payload: Record<string, any>;
}

const DEFAULT_PRESETS: CalculatorPreset[] = [
  {
    key: "maternity_standard",
    title: "Urlop macierzyński i rodzicielski (Standard)",
    description:
      "Jedno dziecko, umowa o pracę, porównanie wariantu 81,5% z 100%/70%.",
    tab: "macierzynski",
    target_endpoint: "/api/calculators/maternity-parental",
    default_payload: {
      gross_monthly_income: 8000.0,
      children_born_count: 1,
      applied_within_21_days: true,
      chosen_variant: "UNIFIED_81_5",
    },
  },
  {
    key: "paternity",
    title: "Urlop ojcowski (14 dni)",
    description:
      "14 dni płatne 100% dla ojca, do wykorzystania w 1 lub 2 częściach.",
    tab: "ojcowski",
    target_endpoint: "/api/calculators/paternity-leave",
    default_payload: {
      gross_monthly_income: 9000.0,
      child_age_months: 2,
    },
  },
  {
    key: "parental_work",
    title: "Łączenie rodzicielskiego z pracą na 1/2 etatu",
    description:
      "Praca na max 1/2 etatu z proporcjonalnym wydłużeniem urlopu do 64 tygodni.",
    tab: "praca",
    target_endpoint: "/api/calculators/parental-work-combination",
    default_payload: {
      gross_monthly_income: 8000.0,
      work_fraction: 0.5,
      parental_weeks_to_combine: 32,
      benefit_rate_percentage: 70.0,
    },
  },
  {
    key: "parental_sharing",
    title: "Podział urlopu rodzicielskiego między rodziców",
    description:
      "Podział 32 tygodnie matka + 9 tygodni nieprzenoszalnych ojciec.",
    tab: "podzial",
    target_endpoint: "/api/calculators/parental-sharing",
    default_payload: {
      mother_gross_income: 7000.0,
      father_gross_income: 8500.0,
      mother_parental_weeks: 32,
      father_parental_weeks: 9,
      chosen_variant: "UNIFIED_81_5",
    },
  },
  {
    key: "adoption",
    title: "Urlop na warunkach macierzyńskiego (Adopcja)",
    description:
      "Przysposobienie dziecka do 14. roku życia z gwarancją płatnego urlopu.",
    tab: "adopcja",
    target_endpoint: "/api/calculators/adoption-leave",
    default_payload: {
      gross_monthly_income: 7500.0,
      child_age_years: 3,
      caregiver_type: "ADOPTION",
      chosen_variant: "UNIFIED_81_5",
    },
  },
];

export async function getCalculatorPresets(): Promise<CalculatorPreset[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/presets`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.presets ?? DEFAULT_PRESETS;
  } catch {
    return DEFAULT_PRESETS;
  }
}

export async function getCalculatorPresetByKey(
  presetKey: string,
): Promise<CalculatorPreset | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/calculators/presets/${presetKey}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const presets = await getCalculatorPresets();
    return presets.find((p) => p.key === presetKey) ?? null;
  }
}

// 8. Urlop ojcowski (BE-16: POST /api/calculators/paternity-leave)
export async function calculatePaternityLeave(
  payload: PaternityLeaveInput,
): Promise<PaternityLeaveResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/paternity-leave`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/calculators/paternity-leave", err);
  }
}

// 9. Przejęcie macierzyńskiego przez ojca (BE-17: POST /api/calculators/maternity-transfer)
export async function calculateMaternityTransfer(
  payload: MaternityTransferInput,
): Promise<MaternityTransferResult> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/calculators/maternity-transfer`,
      {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError(
      "POST /api/calculators/maternity-transfer",
      err,
    );
  }
}

export type SpecialCasesPayload = SpecialCasesInput;

// 10. Symulacja podziału opieki między oboje rodziców (BE-18: POST /api/calculators/parental-sharing)
export async function calculateParentalSharing(
  payload: ParentalSharingInput,
): Promise<ParentalSharingResult> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/calculators/parental-sharing`,
      {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError(
      "POST /api/calculators/parental-sharing",
      err,
    );
  }
}

// 11. Łączenie rodzicielskiego z pracą na max 1/2 etatu (BE-19: POST /api/calculators/parental-work-combination)
export async function calculateParentalWorkCombination(
  payload: ParentalWorkInput,
): Promise<ParentalWorkResult> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/calculators/parental-work-combination`,
      {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError(
      "POST /api/calculators/parental-work-combination",
      err,
    );
  }
}

// 12. Rodzice adopcyjni i rodzina zastępcza (BE-20: POST /api/calculators/adoption-leave)
export async function calculateAdoptionLeave(
  payload: AdoptionLeaveInput,
): Promise<AdoptionLeaveResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculators/adoption-leave`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/calculators/adoption-leave", err);
  }
}

// 13. Przypadki szczególne (Wcześniak, Za Życiem, Zgon dziecka)
export async function calculateSpecialCases(
  payload: SpecialCasesInput,
): Promise<SpecialCasesResult> {
  try {
    const formattedPayload = {
      ...payload,
      is_stillbirth:
        payload.case_type === "STILLBIRTH_OR_DEATH"
          ? true
          : payload.is_stillbirth,
      has_za_zyciem_certificate:
        payload.case_type === "ZA_ZYCIEM"
          ? true
          : payload.has_za_zyciem_certificate,
    };

    const res = await fetch(`${API_BASE_URL}/api/calculators/special-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedPayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      benefit_rate_percent:
        data.case_type === "PREMATURE_HOSPITALIZATION"
          ? 100.0
          : data.case_type === "ZA_ZYCIEM"
            ? 70.0
            : 100.0,
      funeral_allowance_amount:
        data.case_type === "STILLBIRTH_OR_DEATH"
          ? data.one_time_grant_pln || 4000
          : undefined,
      description:
        data.description || "Świadczenie wyliczone zgodnie z przepisami ZUS.",
      required_documents: data.required_documents || [],
    };
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/calculators/special-cases", err);
  }
}

// 14. Parser dokumentów PDF ZUS (POST /api/pdf/parse)
export async function parsePdfDocument(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/api/pdf/parse`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/pdf/parse", err);
  }
}

// 15. Panel Administratora (GET / PUT /api/admin/config)
export async function getAdminConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/config`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("GET /api/admin/config", err);
  }
}

export async function updateAdminConfig(payload: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/config`, {
      method: "PUT",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new BackendOfflineError("PUT /api/admin/config", err);
  }
}

// 16. Asystent i wyjaśnienia AI (Google Gemini API)
export interface AssistantStatus {
  is_configured: boolean;
  model: string;
  provider: string;
}

export async function getAssistantStatus(): Promise<AssistantStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assistant/status`, {
      method: "GET",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Could not reach /api/assistant/status", err);
  }
  return {
    is_configured: false,
    model: "gemini-2.0-flash",
    provider: "Google Gemini AI",
  };
}

export async function askAssistantApi(
  message: string,
  history?: { role: string; content: string }[],
  userContext?: Record<string, any>,
): Promise<Explanation> {
  if (!message.trim()) {
    throw new Error("Brak treści pytania");
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/assistant/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: history?.map((h) => ({ role: h.role, content: h.content })),
        user_context: userContext,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      id: data.id || `ai-${Date.now()}`,
      title: data.title || "Odpowiedź Asystenta AI ZUS",
      summary: data.summary,
      details: data.details || [],
      legalBasis: data.legal_basis || undefined,
    };
  } catch (err: any) {
    throw new BackendOfflineError("POST /api/assistant/ask", err);
  }
}

export async function getExplanation(topicId: string): Promise<Explanation> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/assistant/explain/${encodeURIComponent(topicId)}`,
      {
        method: "GET",
      },
    );
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        title: data.title,
        summary: data.summary,
        details: data.details || [],
        legalBasis: data.legal_basis || undefined,
      };
    }
  } catch (err) {
    console.warn("Backend explain endpoint offline, using local glossary", err);
  }
  return glossary[topicId] ?? fallbackExplanation;
}

// ============================================================================
// MODUŁ WNIOSKÓW I FORMULARZY (MRPiPS 2025 / ZUS)
// ============================================================================

export async function fetchApplicationTemplates(
  category?: ApplicationCategory
): Promise<ApplicationTemplateInfo[]> {
  try {
    const url = category
      ? `${API_BASE_URL}/api/applications/templates?category=${category}`
      : `${API_BASE_URL}/api/applications/templates`
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('[Applications API] Błąd pobierania szablonów, używam danych domyślnych', err)
    return [
      {
        type: 'UNIFIED_MATERNITY_PARENTAL_81_5',
        category: 'EMPLOYER_LEAVE',
        title: 'Jednolity wniosek o urlop macierzyński i rodzicielski (81,5%)',
        legal_basis: 'Art. 179[1] Kodeksu pracy i Rozporządzenie MRPiPS z 11 marca 2025 r.',
        recipient_type: 'EMPLOYER',
        deadline_description: 'Do 21 dni po porodzie',
        description: 'Długi wniosek pracownicy składany do pracodawcy gwarantujący stałą stawkę 81,5% za cały okres urlopu.',
        required_attachments: [
          {
            code: 'BIRTH_CERTIFICATE',
            title: 'Skrócony odpis aktu urodzenia dziecka',
            description: 'Dokument z USC potwierdzający urodzenie dziecka.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: '§ 18 ust. 1 Rozporządzenia MRPiPS z 11 marca 2025 r.',
          },
          {
            code: 'OTHER_PARENT_DECLARATION',
            title: 'Oświadczenie drugiego rodzica',
            description: 'Oświadczenie ojca o braku korzystania z urlopu rodzicielskiego w tym samym okresie.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: '§ 19 ust. 2 pkt 3 Rozporządzenia MRPiPS z 11 marca 2025 r.',
          },
        ],
        is_custom_designed: true,
      },
      {
        type: 'PATERNITY_LEAVE',
        category: 'EMPLOYER_LEAVE',
        title: 'Wniosek o urlop ojcowski (14 dni, 100%)',
        legal_basis: 'Art. 182[3] Kodeksu pracy',
        recipient_type: 'EMPLOYER',
        deadline_description: 'Co najmniej 7 dni przed rozpoczęciem urlopu',
        description: 'Wniosek pracownika-ojca o 14 dni urlopu ojcowskiego płatnego 100%.',
        required_attachments: [
          {
            code: 'BIRTH_CERTIFICATE',
            title: 'Skrócony odpis aktu urodzenia dziecka',
            description: 'Dokument z USC potwierdzający pokrewieństwo.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: '§ 21 ust. 1 pkt 1 Rozporządzenia MRPiPS z 11 marca 2025 r.',
          },
        ],
        is_custom_designed: true,
      },
      {
        type: 'SUPPLEMENTARY_MATERNITY_LEAVE',
        category: 'EMPLOYER_LEAVE',
        title: 'Wniosek o uzupełniający urlop macierzyński (wcześniaki / hospitalizacja)',
        legal_basis: 'Art. 180[1] Kodeksu pracy',
        recipient_type: 'EMPLOYER',
        deadline_description: 'Co najmniej 21 dni przed zakończeniem urlopu macierzyńskiego',
        description: 'Dodatkowy urlop macierzyński dla rodziców hospitalizowanych noworodków (do 15 tygodni).',
        required_attachments: [
          {
            code: 'HOSPITAL_CERTIFICATE',
            title: 'Zaświadczenie szpitala o okresie hospitalizacji',
            description: 'Karta leczenia szpitalnego potwierdzająca pobyt dziecka.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: 'Art. 180[1] § 5 Kodeksu pracy',
          },
        ],
        is_custom_designed: true,
      },
      {
        type: 'PARENTAL_WORK_COMBINATION',
        category: 'EMPLOYER_LEAVE',
        title: 'Wniosek o łączenie urlopu rodzicielskiego z pracą do 1/2 etatu',
        legal_basis: 'Art. 182[1e] Kodeksu pracy',
        recipient_type: 'EMPLOYER',
        deadline_description: 'Co najmniej 21 dni przed planowanym podjęciem pracy',
        description: 'Wniosek o wykonywanie pracy u dotychczasowego pracodawcy z proporcjonalnym wydłużeniem urlopu rodzicielskiego.',
        required_attachments: [
          {
            code: 'WORK_SCHEDULE_PROPOSAL',
            title: 'Propozycja rozkładu czasu pracy',
            description: 'Wskazanie wymiaru (np. 1/2 etatu) i grafiku pracy.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: 'Art. 182[1e] § 2 Kodeksu pracy',
          },
        ],
        is_custom_designed: true,
      },
      {
        type: 'ZUS_ZAM',
        category: 'ZUS_BENEFIT',
        title: 'ZAM - Wniosek o zasiłek macierzyński za okres macierzyńskiego i rodzicielskiego',
        legal_basis: 'Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego',
        recipient_type: 'ZUS',
        deadline_description: 'Do 21 dni po porodzie',
        description: 'Zunifikowany druk ZUS o wypłatę zasiłku macierzyńskiego składany przez PUE/eZUS.',
        required_attachments: [
          {
            code: 'BIRTH_CERTIFICATE',
            title: 'Skrócony odpis aktu urodzenia',
            description: 'Dokument z USC potwierdzający urodzenie dziecka.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: 'Rozporządzenie Ministra Rodziny i Polityki Społecznej',
          },
        ],
        is_custom_designed: false,
        official_form_number: 'ZAM',
      },
      {
        type: 'ZUS_ZAS_53',
        category: 'ZUS_BENEFIT',
        title: 'ZAS-53 - Wniosek o zasiłek chorobowy / macierzyński (JDG)',
        legal_basis: 'Ustawa zasiłkowa z 25 czerwca 1999 r.',
        recipient_type: 'ZUS',
        deadline_description: 'W okresie trwania niezdolności do pracy / urlopu',
        description: 'Druk ZUS składany przez osoby prowadzące pozarolniczą działalność gospodarczą.',
        required_attachments: [],
        is_custom_designed: false,
        official_form_number: 'ZAS-53',
      },
      {
        type: 'USC_BIRTH_CERTIFICATE_SHORT',
        category: 'USC_CIVIL_ACT',
        title: 'Wniosek o wydanie odpisu skróconego aktu urodzenia dziecka (Rejestr Stanu Cywilnego)',
        legal_basis: 'Art. 44 i 45 ustawy z dnia 28 listopada 2014 r. - Prawo o aktach stanu cywilnego w zw. z art. 2 ust. 1 pkt 1 lit. c ustawy o opłacie skarbowej',
        recipient_type: 'USC',
        deadline_description: 'W dowolnym momencie po sporządzeniu aktu (kluczowy do wniosku ZAM)',
        description: 'Elektroniczny wniosek przez portal gov.pl / ePUAP o wydanie odpisu skróconego aktu urodzenia z centralnego Rejestru Stanu Cywilnego. Bezpłatnie (0 zł) na cele zasiłkowe ZUS.',
        required_attachments: [
          {
            code: 'IDENTITY_VERIFICATION',
            title: 'Elektroniczna weryfikacja tożsamości rodzica (Profil Zaufany / mObywatel)',
            description: 'Potwierdzenie uprawnienia rodzica do pobrania odpisu (art. 45 PASC).',
            is_mandatory: true,
            is_provided: true,
            legal_basis: 'Art. 45 ustawy - Prawo o aktach stanu cywilnego',
          },
          {
            code: 'FEE_EXEMPTION_DECLARATION',
            title: 'Wskazanie ustawowego zwolnienia z opłaty skarbowej (0 zł)',
            description: 'Zwolnienie na cele świadczeń socjalnych i zasiłków ZUS.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: 'Art. 2 ust. 1 pkt 1 lit. c ustawy o opłacie skarbowej',
          },
        ],
        is_custom_designed: false,
        official_form_number: 'USC-RSC-SKR',
      },
      {
        type: 'USC_BIRTH_CERTIFICATE_FULL',
        category: 'USC_CIVIL_ACT',
        title: 'Wniosek o wydanie odpisu zupełnego aktu urodzenia dziecka (Rejestr Stanu Cywilnego)',
        legal_basis: 'Art. 44 i 45 ustawy z dnia 28 listopada 2014 r. - Prawo o aktach stanu cywilnego w zw. z art. 2 ust. 1 pkt 1 lit. c ustawy o opłacie skarbowej',
        recipient_type: 'USC',
        deadline_description: 'W dowolnym momencie po sporządzeniu aktu (pełna treść ze wzmiankami)',
        description: 'Wniosek o odpis zupełny zawierający pełną treść aktu urodzenia wraz ze wzmiankami marginesowymi. Wydawany bez opłaty skarbowej (0 zł) na cele ubezpieczeniowe.',
        required_attachments: [
          {
            code: 'IDENTITY_VERIFICATION',
            title: 'Elektroniczna weryfikacja tożsamości rodzica (Profil Zaufany / mObywatel)',
            description: 'Potwierdzenie uprawnienia rodzica do pobrania odpisu.',
            is_mandatory: true,
            is_provided: true,
            legal_basis: 'Art. 45 ustawy - Prawo o aktach stanu cywilnego',
          },
        ],
        is_custom_designed: false,
        official_form_number: 'USC-RSC-ZUP',
      },
    ]
  }
}

export async function prefillApplication(
  req: ApplicationPrefillRequest
): Promise<ApplicationPrefillResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/applications/prefill`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('[Applications API] Błąd prefill, generuję dane lokalne', err)
    const today = new Date().toISOString().split('T')[0]
    const nextYear = new Date(Date.now() + 364 * 86400000).toISOString().split('T')[0]
    return {
      application_type: req.application_type || 'UNIFIED_MATERNITY_PARENTAL_81_5',
      template_info: {
        type: req.application_type || 'UNIFIED_MATERNITY_PARENTAL_81_5',
        category: 'EMPLOYER_LEAVE',
        title: 'Wniosek o urlop macierzyński i rodzicielski (81,5%)',
        legal_basis: 'Art. 179[1] KP w zw. z art. 30a ustawy zasiłkowej',
        recipient_type: 'EMPLOYER',
        deadline_description: 'Do 21 dni po porodzie',
        description: 'Formularz pracowniczy składany do pracodawcy.',
        required_attachments: [],
        is_custom_designed: true,
      },
      applicant: {
        first_name: 'Anna',
        last_name: 'Kowalska',
        pesel: '92011501234',
        address_street: 'ul. Marszałkowska 10/12',
        address_postal_code: '00-001',
        address_city: 'Warszawa',
        phone_number: '+48 601 234 567',
        email: 'anna.kowalska@example.com',
      },
      employer: {
        company_name: 'TechPol Sp. z o.o.',
        nip: '5250001090',
        address_street: 'Al. Jerozolimskie 100',
        address_postal_code: '02-001',
        address_city: 'Warszawa',
        payer_size: 'ABOVE_20',
      },
      child: {
        first_name: 'Jan',
        last_name: 'Kowalski',
        date_of_birth: today,
        birth_certificate_number: 'AU/2026/09812',
        usc_city: 'Warszawa-Śródmieście',
      },
      leave_period: {
        start_date: today,
        end_date: nextYear,
        weeks_count: 52,
        days_count: 364,
        selected_rate_variant: req.selected_variant || 'UNIFIED_81_5',
      },
      required_attachments: [
        {
          code: 'BIRTH_CERTIFICATE',
          title: 'Skrócony odpis aktu urodzenia dziecka',
          description: 'Odpis z USC potwierdzający urodzenie dziecka.',
          is_mandatory: true,
          is_provided: true,
          legal_basis: '§ 18 ust. 1 Rozporządzenia MRPiPS z 11 marca 2025 r.',
        },
        {
          code: 'OTHER_PARENT_DECLARATION',
          title: 'Oświadczenie drugiego rodzica',
          description: 'Pisemne oświadczenie ojca o braku zamiaru korzystania z urlopu.',
          is_mandatory: true,
          is_provided: true,
          legal_basis: '§ 19 ust. 2 pkt 3 Rozporządzenia MRPiPS z 11 marca 2025 r.',
        },
      ],
      advisory_notes: [
        'Wniosek składany w terminie 21 dni od dnia porodu uprawnia do stawki 81,5% za cały okres.',
        'Pracodawca jest prawnie związany wnioskiem pracownicy i nie może odmówić jego uwzględnienia.',
      ],
    }
  }
}

export async function createApplication(
  req: ApplicationCreateRequest
): Promise<ApplicationDetailResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/applications`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('[Applications API] Błąd create, generuję odpowiedź zastępczą', err)
    const appId = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`
    return {
      id: appId,
      application_type: req.application_type,
      category: req.application_type.startsWith('ZUS_') ? 'ZUS_BENEFIT' : 'EMPLOYER_LEAVE',
      title: req.application_type.startsWith('ZUS_')
        ? 'ZAM - Wniosek o zasiłek macierzyński'
        : 'Wniosek pracownicy o udzielenie urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze',
      legal_basis: 'Art. 179[1] Kodeksu pracy w zw. z art. 30a ustawy zasiłkowej',
      recipient_header: req.employer?.company_name || 'Zakład Ubezpieczeń Społecznych',
      created_at: new Date().toISOString(),
      status: 'DRAFT',
      applicant: req.applicant,
      employer: req.employer,
      child: req.child,
      leave_period: req.leave_period,
      required_attachments: [
        {
          code: 'BIRTH_CERTIFICATE',
          title: 'Skrócony odpis aktu urodzenia dziecka',
          description: 'Załącznik obowiązkowy',
          is_mandatory: true,
          is_provided: true,
          legal_basis: 'Rozporządzenie MRPiPS z 11 marca 2025 r.',
        },
      ],
      formal_content_text: `Warszawa, dnia ${new Date().toISOString().split('T')[0]} r.\n\nWnioskodawca: ${req.applicant.first_name} ${req.applicant.last_name}\nPESEL: ${req.applicant.pesel}\n\nDo Pracodawcy:\n${req.employer?.company_name || 'Pracodawca'}\n\nWNIOSEK O UDZIELENIE URLOPU MACIERZYŃSKIEGO I RODZICIELSKIEGO\n\nNiniejszym wnoszę o udzielenie urlopu w wymiarze ${req.leave_period.weeks_count} tygodni (${req.leave_period.days_count} dni) w okresie od ${req.leave_period.start_date} do ${req.leave_period.end_date}.\n\nDane dziecka: ${req.child?.first_name || 'Dziecko'} (ur. ${req.child?.date_of_birth || '---'}).`,
    }
  }
}

export async function getApplication(appId: string): Promise<ApplicationDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/api/applications/${appId}`, {
    method: 'GET',
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function submitApplication(
  appId: string,
  subReq: SubmissionRequest
): Promise<SubmissionConfirmation> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/submit`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(subReq),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('[Applications API] Błąd submit, generuję potwierdzenie symulowane', err)
    const isEmployer = subReq.destination !== 'ZUS' && !subReq.delivery_channel?.includes('EZUS')
    const caseNr = isEmployer
      ? `KADR/2026/05/${Math.floor(1000 + Math.random() * 9000)}`
      : `ZUS-PUE-2026-92011501234-${Math.floor(10000 + Math.random() * 90000)}`
    const upoCode = isEmployer
      ? `UPO-KADR-E8F19B-${Date.now().toString().slice(-6)}`
      : `UPPO-ZUS-7A1C8F-${Date.now().toString().slice(-6)}`

    return {
      application_id: appId,
      case_number: caseNr,
      submitted_at: new Date().toISOString(),
      recipient_name: isEmployer ? 'TechPol Sp. z o.o. (Dział Kadr)' : 'Zakład Ubezpieczeń Społecznych (eZUS)',
      channel: subReq.delivery_channel || (isEmployer ? 'PORTAL_PRACOWNICZY' : 'PUE_EZUS'),
      status: isEmployer ? 'SUBMITTED_TO_EMPLOYER' : 'SUBMITTED_TO_ZUS',
      upo_reference_code: upoCode,
      next_steps: isEmployer
        ? [
            'Wniosek zarejestrowany w Dziale Kadr i Płac pracodawcy.',
            'Złożenie wniosku gwarantuje szczególną ochronę przed wypowiedzeniem (art. 177 K.p.).',
            'Płatnik powyżej 20 ubezpieczonych nalicza i wypłaca zasiłek we własnym zakresie.',
          ]
        : [
            'Wniosek przyjęty przez Elektroniczną Skrzynkę Podawczą ZUS.',
            'Wygenerowano Urzędowe Poświadczenie Przedłożenia (UPPO).',
            'ZUS dokona weryfikacji prawa do zasiłku w terminie do 30 dni.',
          ],
      legal_notices: [
        'Złożenie wniosku wiąże pracodawcę z mocy przepisów Kodeksu pracy.',
        'Wypłata świadczenia następuje na wskazany numer rachunku bankowego.',
      ],
    }
  }
}

export function getApplicationPdfUrl(appId: string, download: boolean = true): string {
  return `${API_BASE_URL}/api/applications/${appId}/pdf?download=${download}`
}

export async function downloadApplicationPdfBlob(appId: string): Promise<Blob> {
  const res = await fetch(getApplicationPdfUrl(appId, true), {
    method: 'GET',
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.blob()
}
