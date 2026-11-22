import { ViewHeader } from "../common/ViewHeader";
import { Sliders, Search, X, ShieldAlert, RotateCcw } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import {
  getAdminConfig,
  updateAdminConfig,
  resetAdminConfig,
} from "@/lib/api-client";
import type { AdminConfig } from "@/types/admin";

type CategoryKey =
  | "all"
  | "benefit_rates"
  | "benefit_amounts"
  | "leave_durations"
  | "periods_and_limits";

interface ParameterMeta {
  key: string;
  category:
    | "benefit_rates"
    | "benefit_amounts"
    | "leave_durations"
    | "periods_and_limits";
  categoryLabel: string;
  label: string;
  description: string;
  unit: string;
  step: string;
  min?: number;
}

const PARAMETERS_METADATA: ParameterMeta[] = [
  // --- 1. STOPY PROCENTOWE ŚWIADCZEŃ (10 parametrów) ---
  {
    key: "unified_benefit_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Zasiłek ujednolicony 81,5% – wniosek ZAM (art. 30a ust. 1)",
    description:
      "Jednolita stawka zasiłku macierzyńskiego i rodzicielskiego przy wniosku złożonym w ciągu 21 dni od porodu.",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "full_maternity_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Podstawowy zasiłek macierzyński (art. 31 ust. 1)",
    description:
      "Wysokość zasiłku macierzyńskiego w standardowym wariancie (100% podstawy).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "standard_parental_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Podstawowy zasiłek rodzicielski (art. 31 ust. 2)",
    description:
      "Wysokość zasiłku rodzicielskiego wariantu podstawowego (wniosek po 21 dniach).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "pregnancy_sick_leave_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Zasiłek chorobowy w trakcie ciąży – Kod B (art. 11 ust. 2)",
    description:
      "100% podstawy wymiaru zasiłku przy niezdolności do pracy przypadającej w okresie ciąży.",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "standard_sick_leave_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Standardowy zasiłek chorobowy (art. 11 ust. 1)",
    description:
      "Podstawowa stawka zasiłku chorobowego poza szpitalem (80% podstawy).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "paternity_benefit_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Zasiłek za urlop ojcowski (art. 182(3) KP)",
    description:
      "Wysokość świadczenia za 14 dni urlopu ojcowskiego (100% podstawy).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "rehabilitation_benefit_rate_first_3_months",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Świadczenie rehabilitacyjne – pierwsze 3 miesiące (art. 19 ust. 1)",
    description:
      "Wysokość świadczenia rehabilitacyjnego przez pierwsze 90 dni pobierania (90% podstawy).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "rehabilitation_benefit_rate_remaining",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Świadczenie rehabilitacyjne – pozostały okres (art. 19 ust. 1)",
    description:
      "Wysokość świadczenia od 4. miesiąca do końca okresu rehabilitacji (75% podstawy).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "rehabilitation_benefit_rate_pregnancy",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Świadczenie rehabilitacyjne w ciąży (art. 19 ust. 1)",
    description:
      "Wysokość świadczenia rehabilitacyjnego dla kobiety w ciąży (100% podstawy).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "social_contributions_rate",
    category: "benefit_rates",
    categoryLabel: "Stopy procentowe świadczeń (%)",
    label: "Wskaźnik potrącenia składek pracowniczych (art. 3 pkt 3)",
    description:
      "Ustawowe potrącenie 13,71% ze składki brutto pracownika przy wyznaczaniu podstawy zasiłkowej.",
    unit: "%",
    step: "0.01",
    min: 0,
  },

  // --- 2. KWOTY ŚWIADCZEŃ I PŁACA MINIMALNA (8 parametrów) ---
  {
    key: "min_wage_2026",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Minimalne wynagrodzenie za pracę (2026 r.)",
    description:
      "Ustawowe minimalne wynagrodzenie brutto w Polsce, stanowiące punkt odniesienia dla gwarancji i limitów.",
    unit: "zł",
    step: "1",
    min: 0,
  },
  {
    key: "min_benefit_base_uop",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Minimalna podstawa zasiłku dla UoP (art. 45 ust. 1)",
    description:
      "Ustawowa gwarancja minimalnej podstawy wymiaru zasiłku (płaca minimalna po potrąceniu 13,71%).",
    unit: "zł",
    step: "0.01",
    min: 0,
  },
  {
    key: "max_voluntary_sickness_base",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Maksymalna podstawa dobrowolnego chorobowego (JDG/zlecenie)",
    description:
      "Miesięczny limit podstawy dobrowolnego ubezpieczenia chorobowego (250% prognozowanego przeciętnego wynagrodzenia).",
    unit: "zł",
    step: "1",
    min: 0,
  },
  {
    key: "zus_debt_limit_percentage",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Dopuszczalny limit zadłużenia w ZUS (%)",
    description:
      "Maksymalna tolerancja zadłużenia na koncie płatnika jako procent płacy minimalnej (1%).",
    unit: "%",
    step: "0.1",
    min: 0,
  },
  {
    key: "zus_debt_limit",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Maksymalna kwota zadłużenia w ZUS nieblokująca świadczeń",
    description:
      "Próg kwotowy długu płatnika w ZUS (art. 29 ust. 2), poniżej którego zasiłek jest wypłacany.",
    unit: "zł",
    step: "0.01",
    min: 0,
  },
  {
    key: "za_zyciem_one_time_grant",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Jednorazowa zapomoga z ustawy „Za życiem”",
    description:
      "Wysokość jednorazowego wsparcia finansowego przy urodzeniu dziecka z ciężkim upośledzeniem.",
    unit: "zł",
    step: "1",
    min: 0,
  },
  {
    key: "death_grant_zus",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Zasiłek pogrzebowy podstawowy ZUS",
    description:
      "Ustawowa podstawowa kwota zasiłku pogrzebowego wypłacana przez ZUS.",
    unit: "zł",
    step: "1",
    min: 0,
  },
  {
    key: "funeral_allowance_special",
    category: "benefit_amounts",
    categoryLabel: "Kwoty świadczeń i płaca minimalna (PLN)",
    label: "Zasiłek pogrzebowy w przypadkach szczególnych",
    description:
      "Podwyższona kwota świadczenia pogrzebowego w warunkach szczególnych.",
    unit: "zł",
    step: "1",
    min: 0,
  },

  // --- 3. WYMIARY URLOPÓW (14 parametrów) ---
  {
    key: "maternity_weeks_single_child",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop macierzyński: 1 dziecko (art. 180 § 1 pkt 1 KP)",
    description:
      "Podstawowy wymiar urlopu macierzyńskiego w przypadku urodzenia jednego dziecka.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "maternity_weeks_twins",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop macierzyński: bliźnięta (art. 180 § 1 pkt 2 KP)",
    description:
      "Wymiar urlopu macierzyńskiego przy porodzie bliźniaczym (2 dzieci).",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "maternity_weeks_triplets",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop macierzyński: trojaczki (art. 180 § 1 pkt 3 KP)",
    description: "Wymiar urlopu macierzyńskiego przy urodzeniu trojga dzieci.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "maternity_weeks_quadruplets",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop macierzyński: czworaczki (art. 180 § 1 pkt 4 KP)",
    description: "Wymiar urlopu macierzyńskiego przy urodzeniu czworga dzieci.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "maternity_weeks_quintuplets_plus",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop macierzyński: pięcioraczki i więcej (art. 180 § 1 pkt 5 KP)",
    description:
      "Wymiar urlopu macierzyńskiego przy urodzeniu pięciorga i więcej dzieci.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "mandatory_mother_maternity_weeks",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Obligatoryjny macierzyński matki (art. 180 § 4 KP)",
    description:
      "Minimalna liczba tygodni po porodzie (14), którą matka musi bezwzględnie wykorzystać przed rezygnacją.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "parental_weeks_standard",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop rodzicielski standardowy – 1 dziecko (art. 182(1a) § 1 KP)",
    description:
      "Łączna pula urlopu rodzicielskiego dla obojga rodziców przy urodzeniu jednego dziecka.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "parental_weeks_multiple_birth",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop rodzicielski – poród mnogi (art. 182(1a) § 1 KP)",
    description:
      "Łączna pula urlopu rodzicielskiego dla rodziców przy porodzie mnogim.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "parental_weeks_za_zyciem_single",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop rodzicielski „Za życiem” – 1 dziecko (art. 182(1a) § 2 KP)",
    description:
      "Wydłużony wymiar urlopu rodzicielskiego przy zaświadczeniu o ciężkim upośledzeniu dziecka.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "parental_weeks_za_zyciem_multiple",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop rodzicielski „Za życiem” – poród mnogi (art. 182(1a) § 2 KP)",
    description:
      "Wydłużony wymiar rodzicielskiego przy ciąży mnogiej i zaświadczeniu „Za życiem”.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "non_transferable_parental_weeks",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Nieprzenoszalna część dla drugiego rodzica (WLB art. 182(1a) § 4)",
    description:
      "Część urlopu rodzicielskiego (9 tygodni), która przepada, jeśli nie zostanie wykorzystana przez drugiego rodzica.",
    unit: "tyg.",
    step: "1",
    min: 0,
  },
  {
    key: "paternity_leave_days",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Urlop ojcowski (art. 182(3) KP)",
    description:
      "Liczba dni kalendarzowych urlopu przysługująca wyłącznie ojcu wychowującemu dziecko.",
    unit: "dni",
    step: "1",
    min: 1,
  },
  {
    key: "max_parental_leave_parts",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Maksymalna liczba części rodzicielskiego (art. 182(1c) KP)",
    description:
      "Dopuszczalna liczba odrębnych części, na które pracownicy mogą podzielić urlop rodzicielski.",
    unit: "części",
    step: "1",
    min: 1,
  },
  {
    key: "stillbirth_maternity_weeks",
    category: "leave_durations",
    categoryLabel: "Ustawowe wymiary urlopów (Tygodnie / Dni)",
    label: "Macierzyński przy martwym urodzeniu (art. 180(1) KP)",
    description:
      "Wymiar urlopu macierzyńskiego w przypadku martwego urodzenia lub zgonu dziecka przed upływem 8 tygodni.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },

  // --- 4. OKRESY WYCZEKIWANIA, TERMINY I LIMITY (19 parametrów) ---
  {
    key: "mandatory_waiting_period_days",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label:
      "Okres wyczekiwania: UoP – ubezpieczenie obowiązkowe (art. 4 ust. 1)",
    description:
      "Wymagany okres nieprzerwanego ubezpieczenia chorobowego na umowie o pracę (30 dni).",
    unit: "dni",
    step: "1",
    min: 0,
  },
  {
    key: "voluntary_waiting_period_days",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Okres wyczekiwania: Zlecenie / JDG – dobrowolne (art. 4 ust. 1)",
    description:
      "Wymagany okres nieprzerwanego ubezpieczenia dla przedsiębiorców i zleceniobiorców (90 dni).",
    unit: "dni",
    step: "1",
    min: 0,
  },
  {
    key: "employer_sick_days_standard",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Dni wynagrodzenia chorobowego pracodawcy (art. 92 KP)",
    description:
      "Liczba dni niezdolności do pracy w roku kalendarzowym finansowana ze środków pracodawcy (do 50 lat).",
    unit: "dni",
    step: "1",
    min: 0,
  },
  {
    key: "employer_sick_days_senior",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Dni pracodawcy dla pracownika 50+ (art. 92 § 1 pkt 1 KP)",
    description:
      "Skrócona liczba dni finansowana przez pracodawcę po ukończeniu przez pracownika 50. roku życia.",
    unit: "dni",
    step: "1",
    min: 0,
  },
  {
    key: "senior_age_threshold",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Próg wieku seniora dla 14-dniowego limitu pracodawcy",
    description:
      "Granica wieku pracownika, od której zasiłek ZUS przysługuje już od 15. dnia niezdolności do pracy.",
    unit: "lat",
    step: "1",
    min: 1,
  },
  {
    key: "max_pregnancy_sick_leave_days",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Maksymalny okres zasiłkowy w ciąży – Kod B (art. 8)",
    description:
      "Maksymalna łączna liczba dni pobierania zasiłku chorobowego w okresie ciąży (270 dni).",
    unit: "dni",
    step: "1",
    min: 1,
  },
  {
    key: "max_standard_sick_leave_days",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Standardowy okres zasiłkowy chorobowego (art. 8)",
    description:
      "Maksymalny łączny czas pobierania standardowego zasiłku chorobowego (182 dni).",
    unit: "dni",
    step: "1",
    min: 1,
  },
  {
    key: "long_application_deadline_days",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Termin złożenia wniosku ZAM o wariant ujednolicony (art. 30a ust. 1)",
    description:
      "Nieprzekraczalny termin (21 dni od porodu) na złożenie wniosku o jednolity zasiłek 81,5%.",
    unit: "dni",
    step: "1",
    min: 1,
  },
  {
    key: "max_child_age_paternity_months",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Maksymalny wiek dziecka dla urlopu ojcowskiego (art. 182(3) KP)",
    description:
      "Wiek biologicznego dziecka, do ukończenia którego ojciec musi wykorzystać 14-dniowy urlop ojcowski.",
    unit: "mies.",
    step: "1",
    min: 1,
  },
  {
    key: "max_child_age_paternity_adoption_years",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Maksymalny wiek dziecka przysposobionego dla ojcowskiego",
    description:
      "Górny limit wieku adoptowanego dziecka dla prawa ojca do urlopu ojcowskiego (14 lat).",
    unit: "lat",
    step: "1",
    min: 1,
  },
  {
    key: "min_mother_weeks_before_transfer_special",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label:
      "Minimalny macierzyński matki w sytuacjach szczególnych (art. 180 § 10 KP)",
    description:
      "Minimalna liczba tygodni (8), po których matka przebywająca w szpitalu może przekazać opiekę ojcu.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "premature_extreme_week_threshold",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Próg skrajnego wcześniactwa – tydzień ciąży",
    description:
      "Tydzień zakończenia ciąży (do 28. tygodnia), kwalifikujący do urlopu uzupełniającego do 15 tygodni.",
    unit: "tydz. ciąży",
    step: "1",
    min: 1,
  },
  {
    key: "premature_extreme_weight_grams",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Próg wagi skrajnego wcześniactwa",
    description:
      "Urodzeniowa masa ciała dziecka (do 1000g), kwalifikująca do maksymalnego urlopu uzupełniającego.",
    unit: "gramów",
    step: "50",
    min: 100,
  },
  {
    key: "premature_extreme_max_supplementary_weeks",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Maksymalny uzupełniający urlop: skrajny wcześniak",
    description:
      "Maksymalny wymiar dodatkowego urlopu macierzyńskiego przy skrajnym wcześniactwie (15 tygodni).",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "premature_moderate_week_threshold",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Próg umiarkowanego wcześniactwa – tydzień ciąży",
    description:
      "Tydzień ciąży (do 36. tygodnia), kwalifikujący do dodatkowego urlopu macierzyńskiego do 8 tygodni.",
    unit: "tydz. ciąży",
    step: "1",
    min: 1,
  },
  {
    key: "premature_standard_max_supplementary_weeks",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Maksymalny uzupełniający urlop: standardowy wcześniak",
    description:
      "Maksymalny dodatkowy wymiar urlopu macierzyńskiego przy standardowym wcześniactwie (8 tygodni).",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
  {
    key: "adoption_child_standard_age_limit",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Standardowa granica wieku dziecka przy adopcji (art. 183 § 1 KP)",
    description:
      "Górna granica wieku przysposabianego dziecka (do 7 lat) dla pełnego urlopu na warunkach macierzyńskiego.",
    unit: "lat",
    step: "1",
    min: 1,
  },
  {
    key: "adoption_child_deferred_school_age_limit",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Granica wieku dziecka przy odroczeniu obowiązku szkolnego",
    description:
      "Maksymalny wiek dziecka przysposobionego z odroczonym obowiązkiem szkolnym (10 lat).",
    unit: "lat",
    step: "1",
    min: 1,
  },
  {
    key: "adoption_min_guaranteed_maternity_weeks",
    category: "periods_and_limits",
    categoryLabel: "Okresy wyczekiwania, terminy i limity",
    label: "Gwarantowany minimalny wymiar urlopu adopcyjnego (art. 183 § 3 KP)",
    description:
      "Minimalna gwarancja urlopu (9 tygodni) przy przysposobieniu starszego dziecka tuż przed limitem wieku.",
    unit: "tyg.",
    step: "1",
    min: 1,
  },
];

export const AdminView: React.FC = () => {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [initialConfig, setInitialConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getAdminConfig();
      setConfig(data);
      setInitialConfig(JSON.parse(JSON.stringify(data)));
    } catch (err: any) {
      setMessage({
        type: "error",
        text: `Nie udało się pobrać konfiguracji: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      // Synchronize duplicate compatibility fields in periods_and_limits
      const payload: AdminConfig = {
        ...config,
        periods_and_limits: {
          ...config.periods_and_limits,
          min_wage_2026: config.benefit_amounts.min_wage_2026,
          zus_debt_limit_percentage:
            config.benefit_amounts.zus_debt_limit_percentage,
          social_contributions_rate:
            config.benefit_rates.social_contributions_rate,
        },
      };

      const updated = await updateAdminConfig(payload);
      setConfig(updated);
      setInitialConfig(JSON.parse(JSON.stringify(updated)));
      setMessage({
        type: "success",
        text: "Zaktualizowano parametry ustawowe w locie (BE-03). Zmiany zostały zapisane w bazie JSON i obowiązują natychmiast.",
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: `Błąd podczas zapisywania parametrów: ${err.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Czy na pewno chcesz przywrócić wszystkie parametry prawne do fabrycznych wartości ustawowych?",
      )
    ) {
      return;
    }
    setResetting(true);
    setMessage(null);
    try {
      const resetData = await resetAdminConfig();
      setConfig(resetData);
      setInitialConfig(JSON.parse(JSON.stringify(resetData)));
      setMessage({
        type: "success",
        text: "Przywrócono fabryczne parametry ustawowe z pliku źródłowego ZUS. Zmiany obowiązują natychmiast.",
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: `Błąd podczas przywracania wartości domyślnych: ${err.message}`,
      });
    } finally {
      setResetting(false);
    }
  };

  const handleChange = (
    category:
      | "benefit_rates"
      | "benefit_amounts"
      | "leave_durations"
      | "periods_and_limits",
    field: string,
    val: number,
  ) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const updatedCategory = {
        ...prev[category],
        [field]: val,
      };

      const next = {
        ...prev,
        [category]: updatedCategory,
      };

      // Keep synchronized cross-category values
      if (category === "benefit_amounts" && field === "min_wage_2026") {
        next.periods_and_limits = {
          ...next.periods_and_limits,
          min_wage_2026: val,
        };
      }
      if (
        category === "benefit_amounts" &&
        field === "zus_debt_limit_percentage"
      ) {
        next.periods_and_limits = {
          ...next.periods_and_limits,
          zus_debt_limit_percentage: val,
        };
      }
      if (
        category === "benefit_rates" &&
        field === "social_contributions_rate"
      ) {
        next.periods_and_limits = {
          ...next.periods_and_limits,
          social_contributions_rate: val,
        };
      }

      return next;
    });
  };

  // Filtered parameters list based on active tab and search query
  const filteredParameters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return PARAMETERS_METADATA.filter((param) => {
      if (activeTab !== "all" && param.category !== activeTab) {
        return false;
      }
      if (!q) return true;
      return (
        param.label.toLowerCase().includes(q) ||
        param.key.toLowerCase().includes(q) ||
        param.description.toLowerCase().includes(q) ||
        param.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [activeTab, searchQuery]);

  // Count changes compared to initial state
  const changedKeys = useMemo(() => {
    if (!config || !initialConfig) return new Set<string>();
    const diffs = new Set<string>();
    PARAMETERS_METADATA.forEach((param) => {
      const currentVal = (config as any)?.[param.category]?.[param.key];
      const initialVal = (initialConfig as any)?.[param.category]?.[param.key];
      if (
        currentVal !== undefined &&
        initialVal !== undefined &&
        currentVal !== initialVal
      ) {
        diffs.add(param.key);
      }
    });
    return diffs;
  }, [config, initialConfig]);

  // Group filtered parameters by category
  const groupedParameters = useMemo(() => {
    const groups: { [key in CategoryKey]?: ParameterMeta[] } = {};
    filteredParameters.forEach((param) => {
      if (!groups[param.category]) {
        groups[param.category] = [];
      }
      groups[param.category]!.push(param);
    });
    return groups;
  }, [filteredParameters]);

  if (loading) {
    return (
      <div className="zus-view-container">
        <div className="zus-empty-placeholder">
          <p>Ładowanie konfiguracji parametrów prawnych ZUS z bazy...</p>
        </div>
      </div>
    );
  }

  const categoryTitles: Record<string, { title: string; count: number }> = {
    benefit_rates: {
      title: "1. Ustawowe Stopy Procentowe Świadczeń (%)",
      count: 10,
    },
    benefit_amounts: {
      title: "2. Kwoty Świadczeń, Płaca Minimalna i Limity Finansowe (PLN)",
      count: 8,
    },
    leave_durations: {
      title: "3. Ustawowe Wymiary Urlopów (Tygodnie / Dni)",
      count: 14,
    },
    periods_and_limits: {
      title: "4. Okresy Wyczekiwania, Terminy i Ograniczenia",
      count: 19,
    },
  };

  return (
    <div className="zus-view-container">
      {/* Header and Quick Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <ViewHeader
          title="Zarządzanie Parametrami Ustawowymi"
          description="Centralny panel konfiguracji stawek procentowych, kwot minimalnych, wymiarów urlopów oraz okresów wyczekiwania ZUS. Zmiany są natychmiast zapisywane w bazie i wpływają na wszystkie kalkulatory."
        />

        {/* Quick Stats & Action shortcuts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            paddingTop: "4px",
          }}
        >
          {changedKeys.size > 0 && (
            <span
              className="zus-auth-verified-pill"
              style={{
                backgroundColor: "var(--zus-orange-light, #fef5e9)",
                color: "var(--zus-orange-dark, #b86e0f)",
                borderColor: "var(--zus-orange, #F3A847)",
                textTransform: "none",
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
              }}
            >
              Zmienione parametry: {changedKeys.size}
            </span>
          )}
          <button
            type="button"
            className="zus-btn-secondary"
            onClick={handleReset}
            disabled={resetting || saving}
            title="Przywraca wszystkie wartości fabryczne z JSON"
            style={{
              fontSize: "0.88rem",
              padding: "8px 16px",
              borderRadius: "9999px",
            }}
          >
            {resetting ? "Przywracanie..." : "↺ Przywróć domyślne"}
          </button>
          <button
            type="button"
            className="zus-btn-primary"
            onClick={handleSave}
            disabled={saving || resetting}
            style={{
              fontSize: "0.88rem",
              padding: "8px 20px",
              borderRadius: "9999px",
            }}
          >
            {saving ? "Zapisywanie w API..." : "✓ Zapisz wszystkie zmiany"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className="zus-notice-box"
          style={{
            marginBottom: "20px",
            backgroundColor: message.type === "success" ? "#E6F4EC" : "#FEE2E2",
            border: `1px solid ${message.type === "success" ? "#007834" : "#EF4444"}`,
            color: message.type === "success" ? "#00441C" : "#991B1B",
            padding: "12px 16px",
            borderRadius: "6px",
          }}
        >
          <strong>{message.type === "success" ? "✓ " : "✕ "}</strong>
          {message.text}
        </div>
      )}

      {/* Navigation tabs & search bar */}
      <div
        className="zus-card"
        style={{
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid var(--zus-border)",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className={`zus-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Wszystkie parametry (51)
          </button>
          <button
            type="button"
            className={`zus-tab-btn ${activeTab === "benefit_rates" ? "active" : ""}`}
            onClick={() => setActiveTab("benefit_rates")}
          >
            Stopy procentowe (10)
          </button>
          <button
            type="button"
            className={`zus-tab-btn ${activeTab === "benefit_amounts" ? "active" : ""}`}
            onClick={() => setActiveTab("benefit_amounts")}
          >
            Kwoty i płaca minimalna (8)
          </button>
          <button
            type="button"
            className={`zus-tab-btn ${activeTab === "leave_durations" ? "active" : ""}`}
            onClick={() => setActiveTab("leave_durations")}
          >
            Wymiary urlopów (14)
          </button>
          <button
            type="button"
            className={`zus-tab-btn ${activeTab === "periods_and_limits" ? "active" : ""}`}
            onClick={() => setActiveTab("periods_and_limits")}
          >
            Okresy i limity (19)
          </button>
        </div>

        {/* Search input filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div
            style={{ position: "relative", width: "100%", maxWidth: "560px" }}
          >
            <input
              type="text"
              className="zus-input"
              placeholder="Filtruj parametry (np. 'wcześniak', '81.5', 'minimalne', 'ojcowski', 'zadłużenie')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "38px",
                paddingRight: "36px",
                fontSize: "0.92rem",
              }}
            />
            <Search
              className="size-4 text-[var(--zus-text-muted)]"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--zus-text-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--zus-text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            Znaleziono:{" "}
            <strong style={{ color: "var(--zus-text-main)" }}>
              {filteredParameters.length}
            </strong>{" "}
            parametrów
          </span>
        </div>
      </div>

      {/* Main Parameters Form */}
      <form onSubmit={handleSave}>
        {filteredParameters.length === 0 ? (
          <div
            className="zus-card"
            style={{ textAlign: "center", padding: "40px 20px" }}
          >
            <p style={{ color: "#6B7280", fontSize: "1rem", margin: 0 }}>
              Brak parametrów spełniających kryteria wyszukiwania:{" "}
              <strong>"{searchQuery}"</strong>
            </p>
            <button
              type="button"
              className="zus-btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
              style={{ marginTop: "16px" }}
            >
              Wyczyść filtry
            </button>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "28px" }}
          >
            {Object.entries(groupedParameters).map(([catKey, params]) => {
              if (!params || params.length === 0) return null;
              const meta = categoryTitles[catKey] || {
                title: catKey,
                count: params.length,
              };

              return (
                <div key={catKey} className="zus-card">
                  <div className="zus-card-header">
                    <div className="zus-card-header-title">
                      <Sliders className="size-5 text-[var(--zus-green)]" />
                      <span>{meta.title}</span>
                    </div>
                    <span
                      className="zus-auth-verified-pill"
                      style={{ textTransform: "none", letterSpacing: "normal" }}
                    >
                      {params.length} z {meta.count} parametrów
                    </span>
                  </div>

                  {/* 2-Column Responsive Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(340px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {params.map((param) => {
                      const currentValue =
                        (config as any)?.[param.category]?.[param.key] ?? 0;
                      const initialValue = (initialConfig as any)?.[
                        param.category
                      ]?.[param.key];
                      const isModified =
                        initialValue !== undefined &&
                        currentValue !== initialValue;

                      return (
                        <div
                          key={param.key}
                          style={{
                            padding: "16px",
                            backgroundColor: isModified
                              ? "var(--zus-orange-light, #fef5e9)"
                              : "#FFFFFF",
                            border: `1.5px solid ${isModified ? "var(--zus-orange, #F3A847)" : "var(--zus-border, #E2E8F0)"}`,
                            borderRadius: "var(--zus-radius-md, 6px)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "all 0.15s ease",
                            boxShadow: isModified
                              ? "0 2px 8px rgba(243, 168, 71, 0.15)"
                              : "none",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "8px",
                                marginBottom: "6px",
                              }}
                            >
                              <label
                                className="zus-label"
                                style={{
                                  fontSize: "0.92rem",
                                  fontWeight: 700,
                                  color: "#1A1A1A",
                                  margin: 0,
                                  lineHeight: 1.3,
                                }}
                              >
                                {param.label}
                              </label>
                              {isModified && (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor:
                                      "var(--zus-orange, #F3A847)",
                                    color: "#FFFFFF",
                                    padding: "2px 8px",
                                    borderRadius: "9999px",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`Poprzednia wartość: ${initialValue}`}
                                >
                                  Zmieniono ({initialValue} → {currentValue})
                                </span>
                              )}
                            </div>

                            <p
                              style={{
                                fontSize: "0.8rem",
                                color: "#4B5563",
                                margin: "0 0 10px 0",
                                lineHeight: 1.35,
                              }}
                            >
                              {param.description}
                            </p>

                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "#9CA3AF",
                                fontFamily: "monospace",
                                marginBottom: "10px",
                              }}
                            >
                              Klucz: <code>{param.key}</code>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div style={{ position: "relative", flex: 1 }}>
                              <input
                                type="number"
                                step={param.step}
                                min={param.min}
                                className="zus-input"
                                value={currentValue}
                                onChange={(e) =>
                                  handleChange(
                                    param.category,
                                    param.key,
                                    e.target.value === ""
                                      ? 0
                                      : Number(e.target.value),
                                  )
                                }
                                style={{
                                  width: "100%",
                                  paddingRight: "45px",
                                  fontWeight: 600,
                                  borderColor: isModified
                                    ? "#EAB308"
                                    : undefined,
                                }}
                              />
                              <span
                                style={{
                                  position: "absolute",
                                  right: "12px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#6B7280",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  pointerEvents: "none",
                                }}
                              >
                                {param.unit}
                              </span>
                            </div>

                            {isModified && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange(
                                    param.category,
                                    param.key,
                                    initialValue,
                                  )
                                }
                                title="Cofnij zmianę tego parametru"
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  backgroundColor:
                                    "var(--zus-card-alt, #F8FAFC)",
                                  border:
                                    "1px solid var(--zus-border, #CBD5E1)",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  color: "var(--zus-text-main, #1A1A1A)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <RotateCcw className="size-3.5 text-[var(--zus-text-muted)]" />
                                <span>Cofnij</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions Island */}
        <div
          className="zus-card"
          style={{
            marginTop: "28px",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div
            style={{ fontSize: "0.9rem", color: "var(--zus-text-secondary)" }}
          >
            Łącznie zmodyfikowanych wartości:{" "}
            <strong
              style={{
                color:
                  changedKeys.size > 0
                    ? "var(--zus-orange-dark, #b86e0f)"
                    : "var(--zus-green, #007834)",
                fontWeight: 800,
              }}
            >
              {changedKeys.size}
            </strong>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              className="zus-btn-secondary"
              onClick={handleReset}
              disabled={resetting || saving}
              style={{
                height: "40px",
                padding: "0 18px",
                borderRadius: "9999px",
              }}
            >
              {resetting
                ? "Przywracanie domyślnych..."
                : "↺ Przywróć fabryczne domyślne"}
            </button>
            <button
              type="submit"
              className="zus-btn-primary"
              disabled={saving || resetting}
              style={{
                height: "40px",
                padding: "0 22px",
                borderRadius: "9999px",
              }}
            >
              {saving
                ? "Zapisywanie w bazie ZUS..."
                : "Zapisz wszystkie zmiany w bazie ZUS >"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
