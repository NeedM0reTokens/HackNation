# Komponent: Panel Administracyjny i Konfiguracja Parametrów Prawnych (BE-01, BE-02, BE-03)

## 1. Rola i Odpowiedzialność
Komponent zarządza kluczowymi wskaźnikami makroekonomicznymi i prawnymi ZUS (minimalne wynagrodzenie, stopy procentowe zasiłków, wymiary urlopów, limity wieku). Umożliwia dynamiczny odczyt oraz modyfikację parametrów w locie (hot-reload w pliku `config.json`) bez konieczności restartu serwera aplikacyjnego.

---

## 2. Architektura Plików
- **Router**: `backend/src/api/routers/admin.py` (`AdminRouter`, `AdminAPI`)
- **Serwis**: `backend/src/api/services/admin.py` (`ConfigService`, `config_service`)
- **Modele**: `backend/src/api/models/admin.py` (`AdminConfig`, `AdminConfigUpdate`, `MaternityWeeksConfig`, `RatesConfig`)
- **Magazyn konfiguracji**: `backend/src/api/config.json`

---

## 3. Specyfikacja Endpointów
- **`GET /api/admin/config`** – Pobranie aktualnych parametrów prawnych i stawek.
- **`PUT /api/admin/config`** – Aktualizacja wybranych parametrów (częściowa lub całościowa).

### Przykładowy Request PUT
```json
{
  "rates": {
    "unified_benefit_rate": 82.0
  },
  "min_wage_2026": 4900.00
}
```

---

## 4. Agentic Context (Kontekst dla Agenta AI)

### Rola Agenta
Agent wykorzystuje ten komponent, gdy użytkownik (np. audytor ZUS lub administrator) pyta o aktualnie obowiązujące parametry bazowe systemu lub gdy w trakcie symulacji należy sprawdzić wpływ zmiany przepisów (np. podniesienia minimalnego wynagrodzenia lub ujednoliconej stawki zasiłku z 81,5% do 82%).

### Niezmienniki i Twarde Reguły
- Wartości stawek procentowych muszą mieścić się w przedziale $(0, 100]$.
- Minimalne wynagrodzenie i progi kwotowe muszą być dodatnie ($> 0$).
- Wymiary tygodniowe urlopów muszą zachowywać relację porządku (np. urlop przy bliźniętach $\ge$ urlop przy 1 dziecku).
- Modyfikacja przez `PUT` od razu wpływa na kolejne wywołania kalkulatorów.

### Przykładowy Przypadek Użycia dla Agenta
- **Użytkownik**: „Rząd ogłosił podwyżkę płacy minimalnej w 2026 do 5000 zł, zmień to w systemie i przelicz zasiłek.”
- **Krok Agenta 1**: Wyślij `PUT /api/admin/config` z payloadem `{"min_wage_2026": 5000.00}`.
- **Krok Agenta 2**: Potwierdź zaktualizowanie pliku `config.json` i poinformuj użytkownika o nowej minimalnej podstawie wymiaru zasiłku.
