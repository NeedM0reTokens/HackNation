import unittest

from fastapi.testclient import TestClient
from src.api.api import app
from src.api.services.admin import config_service
from src.api.services.calculator import get_allowance_rates_service


class TestAdminConfigEndpoints(unittest.TestCase):
    client: TestClient = TestClient(app)

    def setUp(self) -> None:
        self.client = TestClient(app)
        config_service.reset_to_defaults()

    def tearDown(self) -> None:
        config_service.reset_to_defaults()

    def test_get_config(self) -> None:
        response = self.client.get("/api/admin/config")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("benefit_rates", data)
        self.assertIn("benefit_amounts", data)
        self.assertIn("leave_durations", data)
        self.assertIn("periods_and_limits", data)
        self.assertEqual(data["benefit_rates"]["unified_benefit_rate"], 81.5)
        self.assertEqual(data["benefit_amounts"]["min_wage_2026"], 4806.0)
        self.assertEqual(data["benefit_amounts"]["zus_debt_limit"], 48.06)

    def test_update_rates(self) -> None:
        update_payload = {"unified_benefit_rate": 85.0}
        response = self.client.put("/api/admin/config/rates", json=update_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["benefit_rates"]["unified_benefit_rate"], 85.0)

        # Check calculation service reflects the updated rate
        rates = get_allowance_rates_service()
        self.assertEqual(rates.maternity_parental_option_uniform, 85.0)

    def test_update_amounts_and_derived_debt_limit(self) -> None:
        update_payload = {"min_wage_2026": 5000.0}
        response = self.client.put("/api/admin/config/amounts", json=update_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["benefit_amounts"]["min_wage_2026"], 5000.0)
        # 1% of 5000.0 is 50.0
        self.assertEqual(data["benefit_amounts"]["zus_debt_limit"], 50.0)

    def test_update_durations(self) -> None:
        update_payload = {"paternity_leave_days": 21}
        response = self.client.put("/api/admin/config/durations", json=update_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["leave_durations"]["paternity_leave_days"], 21)

        rates = get_allowance_rates_service()
        self.assertEqual(rates.father_paternity_days, 21)

    def test_update_limits(self) -> None:
        update_payload = {"mandatory_waiting_period_days": 45}
        response = self.client.put("/api/admin/config/limits", json=update_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["periods_and_limits"]["mandatory_waiting_period_days"], 45)

    def test_update_single_parameter(self) -> None:
        param_payload = {"key": "death_grant_zus", "value": 7500.0}
        response = self.client.post("/api/admin/config/parameter", json=param_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["benefit_amounts"]["death_grant_zus"], 7500.0)

    def test_update_single_parameter_not_found(self) -> None:
        param_payload = {"key": "non_existent_key", "value": 123.0}
        response = self.client.post("/api/admin/config/parameter", json=param_payload)
        self.assertEqual(response.status_code, 404)

    def test_reset_to_defaults(self) -> None:
        # First modify a rate
        self.client.put("/api/admin/config/rates", json={"unified_benefit_rate": 90.0})
        rates_modified = get_allowance_rates_service()
        self.assertEqual(rates_modified.maternity_parental_option_uniform, 90.0)

        # Call reset
        response = self.client.post("/api/admin/config/reset")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["benefit_rates"]["unified_benefit_rate"], 81.5)

        # Verify service reflects defaults
        rates_reset = get_allowance_rates_service()
        self.assertEqual(rates_reset.maternity_parental_option_uniform, 81.5)
