/**
 * TypeScript Typings dla Panelu Admina (Konfiguracja Parametrów Prawnych ZUS)
 * Moduł: BE-03 / SETUP-06
 */

export interface StopyProcentowe {
  /** % zasiłku chorobowego w ciąży (kod B, domyślnie 100%) */
  stopa_chorobowy_kod_b: number;
  /** % standardowego zasiłku chorobowego (domyślnie 80%) */
  stopa_chorobowy_standard: number;
  /** % wniosek długi: macierzyński + rodzicielski w 21 dni (domyślnie 81.5%) */
  stopa_macierzynski_jednolity: number;
  /** % zasiłku macierzyńskiego standard (domyślnie 100%) */
  stopa_macierzynski_standard: number;
  /** % zasiłku rodzicielskiego standard (domyślnie 70%) */
  stopa_rodzicielski_standard: number;
  /** % zasiłku ojcowskiego (domyślnie 100%) */
  stopa_ojcowski: number;
  /** % świadczenie rehabilitacyjne pierwsze 3 m-ce (domyślnie 90%) */
  stopa_swiadczenie_rehab_1_3: number;
  /** % świadczenie rehabilitacyjne pozostałe m-ce (domyślnie 75%) */
  stopa_swiadczenie_rehab_pozostale: number;
  /** % świadczenie rehabilitacyjne w ciąży (domyślnie 100%) */
  stopa_swiadczenie_rehab_ciaza: number;
}

export interface WymiaryUrlopow {
  /** Tygodnie urlopu macierzyńskiego przy 1 dziecku (20) */
  urlop_macierzynski_1_dziecko_tygodnie: number;
  /** Tygodnie urlopu macierzyńskiego przy bliźniakach (31) */
  urlop_macierzynski_2_dzieci_tygodnie: number;
  /** Tygodnie urlopu macierzyńskiego przy trojaczkach (33) */
  urlop_macierzynski_3_dzieci_tygodnie: number;
  /** Tygodnie urlopu macierzyńskiego przy czworaczkach (35) */
  urlop_macierzynski_4_dzieci_tygodnie: number;
  /** Tygodnie urlopu macierzyńskiego przy pięcioraczkach i więcej (37) */
  urlop_macierzynski_5_plus_tygodnie: number;
  /** Obligatoryjne tygodnie macierzyńskiego dla matki (14) */
  urlop_macierzynski_obligatoryjny_matki_tygodnie: number;
  /** Tygodnie urlopu rodzicielskiego przy 1 dziecku (41) */
  urlop_rodzicielski_1_dziecko_tygodnie: number;
  /** Tygodnie urlopu rodzicielskiego przy ciąży mnogiej (43) */
  urlop_rodzicielski_wieloraczki_tygodnie: number;
  /** Nieprzenoszalne tygodnie dla drugiego rodzica z dyrektywy WLB (9) */
  urlop_rodzicielski_nieprzenoszalny_tygodnie: number;
  /** Dni urlopu ojcowskiego (14) */
  urlop_ojcowski_dni: number;
  /** Maksymalna liczba części urlopu rodzicielskiego (5) */
  max_czesci_urlopu_rodzicielskiego: number;
}

export interface OkresyILimity {
  /** Okres wyczekiwania na chorobowe UoP w dniach (30) */
  okres_wyczekiwania_uop_dni: number;
  /** Okres wyczekiwania na chorobowe dobrowolne zlecenie/JDG w dniach (90) */
  okres_wyczekiwania_dobrowolne_dni: number;
  /** Dni wynagrodzenia chorobowego płatnego przez pracodawcę (33) */
  dni_chorobowe_pracodawca_standard: number;
  /** Dni wynagrodzenia chorobowego płatnego przez pracodawcę po 50 r.ż. (14) */
  dni_chorobowe_pracodawca_50plus: number;
  /** Wiek progowy pracodawcy (50) */
  wiek_prog_pracodawca: number;
  /** Maksymalny okres pobierania chorobowego w ciąży w dniach (270) */
  max_okres_zasilkowy_ciaza_dni: number;
  /** Standardowy maksymalny okres chorobowego w dniach (182) */
  max_okres_zasilkowy_standard_dni: number;
  /** Limit wieku dziecka na urlop ojcowski w miesiącach (12) */
  limit_wieku_ojcowski_miesiace: number;
  /** Limit wieku dziecka adoptowanego na ojcowski w latach (14) */
  limit_wieku_adopcja_ojcowski_lat: number;
  /** Termin na złożenie wniosku o zasiłek 81.5% w dniach (21) */
  termin_wniosku_macierzynski_81_5_dni: number;
  /** Płaca minimalna brutto w 2026 r. (4806.00 zł) */
  placa_minimalna_2026: number;
  /** Składki społeczne potrącane z brutto w % (13.71%) */
  skladki_spoleczne_proc: number;
  /** Próg dopuszczalnego zadłużenia JDG w ZUS jako % płacy minimalnej (1.0%) */
  procent_zadluzenia_limit_zus: number;
}

/** Pełny obiekt konfiguracji zwracany przez GET /api/admin/config */
export interface AdminConfig {
  stopy_procentowe: StopyProcentowe;
  wymiary_urlopow: WymiaryUrlopow;
  okresy_i_limity: OkresyILimity;
}

/** Obiekt aktualizacji dla PUT /api/admin/config */
export interface AdminConfigUpdate {
  stopy_procentowe?: Partial<StopyProcentowe>;
  wymiary_urlopow?: Partial<WymiaryUrlopow>;
  okresy_i_limity?: Partial<OkresyILimity>;
}
