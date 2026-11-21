import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

# Bootstrap sys.path to enable direct script execution from any directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from src.api.API import app  # noqa: E402
from src.api.models.adoption import (  # noqa: E402
    AdoptionLeaveInput,
    CaregiverType,
)
from src.api.models.calculator import (  # noqa: E402
    IntegratedCalculatorInput,
    IntegratedParentalSharing,
    IntegratedWorkCombination,
)
from src.api.models.maternity import (  # noqa: E402
    BenefitPaymentVariant,
    MaternityEmploymentType,
)
from src.api.models.parental_work import ParentalWorkInput  # noqa: E402
from src.api.models.paternity import (  # noqa: E402
    MaternityTransferInput,
    MaternityTransferReason,
    ParentalSharingInput,
    PaternityLeaveInput,
    PaternityLeavePart,
    SharingMode,
)
from src.api.models.special_cases import (  # noqa: E402
    SpecialCasesInput,
    SpecialCaseType,
)
from src.api.services.adoption import calculate_adoption_leave  # noqa: E402
from src.api.services.calculator import (  # noqa: E402
    calculate_integrated_parental_service,
    get_preset_by_key_service,
    get_presets_service,
)
from src.api.services.parental_work import calculate_parental_work_combination  # noqa: E402
from src.api.services.paternity import (  # noqa: E402
    calculate_maternity_transfer,
    calculate_parental_sharing,
    calculate_paternity_leave,
)
from src.api.services.special_cases import calculate_special_cases  # noqa: E402


