import unittest

from src.api.models.parental_work import ParentalWorkInput
from src.api.services.parental_work import (
    _get_base_parental_pool,
    _get_maximum_extension_limit,
    calculate_parental_work_combination,
)


class TestParentalWorkService(unittest.TestCase):
    def test_extension_limits(self) -> None:
        self.assertEqual(_get_maximum_extension_limit(1, False), 82)
        self.assertEqual(_get_maximum_extension_limit(2, False), 86)
        self.assertEqual(_get_maximum_extension_limit(1, True), 130)
        self.assertEqual(_get_maximum_extension_limit(2, True), 134)

    def test_base_parental_pool(self) -> None:
        self.assertEqual(_get_base_parental_pool(1, False), 41)
        self.assertEqual(_get_base_parental_pool(2, False), 43)
        self.assertEqual(_get_base_parental_pool(1, True), 65)

    def test_standard_half_time_work_combination(self) -> None:
        input_data = ParentalWorkInput(
            gross_monthly_income=8000.0,
            work_fraction=0.5,
            parental_weeks_to_combine=32,
            work_during_extended_period=True,
            children_born_count=1,
            has_za_zyciem_certificate=False,
            benefit_rate_percentage=70.0,
        )
        result = calculate_parental_work_combination(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.original_parental_weeks, 32)
        self.assertEqual(result.extension_weeks, 32)
        self.assertEqual(result.total_parental_weeks_with_extension, 64)
        self.assertGreater(result.financial_gain_compared_to_pure_leave, 0)
        self.assertGreater(result.total_combined_income, result.total_benefit_amount)
        self.assertEqual(len(result.periods), 2)

    def test_work_fraction_exceeding_half_time_refusal(self) -> None:
        input_data = ParentalWorkInput(
            gross_monthly_income=8000.0,
            work_fraction=0.75,
            parental_weeks_to_combine=32,
            work_during_extended_period=True,
            children_born_count=1,
            has_za_zyciem_certificate=False,
            benefit_rate_percentage=70.0,
        )
        result = calculate_parental_work_combination(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("1/2" in r for r in result.refusal_reasons))

    def test_requested_weeks_exceeding_pool_refusal(self) -> None:
        input_data = ParentalWorkInput(
            gross_monthly_income=8000.0,
            work_fraction=0.5,
            parental_weeks_to_combine=50,
            work_during_extended_period=True,
            children_born_count=1,
            has_za_zyciem_certificate=False,
            benefit_rate_percentage=70.0,
        )
        result = calculate_parental_work_combination(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("wymiar urlopu" in r for r in result.refusal_reasons))


if __name__ == "__main__":
    unittest.main()
