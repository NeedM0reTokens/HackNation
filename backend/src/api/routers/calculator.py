from typing import Any

from fastapi import APIRouter, HTTPException

from ..models.calculator import (
    AllowanceRatesResponse,
    CalculatorPreset,
    IntegratedCalculatorInput,
    IntegratedCalculatorResult,
    PresetsListResponse,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
)
from ..services.calculator import (
    analyze_risks_service,
    calculate_integrated_parental_service,
    get_allowance_rates_service,
    get_preset_by_key_service,
    get_presets_service,
)


class CalculatorRouter(APIRouter):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(tags=["Kalkulator Zasiłków i Oś Czasu"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/calculator/config",
            self.get_allowance_rates_route,
            methods=["GET"],
            response_model=AllowanceRatesResponse,
            summary="Pobierz bazowe stawki zasiłków i wymiary urlopów",
            description=(
                "Zwraca zestaw podstawowych wskaźników prawnych: ujednoliconą stawkę 81,5%, "
                "stawkę standardową 100% i 70%, stawkę chorobowego w ciąży 100%, 14 dni "
                "ojcowskiego oraz 9 nieprzenoszalnych tygodni."
            ),
            response_description="Bazowe stawki i wymiary urlopów",
        )

        self.add_api_route(
            "/calculators/presets",
            self.get_all_presets_route,
            methods=["GET"],
            response_model=PresetsListResponse,
            summary="Pobierz listę gotowych presetów pod zakładki frontendowe",
            description=(
                "Zwraca zestaw 10 gotowych, predefiniowanych konfiguracji kalkulatorów "
                "dla każdej zakładki interfejsu użytkownika (macierzyński, ojcowski, ciąża, "
                "praca na 1/2 etatu, adopcja, przypadki szczególne, podział opieki, zintegrowany). "
                "Pozwala frontendowi jednym kliknięciem załadować wzorcowe dane formularza."
            ),
            response_description="Lista 10 presetów z domyślnymi payloadami",
        )

        self.add_api_route(
            "/calculators/presets/{preset_key}",
            self.get_preset_by_key_route,
            methods=["GET"],
            response_model=CalculatorPreset,
            summary="Pobierz pojedynczy preset konfiguracji dla wybranej zakładki",
            description=(
                "Zwraca szczegółowy obiekt presetu dla wskazanego klucza `preset_key` "
                "(np. `maternity_standard`, `paternity`, `parental_work`, `adoption`)."
            ),
            response_description="Szczegóły presetu z gotowym payloadem",
            responses={
                404: {"description": "Podany klucz presetu nie istnieje w systemie."},
            },
        )

        self.add_api_route(
            "/calculator/parental",
            self.calculate_integrated_parental_route,
            methods=["POST"],
            response_model=IntegratedCalculatorResult,
            summary="Zintegrowany kalkulator rodzicielski z osią czasu (BE-21)",
            description=(
                "Główny silnik integrujący wszystkie etapy rodzicielstwa:\n\n"
                "- **Chorobowe w ciąży**: opcjonalne zwolnienie kod B przed porodem.\n"
                "- **Urlop macierzyński**: harmonogram od dnia porodu (14 tyg. matki).\n"
                "- **Uzupełniający urlop**: automatyczne doliczenie tygodni przy wcześniaku.\n"
                "- **Urlop rodzicielski**: pełna pula tygodni z opcją pracy na 1/2 etatu.\n"
                "- **Nieprzenoszalna część ojca**: 9 tygodni dedykowanych drugiemu rodzicowi.\n"
                "- **Urlop ojcowski**: 14 dni płatne 100% zintegrowane w harmonogramie.\n"
                "- **Kalendarzowa oś czasu**: generuje konkretne daty dzienne.\n"
                "- **Kamienie milowe**: nieprzekraczalne terminy prawne.\n"
                "- **Miesięczny cashflow**: symulacja wpływów w podziale na miesiące."
            ),
            response_description=(
                "Kompletny harmonogram z osią czasu, kamieniami milowymi i kwotami PLN"
            ),
        )

        self.add_api_route(
            "/calculators/integrated",
            self.calculate_integrated_parental_route,
            methods=["POST"],
            response_model=IntegratedCalculatorResult,
            summary="Zintegrowany kalkulator rodzicielski z osią czasu (alias BE-21)",
            description="Wygodny alias dla endpointu POST /api/calculator/parental.",
            response_description="Kompletny harmonogram z osią czasu i kwotami PLN",
        )

        self.add_api_route(
            "/calculator/risks",
            self.analyze_risks_route,
            methods=["POST"],
            response_model=RiskAnalysisResponse,
            summary="Analiza ryzyk kontrolnych i czerwonych flag ZUS",
            description="Automatyczna weryfikacja ciągłości ubezpieczenia, pozorności umów, okresów karencji oraz zadłużenia.",
            response_description="Lista wykrytych ryzyk prawnych i kontrolnych ZUS z poziomem istotności",
        )

    def get_allowance_rates_route(self) -> AllowanceRatesResponse:
        return get_allowance_rates_service()

    def get_all_presets_route(self) -> PresetsListResponse:
        presets = get_presets_service()
        return PresetsListResponse(presets=presets)

    def get_preset_by_key_route(self, preset_key: str) -> CalculatorPreset:
        preset = get_preset_by_key_service(preset_key)
        if not preset:
            raise HTTPException(
                status_code=404,
                detail=f"Preset o kluczu '{preset_key}' nie został znaleziony.",
            )
        return preset

    def calculate_integrated_parental_route(
        self, payload: IntegratedCalculatorInput
    ) -> IntegratedCalculatorResult:
        return calculate_integrated_parental_service(payload)

    def analyze_risks_route(
        self, payload: RiskAnalysisRequest
    ) -> RiskAnalysisResponse:
        return analyze_risks_service(payload)


router = CalculatorRouter()
CalculatorAPI = CalculatorRouter
