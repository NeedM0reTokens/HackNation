/**
 * Logika oceny uprawnień do świadczeń i zasiłków ZUS
 * Wykorzystywana zarówno w trybie ręcznym (filtry niezalogowanego),
 * jak i w trybie automatycznym (profil mObywatel / ZUS).
 */

export type UserRole =
  | 'mother_pregnancy'
  | 'mother_postpartum'
  | 'father'
  | 'adoption'
  | 'difficult';

export type EmploymentType = 'uop' | 'zlecenie' | 'jdg' | 'none';

export interface UserConditions {
  hasSicknessInsurance: boolean;
  waitingPeriodPassed: boolean;
  hasEZlaCodeB: boolean;
  hasZusDebt: boolean;
  isHospitalizedPremature: boolean;
  hasZaZyciemCertificate: boolean;
  jobLostBankruptcyOrEmployerFault?: boolean;
}

export interface CitizenEvaluationInput {
  role: UserRole | null;
  employment: EmploymentType | null;
  conditions: UserConditions;
  isLoggedIn?: boolean;
}

export interface BenefitItem {
  id: string;
  order: number;
  title: string;
  shortDescription: string;
  rate: string;
  duration: string;
  disbursingEntity: string;
  legalBasis: string;
  keyRules: string[];
  category: 'Chorobowe' | 'Macierzyńskie' | 'Rodzicielskie' | 'Opiekuńcze' | 'Wsparcie specjalne';
}

export interface BenefitEvaluationResult extends BenefitItem {
  isEligible: boolean;
  reason: string;
}

