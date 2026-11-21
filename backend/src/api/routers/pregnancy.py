from fastapi import APIRouter

from ..models.pregnancy import (
    EmploymentType,
    PregnancyBenefitInput,
    PregnancyBenefitResult,
)
from ..services.pregnancy import calculate_pregnancy_benefit


class PregnancyRouter(APIRouter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, prefix="/api/calculators", tags=["Pregnancy Benefits"], **kwargs)
        self.add_api_route(
            "/pregnancy",
            self.get_pregnancy_benefit_calculation,
            methods=["POST"],
            response_model=PregnancyBenefitResult,
        )
        self.add_api_route(
            "/pregnancy/example",
            self.get_pregnancy_benefit_example,
            methods=["GET"],
            response_model=PregnancyBenefitResult,
            summary="Przykładowe wyliczenie bez danych wejściowych",
        )

    def get_pregnancy_benefit_calculation(
        self, payload: PregnancyBenefitInput
    ) -> PregnancyBenefitResult:
        return calculate_pregnancy_benefit(payload)

    def get_pregnancy_benefit_example(self) -> PregnancyBenefitResult:
        """Zwraca przykładowy wynik do podłączenia frontendu przed dodaniem bazy."""
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

