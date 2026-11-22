import json
import logging
import os
import uuid
from typing import Any

import httpx

from ..models.assistant import (
    AssistantAskRequest,
    AssistantAskResponse,
    AssistantStatusResponse,
    AssistantTopicResponse,
)

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"
FALLBACK_GEMINI_MODELS = (
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
)
GEMINI_ENDPOINT_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
)

ZUS_ASSISTANT_SYSTEM_INSTRUCTION = (
    "Jesteś oficjalnym Doradcą AI portalu Zasiłkowy Przewodnik Przyszłego Rodzica (ZUS 2026).\n"
    "Tłumaczysz skomplikowane przepisy ubezpieczeniowe na prosty język urzędowy (Plain Polish),\n"
    "z zachowaniem 100% precyzji prawnej na stan prawny 2026 roku.\n\n"
    "BEZWZGLĘDNE OGRANICZENIE TEMATYCZNE:\n"
    "Odpowiadasz WYŁĄCZNIE na pytania związane z ZUS, świadczeniami, zasiłkami, prawem pracy "
    "oraz rodzicielstwem. Jeśli użytkownik zada pytanie niezwiązane z ZUS (np. gotowanie, "
    "pogoda, sport, programowanie, wiedza ogólna itp.), KATEGORYCZNIE ODMÓW odpowiedzi i "
    "wyjaśnij, że jako wirtualny doradca ZUS pomagasz wyłącznie w sprawach ubezpieczeniowych "
    "i zasiłkach rodzicielskich.\n\n"
    "ZASADY PRAWNE 2026:\n"
    "1. Płaca minimalna 2026: 4 806,00 zł brutto. Składki finansowane przez pracownika: 13,71%.\n"
    "2. Okres wyczekiwania: 30 dni (umowa o pracę), 90 dni (zlecenie / JDG dobrowolnie).\n"
    "   Zasiłek macierzyński nie ma okresu wyczekiwania - wystarczy ubezpieczenie w dniu porodu.\n"
    "3. Ciąża: kod 'B' w e-ZLA daje 100% podstawy wymiaru, max 270 dni pobierania.\n"
    "   Płatnik >20 pracowników płaci wynagrodzenie do 33 dni (14 dni po 50. r.ż.), potem ZUS.\n"
    "   Płatnik <=20 pracowników: ZUS płaci od 1. dnia.\n"
    "   Świadczenie rehabilitacyjne w ciąży: 100% podstawy (art. 19 ust. 1 ustawy zasiłkowej).\n"
    "4. Urlop macierzyński: 20 tyg. (1 dziecko), 31 (bliźnięta), 33 (3), 35 (4), 37 (5+).\n"
    "   14 tyg. obowiązkowo dla matki; po 14 tyg. resztę może przejąć ojciec.\n"
    "5. Urlop rodzicielski: 41 tyg. (1 dziecko), 43 tyg. (bliźnięta).\n"
    "   W tym 9 tygodni nieprzenoszalnych wyłącznie dla drugiego rodzica (art. 182(1a) § 4 KP).\n"
    "6. Warianty zasiłku: 81,5% ujednolicone (wniosek ZAM o wariant ujednolicony "
    "w 21 dni) LUB 100% macierzyński i 70% rodzicielski. 9 tyg. ojca zawsze 70%.\n"
    "7. Urlop ojcowski: 14 dni, 100% podstawy, do 12 mies. życia dziecka (art. 182(3) KP).\n"
    "8. Zaświadczenie 'Za życiem': wydłużony urlop rodzicielski do 65/67 tyg. i 4 000 zł.\n"
    "9. Wcześniak / hospitalizacja noworodka: uzupełniający urlop macierzyński 100% (do 15 tyg.).\n"
    "10. Łączenie rodzicielskiego z pracą: max 1/2 etatu, proporcjonalne wydłużenie urlopu.\n"
    "11. Adopcja: urlop na warunkach macierzyńskiego do 7 lat (10/14 lat), min. 9 tyg.\n\n"
    'Zwróć odpowiedź WYŁĄCZNIE jako JSON: {"title": "...", "summary": "...", '
    '"details": ["..."], "legal_basis": "..."}'
)

def _normalize_text(text: str) -> str:
    accents = {
        "ą": "a",
        "ć": "c",
        "ę": "e",
        "ł": "l",
        "ń": "n",
        "ó": "o",
        "ś": "s",
        "ź": "z",
        "ż": "z",
    }
    normalized = text.lower()
    for accented, plain in accents.items():
        normalized = normalized.replace(accented, plain)
    return normalized


TOPIC_ALIASES: dict[str, str] = {
    "gross-salary": "pole-wynagrodzenie-brutto",
    "grosssalary": "pole-wynagrodzenie-brutto",
    "wynagrodzenie": "pole-wynagrodzenie-brutto",
    "wynagrodzenie-brutto": "pole-wynagrodzenie-brutto",
    "podstawa": "pole-wynagrodzenie-brutto",
    "insured-days": "pole-staz-ubezpieczenia",
    "insureddays": "pole-staz-ubezpieczenia",
    "staz": "pole-staz-ubezpieczenia",
    "staz-ubezpieczenia": "pole-staz-ubezpieczenia",
    "employment": "pole-forma-zatrudnienia",
    "forma-zatrudnienia": "pole-forma-zatrudnienia",
    "due-date": "pole-data-porodu",
    "duedate": "pole-data-porodu",
    "data-porodu": "pole-data-porodu",
    "role": "pole-rola-wnioskodawcy",
    "rola": "pole-rola-wnioskodawcy",
    "rola-wnioskodawcy": "pole-rola-wnioskodawcy",
    "pregnancy-sick-leave": "pole-l4-ciaza",
    "pregnancysickleave": "pole-l4-ciaza",
    "l4-ciaza": "pole-l4-ciaza",
    "premature": "pole-wczesniak-hospitalizacja",
    "wczesniak": "pole-wczesniak-hospitalizacja",
    "zazyciem": "pole-ustawa-za-zyciem",
    "za-zyciem": "pole-ustawa-za-zyciem",
    "ustawa-za-zyciem": "pole-ustawa-za-zyciem",
    "partner-gross-salary": "pole-dochod-drugiego-rodzica",
    "partnergrosssalary": "pole-dochod-drugiego-rodzica",
    "dochod-partnera": "pole-dochod-drugiego-rodzica",
    "pol-etatu": "pole-pol-etatu",
    "laczenie-z-praca": "pole-pol-etatu",
    "parental-work": "pole-pol-etatu",
    "zadluzenie-art2a": "pole-zadluzenie-art2a",
    "art-2a": "pole-zadluzenie-art2a",
    "zadluzenie": "pole-zadluzenie-art2a",
    "potracenie-1371": "potracenie-1371",
    "podstawa-netto-1371": "potracenie-1371",
    "skladki-1371": "potracenie-1371",
    "cashflow-ojciec-70": "cashflow-ojciec-70",
    "wyplata-tata-70": "cashflow-ojciec-70",
    "9-tygodni-taty-70": "cashflow-ojciec-70",
    "status-ubezpieczenia-aktywny": "status-ubezpieczenia-aktywny",
    "status-aktywny": "status-ubezpieczenia-aktywny",
    "ubezpieczenie-aktywne": "status-ubezpieczenia-aktywny",
    "deklaracja-dra": "status-ubezpieczenia-aktywny",
    "ryzyko-pozornosc-umowy": "ryzyko-pozornosc-umowy",
    "pozornosc-zatrudnienia": "ryzyko-pozornosc-umowy",
    "pozornosc-umowy": "ryzyko-pozornosc-umowy",
    "kontrola-zus-pozornosc": "ryzyko-pozornosc-umowy",
}

