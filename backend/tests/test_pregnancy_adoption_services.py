import unittest

from src.api.models.adoption import (
    AdoptionLeaveInput,
    CaregiverType,
)
from src.api.models.pregnancy import (
    EmploymentType,
    PayerSize,
    PayerType,
    PregnancyBenefitInput,
)
from src.api.services.adoption import calculate_adoption_leave
from src.api.services.pregnancy import calculate_pregnancy_benefit


class TestPregnancyAdoptionServices(unittest.TestCase):
    def test_pregnancy_sick_leave_standard(self) -> None:
        input_data = PregnancyBenefitInput(
            employment_type=EmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=8000.0,
            insurance_duration_days=180,
            has_pregnancy_code_b=True,
            prior_sick_days_current_year=0,
            sick_leave_duration_days=30,
            payer_size=PayerSize.ABOVE_20,
        )
        result = calculate_pregnancy_benefit(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.benefit_percentage, 100.0)
        self.assertEqual(result.max_coverage_days, 270)
        self.assertEqual(result.employer_days, 30)
        self.assertEqual(result.zus_days, 0)
        self.assertEqual(result.disbursing_entity, PayerType.EMPLOYER)

    def test_pregnancy_sick_leave_split_employer_zus(self) -> None:
        input_data = PregnancyBenefitInput(
            employment_type=EmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=8000.0,
            insurance_duration_days=180,
            has_pregnancy_code_b=True,
            prior_sick_days_current_year=20,
            sick_leave_duration_days=30,
            payer_size=PayerSize.ABOVE_20,
        )
        result = calculate_pregnancy_benefit(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.employer_days, 13)
        self.assertEqual(result.zus_days, 17)
        self.assertEqual(result.disbursing_entity, PayerType.EMPLOYER_AND_ZUS)

    def test_pregnancy_waiting_period_refusal(self) -> None:
        input_data = PregnancyBenefitInput(
            employment_type=EmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=8000.0,
            insurance_duration_days=15,
            exempt_from_waiting_period=False,
            has_pregnancy_code_b=True,
        )
        result = calculate_pregnancy_benefit(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("okres wyczekiwania" in r for r in result.refusal_reasons))

    def test_adoption_leave_standard(self) -> None:
        input_data = AdoptionLeaveInput(
            gross_monthly_income=9000.0,
            is_insured=True,
            caregiver_type=CaregiverType.ADOPTION,
            children_adopted_count=1,
            child_age_years=3,
            child_age_months=0,
            has_deferred_school_obligation=False,
            has_za_zyciem_certificate=False,
            applied_within_21_days=True,
        )
        result = calculate_adoption_leave(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.maternity_condition_weeks, 20)
        self.assertEqual(result.parental_weeks_available, 41)
        self.assertEqual(result.total_leave_weeks, 61)
        self.assertGreater(result.total_benefit_amount, 0)

    def test_adoption_child_over_age_limit_refusal(self) -> None:
        input_data = AdoptionLeaveInput(
            gross_monthly_income=9000.0,
            is_insured=True,
            caregiver_type=CaregiverType.ADOPTION,
            children_adopted_count=1,
            child_age_years=15,
            child_age_months=0,
            has_deferred_school_obligation=False,
            has_za_zyciem_certificate=False,
            applied_within_21_days=True,
        )
        result = calculate_adoption_leave(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("14" in r for r in result.refusal_reasons))


if __name__ == "__main__":
    unittest.main()
