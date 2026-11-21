import unittest

from ..api.models.maternity import MaternityEmploymentType
from ..api.models.paternity import (
    MaternityTransferInput,
    MaternityTransferReason,
    ParentalSharingInput,
    PaternityLeaveInput,
    PaternityLeavePart,
    SharingMode,
)
from ..api.services.paternity import (
    calculate_maternity_transfer,
    calculate_parental_sharing,
    calculate_paternity_leave,
)


class TestPaternityService(unittest.TestCase):
    def test_paternity_leave_standard_one_part(self) -> None:
        input_data = PaternityLeaveInput(
            gross_monthly_income=9000.0,
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_insured=True,
            child_age_months=3,
            is_adopted=False,
            adopted_child_age_years=None,
            months_since_adoption=None,
            parts=[PaternityLeavePart(part_number=1, days=14)],
        )
        result = calculate_paternity_leave(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.total_days, 14)
        self.assertGreater(result.total_benefit_amount, 0)
        self.assertEqual(len(result.parts_breakdown), 1)
        self.assertEqual(result.parts_breakdown[0]["rate_percentage"], 100.0)

    def test_paternity_leave_two_parts(self) -> None:
        input_data = PaternityLeaveInput(
            gross_monthly_income=8000.0,
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_insured=True,
            child_age_months=6,
            is_adopted=False,
            adopted_child_age_years=None,
            months_since_adoption=None,
            parts=[
                PaternityLeavePart(part_number=1, days=7),
                PaternityLeavePart(part_number=2, days=7),
            ],
        )
        result = calculate_paternity_leave(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.total_days, 14)
        self.assertEqual(len(result.parts_breakdown), 2)

    def test_paternity_leave_child_over_12_months_refusal(self) -> None:
        input_data = PaternityLeaveInput(
            gross_monthly_income=8000.0,
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_insured=True,
            child_age_months=13,
            is_adopted=False,
            adopted_child_age_years=None,
            months_since_adoption=None,
            parts=[PaternityLeavePart(part_number=1, days=14)],
        )
        result = calculate_paternity_leave(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("12 m-cy" in r for r in result.refusal_reasons))

    def test_paternity_leave_part_validation_error(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            PaternityLeavePart(part_number=1, days=6)

    def test_paternity_leave_uninsured_refusal(self) -> None:
        input_data = PaternityLeaveInput(
            gross_monthly_income=8000.0,
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_insured=False,
            child_age_months=2,
            is_adopted=False,
            adopted_child_age_years=None,
            months_since_adoption=None,
        )
        result = calculate_paternity_leave(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("Brak ubezpieczenia" in r for r in result.refusal_reasons))

    def test_maternity_transfer_standard_valid(self) -> None:
        input_data = MaternityTransferInput(
            father_gross_monthly_income=8500.0,
            father_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_father_insured=True,
            children_born_count=1,
            transfer_reason=MaternityTransferReason.STANDARD_AFTER_14_WEEKS,
            mother_used_weeks=14,
            applied_within_21_days=True,
        )
        result = calculate_maternity_transfer(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.total_maternity_weeks, 20)
        self.assertEqual(result.father_transferred_weeks, 6)
        self.assertGreater(result.father_total_benefit_amount, 0)

    def test_maternity_transfer_insufficient_mother_weeks(self) -> None:
        input_data = MaternityTransferInput(
            father_gross_monthly_income=8500.0,
            father_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_father_insured=True,
            children_born_count=1,
            transfer_reason=MaternityTransferReason.STANDARD_AFTER_14_WEEKS,
            mother_used_weeks=10,
            applied_within_21_days=True,
        )
        result = calculate_maternity_transfer(input_data)
        self.assertFalse(result.is_eligible)
        self.assertTrue(any("14 tygodni" in r for r in result.refusal_reasons))

    def test_maternity_transfer_hospitalization_special(self) -> None:
        input_data = MaternityTransferInput(
            father_gross_monthly_income=8500.0,
            father_employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_father_insured=True,
            children_born_count=1,
            transfer_reason=MaternityTransferReason.MOTHER_HOSPITALIZATION,
            mother_used_weeks=8,
            applied_within_21_days=True,
        )
        result = calculate_maternity_transfer(input_data)
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.father_transferred_weeks, 12)

    def test_parental_sharing_standard_sequential(self) -> None:
        input_data = ParentalSharingInput(
            sharing_mode=SharingMode.SEQUENTIAL,
            children_born_count=1,
            has_za_zyciem_certificate=False,
            applied_within_21_days=True,
            mother_gross_income=7500.0,
            mother_maternity_weeks=20,
            mother_parental_weeks=32,
            father_gross_income=9000.0,
            father_maternity_weeks=0,
            father_parental_weeks=9,
        )
        result = calculate_parental_sharing(input_data)
        self.assertTrue(result.is_valid_division)
        self.assertTrue(result.non_transferable_respected)
        self.assertGreater(result.total_family_benefit_amount, 0)

    def test_parental_sharing_father_quota_violation(self) -> None:
        input_data = ParentalSharingInput(
            sharing_mode=SharingMode.SEQUENTIAL,
            children_born_count=1,
            has_za_zyciem_certificate=False,
            applied_within_21_days=True,
            mother_gross_income=7500.0,
            mother_maternity_weeks=20,
            mother_parental_weeks=35,
            father_gross_income=9000.0,
            father_maternity_weeks=0,
            father_parental_weeks=6,
        )
        result = calculate_parental_sharing(input_data)
        self.assertFalse(result.non_transferable_respected)
        self.assertTrue(any("9 tygodni" in msg for msg in result.validation_messages))


if __name__ == "__main__":
    unittest.main()
