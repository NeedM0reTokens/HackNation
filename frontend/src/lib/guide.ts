import { addWeeks } from './format'

export type Role = 'mother' | 'father' | 'guardian'
export type Employment = 'uop' | 'zlecenie' | 'jdg'
export type PaymentVariant = 'standard' | 'single'

export type GuideInput = {
  role: Role
  employment: Employment
  sicknessInsurance: boolean
  insuredDays: number
  dueDate: string
  grossSalary: number
  premature: boolean
  zaZyciem: boolean
  includePartner?: boolean
  partnerGrossSalary?: number
  pregnancySickLeave?: boolean
  pregnancySickLeaveDays?: number
}

export type ResultOptions = {
  variant: PaymentVariant
  partTime: boolean
}

export const SOCIAL_CONTRIBUTION_RATE = 0.1371
export const PIT_ADVANCE_RATE = 0.12
export const MIN_BENEFIT = 1000

export const defaultGuideInput: GuideInput = {
  role: '' as Role,
  employment: '' as Employment,
  sicknessInsurance: false,
  insuredDays: 0,
  dueDate: '',
  grossSalary: 0,
  premature: false,
  zaZyciem: false,
  includePartner: false,
  partnerGrossSalary: 0,
  pregnancySickLeave: false,
  pregnancySickLeaveDays: 30,
}

export const defaultResultOptions: ResultOptions = { variant: 'standard', partTime: false }

export const roleLabels: Record<Role, string> = {
  mother: 'Matka',
  father: 'Ojciec',
  guardian: 'Opiekun',
}

export const employmentLabels: Record<Employment, string> = {
  uop: 'Umowa o pracę',
  zlecenie: 'Umowa zlecenie',
  jdg: 'Działalność (JDG)',
}

const employmentShort: Record<Employment, string> = {
  uop: 'UoP',
  zlecenie: 'umowie zlecenie',
  jdg: 'JDG',
}

export function waitingPeriodDays(employment?: Employment | null) {
  if (employment === 'uop') return 30
  if (employment === 'zlecenie' || employment === 'jdg') return 90
  return 30
}

export function hasSicknessInsurance(input: GuideInput) {
  if (!input.employment) return false
  return input.employment === 'uop' || Boolean(input.sicknessInsurance)
}

export type Qualification = {
  eligible: boolean
  headline: string
  reason: string
}

