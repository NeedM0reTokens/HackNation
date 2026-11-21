from typing import Any

from fastapi import APIRouter, Security

from ..models.adoption import (
    AdoptionLeaveInput,
    AdoptionLeaveResult,
)
from ..security import Permission, authorization_manager
from ..services.adoption import calculate_adoption_leave


class AdoptionRouter(APIRouter):
    """Router for adoption and foster care leave (BE-20)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Adoption & Foster Care"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/adoption-leave",
            self.calculate_adoption_leave_route,
            methods=["POST"],
            response_model=AdoptionLeaveResult,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.calculator_maternity],
                )
            ],
            summary="Urlop na warunkach macierzyńskiego dla adopcji i rodziny zastępczej (BE-20)",
            description=(
                "Oblicza wymiary urlopów i zasiłków dla rodziców adopcyjnych i rodzin zastępczych "
                "zgodnie z art. 183 Kodeksu Pracy i art. 29 ust. 1 pkt 2 ustawy zasiłkowej:\n\n"
                "- **Podmioty uprawnione**: przysposobienie dziecka (`ADOPTION`) oraz rodzina "
                "zastępcza niezawodowa (`FOSTER_FAMILY_NON_PROFESSIONAL`).\n"
                "- **Limity wieku dziecka**: do ukończenia 7. roku życia (standard) lub "
                "do 10. roku życia przy odroczeniu obowiązku szkolnego.\n"
                "- **Gwarantowane minimum 9 tygodni**: jeśli do limitu zostało mniej czasu, "
                "pracownikowi przysługuje gwarantowane ustawowo min. 9 tygodni urlopu.\n"
                "- **Urlop rodzicielski po adopcji**: aż do ukończenia przez dziecko 14 lat."
            ),
            response_description="Wymiary urlopów na warunkach macierzyńskiego i rodzicielskiego",
        )

    def calculate_adoption_leave_route(self, payload: AdoptionLeaveInput) -> AdoptionLeaveResult:
        """Oblicza wymiar urlopu na warunkach macierzyńskiego i rodzicielskiego dla opiekunów."""
        return calculate_adoption_leave(payload)


router = AdoptionRouter()
AdoptionAPI = AdoptionRouter
