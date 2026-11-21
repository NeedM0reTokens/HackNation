from typing import Any

from fastapi import APIRouter

from ..models.paternity import (
    MaternityTransferInput,
    MaternityTransferResult,
    ParentalSharingInput,
    ParentalSharingResult,
    PaternityLeaveInput,
    PaternityLeaveResult,
)
from ..services.paternity import (
    calculate_maternity_transfer,
    calculate_parental_sharing,
    calculate_paternity_leave,
)


class PaternityRouter(APIRouter):
    """Router for paternity leave, transfer, and parental sharing (BE-16 - BE-18)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Paternity & Family Sharing"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/paternity-leave",
            self.calculate_paternity_leave_route,
            methods=["POST"],
            response_model=PaternityLeaveResult,
            summary="Kalkulator urlopu ojcowskiego (14 dni, 100%) (BE-16)",
            description=(
                "Oblicza prawo do urlopu ojcowskiego zgodnie z art. 182(3) Kodeksu Pracy:\n\n"
                "- **Wymiar**: 14 dni kalendarzowych płatnych 100% podstawy wymiaru.\n"
                "- **Podział**: możliwość wykorzystania jednorazowo lub w max 2 częściach "
                "po min. 7 dni.\n"
                "- **Limit wieku**: do ukończenia przez dziecko 12. miesiąca życia "
                "(lub do 14 lat i 24 miesięcy od przysposobienia przy adopcji).\n"
                "- **Niezależność**: przysługuje niezależnie od urlopu macierzyńskiego matki "
                "(oboje rodzice mogą pobierać zasiłek jednocześnie)."
            ),
            response_description="Wynik kalkulacji urlopu ojcowskiego z rozbiciem na części",
        )

        self.add_api_route(
            "/maternity-transfer",
            self.calculate_maternity_transfer_route,
            methods=["POST"],
            response_model=MaternityTransferResult,
            summary="Przejęcie urlopu macierzyńskiego przez ojca (BE-17)",
            description=(
                "Weryfikuje przesłanki i wylicza kwotę przejęcia urlopu macierzyńskiego przez ojca "
                "(art. 180 § 4-17 Kodeksu Pracy):\n\n"
                "- **Zasada ogólna**: matka musi wykorzystać min. 14 tygodni macierzyńskiego, "
                "pozostałe tygodnie (np. 6 przy 1 dziecku) przejmuje ubezpieczony ojciec.\n"
                "- **Sytuacje szczególne (min. 8 tygodni matki)**: hospitalizacja matki, "
                "orzeczenie o niezdolności do samodzielnej egzystencji, porzucenie dziecka.\n"
                "- **Sytuacje natychmiastowe (0 tygodni matki)**: zgon matki, podjęcie pracy "
                "przez nieubezpieczoną matkę.\n"
                "- **Świadczenie ojca**: wyliczane ZAWSZE z jego własnych zarobków i składek."
            ),
            response_description="Warunki przejęcia i wyliczenie zasiłku ojca",
        )

        self.add_api_route(
            "/parental-sharing",
            self.calculate_parental_sharing_route,
            methods=["POST"],
            response_model=ParentalSharingResult,
            summary="Symulacja podziału opieki między oboje rodziców (BE-18)",
            description=(
                "Symuluje podział tygodni urlopu rodzicielskiego między matkę i ojca "
                "(art. 182(1a) i 182(1c) Kodeksu Pracy):\n\n"
                "- **Tryb**: naprzemienny (`SEQUENTIAL`) lub jednoczesny (`SIMULTANEOUS`).\n"
                "- **Pula 9 tygodni nieprzenoszalnych**: weryfikuje czy każdy rodzic ma "
                "zagwarantowane swoje 9 tygodni.\n"
                "- **Kalkulacja budżetu**: wylicza niezależne podstawy i zasiłki dla każdego "
                "rodzica oraz łączny dochód rodziny w okresie opieki."
            ),
            response_description="Szczegółowy podział tygodni i budżetu domowego obojga rodziców",
        )

    def calculate_paternity_leave_route(
        self, payload: PaternityLeaveInput
    ) -> PaternityLeaveResult:
        """Oblicza uprawnienia i kwoty urlopu ojcowskiego."""
        return calculate_paternity_leave(payload)

    def calculate_maternity_transfer_route(
        self, payload: MaternityTransferInput
    ) -> MaternityTransferResult:
        """Weryfikuje warunki i oblicza kwoty przejęcia urlopu macierzyńskiego przez ojca."""
        return calculate_maternity_transfer(payload)

    def calculate_parental_sharing_route(
        self, payload: ParentalSharingInput
    ) -> ParentalSharingResult:
        """Symuluje podział opieki i budżet rodziny między oboje rodziców."""
        return calculate_parental_sharing(payload)


<<<<<<< HEAD
router = PaternityRouter()
=======
>>>>>>> c6e189d6c07fea4503a797e5834df1f985859c4a
PaternityAPI = PaternityRouter