STATUTORY_GLOSSARY: dict[str, dict[str, Any]] = {
    "potracenie-1371": {
        "id": "potracenie-1371",
        "title": "Odliczenie 13,71% składek społecznych (podstawa netto)",
        "summary": (
            "Dlaczego odejmujemy 13,71%? Jest to łączna suma składek emerytalnej (9,76%), "
            "rentowej (1,5%) i chorobowej (2,45%) finansowanych ze środków pracownika. "
            "Dopiero od kwoty po potrąceniu składek ZUS wylicza przysługujące zasiłki."
        ),
        "details": [
            "Składka emerytalna pracownika: 9,76% podstawy.",
            "Składka rentowa pracownika: 1,50% podstawy.",
            "Składka chorobowa pracownika: 2,45% podstawy.",
            "Suma potrąceń: dokładnie 13,71% wynagrodzenia brutto.",
            "Minimalna gwarancja netto w 2026 r.: 4 147,10 zł (od płacy min. 4 806,00 zł).",
        ],
        "legal_basis": "Art. 3 pkt 4 i art. 36 ust. 1 ustawy zasiłkowej (Dz.U. 2026 poz. 854)",
    },
    "cashflow-ojciec-70": {
        "id": "cashflow-ojciec-70",
        "title": "Wypłata zasiłku dla ojca (stawka 70%)",
        "summary": (
            "Dlaczego w 9 tygodniach taty stawka wynosi 70%, a nie 81,5%? Dyrektywa unijna "
            "Work-Life Balance gwarantuje 70% podstawy wymiaru dla wyłącznej, nieprzenoszalnej "
            "części urlopu rodzicielskiego drugiego rodzica."
        ),
        "details": [
            "Pula ojca: 9 tygodni z łącznej puli 41 tygodni urlopu rodzicielskiego.",
            "Zawsze 70%: zasiłek wynosi 70% podstawy wymiaru ojca (niezależnie od wariantu matki 81,5%).",
            "Nieprzenoszalność: jeśli tata nie wykorzysta tych 9 tygodni, uprawnienie bezpowrotnie przepada.",
            "Urlop ojcowski: niezależnie od tego ojciec ma prawo do 14 dni urlopu ojcowskiego płatnego 100%.",
        ],
        "legal_basis": "Art. 182(1a) § 4 KP w zw. z art. 31 ust. 3 pkt 2 ustawy zasiłkowej",
    },
    "status-ubezpieczenia-aktywny": {
        "id": "status-ubezpieczenia-aktywny",
        "title": "Status ubezpieczenia chorobowego: AKTYWNY",
        "summary": (
            "Co oznacza status AKTYWNY? Płatnik składek opłacił deklarację DRA w terminie "
            "do 15./20. dnia miesiąca oraz prawidłowo zgłosił Cię do ubezpieczeń społecznych."
        ),
        "details": [
            "Terminy deklaracji DRA: do 15. dnia (jednostki budżetowe) lub do 20. dnia miesiąca (pozostali płatnicy).",
            "Ciągłość uprawnień: status aktywny potwierdza prawo do zasiłku macierzyńskiego od pierwszego dnia porodu.",
            "Stan konta płatnika: brak zadłużenia blokującego wypłatę powyżej 48,06 zł (art. 2a).",
            "Weryfikacja online: dane są zsynchronizowane z Centralnym Rejestrem Ubezpieczonych ZUS.",
        ],
        "legal_basis": "Art. 36 i art. 47 ustawy o systemie ubezpieczeń społecznych (Dz.U. 2026 poz. 1245)",
    },
    "ryzyko-pozornosc-umowy": {
        "id": "ryzyko-pozornosc-umowy",
        "title": "Pozorność zatrudnienia i kontrola ZUS (art. 83 § 1 KC)",
        "summary": (
            "Kiedy ZUS bada pozorność umowy? Gdy umowa została zawarta krótko przed porodem "
            "z wysoką pensją, a ubezpieczona nie świadczyła realnie pracy. ZUS weryfikuje "
            "faktyczne wykonywanie obowiązków pracowniczych."
        ),
        "details": [
            "Co bada ZUS: obecność na stanowisku, dowody wykonywania pracy (e-maile, dokumenty, raporty), potrzebę zatrudnienia pracownika.",
            "Skutki pozorności: ZUS wydaje decyzję o niepodleganiu ubezpieczeniom, co oznacza brak zasiłku i nakaz zwrotu wypłaconych kwot.",
            "Zawyżenie pensji: ZUS może również obniżyć podstawę wymiaru zasiłku, jeśli pensja była rażąco wyższa od rynkowej.",
            "Działalność gospodarcza: kontrola obejmuje także rejestrację JDG tuż przed zwolnieniem lekarskim z wysoką deklaracją składek.",
        ],
        "legal_basis": "Art. 83 § 1 Kodeksu cywilnego w zw. z art. 68 ust. 1 i art. 83 ust. 1 ustawy o SUS",
    },
    "pole-wynagrodzenie-brutto": {
        "id": "pole-wynagrodzenie-brutto",
        "title": "Średnie miesięczne wynagrodzenie brutto (PLN)",
        "summary": (
            "Wpisz przeciętne miesięczne wynagrodzenie BRUTTO z ostatnich 12 miesięcy kalendarzowych "
            "poprzedzających miesiąc porodu lub choroby. ZUS sam pomniejszy tę kwotę o 13,71% "
            "(składki na ubezpieczenia społeczne finansowane przez pracownika). Nie wpisuj kwoty netto."
        ),
        "details": [
            "Co wpisać: podstawę z umowy o pracę (wraz ze stałymi i zmiennymi premiami regulaminowymi).",
            "Premie kwartalne i roczne: premie kwartalne wlicza się w 1/12 sumy z 4 kwartałów, a 13-tkę w 1/12.",
            "Minimalna gwarancja 2026: podstawa zasiłku przy całym etacie nie może być niższa niż 4 147,10 zł netto (od 4 806 zł brutto).",
            "Działalność gospodarcza (JDG): wpisz zadeklarowaną kwotę podstawy składek, a nie dochód z faktur.",
        ],
        "legal_basis": "Art. 36 ust. 1, art. 45 i art. 48 ustawy zasiłkowej (Dz.U. 2026 poz. 854)",
    },
    "pole-staz-ubezpieczenia": {
        "id": "pole-staz-ubezpieczenia",
        "title": "Staż ubezpieczenia w dniach",
        "summary": (
            "Łączna liczba dni nieprzerwanego podlegania ubezpieczeniu chorobowemu. Decyduje o "
            "prawie do zasiłku chorobowego w ciąży (okres wyczekiwania). Pamiętaj: zasiłek macierzyński "
            "NIE wymaga okresu wyczekiwania – wystarczy ubezpieczenie w dniu porodu!"
        ),
        "details": [
            "Umowa o pracę (obowiązkowe): prawo do zasiłku chorobowego po 30 dniach nieprzerwanego ubezpieczenia.",
            "Działalność / zlecenie (dobrowolne): prawo do zasiłku chorobowego po 90 dniach opłacania składek.",
            "Zasiłek macierzyński: przysługuje od 1. dnia porodu bez względu na staż, o ile trwała składka.",
            "Łączenie okresów: poprzednie okresy ubezpieczenia wliczają się, jeśli przerwa nie przekroczyła 30 dni.",
        ],
        "legal_basis": "Art. 4 ust. 1 i art. 29 ustawy zasiłkowej",
    },
    "pole-forma-zatrudnienia": {
        "id": "pole-forma-zatrudnienia",
        "title": "Forma zatrudnienia i tytuł ubezpieczenia",
        "summary": (
            "Wybierz podstawę prawną wykonywanej pracy: umowa o pracę (UoP), umowa zlecenie lub "
            "działalność gospodarcza (JDG). Od tego zależy obowiązek ubezpieczenia, ochrona Kodeksu pracy "
            "oraz to, czy zasiłek wypłaci pracodawca, czy bezpośrednio ZUS."
        ),
        "details": [
            "Umowa o pracę: ubezpieczenie chorobowe jest obowiązkowe; przysługuje szczególna ochrona przed zwolnieniem (art. 177 KP).",
            "Umowa zlecenie i JDG: ubezpieczenie chorobowe jest dobrowolne – musisz terminowo opłacać składkę 2,45%.",
            "Kto wypłaca zasiłek: pracodawca zatrudniający powyżej 20 osób wypłaca sam; przy małych firmach i JDG wypłaca bezpośrednio ZUS.",
            "Przedsiębiorcy (JDG): sprawdź stan zadłużenia – dług powyżej 48,06 zł (art. 2a) wstrzymuje wypłatę zasiłku.",
        ],
        "legal_basis": "Art. 6, art. 11, art. 61 ustawy o SUS oraz art. 177 Kodeksu pracy",
    },
    "pole-data-porodu": {
        "id": "pole-data-porodu",
        "title": "Planowana data porodu / Data przyjęcia dziecka",
        "summary": (
            "Data porodu uruchamia bieg kluczowych terminów ZUS, w tym nieprzekraczalnego terminu "
            "21 dni na złożenie wniosku o stałą uśrednioną stawkę 81,5% za cały okres opieki."
        ),
        "details": [
            "Zasada 21 dni: złożenie wniosku ZAM w ciągu 21 dni od narodzin gwarantuje stawkę 81,5% przez cały rok.",
            "Przekroczenie terminu 21 dni: wypłata wynosi 100% za macierzyński i 70% za rodzicielski.",
            "Urlop przed porodem: matka może wykorzystać do 6 tygodni urlopu macierzyńskiego jeszcze przed porodem.",
            "Adopcja / rodzina zastępcza: termin biegnie od dnia przyjęcia dziecka na wychowanie.",
        ],
        "legal_basis": "Art. 180 § 2 KP oraz art. 30a ustawy zasiłkowej",
    },
    "pole-rola-wnioskodawcy": {
        "id": "pole-rola-wnioskodawcy",
        "title": "Rola wnioskodawcy (Matka / Ojciec / Opiekun)",
        "summary": (
            "Przepisy Kodeksu pracy określają odrębne pule uprawnień dla każdego z rodziców. "
            "Matka posiada obowiązkowe 14 tygodni macierzyńskiego, ojciec ma wyłączny urlop ojcowski (14 dni, 100%) "
            "oraz 9 tygodni nieprzenoszalnego urlopu rodzicielskiego (70%)."
        ),
        "details": [
            "Matka: 20 tygodni urlopu macierzyńskiego (14 tygodni musi wykorzystać osobiście po porodzie).",
            "Ojciec: może przejąć urlop po 14. tygodniu matki, ma też 14 dni urlopu ojcowskiego i 9 tyg. rodzicielskiego.",
            "Sytuacje szczególne: ojciec może przejąć urlop wcześniej w razie hospitalizacji, niezdolności do egzystencji lub zgonu matki.",
            "Opiekun / Rodzina zastępcza: przysługuje urlop na warunkach macierzyńskiego (minimum 9 tygodni gwarantowanych).",
        ],
        "legal_basis": "Art. 180 § 4-17, art. 182(1a) § 4 i art. 182(3) Kodeksu pracy",
    },
    "pole-l4-ciaza": {
        "id": "pole-l4-ciaza",
        "title": "Zwolnienie lekarskie w ciąży (kod „B” i 100% zasiłku)",
        "summary": (
            "Elektroniczne zwolnienie lekarskie e-ZLA z kodem „B” potwierdza niezdolność do pracy w okresie ciąży. "
            "Zapewnia wypłatę 100% podstawy wymiaru oraz wydłużony okres zasiłkowy aż do 270 dni."
        ),
        "details": [
            "Wysokość świadczenia: 100% podstawy wymiaru zasiłku (zamiast standardowych 80%).",
            "Maksymalny okres pobierania: 270 dni w okresie ciąży (standardowo 182 dni).",
            "Kto płaci pracownikowi: pierwsze 33 dni w roku – pracodawca (wynagrodzenie chorobowe), od 34. dnia – ZUS (zasiłek).",
            "Przejście na macierzyński: jeśli niezdolność trwa do porodu, od dnia narodzin automatycznie przysługuje zasiłek macierzyński.",
        ],
        "legal_basis": "Art. 8 ust. 2 i art. 11 ust. 2 pkt 1 ustawy zasiłkowej",
    },
    "pole-wczesniak-hospitalizacja": {
        "id": "pole-wczesniak-hospitalizacja",
        "title": "Wcześniak lub hospitalizacja noworodka (Uzupełniający urlop macierzyński)",
        "summary": (
            "Rodzicom dzieci urodzonych przedwcześnie lub hospitalizowanych po narodzinach przysługuje "
            "prawo do dodatkowego, uzupełniającego urlopu macierzyńskiego, w 100% płatnego podstawy."
        ),
        "details": [
            "Wcześniak skrajny (do 28. tyg. ciąży lub masa <= 1000g): do 15 tygodni uzupełniającego urlopu 100%.",
            "Wcześniak umiarkowany (28-36. tydzień ciąży): do 8 tygodni uzupełniającego urlopu 100%.",
            "Dziecko urodzone o czasie: tydzień urlopu za każdy pełny tydzień hospitalizacji (jeśli pobyt trwał min. 2 dni w okresie 8-28. dnia życia).",
            "Wymagany dokument: zaświadczenie lekarskie ze szpitala o okresie pobytu noworodka.",
        ],
        "legal_basis": "Art. 180(1) i art. 180(2) Kodeksu pracy",
    },
    "pole-ustawa-za-zyciem": {
        "id": "pole-ustawa-za-zyciem",
        "title": "Zaświadczenie z Ustawy „Za życiem” (+24 tyg. i 4 000 zł)",
        "summary": (
            "Zaświadczenie potwierdzające ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę "
            "zagrażającą życiu powstałą w prenatalnym okresie rozwoju dziecka uprawnia do wydłużonego urlopu i wsparcia."
        ),
        "details": [
            "Wydłużony urlop rodzicielski: do 65 tygodni (jedno dziecko) lub 67 tygodni (bliźnięta) – o 24 tygodnie dłużej.",
            "Jednorazowe świadczenie 'Za życiem': 4 000 zł bezzwrotnego wsparcia finansowego.",
            "Kto wystawia: lekarz ubezpieczenia zdrowotnego ze specjalizacją II stopnia (położnictwo, perinatologia, neonatologia itp.).",
            "Wniosek do ZUS: formularz ZAM wraz z dołączonym zaświadczeniem lekarskim.",
        ],
        "legal_basis": "Art. 4 ust. 3 ustawy „Za życiem” w zw. z art. 182(1a) § 2 Kodeksu pracy",
    },
    "pole-dochod-drugiego-rodzica": {
        "id": "pole-dochod-drugiego-rodzica",
        "title": "Wynagrodzenie drugiego rodzica i 9 tygodni ojca",
        "summary": (
            "Zgodnie z unijną dyrektywą Work-Life Balance, ojciec dziecka posiada wyłączne, 9-tygodniowe "
            "prawo do urlopu rodzicielskiego. Zasiłek za ten okres naliczany jest z jego własnej pensji brutto (70%)."
        ),
        "details": [
            "Stawka 70%: 9 tygodni taty jest płatne w wysokości 70% jego własnej podstawy wymiaru.",
            "Urlop ojcowski: ojciec ma niezależne prawo do 14 dni urlopu ojcowskiego płatnego w 100%.",
            "Brak możliwości przeniesienia: jeśli ojciec nie wykorzysta swoich 9 tygodni do końca 6. r.ż. dziecka, dni te bezpowrotnie przepadają.",
            "Wspólne korzystanie: rodzice mogą przebywać na urlopie rodzicielskim w tym samym czasie.",
        ],
        "legal_basis": "Art. 182(1a) § 4 i § 5 oraz art. 182(3) Kodeksu pracy",
    },
    "pole-pol-etatu": {
        "id": "pole-pol-etatu",
        "title": "Łączenie urlopu rodzicielskiego z pracą na 1/2 etatu",
        "summary": (
            "Pracownik może łączyć korzystanie z urlopu rodzicielskiego z pracą u obecnego pracodawcy "
            "w wymiarze do 1/2 pełnego etatu. Urlop rodzicielski ulega wtedy proporcjonalnemu wydłużeniu aż do 64 lub 82 tygodni!"
        ),
        "details": [
            "Maksymalny wymiar: praca na nie więcej niż 1/2 etatu u dotychczasowego pracodawcy.",
            "Wydłużenie urlopu: proporcjonalne (np. 32 tygodnie na 1/2 etatu = 64 tygodnie pobytu z dzieckiem).",
            "Podwójny wpływ finansowy: pensja z pracy za przepracowaną część etatu + proporcjonalny zasiłek macierzyński z ZUS.",
            "Wniosek: pracownik składa wniosek u pracodawcy min. 21 dni przed rozpoczęciem łączenia pracy z urlopem.",
        ],
        "legal_basis": "Art. 182(1e) i art. 182(1f) Kodeksu pracy",
    },
    "pole-zadluzenie-art2a": {
        "id": "pole-zadluzenie-art2a",
        "title": "Weryfikacja zadłużenia składkowego (art. 2a ustawy zasiłkowej)",
        "summary": (
            "Dla osób prowadzących działalność gospodarczą (JDG) zadłużenie z tytułu składek "
            "przekraczające 1% minimalnego wynagrodzenia (w 2026 r.: 48,06 zł) blokuje wypłatę zasiłku!"
        ),
        "details": [
            "Ustawowy próg tolerancji w 2026 r.: dokładnie 48,06 zł zaległości.",
            "Zawieszenie wypłaty: ZUS wstrzymuje wypłatę do czasu pełnego uregulowania długu.",
            "Termin 6 miesięcy: jeśli dług zostanie spłacony w ciągu 6 miesięcy, ZUS wypłaci zasiłek wstecz.",
            "Przedawnienie po 6 miesiącach: brak spłaty oznacza bezpowrotną utratę prawa do świadczenia za ten okres.",
        ],
        "legal_basis": "Art. 2a ustawy o świadczeniach pieniężnych z ubezpieczenia społecznego",
    },
    "podstawa-wymiaru": {
        "id": "podstawa-wymiaru",
        "title": "Podstawa wymiaru zasiłku",
        "summary": (
            "Podstawa wymiaru to kwota, od której ZUS oblicza wysokość Twojego świadczenia. "
            "Dla pracowników na etacie stanowi ją przeciętne miesięczne wynagrodzenie brutto "
            "z 12 miesięcy poprzedzających poród lub chorobę, pomniejszone o 13,71% składek."
        ),
        "details": [
            "Na umowie o pracę: średnia z 12 pełnych miesięcy kalendarzowych przed zwolnieniem.",
            "Na działalności: zadeklarowana kwota podstawy składek z ostatnich 12 miesięcy.",
            "Krótszy staż: średnia z pełnych miesięcy kalendarzowych ubezpieczenia.",
        ],
        "legal_basis": "Art. 36 i art. 48 ustawy zasiłkowej",
    },
    "platnik-skladek": {
        "id": "platnik-skladek",
        "title": "Płatnik składek i wypłata zasiłku",
        "summary": (
            "Płatnikiem jest podmiot zgłaszający Cię do ubezpieczeń społecznych. "
            "Kto wypłaca zasiłek, zależy od liczby ubezpieczonych na dzień 30 listopada."
        ),
        "details": [
            "Płatnik zgłaszający powyżej 20 osób sam nalicza i wypłaca zasiłki pracownikom.",
            "Płatnik zgłaszający do 20 osób przekazuje dokumentację, a zasiłek wypłaca ZUS.",
            "W przypadku działalności gospodarczej wypłaty zawsze dokonuje ZUS.",
        ],
        "legal_basis": "Art. 61 ustawy zasiłkowej",
    },
    "okres-wyczekiwania": {
        "id": "okres-wyczekiwania",
        "title": "Okres wyczekiwania (karencja)",
        "summary": (
            "Okres wyczekiwania to minimalny czas podlegania ubezpieczeniu chorobowemu, "
            "wymagany do nabycia prawa do zasiłku chorobowego. Zasiłek macierzyński "
            "jest z tego wymogu całkowicie zwolniony."
        ),
        "details": [
            "Umowa o pracę (obowiązkowe): 30 dni nieprzerwanego ubezpieczenia.",
            "Działalność i zlecenie (dobrowolne): 90 dni nieprzerwanego ubezpieczenia.",
            "Zasiłek macierzyński: brak karencji - wystarczy opłacona składka w dniu porodu.",
        ],
        "legal_basis": "Art. 4 ustawy zasiłkowej",
    },
    "kod-b": {
        "id": "kod-b",
        "title": "Kod 'B' na zwolnieniu e-ZLA (ciąża)",
        "summary": (
            "Kod 'B' na elektronicznym zwolnieniu lekarskim oznacza niezdolność do pracy w ciąży. "
            "Gwarantuje wypłatę zasiłku chorobowego w pełnej wysokości 100% podstawy."
        ),
        "details": [
            "Zasiłek w ciąży wynosi 100% podstawy wymiaru (zamiast standardowych 80%).",
            "Maksymalny okres zasiłkowy w ciąży wynosi aż 270 dni (zamiast 182 dni).",
            "Lekarz oznacza kod automatycznie w e-ZLA - dane natychmiast trafiają do ZUS.",
        ],
        "legal_basis": "Art. 11 ust. 2 pkt 1 ustawy zasiłkowej",
    },
    "wariant-815": {
        "id": "wariant-815",
        "title": "Wariant uśredniony 81,5% vs 100% i 70%",
        "summary": (
            "Przyszła mama może wybrać wypłatę stałej kwoty 81,5% przez cały okres macierzyńskiego "
            "i rodzicielskiego LUB wariant zmienny: 100% za macierzyński i 70% za rodzicielski. "
            "Suma wypłaconych świadczeń w obu opcjach jest zbliżona."
        ),
        "details": [
            "Wniosek o stawkę 81,5% należy złożyć w ciągu 21 dni po porodzie ",
            "(wniosek ZAM o wariant ujednolicony).",
            "Zapewnia stałe, równe wpływy na konto przez cały rok opieki nad dzieckiem.",
            "9 tygodni urlopu nieprzenoszalnego dla drugiego rodzica jest zawsze płatne 70%.",
        ],
        "legal_basis": "Art. 30a i art. 31 ustawy zasiłkowej",
    },
    "ojcowski": {
        "id": "ojcowski",
        "title": "Urlop ojcowski (14 dni)",
        "summary": (
            "Urlop ojcowski to wyłączne i samodzielne uprawnienie pracownika-ojca. "
            "Wynosi 14 dni kalendarzowych, jest płatny 100% podstawy i nie uszczupla urlopu matki."
        ),
        "details": [
            "Wymiar: 14 dni kalendarzowych z prawem do 100% zasiłku macierzyńskiego.",
            "Podział: można wykorzystać jednorazowo lub w 2 częściach po minimum 7 dni.",
            "Termin: do ukończenia przez dziecko 12. miesiąca życia (lub 14 lat przy adopcji).",
        ],
        "legal_basis": "Art. 182(3) Kodeksu pracy",
    },
    "nieprzenoszalne-9-tygodni": {
        "id": "nieprzenoszalne-9-tygodni",
        "title": "9 tygodni nieprzenoszalnego urlopu rodzicielskiego",
        "summary": (
            "Zgodnie z unijną dyrektywą Work-Life Balance, każdemu z rodziców przysługuje "
            "wyłączne prawo do 9 tygodni urlopu rodzicielskiego, którego nie można przekazać."
        ),
        "details": [
            "Łączny wymiar rodzicielskiego to 41 tygodni (lub 43 tyg. przy bliźniętach).",
            "Jeden rodzic może wykorzystać max 32 tygodnie; 9 tygodni pozostaje dla drugiego.",
            "Część 9 tygodni jest płatna w wysokości 70% podstawy wymiaru.",
        ],
        "legal_basis": "Art. 182(1a) § 4 Kodeksu pracy",
    },
    "za-zyciem": {
        "id": "za-zyciem",
        "title": "Ustawa 'Za życiem' i wydłużony urlop",
        "summary": (
            "W przypadku narodzin dziecka ze zdiagnozowanym ciężkim i nieodwracalnym upośledzeniem "
            "albo nieuleczalną chorobą zagrażającą życiu, rodzicom przysługują szczególne prawa."
        ),
        "details": [
            "Wydłużony urlop rodzicielski: do 65 tyg. (jedno dziecko) lub 67 tyg. (bliźnięta).",
            "Jednorazowe świadczenie pieniężne: 4 000 zł z tytułu urodzenia dziecka z orzeczeniem.",
            "Wymagane zaświadczenie od lekarza ze specjalizacją II stopnia lub specjalisty.",
        ],
        "legal_basis": "Ustawa o wsparciu kobiet w ciąży i rodzin 'Za życiem'",
    },
    "wczesniak": {
        "id": "wczesniak",
        "title": "Wcześniak i hospitalizacja dziecka (urlop uzupełniający)",
        "summary": (
            "Rodzicom wcześniaków oraz noworodków hospitalizowanych po porodzie przysługuje "
            "prawo do uzupełniającego urlopu macierzyńskiego, płatnego 100% podstawy."
        ),
        "details": [
            "Do 15 tygodni uzupełniającego urlopu przy porodzie przed 28. tyg. lub wadze <= 1000g.",
            "Do 8 tygodni uzupełniającego urlopu dla wcześniaków urodzonych między 28. a 36. tyg.",
            "Tydzień uzupełniającego urlopu za każdy pełny tydzień hospitalizacji noworodka.",
        ],
        "legal_basis": "Art. 180(1) i 180(2) Kodeksu pracy",
    },
    "laczenie-z-praca": {
        "id": "laczenie-z-praca",
        "title": "Łączenie urlopu rodzicielskiego z pracą na część etatu",
        "summary": (
            "Pracownik może łączyć urlop rodzicielski z wykonywaniem pracy u dotychczasowego "
            "pracodawcy w wymiarze nie wyższym niż połowa pełnego etatu (max 1/2 etatu)."
        ),
        "details": [
            "Maksymalny wymiar pracy u obecnego pracodawcy to 1/2 etatu.",
            "Urlop ulega proporcjonalnemu wydłużeniu (np. z 32 tygodni do 64 tygodni).",
            "Zasiłek ulega redukcji o połowę, a za przepracowany etat przysługuje wynagrodzenie.",
        ],
        "legal_basis": "Art. 182(1e) i art. 182(1f) Kodeksu pracy",
    },
    "adopcja": {
        "id": "adopcja",
        "title": "Adopcja i rodzina zastępcza niezawodowa",
        "summary": (
            "Rodzice przyjmujący dziecko na wychowanie w ramach przysposobienia lub rodziny "
            "zastępczej mają pełne prawo do urlopu na warunkach macierzyńskiego."
        ),
        "details": [
            "Urlop przysługuje zasadniczo do ukończenia przez dziecko 7. roku życia.",
            "W przypadku dziecka z odroczonym obowiązkiem szkolnym limit wynosi 10 lat.",
            "Gwarantowany minimalny wymiar urlopu wynosi 9 tygodni.",
        ],
        "legal_basis": "Art. 183 Kodeksu pracy",
    },
    "martwe-urodzenie": {
        "id": "martwe-urodzenie",
        "title": "Urodzenie martwe lub zgon dziecka po porodzie",
        "summary": (
            "W chwilach straty rodzice są chronieni przepisami Kodeksu pracy. "
            "Matce przysługuje urlop macierzyński w wymiarze skróconym oraz zasiłek pogrzebowy."
        ),
        "details": [
            "Wymiar urlopu macierzyńskiego: 8 tygodni (56 dni) płatne 100% podstawy.",
            "Zasiłek pogrzebowy z ZUS: 4 000 zł na podstawie wniosku Z-12 i aktu urodzenia.",
            "Nie jest wymagany minimalny okres hospitalizacji.",
        ],
        "legal_basis": "Art. 180(1) Kodeksu pracy oraz art. 77 ustawy emerytalnej",
    },
    "przejecie-urlopu-ojciec": {
        "id": "przejecie-urlopu-ojciec",
        "title": "Przejęcie urlopu macierzyńskiego przez ojca",
        "summary": (
            "Ojciec dziecka może przejąć pozostałą część urlopu macierzyńskiego po matce. "
            "Zasadą jest wykorzystanie przez matkę minimum 14 tygodni po porodzie."
        ),
        "details": [
            "Standardowo: po 14 tygodniach matka może wrócić do pracy i przekazać urlop ojcu.",
            "Wyjątek (szpital / stan zdrowia): ojciec może przejąć urlop już po 8 tygodniach.",
            "Zgon matki lub porzucenie: ojciec ma prawo do urlopu od dnia zdarzenia bez karencji.",
        ],
        "legal_basis": "Art. 180 § 4 - § 17 Kodeksu pracy",
    },
    "wysokosc-i-stawki": {
        "id": "wysokosc-i-stawki",
        "title": "Wysokość świadczeń i stawki procentowe zasiłku",
        "summary": (
            "Zasiłek macierzyński i rodzicielski wypłacany jest w oparciu o podstawę wymiaru. "
            "Możesz wybrać stałą stawkę 81,5% lub wariant zmienny: 100% za macierzyński i 70% "
            "za urlop rodzicielski. Urlop ojcowski wynosi zawsze 100%."
        ),
        "details": [
            "Wariant uśredniony: 81,5% podstawy przez cały rok (wniosek w 21 dni po porodzie).",
            "Wariant standardowy: 100% za 20 tygodni macierzyńskiego i 70% za rodzicielski.",
            "Urlop ojcowski (14 dni) oraz zwolnienie w ciąży: zawsze 100% podstawy wymiaru.",
            "Minimalna gwarantowana podstawa zasiłku w 2026 r.: 4 147,10 zł netto.",
        ],
        "legal_basis": "Art. 30a i art. 31 ustawy zasiłkowej",
    },
    "terminy-i-wyplaty": {
        "id": "terminy-i-wyplaty",
        "title": "Terminy składania wniosków i terminy wypłaty",
        "summary": (
            "ZUS oraz pracodawca wypłacają zasiłki na bieżąco, w terminie do 30 dni od "
            "złożenia kompletu niezbędnych dokumentów."
        ),
        "details": [
            "Wniosek o stawkę 81,5%: masz dokładnie 21 dni kalendarzowych od dnia porodu.",
            "Wypłata przez ZUS: następuje do 30 dni od wyjaśnienia ostatniej okoliczności.",
            "Urlop ojcowski: złóż wniosek u pracodawcy min. 7 dni przed rozpoczęciem.",
            "Urlop rodzicielski: złóż wniosek min. 21 dni przed rozpoczęciem korzystania.",
        ],
        "legal_basis": "Art. 64 ustawy zasiłkowej oraz art. 182(1d) Kodeksu pracy",
    },
    "wymagane-dokumenty": {
        "id": "wymagane-dokumenty",
        "title": "Wymagane dokumenty i formularze do zasiłku",
        "summary": (
            "Do przyznania i wypłaty zasiłku macierzyńskiego niezbędne jest przekazanie "
            "kompletu dokumentów potwierdzających uprawnienia."
        ),
        "details": [
            "Odpis skrócony aktu urodzenia dziecka (lub zaświadczenie ze szpitala o porodzie).",
            "Zaświadczenie płatnika: druk ZUS Z-3 (etat) lub ZUS Z-3b (działalność / zlecenie).",
            "Pisemny wniosek o urlop ze wskazaniem wybranego wariantu (81,5% lub 100%/70%).",
            "Wnioski można złożyć elektronicznie przez platformę PUE/eZUS.",
        ],
        "legal_basis": (
            "Rozporządzenie MRPiPS w sprawie zakresu informacji i dokumentów do zasiłków"
        ),
    },
    "rodzaje-umow": {
        "id": "rodzaje-umow",
        "title": "Uprawnienia na zleceniu, JDG i umowie o pracę",
        "summary": (
            "Prawo do zasiłku macierzyńskiego przysługuje każdej osobie objętej ubezpieczeniem "
            "chorobowym w dniu porodu, bez względu na rodzaj umowy."
        ),
        "details": [
            "Umowa o pracę: ubezpieczenie jest obowiązkowe, macierzyński przysługuje bez karencji.",
            (
                "Zlecenie i JDG: ubezpieczenie jest dobrowolne; opłacona składka daje "
                "prawo do zasiłku."
            ),
            "Umowa o dzieło: brak ubezpieczeń, przysługuje świadczenie rodzicielskie 1000 zł netto z MOPS/GOPS.",
            "Zleceniobiorcy i przedsiębiorcy wnioski składają bezpośrednio do ZUS.",
        ],
        "legal_basis": "Art. 6, 11 i 29 ustawy o systemie ubezpieczeń społecznych",
    },
    "ochrona-pracownika": {
        "id": "ochrona-pracownika",
        "title": "Ochrona przed zwolnieniem i odmową urlopu",
        "summary": (
            "Pracownice w ciąży oraz rodzice korzystający z urlopów związanych z rodzicielstwem "
            "podlegają szczególnej ochronie prawnej przed zwolnieniem."
        ),
        "details": [
            "Zakaz wypowiedzenia: pracodawca nie może rozwiązać umowy w okresie ciąży i urlopów.",
            (
                "Obowiązek pracodawcy: szef ma obowiązek uwzględnić prawidłowo złożony wniosek "
                "o urlop."
            ),
            "Gwarancja powrotu: po urlopie pracownik wraca na dotychczasowe stanowisko pracy.",
            "W przypadku sporu z pracodawcą organem kontrolnym jest PIP (Inspekcja Pracy).",
        ],
        "legal_basis": "Art. 177 oraz art. 183(2) Kodeksu pracy",
    },
    "jak-zglosic-urodzenie": {
        "id": "jak-zglosic-urodzenie",
        "title": "Zgłoszenie urodzenia dziecka i formalności",
        "summary": (
            "Urodzenie dziecka należy zarejestrować w USC w ciągu 21 dni oraz powiadomić "
            "pracodawcę lub ZUS w celu uruchomienia wypłaty zasiłków."
        ),
        "details": [
            "Rejestracja w USC: w terminie 21 dni od porodu (można online przez gov.pl).",
            "Wniosek o zasiłek z aktem urodzenia: w ciągu 21 dni dla gwarancji stawki 81,5%.",
            "Zgłoszenie do ubezpieczenia zdrowotnego: na druku ZUS ZCNA w ciągu 7 dni.",
        ],
        "legal_basis": "Ustawa Prawo o aktach stanu cywilnego",
    },
    "kim-jestes": {
        "id": "kim-jestes",
        "title": "Oficjalny Doradca AI ZUS",
        "summary": (
            "Cześć! Jestem Twoim wirtualnym doradcą w portalu Zasiłkowy Przewodnik "
            "Przyszłego Rodzica. Pomagam zrozumieć przepisy ZUS, wyliczyć zasiłki "
            "oraz przejść przez formalności krok po kroku."
        ),
        "details": [
            "Odpowiadam na pytania o zasiłek macierzyński, rodzicielski, ojcowski i chorobowe.",
            "Podpowiadam kluczowe terminy (np. 21 dni na wniosek) i wymagane dokumenty (Z-3).",
            "Tłumaczę działanie kalkulatora i pomagam wybrać najkorzystniejszy wariant wypłaty.",
            "W czym mogę Ci teraz pomóc?",
        ],
        "legal_basis": "Kodeks pracy oraz ustawa zasiłkowa (stan prawny 2026)",
    },
    "jak-dziala-kalkulator": {
        "id": "jak-dziala-kalkulator",
        "title": "Jak działa Zintegrowany Kalkulator ZUS",
        "summary": (
            "Nasz kalkulator w 4 prostych krokach precyzyjnie symuluje Twoje uprawnienia "
            "i wylicza kwoty zasiłku macierzyńskiego oraz rodzicielskiego."
        ),
        "details": [
            "Krok 1 (Umowa): wybierz rodzaj zatrudnienia (etat, zlecenie, JDG).",
            "Krok 2 (Wynagrodzenie): podaj średnie zarobki brutto z 12 miesięcy.",
            "Krok 3 (Data porodu): system wyznacza termin 21 dni na wniosek i ramy urlopów.",
            "Krok 4 (Warianty): porównaj wariant 81,5% z 100% i 70% oraz 9 tyg. dla taty.",
        ],
        "legal_basis": "Art. 30a, 31 i 36 ustawy zasiłkowej",
    },
    "katalog-swiadczen": {
        "id": "katalog-swiadczen",
        "title": "Katalog świadczeń po narodzinach dziecka",
        "summary": (
            "Po narodzinach dziecka rodzicom przysługuje pakiet świadczeń finansowych i urlopów: "
            "zasiłek macierzyński (urlop macierzyński i rodzicielski), urlop ojcowski (100%), "
            "świadczenie 800+ oraz jednorazowa zapomoga (becikowe)."
        ),
        "details": [
            "Zasiłek macierzyński: 20 tygodni dla mamy (płatne 100% lub 81,5% podstawy).",
            "Zasiłek rodzicielski: 41 tygodni, w tym 9 tygodni nieprzenoszalnych dla taty (70%).",
            "Urlop ojcowski: 14 dni kalendarzowych płatnych 100% (do 12. miesiąca życia dziecka).",
            "Świadczenie 800+: 800 zł miesięcznie na każde dziecko przez PUE/eZUS.",
            "Wniosek w 21 dni po porodzie gwarantuje równą stawkę 81,5% przez cały okres.",
        ],
        "legal_basis": "Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych",
    },
    "urlop-dla-taty": {
        "id": "urlop-dla-taty",
        "title": "Urlopy przysługujące tacie (ojcowski i rodzicielski)",
        "summary": (
            "Ojcu dziecka przysługują dwa niezależne uprawnienia: 2 tygodnie (14 dni) urlopu "
            "ojcowskiego płatnego 100% podstawy oraz 9 tygodni nieprzenoszalnego urlopu "
            "rodzicielskiego płatnego 70% podstawy (Work-Life Balance)."
        ),
        "details": [
            "Urlop ojcowski: 14 dni kalendarzowych (2 tygodnie) ze 100% zasiłkiem.",
            "Urlop rodzicielski dla taty: 9 tygodni na wyłączność ojca, płatne 70% podstawy.",
            (
                "Przejęcie po mamie: ojciec może przejąć do 6 tygodni po wykorzystaniu "
                "14 tyg. przez mamę."
            ),
            "Wniosek o urlop ojcowski: złóż min. 7 dni wcześniej u swojego pracodawcy.",
            (
                "Ochrona pracownika: ojciec w trakcie korzystania z urlopów jest "
                "chroniony przed zwolnieniem."
            ),
        ],
        "legal_basis": "Art. 182(1a) § 4 oraz art. 182(3) Kodeksu pracy",
    },
    "strefa-pdf": {
        "id": "strefa-pdf",
        "title": "Analiza pism i decyzji ZUS z plików PDF",
        "summary": (
            "Strefa Testowa PDF umożliwia automatyczną weryfikację decyzji ZUS, zaświadczeń "
            "płatnika Z-3 / Z-3b oraz zwolnień e-ZLA bezpośrednio z pliku PDF."
        ),
        "details": [
            "Wgraj plik PDF decyzji ZUS lub zaświadczenia Z-3, aby sprawdzić poprawność wyliczeń.",
            "System automatycznie porównuje podstawę wymiaru z przepisami ustawy zasiłkowej.",
            "W przypadku wykrycia zaniżenia świadczenia otrzymasz gotowy wzór odwołania do ZUS.",
        ],
        "legal_basis": "Art. 83 ustawy o systemie ubezpieczeń społecznych",
    },
    "parametry-zus-2026": {
        "id": "parametry-zus-2026",
        "title": "Kluczowe parametry ZUS w 2026 roku",
        "summary": (
            "W 2026 roku płaca minimalna wynosi 4 806,00 zł brutto. Minimalna gwarantowana "
            "podstawa wymiaru zasiłku chorobowego i macierzyńskiego wynosi 4 147,10 zł netto."
        ),
        "details": [
            "Płaca minimalna brutto: 4 806,00 zł.",
            "Składki finansowane przez pracownika: 13,71% podstawy.",
            "Minimalna gwarantowana podstawa zasiłku: 4 147,10 zł netto.",
            "Stawki zasiłku macierzyńskiego: 81,5% (wariant uśredniony) lub 100% i 70%.",
            "Zasiłek w ciąży (kod B) i urlop ojcowski: zawsze 100% podstawy.",
        ],
        "legal_basis": "Rozporządzenie w sprawie minimalnego wynagrodzenia za pracę w 2026 r.",
    },
    "podziekowanie": {
        "id": "podziekowanie",
        "title": "Cieszę się, że mogłem pomóc!",
        "summary": (
            "Nie ma za co! W razie jakichkolwiek wątpliwości dotyczących zasiłków macierzyńskich, "
            "rodzicielskich, ojcowskich czy formalności w ZUS - jestem zawsze do Twojej dyspozycji."
        ),
        "details": [
            "Pamiętaj o terminie 21 dni od porodu na złożenie wniosku o wariant 81,5%.",
            "Możesz w każdej chwili przetestować swoje wyliczenia w naszym kalkulatorze.",
            "W sprawach indywidualnych COT ZUS służy pomocą pod numerem: 22 560 16 00.",
        ],
        "legal_basis": "Zasiłkowy Przewodnik Przyszłego Rodzica (ZUS 2026)",
    },
    "pozegnanie": {
        "id": "pozegnanie",
        "title": "Do widzenia i miłego dnia!",
        "summary": (
            "Dziękuję za rozmowę. Życzę spokojnego czasu i powodzenia we wszystkich sprawach "
            "związanych z rodzicielstwem i formalnościami ubezpieczeniowymi."
        ),
        "details": [
            "Wszystkie wnioski i formularze (np. Z-3, Z-15) złożysz wygodnie przez PUE/eZUS.",
            "Wracaj śmiało, jeśli pojawią się nowe pytania o urlopy lub zasiłki.",
        ],
        "legal_basis": "Zasiłkowy Przewodnik Przyszłego Rodzica (ZUS 2026)",
    },
    "kontakt-infolinia": {
        "id": "kontakt-infolinia",
        "title": "Kontakt i Infolinia ZUS (COT)",
        "summary": (
            "Z Zakładem Ubezpieczeń Społecznych możesz skontaktować się telefonicznie, "
            "elektronicznie przez platformę PUE/eZUS lub osobiście w dowolnej placówce."
        ),
        "details": [
            "Centrum Obsługi Telefonicznej (COT): tel. 22 560 16 00 (pon.-pt. 7:00 - 18:00).",
            "Poczta elektroniczna: pytania ogólne można kierować na adres: cot@zus.pl.",
            (
                "E-wizyta w ZUS: możliwość wideorozmowy z pracownikiem ZUS bez wychodzenia "
                "z domu (rezerwacja na zus.pl)."
            ),
            "Portal PUE/eZUS: dostęp 24/7 do Twoich danych ubezpieczeniowych i wniosków.",
        ],
        "legal_basis": "Zakład Ubezpieczeń Społecznych (www.zus.pl)",
    },
    "swiadczenie-800-plus": {
        "id": "swiadczenie-800-plus",
        "title": "Świadczenie wychowawcze 800+",
        "summary": (
            "Świadczenie 800+ przysługuje na każde dziecko do ukończenia 18. roku życia, "
            "niezależnie od dochodów rodziny. Wnioski przyjmuje i wypłaca wyłącznie ZUS."
        ),
        "details": [
            "Kwota: 800 zł miesięcznie na każde dziecko.",
            "Składanie wniosku: wyłącznie elektronicznie przez PUE/eZUS, mZUS lub bankowość.",
            "Termin po porodzie: złóż wniosek w 3 miesiące od narodzin dziecka z wyrównaniem.",
        ],
        "legal_basis": "Ustawa o pomocy państwa w wychowywaniu dzieci",
    },
    "becikowe": {
        "id": "becikowe",
        "title": "Jednorazowa zapomoga z tytułu urodzenia (Becikowe)",
        "summary": (
            "Becikowe to jednorazowa zapomoga w wysokości 1 000 zł, wypłacana przez właściwy "
            "urząd gminy lub MOPS/GOPS (nie przez ZUS)."
        ),
        "details": [
            "Wysokość świadczenia: 1 000 zł jednorazowo.",
            "Kryterium dochodowe: dochód rodziny na osobę nie może przekroczyć 1 922 zł netto.",
            "Termin: wniosek należy złożyć w ciągu 12 miesięcy od dnia narodzin dziecka.",
            "Warunek medyczny: opieka lekarska od co najmniej 10. tygodnia ciąży.",
        ],
        "legal_basis": "Art. 15b ustawy o świadczeniach rodzinnych",
    },
    "swiadczenie-rodzicielskie": {
        "id": "swiadczenie-rodzicielskie",
        "title": "Świadczenie rodzicielskie z MOPS/GOPS",
        "summary": (
            "Świadczenie rodzicielskie przysługuje rodzicom, którzy nie mają prawa do zasiłku "
            "macierzyńskiego (np. studentom, osobom bezrobotnym, pracującym na umowę o dzieło)."
        ),
        "details": [
            "Wysokość: 1 000 zł netto miesięcznie.",
            "Okres pobierania: 52 tygodnie (1 dziecko), do 71 tygodni przy bliźniętach.",
            "Brak kryterium dochodowego: świadczenie przysługuje bez względu na zarobki.",
            "Gdzie złożyć wniosek: do urzędu gminy lub MOPS/GOPS w terminie 3 miesięcy.",
        ],
        "legal_basis": "Art. 17c ustawy o świadczeniach rodzinnych",
    },
    "pue-ezus": {
        "id": "pue-ezus",
        "title": "Platforma Usług Elektronicznych (PUE / eZUS)",
        "summary": (
            "PUE/eZUS to całodobowy portal internetowy ZUS, umożliwiający załatwianie spraw "
            "ubezpieczeniowych, składanie wniosków i sprawdzanie wypłat świadczeń online."
        ),
        "details": [
            "Logowanie: profil zaufany, aplikacja mObywatel, bankowość lub e-dowód.",
            "Zasiłki: składanie wniosków o macierzyński, ojcowski, opiekuńczy oraz 800+.",
            "Wypłaty: zakładka 'Świadczenia' pozwala sprawdzić datę i kwotę przelewu z ZUS.",
            "Zwolnienia lekarskie: automatyczny podgląd e-ZLA wystawionych przez lekarza.",
        ],
        "legal_basis": "Ustawa o systemie ubezpieczeń społecznych",
    },
}

