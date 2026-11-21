from typing import Any

from fastapi import APIRouter, Security

from ..models.pregnancy import (
    EmploymentType,
    PregnancyBenefitInput,
    PregnancyBenefitResult,
)
from ..security import Permission, authorization_manager
from ..services.pregnancy import calculate_pregnancy_benefit


class PregnancyRouter(APIRouter):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, prefix="/calculators", tags=["Pregnancy Benefits"], **kwargs)
        self.add_api_route(
            "/pregnancy",
            self.get_pregnancy_benefit_calculation,
            methods=["POST"],
            response_model=PregnancyBenefitResult,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.calculator_pregnancy],
                )
            ],
            summary="Kalkulator zasiłków w ciąży (kod B, rehabilitacja, upadłość) (BE-04 - BE-08)",
            description=(
                "Kompleksowy kalkulator świadczeń chorobowych w ciąży:\n\n"
                "- **Zasiłek chorobowy 100%**: zwolnienie lekarskie z kodem 'B' jest płatne 100% "
                "podstawy wymiaru (bez obniżenia do 80%).\n"
                "- **Okres wyczekiwania**: weryfikacja wymaganego stażu ubezpieczenia "
                "(30 dni dla umowy o pracę vs 90 dni dla zleceniobiorców i przedsiębiorców).\n"
                "- **Podział kosztów**: pierwsze 33 dni (lub 14 dni po 50. roku życia) "
                "finansuje pracodawca jako wynagrodzenie chorobowe, od kolejnego dnia płaci ZUS.\n"
                "- **Wydłużony limit**: 270 dni pobierania zasiłku (zamiast 182 dni).\n"
                "- **Świadczenie rehabilitacyjne**: logika przejścia po wyczerpaniu 270 dni.\n"
                "- **Ochrona w upadłości**: prawo do świadczenia w wysokości macierzyńskiego "
                "w przypadku upadłości, likwidacji lub bezprawnego zwolnienia."
            ),
            response_description="Szczegółowy wynik kalkulacji świadczeń w ciąży",
        )
        self.add_api_route(
            "/pregnancy/example",
            self.get_pregnancy_benefit_example,
            methods=["GET"],
            response_model=PregnancyBenefitResult,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.calculator_pregnancy],
                )
            ],
            summary="Przykładowe wyliczenie zasiłku w ciąży bez danych wejściowych",
            description="Zwraca wzorcowy wynik dla pracownicy na etacie (8000 zł brutto).",
            response_description="Wzorcowy wynik kalkulacji",
        )

    def get_pregnancy_benefit_calculation(
        self, payload: PregnancyBenefitInput
    ) -> PregnancyBenefitResult:
        return calculate_pregnancy_benefit(payload)

    def get_pregnancy_benefit_example(self) -> PregnancyBenefitResult:
        example_payload = PregnancyBenefitInput(
            employment_type=EmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=8000,
            insurance_duration_days=365,
            sick_leave_duration_days=30,
            pregnancy_week=20,
        )
        return calculate_pregnancy_benefit(example_payload)


router = PregnancyRouter()
PregnancyAPI = PregnancyRouter
