# Kontrakt Danych: Panel Admina (Konfiguracja Parametrów Prawnych)

**Moduł:** `BE-03` / `SETUP-06`  
**Wersja kontraktu:** `1.0.0`  
**Prefiks API:** `/api/admin`  
**Format wymiany danych:** `application/json`

---

## 1. Zestawienie Endpointów

| Metoda | Ścieżka | Opis | Kod sukcesu |
|---|---|---|---|
| `GET` | `/api/admin/config` | Pobranie aktualnych parametrów prawnych i stawek | `200 OK` |
| `PUT` | `/api/admin/config` | Aktualizacja parametrów w locie (bez restartu) | `200 OK` / `422 Unprocessable` |

---

## 2. Model Danych (`AdminConfig`)

Konfiguracja podzielona jest na 3 logiczne sekcje:
1. **`stopy_procentowe`** – stawki procentowe zasiłków (np. 100%, 81.5%, 70%).
2. **`wymiary_urlopow`** – wymiary urlopów w tygodniach i dniach (zgodne z Kodeksem Pracy i dyrektywą Work-Life Balance).
3. **`okresy_i_limity`** – okresy wyczekiwania, limity wieku dzieci i kwoty progowe.

---

## 3. Szczegóły Endpointów

### 3.1. `GET /api/admin/config`
Zwraca aktualny stan konfiguracji prawnej aplikacji.

#### Nagłówki żądania:
```http
Accept: application/json
```

#### Przykładowa odpowiedź (`200 OK`):
```json
{
  "stopy_procentowe": {
    "stopa_chorobowy_kod_b": 100.0,
    "stopa_chorobowy_standard": 80.0,
    "stopa_macierzynski_jednolity": 81.5,
    "stopa_macierzynski_standard": 100.0,
    "stopa_rodzicielski_standard": 70.0,
    "stopa_ojcowski": 100.0,
    "stopa_swiadczenie_rehab_1_3": 90.0,
    "stopa_swiadczenie_rehab_pozostale": 75.0,
    "stopa_swiadczenie_rehab_ciaza": 100.0
  },
  "wymiary_urlopow": {
    "urlop_macierzynski_1_dziecko_tygodnie": 20,
    "urlop_macierzynski_2_dzieci_tygodnie": 31,
    "urlop_macierzynski_3_dzieci_tygodnie": 33,
    "urlop_macierzynski_4_dzieci_tygodnie": 35,
    "urlop_macierzynski_5_plus_tygodnie": 37,
    "urlop_macierzynski_obligatoryjny_matki_tygodnie": 14,
    "urlop_rodzicielski_1_dziecko_tygodnie": 41,
    "urlop_rodzicielski_wieloraczki_tygodnie": 43,
    "urlop_rodzicielski_nieprzenoszalny_tygodnie": 9,
    "urlop_ojcowski_dni": 14,
    "max_czesci_urlopu_rodzicielskiego": 5
  },
  "okresy_i_limity": {
    "okres_wyczekiwania_uop_dni": 30,
    "okres_wyczekiwania_dobrowolne_dni": 90,
    "dni_chorobowe_pracodawca_standard": 33,
    "dni_chorobowe_pracodawca_50plus": 14,
    "wiek_prog_pracodawca": 50,
    "max_okres_zasilkowy_ciaza_dni": 270,
    "max_okres_zasilkowy_standard_dni": 182,
    "limit_wieku_ojcowski_miesiace": 12,
    "limit_wieku_adopcja_ojcowski_lat": 14,
    "termin_wniosku_macierzynski_81_5_dni": 21,
    "placa_minimalna_2026": 4806.0,
    "skladki_spoleczne_proc": 13.71,
    "procent_zadluzenia_limit_zus": 1.0
  }
}
```

---

### 3.2. `PUT /api/admin/config`
Umożliwia modyfikację wybranych sekcji lub pojedynczych parametrów. Zmiana jest natychmiast aplikowana w pamięci procesu oraz zapisywana do `config.json`.

#### Nagłówki żądania:
```http
Content-Type: application/json
Accept: application/json
```

#### Przykładowe ciało żądania (zmiana stawki jednolitej na 82% i liczby dni urlopu ojcowskiego na 16):
```json
{
  "stopy_procentowe": {
    "stopa_macierzynski_jednolity": 82.0
  },
  "wymiary_urlopow": {
    "urlop_ojcowski_dni": 16
  }
}
```

#### Odpowiedź sukcesu (`200 OK`):
Zwraca pełny zaktualizowany obiekt `AdminConfig`.

#### Błąd walidacji (`422 Unprocessable Entity`):
```json
{
  "detail": "Błąd walidacji konfiguracji: 1 validation error for AdminConfig..."
}
```

---

## 4. Słownik Parametrów

