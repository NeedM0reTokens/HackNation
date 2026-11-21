import type { Explanation } from '@/lib/types'

export const glossary: Record<string, Explanation> = {
  'podstawa-wymiaru': {
    id: 'podstawa-wymiaru',
    title: 'Podstawa wymiaru zasiłku',
    summary:
      'To kwota, od której ZUS liczy Twój zasiłek. Najczęściej to średnia z Twoich zarobków z ostatnich 12 miesięcy, pomniejszona o składki społeczne (13,71%).',
    details: [
      'Na etacie: bierzemy wynagrodzenie brutto z 12 pełnych miesięcy przed zasiłkiem.',
      'Na działalności: liczy się zadeklarowana przez Ciebie podstawa składek, a nie faktyczny dochód.',
      'Jeśli pracujesz krócej niż 12 miesięcy, ZUS liczy średnią z pełnych miesięcy, które masz.',
    ],
    legalBasis: 'art. 36 i 48 ustawy zasiłkowej',
  },
  'platnik-skladek': {
    id: 'platnik-skladek',
    title: 'Płatnik składek',
    summary:
      'To ten, kto przekazuje Twoje składki do ZUS. Na etacie – pracodawca. Na własnej działalności – Ty sam(a).',
    details: [
      'Duzi pracodawcy (powyżej 20 osób) sami wypłacają zasiłki – wtedy wniosek składasz u nich.',
      'Przy działalności zasiłek zawsze wypłaca ZUS.',
    ],
  },
  'okres-wyczekiwania': {
    id: 'okres-wyczekiwania',
    title: 'Okres wyczekiwania',
    summary:
      'To czas, przez który musisz mieć ubezpieczenie chorobowe, zanim dostaniesz zasiłek chorobowy. Przy dobrowolnym ubezpieczeniu to 90 dni bez przerwy.',
    details: [
      'Na etacie wynosi 30 dni.',
      'Zasiłek macierzyński nie ma okresu wyczekiwania – wystarczy, że jesteś ubezpieczona w dniu porodu.',
      'Przerwa w ubezpieczeniu dłuższa niż 30 dni zwykle "zeruje" licznik.',
    ],
    legalBasis: 'art. 4 ustawy zasiłkowej',
  },
  'kod-b': {
    id: 'kod-b',
    title: 'Kod „B" na zwolnieniu lekarskim',
    summary:
      'Lekarz wpisuje kod „B", gdy niezdolność do pracy przypada w czasie ciąży. Dzięki temu zasiłek chorobowy wynosi 100% podstawy, a nie 80%.',
    details: [
      'Nie musisz nic robić – kod trafia do ZUS automatycznie z e-ZLA.',
      'Sprawdź w PUE/eZUS, czy kod widnieje na każdym zwolnieniu z okresu ciąży.',
    ],
  },
  'wariant-815': {
    id: 'wariant-815',
    title: 'Wariant 81,5% czy 100% + 70%?',
    summary:
      'Możesz wybrać: 100% przez okres macierzyńskiego, a potem 70% na rodzicielskim, albo stałe 81,5% przez cały czas. Łącznie kwoty są bardzo podobne – różni się rozkład w czasie.',
    details: [
      'Wariant 81,5% daje równe kwoty co miesiąc – łatwiej planować budżet.',
      'Wniosek o 81,5% trzeba złożyć najpóźniej 21 dni po porodzie.',
      'Jeśli później zrezygnujesz z części urlopu rodzicielskiego, ZUS może potrącić nadpłatę.',
    ],
    legalBasis: 'art. 31 ustawy zasiłkowej',
  },
  'za-zyciem': {
    id: 'za-zyciem',
    title: 'Zaświadczenie „Za życiem"',
    summary:
      'Jeśli lekarz stwierdzi u dziecka ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę, urlop rodzicielski wydłuża się do 65 tygodni (67 przy wieloraczkach).',
    details: [
      'Potrzebne jest zaświadczenie lekarskie o stanie zdrowia dziecka.',
      'Dłuższy urlop przysługuje łącznie obojgu rodzicom.',
    ],
  },
  'nieprzenoszalne-9-tygodni': {
    id: 'nieprzenoszalne-9-tygodni',
    title: '9 tygodni tylko dla każdego z rodziców',
    summary:
      'Z urlopu rodzicielskiego po 9 tygodni jest zarezerwowane dla mamy i dla taty. Jeśli tata ich nie wykorzysta, mama nie może ich przejąć – po prostu przepadają.',
    details: [
      'Pozostałą część urlopu rodzice mogą dzielić dowolnie.',
      'Za 9 tygodni taty zasiłek wynosi 70% jego podstawy.',
    ],
  },
  'laczenie-z-praca': {
    id: 'laczenie-z-praca',
    title: 'Łączenie urlopu rodzicielskiego z pracą',
    summary:
      'Możesz wrócić do pracy na część etatu (maks. pół) i jednocześnie korzystać z urlopu rodzicielskiego. Urlop wydłuża się proporcjonalnie, a zasiłek jest proporcjonalnie niższy.',
    details: [
      'Przykład: pracując na 1/2 etatu, urlop trwa dwa razy dłużej, a zasiłek wynosi połowę.',
      'Łączna kwota zasiłku za cały urlop się nie zmienia – rozkłada się na dłuższy czas.',
    ],
  },
  'rodzina-zastepcza': {
    id: 'rodzina-zastepcza',
    title: 'Rodzina zastępcza niezawodowa i adopcja',
    summary:
      'Gdy przyjmujesz dziecko do adopcji lub jako niezawodowa rodzina zastępcza, masz prawo do zasiłku macierzyńskiego – długość zależy od wieku dziecka.',
    details: [
      'Dziecko do 1. roku życia: 20 tygodni (plus urlop rodzicielski).',
      'Dziecko starsze (do 7 lat, 10 przy odroczonej szkole): 9 tygodni.',
      'Zawodowa rodzina zastępcza nie ma prawa do tego zasiłku.',
    ],
  },
  'swiadczenie-rehabilitacyjne': {
    id: 'swiadczenie-rehabilitacyjne',
    title: 'Świadczenie rehabilitacyjne',
    summary:
      'To pieniądze po wyczerpaniu zasiłku chorobowego, gdy dalsze leczenie daje szansę powrotu do pracy. W czasie ciąży wynosi 100% podstawy.',
    details: [
      'Zasiłek chorobowy w ciąży trwa maks. 270 dni.',
      'Po tym czasie lekarz orzecznik ZUS decyduje o świadczeniu rehabilitacyjnym.',
    ],
  },
  'zasilek-w-wysokosci-macierzynskiego': {
    id: 'zasilek-w-wysokosci-macierzynskiego',
    title: 'Zasiłek w wysokości zasiłku macierzyńskiego',
    summary:
      'Gdy ubezpieczona w ciąży utraci pracę z powodu likwidacji lub upadłości pracodawcy, do dnia porodu dostaje zasiłek równy zasiłkowi macierzyńskiemu (100%).',
    details: ['Wymaga zaświadczenia lekarskiego o ciąży.', 'Po porodzie przysługuje już zasiłek macierzyński.'],
  },
  'alert-zaleglosc': {
    id: 'alert-zaleglosc',
    title: 'Co oznacza niedopłata składek?',
    summary:
      'Masz działalność i dobrowolne ubezpieczenie chorobowe. Jeśli składka za dany miesiąc nie wpłynie w całości i na czas, ubezpieczenie chorobowe ustaje od pierwszego dnia tego miesiąca. Bez niego nie dostaniesz zasiłku chorobowego ani macierzyńskiego.',
    details: [
      'Dopłać 412,36 zł do 20 listopada 2026, a problem zniknie.',
      'Jeśli termin minie, możesz złożyć w PUE/eZUS wniosek o przywrócenie terminu – ZUS może się zgodzić, ale nie musi.',
      'Nawet niewielka niedopłata (kilka złotych) może mieć takie skutki – sprawdzaj saldo.',
    ],
    legalBasis: 'art. 14 ust. 2 ustawy o systemie ubezpieczeń społecznych',
  },
  'alert-podstawa': {
    id: 'alert-podstawa',
    title: 'Dlaczego zmiana podstawy ma znaczenie?',
    summary:
      'Zasiłek liczy się ze średniej z 12 miesięcy. Jeśli podwyższyłaś podstawę niedawno, średnia będzie niższa niż obecna podstawa – więc i zasiłek będzie niższy.',
    details: [
      'Przykład: 8 miesięcy po 4 806 zł i 4 miesiące po 6 200 zł daje średnio ok. 5 271 zł, a nie 6 200 zł.',
      'Skorzystaj z kalkulatora, wpisując średnią podstawę – zobaczysz realną kwotę.',
    ],
  },
}

