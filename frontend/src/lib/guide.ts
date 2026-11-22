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
}

export type ResultOptions = {
  variant: PaymentVariant
  partTime: boolean
}

export const SOCIAL_CONTRIBUTION_RATE = 0.1371
export const PIT_ADVANCE_RATE = 0.12
export const MIN_BENEFIT = 1000

export const defaultGuideInput: GuideInput = {
  role: 'mother',
  employment: 'uop',
  sicknessInsurance: true,
  insuredDays: 365,
  dueDate: '2027-03-15',
  grossSalary: 7000,
  premature: false,
  zaZyciem: false,
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

export function waitingPeriodDays(employment: Employment) {
  return employment === 'uop' ? 30 : 90
}

export function hasSicknessInsurance(input: GuideInput) {
  return input.employment === 'uop' || input.sicknessInsurance
}

export type Qualification = {
  eligible: boolean
  headline: string
  reason: string
}

export function qualify(input: GuideInput): Qualification {
  const waiting = waitingPeriodDays(input.employment)
  if (!hasSicknessInsurance(input)) {
    return {
      eligible: false,
      headline: 'Brak dobrowolnego ubezpieczenia chorobowego',
      reason: 'Brak zgłoszenia do ubezpieczenia chorobowego. Bez niego ZUS nie wypłaci zasiłku macierzyńskiego ani ojcowskiego.',
    }
  }

  // Zgodnie z art. 4 ust. 2 pkt 3 ustawy zasiłkowej, prawo do zasiłku macierzyńskiego
  // i rodzicielskiego przysługuje od 1. dnia ubezpieczenia (brak okresu wyczekiwania).
  // Okres wyczekiwania 30/90 dni dotyczy wyłącznie zasiłku chorobowego (L4).
  if (input.insuredDays < waiting) {
    return {
      eligible: true,
      headline: 'Prawo do zasiłku macierzyńskiego (0 dni karencji)',
      reason: `Zasiłek macierzyński/ojcowski przysługuje od 1. dnia ubezpieczenia. Uwaga: na zwolnienie lekarskie L4 przed porodem obowiązuje okres wyczekiwania ${waiting} dni (posiadasz ${input.insuredDays} dni).`,
    }
  }

  return {
    eligible: true,
    headline: 'Kwalifikacja pozytywna – pełne prawo do świadczeń',
    reason: `Masz prawo do zasiłku macierzyńskiego od 1. dnia oraz spełniasz warunek ${waiting} dni okresu wyczekiwania dla zasiłku chorobowego na ${employmentShort[input.employment]}.`,
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

export type DocumentItem = {
  id: string
  code?: string
  title: string
  description: string
  owner: string
}

const birthCertificate: DocumentItem = {
  id: 'birth-certificate',
  title: 'Skrócony odpis aktu urodzenia',
  description: 'Wydaje Urząd Stanu Cywilnego. Potwierdza urodzenie dziecka.',
  owner: 'USC',
}

const ezlaB: DocumentItem = {
  id: 'ezla-b',
  code: 'e-ZLA (kod B)',
  title: 'Zwolnienie lekarskie w ciąży',
  description: 'Kod B oznacza zasiłek chorobowy w wysokości 100% podstawy.',
  owner: 'Lekarz',
}

const payerCertificate: Record<Employment, DocumentItem> = {
  uop: {
    id: 'z3',
    code: 'Z-3',
    title: 'Zaświadczenie płatnika składek',
    description: 'Wystawia pracodawca, gdy zasiłek wypłaca ZUS (np. w firmie do 20 osób).',
    owner: 'Pracodawca',
  },
  zlecenie: {
    id: 'z3a',
    code: 'Z-3a',
    title: 'Zaświadczenie płatnika – zleceniodawca',
    description: 'Potwierdza Twoje przychody i opłacone ubezpieczenie chorobowe.',
    owner: 'Zleceniodawca',
  },
  jdg: {
    id: 'z3b',
    code: 'Z-3b',
    title: 'Zaświadczenie płatnika – własna firma',
    description: 'Jako przedsiębiorca wypełniasz je sam(a) dla siebie.',
    owner: 'Ty (płatnik)',
  },
}

const zas53: DocumentItem = {
  id: 'zas53',
  code: 'ZAS-53',
  title: 'Wniosek o zasiłek macierzyński',
  description: 'Złóż przez eZUS (PUE). Zaznacz od razu, za jaki okres wnioskujesz.',
  owner: 'Ty',
}

export function buildDocuments(input: GuideInput): DocumentItem[] {
  const isEmployee = input.employment === 'uop'
  const docs: DocumentItem[] = []

  if (input.role === 'mother') docs.push(ezlaB)
  if (input.role === 'guardian') {
    docs.push({
      id: 'court',
      title: 'Postanowienie sądu lub umowa o rodzinę zastępczą',
      description: 'Dokument potwierdzający przyjęcie dziecka na wychowanie.',
      owner: 'Sąd / PCPR',
    })
  } else {
    docs.push(birthCertificate)
  }

  if (input.role === 'father') {
    docs.push(
      isEmployee
        ? {
            id: 'paternity-request',
            title: 'Wniosek o urlop ojcowski',
            description: 'Złóż pracodawcy najpóźniej 7 dni przed startem urlopu.',
            owner: 'Ty → pracodawca',
          }
        : { ...zas53, description: 'Złóż przez eZUS za okres urlopu ojcowskiego.' },
    )
    if (isEmployee) {
      docs.push({
        id: 'father-parental-request',
        title: 'Wniosek o urlop rodzicielski (9 tygodni)',
        description: 'Złóż pracodawcy najpóźniej 21 dni przed startem urlopu.',
        owner: 'Ty → pracodawca',
      })
    }
  } else {
    docs.push(
      isEmployee
        ? {
            id: 'leave-request',
            title: 'Wniosek o urlop macierzyński i rodzicielski',
            description: 'Złóż pracodawcy do 21 dni po porodzie, jeśli chcesz wariant 81,5%.',
            owner: 'Ty → pracodawca',
          }
        : zas53,
    )
  }

  docs.push(payerCertificate[input.employment])
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
  const roleCard = knowledgeByRole[input.role]
  const employmentCard = knowledgeByEmployment[input.employment]
  return roleCard ? [roleCard, employmentCard] : [employmentCard]
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
    body: 'Wariant jednolity 81,5% za cały okres przysługuje przy złożeniu tzw. długiego wniosku do 21 dni po porodzie. Wariant zmienny (100% macierzyński, 70% rodzicielski) daje wyższe środki na początku. Część 9 tygodni dla ojca zawsze wynosi 70%.',
  },
  {
    id: 'part-time',
    title: 'Łączenie rodzicielskiego z pracą',
    body: 'Na etacie (UoP) możesz pracować u swojego pracodawcy maksymalnie na 1/2 etatu – wówczas urlop ulega proporcjonalnemu wydłużeniu (nawet do 82 tygodni). Na zleceniu lub JDG możesz pracować bez limitu wymiaru.',
  },
  {
    id: 'minimum',
    title: 'Minimalna kwota zasiłku',
    body: `Zasiłek macierzyński nie może być niższy niż ${MIN_BENEFIT} zł miesięcznie (ustawowe podwyższenie do kwoty świadczenia rodzicielskiego, tzw. kosiniakowego).`,
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
    input: { ...defaultGuideInput, role: 'mother', employment: 'uop', insuredDays: 720, grossSalary: 7800 },
  },
  {
    id: 'marta-jdg',
    label: 'Marta – JDG bez chorobowego',
    description: 'Matka, nie opłaca składki chorobowej',
    input: { ...defaultGuideInput, role: 'mother', employment: 'jdg', sicknessInsurance: false, insuredDays: 400, grossSalary: 5200 },
  },
  {
    id: 'kasia-jdg',
    label: 'Kasia – świeża JDG, 45 dni',
    description: 'Matka, wysoka podstawa składek',
    input: { ...defaultGuideInput, role: 'mother', employment: 'jdg', insuredDays: 45, grossSalary: 12500 },
  },
  {
    id: 'piotr-uop',
    label: 'Piotr – tata na etacie',
    description: 'Ojciec, 4 lata stażu, 9 200 zł brutto',
    input: { ...defaultGuideInput, role: 'father', employment: 'uop', insuredDays: 1500, grossSalary: 9200 },
  },
  {
    id: 'ewa-adopcja',
    label: 'Ewa – adopcja, zlecenie',
    description: 'Opiekunka, zlecenie z chorobowym',
    input: { ...defaultGuideInput, role: 'guardian', employment: 'zlecenie', insuredDays: 400, grossSalary: 6000 },
  },
  {
    id: 'ola-wczesniak',
    label: 'Ola – wcześniak, „Za życiem”',
    description: 'Matka na etacie, dodatkowe tygodnie',
    input: { ...defaultGuideInput, role: 'mother', employment: 'uop', insuredDays: 900, grossSalary: 6800, premature: true, zaZyciem: true },
  },
]
