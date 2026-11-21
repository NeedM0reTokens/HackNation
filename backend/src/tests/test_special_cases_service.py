import unittest

from ..api.models.maternity import MaternityEmploymentType
from ..api.models.special_cases import (
    SpecialCasesInput,
    SpecialCaseType,
)
from ..api.services.special_cases import calculate_special_cases


class TestSpecialCasesService(unittest.TestCase):
    def test_za_zyciem_special_case(self) -> None:
        input_data = SpecialCasesInput(
            case_type=SpecialCaseType.ZA_ZYCIEM,
            gross_monthly_income=8000.0,
            has_za_zyciem_certificate=True,
            children_born_count=1,
            is_insured_at_birth=True,
            child_birth_week=None,
            birth_weight_grams=None,
            hospitalization_weeks=0,
            is_stillbirth=False,
            child_death_after_birth=False,
            child_age_days_at_death=None,
            surviving_children_count=0,
        )
        result = calculate_special_cases(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.one_time_grant_pln, 4000.0)
        self.assertEqual(result.parental_weeks, 65)
        self.assertGreater(result.total_benefit_amount, 0)

    def test_premature_extreme_hospitalization(self) -> None:
        input_data = SpecialCasesInput(
            case_type=SpecialCaseType.PREMATURE_HOSPITALIZATION,
            gross_monthly_income=8000.0,
            children_born_count=1,
            is_insured_at_birth=True,
            has_za_zyciem_certificate=False,
            child_birth_week=26,
            birth_weight_grams=950,
            hospitalization_weeks=12,
            is_stillbirth=False,
            child_death_after_birth=False,
            child_age_days_at_death=None,
            surviving_children_count=0,
        )
        result = calculate_special_cases(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.supplementary_maternity_weeks, 12)
        self.assertEqual(result.total_maternity_weeks, 32)

    def test_stillbirth_maternity_leave(self) -> None:
        input_data = SpecialCasesInput(
            case_type=SpecialCaseType.STILLBIRTH_OR_DEATH,
            gross_monthly_income=8000.0,
            children_born_count=1,
            is_insured_at_birth=True,
            has_za_zyciem_certificate=False,
            child_birth_week=None,
            birth_weight_grams=None,
            hospitalization_weeks=0,
            is_stillbirth=True,
            child_death_after_birth=False,
            child_age_days_at_death=None,
            surviving_children_count=0,
        )
        result = calculate_special_cases(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.total_maternity_weeks, 8)
        self.assertEqual(result.parental_weeks, 0)

    def test_uninsured_special_cases_refusal(self) -> None:
        input_data = SpecialCasesInput(
            case_type=SpecialCaseType.ZA_ZYCIEM,
            gross_monthly_income=8000.0,
            employment_type=MaternityEmploymentType.NONE,
            children_born_count=1,
            is_insured_at_birth=False,
            has_za_zyciem_certificate=True,
            child_birth_week=None,
            birth_weight_grams=None,
            hospitalization_weeks=0,
            is_stillbirth=False,
            child_death_after_birth=False,
            child_age_days_at_death=None,
            surviving_children_count=0,
        )
        result = calculate_special_cases(input_data)
        self.assertFalse(result.is_eligible)
        self.assertEqual(result.total_leave_weeks, 0)


if __name__ == "__main__":
    unittest.main()
