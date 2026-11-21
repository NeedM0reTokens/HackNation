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

router = APIRouter(prefix="/api/calculators", tags=["Paternity & Parental Sharing"])


@router.post(
    "/paternity-leave",
    response_model=PaternityLeaveResult,
    summary="Kalkulator urlopu ojcowskiego (14 dni, 1-2 części, limit 12 m-cy / adopcja 14 lat)",
)
def get_paternity_leave_calculation(payload: PaternityLeaveInput) -> PaternityLeaveResult:
    return calculate_paternity_leave(payload)


@router.post(
    "/maternity-transfer",
    response_model=MaternityTransferResult,
    summary="Logika przejęcia urlopu macierzyńskiego przez ojca (po 14 tyg. lub wcześniej)",
)
def get_maternity_transfer_calculation(
    payload: MaternityTransferInput,
) -> MaternityTransferResult:
    return calculate_maternity_transfer(payload)


@router.post(
    "/parental-sharing",
    response_model=ParentalSharingResult,
    summary="Symulacja podziału opieki między oboje rodziców (równocześnie lub naprzemiennie)",
)
def get_parental_sharing_calculation(
    payload: ParentalSharingInput,
) -> ParentalSharingResult:
    return calculate_parental_sharing(payload)


class PaternityRouter(APIRouter):
    """Router class for Paternity leave and Parental sharing (BE-16, BE-17, BE-18)."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(prefix="/calculators", tags=["Paternity & Parental Sharing"], **kwargs)
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/paternity-leave",
            self.calculate_paternity_leave_route,
            methods=["POST"],
            response_model=PaternityLeaveResult,
            summary="Kalkulator urlopu ojcowskiego (BE-16)",
        )
        self.add_api_route(
            "/maternity-transfer",
            self.calculate_maternity_transfer_route,
            methods=["POST"],
            response_model=MaternityTransferResult,
            summary="Przejęcie macierzyńskiego przez ojca (BE-17)",
        )
        self.add_api_route(
            "/parental-sharing",
            self.calculate_parental_sharing_route,
            methods=["POST"],
            response_model=ParentalSharingResult,
            summary="Symulacja podziału opieki między rodziców (BE-18)",
        )

    def calculate_paternity_leave_route(
        self, payload: PaternityLeaveInput
    ) -> PaternityLeaveResult:
        return calculate_paternity_leave(payload)

    def calculate_maternity_transfer_route(
        self, payload: MaternityTransferInput
    ) -> MaternityTransferResult:
        return calculate_maternity_transfer(payload)

    def calculate_parental_sharing_route(
        self, payload: ParentalSharingInput
    ) -> ParentalSharingResult:
        return calculate_parental_sharing(payload)


PaternityAPI = PaternityRouter