KEYWORD_PATTERNS: list[tuple[list[str], str]] = [
    (
        [
            "kim jesteś",
            "kim jestes",
            "co tam",
            "jak się masz",
            "jak sie masz",
            "cześć",
            "czesc",
            "dzień dobry",
            "dzien dobry",
            "hej",
            "witaj",
            "co potrafisz",
            "przedstaw się",
            "o tobie",
        ],
        "kim-jestes",
    ),
    (
        [
            "jak działa ten kalkulator",
            "jak dziala ten kalkulator",
            "jak dokładnie działa ten kalkulator",
            "jak dokladnie dziala ten kalkulator",
            "jak działa kalkulator",
            "jak dziala kalkulator",
            "jak korzystać z kalkulatora",
            "jak korzystac z kalkulatora",
            "instrukcja kalkulatora",
            "chcę obliczyć",
            "chce obliczyc",
            "oblicz mi zasiłek",
            "oblicz mi zasilek",
            "pomóż mi policzyć",
            "pomoz mi policzyc",
            "jak obliczyć zasiłek",
            "jak obliczyc zasilek",
            "jak wyliczyć zasiłek",
            "jak wyliczyc zasilek",
        ],
        "jak-dziala-kalkulator",
    ),
    (
        [
            "dziękuj",
            "dziekuj",
            "dzięki",
            "dzieki",
            "super dzięki",
            "super dzieki",
            "wielkie dzięki",
            "wielkie dzieki",
            "bardzo dziękuję",
            "bardzo dziekuje",
            "dzięki za pomoc",
            "dzieki za pomoc",
            "dziękuję za pomoc",
            "dziekuje za pomoc",
            "pomogłeś mi",
            "pomogles mi",
        ],
        "podziekowanie",
    ),
    (
        [
            "do widzenia",
            "do usłyszenia",
            "do uslyszenia",
            "miłego dnia",
            "milego dnia",
            "pa",
            "na razie",
            "dobranoc",
            "żegnaj",
            "zegnaj",
        ],
        "pozegnanie",
    ),
    (
        [
            "kontakt",
            "infolini",
            "telefon",
            "numer do zus",
            "zadzwonić",
            "zadzwonic",
            "cot zus",
            "godziny otwarcia",
        ],
        "kontakt-infolinia",
    ),
    (
        [
            "800+",
            "800 plus",
            "świadczenie 800",
            "swiadczenie 800",
            "wniosek o 800",
            "500+",
            "500 plus",
            "świadczenie wychowawcze",
            "swiadczenie wychowawcze",
        ],
        "swiadczenie-800-plus",
    ),
    (
        [
            "becikow",
            "1000 zł na urodzenie",
            "zapomoga z tytułu urodzenia",
        ],
        "becikowe",
    ),
    (
        [
            "kosiniakow",
            "świadczenie rodzicielskie dla bezrobotnych",
            "swiadczenie rodzicielskie",
        ],
        "swiadczenie-rodzicielskie",
    ),
    (
        [
            "pue",
            "ezus",
            "pue/ezus",
            "status wypłat",
            "status wyplat",
            "sprawdzić status",
            "logowanie do pue",
            "konto pue",
        ],
        "pue-ezus",
    ),
    (
        [
            "kod b",
            "kod 'b'",
            "kod „b”",
            "l4 w ciąży",
            "l4 w ciazy",
            "zwolnieni w ciąży",
            "zwolnienie w ciazy",
            "chora w ciąży",
            "zwolnieniu lekarskim",
            "zasiłek w ciąży",
            "zasilek w ciazy",
            "zawsze 100%",
        ],
        "kod-b",
    ),
    (
        ["wyczekiw", "karencj", "staż chorob", "30 dni", "90 dni", "okres wyczekiwania"],
        "okres-wyczekiwania",
    ),
    (
        [
            "ile dostan",
            "pieniędz",
            "pieniadz",
            "stawk",
            "ile procent",
            "ile wynosi",
            "wysokoś",
            "wysokos",
            "kwot",
            "przelew",
        ],
        "wysokosc-i-stawki",
    ),
    (
        [
            "kiedy złożyć",
            "kiedy zlozyc",
            "pierwszy wniosek",
            "po porodzie",
            "kiedy złożyć pierwszy",
            "kiedy zlozyc pierwszy",
            "termin na wniosek",
            "ile dni na wniosek",
            "termin złożenia",
            "termin zlozenia",
            "terminy wniosków",
            "terminy wnioskow",
            "kiedy wypłac",
            "kiedy dostan",
            "w jakim termin",
            "ile mam dni",
            "ile czasu",
            "termin na",
            "termin wypłat",
            "czas na wniosek",
        ],
        "terminy-i-wyplaty",
    ),
    (
        [
            "co złożyć",
            "co zlozyc",
            "jak złożyć",
            "jak zlozyc",
            "złożyć u pracodawcy",
            "zlozyc u pracodawcy",
            "co muszę",
            "co musze",
            "jakie dokument",
            "wymagane dokument",
            "formularz",
            "z-3",
            "z-15",
            "pue",
            "ezus",
            "status wypłat",
            "status wyplat",
            "sprawdzić status",
        ],
        "wymagane-dokumenty",
    ),
    (
        [
            "zgłosić urodzen",
            "zglosic urodzen",
            "zarejestrować dzieck",
            "akt urodzen",
            "usc",
        ],
        "jak-zglosic-urodzenie",
    ),
    (
        [
            "zlecen",
            "działalnoś",
            "dzialalnos",
            "jdg",
            "b2b",
            "samozatrudnion",
            "o dzieło",
            "o dzielo",
        ],
        "rodzaje-umow",
    ),
    (
        [
            "zwolnić",
            "zwolnic",
            "wypowiedzenie",
            "rozwiązanie umowy",
            "szef nie chce",
            "pracodawc nie chce",
            "odmowa urlopu",
            "odmówić urlopu",
            "ochrona przed zwolnieniem",
            "czy może zwolnić",
            "ochronie pracownik",
        ],
        "ochrona-pracownika",
    ),
    (
        ["9 tygodni", "nieprzenoszaln", "work life", "work-life", "drugi rodzic"],
        "nieprzenoszalne-9-tygodni",
    ),
    (["ojcowsk", "dla taty", "urlop taty", "ojciec 14", "tata 14", "14 dni"], "ojcowski"),
    (
        [
            "przejęci",
            "przekazani",
            "tata po 14",
            "rezygnacj matki",
            "ojciec zamiast matki",
            "przejąć urlop",
            "przejac urlop",
            "po matce",
            "po 14 tyg",
        ],
        "przejecie-urlopu-ojciec",
    ),
    (
        ["podstaw", "zarobk", "średni", "wyliczan podstaw", "dochód do podstaw"],
        "podstawa-wymiaru",
    ),
    (
        [
            "81",
            "81,5",
            "81.5",
            "100 i 70",
            "100% i 70%",
            "100% + 70%",
            "100 i 70%",
            "wniosek ZAM o wariant ujednolicony",
            "dlugi wniosek",
            "wariant",
            "stałe czy 100%",
            "stale czy 100%",
            "co się bardziej opłaca",
            "co sie bardziej oplaca",
            "bardziej opłacaln",
            "bardziej oplacaln",
            "opłaca się",
            "oplaca sie",
            "po 21 dniach",
            "po terminie 21",
            "spóźnię się",
            "spoznie sie",
            "spóźnienie",
            "spoznienie",
            "spóźniony wniosek",
        ],
        "wariant-815",
    ),
    (["wcześniak", "wczesniak", "hospitalizacj", "inkubator", "uzupełniając"], "wczesniak"),
    (
        [
            "życiem",
            "zyciem",
            "wada letaln",
            "wada",
            "letaln",
            "niepełnosprawn",
            "orzeczeni",
            "4000",
            "4 000",
        ],
        "za-zyciem",
    ),
    (["martw", "zgon", "strata", "śmierć", "poronien", "pogrzebow"], "martwe-urodzenie"),
    (
        [
            "pół etatu",
            "pol etatu",
            "1/2 etatu",
            "część etatu",
            "czesc etatu",
            "dorabian na rodziciel",
            "łączen rodziciel",
        ],
        "laczenie-z-praca",
    ),
    (["adopc", "zastępcz", "przysposobien", "adoptowan"], "adopcja"),
    (["płatnik", "platnik", "kto wypłac", "pracodawc czy zus"], "platnik-skladek"),
    (
        [
            "jakie świadczenia",
            "jakie swiadczenia",
            "świadczenia przysługują",
            "swiadczenia przysluguja",
            "po narodzinach dziecka",
            "świadczenia po porodzie",
            "swiadczenia po porodzie",
            "katalog świadczeń",
            "katalog swiadczen",
            "co przysługuje po urodzeniu",
            "co przysluguje po urodzeniu",
            "świadczenia po urodzeniu",
            "swiadczenia po urodzeniu",
        ],
        "katalog-swiadczen",
    ),
    (
        [
            "przysługuje tacie",
            "przysluguje tacie",
            "ile tygodni urlopu",
            "tygodni urlopu przysługuje",
            "tygodni urlopu przysluguje",
            "tygodni przysługuje tacie",
            "tygodni przysluguje tacie",
            "urlop taty",
            "urlop dla taty",
            "urlop dla ojca",
            "urlopy ojca",
            "prawa ojca",
            "dla taty",
            "co ma tata",
            "co przysługuje ojcu",
            "co przysluguje ojcu",
            "urlop dla pracownika-ojca",
        ],
        "urlop-dla-taty",
    ),
    (
        [
            "pdf",
            "strefa testowa",
            "analiza pism",
            "załadować decyzję",
            "zaladowac decyzje",
            "decyzję zus",
            "decyzje zus",
            "formularze zus (z-3",
        ],
        "strefa-pdf",
    ),
    (
        [
            "minimalna płaca",
            "minimalna placa",
            "w 2026 roku",
            "stopy procentowe",
            "parametry zus",
            "płaca minimalna 2026",
            "placa minimalna 2026",
            "parametry w 2026",
        ],
        "parametry-zus-2026",
    ),
]


