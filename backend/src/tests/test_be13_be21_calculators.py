import asyncio
import json
import unittest
from datetime import date, timedelta
from typing import Any

from ..api.api import app
from ..api.models.adoption import AdoptionLeaveInput, CaregiverType
from ..api.models.calculator import IntegratedCalculatorInput
from ..api.models.maternity import BenefitPaymentVariant, MaternityEmploymentType
from ..api.models.parental_work import ParentalWorkInput
from ..api.models.paternity import (
    MaternityTransferInput,
    MaternityTransferReason,
    ParentalSharingInput,
    PaternityLeaveInput,
    SharingMode,
)
from ..api.models.special_cases import SpecialCasesInput, SpecialCaseType
from ..api.services.adoption import calculate_adoption_leave
from ..api.services.calculator import (
    calculate_integrated_parental_service,
    get_preset_by_key_service,
    get_presets_service,
)
from ..api.services.parental_work import calculate_parental_work_combination
from ..api.services.paternity import (
    calculate_maternity_transfer,
    calculate_parental_sharing,
    calculate_paternity_leave,
)
from ..api.services.special_cases import calculate_special_cases


class FakeResponse:
    def __init__(self, status_code: int, body: bytes) -> None:
        self.status_code = status_code
        self._body = body

    def json(self) -> Any:
        return json.loads(self._body.decode()) if self._body else {}


class FakeClient:
    def __init__(self, asgi_app: Any) -> None:
        self.app = asgi_app

    def get(self, path: str) -> FakeResponse:
        return self._request("GET", path)

    def post(self, path: str, json: Any = None) -> FakeResponse:
        return self._request("POST", path, json_data=json)

    def _request(self, method: str, path: str, json_data: Any = None) -> FakeResponse:
        body_bytes = json.dumps(json_data).encode() if json_data is not None else b""
        scope = {
            "type": "http",
            "method": method,
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body_bytes)).encode()),
            ],
        }
        status_code = 0
        resp_body = bytearray()

        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        async def send(msg):
            nonlocal status_code, resp_body
            if msg["type"] == "http.response.start":
                status_code = msg["status"]
            elif msg["type"] == "http.response.body":
                resp_body.extend(msg.get("body", b""))

        asyncio.run(self.app(scope, receive, send))
        return FakeResponse(status_code, bytes(resp_body))