export const fallbackExplanation: Explanation = {
  id: 'fallback',
  title: 'Asystent ZUS',
  summary:
    'Na razie nie mam przygotowanej odpowiedzi na to pytanie. Spróbuj zapytać o: podstawę wymiaru, okres wyczekiwania, kod B, wariant 81,5%, urlop rodzicielski lub łączenie urlopu z pracą.',
  details: ['W sprawach indywidualnych skontaktuj się z COT ZUS: 22 560 16 00.'],
}

const keywords: [string, string][] = [
  ['podstaw', 'podstawa-wymiaru'],
  ['płatnik', 'platnik-skladek'],
  ['platnik', 'platnik-skladek'],
  ['wyczekiw', 'okres-wyczekiwania'],
  ['kod b', 'kod-b'],
  ['„b"', 'kod-b'],
  ['81', 'wariant-815'],
  ['wariant', 'wariant-815'],
  ['życiem', 'za-zyciem'],
  ['zyciem', 'za-zyciem'],
  ['9 tygodni', 'nieprzenoszalne-9-tygodni'],
  ['ojc', 'nieprzenoszalne-9-tygodni'],
  ['tata', 'nieprzenoszalne-9-tygodni'],
  ['prac', 'laczenie-z-praca'],
  ['etat', 'laczenie-z-praca'],
  ['adopc', 'rodzina-zastepcza'],
  ['zastępcz', 'rodzina-zastepcza'],
  ['rehabilit', 'swiadczenie-rehabilitacyjne'],
  ['zaległ', 'alert-zaleglosc'],
  ['składk', 'alert-zaleglosc'],
]

export function findExplanationForQuestion(question: string): Explanation {
  const normalized = question.toLowerCase()
  const match = keywords.find(([keyword]) => normalized.includes(keyword))
  return match ? glossary[match[1]] : fallbackExplanation
}
