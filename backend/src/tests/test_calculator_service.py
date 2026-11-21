import unittest
from datetime import date

from ..api.models.calculator import (
    IntegratedCalculatorInput,
    IntegratedParentalSharing,
    IntegratedWorkCombination,
)
from ..api.models.maternity import BenefitPaymentVariant, MaternityEmploymentType
from ..api.services.calculator import (
    calculate_integrated_parental_service,
    get_allowance_rates_service,
    get_preset_by_key_service,
    get_presets_service,
)
from ..constants import MIN_WAGE_2026, SOCIAL_CONTRIBUTIONS_RATE


class TestCalculatorService(unittest.TestCase):
    def test_allowance_rates(self) -> None:
        rates = get_allowance_rates_service()
        self.assertEqual(rates.maternity_parental_option_uniform, 81.5)
        self.assertEqual(rates.maternity_standard, 100.0)
        self.assertEqual(rates.parental_standard, 70.0)
        self.assertEqual(rates.pregnancy_sick_leave, 100.0)
        self.assertEqual(rates.father_paternity_days, 14)
        self.assertEqual(rates.non_transferable_parental_weeks, 9)

    def test_presets_discovery(self) -> None:
        presets = get_presets_service()
        self.assertEqual(len(presets), 10)
        paternity_preset = get_preset_by_key_service("paternity")
        self.assertIsNotNone(paternity_preset)
        assert paternity_preset is not None
        self.assertEqual(paternity_preset.tab, "ojcowski")
        unknown_preset = get_preset_by_key_service("non_existent_key")
        self.assertIsNone(unknown_preset)

    def test_integrated_standard_flow(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 6, 1),
            mother_gross_monthly_income=7000.0,
            mother_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_mother_insured=True,
            father_gross_monthly_income=8500.0,
            father_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_father_insured=True,
            children_count=1,
            chosen_variant=BenefitPaymentVariant.UNIFIED_81_5,
            applied_within_21_days=True,
            include_paternity_leave=True,
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.total_leave_weeks, 61)
        self.assertGreater(result.total_family_benefit_amount, 0)
        self.assertEqual(len(result.milestones), 5)
        self.assertIn("Kodeksu Pracy", result.legal_basis[0])

    def test_integrated_leap_year_february_29(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2024, 2, 29),
            mother_gross_monthly_income=6000.0,
            father_gross_monthly_income=7000.0,
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertTrue(result.is_eligible)
        first_bday_milestone = next(
            m for m in result.milestones if "urlop ojcowski" in m.title.lower()
        )
        self.assertEqual(first_bday_milestone.milestone_date, date(2025, 2, 28))
        six_year_milestone = next(
            m for m in result.milestones if "rodzicielski" in m.title.lower()
        )
        self.assertEqual(six_year_milestone.milestone_date, date(2030, 12, 31))

    def test_integrated_minimum_wage_floor(self) -> None:
        low_gross = 2000.0
        expected_min_net = round(MIN_WAGE_2026 * (1.0 - SOCIAL_CONTRIBUTIONS_RATE / 100.0), 2)
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 3, 1),
            mother_gross_monthly_income=low_gross,
            mother_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            father_gross_monthly_income=low_gross,
            father_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
        )
        result = calculate_integrated_parental_service(input_data)
        mother_period = next(
            p for p in result.timeline_periods if "macierzynski" in p.name.lower()
        )
        expected_mother_daily = round(
            round(expected_min_net / 30.0, 2) * (81.5 / 100.0), 2
        )
        expected_period_amount = round(expected_mother_daily * mother_period.days, 2)
        self.assertEqual(mother_period.total_benefit_net, expected_period_amount)

    def test_integrated_both_parents_uninsured(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 5, 1),
            mother_gross_monthly_income=0.0,
            is_mother_insured=False,
            father_gross_monthly_income=0.0,
            is_father_insured=False,
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("kosiniakowe" in note.lower() for note in result.summary_notes))

    def test_integrated_variable_variant_recommendation(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 4, 1),
            mother_gross_monthly_income=9000.0,
            chosen_variant=BenefitPaymentVariant.VARIABLE_100_70,
            applied_within_21_days=False,
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertTrue(result.is_eligible)
        self.assertGreater(result.comparison_variable_100_70_total, 0)
        self.assertGreater(result.comparison_unified_81_5_total, 0)
        self.assertIn(
            result.recommended_variant,
            ["UNIFIED_81_5", "VARIABLE_100_70"],
        )

    def test_integrated_adoption_case(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 1, 15),
            special_case_type="ADOPTION",
            mother_gross_monthly_income=8000.0,
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertTrue(result.is_eligible)
        adoption_milestone = next(
            m for m in result.milestones if "14 lat" in m.title.lower()
        )
        self.assertEqual(adoption_milestone.milestone_date, date(2040, 12, 31))

    def test_integrated_prenatal_sick_leave(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 7, 1),
            include_pregnancy_sick_leave=True,
            pregnancy_sick_leave_days=40,
            mother_gross_monthly_income=6500.0,
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertLess(result.timeline_start_date, date(2026, 7, 1))
        prenatal_period = next(
            p for p in result.timeline_periods if "ciazy" in p.name.lower()
        )
        self.assertEqual(prenatal_period.days, 40)
        self.assertGreater(prenatal_period.total_benefit_net, 0)

    def test_integrated_parental_sharing_simultaneous(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 8, 1),
            mother_gross_monthly_income=6000.0,
            father_gross_monthly_income=7000.0,
            parental_sharing=IntegratedParentalSharing(
                enabled=True,
                mode="SIMULTANEOUS",
                mother_weeks=20,
                father_weeks=20,
            ),
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertTrue(result.is_eligible)
        father_periods = [p for p in result.timeline_periods if p.person == "father"]
        self.assertGreater(len(father_periods), 0)

    def test_integrated_work_combination(self) -> None:
        input_data = IntegratedCalculatorInput(
            child_birth_date=date(2026, 9, 1),
            mother_gross_monthly_income=8000.0,
            work_combination=IntegratedWorkCombination(
                enabled=True,
                parent_working="mother",
                work_fraction=0.5,
                weeks_to_combine=32,
            ),
        )
        result = calculate_integrated_parental_service(input_data)
        self.assertTrue(result.is_eligible)
        self.assertGreater(result.total_work_salary_amount, 0)
        self.assertGreater(result.total_family_combined_income, result.total_family_benefit_amount)


if __name__ == "__main__":
    unittest.main()
