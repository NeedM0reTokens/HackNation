import unittest

from fastapi.testclient import TestClient
from src.api.api import app
from src.api.security import authentication_manager, create_access_token
from src.api.services.admin import config_service
from src.api.services.calculator import get_allowance_rates_service


class TestAdminConfigEndpoints(unittest.TestCase):
    client: TestClient = TestClient(app)

    def setUp(self) -> None:
        self.client = TestClient(app)
        self._original_dev_bypass = authentication_manager.dev_bypass
        config_service.reset_to_defaults()

    def tearDown(self) -> None:
        authentication_manager.dev_bypass = self._original_dev_bypass
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

    # --- Authorization and Security Tests ---

    def test_authorization_admin_token_allows_read_and_update(self) -> None:
        admin_token = create_access_token({"pesel": "80051209876", "role": "admin"})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # GET config
        get_res = self.client.get("/api/admin/config", headers=headers)
        self.assertEqual(get_res.status_code, 200)

        # PUT rates
        put_res = self.client.put(
            "/api/admin/config/rates",
            headers=headers,
            json={"unified_benefit_rate": 88.0},
        )
        self.assertEqual(put_res.status_code, 200)
        self.assertEqual(put_res.json()["benefit_rates"]["unified_benefit_rate"], 88.0)

    def test_authorization_user_token_forbidden(self) -> None:
        user_token = create_access_token({"pesel": "92011501234", "role": "user"})
        headers = {"Authorization": f"Bearer {user_token}"}

        # GET config forbidden (lacks admin:config:read)
        get_res = self.client.get("/api/admin/config", headers=headers)
        self.assertEqual(get_res.status_code, 403)
        self.assertEqual(get_res.json()["detail"], "Action not permitted")

        # PUT rates forbidden (lacks admin:config:update)
        put_res = self.client.put(
            "/api/admin/config/rates",
            headers=headers,
            json={"unified_benefit_rate": 88.0},
        )
        self.assertEqual(put_res.status_code, 403)
        self.assertEqual(put_res.json()["detail"], "Action not permitted")

        # POST reset forbidden
        reset_res = self.client.post("/api/admin/config/reset", headers=headers)
        self.assertEqual(reset_res.status_code, 403)
        self.assertEqual(reset_res.json()["detail"], "Action not permitted")

    def test_authorization_no_token_without_dev_bypass_unauthorized(self) -> None:
        authentication_manager.dev_bypass = False

        get_res = self.client.get("/api/admin/config")
        self.assertEqual(get_res.status_code, 401)
        self.assertIn("detail", get_res.json())

        put_res = self.client.put(
            "/api/admin/config/rates",
            json={"unified_benefit_rate": 88.0},
        )
        self.assertEqual(put_res.status_code, 401)

    def test_authorization_invalid_token_unauthorized(self) -> None:
        headers = {"Authorization": "Bearer invalid-or-corrupted-token"}

        get_res = self.client.get("/api/admin/config", headers=headers)
        self.assertEqual(get_res.status_code, 401)
        self.assertEqual(get_res.json()["detail"], "Invalid or expired token")

    def test_authorization_unknown_role_token_unauthorized(self) -> None:
        unknown_role_token = create_access_token(
            {"pesel": "12345678901", "role": "superadmin_unknown"}
        )
        headers = {"Authorization": f"Bearer {unknown_role_token}"}

        get_res = self.client.get("/api/admin/config", headers=headers)
        self.assertEqual(get_res.status_code, 401)
        self.assertIn("not recognized", get_res.json()["detail"])