export function qualify(input: GuideInput): Qualification {
  if (!input.role || !input.employment || input.grossSalary === undefined || input.grossSalary === null || Number(input.grossSalary) < 0) {
    return {
      eligible: false,
      headline: 'Wypełnij dane',
      reason: 'Wybierz rolę wnioskodawcy, tytuł ubezpieczenia oraz podaj wynagrodzenie brutto, aby zweryfikować uprawnienia.',
    }
  }

  if (Number(input.insuredDays) < 0) {
    return {
      eligible: false,
      headline: 'Nieprawidłowy staż ubezpieczenia',
      reason: 'Staż ubezpieczenia nie może być ujemny.',
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  if (input.dueDate && input.dueDate < todayStr) {
    return {
      eligible: false,
      headline: 'Nieprawidłowa data',
      reason: 'Planowana data nie może być z przeszłości.',
    }
  }

  const waiting = waitingPeriodDays(input.employment)
  if (!hasSicknessInsurance(input)) {
    return {
      eligible: false,
      headline: 'Brak dobrowolnego ubezpieczenia chorobowego',
      reason: 'Brak zgłoszenia do ubezpieczenia chorobowego. Bez niego ZUS nie wypłaci zasiłku macierzyńskiego ani ojcowskiego.',
    }
  }

  const days = Number(input.insuredDays) || 0
  if (days < waiting) {
    return {
      eligible: true,
      headline: 'Prawo do zasiłku macierzyńskiego (0 dni karencji)',
      reason: `Zasiłek macierzyński/ojcowski przysługuje od 1. dnia ubezpieczenia. Uwaga: na zwolnienie lekarskie L4 przed porodem obowiązuje okres wyczekiwania ${waiting} dni (posiadasz ${days} dni).`,
    }
  }

  return {
    eligible: true,
    headline: 'Kwalifikacja pozytywna – pełne prawo do świadczeń',
    reason: `Masz prawo do zasiłku macierzyńskiego od 1. dnia oraz spełniasz warunek ${waiting} dni okresu wyczekiwania dla zasiłku chorobowego na ${employmentShort[input.employment] || 'wybranej umowie'}.`,
  }
}

export type BenefitPhase = {
  id: string
  label: string
  weeks: number
  ratePercent: number
  monthlyGross: number
}

export type Calculation = {
  assessmentBase: number
  monthlyGross: number
  monthlyNet: number
  followUpMonthlyGross: number | null
  totalWeeks: number
  totalGross: number
  phases: BenefitPhase[]
  variantAvailable: boolean
}

function monthly(base: number, rate: number, partTimeFactor = 1) {
  return Math.max((base * rate) / 100, MIN_BENEFIT) * partTimeFactor
}

function phaseTotal(phase: BenefitPhase) {
  return (phase.monthlyGross / 30) * phase.weeks * 7
}

export function parentalPool(input: GuideInput) {
  return input.zaZyciem ? 65 : 41
}

export function calculate(input: GuideInput, options: ResultOptions): Calculation {
  const assessmentBase = Math.max(0, input.grossSalary * (1 - SOCIAL_CONTRIBUTION_RATE))
  const partTimeFactor = options.partTime ? 0.5 : 1
  const durationFactor = options.partTime ? 2 : 1
  const phases: BenefitPhase[] = []

  if (input.role === 'father') {
    phases.push({
      id: 'paternity',
      label: 'Urlop ojcowski',
      weeks: 2,
      ratePercent: 100,
      monthlyGross: monthly(assessmentBase, 100),
    })
    phases.push({
      id: 'parental-father',
      label: options.partTime ? 'Urlop rodzicielski taty + praca na 1/2 etatu' : 'Urlop rodzicielski taty (9 tyg.)',
      weeks: 9 * durationFactor,
      ratePercent: 70 * partTimeFactor,
      monthlyGross: monthly(assessmentBase, 70, partTimeFactor),
    })
  } else {
    const single = options.variant === 'single'
    const maternityRate = single ? 81.5 : 100
    const parentalRate = single ? 81.5 : 70
    phases.push({
      id: 'maternity',
      label: input.role === 'guardian' ? 'Urlop na warunkach macierzyńskiego' : 'Urlop macierzyński',
      weeks: 20,
      ratePercent: maternityRate,
      monthlyGross: monthly(assessmentBase, maternityRate),
    })
    if (input.premature && input.role === 'mother') {
      phases.push({
        id: 'premature',
        label: 'Uzupełniający urlop macierzyński (wcześniak)',
        weeks: 8,
        ratePercent: 100,
        monthlyGross: monthly(assessmentBase, 100),
      })
    }
    phases.push({
      id: 'parental',
      label: options.partTime ? 'Urlop rodzicielski + praca na 1/2 etatu' : 'Urlop rodzicielski',
      weeks: (parentalPool(input) - 9) * durationFactor,
      ratePercent: parentalRate * partTimeFactor,
      monthlyGross: monthly(assessmentBase, parentalRate, partTimeFactor),
    })
  }

  const first = phases[0]
  const last = phases[phases.length - 1]
  return {
    assessmentBase,
    monthlyGross: first.monthlyGross,
    monthlyNet: first.monthlyGross * (1 - PIT_ADVANCE_RATE),
    followUpMonthlyGross: last.monthlyGross !== first.monthlyGross ? last.monthlyGross : null,
    totalWeeks: phases.reduce((sum, phase) => sum + phase.weeks, 0),
    totalGross: phases.reduce((sum, phase) => sum + phaseTotal(phase), 0),
    phases,
    variantAvailable: input.role !== 'father',
  }
}

export type Milestone = {
  id: string
  date: string
  title: string
  description: string
  kind: 'deadline' | 'milestone'
}

function addMonths(iso: string, months: number) {
  const date = new Date(iso)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function buildMilestones(input: GuideInput, calc: Calculation): Milestone[] {
  const start = input.dueDate
  if (input.role === 'father') {
    return [
      {
        id: 'birth',
        date: start,
        title: 'Narodziny dziecka',
        description: 'Od tego dnia możesz korzystać z urlopu ojcowskiego.',
        kind: 'milestone',
      },
      {
        id: 'parental-request',
        date: addDays(start, 21),
        title: 'Wniosek o 9 tygodni urlopu rodzicielskiego',
        description: 'Złóż go co najmniej 21 dni przed planowanym startem urlopu.',
        kind: 'deadline',
      },
      {
        id: 'paternity-deadline',
        date: addMonths(start, 12),
        title: 'Ostatni dzień na urlop ojcowski',
        description: '2 tygodnie trzeba wykorzystać do ukończenia przez dziecko 12 miesięcy.',
        kind: 'deadline',
      },
      {
        id: 'parental-deadline',
        date: addMonths(start, 72),
        title: 'Koniec możliwości wykorzystania 9 tygodni',
        description: 'Nieprzenoszalna część urlopu przepada po 6. urodzinach dziecka.',
        kind: 'deadline',
      },
    ]
  }

  const isGuardian = input.role === 'guardian'
  const maternityWeeks = calc.phases
    .filter((phase) => phase.id === 'maternity' || phase.id === 'premature')
    .reduce((sum, phase) => sum + phase.weeks, 0)
  const parentalWeeks = calc.phases.find((phase) => phase.id === 'parental')?.weeks ?? 0
  const maternityEnd = addWeeks(start, maternityWeeks)

  const milestones: Milestone[] = []
  if (!isGuardian) {
    milestones.push({
      id: 'earliest-start',
      date: addWeeks(start, -6),
      title: 'Najwcześniejszy start urlopu macierzyńskiego',
      description: 'Możesz rozpocząć urlop do 6 tygodni przed planowanym porodem.',
      kind: 'milestone',
    })
  }
  milestones.push(
    {
      id: 'start',
      date: start,
      title: isGuardian ? 'Przyjęcie dziecka pod opiekę' : 'Planowany poród',
      description: 'Start urlopu macierzyńskiego i wypłaty zasiłku.',
      kind: 'milestone',
    },
    {
      id: 'request-21',
      date: addDays(start, 21),
      title: 'Termin wniosku o cały roczny urlop',
      description: 'Tylko wniosek złożony do 21 dni po porodzie daje wariant 81,5% za cały okres.',
      kind: 'deadline',
    },
  )
  if (!isGuardian) {
    milestones.push({
      id: 'mandatory-14',
      date: addWeeks(start, 14),
      title: 'Mijają obowiązkowe 14 tygodni matki',
      description: 'Po tym terminie możesz przekazać resztę urlopu macierzyńskiego ojcu dziecka.',
      kind: 'milestone',
    })
  }
  milestones.push(
    {
      id: 'maternity-end',
      date: maternityEnd,
      title: 'Koniec urlopu macierzyńskiego',
      description: 'Od następnego dnia zaczyna się urlop rodzicielski.',
      kind: 'milestone',
    },
    {
      id: 'parental-end',
      date: addWeeks(maternityEnd, parentalWeeks),
      title: 'Koniec urlopu rodzicielskiego',
      description: 'Pamiętaj o powiadomieniu pracodawcy o powrocie do pracy.',
      kind: 'milestone',
    },
  )
  return milestones
}

export type DocumentStage =
  | 'before_birth'
  | 'after_birth_usc'
  | 'benefit_claim'
  | 'special_case'
  | 'family_benefit'

export type DocumentItem = {
  id: string
  code?: string
  title: string
  description: string
  owner: string
  destination?: string
  deadline?: string
  stage?: DocumentStage
  isOptional?: boolean
}

export function buildDocuments(input: GuideInput): DocumentItem[] {
  const isEmployee = input.employment === 'uop'
  const isInsured = hasSicknessInsurance(input)
  const docs: DocumentItem[] = []

  // 1. SCENARIUSZ: BRAK UBEZPIECZENIA CHOROBOWEGO (np. JDG bez chorobowego, zlecenie bez chorobowego)
  // Zasiłek macierzyński z ZUS NIE przysługuje. Przysługuje świadczenie rodzicielskie (Kosiniakowe) 1000 zł/mies.
  if (!isInsured) {
    if (input.role === 'guardian') {
      docs.push({
        id: 'court',
        code: 'Sąd / PCPR',
        title: 'Postanowienie sądu lub umowa o rodzinę zastępczą',
        description:
          'Dokument potwierdzający przyjęcie dziecka na wychowanie w celu przysposobienia lub sprawowania pieczy zastępczej.',
        owner: 'Sąd / PCPR',
        destination: 'Urząd Gminy / MOPS / GOPS',
        stage: 'after_birth_usc',
      })
    } else {
      docs.push({
        id: 'birth-certificate',
        code: 'USC',
        title: 'Skrócony odpis aktu urodzenia dziecka',
        description:
          'Wydaje Urząd Stanu Cywilnego (stacjonarnie lub przez portal gov.pl). Niezbędny do wniosku o świadczenie rodzicielskie.',
        owner: 'USC / gov.pl',
        destination: 'Urząd Stanu Cywilnego',
        deadline: 'Do 21 dni od narodzin',
        stage: 'after_birth_usc',
      })
    }

    docs.push({
      id: 'kosiniakowe',
      code: 'ŚR (Kosiniakowe)',
      title: 'Wniosek o świadczenie rodzicielskie (1000 zł miesięcznie)',
      description:
        'Zastępuje zasiłek macierzyński dla osób nieobjętych ubezpieczeniem chorobowym ZUS. Wynosi 1000 zł netto/mies. przez 52 tygodnie.',
      owner: 'Ty',
      destination: 'Urząd Miasta / Gminy, MOPS/GOPS lub portal Emp@tia / mZUS',
      deadline: 'Do 3 miesięcy od dnia porodu (z wyrównaniem od dnia narodzin)',
      stage: 'benefit_claim',
    })

    docs.push({
      id: 'kosiniakowe-statement',
      code: 'Oświadczenie',
      title: 'Oświadczenie o niepobieraniu zasiłku macierzyńskiego z ZUS / KRUS',
      description:
        'Wymagany załącznik potwierdzający, że ani matka, ani ojciec nie pobierają zasiłku macierzyńskiego z ubezpieczenia społecznego.',
      owner: 'Ty',
      destination: 'Dołącz do wniosku o świadczenie rodzicielskie',
      stage: 'benefit_claim',
    })

    docs.push({
      id: 'swr-800',
      code: 'ZUS SW-R',
      title: 'Wniosek o świadczenie wychowawcze 800+',
      description:
        'Powszechne świadczenie 800 zł miesięcznie na dziecko, niezależne od dochodów i ubezpieczenia chorobowego.',
      owner: 'Ty',
      destination: 'ZUS (przez aplikację mZUS, eZUS/PUE lub bankowość elektroniczną)',
      deadline: 'W ciągu 3 miesięcy od narodzin dziecka',
      stage: 'family_benefit',
    })

    if (input.employment === 'jdg') {
      docs.push({
        id: 'zus-zua-voluntary',
        code: 'ZUS ZUA',
        title: 'Zgłoszenie do dobrowolnego ubezpieczenia chorobowego (opcjonalnie na przyszłość)',
        description:
          'Jeśli w przyszłości chcesz korzystać z płatnego L4 lub zasiłku macierzyńskiego przy kolejnym dziecku, zgłoś się do ubezpieczenia chorobowego kodem 05... ze składką 2,45%.',
        owner: 'Ty (przedsiębiorca)',
        destination: 'ZUS (portal eZUS / PUE)',
        stage: 'special_case',
        isOptional: true,
      })
    }

    return docs
  }

  // 2. SCENARIUSZ: POSIADA UBEZPIECZENIE CHOROBOWE
  // Etap przed porodem (opcjonalny / warunkowy)
  if (input.role === 'mother') {
    docs.push({
      id: 'ezla-b',
      code: 'e-ZLA (kod B)',
      title: 'Zwolnienie lekarskie w ciąży (L4 w ciąży)',
      description:
        input.employment === 'uop'
          ? 'Kod B oznacza zasiłek chorobowy w wysokości 100% podstawy wymiaru. Lekarz wystawia je elektronicznie w razie medycznej niezdolności do pracy przed porodem.'
          : 'Kod B oznacza zasiłek chorobowy 100%. Pamiętaj: na JDG i zleceniu zasiłek chorobowy wymaga min. 90 dni okresu wyczekiwania (zasiłek macierzyński po porodzie przysługuje od 1. dnia).',
      owner: 'Lekarz',
      destination: 'Elektronicznie do ZUS i płatnika składek',
      deadline: 'W trakcie ciąży przed porodem',
      stage: 'before_birth',
      isOptional: !input.pregnancySickLeave,
    })
  }

  // Etap po porodzie – Urząd Stanu Cywilnego lub Sąd
  if (input.role === 'guardian') {
    docs.push({
      id: 'court',
      code: 'Sąd / PCPR',
      title: 'Postanowienie sądu lub umowa o rodzinę zastępczą',
      description:
        'Dokument potwierdzający przyjęcie dziecka na wychowanie w celu przysposobienia lub sprawowania pieczy zastępczej.',
      owner: 'Sąd / PCPR / Ośrodek Adopcyjny',
      destination: 'Pracodawca / ZUS',
      stage: 'after_birth_usc',
    })
  } else {
    docs.push({
      id: 'birth-certificate',
      code: 'USC',
      title: 'Skrócony odpis aktu urodzenia dziecka',
      description:
        'Wydaje Urząd Stanu Cywilnego (stacjonarnie lub przez portal gov.pl). Niezbędny do formalności urlopowych i zasiłkowych.',
      owner: 'USC / gov.pl',
      destination: 'Urząd Stanu Cywilnego',
      deadline: 'W ciągu 21 dni od narodzin dziecka',
      stage: 'after_birth_usc',
    })
  }

  // Etap wniosków o zasiłek / urlop
  if (input.role === 'father') {
    // Ojciec – urlop ojcowski (2 tygodnie)
    if (isEmployee) {
      docs.push({
        id: 'paternity-request',
        code: 'art. 182³ KP',
        title: 'Pisemny wniosek pracownika o urlop ojcowski (14 dni)',
        description:
          'Urlop ojcowski przysługuje w wymiarze 2 tygodni (płatne 100%). Możesz podzielić na maksymalnie 2 części po min. 7 dni do ukończenia przez dziecko 12. miesiąca życia.',
        owner: 'Ty → Pracodawca',
        destination: 'Dział kadr u Twojego Pracodawcy',
        deadline: 'Nie później niż 7 dni przed rozpoczęciem urlopu',
        stage: 'benefit_claim',
      })
    } else {
      docs.push({
        id: 'paternity-zas',
        code: 'ZUS ZAO / ZAS-53',
        title: 'Wniosek o zasiłek macierzyński za okres urlopu ojcowskiego (ZAO)',
        description:
          'Elektroniczny wniosek do ZUS o wypłatę 100% zasiłku za okres urlopu ojcowskiego (14 dni).',
        owner: 'Ty → ZUS',
        destination: 'ZUS (portal eZUS / PUE)',
        deadline: 'Nie później niż 7 dni przed rozpoczęciem urlopu ojcowskiego',
        stage: 'benefit_claim',
      })
    }

    docs.push({
      id: 'paternity-statement',
      code: 'Oświadczenie',
      title: 'Oświadczenie ojca o niekorzystaniu wcześniej z urlopu ojcowskiego',
      description:
        'Potwierdzenie, czy i w jakiej części zasiłek macierzyński za okres urlopu ojcowskiego był już wcześniej wykorzystany na dane dziecko.',
      owner: 'Ty',
      destination: 'Dołącz do wniosku ojcowskiego (u pracodawcy lub w ZUS)',
      stage: 'benefit_claim',
    })

    // Ojciec – 9 tygodni rodzicielskiego (nieprzenoszalne)
    if (isEmployee) {
      docs.push({
        id: 'father-parental-request',
        code: 'art. 182¹ᵃ KP',
        title: 'Wniosek o urlop rodzicielski dla ojca (9 tygodni)',
        description:
          'Wyłączna część urlopu rodzicielskiego dla ojca (płatna 70%). Nie przechodzi na matkę w razie niewykorzystania.',
        owner: 'Ty → Pracodawca',
        destination: 'Dział kadr u Twojego Pracodawcy',
        deadline: 'Nie później niż 21 dni przed rozpoczęciem urlopu',
        stage: 'benefit_claim',
      })
    } else {
      docs.push({
        id: 'father-parental-zas',
        code: 'ZUS ZAM',
        title: 'Wniosek o zasiłek macierzyński za okres 9 tygodni rodzicielskiego ojca',
        description:
          'Wniosek do ZUS o wypłatę zasiłku macierzyńskiego w wysokości 70% za nieprzenoszalną część rodzicielskiego dla taty.',
        owner: 'Ty → ZUS',
        destination: 'ZUS (portal eZUS / PUE)',
        deadline: 'Nie później niż 21 dni przed rozpoczęciem pobierania zasiłku',
        stage: 'benefit_claim',
      })
    }
  } else {
    // Matka / Opiekun
    if (isEmployee) {
      docs.push({
        id: 'leave-request-uop',
        code: 'art. 179¹ KP',
        title: 'Wniosek pracownicy o pełny urlop macierzyński i rodzicielski (wariant 81,5%)',
        description:
          'Złóż pracodawcy do 21 dni po porodzie, aby otrzymać uśredniony zasiłek 81,5% za cały okres 52 tygodni. Złożenie po terminie oznacza 100% za macierzyński i 70% za rodzicielski.',
        owner: 'Ty → Pracodawca',
        destination: 'Dział kadr u Twojego Pracodawcy',
        deadline: 'W terminie do 21 dni od dnia porodu',
        stage: 'benefit_claim',
      })
    } else if (input.employment === 'jdg') {
      docs.push({
        id: 'zas53-jdg',
        code: 'ZUS ZAM / ZAS-53',
        title: 'Wniosek o zasiłek macierzyński za okres macierzyńskiego i rodzicielskiego',
        description:
          'Złóż elektronicznie przez portal eZUS (PUE). Zaznacz od razu wniosek o zasiłek za okres urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze (stawka 81,5%).',
        owner: 'Ty',
        destination: 'ZUS (portal eZUS / PUE)',
        deadline: 'W terminie do 21 dni od dnia porodu',
        stage: 'benefit_claim',
      })
    } else {
      docs.push({
        id: 'zas53-zlecenie',
        code: 'ZUS ZAM / ZAS-53',
        title: 'Wniosek o zasiłek macierzyński zleceniobiorcy',
        description:
          'Składasz do ZUS przez eZUS (PUE) lub za pośrednictwem zleceniodawcy wraz ze skróconym odpisem aktu urodzenia dziecka.',
        owner: 'Ty',
        destination: 'ZUS (portal eZUS / PUE)',
        deadline: 'W terminie do 21 dni od dnia porodu',
        stage: 'benefit_claim',
      })
    }
  }

  // Zaświadczenie płatnika składek
  if (input.employment === 'uop') {
    docs.push({
      id: 'z3',
      code: 'ZUS Z-3',
      title: 'Zaświadczenie płatnika składek Z-3',
      description:
        'Wystawia i przekazuje do ZUS Twój pracodawca – wyłącznie wtedy, gdy firma zatrudnia do 20 ubezpieczonych (zasiłek płaci ZUS). W większych firmach pracodawca sam wypłaca zasiłek.',
      owner: 'Pracodawca → ZUS',
      destination: 'ZUS (PUE/eZUS)',
      stage: 'benefit_claim',
    })
  } else if (input.employment === 'jdg') {
    docs.push({
      id: 'z3b',
      code: 'ZUS Z-3b',
      title: 'Zaświadczenie płatnika składek Z-3b (własna firma)',
      description:
        'Jako przedsiębiorca wypełniasz je samodzielnie dla siebie w eZUS. Wskazujesz numer rachunku bankowego oraz dane o opłacanych składkach.',
      owner: 'Ty (płatnik dla siebie)',
      destination: 'ZUS (portal eZUS / PUE)',
      stage: 'benefit_claim',
    })
  } else if (input.employment === 'zlecenie') {
    docs.push({
      id: 'z3a',
      code: 'ZUS Z-3a',
      title: 'Zaświadczenie płatnika składek – zleceniodawca (Z-3a)',
      description:
        'Wypełnia Twój zleceniodawca i przesyła do ZUS. Potwierdza Twoje przychody, zgłoszenie do dobrowolnego ubezpieczenia chorobowego i okres zlecenia.',
      owner: 'Zleceniodawca → ZUS',
      destination: 'ZUS (portal eZUS / PUE)',
      stage: 'benefit_claim',
    })
  }

  // Przypadki specjalne
  if (input.premature) {
    docs.push({
      id: 'premature-cert',
      code: 'art. 180¹ KP',
      title: 'Zaświadczenie szpitala i wniosek o uzupełniający urlop macierzyński (wcześniak)',
      description:
        'Zaświadczenie lekarskie ze szpitala potwierdzające tydzień urodzenia i okres hospitalizacji noworodka. Daje prawo do od 8 do 15 tygodni uzupełniającego urlopu macierzyńskiego (100% zasiłku).',
      owner: 'Szpital → Ty → Pracodawca / ZUS',
      destination: 'Pracodawca lub ZUS',
      deadline: 'Co najmniej 21 dni przed końcem urlopu macierzyńskiego',
      stage: 'special_case',
    })
  }

  if (input.zaZyciem) {
    docs.push({
      id: 'za-zyciem-cert',
      code: 'Ustawa „Za życiem”',
      title: 'Zaświadczenie lekarskie z ustawy „Za życiem”',
      description:
        'Zaświadczenie od lekarza specjalisty potwierdzające ciężkie i nieodwracalne upośledzenie noworodka. Wydłuża urlop rodzicielski o dodatkowe 24 tygodnie (do 65 tyg.).',
      owner: 'Lekarz specjalista → Pracodawca / ZUS',
      destination: 'Pracodawca lub ZUS',
      stage: 'special_case',
    })
  }

  // Powszechne świadczenie rodzinne
  docs.push({
    id: 'swr-800',
    code: 'ZUS SW-R',
    title: 'Wniosek o świadczenie wychowawcze 800+',
    description:
      'Powszechne świadczenie 800 zł miesięcznie na dziecko. Składane elektronicznie przez aplikację mZUS, portal eZUS lub bankowość.',
    owner: 'Ty',
    destination: 'ZUS (mZUS / eZUS)',
    deadline: 'W ciągu 3 miesięcy od narodzin dziecka',
    stage: 'family_benefit',
  })

  return docs
}

export type RiskAlert = {
  id: string
  title: string
  description: string
}

export function buildAlerts(input: GuideInput): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const waiting = waitingPeriodDays(input.employment)
  const voluntary = input.employment !== 'uop'

  if (!hasSicknessInsurance(input)) {
    alerts.push({
      id: 'no-insurance',
      title: 'Brak ubezpieczenia chorobowego',
      description:
        'Na zleceniu i w JDG ubezpieczenie chorobowe jest dobrowolne. Zgłoś je w ZUS (ZUA/ZZA), a prawo do zasiłku pojawi się po 90 dniach.',
    })
  } else if (input.insuredDays < waiting) {
    alerts.push({
      id: 'waiting-period',
      title: 'Okres wyczekiwania nie minął',
      description: `Zasiłek chorobowy w ciąży wymaga ${waiting} dni nieprzerwanego ubezpieczenia. Sprawdź w ZUS, od kiedy przysługuje Ci zasiłek macierzyński.`,
    })
  }

  if (input.insuredDays < 180 && (voluntary || input.grossSalary > 12000)) {
    alerts.push({
      id: 'sham-contract',
      title: 'Ryzyko zakwestionowania umowy lub JDG jako pozornej',
      description:
        'ZUS często kontroluje tytuły ubezpieczenia zawarte krótko przed lub w trakcie ciąży. Zachowuj dowody faktycznej pracy: faktury, korespondencję, ewidencję.',
    })
  }

  if (input.employment === 'jdg' && input.grossSalary > 9000) {
    alerts.push({
      id: 'raised-contributions',
      title: 'Sztuczne podwyższenie składek w ciąży',
      description:
        'Wysoka zadeklarowana podstawa składek u przedsiębiorcy może zostać obniżona przez ZUS, jeśli nie odpowiada realnym przychodom firmy.',
    })
  }

  if (voluntary) {
    alerts.push({
      id: 'lose-insurance',
      title: 'Utrata ubezpieczenia przed porodem',
      description:
        input.employment === 'jdg'
          ? 'Zadłużenie składkowe powyżej określonej kwoty może wstrzymać wypłatę zasiłku. Dbaj o terminowe opłacanie składek ZUS do 20. dnia miesiąca.'
          : 'Jeśli umowa zlecenie skończy się przed porodem, tracisz prawo do zasiłku macierzyńskiego. Na zleceniu nie ma kodeksowej ochrony przedłużenia umowy.',
    })
  }

  return alerts
}

export function hasLegalShield(input: GuideInput) {
  return input.employment === 'uop'
}

export type KnowledgeCard = {
  id: string
  title: string
  summary: string
  points: string[]
  topicId?: string
}

const knowledgeByEmployment: Record<Employment, KnowledgeCard> = {
  uop: {
    id: 'uop',
    title: 'Etat (UoP) daje pełną ochronę Kodeksu pracy',
    summary: 'Ubezpieczenie chorobowe jest obowiązkowe od pierwszego dnia pracy.',
    points: [
      'Zasiłek macierzyński przysługuje od 1. dnia pracy – brak okresu wyczekiwania (na L4 chorobowe karencja wynosi 30 dni).',
      'Szczególna ochrona trwałego zatrudnienia: zakaz wypowiedzenia umowy w ciąży oraz w trakcie urlopów.',
      'Umowa na czas określony (zawarta na ponad 1 mies.) przedłuża się do dnia porodu po 3. miesiącu ciąży.',
    ],
    topicId: 'podstawa-wymiaru',
  },
  zlecenie: {
    id: 'zlecenie',
    title: 'Zlecenie: zasiłek macierzyński bez karencji',
    summary: 'Warunkiem jest zgłoszenie do dobrowolnego ubezpieczenia chorobowego przed porodem.',
    points: [
      'Zasiłek macierzyński i ojcowski przysługuje od 1. dnia ubezpieczenia (brak okresu wyczekiwania).',
      'Zasiłek chorobowy (L4 w ciąży): wymaga 90 dni ubezpieczenia chorobowego.',
      'Zasiłek wypłaca bezpośrednio ZUS na Twoje konto bankowe.',
      'Umowa zlecenie nie przedłuża się automatycznie do porodu (brak ochrony kodeksowej).',
    ],
  },
  jdg: {
    id: 'jdg',
    title: 'JDG: jesteś płatnikiem i ubezpieczonym',
    summary: 'Sam(a) zgłaszasz się do ubezpieczeń i rozliczasz składki w ZUS.',
    points: [
      'Zasiłek macierzyński i ojcowski przysługuje od 1. dnia ubezpieczenia chorobowego (bez karencji).',
      'Zasiłek chorobowy (L4 w ciąży): przysługuje po 90 dniach ubezpieczenia.',
      'Składka chorobowa (2,45%) jest dobrowolna – bez niej ZUS nie wypłaci żadnego zasiłku.',
    ],
    topicId: 'podstawa-wymiaru',
  },
}

const knowledgeByRole: Partial<Record<Role, KnowledgeCard>> = {
  father: {
    id: 'father',
    title: '9 tygodni tylko dla taty',
    summary: 'Z 41 tygodni urlopu rodzicielskiego 9 tygodni przysługuje wyłącznie drugiemu rodzicowi (ojcu). Jeśli z nich nie skorzysta – ta część przepada.',
    points: [
      'Urlop ojcowski: 2 tygodnie, 100% podstawy – do ukończenia przez dziecko 12. miesiąca życia.',
      'Rodzicielski dla taty: 9 tygodni, 70% podstawy – do końca roku kalendarzowego, w którym dziecko kończy 6 lat.',
      'Na etacie (UoP) możesz łączyć rodzicielski z pracą do 1/2 etatu; na zleceniu/JDG wykonujesz zlecenia bez limitu etatu.',
    ],
    topicId: 'urlop-ojcowski',
  },
  guardian: {
    id: 'guardian',
    title: 'Urlop na warunkach macierzyńskiego',
    summary: 'Przy przysposobieniu lub rodzinie zastępczej przysługują te same uprawnienia liczone od przyjęcia dziecka.',
    points: [
      'Wiek dziecka: do 7 lat (do 10 lat przy odroczonym obowiązku szkolnym) dla rodziny zastępczej; do 14 lat przy wniosku o przysposobienie.',
      'Rodzina zastępcza niezawodowa ma prawo do urlopu, rodzina zawodowa – nie.',
    ],
  },
}

export function buildKnowledge(input: GuideInput): KnowledgeCard[] {
  const roleCard = input.role ? knowledgeByRole[input.role] : undefined
  const employmentCard = input.employment ? knowledgeByEmployment[input.employment] : undefined
  const cards: KnowledgeCard[] = []
  if (roleCard) cards.push(roleCard)
  if (employmentCard) cards.push(employmentCard)
  return cards
}

export const moreKnowledge: { id: string; title: string; body: string }[] = [
  {
    id: 'base',
    title: 'Jak liczona jest podstawa wymiaru?',
    body: 'To średni przychód lub wynagrodzenie brutto z ostatnich 12 miesięcy kalendarzowych poprzedzających poród, pomniejszone o 13,71% (składki ZUS finansowane przez pracownika). Przy JDG – zadeklarowana podstawa składek.',
  },
  {
    id: 'variants',
    title: '100% + 70% czy 81,5% przez cały rok?',
    body: 'Wariant ujednolicony 81,5% za cały okres przysługuje po złożeniu wniosku ZAM o wybór wariantu ujednoliconego do 21 dni po porodzie. Wariant zmienny (100% macierzyński, 70% rodzicielski) daje wyższe środki na początku. Część 9 tygodni dla ojca zawsze wynosi 70%.',
  },
  {
    id: 'part-time',
    title: 'Łączenie rodzicielskiego z pracą',
    body: 'Na etacie (UoP) możesz pracować u swojego pracodawcy maksymalnie na 1/2 etatu – wówczas urlop ulega proporcjonalnemu wydłużeniu (nawet do 82 tygodni). Na zleceniu lub JDG możesz pracować bez limitu wymiaru.',
  },
  {
    id: 'minimum',
    title: 'Minimalna kwota zasiłku',
    body: `Zasiłek macierzyński nie może być niższy niż ${MIN_BENEFIT} zł miesięcznie (ustawowe podwyższenie do kwoty świadczenia rodzicielskiego).`,
  },
]

export type SampleCase = {
  id: string
  label: string
  description: string
  input: GuideInput
}

export const sampleCases: SampleCase[] = [
  {
    id: 'anna-uop',
    label: 'Anna – etat (UoP)',
    description: 'Matka, 2 lata stażu, 7 800 zł brutto',
    input: { ...defaultGuideInput, role: 'mother', employment: 'uop', sicknessInsurance: true, insuredDays: 720, dueDate: '2027-03-15', grossSalary: 7800 },
  },
  {
    id: 'marta-jdg',
    label: 'Marta – JDG bez chorobowego',
    description: 'Matka, nie opłaca składki chorobowej',
    input: { ...defaultGuideInput, role: 'mother', employment: 'jdg', sicknessInsurance: false, insuredDays: 400, dueDate: '2027-03-15', grossSalary: 5200 },
  },
  {
    id: 'kasia-jdg',
    label: 'Kasia – świeża JDG, 45 dni',
    description: 'Matka, wysoka podstawa składek',
    input: { ...defaultGuideInput, role: 'mother', employment: 'jdg', sicknessInsurance: true, insuredDays: 45, dueDate: '2027-03-15', grossSalary: 12500 },
  },
  {
    id: 'piotr-uop',
    label: 'Piotr – tata na etacie',
    description: 'Ojciec, 4 lata stażu, 9 200 zł brutto',
    input: { ...defaultGuideInput, role: 'father', employment: 'uop', sicknessInsurance: true, insuredDays: 1500, dueDate: '2027-03-15', grossSalary: 9200 },
  },
  {
    id: 'ewa-adopcja',
    label: 'Ewa – adopcja, zlecenie',
    description: 'Opiekunka, zlecenie z chorobowym',
    input: { ...defaultGuideInput, role: 'guardian', employment: 'zlecenie', sicknessInsurance: true, insuredDays: 400, dueDate: '2027-03-15', grossSalary: 6000 },
  },
  {
    id: 'ola-wczesniak',
    label: 'Ola – wcześniak, „Za życiem”',
    description: 'Matka na etacie, dodatkowe tygodnie',
    input: { ...defaultGuideInput, role: 'mother', employment: 'uop', sicknessInsurance: true, insuredDays: 900, dueDate: '2027-03-15', grossSalary: 6800, premature: true, zaZyciem: true },
  },
]