export const ALL_BENEFITS: BenefitItem[] = [
  {
    id: 'b1-wynagrodzenie-chorobowe-ciaza',
    order: 1,
    title: 'Wynagrodzenie chorobowe w ciąży',
    shortDescription: 'Świadczenie wypłacane przez pracodawcę za pierwsze 33 dni (lub 14 dni po 50. r.ż.) zwolnienia lekarskiego w roku kalendarzowym.',
    rate: '100% podstawy wymiaru',
    duration: 'Do 33 dni (lub 14 dni po 50. roku życia) w roku',
    disbursingEntity: 'Pracodawca',
    legalBasis: 'Art. 92 § 1 pkt 2 Kodeksu pracy',
    keyRules: [
      'Dotyczy wyłącznie pracowników na umowie o pracę (UoP).',
      'Płatne w wysokości 100% podstawy przy kodzie literowym B (ciąża).',
      'Wymaga upływu 30 dni nieprzerwanego ubezpieczenia chorobowego.',
    ],
    category: 'Chorobowe',
  },
  {
    id: 'b2-zasilek-chorobowy-ciaza',
    order: 2,
    title: 'Zasiłek chorobowy w ciąży (kod B, 100%)',
    shortDescription: 'Zasiłek chorobowy wypłacany od 34. dnia niezdolności (lub od 1. dnia dla zlecenia i JDG) przez wydłużony okres zasiłkowy.',
    rate: '100% podstawy wymiaru',
    duration: 'Do 270 dni nieprzerwanej niezdolności',
    disbursingEntity: 'ZUS (lub pracodawca powyżej 20 ubezpieczonych)',
    legalBasis: 'Art. 8, art. 9 i art. 11 ust. 2 pkt 1 Ustawy zasiłkowej',
    keyRules: [
      'Przysługuje przy e-ZLA z kodem „B” (stan ciąży).',
      'Wydłużony okres zasiłkowy aż do 270 dni (zamiast standardowych 182 dni).',
      'Wymaga objęcia ubezpieczeniem chorobowym (UoP obowiązkowo, zlecenie/JDG dobrowolnie).',
      'Przedsiębiorcy (JDG) nie mogą posiadać zadłużenia w ZUS przekraczającego 1% minimalnego wynagrodzenia.',
    ],
    category: 'Chorobowe',
  },
  {
    id: 'b3-swiadczenie-rehabilitacyjne',
    order: 3,
    title: 'Świadczenie rehabilitacyjne w ciąży',
    shortDescription: 'Wsparcie finansowe po wyczerpaniu pełnego okresu 270 dni zasiłku chorobowego, gdy dalsze leczenie rokuje odzyskanie zdolności do pracy.',
    rate: '100% podstawy wymiaru (w okresie ciąży)',
    duration: 'Do 12 miesięcy (360 dni)',
    disbursingEntity: 'ZUS',
    legalBasis: 'Art. 18 i art. 19 ust. 1 Ustawy zasiłkowej',
    keyRules: [
      'Przysługuje ubezpieczonej, która wykorzystała pełen limit 270 dni zasiłku chorobowego.',
      'Wysokość wynosi 100% podstawy, jeżeli niezdolność przypada na okres ciąży.',
      'Wymaga orzeczenia lekarza orzecznika ZUS o rokowaniu odzyskania sprawności.',
    ],
    category: 'Chorobowe',
  },
  {
    id: 'b4-zasilek-wysokosc-macierzynskiego-likwidacja',
    order: 4,
    title: 'Zasiłek w wysokości zasiłku macierzyńskiego',
    shortDescription: 'Świadczenie dla pracownic, których umowa o pracę wygasła z powodu likwidacji lub upadłości pracodawcy albo z naruszeniem prawa.',
    rate: '100% podstawy wymiaru',
    duration: 'Od dnia rozwiązania umowy do dnia porodu',
    disbursingEntity: 'ZUS',
    legalBasis: 'Art. 30 ust. 3 Ustawy zasiłkowej',
    keyRules: [
      'Gwarantuje ciągłość środków do dnia przewidywanego porodu.',
      'Dotyczy pracownic (UoP), które utraciły zatrudnienie w czasie ciąży z przyczyn niezależnych od nich.',
      'Wypłacany bezpośrednio przez ZUS na podstawie zaświadczenia o ciąży i świadectwa pracy.',
    ],
    category: 'Wsparcie specjalne',
  },
  {
    id: 'b5-zasilek-macierzynski-przed-porodem',
    order: 5,
    title: 'Zasiłek macierzyński przed porodem',
    shortDescription: 'Możliwość wcześniejszego rozpoczęcia korzystania z urlopu i zasiłku macierzyńskiego jeszcze przed narodzinami dziecka.',
    rate: '100% podstawy wymiaru',
    duration: 'Do 6 tygodni przed przewidywaną datą porodu',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 180 § 2 Kodeksu pracy oraz art. 29 Ustawy zasiłkowej',
    keyRules: [
      'Przysługuje ubezpieczonym matkom wnioskującym o urlop przed rozwiązaniem.',
      'Brak okresu karencji – prawo do zasiłku macierzyńskiego powstaje od pierwszego dnia ubezpieczenia.',
      'Okres wykorzystany przed porodem skraca wymiar urlopu macierzyńskiego po porodzie.',
    ],
    category: 'Macierzyńskie',
  },
  {
    id: 'b6-zasilek-macierzynski-po-porodzie',
    order: 6,
    title: 'Zasiłek macierzyński po porodzie (urlop macierzyński)',
    shortDescription: 'Podstawowe świadczenie pieniężne dla matki po narodzinach dziecka, gwarantujące płatny okres regeneracji i opieki.',
    rate: '100% lub uśrednione 81,5% (tzw. długi wniosek)',
    duration: 'Od 20 tygodni (jedno dziecko) do 37 tygodni (pięcioraczki)',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 180 Kodeksu pracy oraz art. 29 i 31 Ustawy zasiłkowej',
    keyRules: [
      'Brak okresu wyczekiwania – wystarczy podleganie ubezpieczeniu chorobowemu w dniu porodu.',
      'Pierwsze 14 tygodni przysługuje bezwzględnie matce (od 15. tygodnia część może przejąć ojciec).',
      'Złożenie wniosku w ciągu 21 dni po porodzie pozwala na uśrednioną stawkę 81,5% za cały okres macierzyńskiego i rodzicielskiego.',
    ],
    category: 'Macierzyńskie',
  },
  {
    id: 'b7-urlop-na-warunkach-macierzynskiego',
    order: 7,
    title: 'Zasiłek na warunkach urlopu macierzyńskiego (adopcja)',
    shortDescription: 'Świadczenie dla osób, które przyjęły dziecko na wychowanie w ramach przysposobienia lub rodziny zastępczej (niezawodowej).',
    rate: '100% lub uśrednione 81,5%',
    duration: '20–37 tygodni (minimum 9 tygodni bez względu na wiek dziecka)',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 183 Kodeksu pracy oraz art. 29 ust. 1 pkt 2–3 Ustawy zasiłkowej',
    keyRules: [
      'Wymaga wystąpienia do sądu opiekuńczego o wszczęcie postępowania adopcyjnego lub umowy o rodzinę zastępczą.',
      'Przysługuje do ukończenia 7. roku życia dziecka (lub 10. r.ż. przy odroczeniu szkolnym, do 14. r.ż. przy przysposobieniu).',
      'Równe uprawnienia zasiłkowe z biologicznymi rodzicami.',
    ],
    category: 'Macierzyńskie',
  },
  {
    id: 'b8-uzupelniajacy-urlop-macierzynski',
    order: 8,
    title: 'Uzupełniający urlop macierzyński (wcześniak / szpital)',
    shortDescription: 'Dodatkowy pełnopłatny urlop i zasiłek dla rodziców noworodków hospitalizowanych po porodzie lub urodzonych przedwcześnie.',
    rate: '100% podstawy wymiaru',
    duration: 'Do 8 lub do 15 tygodni dodatkowo (zależnie od tyg. ciąży i wagi)',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 180(1) i 180(2) Kodeksu pracy (regulacje 2025/2026)',
    keyRules: [
      'Dla dzieci urodzonych przed 28. tyg. ciąży lub masie <= 1000g: do 15 tygodni dodatkowo (tydzień za tydzień hospitalizacji).',
      'Dla dzieci urodzonych między 28. a 36. tyg. ciąży: do 8 tygodni dodatkowo.',
      'Przysługuje również rodzicom dzieci urodzonych o czasie wymagających hospitalizacji powyżej 2 dni.',
    ],
    category: 'Wsparcie specjalne',
  },
  {
    id: 'b9-zasilek-urlop-rodzicielski',
    order: 9,
    title: 'Zasiłek za okres urlopu rodzicielskiego',
    shortDescription: 'Urlop dla obojga rodziców do podziału, z gwarantowaną nieprzenoszalną częścią dla drugiego rodzica oraz opcją dla dzieci z orzeczeniem „Za życiem”.',
    rate: '70% podstawy (lub 81,5% przy wniosku w 21 dni)',
    duration: '41/43 tygodnie (lub aż 65/67 tygodni z zaświadczeniem „Za życiem”)',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 182(1a) Kodeksu pracy oraz Ustawa „Za życiem”',
    keyRules: [
      'Każdemu z rodziców przysługuje wyłączne, nieprzenoszalne prawo do 9 tygodni urlopu (płatne 70%).',
      'Możliwość łączenia korzystania z urlopu z pracą na część etatu (proporcjonalne wydłużenie urlopu).',
      'Posiadanie zaświadczenia „Za życiem” wydłuża łączny wymiar urlopu do 65 tygodni (jedno dziecko) lub 67 tygodni (ciąża mnoga).',
    ],
    category: 'Rodzicielskie',
  },
  {
    id: 'b10-zasilek-urlop-ojcowski',
    order: 10,
    title: 'Zasiłek za okres urlopu ojcowskiego (2 tygodnie)',
    shortDescription: 'Niezbywalne świadczenie przysługujące wyłącznie ubezpieczonemu ojcu na budowanie więzi z dzieckiem w pierwszym roku życia.',
    rate: '100% podstawy wymiaru',
    duration: '14 dni kalendarzowych (2 tygodnie)',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 182(3) Kodeksu pracy',
    keyRules: [
      'Wyłączne prawo ojca – nie przechodzi na matkę ani nie przepada na jej rzecz.',
      'Do wykorzystania do ukończenia przez dziecko 12. miesiąca życia (lub 12 m-cy od uprawomocnienia adopcji).',
      'Możliwość podziału na maksymalnie 2 równe części po 7 dni.',
    ],
    category: 'Rodzicielskie',
  },
  {
    id: 'b11-podwyzszenie-zasilku-do-swiadczenia-rodzicielskiego',
    order: 11,
    title: 'Podwyższenie zasiłku do kwoty świadczenia rodzicielskiego',
    shortDescription: 'Gwarancja minimalnej wysokości zasiłku macierzyńskiego na poziomie co najmniej kwoty świadczenia rodzicielskiego (1 000 zł netto).',
    rate: 'Dopłata do kwoty 1 000 zł netto miesięcznie',
    duration: 'Przez cały okres pobierania zasiłku macierzyńskiego',
    disbursingEntity: 'ZUS z urzędu (lub płatnik)',
    legalBasis: 'Art. 31 ust. 3f Ustawy zasiłkowej',
    keyRules: [
      'Jeśli miesięczna kwota zasiłku netto po potrąceniach jest niższa niż 1 000 zł, ZUS automatycznie dopłaca różnicę.',
      'Chroni osoby z niskimi podstawami wymiaru składek (część etatu, preferencyjny ZUS dla JDG).',
      'Nie wymaga składania odrębnego wniosku – wypłata następuje z urzędu.',
    ],
    category: 'Wsparcie specjalne',
  },
  {
    id: 'b12-jednorazowe-wyrownanie-do-100',
    order: 12,
    title: 'Jednorazowe wyrównanie zasiłku macierzyńskiego do 100%',
    shortDescription: 'Zwrot różnicy procentowej dla matki, która pobierała uśredniony zasiłek 81,5%, a nie wykorzystała urlopu rodzicielskiego.',
    rate: 'Dopłata wyrównawcza 18,5% za cały okres macierzyńskiego',
    duration: 'Wypłata jednorazowa po zakończeniu urlopu macierzyńskiego',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 31 ust. 4 Ustawy zasiłkowej',
    keyRules: [
      'Dotyczy matek, które złożyły wniosek w 21 dni o 81,5%, lecz nie skorzystały z ani jednego dnia urlopu rodzicielskiego w pierwszym roku życia dziecka.',
      'Zasiłek macierzyński zostaje przeliczony tak, jakby od początku przysługiwał w stawce 100%.',
      'Wypłacane na pisemny wniosek ubezpieczonej.',
    ],
    category: 'Macierzyńskie',
  },
  {
    id: 'b13-zasilek-martwe-urodzenie',
    order: 13,
    title: 'Zasiłek macierzyński przy martwym urodzeniu lub zgonie dziecka',
    shortDescription: 'Zabezpieczenie finansowe i czas na rekonwalescencję dla matki w dramatycznej sytuacji utraty dziecka.',
    rate: '100% podstawy wymiaru',
    duration: '8 tygodni (56 dni) od dnia zgonu / porodu',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 180(1) Kodeksu pracy oraz art. 29 Ustawy zasiłkowej',
    keyRules: [
      'Wymaga objęcia ubezpieczeniem chorobowym matki.',
      'Podstawą jest akt urodzenia z adnotacją o martwym urodzeniu (niezależnie od czasu trwania ciąży).',
      'Pracownica nie musi wykorzystywać zwolnienia lekarskiego – przysługuje pełny zasiłek macierzyński.',
    ],
    category: 'Wsparcie specjalne',
  },
  {
    id: 'b14-zasilek-pogrzebowy',
    order: 14,
    title: 'Zasiłek pogrzebowy (7 000 zł przy utracie dziecka)',
    shortDescription: 'Jednorazowe świadczenie z ubezpieczenia rentowego na pokrycie kosztów pochówku członka rodziny (w tym nienarodzonego dziecka).',
    rate: 'Jednorazowo 7 000 zł (zwaloryzowana stawka ustawowa)',
    duration: 'Wypłata jednorazowa',
    disbursingEntity: 'ZUS',
    legalBasis: 'Art. 77–81 Ustawy o emeryturach i rentach z FUS',
    keyRules: [
      'Przysługuje osobie, która pokryła koszty pogrzebu (rodzic ubezpieczony w ZUS, podlegający ubezpieczeniom rentowym).',
      'Przysługuje także przy urodzeniu martwym bez względu na tydzień ciąży (na podstawie karty zgonu/aktu urodzenia).',
      'Brak wymogu ubezpieczenia chorobowego – wystarczy ubezpieczenie emerytalno-rentowe (np. zlecenie, JDG, praca).',
    ],
    category: 'Wsparcie specjalne',
  },
  {
    id: 'b15-zasilek-opiekunczy',
    order: 15,
    title: 'Zasiłek opiekuńczy (opieka nad dzieckiem / członkiem rodziny)',
    shortDescription: 'Świadczenie za dni zwolnienia z pracy z powodu konieczności osobistej opieki nad chorym dzieckiem lub nagłego zamknięcia placówki.',
    rate: '80% podstawy wymiaru',
    duration: 'Do 60 dni w roku (dzieci do 14 lat) lub 14 dni (starsze/członkowie rodziny)',
    disbursingEntity: 'ZUS lub pracodawca',
    legalBasis: 'Art. 32–35 Ustawy zasiłkowej',
    keyRules: [
      'Brak okresu wyczekiwania – prawo od pierwszego dnia ubezpieczenia chorobowego.',
      'Przysługuje na opiekę nad chorym dzieckiem lub dzieckiem zdrowym do lat 8 (np. nagłe zamknięcie żłobka/przedszkola).',
      'Limit 60 dni przypada łącznie na oboje rodziców w roku kalendarzowym.',
    ],
    category: 'Opiekuńcze',
  },
  {
    id: 'b16-swiadczenie-rodzicielskie-kosiniakowe',
    order: 16,
    title: 'Świadczenie rodzicielskie („Kosiniakowe” / uposażenie)',
    shortDescription: 'Świadczenie dla rodziców, którzy nie są objęci ubezpieczeniem chorobowym i nie mają prawa do zasiłku macierzyńskiego z ZUS.',
    rate: '1 000 zł netto miesięcznie (nieopodatkowane)',
    duration: '52 tygodnie (jedno dziecko) do 71 tygodni (ciąża mnoga)',
    disbursingEntity: 'Urząd Gminy / Miasta / MOPS / GOPS',
    legalBasis: 'Art. 17c Ustawy o świadczeniach rodzinnych',
    keyRules: [
      'Dedykowane studentom, osobom bezrobotnym, pracującym na umowach o dzieło oraz ubezpieczonym w KRUS.',
      'Nie wymaga żadnego stażu pracy ani opłacania składek chorobowych.',
      'Wyklucza się z prawem do zasiłku macierzyńskiego – przysługuje tylko wtedy, gdy nie ma prawa do zasiłku z ZUS.',
    ],
    category: 'Rodzicielskie',
  },
];

