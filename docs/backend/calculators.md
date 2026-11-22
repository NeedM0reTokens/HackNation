# Kalkulatory

Backend udostępnia kilka kalkulatorów jako osobne endpointy REST. Wszystkie obliczenia działają bez zapisu do bazy danych i mogą być używane jako wynik demonstracyjny dla formularza użytkownika.

## Kalkulator ciąży

```http
POST /api/calculators/pregnancy
```

Przykład bez danych wejściowych:

```http
GET /api/calculators/pregnancy/example
```

Zakres:

- okres wyczekiwania,
- zwolnienie z kodem B,
- podział świadczenia między pracodawcę i ZUS,
- limit 270 dni,
- świadczenie rehabilitacyjne,
- sytuacje upadłości i bezprawnego zwolnienia.

## Kalkulator macierzyński i rodzicielski

```http
POST /api/calculators/maternity-parental
```

Uwzględnia:

- długość urlopu macierzyńskiego i rodzicielskiego,
- warianty 81,5% oraz 100%/70%,
- 9 tygodni nieprzenoszalnych,
- podział między rodziców.

## Urlop ojcowski

Dostępny w routerze paternity. Wynik zależy od aktywnego stanu rodzica, okresu urlopu i możliwości przejęcia części macierzyńskiego.

## Łączenie urlopu z pracą

Router `parental_work` oblicza możliwą proporcjonalną pracę na maksymalnie 1/2 etatu i wpływ na długość urlopu oraz dochód.

## Adopcja i rodzina zastępcza

Router `adoption` uwzględnia liminy wieku dziecka i minimalne długości urlopu wynikające z zastosowanego scenariusza.

## Przypadki szczególne

Router `special_cases` obsługuje:

- świadczenie „Za życiem”,
- wcześniactwo i hospitalizację,
- urodzenie martwego dziecka lub zgon dziecka,
- dodatkowe okresy urlopu.

## Zasada działania

1. Frontend lub klient HTTP wysyła dane JSON.
2. Pydantic sprawdza typy i zakresy pól.
3. Serwis kalkulatora pobiera parametry i wykonuje obliczenie.
4. API zwraca obliczoną kwotę, okresy, dokumenty i informacje prawne.

## Przykład

```bash
curl -X POST http://localhost:8000/api/calculators/pregnancy \
  -H 'Content-Type: application/json' \
  -d '{
    "employment_type":"EMPLOYMENT_CONTRACT",
    "gross_monthly_income":8000,
    "insurance_duration_days":365,
    "sick_leave_duration_days":30,
    "pregnancy_week":20,
    "has_pregnancy_code_b":true
  }'
```