class GeminiAssistantService:
    def __init__(self) -> None:
        self.api_key = self._resolve_api_key()
        self.active_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    def _resolve_api_key(self) -> str | None:
        key = (
            os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("GEMINI_KEY")
            or os.getenv("GOOGLE_AI_KEY")
        )
        if not key:
            for env_path in ["backend/.env", ".env", "../backend/.env", "../.env"]:
                try:
                    if os.path.exists(env_path):
                        with open(env_path, "r", encoding="utf-8") as f:
                            for line in f:
                                line = line.strip()
                                if line and not line.startswith("#") and "=" in line:
                                    k, v = line.split("=", 1)
                                    k = k.strip()
                                    v = v.strip().strip("'\"")
                                    if k in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY", "GOOGLE_AI_KEY") and v:
                                        os.environ[k] = v
                                        key = v
                                        break
                        if key:
                            break
                except Exception:
                    pass
        return key

    def get_status(self) -> AssistantStatusResponse:
        key = self._resolve_api_key()
        return AssistantStatusResponse(
            is_configured=bool(key and key.strip()),
            model=self.active_model,
            provider="Google Gemini AI",
        )

    def _is_zus_related(self, message: str) -> bool:
        msg_l = message.lower()
        msg_norm = _normalize_text(msg_l)
        greeting_patterns = [
            "kim jesteś",
            "kim jestes",
            "co potrafisz",
            "przedstaw się",
            "przedstaw sie",
            "pomoc",
            "pomóż",
            "pomoz",
            "w czym pomagasz",
            "cześć",
            "czesc",
            "dzień dobry",
            "dzien dobry",
            "hej",
            "witaj",
            "co tam",
            "siema",
            "halo",
            "jak działasz",
            "jak dzialasz",
            "dzięk",
            "dziek",
            "dzięki",
            "dzieki",
            "do widzenia",
            "do usłyszenia",
            "miłego dnia",
            "milego dnia",
        ]
        if any(p in msg_l or _normalize_text(p) in msg_norm for p in greeting_patterns):
            return True

        for patterns, _ in KEYWORD_PATTERNS:
            if any(p in msg_l or _normalize_text(p) in msg_norm for p in patterns):
                return True

        zus_stems = [
            "zus",
            "ubezpiecz",
            "zasił",
            "zasil",
            "świadcz",
            "swiadcz",
            "urlop",
            "macierzyn",
            "rodziciel",
            "ojcow",
            "wychowaw",
            "ciąż",
            "ciaz",
            "poród",
            "porod",
            "dzieck",
            "noworod",
            "wcześniak",
            "wczesniak",
            "l4",
            "e-zla",
            "ezla",
            "chorob",
            "zwolnien",
            "składk",
            "skladk",
            "płatnik",
            "platnik",
            "pracodaw",
            "pracowni",
            "etat",
            "zlecen",
            "jdg",
            "działalnoś",
            "dzialalnos",
            "umow",
            "zarobk",
            "pensj",
            "wynagrodz",
            "płac",
            "plac",
            "brutto",
            "netto",
            "podstaw",
            "wniosek",
            "wniosk",
            "formularz",
            "pue",
            "ezus",
            "z-3",
            "z-15",
            "kalkulator",
            "portal",
            "życiem",
            "zyciem",
            "adopcj",
            "karencj",
            "wyczekiw",
            "zgłoszen",
            "zgloszen",
            "urodzen",
            "urodzin",
            "narodzin",
            "kosiniakow",
            "becikow",
            "800",
            "500",
            "pip",
            "kodeks pracy",
            "tata",
            "tacie",
            "taty",
            "tatow",
            "ojciec",
            "ojca",
            "ojcu",
            "matk",
            "matce",
            "matki",
            "mama",
            "mamie",
            "mamy",
            "rodzic",
            "rodzice",
            "rodziców",
            "poronien",
            "zgon",
            "pieniędz",
            "pieniadz",
            "pieniądz",
            "wypłat",
            "wyplat",
            "przelew",
            "stawk",
            "dokument",
            "formalnoś",
            "formalnos",
            "szef",
            "uprawnien",
            "spraw",
            "przewodnik",
            "obywatel",
            "pacjent",
            "lekarz",
            "szpital",
            "świadczeniobiorc",
            "swiadczeniobiorc",
            "rent",
            "emerytur",
            "wariant",
            "81",
            "81,5",
            "81.5",
            "100",
            "70",
            "opłac",
            "oplac",
            "procent",
            "tygodn",
            "tydzień",
            "tydzien",
            "kiedy",
            "złożyć",
            "zlozyc",
            "przysług",
            "przyslug",
            "staż",
            "staz",
            "premi",
            "nadgodzin",
            "pdf",
            "minimaln",
            "maternity",
            "paternity",
            "parental",
            "benefit",
            "allowance",
        ]
        return any(stem in msg_l or _normalize_text(stem) in msg_norm for stem in zus_stems)

    def _build_refusal_response(self) -> AssistantAskResponse:
        return AssistantAskResponse(
            id=f"kb-{uuid.uuid4().hex[:8]}",
            title="Zakres pomocy doradcy ZUS",
            summary=(
                "Przepraszam, ale jestem wirtualnym doradcą ZUS i mogę pomagać wyłącznie "
                "w sprawach związanych ze świadczeniami, zasiłkami oraz ubezpieczeniami "
                "społecznymi dla rodziców. Nie mogę pomóc w tematach niezwiązanych z ZUS."
            ),
            details=[
                "Zadaj pytanie dotyczące zasiłku macierzyńskiego, rodzicielskiego, "
                "ojcowskiego lub chorobowego.",
                "Pomagam w ustaleniu terminów wniosków (np. 21 dni po porodzie) i wymaganych "
                "druków (Z-3, Z-15).",
                "Wyjaśniam zasady wyliczania podstawy wymiaru oraz porównania wariantów zasiłku.",
            ],
            legal_basis=(
                "Ustawa z dnia 13 października 1998 r. o systemie ubezpieczeń społecznych"
            ),
            model_used="statutory-knowledge-engine",
            is_live_ai=False,
        )

    def get_topic_explanation(self, topic_id: str) -> AssistantTopicResponse:
        normalized_id = topic_id.strip().lower()
        target_id = TOPIC_ALIASES.get(normalized_id, normalized_id)
        if target_id in STATUTORY_GLOSSARY:
            item = STATUTORY_GLOSSARY[target_id]
            return AssistantTopicResponse(
                id=item["id"],
                title=item["title"],
                summary=item["summary"],
                details=item.get("details", []),
                legal_basis=item.get("legal_basis"),
            )
        return AssistantTopicResponse(
            id=topic_id,
            title="Zagadnienie ZUS",
            summary=(
                "Szczegółowe wyjaśnienie przepisów Kodeksu pracy i ustawy zasiłkowej. "
                "Skorzystaj z kalkulatorów portalu, aby obliczyć przysługujące kwoty."
            ),
            details=["W sprawach indywidualnych skontaktuj się z COT ZUS: 22 560 16 00."],
            legal_basis="Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych",
        )

    async def ask_assistant(self, request: AssistantAskRequest) -> AssistantAskResponse:
        query_trimmed = request.message.strip()
        if not query_trimmed:
            return AssistantAskResponse(
                id=f"kb-{uuid.uuid4().hex[:8]}",
                title="Puste zapytanie",
                summary=(
                    "Nie wpisano treści pytania. Zadaj pytanie dotyczące zasiłku "
                    "macierzyńskiego, rodzicielskiego, ojcowskiego, chorobowego w ciąży "
                    "lub wymaganych formalności w ZUS."
                ),
                details=[
                    "Możesz skorzystać z sugerowanych pytań na początku czatu.",
                    "Zapytaj np. o warianty wypłaty (81,5% vs 100/70%) lub termin 21 dni.",
                ],
                legal_basis="Zasiłkowy Przewodnik Przyszłego Rodzica (ZUS 2026)",
                model_used="statutory-knowledge-engine",
                is_live_ai=False,
            )

        msg_lower = request.message.lower()
        if not self._is_zus_related(msg_lower) and not request.topic_id:
            return self._build_refusal_response()

        api_key = self._resolve_api_key()

        if api_key and api_key.strip():
            try:
                gemini_result = await self._call_gemini_api(request, api_key)
                if gemini_result:
                    return gemini_result
            except Exception as e:
                logger.warning(
                    f"Gemini API call failed, falling back to statutory knowledge base: {e}"
                )

        return self._answer_from_knowledge_base(request)

    async def _call_gemini_api(
        self, request: AssistantAskRequest, api_key: str
    ) -> AssistantAskResponse | None:
        prompt_content = self._build_gemini_prompt(request)
        is_bearer = api_key.startswith("AQ.") or api_key.startswith("ya29.")

        request_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt_content}],
                }
            ],
            "systemInstruction": {
                "parts": [{"text": ZUS_ASSISTANT_SYSTEM_INSTRUCTION}],
            },
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.9,
                "topK": 40,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
                "thinkingConfig": {
                    "thinkingBudget": 2048,
                },
            },
        }

        models_to_try = (self.active_model, *FALLBACK_GEMINI_MODELS)
        # Nie powtarzamy tego samego modelu, np. gdy jest już ustawiony jako pierwszy fallback.
        models_to_try = tuple(dict.fromkeys(models_to_try))

        async with httpx.AsyncClient(timeout=10.0) as client:
            for model_name in models_to_try:
                if is_bearer:
                    model_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                    headers = {"Authorization": f"Bearer {api_key}"}
                else:
                    model_url = GEMINI_ENDPOINT_TEMPLATE.format(model=model_name, key=api_key)
                    headers = {}

                model_body = json.loads(json.dumps(request_body))

                if model_name.startswith(("gemini-3", "gemini-4")):
                    model_body["generationConfig"]["thinkingConfig"] = {
                        "thinkingLevel": "LOW"
                    }
                elif model_name.startswith("gemini-2.5"):
                    model_body["generationConfig"]["thinkingConfig"] = {
                        "thinkingBudget": 512
                    }
                else:
                    model_body["generationConfig"].pop("thinkingConfig", None)

                resp = await client.post(model_url, json=model_body, headers=headers)

                if resp.status_code != 200:
                    logger.warning(
                        f"Gemini model {model_name} returned {resp.status_code}: "
                        f"{resp.text[:200]}"
                    )
                    continue

                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    continue

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    continue

                text = parts[0].get("text", "")
                return self._parse_gemini_json_response(text, model_name)

        return None

    def _build_gemini_prompt(self, request: AssistantAskRequest) -> str:
        prompt_parts: list[str] = []

        if isinstance(request.user_context, dict):
            tab_name = request.user_context.get("tab_name") or request.user_context.get(
                "active_tab"
            )
            if tab_name:
                prompt_parts.append(
                    f"KONTEKST PODSTRONY / MODUŁU: Obywatel znajduje się obecnie w dziale: "
                    f"'{tab_name}'. Jeśli pytanie dotyczy tej sprawy, wyjaśnij ją ze "
                    f"szczególnym uwzględnieniem tej formalności."
                )

            req_topic = request.user_context.get("requested_topic")
            req_title = request.user_context.get("requested_title")
            req_basis = request.user_context.get("topic_legal_basis")
            req_summary = request.user_context.get("topic_summary")
            req_rules = request.user_context.get("topic_rules")
            user_status = request.user_context.get("user_status")

            if req_title or req_basis or req_summary or req_rules:
                rules_fmt = (
                    "\n• ".join(req_rules)
                    if isinstance(req_rules, list) and req_rules
                    else str(req_rules or "Brak dodatkowych reguł")
                )
                prompt_parts.append(
                    f"SZCZEGÓŁOWY KONTEKST FORMALNO-PRAWNY ZAGADNIENIA ZUS (Z BAZY WIEDZY):\n"
                    f"• Identyfikator pola/zagadnienia: {req_topic or 'nieokreślony'}\n"
                    f"• Tytuł zagadnienia: {req_title or req_topic}\n"
                    f"• Podstawa prawna: {req_basis or 'Kodeks pracy / Ustawa o świadczeniach pieniężnych'}\n"
                    f"• Wstępna interpretacja: {req_summary or 'Brak'}\n"
                    f"• Kluczowe warunki i zasady formalne:\n• {rules_fmt}\n\n"
                    f"INSTRUKCJA EKSPERCKA DLA ASYSTENTA AI:\n"
                    f"Obywatel kliknął 'Dopytaj Asystenta AI' przy tym konkretnym zagadnieniu. "
                    f"Twoja odpowiedź musi być pogłębiona, konkretna i praktyczna. "
                    f"Wskaż dokładne terminy, wymagane druki (np. Z-3, Z-3a, ZAM, Z-15, e-ZLA), "
                    f"kroki postępowania u pracodawcy lub w ZUS PUE, potencjalne ryzyka kontroli oraz prawa ubezpieczonego w stanie prawnym na 2026 rok."
                )

            if user_status and isinstance(user_status, dict):
                user_info = ", ".join(f"{k}: {v}" for k, v in user_status.items() if v is not None)
                prompt_parts.append(f"DANE PROFILU UBEZPIECZONEGO (mObywatel/PUE ZUS): {user_info}")

            ctx_str = json.dumps(request.user_context, ensure_ascii=False)
            prompt_parts.append(f"PEŁNY METADATA KONTEKST: {ctx_str}")

        if request.history:
            history_str = "\n".join(
                [f"{msg.role.upper()}: {msg.content}" for msg in request.history[-4:]]
            )
            prompt_parts.append(f"POPRZEDNIE WIADOMOŚCI:\n{history_str}")

        prompt_parts.append(f"PYTANIE OBYWATELA: {request.message}")
        return "\n\n".join(prompt_parts)

    def _parse_gemini_json_response(
        self, text: str, model_used: str
    ) -> AssistantAskResponse | None:
        try:
            cleaned_text = text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            parsed = json.loads(cleaned_text)
            title = parsed.get("title") or "Wyjaśnienie przepisów ZUS"
            summary = parsed.get("summary") or "Odpowiedź na Twoje pytanie."
            details = parsed.get("details") or []
            if isinstance(details, str):
                details = [details]
            legal_basis = parsed.get("legal_basis")

            return AssistantAskResponse(
                id=f"gemini-{uuid.uuid4().hex[:8]}",
                title=title,
                summary=summary,
                details=details,
                legal_basis=legal_basis,
                model_used=model_used,
                is_live_ai=True,
            )
        except Exception as e:
            logger.error(f"Failed to parse JSON from Gemini response: {e}, raw: {text[:200]}")
            return None

    def _answer_from_knowledge_base(self, request: AssistantAskRequest) -> AssistantAskResponse:
        msg_lower = request.message.lower()
        msg_norm = _normalize_text(msg_lower)

        # 1. Jawny temat z requestu lub z kontekstu AiFieldExplainer
        explicit_topic = request.topic_id
        if not explicit_topic and isinstance(request.user_context, dict):
            explicit_topic = request.user_context.get("requested_topic")

        if explicit_topic:
            norm_topic = TOPIC_ALIASES.get(str(explicit_topic).strip().lower(), str(explicit_topic).strip().lower())
            req_title = request.user_context.get("requested_title") if isinstance(request.user_context, dict) else None
            req_basis = request.user_context.get("topic_legal_basis") if isinstance(request.user_context, dict) else None
            req_rules = request.user_context.get("topic_rules") if isinstance(request.user_context, dict) else None
            req_summary = request.user_context.get("topic_summary") if isinstance(request.user_context, dict) else None

            if norm_topic in STATUTORY_GLOSSARY:
                item = STATUTORY_GLOSSARY[norm_topic]
                extended_details = list(item.get("details", []))
                if isinstance(req_rules, list):
                    for r in req_rules:
                        if r not in extended_details:
                            extended_details.append(r)
                extended_details.append("Zadbaj o zachowanie 21-dniowego terminu od dnia porodu na złożenie wniosku o zasiłek.")
                extended_details.append("W razie wątpliwości skonsultuj sprawę przez PUE ZUS lub infolinię COT: 22 560 16 00.")
                return AssistantAskResponse(
                    id=f"kb-{uuid.uuid4().hex[:8]}",
                    title=f"Analiza ekspercka ZUS: {item['title']}",
                    summary=f"{item['summary']} W stanie prawnym 2026 r. prawidłowa interpretacja ma kluczowe znaczenie dla terminowej wypłaty świadczeń.",
                    details=extended_details,
                    legal_basis=item.get("legal_basis") or req_basis,
                    model_used="statutory-knowledge-engine",
                    is_live_ai=False,
                )
            else:
                topic_summary = req_summary or f"Szczegółowa analiza formalno-prawna dla zagadnienia: {req_title or explicit_topic}."
                extended_details = []
                if isinstance(req_rules, list) and req_rules:
                    extended_details.extend(req_rules)
                else:
                    extended_details.extend([
                        "Świadczenie rozliczane w oparciu o stan prawny 2026 r.",
                        "Wymagane terminowe złożenie dokumentów (np. Z-3 / Z-3a / ZAM) do właściwego oddziału ZUS.",
                    ])
                extended_details.append("Zadbaj o zachowanie wymaganych terminów kodeksowych i zasiłkowych.")
                extended_details.append("W razie wątpliwości skonsultuj sprawę przez PUE ZUS lub infolinię COT: 22 560 16 00.")
                return AssistantAskResponse(
                    id=f"kb-{uuid.uuid4().hex[:8]}",
                    title=f"Analiza ekspercka ZUS: {req_title or explicit_topic}",
                    summary=f"{topic_summary} W stanie prawnym 2026 r. prawidłowa interpretacja ma kluczowe znaczenie dla terminowej wypłaty świadczeń.",
                    details=extended_details,
                    legal_basis=req_basis or "Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa (Dz.U. 2026)",
                    model_used="statutory-knowledge-engine",
                    is_live_ai=False,
                )

        best_match_key: str | None = None
        for patterns, key in KEYWORD_PATTERNS:
            if any(p in msg_lower or _normalize_text(p) in msg_norm for p in patterns):
                best_match_key = key
                break

        if best_match_key and best_match_key in STATUTORY_GLOSSARY:
            item = STATUTORY_GLOSSARY[best_match_key]
            return AssistantAskResponse(
                id=f"kb-{uuid.uuid4().hex[:8]}",
                title=item["title"],
                summary=item["summary"],
                details=item.get("details", []),
                legal_basis=item.get("legal_basis"),
                model_used="statutory-knowledge-engine",
                is_live_ai=False,
            )

        if not self._is_zus_related(msg_lower) and not request.topic_id and not (
            isinstance(request.user_context, dict) and request.user_context.get("requested_topic")
        ):
            return self._build_refusal_response()

        if isinstance(request.user_context, dict):
            active_tab = request.user_context.get("active_tab")
            tab_context_keys = {
                "chorobowy": "kod-b",
                "macierzynski": "ojcowski",
                "trudne-sytuacje": "wczesniak",
                "wnioski": "wariant-815",
                "kalkulator": "jak-dziala-kalkulator",
            }
            is_generic_tab_query = any(
                phrase in msg_lower
                for phrase in [
                    "w tej sprawie",
                    "w tym widoku",
                    "w tej sekcji",
                    "w tej zakładce",
                    "jakie mam uprawnienia",
                    "co mi przysługuje",
                ]
            )
            if is_generic_tab_query and active_tab in tab_context_keys:
                fallback_key = tab_context_keys[active_tab]
                item = STATUTORY_GLOSSARY[fallback_key]
                tab_name = request.user_context.get("tab_name", active_tab)
                return AssistantAskResponse(
                    id=f"kb-{uuid.uuid4().hex[:8]}",
                    title=f"{item['title']} ({tab_name})",
                    summary=item["summary"],
                    details=item.get("details", []),
                    legal_basis=item.get("legal_basis"),
                    model_used="statutory-knowledge-engine",
                    is_live_ai=False,
                )

        query_text = request.message.strip()
        active_tab_name = ""
        if isinstance(request.user_context, dict):
            active_tab_name = request.user_context.get("tab_name", "")

        return AssistantAskResponse(
            id=f"kb-{uuid.uuid4().hex[:8]}",
            title=f"Doradca ZUS: {active_tab_name}" if active_tab_name else "Doradca Zasiłkowy ZUS",
            summary=(
                f"W odpowiedzi na Twoje zapytanie: „{query_text}”. Wszystkie świadczenia dla "
                "rodziców są realizowane zgodnie z przepisami Kodeksu pracy i ustawy "
                "zasiłkowej 2026. Wysokość świadczenia zależy od wybranego wariantu "
                "(81,5% lub 100%/70%) oraz Twojej przeciętnej podstawy wymiaru składek."
            ),
            details=[
                "Wniosek o zasiłek (81,5%) z aktem urodzenia złóż w ciągu 21 dni od dnia porodu.",
                "Zasiłek macierzyński nie wymaga okresu wyczekiwania - przysługuje od razu.",
                "Skorzystaj z kalkulatora w odpowiedniej zakładce portalu, aby sprawdzić kwoty.",
                "Infolinia ZUS (COT): 22 560 16 00 (pon.-pt. 7:00-18:00).",
            ],
            legal_basis="Kodeks pracy (Dz.U. 2026) oraz ustawa zasiłkowa",
            model_used="statutory-knowledge-engine",
            is_live_ai=False,
        )


assistant_service = GeminiAssistantService()
