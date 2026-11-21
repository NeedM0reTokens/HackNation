from typing import Any

from fastapi import APIRouter, HTTPException

from ..models.calculator import (
    AllowanceRatesResponse,
    CalculatorPreset,
    IntegratedCalculatorInput,
    IntegratedCalculatorResult,
    PresetsListResponse,
)
from ..services.calculator import (
    calculate_integrated_parental_service,
    get_allowance_rates_service,
    get_preset_by_key_service,
    get_presets_service,
)


class CalculatorRouter(APIRouter):
    """Router for common calculator config, presets, and integrated parental timeline (BE-21)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(tags=["Kalkulator Zasiłków i Oś Czasu"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/calculator/config",
            self.get_allowance_rates_route,
            methods=["GET"],
            response_model=AllowanceRatesResponse,
            summary="Pobierz stawki i parametry zasiłków",
            description="Zwraca bazowe stawki zasiłków (np. 100%, 70%, 81.5%) i wymiary urlopów.",
        )

        self.add_api_route(
            "/calculators/presets",
            self.get_all_presets_route,
            methods=["GET"],
            response_model=PresetsListResponse,
            summary="Lista gotowych presetów pod zakładki frontendowe",
            description=(
                "Zwraca zestaw gotowych, predefiniowanych konfiguracji kalkulatorów "
                "dla każdej zakładki (macierzyński, ojcowski, ciąża, praca, adopcja, "
                "przypadki szczególne, zintegrowany)."
            ),
        )

        self.add_api_route(
            "/calculators/presets/{preset_key}",
            self.get_preset_by_key_route,
            methods=["GET"],
            response_model=CalculatorPreset,
            summary="Pobierz pojedynczy preset konfiguracji",
            description="Zwraca obiekt presetu dla danej zakładki lub scenariusza.",
        )

        self.add_api_route(
            "/calculator/parental",
            self.calculate_integrated_parental_route,
            methods=["POST"],
            response_model=IntegratedCalculatorResult,
            summary="Zintegrowany kalkulator rodzicielski z osią czasu (BE-21)",
            description=(
                "Główny silnik integrujący wszystkie etapy: ciążę, macierzyński, "
                "rodzicielski, ojcowski, łączenie z pracą, podział opieki i przypadki szczególne. "
                "Generuje kompletną oś czasu z datami kalendarzowymi, kamieniami milowymi "
                "i miesięcznym przepływem finansowym."
            ),
        )

        self.add_api_route(
            "/calculators/integrated",
            self.calculate_integrated_parental_route,
            methods=["POST"],
            response_model=IntegratedCalculatorResult,
            summary="Zintegrowany kalkulator rodzicielski z osią czasu (alias BE-21)",
            description="Alias dla POST /api/calculator/parental.",
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


router = CalculatorRouter()
CalculatorAPI = CalculatorRouter