class TestBE13ThroughBE21(unittest.TestCase):
    """Test suite covering requirements of BE-13 through BE-21."""

    def setUp(self):
        self.client = TestClient(app)

    # --- BE-13: Zaświadczenie "Za życiem" ---
    def test_be13_za_zyciem_single_and_multiple(self):
        # 1 dziecko: 20 macierzyński + 65 rodzicielski = 85 tyg., 4000 zł jednorazowo
        single_input = SpecialCasesInput(
            case_type=SpecialCaseType.ZA_ZYCIEM,
            gross_monthly_income=10000.0,
            children_born_count=1,
            has_za_zyciem_certificate=True,
        )
        res_single = calculate_special_cases(single_input)
        self.assertTrue(res_single.is_eligible)
        self.assertEqual(res_single.base_maternity_weeks, 20)
        self.assertEqual(res_single.parental_weeks, 65)
        self.assertEqual(res_single.total_leave_weeks, 85)
        self.assertEqual(res_single.non_transferable_parental_weeks, 9)
        self.assertEqual(res_single.one_time_grant_pln, 4000.0)

        # Bliźnięta: 31 macierzyński + 67 rodzicielski = 98 tyg.
        twins_input = SpecialCasesInput(
            case_type=SpecialCaseType.ZA_ZYCIEM,
            gross_monthly_income=10000.0,
            children_born_count=2,
            has_za_zyciem_certificate=True,
        )
        res_twins = calculate_special_cases(twins_input)
        self.assertEqual(res_twins.base_maternity_weeks, 31)
        self.assertEqual(res_twins.parental_weeks, 67)
        self.assertEqual(res_twins.total_leave_weeks, 98)

    # --- BE-14: Wcześniak / Hospitalizacja ---
    def test_be14_premature_hospitalization(self):
        # Skrajny wcześniak: 26. tc, waga 950g, 12 tyg. w szpitalu -> max 15 tyg. uzupełniającego
        premature_input = SpecialCasesInput(
            case_type=SpecialCaseType.PREMATURE_HOSPITALIZATION,
            gross_monthly_income=8000.0,
            child_birth_week=26,
            birth_weight_grams=950,
            hospitalization_weeks=12,
        )
        res_premature = calculate_special_cases(premature_input)
        self.assertTrue(res_premature.is_eligible)
        self.assertEqual(res_premature.base_maternity_weeks, 20)
        self.assertEqual(res_premature.supplementary_maternity_weeks, 12)
        self.assertEqual(res_premature.total_maternity_weeks, 32)
        self.assertTrue(res_premature.can_interrupt_maternity_for_hospitalization)

        # Umiarkowany wcześniak: 32. tc, waga 1800g, 10 tyg. w szpitalu -> cap at 8 tyg.
        mod_input = SpecialCasesInput(
            case_type=SpecialCaseType.PREMATURE_HOSPITALIZATION,
            gross_monthly_income=8000.0,
            child_birth_week=32,
            birth_weight_grams=1800,
            hospitalization_weeks=10,
        )
        res_mod = calculate_special_cases(mod_input)
        self.assertEqual(res_mod.supplementary_maternity_weeks, 8)
        self.assertEqual(res_mod.total_maternity_weeks, 28)

    # --- BE-15: Urodzenie martwego dziecka lub zgon ---
    def test_be15_stillbirth_or_death(self):
        # Urodzenie martwe: 8 tygodni macierzyńskiego (56 dni), 0 rodzicielskiego, zasiłek 4000 zł
        stillbirth_input = SpecialCasesInput(
            case_type=SpecialCaseType.STILLBIRTH_OR_DEATH,
            gross_monthly_income=8000.0,
            is_stillbirth=True,
        )
        res_still = calculate_special_cases(stillbirth_input)
        self.assertTrue(res_still.is_eligible)
        self.assertEqual(res_still.total_maternity_weeks, 8)
        self.assertEqual(res_still.parental_weeks, 0)
        self.assertEqual(res_still.one_time_grant_pln, 4000.0)

        # Zgon dziecka po upływie 8 tygodni (np. 70. dzień życia) -> 7 dni (1 tydzień) od zgonu
        death_later_input = SpecialCasesInput(
            case_type=SpecialCaseType.STILLBIRTH_OR_DEATH,
            gross_monthly_income=8000.0,
            child_death_after_birth=True,
            child_age_days_at_death=70,
        )
        res_later = calculate_special_cases(death_later_input)
        self.assertEqual(res_later.total_maternity_weeks, 1)

    # --- BE-16: Urlop ojcowski (14 dni, 1-2 części, limit 12 mies. / adopcja 14 lat) ---
    def test_be16_paternity_leave(self):
        # Poprawny: 2 części po 7 dni, dziecko 2 miesiące
        paternity_input = PaternityLeaveInput(
            gross_monthly_income=9000.0,
            employment_type=MaternityEmploymentType.EMPLOYMENT_CONTRACT,
            is_insured=True,
            child_age_months=2,
            is_adopted=False,
            parts=[
                PaternityLeavePart(part_number=1, days=7),
                PaternityLeavePart(part_number=2, days=7),
            ],
        )
        res_paternity = calculate_paternity_leave(paternity_input)
        self.assertTrue(res_paternity.is_eligible)
        self.assertEqual(res_paternity.total_days, 14)
        self.assertGreater(res_paternity.total_benefit_amount, 0.0)

        # Przekroczenie limitu wieku (15 miesięcy dla dziecka biologicznego)
        paternity_expired = PaternityLeaveInput(
            gross_monthly_income=9000.0,
            is_insured=True,
            child_age_months=15,
            is_adopted=False,
            parts=[PaternityLeavePart(part_number=1, days=14)],
        )
        res_expired = calculate_paternity_leave(paternity_expired)
        self.assertFalse(res_expired.is_eligible)
        self.assertTrue(any("12 m-cy" in r for r in res_expired.refusal_reasons))

    # --- BE-17: Przejęcie macierzyńskiego przez ojca ---
    def test_be17_maternity_transfer(self):
        # Standard: matka wykorzystała 14 tyg., ojciec przejmuje 6 tyg. (przy 1 dziecku)
        transfer_standard = MaternityTransferInput(
            children_born_count=1,
            mother_used_weeks=14,
            transfer_reason=MaternityTransferReason.STANDARD_AFTER_14_WEEKS,
            father_gross_monthly_income=9000.0,
            is_father_insured=True,
        )
        res_trans = calculate_maternity_transfer(transfer_standard)
        self.assertTrue(res_trans.is_eligible)
        self.assertEqual(res_trans.father_transferred_weeks, 6)
        self.assertGreater(res_trans.father_total_benefit_amount, 0.0)

        # Próba przejęcia standardowego, gdy matka wykorzystała tylko 10 tyg. -> odmowa
        transfer_too_early = MaternityTransferInput(
            children_born_count=1,
            mother_used_weeks=10,
            transfer_reason=MaternityTransferReason.STANDARD_AFTER_14_WEEKS,
            father_gross_monthly_income=9000.0,
            is_father_insured=True,
        )
        res_early = calculate_maternity_transfer(transfer_too_early)
        self.assertFalse(res_early.is_eligible)

        # Sytuacja szczególna (hospitalizacja matki) po 8 tygodniach -> ojciec przejmuje 12 tyg.
        transfer_hosp = MaternityTransferInput(
            children_born_count=1,
            mother_used_weeks=8,
            transfer_reason=MaternityTransferReason.MOTHER_HOSPITALIZATION,
            father_gross_monthly_income=9000.0,
            is_father_insured=True,
        )
        res_hosp = calculate_maternity_transfer(transfer_hosp)
        self.assertTrue(res_hosp.is_eligible)
        self.assertEqual(res_hosp.father_transferred_weeks, 12)

    # --- BE-18: Symulacja podziału opieki między rodziców ---
    def test_be18_parental_sharing(self):
        # 1 dziecko (41 tyg. rodzicielskiego: matka 32 tyg., ojciec 9 tyg. nieprzenoszalne)
        sharing_valid = ParentalSharingInput(
            sharing_mode=SharingMode.SEQUENTIAL,
            children_born_count=1,
            mother_gross_income=8000.0,
            mother_maternity_weeks=20,
            mother_parental_weeks=32,
            father_gross_income=9000.0,
            father_maternity_weeks=0,
            father_parental_weeks=9,
        )
        res_sharing = calculate_parental_sharing(sharing_valid)
        self.assertTrue(res_sharing.non_transferable_respected)
        self.assertEqual(res_sharing.combined_total_weeks, 61)
        self.assertGreater(res_sharing.total_family_benefit_amount, 0.0)

        # Matka próbuje wziąć 35 tygodni rodzicielskiego -> naruszenie 9 tyg. ojca
        sharing_invalid = ParentalSharingInput(
            sharing_mode=SharingMode.SEQUENTIAL,
            children_born_count=1,
            mother_gross_income=8000.0,
            mother_parental_weeks=35,
            father_gross_income=9000.0,
            father_parental_weeks=6,
        )
        res_invalid = calculate_parental_sharing(sharing_invalid)
        self.assertFalse(res_invalid.non_transferable_respected)

    # --- BE-19: Łączenie urlopu rodzicielskiego z pracą ---
    def test_be19_parental_work_combination(self):
        # 32 tyg. na 1/2 etatu z pracą w wydłużonym okresie: W = 32 / (1 - 0.5) = 64 tyg.
        work_input = ParentalWorkInput(
            gross_monthly_income=8000.0,
            work_fraction=0.5,
            parental_weeks_to_combine=32,
            work_during_extended_period=True,
            children_born_count=1,
            benefit_rate_percentage=70.0,
        )
        res_work = calculate_parental_work_combination(work_input)
        self.assertTrue(res_work.is_eligible)
        self.assertEqual(res_work.total_parental_weeks_with_extension, 64)
        self.assertEqual(res_work.extension_weeks, 32)
        # Benefit jest zredukowany o 50%, ale dodatkowo jest pensja 1/2 etatu
        self.assertGreater(
            res_work.combined_monthly_income,
            res_work.standard_monthly_benefit_without_work,
        )
        self.assertGreater(res_work.financial_gain_compared_to_pure_leave, 0.0)

        # Przekroczenie limitu 1/2 etatu (np. 0.75 etatu) -> odmowa
        over_work = ParentalWorkInput(
            gross_monthly_income=8000.0,
            work_fraction=0.75,
            parental_weeks_to_combine=32,
        )
        res_over = calculate_parental_work_combination(over_work)
        self.assertFalse(res_over.is_eligible)

    # --- BE-20: Adopcja i rodzina zastępcza niezawodowa ---
    def test_be20_adoption_leave(self):
        # Adopcja 3-letniego dziecka: 20 tyg. macierzyńskiego na warunkach, 41 rodzicielskiego
        adopt_input = AdoptionLeaveInput(
            gross_monthly_income=8000.0,
            is_insured=True,
            caregiver_type=CaregiverType.ADOPTION,
            children_adopted_count=1,
            child_age_years=3,
        )
        res_adopt = calculate_adoption_leave(adopt_input)
        self.assertTrue(res_adopt.is_eligible)
        self.assertEqual(res_adopt.maternity_condition_weeks, 20)
        self.assertEqual(res_adopt.parental_weeks_available, 41)
        self.assertEqual(res_adopt.child_age_limit_parental_years, 14)

        # Dziecko tuż przed ukończeniem 7 lat (6 lat i 11 m-cy) -> gwarantowane min. 9 tyg.
        older_child = AdoptionLeaveInput(
            gross_monthly_income=8000.0,
            is_insured=True,
            caregiver_type=CaregiverType.ADOPTION,
            children_adopted_count=1,
            child_age_years=6,
            child_age_months=11,
            has_deferred_school_obligation=False,
        )
        res_older = calculate_adoption_leave(older_child)
        self.assertTrue(res_older.is_eligible)
        self.assertEqual(res_older.maternity_condition_weeks, 9)
        self.assertTrue(res_older.is_minimum_guaranteed_weeks_applied)

        # Rodzina zastępcza zawodowa nie ma prawa do tego urlopu
        foster_pro = AdoptionLeaveInput(
            gross_monthly_income=8000.0,
            is_insured=True,
            caregiver_type=CaregiverType.FOSTER_FAMILY_PROFESSIONAL,
            children_adopted_count=1,
            child_age_years=3,
        )
        res_foster = calculate_adoption_leave(foster_pro)
        self.assertFalse(res_foster.is_eligible)

    # --- BE-21: Zintegrowany kalkulator rodzicielski + Oś czasu + Presety ---
    def test_be21_integrated_calculator_and_timeline(self):
        birth_d = date(2026, 6, 1)
        integrated_input = IntegratedCalculatorInput(
            child_birth_date=birth_d,
            mother_gross_monthly_income=8000.0,
            is_mother_insured=True,
            father_gross_monthly_income=9000.0,
            is_father_insured=True,
            children_count=1,
            chosen_variant=BenefitPaymentVariant.UNIFIED_81_5,
            applied_within_21_days=True,
            include_paternity_leave=True,
            include_pregnancy_sick_leave=True,
            pregnancy_sick_leave_days=30,
            work_combination=IntegratedWorkCombination(
                enabled=True,
                parent_working="mother",
                work_fraction=0.5,
                weeks_to_combine=32,
                work_during_extended_period=True,
            ),
            parental_sharing=IntegratedParentalSharing(
                enabled=True,
                mode="SEQUENTIAL",
                mother_weeks=32,
                father_weeks=9,
            ),
        )
        res = calculate_integrated_parental_service(integrated_input)
        self.assertTrue(res.is_eligible)
        self.assertEqual(res.child_birth_date, birth_d)
        self.assertEqual(res.timeline_start_date, birth_d - timedelta(days=30))
        self.assertGreater(res.total_leave_weeks, 60)
        self.assertGreater(res.total_family_combined_income, 0.0)

        # Sprawdzenie osi czasu (etapy)
        period_ids = [p.id for p in res.timeline_periods]
        self.assertIn("p0_pregnancy_sick", period_ids)
        self.assertIn("p1_maternity_leave", period_ids)
        self.assertIn("p2_parental_mother_work", period_ids)
        self.assertIn("p3_parental_father", period_ids)
        self.assertIn("p4_paternity_leave", period_ids)

        # Sprawdzenie kamieni milowych (terminy)
        self.assertGreaterEqual(len(res.milestones), 5)
        # Sprawdzenie miesięcznego cashflow
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
        self.assertEqual(single_p.tab, "macierzynski")

    # --- HTTP API & Walidacja błędów (TestClient) ---
    def test_http_api_endpoints_and_error_handling(self):
        # 1. Sprawdzenie GET /api/calculators/presets
        resp_presets = self.client.get("/api/calculators/presets")
        self.assertEqual(resp_presets.status_code, 200)

        # 2. Błąd 404: Zapytanie o nieistniejący preset
        resp_404 = self.client.get("/api/calculators/presets/nieistniejacy_klucz")
        self.assertEqual(resp_404.status_code, 404)
        self.assertIn("nie został znaleziony", resp_404.json()["detail"])

        # 3. Błąd 422: Nieprawidłowy payload (np. brak wymaganych pól do kalkulatora)
        resp_422 = self.client.post("/api/calculator/parental", json={"niepoprawne_pole": 123})
        self.assertEqual(resp_422.status_code, 422)

        # 4. Sprawdzenie poprawnego wywołania POST /api/calculator/parental
        preset_int = get_preset_by_key_service("integrated_full")
        self.assertIsNotNone(preset_int)
        resp_calc = self.client.post("/api/calculator/parental", json=preset_int.default_payload)
        self.assertEqual(resp_calc.status_code, 200)
        self.assertTrue(resp_calc.json()["is_eligible"])


if __name__ == "__main__":
    unittest.main()
