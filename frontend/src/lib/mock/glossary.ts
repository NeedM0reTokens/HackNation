import type { Explanation } from '@/lib/types'

export const glossary: Record<string, Explanation> = {
  'potracenie-1371': {
    id: 'potracenie-1371',
    title: 'Odliczenie 13,71% składek społecznych (podstawa netto)',
    summary:
      'Dlaczego odejmujemy 13,71%? Jest to łączna suma składek emerytalnej (9,76%), rentowej (1,5%) i chorobowej (2,45%) finansowanych ze środków pracownika. Dopiero od kwoty po potrąceniu składek ZUS wylicza przysługujące zasiłki.',
    details: [
      'Składka emerytalna pracownika: 9,76% podstawy.',
      'Składka rentowa pracownika: 1,50% podstawy.',
      'Składka chorobowa pracownika: 2,45% podstawy.',
      'Suma potrąceń: dokładnie 13,71% wynagrodzenia brutto.',
      'Minimalna gwarancja netto w 2026 r.: 4 147,10 zł (od płacy min. 4 806,00 zł).',
    ],
    legalBasis: 'art. 3 pkt 4 i art. 36 ust. 1 ustawy zasiłkowej (Dz.U. 2026 poz. 854)',
  },
  'cashflow-ojciec-70': {
    id: 'cashflow-ojciec-70',
    title: 'Wypłata zasiłku dla ojca (stawka 70%)',
    summary:
      'Dlaczego w 9 tygodniach taty stawka wynosi 70%, a nie 81,5%? Dyrektywa Work-Life Balance gwarantuje 70% podstawy wymiaru dla wyłącznej, nieprzenoszalnej części urlopu rodzicielskiego drugiego rodzica.',
    details: [
      'Pula ojca: 9 tygodni z łącznej puli 41 tygodni urlopu rodzicielskiego.',
      'Zawsze 70%: zasiłek wynosi 70% podstawy wymiaru ojca (niezależnie od wariantu matki 81,5%).',
      'Nieprzenoszalność: jeśli tata nie wykorzysta tych 9 tygodni, uprawnienie bezpowrotnie przepada.',
      'Urlop ojcowski: niezależnie od tego ojciec ma prawo do 14 dni urlopu ojcowskiego płatnego 100%.',
    ],
    legalBasis: 'art. 182(1a) § 4 KP w zw. z art. 31 ust. 3 pkt 2 ustawy zasiłkowej',
  },
  'status-ubezpieczenia-aktywny': {
    id: 'status-ubezpieczenia-aktywny',
    title: 'Status ubezpieczenia chorobowego: AKTYWNY',
    summary:
      'Co oznacza status AKTYWNY? Płatnik składek opłacił deklarację DRA w terminie do 15./20. dnia miesiąca oraz prawidłowo zgłosił Cię do ubezpieczeń społecznych.',
    details: [
      'Terminy deklaracji DRA: do 15. dnia (jednostki budżetowe) lub do 20. dnia miesiąca (pozostali płatnicy).',
      'Ciągłość uprawnień: status aktywny potwierdza prawo do zasiłku macierzyńskiego od pierwszego dnia porodu.',
      'Stan konta płatnika: brak zadłużenia blokującego wypłatę powyżej 48,06 zł (art. 2a).',
      'Weryfikacja online: dane są zsynchronizowane z Centralnym Rejestrem Ubezpieczonych ZUS.',
    ],
    legalBasis: 'art. 36 i art. 47 ustawy o systemie ubezpieczeń społecznych (Dz.U. 2026 poz. 1245)',
  },
  'ryzyko-pozornosc-umowy': {
    id: 'ryzyko-pozornosc-umowy',
    title: 'Pozorność zatrudnienia i kontrola ZUS (art. 83 § 1 KC)',
    summary:
      'Kiedy ZUS bada pozorność umowy? Gdy umowa została zawarta krótko przed porodem z wysoką pensją, a ubezpieczona nie świadczyła realnie pracy. ZUS weryfikuje faktyczne wykonywanie obowiązków pracowniczych.',
    details: [
      'Co bada ZUS: obecność na stanowisku, dowody wykonywania pracy (e-maile, dokumenty, raporty), potrzebę zatrudnienia pracownika.',
      'Skutki pozorności: ZUS wydaje decyzję o niepodleganiu ubezpieczeniom, co oznacza brak zasiłku i nakaz zwrotu wypłaconych kwot.',
      'Zawyżenie pensji: ZUS może również obniżyć podstawę wymiaru zasiłku, jeśli pensja była rażąco wyższa od rynkowej.',
      'Działalność gospodarcza: kontrola obejmuje także rejestrację JDG tuż przed zwolnieniem lekarskim z wysoką deklaracją składek.',
    ],
    legalBasis: 'art. 83 § 1 Kodeksu cywilnego w zw. z art. 68 ust. 1 i art. 83 ust. 1 ustawy o SUS',
  },
  'pole-wynagrodzenie-brutto': {
    id: 'pole-wynagrodzenie-brutto',
    title: 'Średnie miesięczne wynagrodzenie brutto (PLN)',
    summary:
      'Wpisz przeciętne miesięczne wynagrodzenie BRUTTO z ostatnich 12 miesięcy kalendarzowych poprzedzających miesiąc porodu lub choroby. ZUS sam pomniejszy tę kwotę o 13,71% (składki finansowane przez pracownika). Nie wpisuj kwoty netto.',
    details: [
      'Co wpisać: podstawę z umowy o pracę (wraz ze stałymi i zmiennymi premiami regulaminowymi).',
      'Premie kwartalne i roczne: premie kwartalne wlicza się w 1/12 sumy z 4 kwartałów, a 13-tkę w 1/12.',
      'Minimalna gwarancja 2026: podstawa zasiłku przy całym etacie nie może być niższa niż 4 147,10 zł netto (od 4 806 zł brutto).',
      'Działalność gospodarcza (JDG): wpisz zadeklarowaną kwotę podstawy składek, a nie przychód z faktur.',
    ],
    legalBasis: 'art. 36 ust. 1, art. 45 i art. 48 ustawy zasiłkowej (Dz.U. 2026 poz. 854)',
  },
  'gross-salary': {
    id: 'pole-wynagrodzenie-brutto',
    title: 'Średnie miesięczne wynagrodzenie brutto (PLN)',
    summary:
      'Wpisz przeciętne miesięczne wynagrodzenie BRUTTO z ostatnich 12 miesięcy kalendarzowych poprzedzających poród. ZUS sam odejmie 13,71% składek społecznych pracownika.',
    details: [
      'Wpisz kwotę brutto z umowy o pracę lub zadeklarowaną podstawę składek z działalności.',
      'Gwarantowana podstawa minimalna w 2026 r.: 4 147,10 zł netto.',
    ],
    legalBasis: 'art. 36 ustawy zasiłkowej',
  },
  'pole-staz-ubezpieczenia': {
    id: 'pole-staz-ubezpieczenia',
    title: 'Staż ubezpieczenia w dniach',
    summary:
      'Łączna liczba dni nieprzerwanego podlegania ubezpieczeniu chorobowemu. Decyduje o prawie do zasiłku chorobowego w ciąży (okres wyczekiwania). Pamiętaj: zasiłek macierzyński NIE wymaga okresu wyczekiwania – wystarczy ubezpieczenie w dniu porodu!',
    details: [
      'Umowa o pracę (obowiązkowe): prawo do zasiłku chorobowego po 30 dniach ubezpieczenia.',
      'Działalność / zlecenie (dobrowolne): prawo do zasiłku chorobowego po 90 dniach opłacania składek.',
      'Zasiłek macierzyński: przysługuje od 1. dnia bez względu na staż, o ile trwała składka.',
      'Łączenie okresów: poprzednie okresy ubezpieczenia wliczają się, jeśli przerwa nie przekroczyła 30 dni.',
    ],
    legalBasis: 'art. 4 ust. 1 i art. 29 ustawy zasiłkowej',
  },
  'insured-days': {
    id: 'pole-staz-ubezpieczenia',
    title: 'Staż ubezpieczenia w dniach',
    summary:
      'Liczba dni ubezpieczenia chorobowego. Przy umowie o pracę karencja na L4 wynosi 30 dni, przy JDG/zleceniu 90 dni. Na zasiłek macierzyński karencji brak!',
    details: ['Przerwa do 30 dni nie kasuje poprzedniego stażu.'],
    legalBasis: 'art. 4 ustawy zasiłkowej',
  },
  'pole-forma-zatrudnienia': {
    id: 'pole-forma-zatrudnienia',
    title: 'Forma zatrudnienia i tytuł ubezpieczenia',
    summary:
      'Wybierz podstawę prawną wykonywanej pracy: umowa o pracę (UoP), umowa zlecenie lub działalność gospodarcza (JDG). Od tego zależy obowiązek ubezpieczenia, ochrona Kodeksu pracy oraz to, kto wypłaca zasiłek.',
    details: [
      'Umowa o pracę: ubezpieczenie jest obowiązkowe; przysługuje szczególna ochrona przed zwolnieniem (art. 177 KP).',
      'Umowa zlecenie i JDG: ubezpieczenie jest dobrowolne – musisz terminowo opłacać składkę 2,45%.',
      'Kto wypłaca zasiłek: pracodawca powyżej 20 ubezpieczonych wypłaca sam; małe firmy i JDG obsługuje bezpośrednio ZUS.',
      'Przedsiębiorcy (JDG): sprawdź stan zadłużenia – dług powyżej 48,06 zł (art. 2a) wstrzymuje wypłatę.',
    ],
    legalBasis: 'art. 6, art. 11, art. 61 ustawy o SUS oraz art. 177 Kodeksu pracy',
  },
  'employment': {
    id: 'pole-forma-zatrudnienia',
    title: 'Forma zatrudnienia i tytuł ubezpieczenia',
    summary:
      'Wybór umowy determinuje zasady wypłaty: pracodawca (>20 osób) lub ZUS (<=20 osób oraz JDG).',
    details: [
      'Na etacie ubezpieczenie chorobowe jest obowiązkowe.',
      'Na JDG i zleceniu ubezpieczenie chorobowe wymaga zgłoszenia dobrowolnego.',
    ],
    legalBasis: 'art. 61 ustawy zasiłkowej',
  },
  'pole-data-porodu': {
    id: 'pole-data-porodu',
    title: 'Planowana data porodu / Data przyjęcia dziecka',
    summary:
      'Data porodu uruchamia bieg kluczowych terminów ZUS, w tym nieprzekraczalnego terminu 21 dni na złożenie wniosku o stałą uśrednioną stawkę 81,5% za cały okres opieki.',
    details: [
      'Zasada 21 dni: złożenie wniosku ZAM w ciągu 21 dni od narodzin gwarantuje stawkę 81,5% przez cały rok.',
      'Przekroczenie terminu 21 dni: wypłata wynosi 100% za macierzyński i 70% za rodzicielski.',
      'Urlop przed porodem: matka może wykorzystać do 6 tygodni urlopu macierzyńskiego jeszcze przed porodem.',
      'Adopcja / rodzina zastępcza: termin biegnie od dnia przyjęcia dziecka na wychowanie.',
    ],
    legalBasis: 'art. 180 § 2 KP oraz art. 30a ustawy zasiłkowej',
  },
  'due-date': {
    id: 'pole-data-porodu',
    title: 'Planowana data porodu',
    summary:
      'Kluczowa data determinująca terminy ZUS: masz dokładnie 21 dni od narodzin na złożenie wniosku o stałą stawkę 81,5%.',
    details: ['Możesz zacząć macierzyński do 6 tygodni przed tą datą.'],
    legalBasis: 'art. 30a ustawy zasiłkowej',
  },
  'pole-rola-wnioskodawcy': {
    id: 'pole-rola-wnioskodawcy',
    title: 'Rola wnioskodawcy (Matka / Ojciec / Opiekun)',
    summary:
      'Przepisy Kodeksu pracy określają odrębne pule uprawnień dla każdego z rodziców. Matka posiada obowiązkowe 14 tygodni macierzyńskiego, ojciec ma wyłączny urlop ojcowski (14 dni, 100%) oraz 9 tygodni nieprzenoszalnego urlopu rodzicielskiego (70%).',
    details: [
      'Matka: 20 tygodni urlopu macierzyńskiego (14 tygodni musi wykorzystać osobiście po porodzie).',
      'Ojciec: może przejąć urlop po 14. tygodniu matki, ma też 14 dni urlopu ojcowskiego i 9 tyg. rodzicielskiego.',
      'Sytuacje szczególne: ojciec może przejąć urlop wcześniej w razie hospitalizacji, niezdolności do egzystencji lub zgonu matki.',
      'Opiekun / Rodzina zastępcza: przysługuje urlop na warunkach macierzyńskiego (minimum 9 tygodni gwarantowanych).',
    ],
    legalBasis: 'art. 180 § 4-17, art. 182(1a) § 4 i art. 182(3) Kodeksu pracy',
  },
  'pole-l4-ciaza': {
    id: 'pole-l4-ciaza',
    title: 'Zwolnienie lekarskie w ciąży (kod „B” i 100% zasiłku)',
    summary:
      'Elektroniczne zwolnienie lekarskie e-ZLA z kodem „B” potwierdza niezdolność do pracy w okresie ciąży. Zapewnia wypłatę 100% podstawy wymiaru oraz wydłużony okres zasiłkowy aż do 270 dni.',
    details: [
      'Wysokość świadczenia: 100% podstawy wymiaru zasiłku (zamiast standardowych 80%).',
      'Maksymalny okres pobierania: 270 dni w okresie ciąży (standardowo 182 dni).',
      'Kto płaci pracownikowi: pierwsze 33 dni w roku – pracodawca (wynagrodzenie chorobowe), od 34. dnia – ZUS (zasiłek).',
      'Przejście na macierzyński: jeśli niezdolność trwa do porodu, od dnia narodzin automatycznie przysługuje zasiłek macierzyński.',
    ],
    legalBasis: 'art. 8 ust. 2 i art. 11 ust. 2 pkt 1 ustawy zasiłkowej',
  },
  'pole-wczesniak-hospitalizacja': {
    id: 'pole-wczesniak-hospitalizacja',
    title: 'Wcześniak lub hospitalizacja noworodka (Uzupełniający urlop macierzyński)',
    summary:
      'Rodzicom dzieci urodzonych przedwcześnie lub hospitalizowanych po narodzinach przysługuje prawo do dodatkowego, uzupełniającego urlopu macierzyńskiego, w 100% płatnego podstawy.',
    details: [
      'Wcześniak skrajny (do 28. tyg. ciąży lub masa <= 1000g): do 15 tygodni uzupełniającego urlopu 100%.',
      'Wcześniak umiarkowany (28-36. tydzień ciąży): do 8 tygodni uzupełniającego urlopu 100%.',
      'Dziecko urodzone o czasie: tydzień urlopu za każdy pełny tydzień hospitalizacji (jeśli pobyt trwał min. 2 dni w okresie 8-28. dnia życia).',
      'Wymagany dokument: zaświadczenie lekarskie ze szpitala o okresie pobytu noworodka.',
    ],
    legalBasis: 'art. 180(1) i art. 180(2) Kodeksu pracy',
  },
  'pole-ustawa-za-zyciem': {
    id: 'pole-ustawa-za-zyciem',
    title: 'Zaświadczenie z Ustawy „Za życiem” (+24 tyg. i 4 000 zł)',
    summary:
      'Zaświadczenie potwierdzające ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę zagrażającą życiu powstałą w prenatalnym okresie rozwoju dziecka uprawnia do wydłużonego urlopu i wsparcia.',
    details: [
      'Wydłużony urlop rodzicielski: do 65 tygodni (jedno dziecko) lub 67 tygodni (bliźnięta) – o 24 tygodnie dłużej.',
      'Jednorazowe świadczenie "Za życiem": 4 000 zł bezzwrotnego wsparcia finansowego.',
      'Kto wystawia: lekarz ubezpieczenia zdrowotnego ze specjalizacją II stopnia (położnictwo, perinatologia, neonatologia itp.).',
      'Wniosek do ZUS: formularz ZAM wraz z dołączonym zaświadczeniem lekarskim.',
    ],
    legalBasis: 'art. 4 ust. 3 ustawy „Za życiem” w zw. z art. 182(1a) § 2 Kodeksu pracy',
  },
  'pole-dochod-drugiego-rodzica': {
    id: 'pole-dochod-drugiego-rodzica',
    title: 'Wynagrodzenie drugiego rodzica i 9 tygodni ojca',
    summary:
      'Zgodnie z unijną dyrektywą Work-Life Balance, ojciec dziecka posiada wyłączne, 9-tygodniowe prawo do urlopu rodzicielskiego. Zasiłek za ten okres naliczany jest z jego własnej pensji brutto (70%).',
    details: [
      'Stawka 70%: 9 tygodni taty jest płatne w wysokości 70% jego własnej podstawy wymiaru.',
      'Urlop ojcowski: ojciec ma niezależne prawo do 14 dni urlopu ojcowskiego płatnego w 100%.',
      'Brak możliwości przeniesienia: jeśli ojciec nie wykorzysta swoich 9 tygodni do końca 6. r.ż. dziecka, dni te przepadają.',
      'Wspólne korzystanie: rodzice mogą przebywać na urlopie rodzicielskim w tym samym czasie.',
    ],
    legalBasis: 'art. 182(1a) § 4 i § 5 oraz art. 182(3) Kodeksu pracy',
  },
  'pole-pol-etatu': {
    id: 'pole-pol-etatu',
    title: 'Łączenie urlopu rodzicielskiego z pracą na 1/2 etatu',
    summary:
      'Pracownik może łączyć korzystanie z urlopu rodzicielskiego z pracą u obecnego pracodawcy w wymiarze do 1/2 pełnego etatu. Urlop rodzicielski ulega wtedy proporcjonalnemu wydłużeniu aż do 64 lub 82 tygodni!',
    details: [
      'Maksymalny wymiar: praca na nie więcej niż 1/2 etatu u dotychczasowego pracodawcy.',
      'Wydłużenie urlopu: proporcjonalne (np. 32 tygodnie na 1/2 etatu = 64 tygodnie pobytu z dzieckiem).',
      'Podwójny wpływ finansowy: pensja z pracy za przepracowaną część etatu + proporcjonalny zasiłek macierzyński z ZUS.',
      'Wniosek: pracownik składa wniosek u pracodawcy min. 21 dni przed rozpoczęciem łączenia pracy z urlopem.',
    ],
    legalBasis: 'art. 182(1e) i art. 182(1f) Kodeksu pracy',
  },
  'pole-zadluzenie-art2a': {
    id: 'pole-zadluzenie-art2a',
    title: 'Weryfikacja zadłużenia składkowego (art. 2a ustawy zasiłkowej)',
    summary:
      'Dla osób prowadzących działalność gospodarczą (JDG) zadłużenie z tytułu składek przekraczające 1% minimalnego wynagrodzenia (w 2026 r.: 48,06 zł) blokuje wypłatę zasiłku!',
    details: [
      'Ustawowy próg tolerancji w 2026 r.: dokładnie 48,06 zł zaległości.',
      'Zawieszenie wypłaty: ZUS wstrzymuje wypłatę do czasu pełnego uregulowania długu.',
      'Termin 6 miesięcy: jeśli dług zostanie spłacony w ciągu 6 miesięcy, ZUS wypłaci zasiłek wstecz.',
      'Przedawnienie po 6 miesiącach: brak spłaty oznacza bezpowrotną utratę prawa do świadczenia.',
    ],
    legalBasis: 'art. 2a ustawy o świadczeniach pieniężnych z ubezpieczenia społecznego',
  },
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