| Pole | Typ | Jednostka | Opis prawny |
|---|---|---|---|
| `stopa_chorobowy_kod_b` | `float` | `%` | Zasiłek chorobowy w trakcie ciąży (100% podstawy wymiaru) |
| `stopa_chorobowy_standard` | `float` | `%` | Standardowy zasiłek chorobowy (80% podstawy) |
| `stopa_macierzynski_jednolity` | `float` | `%` | Wniosek złożony do 21 dni po porodzie (tzw. długi wniosek: 81.5% przez cały okres) |
| `stopa_macierzynski_standard` | `float` | `%` | Wariant 100% za okres macierzyńskiego |
| `stopa_rodzicielski_standard` | `float` | `%` | Wariant 70% za okres rodzicielskiego |
| `stopa_ojcowski` | `float` | `%` | 100% podstawy wymiaru za okres urlopu ojcowskiego |
| `stopa_swiadczenie_rehab_ciaza`| `float` | `%` | Świadczenie rehabilitacyjne w ciąży (100%) |
| `urlop_macierzynski_1_dziecko_tygodnie` | `int` | tyg. | 20 tygodni przy 1 dziecku |
| `urlop_macierzynski_obligatoryjny_matki_tygodnie`| `int` | tyg. | 14 tygodni obligatoryjne dla matki przed możliwością przekazania ojcu |
| `urlop_rodzicielski_1_dziecko_tygodnie` | `int` | tyg. | 41 tygodni urlopu rodzicielskiego (łączny wymiar) |
| `urlop_rodzicielski_nieprzenoszalny_tygodnie` | `int` | tyg. | 9 tygodni wyłącznego, nieprzenoszalnego urlopu dla drugiego rodzica |
| `urlop_ojcowski_dni` | `int` | dni | 14 dni kalendarzowych urlopu ojcowskiego |
| `max_czesci_urlopu_rodzicielskiego` | `int` | szt. | Maksymalnie 5 części urlopu |
| `okres_wyczekiwania_uop_dni` | `int` | dni | 30 dni ubezpieczenia obowiązkowego (UoP) |
| `okres_wyczekiwania_dobrowolne_dni` | `int` | dni | 90 dni ubezpieczenia dobrowolnego (zlecenie, JDG) |
| `dni_chorobowe_pracodawca_standard` | `int` | dni | 33 dni choroby w roku płatne przez pracodawcę |
| `dni_chorobowe_pracodawca_50plus` | `int` | dni | 14 dni choroby po 50. roku życia płatne przez pracodawcę |
| `max_okres_zasilkowy_ciaza_dni`| `int` | dni | Maksymalny okres pobierania zasiłku chorobowego w ciąży (270 dni) |
| `limit_wieku_ojcowski_miesiace`| `int` | m-ce | Wiek dziecka, do którego można wykorzystać urlop ojcowski (12 miesięcy) |
| `termin_wniosku_macierzynski_81_5_dni` | `int` | dni | Termin na złożenie wniosku o zasiłek w stawce 81.5% (21 dni od porodu) |
| `placa_minimalna_2026` | `float` | zł | Płaca minimalna brutto w 2026 roku (4806.00 zł) |
| `skladki_spoleczne_proc` | `float` | `%` | Procent potrącany z brutto na ZUS (13.71%) |
| `procent_zadluzenia_limit_zus`| `float` | `%` | Limit zadłużenia JDG w ZUS (1% płacy minimalnej = 48.06 zł) |

---

## 5. Definicje TypeScript (dla Frontendu)

Plik z typami znajduje się w `docs/types/admin_config.d.ts` oraz `frontend/src/types/admin.d.ts`.
Można go bezpośrednio zaimportować w komponentach React:

```typescript
export interface StopyProcentowe {
  stopa_chorobowy_kod_b: number;
  stopa_chorobowy_standard: number;
  stopa_macierzynski_jednolity: number;
  stopa_macierzynski_standard: number;
  stopa_rodzicielski_standard: number;
  stopa_ojcowski: number;
  stopa_swiadczenie_rehab_1_3: number;
  stopa_swiadczenie_rehab_pozostale: number;
  stopa_swiadczenie_rehab_ciaza: number;
}

export interface WymiaryUrlopow {
  urlop_macierzynski_1_dziecko_tygodnie: number;
  urlop_macierzynski_2_dzieci_tygodnie: number;
  urlop_macierzynski_3_dzieci_tygodnie: number;
  urlop_macierzynski_4_dzieci_tygodnie: number;
  urlop_macierzynski_5_plus_tygodnie: number;
  urlop_macierzynski_obligatoryjny_matki_tygodnie: number;
  urlop_rodzicielski_1_dziecko_tygodnie: number;
  urlop_rodzicielski_wieloraczki_tygodnie: number;
  urlop_rodzicielski_nieprzenoszalny_tygodnie: number;
  urlop_ojcowski_dni: number;
  max_czesci_urlopu_rodzicielskiego: number;
}

export interface OkresyILimity {
  okres_wyczekiwania_uop_dni: number;
  okres_wyczekiwania_dobrowolne_dni: number;
  dni_chorobowe_pracodawca_standard: number;
  dni_chorobowe_pracodawca_50plus: number;
  wiek_prog_pracodawca: number;
  max_okres_zasilkowy_ciaza_dni: number;
  max_okres_zasilkowy_standard_dni: number;
  limit_wieku_ojcowski_miesiace: number;
  limit_wieku_adopcja_ojcowski_lat: number;
  termin_wniosku_macierzynski_81_5_dni: number;
  placa_minimalna_2026: number;
  skladki_spoleczne_proc: number;
  procent_zadluzenia_limit_zus: number;
}

export interface AdminConfig {
  stopy_procentowe: StopyProcentowe;
  wymiary_urlopow: WymiaryUrlopow;
  okresy_i_limity: OkresyILimity;
}

export interface AdminConfigUpdate {
  stopy_procentowe?: Partial<StopyProcentowe>;
  wymiary_urlopow?: Partial<WymiaryUrlopow>;
  okresy_i_limity?: Partial<OkresyILimity>;
}
```
