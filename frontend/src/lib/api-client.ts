import type { Explanation, InsuredUser } from "@/lib/types";
import { fallbackExplanation, glossary } from "@/lib/mock/glossary";
import type {
  IntegratedCalculatorInput,
  IntegratedCalculatorResult,
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