class TestBE13ThroughBE21(unittest.TestCase):
    def setUp(self):
        self.client = FakeClient(app)

    def test_be13_za_zyciem_single_and_multiple(self):
        single_input = SpecialCasesInput.model_validate(
            {
                "case_type": SpecialCaseType.ZA_ZYCIEM,
                "gross_monthly_income": 10000.0,
                "children_born_count": 1,
                "has_za_zyciem_certificate": True,
            }
        )
        res_single = calculate_special_cases(single_input)
        self.assertTrue(res_single.is_eligible)
        self.assertEqual(res_single.base_maternity_weeks, 20)
        self.assertEqual(res_single.parental_weeks, 65)
        self.assertEqual(res_single.total_leave_weeks, 85)
        self.assertEqual(res_single.non_transferable_parental_weeks, 9)
        self.assertEqual(res_single.one_time_grant_pln, 4000.0)

        twins_input = SpecialCasesInput.model_validate(
            {
                "case_type": SpecialCaseType.ZA_ZYCIEM,
                "gross_monthly_income": 10000.0,
                "children_born_count": 2,
                "has_za_zyciem_certificate": True,
            }
        )
        res_twins = calculate_special_cases(twins_input)
        self.assertEqual(res_twins.base_maternity_weeks, 31)
        self.assertEqual(res_twins.parental_weeks, 67)
        self.assertEqual(res_twins.total_leave_weeks, 98)

    def test_be14_premature_hospitalization(self):
        premature_input = SpecialCasesInput.model_validate(
            {
                "case_type": SpecialCaseType.PREMATURE_HOSPITALIZATION,
                "gross_monthly_income": 8000.0,
                "child_birth_week": 26,
                "birth_weight_grams": 950,
                "hospitalization_weeks": 12,
            }
        )
        res_premature = calculate_special_cases(premature_input)
        self.assertTrue(res_premature.is_eligible)
        self.assertEqual(res_premature.base_maternity_weeks, 20)
        self.assertEqual(res_premature.supplementary_maternity_weeks, 12)
        self.assertEqual(res_premature.total_maternity_weeks, 32)
        self.assertTrue(res_premature.can_interrupt_maternity_for_hospitalization)

        mod_input = SpecialCasesInput.model_validate(
            {
                "case_type": SpecialCaseType.PREMATURE_HOSPITALIZATION,
                "gross_monthly_income": 8000.0,
                "child_birth_week": 32,
                "birth_weight_grams": 1800,
                "hospitalization_weeks": 10,
            }
        )
        res_mod = calculate_special_cases(mod_input)
        self.assertEqual(res_mod.supplementary_maternity_weeks, 8)
        self.assertEqual(res_mod.total_maternity_weeks, 28)

    def test_be15_stillbirth_or_death(self):
        stillbirth_input = SpecialCasesInput.model_validate(
            {
                "case_type": SpecialCaseType.STILLBIRTH_OR_DEATH,
                "gross_monthly_income": 8000.0,
                "is_stillbirth": True,
            }
        )
        res_still = calculate_special_cases(stillbirth_input)
        self.assertTrue(res_still.is_eligible)
        self.assertEqual(res_still.total_maternity_weeks, 8)
        self.assertEqual(res_still.parental_weeks, 0)
        self.assertEqual(res_still.one_time_grant_pln, 4000.0)

        death_later_input = SpecialCasesInput.model_validate(
            {
                "case_type": SpecialCaseType.STILLBIRTH_OR_DEATH,
                "gross_monthly_income": 8000.0,
                "child_death_after_birth": True,
                "child_age_days_at_death": 70,
            }
        )
        res_later = calculate_special_cases(death_later_input)
        self.assertEqual(res_later.total_maternity_weeks, 1)

    def test_be16_paternity_leave(self):
        paternity_input = PaternityLeaveInput.model_validate(
            {
                "gross_monthly_income": 9000.0,
                "employment_type": MaternityEmploymentType.EMPLOYMENT_CONTRACT,
                "is_insured": True,
                "child_age_months": 2,
                "is_adopted": False,
                "parts": [
                    {"part_number": 1, "days": 7},
                    {"part_number": 2, "days": 7},
                ],
            }
        )
        res_paternity = calculate_paternity_leave(paternity_input)
        self.assertTrue(res_paternity.is_eligible)
        self.assertEqual(res_paternity.total_days, 14)
        self.assertGreater(res_paternity.total_benefit_amount, 0.0)

        paternity_expired = PaternityLeaveInput.model_validate(
            {
                "gross_monthly_income": 9000.0,
                "is_insured": True,
                "child_age_months": 15,
                "is_adopted": False,
                "parts": [{"part_number": 1, "days": 14}],
            }
        )
        res_expired = calculate_paternity_leave(paternity_expired)
        self.assertFalse(res_expired.is_eligible)
        self.assertTrue(any("12 m-cy" in r for r in res_expired.refusal_reasons))

    def test_be17_maternity_transfer(self):
        transfer_standard = MaternityTransferInput.model_validate(
            {
                "children_born_count": 1,
                "mother_used_weeks": 14,
                "transfer_reason": MaternityTransferReason.STANDARD_AFTER_14_WEEKS,
                "father_gross_monthly_income": 9000.0,
                "is_father_insured": True,
            }
        )
        res_trans = calculate_maternity_transfer(transfer_standard)
        self.assertTrue(res_trans.is_eligible)
        self.assertEqual(res_trans.father_transferred_weeks, 6)
        self.assertGreater(res_trans.father_total_benefit_amount, 0.0)

        transfer_too_early = MaternityTransferInput.model_validate(
            {
                "children_born_count": 1,
                "mother_used_weeks": 10,
                "transfer_reason": MaternityTransferReason.STANDARD_AFTER_14_WEEKS,
                "father_gross_monthly_income": 9000.0,
                "is_father_insured": True,
            }
        )
        res_early = calculate_maternity_transfer(transfer_too_early)
        self.assertFalse(res_early.is_eligible)

        transfer_hosp = MaternityTransferInput.model_validate(
            {
                "children_born_count": 1,
                "mother_used_weeks": 8,
                "transfer_reason": MaternityTransferReason.MOTHER_HOSPITALIZATION,
                "father_gross_monthly_income": 9000.0,
                "is_father_insured": True,
            }
        )
        res_hosp = calculate_maternity_transfer(transfer_hosp)
        self.assertTrue(res_hosp.is_eligible)
        self.assertEqual(res_hosp.father_transferred_weeks, 12)

    def test_be18_parental_sharing(self):
        sharing_valid = ParentalSharingInput.model_validate(
            {
                "sharing_mode": SharingMode.SEQUENTIAL,
                "children_born_count": 1,
                "mother_gross_income": 8000.0,
                "mother_maternity_weeks": 20,
                "mother_parental_weeks": 32,
                "father_gross_income": 9000.0,
                "father_maternity_weeks": 0,
                "father_parental_weeks": 9,
            }
        )
        res_sharing = calculate_parental_sharing(sharing_valid)
        self.assertTrue(res_sharing.non_transferable_respected)
        self.assertEqual(res_sharing.combined_total_weeks, 61)
        self.assertGreater(res_sharing.total_family_benefit_amount, 0.0)

        sharing_invalid = ParentalSharingInput.model_validate(
            {
                "sharing_mode": SharingMode.SEQUENTIAL,
                "children_born_count": 1,
                "mother_gross_income": 8000.0,
                "mother_parental_weeks": 35,
                "father_gross_income": 9000.0,
                "father_parental_weeks": 6,
            }
        )
        res_invalid = calculate_parental_sharing(sharing_invalid)
        self.assertFalse(res_invalid.non_transferable_respected)

    def test_be19_parental_work_combination(self):
        work_input = ParentalWorkInput.model_validate(
            {
                "gross_monthly_income": 8000.0,
                "work_fraction": 0.5,
                "parental_weeks_to_combine": 32,
                "work_during_extended_period": True,
                "children_born_count": 1,
                "benefit_rate_percentage": 70.0,
            }
        )
        res_work = calculate_parental_work_combination(work_input)
        self.assertTrue(res_work.is_eligible)
        self.assertEqual(res_work.total_parental_weeks_with_extension, 64)
        self.assertEqual(res_work.extension_weeks, 32)
        self.assertGreater(
            res_work.combined_monthly_income,
            res_work.standard_monthly_benefit_without_work,
        )
        self.assertGreater(res_work.financial_gain_compared_to_pure_leave, 0.0)

        over_work = ParentalWorkInput.model_validate(
            {
                "gross_monthly_income": 8000.0,
                "work_fraction": 0.75,
                "parental_weeks_to_combine": 32,
            }
        )
        res_over = calculate_parental_work_combination(over_work)
        self.assertFalse(res_over.is_eligible)

    def test_be20_adoption_leave(self):
        adopt_input = AdoptionLeaveInput.model_validate(
            {
                "gross_monthly_income": 8000.0,
                "is_insured": True,
                "caregiver_type": CaregiverType.ADOPTION,
                "children_adopted_count": 1,
                "child_age_years": 3,
            }
        )
        res_adopt = calculate_adoption_leave(adopt_input)
        self.assertTrue(res_adopt.is_eligible)
        self.assertEqual(res_adopt.maternity_condition_weeks, 20)
        self.assertEqual(res_adopt.parental_weeks_available, 41)
        self.assertEqual(res_adopt.child_age_limit_parental_years, 14)

        older_child = AdoptionLeaveInput.model_validate(
            {
                "gross_monthly_income": 8000.0,
                "is_insured": True,
                "caregiver_type": CaregiverType.ADOPTION,
                "children_adopted_count": 1,
                "child_age_years": 6,
                "child_age_months": 11,
                "has_deferred_school_obligation": False,
            }
        )
        res_older = calculate_adoption_leave(older_child)
        self.assertTrue(res_older.is_eligible)
        self.assertEqual(res_older.maternity_condition_weeks, 9)
        self.assertTrue(res_older.is_minimum_guaranteed_weeks_applied)

        foster_pro = AdoptionLeaveInput.model_validate(
            {
                "gross_monthly_income": 8000.0,
                "is_insured": True,
                "caregiver_type": CaregiverType.FOSTER_FAMILY_PROFESSIONAL,
                "children_adopted_count": 1,
                "child_age_years": 3,
            }
        )
        res_foster = calculate_adoption_leave(foster_pro)
        self.assertFalse(res_foster.is_eligible)

    def test_be21_integrated_calculator_and_timeline(self):
        birth_d = date(2026, 6, 1)
        integrated_input = IntegratedCalculatorInput.model_validate(
            {
                "child_birth_date": birth_d,
                "mother_gross_monthly_income": 8000.0,
                "is_mother_insured": True,
                "father_gross_monthly_income": 9000.0,
                "is_father_insured": True,
                "children_count": 1,
                "chosen_variant": BenefitPaymentVariant.UNIFIED_81_5,
                "applied_within_21_days": True,
                "include_paternity_leave": True,
                "include_pregnancy_sick_leave": True,
                "pregnancy_sick_leave_days": 30,
                "work_combination": {
                    "enabled": True,
                    "parent_working": "mother",
                    "work_fraction": 0.5,
                    "weeks_to_combine": 32,
                    "work_during_extended_period": True,
                },
                "parental_sharing": {
                    "enabled": True,
                    "mode": "SEQUENTIAL",
                    "mother_weeks": 32,
                    "father_weeks": 9,
                },
            }
        )
        res = calculate_integrated_parental_service(integrated_input)
        self.assertTrue(res.is_eligible)
        self.assertEqual(res.child_birth_date, birth_d)
        self.assertEqual(res.timeline_start_date, birth_d - timedelta(days=30))
        self.assertGreater(res.total_leave_weeks, 60)
        self.assertGreater(res.total_family_combined_income, 0.0)

        period_ids = [p.id for p in res.timeline_periods]
        self.assertIn("p0_pregnancy_sick", period_ids)
        self.assertIn("p1_maternity_leave", period_ids)
        self.assertIn("p2_parental_mother_work", period_ids)
        self.assertIn("p3_parental_father", period_ids)
        self.assertIn("p4_paternity_leave", period_ids)

        self.assertGreaterEqual(len(res.milestones), 5)
        self.assertGreater(len(res.monthly_cashflow), 10)

    def test_presets_system(self):
        presets = get_presets_service()
        self.assertGreaterEqual(len(presets), 10)
        preset_keys = [p.key for p in presets]
        self.assertIn("maternity_standard", preset_keys)
        self.assertIn("paternity", preset_keys)
        self.assertIn("parental_work", preset_keys)
        self.assertIn("adoption", preset_keys)
        self.assertIn("special_cases_za_zyciem", preset_keys)
        self.assertIn("special_cases_premature", preset_keys)
        self.assertIn("special_cases_stillbirth", preset_keys)
        self.assertIn("parental_sharing", preset_keys)
        self.assertIn("integrated_full", preset_keys)

        single_p = get_preset_by_key_service("maternity_standard")
        self.assertIsNotNone(single_p)
        assert single_p is not None
        self.assertEqual(single_p.tab, "macierzynski")

    def test_http_api_endpoints_and_error_handling(self):
        resp_presets = self.client.get("/api/calculators/presets")
        self.assertEqual(resp_presets.status_code, 200)

        resp_404 = self.client.get("/api/calculators/presets/nieistniejacy_klucz")
        self.assertEqual(resp_404.status_code, 404)
        self.assertIn("nie został znaleziony", resp_404.json()["detail"])

        resp_422 = self.client.post("/api/calculator/parental", json={"niepoprawne_pole": 123})
        self.assertEqual(resp_422.status_code, 422)

        preset_int = get_preset_by_key_service("integrated_full")
        self.assertIsNotNone(preset_int)
        assert preset_int is not None
        resp_calc = self.client.post("/api/calculator/parental", json=preset_int.default_payload)
        self.assertEqual(resp_calc.status_code, 200)
        self.assertTrue(resp_calc.json()["is_eligible"])


if __name__ == "__main__":
    unittest.main()
