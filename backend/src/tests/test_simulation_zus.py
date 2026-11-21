import unittest

from fastapi.testclient import TestClient

from ..api.api import app
from ..api.services.simulation import (
    _parse_pesel_details,
    get_mock_user_profile_service,
)


class TestZusInsuranceSimulation(unittest.TestCase):
    client: TestClient = TestClient(app)

    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_predefined_anna_kowalska_uop_pregnancy(self) -> None:
        profile = get_mock_user_profile_service("92011501234")
        self.assertEqual(profile.pesel, "92011501234")
        self.assertEqual(profile.first_name, "Anna")
        self.assertEqual(profile.last_name, "Kowalska")
        self.assertTrue(profile.has_insurance)
        self.assertEqual(profile.insurance_status, "ACTIVE")
        self.assertEqual(profile.insurance_type, "UoP")
        self.assertEqual(profile.employment_type, "EMPLOYMENT_CONTRACT")
        self.assertTrue(profile.has_sickness_insurance)
        self.assertEqual(profile.sickness_insurance_type, "MANDATORY")
        self.assertEqual(profile.waiting_period_days_required, 30)
        self.assertTrue(profile.waiting_period_satisfied)
        self.assertEqual(profile.average_monthly_gross, 8000.0)
        self.assertEqual(profile.calculation_base_net, 6903.2)
        self.assertEqual(len(profile.monthly_contributions_12m), 12)
        self.assertTrue(profile.is_large_payer)
        self.assertFalse(profile.overdue_contributions)
        self.assertFalse(profile.overdue_blocks_benefits)
        self.assertTrue(profile.has_active_ezla)
        self.assertEqual(len(profile.active_ezla), 1)
        self.assertEqual(profile.active_ezla[0].medical_code, "B")
        self.assertEqual(profile.max_sickness_days, 270)

    def test_predefined_tomasz_lewandowski_jdg_with_debt(self) -> None:
        profile = get_mock_user_profile_service("85040398765")
        self.assertEqual(profile.pesel, "85040398765")
        self.assertEqual(profile.insurance_type, "JDG")
        self.assertEqual(profile.employment_type, "B2B")
        self.assertTrue(profile.has_sickness_insurance)
        self.assertEqual(profile.sickness_insurance_type, "VOLUNTARY")
        self.assertEqual(profile.waiting_period_days_required, 90)
        self.assertTrue(profile.overdue_contributions)
        self.assertGreater(profile.overdue_amount, 48.06)
        self.assertTrue(profile.overdue_blocks_benefits)

    def test_predefined_julia_dabrowska_uninsured(self) -> None:
        profile = get_mock_user_profile_service("99010155555")
        self.assertEqual(profile.pesel, "99010155555")
        self.assertFalse(profile.has_insurance)
        self.assertEqual(profile.insurance_status, "NOT_INSURED")
        self.assertFalse(profile.has_sickness_insurance)
        self.assertEqual(profile.average_monthly_gross, 0.0)
        self.assertEqual(profile.calculation_base_net, 0.0)
        self.assertEqual(len(profile.monthly_contributions_12m), 0)

    def test_dynamic_custom_pesel_generation(self) -> None:
        custom_pesel = "03251212345"  # Born 2003-05-12, female
        dob, gender = _parse_pesel_details(custom_pesel)
        self.assertEqual(dob, "2003-05-12")
        self.assertEqual(gender, "Kobieta")

        profile = get_mock_user_profile_service(custom_pesel)
        self.assertEqual(profile.pesel, custom_pesel)
        self.assertEqual(profile.date_of_birth, "2003-05-12")
        self.assertEqual(profile.gender, "Kobieta")
        self.assertTrue(profile.has_insurance)
        self.assertEqual(profile.average_monthly_gross, 6000.0)
        self.assertEqual(len(profile.monthly_contributions_12m), 12)

    def test_alias_compatibility(self) -> None:
        profile = get_mock_user_profile_service("anna-kowalska")
        self.assertEqual(profile.pesel, "92011501234")
        self.assertEqual(profile.first_name, "Anna")

    def test_api_endpoint_zus_insurance_by_pesel(self) -> None:
        res = self.client.get("/api/zus/insurance/92011501234")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "92011501234")
        self.assertEqual(data["first_name"], "Anna")
        self.assertEqual(data["insurance_status"], "ACTIVE")
        self.assertEqual(data["calculation_base_net"], 6903.2)
        self.assertTrue(data["has_active_ezla"])

    def test_api_endpoint_mock_zus_insurance_by_pesel(self) -> None:
        res = self.client.get("/api/mock/zus/insurance/85040398765")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "85040398765")
        self.assertTrue(data["overdue_blocks_benefits"])

    def test_api_endpoint_simulation_profile_alias(self) -> None:
        res = self.client.get("/api/simulation/profile/anna-kowalska")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "92011501234")


if __name__ == "__main__":
    unittest.main()