/**
 * Główna czysta funkcja sprawdzająca kwalifikowalność każdego ze świadczeń.
 * Działa identycznie dla parametrów wybranych w formularzu (niezalogowany)
 * jak i dla profilu pobranego z ZUS/mObywatel (zalogowany).
 */
export function evaluateBenefits(input: CitizenEvaluationInput): BenefitEvaluationResult[] {
  const { role, employment, conditions } = input;
  const isUoP = employment === 'uop';
  const isZlecenie = employment === 'zlecenie';
  const isJdg = employment === 'jdg';
  const isNone = employment === 'none';

  const hasChorobowe = conditions.hasSicknessInsurance;
  const hasKarencja = conditions.waitingPeriodPassed;
  const hasEZlaB = conditions.hasEZlaCodeB;
  const hasDebt = conditions.hasZusDebt;
  const isHospital = conditions.isHospitalizedPremature;
  const isZaZyciem = conditions.hasZaZyciemCertificate;
  const isBankruptcy = Boolean(conditions.jobLostBankruptcyOrEmployerFault);

  // Blokada dla JDG w razie zadłużenia w składkach
  const jdgBlocked = isJdg && hasDebt;

  return ALL_BENEFITS.map((benefit) => {
    let isEligible = false;
    let reason = '';

    switch (benefit.id) {
      // 1. Wynagrodzenie chorobowe w ciąży (tylko UoP, pierwsze 33 dni)
      case 'b1-wynagrodzenie-chorobowe-ciaza': {
        if (!isUoP) {
          isEligible = false;
          reason = 'Wynagrodzenie chorobowe od pracodawcy dotyczy wyłącznie pracowników zatrudnionych na umowę o pracę (UoP).';
        } else if (!hasChorobowe) {
          isEligible = false;
          reason = 'Wymagane podleganie ubezpieczeniu chorobowemu.';
        } else if (!hasKarencja) {
          isEligible = false;
          reason = 'Nie minął 30-dniowy okres wyczekiwania (karencji) w ubezpieczeniu chorobowym.';
        } else if (!hasEZlaB) {
          isEligible = false;
          reason = 'Wymagane zaświadczenie lekarskie e-ZLA z kodem B (stan ciąży).';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – pracodawca wypłaca 100% wynagrodzenia za pierwsze 33 dni choroby w roku.';
        }
        break;
      }

      // 2. Zasiłek chorobowy w ciąży (100%, do 270 dni)
      case 'b2-zasilek-chorobowy-ciaza': {
        if (isNone) {
          isEligible = false;
          reason = 'Brak ubezpieczenia chorobowego – osoby bez tytułu ubezpieczeniowego nie mają prawa do zasiłku chorobowego.';
        } else if (!hasChorobowe) {
          isEligible = false;
          reason = 'Wymagane ubezpieczenie chorobowe (dla zleceniobiorców i przedsiębiorców jest ono dobrowolne).';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zadłużenie w składkach ZUS powyżej limitu ustawowego uniemożliwia wypłatę zasiłku przedsiębiorcy.';
        } else if (!hasKarencja) {
          isEligible = false;
          reason = 'Nie minął okres wyczekiwania (30 dni przy UoP lub 90 dni przy ubezpieczeniu dobrowolnym).';
        } else if (!hasEZlaB) {
          isEligible = false;
          reason = 'Wymagane aktywne zwolnienie e-ZLA z kodem B (ciąża).';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – przysługuje 100% podstawy wymiaru przez wydłużony okres do 270 dni.';
        }
        break;
      }

      // 3. Świadczenie rehabilitacyjne
      case 'b3-swiadczenie-rehabilitacyjne': {
        if (isNone || !hasChorobowe) {
          isEligible = false;
          reason = 'Wymagane podleganie ubezpieczeniu chorobowemu.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zadłużenie w składkach ZUS wstrzymuje wypłatę świadczeń rehabilitacyjnych.';
        } else if (!hasEZlaB && role !== 'difficult') {
          isEligible = false;
          reason = 'Wymaga udokumentowanej niezdolności do pracy z kodem B oraz wyczerpania 270 dni chorobowego.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – po wyczerpaniu 270 dni chorobowego przysługuje 100% podstawy (do 12 miesięcy).';
        }
        break;
      }

      // 4. Zasiłek w wysokości zasiłku macierzyńskiego (likwidacja/upadłość)
      case 'b4-zasilek-wysokosc-macierzynskiego-likwidacja': {
        if (!isUoP && !isBankruptcy) {
          isEligible = false;
          reason = 'Dotyczy pracownic (UoP), których stosunek pracy ustał z powodu likwidacji lub upadłości pracodawcy.';
        } else if (role !== 'mother_pregnancy' && role !== 'difficult' && !isBankruptcy) {
          isEligible = false;
          reason = 'Przysługuje pracownicy w okresie ciąży w razie rozwiązania umowy wskutek upadłości/likwidacji.';
        } else if (isBankruptcy || role === 'difficult') {
          isEligible = true;
          reason = 'Kwalifikujesz się – ZUS wypłaca świadczenie w wysokości zasiłku macierzyńskiego do dnia porodu.';
        } else {
          isEligible = false;
          reason = 'Wymaga rozwiązania umowy o pracę w ciąży z powodu likwidacji lub upadłości pracodawcy.';
        }
        break;
      }

      // 5. Zasiłek macierzyński przed porodem
      case 'b5-zasilek-macierzynski-przed-porodem': {
        if (role !== 'mother_pregnancy') {
          isEligible = false;
          reason = 'Zasiłek przed porodem dotyczy wyłącznie ciężarnej matki wnioskującej przed rozwiązaniem.';
        } else if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymagane objęcie ubezpieczeniem chorobowym w momencie wnioskowania.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zaległości w składkach ZUS przedsiębiorcy blokują wypłatę zasiłku macierzyńskiego.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – możesz rozpocząć zasiłek macierzyński do 6 tygodni przed datą porodu (100% podstawy).';
        }
        break;
      }

      // 6. Zasiłek macierzyński po porodzie (urlop macierzyński)
      case 'b6-zasilek-macierzynski-po-porodzie': {
        if (role === 'father') {
          isEligible = false;
          reason = 'Podstawowy zasiłek macierzyński bezpośrednio po porodzie (pierwsze 14 tyg.) przysługuje wyłącznie matce.';
        } else if (role === 'adoption') {
          isEligible = false;
          reason = 'Dla rodziców adopcyjnych dedykowany jest zasiłek na warunkach macierzyńskiego (pozycja 7).';
        } else if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Brak ubezpieczenia chorobowego – przysługuje Ci alternatywnie świadczenie rodzicielskie (1 000 zł).';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Posiadasz zadłużenie w składkach ZUS – ureguluj zaległości, aby otrzymać zasiłek macierzyński.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – przysługuje 100% podstawy lub uśrednione 81,5% za cały okres od dnia porodu.';
        }
        break;
      }

      // 7. Zasiłek na warunkach macierzyńskiego (adopcja)
      case 'b7-urlop-na-warunkach-macierzynskiego': {
        if (role !== 'adoption') {
          isEligible = false;
          reason = 'Przysługuje wyłącznie osobom przyjmującym dziecko na wychowanie w ramach adopcji lub rodziny zastępczej.';
        } else if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymagane ubezpieczenie chorobowe w dniu przyjęcia dziecka na wychowanie.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zadłużenie w ZUS wstrzymuje wypłatę zasiłku dla przedsiębiorcy.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – 20 do 37 tygodni płatnego 100% lub 81,5% zasiłku na warunkach macierzyńskiego.';
        }
        break;
      }

      // 8. Uzupełniający urlop macierzyński (wcześniak / hospitalizacja)
      case 'b8-uzupelniajacy-urlop-macierzynski': {
        if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymagane objęcie ubezpieczeniem chorobowym z prawem do zasiłku macierzyńskiego.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zadłużenie w ZUS uniemożliwia wypłatę świadczeń.';
        } else if (!isHospital && role !== 'difficult') {
          isEligible = false;
          reason = 'Wymaga przedwczesnego porodu lub hospitalizacji noworodka bezpośrednio po narodzinach.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – przysługuje dodatkowo do 8 lub 15 tygodni pełnopłatnego urlopu (100% podstawy).';
        }
        break;
      }

      // 9. Zasiłek za okres urlopu rodzicielskiego
      case 'b9-zasilek-urlop-rodzicielski': {
        if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymagane ubezpieczenie chorobowe rodzica w okresie korzystania z urlopu.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Wypłata zablokowana z powodu zaległości składkowych w ZUS.';
        } else {
          isEligible = true;
          if (isZaZyciem) {
            reason = 'Spełniasz warunki – z zaświadczeniem „Za życiem” wymiar wynosi aż 65 lub 67 tygodni (w tym 9 tyg. dla taty).';
          } else {
            reason = 'Spełniasz warunki – wymiar 41 lub 43 tygodni płatnych 70% lub 81,5% (z 9 tyg. dla drugiego rodzica).';
          }
        }
        break;
      }

      // 10. Zasiłek za okres urlopu ojcowskiego (2 tygodnie)
      case 'b10-zasilek-urlop-ojcowski': {
        if (role !== 'father') {
          isEligible = false;
          reason = 'Świadczenie jest wyłącznym, niezbywalnym prawem ubezpieczonego ojca dziecka.';
        } else if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Ojciec musi podlegać ubezpieczeniu chorobowemu w okresie wnioskowania o urlop ojcowski.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zadłużenie w ZUS ojca prowadzącego działalność blokuje wypłatę zasiłku.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – 14 dni kalendarzowych płatnych 100% podstawy do wykorzystania w 1. roku życia dziecka.';
        }
        break;
      }

      // 11. Podwyższenie zasiłku macierzyńskiego do 1 000 zł
      case 'b11-podwyzszenie-zasilku-do-swiadczenia-rodzicielskiego': {
        if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymaga nabycia prawa do zasiłku macierzyńskiego z ubezpieczenia chorobowego ZUS.';
        } else if (role === 'difficult') {
          isEligible = true;
          reason = 'Gwarancja minimalnego świadczenia – jeśli zasiłek macierzyński netto wyniesie <1 000 zł, ZUS podwyższy go do 1 000 zł.';
        } else {
          isEligible = true;
          reason = 'Gwarancja minimalnego świadczenia – w razie niskiej podstawy wymiaru ZUS z urzędu wyrówna zasiłek do 1 000 zł netto.';
        }
        break;
      }

      // 12. Jednorazowe wyrównanie zasiłku macierzyńskiego do 100%
      case 'b12-jednorazowe-wyrownanie-do-100': {
        if (role === 'father') {
          isEligible = false;
          reason = 'Wyrównanie dotyczy matki pobierającej zasiłek w stawce 81,5% i rezygnującej z urlopu rodzicielskiego.';
        } else if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymaga wcześniejszego pobierania zasiłku macierzyńskiego z ubezpieczenia chorobowego.';
        } else {
          isEligible = true;
          reason = 'Kwalifikujesz się potencjalnie – w razie rezygnacji z rodzicielskiego ZUS dopłaca różnicę do 100% za czas macierzyńskiego.';
        }
        break;
      }

      // 13. Zasiłek macierzyński w razie zgonu lub martwego urodzenia
      case 'b13-zasilek-martwe-urodzenie': {
        if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymaga objęcia matki ubezpieczeniem chorobowym w chwili porodu/zdarzenia.';
        } else if (role !== 'difficult' && role !== 'mother_pregnancy' && role !== 'mother_postpartum') {
          isEligible = false;
          reason = 'Świadczenie dotyczy sytuacji urodzenia martwego dziecka lub zgonu niemowlęcia.';
        } else if (role === 'difficult') {
          isEligible = true;
          reason = 'Spełniasz warunki – przysługuje 8 tygodni zasiłku macierzyńskiego płatnego 100% bez konieczności zwolnienia e-ZLA.';
        } else {
          isEligible = false;
          reason = 'Uruchamiane w sytuacji szczególnej (akt urodzenia z adnotacją o martwym urodzeniu – 8 tygodni 100%).';
        }
        break;
      }

      // 14. Zasiłek pogrzebowy (7 000 zł)
      case 'b14-zasilek-pogrzebowy': {
        if (role !== 'difficult') {
          isEligible = false;
          reason = 'Świadczenie przysługuje osobie, która poniosła udokumentowane koszty pochówku (w tym przy martwym urodzeniu).';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – jednorazowa kwota 7 000 zł na pokrycie kosztów pogrzebu z ubezpieczenia ZUS.';
        }
        break;
      }

      // 15. Zasiłek opiekuńczy
      case 'b15-zasilek-opiekunczy': {
        if (!hasChorobowe || isNone) {
          isEligible = false;
          reason = 'Wymagane ubezpieczenie chorobowe w chwili sprawowania osobistej opieki nad dzieckiem lub chorym bliskim.';
        } else if (jdgBlocked) {
          isEligible = false;
          reason = 'Zadłużenie w ZUS uniemożliwia wypłatę zasiłku opiekuńczego przedsiębiorcy.';
        } else {
          isEligible = true;
          reason = 'Spełniasz warunki – 80% podstawy bez okresu karencji od 1. dnia ubezpieczenia (do 60 dni w roku).';
        }
        break;
      }

      // 16. Świadczenie rodzicielskie („Kosiniakowe”)
      case 'b16-swiadczenie-rodzicielskie-kosiniakowe': {
        if (employment === null) {
          isEligible = false;
          reason = 'Wybierz formę zatrudnienia lub zaznacz brak ubezpieczenia, aby sprawdzić prawo do świadczenia.';
        } else if (hasChorobowe && !isNone) {
          isEligible = false;
          reason = 'Podlegasz ubezpieczeniu chorobowemu i masz prawo do zasiłku macierzyńskiego, co wyklucza świadczenie rodzicielskie.';
        } else {
          isEligible = true;
          reason = 'Kwalifikujesz się – tzw. „kosiniakowe” wynosi 1 000 zł miesięcznie netto przez 52 tygodnie dla osób bez zasiłku z ZUS.';
        }
        break;
      }

      default:
        isEligible = false;
        reason = 'Brak danych do weryfikacji uprawnienia.';
    }

    return {
      ...benefit,
      isEligible,
      reason,
    };
  });
}

/**
 * Standardowy profil zalogowanego użytkownika (symulacja profilu Anna Kowalska z mObywatel/ZUS).
 */
export const MOCK_LOGGED_IN_PROFILE: CitizenEvaluationInput = {
  role: 'mother_pregnancy',
  employment: 'uop',
  conditions: {
    hasSicknessInsurance: true,
    waitingPeriodPassed: true,
    hasEZlaCodeB: true,
    hasZusDebt: false,
    isHospitalizedPremature: false,
    hasZaZyciemCertificate: false,
    jobLostBankruptcyOrEmployerFault: false,
  },
  isLoggedIn: true,
};
