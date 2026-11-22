import unittest

from src.api.models.maternity import (
    BenefitPaymentVariant,
    MaternityEmploymentType,
    MaternityParentalInput,
)
from src.api.services.maternity import (
    calculate_maternity_parental_benefit,
    get_maternity_weeks,
    get_parental_weeks,
)


class TestMaternityService(unittest.TestCase):
    def test_maternity_weeks_table(self) -> None:
        self.assertEqual(get_maternity_weeks(0), 0)
        self.assertEqual(get_maternity_weeks(1), 20)
        self.assertEqual(get_maternity_weeks(2), 31)
        self.assertEqual(get_maternity_weeks(3), 33)
        self.assertEqual(get_maternity_weeks(4), 35)
        self.assertEqual(get_maternity_weeks(5), 37)
        self.assertEqual(get_maternity_weeks(6), 37)

    def test_parental_weeks_table(self) -> None:
        self.assertEqual(get_parental_weeks(0, False), 0)
        self.assertEqual(get_parental_weeks(1, False), 41)
        self.assertEqual(get_parental_weeks(2, False), 43)
        self.assertEqual(get_parental_weeks(1, True), 65)
        self.assertEqual(get_parental_weeks(2, True), 67)

    def test_maternity_standard_unified(self) -> None:
        input_data = MaternityParentalInput(
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=8000.0,
            children_born_count=1,
            applied_within_21_days=True,
            chosen_variant=BenefitPaymentVariant.UNIFIED_81_5,
        )
        result = calculate_maternity_parental_benefit(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.total_maternity_weeks, 20)
        self.assertEqual(result.total_parental_weeks, 41)
        self.assertEqual(result.total_weeks, 61)
        self.assertGreater(result.total_benefit_amount, 0)
        self.assertGreater(result.comparison_unified_total, 0)
        self.assertGreater(result.comparison_variable_total, 0)

    def test_maternity_uninsured_refusal(self) -> None:
        input_data = MaternityParentalInput(
            employment_type=MaternityEmploymentType.NONE,
            gross_monthly_income=5000.0,
            is_insured_at_birth=False,
        )
        result = calculate_maternity_parental_benefit(input_data)
        self.assertFalse(result.is_eligible)
        self.assertEqual(result.total_benefit_amount, 0.0)
        self.assertTrue(any("ubezpieczenia" in r.lower() for r in result.refusal_reasons))
        self.assertTrue(any("kosiniakowe" in d.lower() for d in result.required_documents))

    def test_maternity_variable_variant(self) -> None:
        input_data = MaternityParentalInput(
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=10000.0,
            applied_within_21_days=True,
            chosen_variant=BenefitPaymentVariant.VARIABLE_100_70,
        )
        result = calculate_maternity_parental_benefit(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.chosen_variant, BenefitPaymentVariant.VARIABLE_100_70)
        self.assertGreater(len(result.periods), 0)

    def test_maternity_after_21_days_warning(self) -> None:
        input_data = MaternityParentalInput(
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            gross_monthly_income=7000.0,
            applied_within_21_days=False,
            chosen_variant=BenefitPaymentVariant.UNIFIED_81_5,
        )
        result = calculate_maternity_parental_benefit(input_data)
        self.assertTrue(result.is_eligible)
        self.assertTrue(any("21 dni" in note for note in result.warning_notes))


if __name__ == "__main__":
    unittest.main()
