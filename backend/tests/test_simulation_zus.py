import unittest

from fastapi.testclient import TestClient
from src.api.api import app
from src.api.services.simulation import (
    _parse_pesel_details,
    get_citizen_debt_certificate_service,
    get_citizen_ezla_service,
    get_mock_user_profile_service,
    get_single_ezla_certificate_service,
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
        self.assertFalse(profile.has_overdue_contributions)
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
        self.assertTrue(profile.has_overdue_contributions)
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

    def test_api_endpoint_zus_insurance_by_pesel(self) -> None:
        res = self.client.get("/api/zus/insurance/92011501234")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "92011501234")
        self.assertEqual(data["first_name"], "Anna")
        self.assertEqual(data["insurance_status"], "ACTIVE")
        self.assertEqual(data["calculation_base_net"], 6903.2)
        self.assertTrue(data["has_active_ezla"])

    # --- Testy dla e-ZLA ---
    def test_anna_kowalska_ezla_pregnancy(self) -> None:
        ezla_data = get_citizen_ezla_service("92011501234")
        self.assertEqual(ezla_data.pesel, "92011501234")
        self.assertTrue(ezla_data.has_active_ezla)
        self.assertEqual(ezla_data.total_certificates_count, 2)
        self.assertEqual(ezla_data.active_certificates_count, 1)

        # Active certificate: Kod B ciąża
        active_cert = next(c for c in ezla_data.certificates if c.status == "ACTIVE")
        self.assertEqual(active_cert.document_id, "EZLA/2026/04/11092")
        self.assertEqual(active_cert.medical_code, "B")
        self.assertTrue(active_cert.is_pregnancy)
        self.assertEqual(active_cert.benefit_percentage, 100.0)
        self.assertEqual(active_cert.days_count, 30)

        # Historical certificate
        hist_cert = next(c for c in ezla_data.certificates if c.status == "HISTORICAL")
        self.assertEqual(hist_cert.document_id, "EZLA/2025/11/04321")
        self.assertFalse(hist_cert.is_pregnancy)
        self.assertEqual(hist_cert.benefit_percentage, 80.0)

    def test_piotr_zielinski_ezla_historical(self) -> None:
        ezla_data = get_citizen_ezla_service("89032005678")
        self.assertFalse(ezla_data.has_active_ezla)
        self.assertEqual(ezla_data.total_certificates_count, 1)
        self.assertEqual(ezla_data.active_certificates_count, 0)
        self.assertEqual(ezla_data.certificates[0].medical_code, "A")

    def test_julia_dabrowska_ezla_empty(self) -> None:
        ezla_data = get_citizen_ezla_service("99010155555")
        self.assertFalse(ezla_data.has_active_ezla)
        self.assertEqual(ezla_data.total_certificates_count, 0)
        self.assertEqual(len(ezla_data.certificates), 0)

    def test_single_ezla_certificate_service(self) -> None:
        cert = get_single_ezla_certificate_service("EZLA/2026/04/11092")
        self.assertEqual(cert.document_id, "EZLA/2026/04/11092")
        self.assertEqual(cert.medical_code, "B")
        self.assertTrue(cert.is_pregnancy)

    def test_api_endpoint_zus_ezla_by_pesel(self) -> None:
        res = self.client.get("/api/zus/ezla/92011501234")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "92011501234")
        self.assertTrue(data["has_active_ezla"])
        self.assertEqual(data["total_certificates_count"], 2)
        self.assertEqual(data["certificates"][0]["medical_code"], "B")

    def test_api_endpoint_zus_ezla_certificate_detail(self) -> None:
        res = self.client.get("/api/zus/ezla/certificate/EZLA/2026/04/11092")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["document_id"], "EZLA/2026/04/11092")
        self.assertEqual(data["doctor_name"], "dr n. med. Ewa Wiśniewska")
        self.assertEqual(data["benefit_percentage"], 100.0)

    # --- Testy dla stanu zadłużenia (Art. 2a - ZUS RD-3) ---
    def test_tomasz_lewandowski_debt_certificate_service(self) -> None:
        cert = get_citizen_debt_certificate_service("85040398765", entitlement_date="2026-05-01")
        self.assertEqual(cert.pesel, "85040398765")
        self.assertEqual(cert.first_name, "Tomasz")
        self.assertEqual(cert.last_name, "Lewandowski")
        self.assertTrue(cert.is_entrepreneur)
        self.assertTrue(cert.has_overdue_contributions)
        self.assertEqual(cert.overdue_amount, 350.0)
        self.assertTrue(cert.overdue_blocks_benefits)
        self.assertEqual(cert.payment_status, "DEBT_BLOCKS_BENEFIT")
        self.assertEqual(
            cert.certificate_type, "ZAŚWIADCZENIE O STANIE ZALEGŁOŚCI W OPŁACANIU SKŁADEK"
        )
        self.assertEqual(cert.entitlement_date, "2026-05-01")
        self.assertIn("ZUS/RD-3", cert.certificate_id)
        self.assertEqual(len(cert.debt_items), 1)
        self.assertEqual(cert.debt_items[0].total_item_amount, 350.0)

    def test_anna_kowalska_debt_certificate_service(self) -> None:
        cert = get_citizen_debt_certificate_service("92011501234")
        self.assertEqual(cert.pesel, "92011501234")
        self.assertFalse(cert.is_entrepreneur)
        self.assertFalse(cert.has_overdue_contributions)
        self.assertEqual(cert.overdue_amount, 0.0)
        self.assertFalse(cert.overdue_blocks_benefits)
        self.assertEqual(cert.payment_status, "CLEARED")
        self.assertEqual(cert.certificate_type, "ZAŚWIADCZENIE O NIEZALEGANIU W OPŁACANIU SKŁADEK")
        self.assertEqual(len(cert.debt_items), 0)

    def test_api_endpoint_zus_debt_tomasz_lewandowski(self) -> None:
        res = self.client.get("/api/zus/debt/85040398765?entitlement_date=2026-05-01")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "85040398765")
        self.assertEqual(data["entitlement_date"], "2026-05-01")
        self.assertEqual(data["overdue_amount"], 350.0)
        self.assertTrue(data["overdue_blocks_benefits"])
        self.assertEqual(data["payment_status"], "DEBT_BLOCKS_BENEFIT")
        self.assertTrue(data["is_entrepreneur"])
        self.assertEqual(len(data["debt_items"]), 1)

    def test_api_endpoint_zus_debt_anna_kowalska(self) -> None:
        res = self.client.get("/api/zus/debt/92011501234")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "92011501234")
        self.assertEqual(data["overdue_amount"], 0.0)
        self.assertFalse(data["overdue_blocks_benefits"])
        self.assertEqual(data["payment_status"], "CLEARED")
        self.assertEqual(
            data["certificate_type"], "ZAŚWIADCZENIE O NIEZALEGANIU W OPŁACANIU SKŁADEK"
        )

    def test_api_endpoint_zus_debt_custom_pesel(self) -> None:
        res = self.client.get("/api/zus/debt/03251212345")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pesel"], "03251212345")
        self.assertEqual(data["payment_status"], "CLEARED")
        self.assertFalse(data["overdue_blocks_benefits"])

    # --- Testy dla mObywatel ---
    def test_api_endpoint_mock_mobywatel_identities(self) -> None:
        res = self.client.get("/api/mock/mobywatel/identities")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data), 6)

    def test_api_endpoint_mock_mobywatel_login(self) -> None:
        res = self.client.post("/api/mock/mobywatel/login", json={"pesel": "92011501234"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["pesel"], "92011501234")

    # --- Testy symulacji Rejestru Stanu Cywilnego (USC) ---
    def test_api_endpoint_mock_usc_birth_certificate_get(self) -> None:
        res = self.client.get("/api/mock/usc/birth-certificate")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "WYDANY_ELEKTRONICZNIE")
        self.assertEqual(data["certificate_type"], "Odpis skrócony aktu urodzenia")
        self.assertIn("USC", data["certificate_id"])
        self.assertEqual(
            data["official_portal_url"], "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego"
        )

    def test_api_endpoint_mock_usc_birth_certificate_post(self) -> None:
        payload = {
            "child_first_name": "Zofia",
            "child_last_name": "Kowalska",
            "child_date_of_birth": "2026-06-01",
            "child_place_of_birth": "Kraków",
            "child_gender": "Kobieta",
            "applicant_first_name": "Anna",
            "applicant_last_name": "Kowalska",
            "applicant_pesel": "92011501234",
            "applicant_role": "Matka",
            "certificate_type": "ZUPEŁNY",
        }
        res = self.client.post("/api/mock/usc/birth-certificate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["child_first_name"], "Zofia")
        self.assertEqual(data["child_last_name"], "Kowalska")
        self.assertEqual(data["certificate_type"], "Odpis zupełny aktu urodzenia")
        self.assertEqual(data["child_gender"], "Kobieta")
        self.assertEqual(data["child_place_of_birth"], "Kraków")
        self.assertEqual(len(data["child_pesel"]), 11)


if __name__ == "__main__":
    unittest.main()
