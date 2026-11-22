import io
import unittest

from pypdf import PdfReader

from ..api.api import app
from ..api.models.applications import (
    ApplicantData,
    ApplicationCategory,
    ApplicationCreateRequest,
    ApplicationPrefillRequest,
    ApplicationType,
    ChildData,
    EmployerData,
    LeavePeriodData,
    SubmissionRequest,
)
from ..api.services.applications import (
    _render_pdf_with_pure_python,
    create_application_service,
    generate_application_pdf_service,
    get_application_service,
    get_application_template_service,
    list_application_templates_service,
    prefill_application_service,
    render_application_pdf_from_request_service,
    submit_application_service,
)


class TestApplicationsModule(unittest.TestCase):
    def test_list_templates_and_category_filtering(self) -> None:
        all_templates = list_application_templates_service()
        self.assertEqual(len(all_templates), 11)

        employer_templates = list_application_templates_service(ApplicationCategory.EMPLOYER_LEAVE)
        self.assertEqual(len(employer_templates), 5)
        for t in employer_templates:
            self.assertEqual(t.category, ApplicationCategory.EMPLOYER_LEAVE)
            self.assertTrue(t.is_custom_designed)
            self.assertEqual(t.recipient_type, "EMPLOYER")

        zus_templates = list_application_templates_service(ApplicationCategory.ZUS_BENEFIT)
        self.assertEqual(len(zus_templates), 4)
        for t in zus_templates:
            self.assertEqual(t.category, ApplicationCategory.ZUS_BENEFIT)
            self.assertFalse(t.is_custom_designed)
            self.assertEqual(t.recipient_type, "ZUS")
            self.assertIsNotNone(t.official_form_number)

        usc_templates = list_application_templates_service(ApplicationCategory.USC_CIVIL_ACT)
        self.assertEqual(len(usc_templates), 2)
        for t in usc_templates:
            self.assertEqual(t.category, ApplicationCategory.USC_CIVIL_ACT)
            self.assertEqual(t.recipient_type, "USC")
            self.assertIn("USC-RSC-", t.official_form_number or "")

    def test_get_template_details(self) -> None:
        template = get_application_template_service(ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5)
        self.assertEqual(template.type, ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5)
        self.assertIn("179[1]", template.legal_basis)
        self.assertIn("21 dni", template.deadline_description)
        self.assertGreaterEqual(len(template.required_attachments), 2)

    def test_prefill_unified_maternity_parental_81_5(self) -> None:
        req = ApplicationPrefillRequest(
            application_type=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
            pesel_or_user_id="anna-kowalska",
            child_birth_date="2026-05-01",
            selected_variant="UNIFIED_81_5",
        )
        prefill = prefill_application_service(req)
        self.assertEqual(prefill.applicant.first_name, "Anna")
        self.assertEqual(prefill.applicant.last_name, "Kowalska")
        self.assertEqual(prefill.applicant.pesel, "92011501234")
        self.assertEqual(prefill.employer.company_name, "TechPol Sp. z o.o.")
        self.assertEqual(prefill.leave_period.weeks_count, 52)
        self.assertEqual(prefill.leave_period.days_count, 364)
        self.assertEqual(prefill.leave_period.start_date, "2026-05-01")
        self.assertEqual(prefill.leave_period.selected_rate_variant, "UNIFIED_81_5")
        self.assertTrue(any("21 dni" in note for note in prefill.advisory_notes))

    def test_prefill_paternity_leave(self) -> None:
        req = ApplicationPrefillRequest(
            application_type=ApplicationType.PATERNITY_LEAVE,
            pesel_or_user_id="anna-kowalska",
            child_birth_date="2026-05-01",
        )
        prefill = prefill_application_service(req)
        self.assertEqual(prefill.leave_period.weeks_count, 2)
        self.assertEqual(prefill.leave_period.days_count, 14)
        self.assertTrue(any("7 dni" in note for note in prefill.advisory_notes))

    def test_prefill_supplementary_maternity_leave_premature(self) -> None:
        req = ApplicationPrefillRequest(
            application_type=ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE,
            pesel_or_user_id="anna-kowalska",
            child_birth_date="2026-05-01",
        )
        prefill = prefill_application_service(req)
        self.assertEqual(prefill.child.gestational_age_weeks, 32)
        self.assertEqual(prefill.child.birth_weight_grams, 1750)
        self.assertEqual(prefill.child.hospital_stay_weeks, 6)
        self.assertEqual(prefill.leave_period.weeks_count, 6)
        self.assertTrue(any("hospitalizacji" in note for note in prefill.advisory_notes))

    def test_prefill_parental_work_combination(self) -> None:
        req = ApplicationPrefillRequest(
            application_type=ApplicationType.PARENTAL_WORK_COMBINATION,
            pesel_or_user_id="anna-kowalska",
            child_birth_date="2026-05-01",
        )
        prefill = prefill_application_service(req)
        self.assertEqual(prefill.leave_period.work_time_fraction, "1/2")
        self.assertEqual(prefill.leave_period.weeks_count, 8)
        self.assertTrue(any("1/2 etatu" in note for note in prefill.advisory_notes))

    def test_create_application_and_verify_formal_content(self) -> None:
        create_req = ApplicationCreateRequest(
            application_type=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
            applicant=ApplicantData(
                first_name="Anna",
                last_name="Kowalska",
                pesel="92011501234",
                address_street="ul. Marszałkowska 10/12",
                address_postal_code="00-001",
                address_city="Warszawa",
                phone_number="+48 601 234 567",
                email="anna.kowalska@example.com",
            ),
            employer=EmployerData(
                company_name="TechPol Sp. z o.o.",
                nip="5250001090",
                address_street="Al. Jerozolimskie 100",
                address_postal_code="02-001",
                address_city="Warszawa",
                payer_size="ABOVE_20",
            ),
            child=ChildData(
                first_name="Jan",
                last_name="Kowalski",
                date_of_birth="2026-05-01",
                birth_certificate_number="AU/2026/09812",
            ),
            leave_period=LeavePeriodData(
                start_date="2026-05-01",
                end_date="2027-04-29",
                weeks_count=52,
                days_count=364,
                selected_rate_variant="UNIFIED_81_5",
                other_parent_name="Piotr Kowalski",
                other_parent_pesel="89032005678",
                other_parent_declaration_attached=True,
            ),
            place_of_signing="Warszawa",
            signing_date="2026-05-02",
            attachments_provided=["BIRTH_CERTIFICATE", "OTHER_PARENT_DECLARATION"],
        )

        app_obj = create_application_service(create_req)
        self.assertTrue(app_obj.id.startswith("APP-"))
        self.assertEqual(app_obj.status, "DRAFT")
        self.assertIn("TechPol Sp. z o.o.", app_obj.recipient_header)

        text = app_obj.formal_content_text
        self.assertIn("Anna Kowalska", text)
        self.assertIn("92011501234", text)
        self.assertIn("TechPol Sp. z o.o.", text)
        self.assertIn("Art. 179[1] Kodeksu pracy", text)
        self.assertIn("52 tygodni", text)
        self.assertIn("81,5%", text)
        self.assertIn("AU/2026/09812", text)
        self.assertIn("Piotr Kowalski", text)
        self.assertIn("podpis pracownika", text)

        fetched = get_application_service(app_obj.id)
        self.assertEqual(fetched.id, app_obj.id)

    def test_pdf_generation_validity(self) -> None:
        create_req = ApplicationCreateRequest(
            application_type=ApplicationType.PATERNITY_LEAVE,
            applicant=ApplicantData(
                first_name="Piotr",
                last_name="Kowalski",
                pesel="89032005678",
                address_street="ul. Marszałkowska 10/12",
                address_postal_code="00-001",
                address_city="Warszawa",
            ),
            employer=EmployerData(
                company_name="TechPol Sp. z o.o.",
                nip="5250001090",
            ),
            child=ChildData(
                first_name="Jan",
                last_name="Kowalski",
                date_of_birth="2026-05-01",
            ),
            leave_period=LeavePeriodData(
                start_date="2026-05-15",
                end_date="2026-05-28",
                weeks_count=2,
                days_count=14,
            ),
        )
        app_obj = create_application_service(create_req)
        pdf_bytes = generate_application_pdf_service(app_obj.id)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))

        reader = PdfReader(io.BytesIO(pdf_bytes))
        self.assertEqual(len(reader.pages), 1)
        extracted = reader.pages[0].extract_text()
        self.assertTrue("WNIOSEK" in extracted or "Wniosek" in extracted)
        self.assertTrue("OJCOWSK" in extracted or "ojcowsk" in extracted)

    def test_pure_python_pdf_fallback(self) -> None:
        app_obj = get_application_service("APP-2026-0001")
        fallback_bytes = _render_pdf_with_pure_python(app_obj)
        self.assertTrue(fallback_bytes.startswith(b"%PDF-1.4"))
        reader = PdfReader(io.BytesIO(fallback_bytes))
        self.assertEqual(len(reader.pages), 1)
        extracted = reader.pages[0].extract_text()
        self.assertIn("WNIOSEK", extracted)

    def test_all_applications_generate_strictly_single_page_pdf(self) -> None:
        for app_id in [
            "APP-2026-0001",
            "APP-2026-0002",
            "APP-2026-0003",
            "APP-2026-0004",
            "APP-2026-0005",
            "APP-2026-0006",
        ]:
            app_obj = get_application_service(app_id)
            self.assertEqual(app_obj.id, app_id)
            pdf_bytes = generate_application_pdf_service(app_id)
            self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
            reader = PdfReader(io.BytesIO(pdf_bytes))
            self.assertEqual(len(reader.pages), 1)
            text_extracted = reader.pages[0].extract_text()
            self.assertIn("RZECZPOSPOLITA POLSKA", text_extracted)
            self.assertTrue(any(c in text_extracted for c in "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"))

            py_bytes = _render_pdf_with_pure_python(app_obj)
            py_reader = PdfReader(io.BytesIO(py_bytes))
            self.assertEqual(len(py_reader.pages), 1)
            py_extracted = py_reader.pages[0].extract_text()
            self.assertIn("RZECZPOSPOLITA POLSKA", py_extracted)
            self.assertTrue(any(c in py_extracted for c in "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"))

    def test_direct_render_pdf_from_request(self) -> None:
        req = ApplicationCreateRequest(
            application_type=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
            applicant=ApplicantData(
                first_name="Anna",
                last_name="Kowalska",
                pesel="92011501234",
            ),
            employer=EmployerData(company_name="TechPol Sp. z o.o.", nip="5250001090"),
            child=ChildData(first_name="Jan", date_of_birth="2026-05-01"),
            leave_period=LeavePeriodData(
                start_date="2026-05-01",
                end_date="2027-04-29",
                weeks_count=52,
                days_count=364,
            ),
        )
        pdf_bytes = render_application_pdf_from_request_service(req)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        reader = PdfReader(io.BytesIO(pdf_bytes))
        self.assertGreaterEqual(len(reader.pages), 1)

    def test_submission_to_employer(self) -> None:
        create_req = ApplicationCreateRequest(
            application_type=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
            applicant=ApplicantData(
                first_name="Anna",
                last_name="Kowalska",
                pesel="92011501234",
            ),
            employer=EmployerData(
                company_name="TechPol Sp. z o.o.",
                payer_size="ABOVE_20",
            ),
            leave_period=LeavePeriodData(
                start_date="2026-05-01",
                end_date="2027-04-29",
                weeks_count=52,
                days_count=364,
            ),
        )
        app_obj = create_application_service(create_req)
        sub_req = SubmissionRequest(
            delivery_channel="ELECTRONIC",
            recipient_email="kadry@techpol.pl",
        )
        confirm = submit_application_service(app_obj.id, sub_req)

        self.assertEqual(confirm.status, "SUBMITTED_TO_EMPLOYER")
        self.assertTrue(confirm.case_number.startswith("KADR/"))
        self.assertTrue(confirm.upo_reference_code.startswith("UPO-KADR-"))
        self.assertEqual(confirm.recipient_name, "TechPol Sp. z o.o.")
        self.assertTrue(any("Dział Kadr" in step for step in confirm.next_steps))

        updated_app = get_application_service(app_obj.id)
        self.assertEqual(updated_app.status, "SUBMITTED_TO_EMPLOYER")
        self.assertIsNotNone(updated_app.submission_confirmation)

    def test_submission_to_zus(self) -> None:
        create_req = ApplicationCreateRequest(
            application_type=ApplicationType.ZUS_ZAM,
            applicant=ApplicantData(
                first_name="Karolina",
                last_name="Nowak",
                pesel="95051012345",
            ),
            employer=EmployerData(
                company_name="Sklepik ABC",
                payer_size="UP_TO_20",
            ),
            leave_period=LeavePeriodData(
                start_date="2026-06-01",
                end_date="2026-10-18",
                weeks_count=20,
                days_count=140,
                selected_rate_variant="STANDARD_100_70",
            ),
            bank_account_number="12102010260000123456789012",
        )
        app_obj = create_application_service(create_req)
        sub_req = SubmissionRequest(
            delivery_channel="PUE_EZUS",
        )
        confirm = submit_application_service(app_obj.id, sub_req)

        self.assertEqual(confirm.status, "SUBMITTED_TO_ZUS")
        self.assertTrue(confirm.case_number.startswith("ZUS-PUE-"))
        self.assertTrue(confirm.upo_reference_code.startswith("UPPO-ZUS-"))
        self.assertIn("Zakład Ubezpieczeń Społecznych", confirm.recipient_name)
        self.assertTrue(
            any("Elektroniczną Skrzynkę Podawczą" in step for step in confirm.next_steps)
        )

        updated_app = get_application_service(app_obj.id)
        self.assertEqual(updated_app.status, "SUBMITTED_TO_ZUS")

    def test_prefill_usc_birth_certificate_short(self) -> None:
        req = ApplicationPrefillRequest(
            application_type=ApplicationType.USC_BIRTH_CERTIFICATE_SHORT,
            pesel_or_user_id="anna-kowalska",
            child_birth_date="2026-05-15",
        )
        prefill = prefill_application_service(req)
        self.assertEqual(prefill.leave_period.weeks_count, 0)
        self.assertEqual(prefill.leave_period.days_count, 0)
        self.assertEqual(prefill.leave_period.selected_rate_variant, "USC_EXEMPT_0_PLN")
        self.assertTrue(any("0 zł" in note for note in prefill.advisory_notes))
        self.assertTrue(any("Rejestru Stanu Cywilnego" in note for note in prefill.advisory_notes))

    def test_submission_to_usc(self) -> None:
        create_req = ApplicationCreateRequest(
            application_type=ApplicationType.USC_BIRTH_CERTIFICATE_SHORT,
            applicant=ApplicantData(
                first_name="Anna",
                last_name="Kowalska",
                pesel="92011501234",
            ),
            child=ChildData(
                first_name="Jan",
                last_name="Kowalski",
                date_of_birth="2026-05-15",
                birth_certificate_number="AU/2026/09812",
                usc_city="USC Warszawa-Śródmieście",
            ),
            leave_period=LeavePeriodData(
                start_date="2026-05-15",
                end_date="2026-05-15",
                weeks_count=0,
                days_count=0,
            ),
        )
        app_obj = create_application_service(create_req)
        sub_req = SubmissionRequest(
            delivery_channel="PORTAL_GOV_PL_EPUAP",
            destination="USC",
        )
        confirm = submit_application_service(app_obj.id, sub_req)

        self.assertEqual(confirm.status, "SUBMITTED_TO_USC")
        self.assertTrue(confirm.case_number.startswith("USC.5353.AU."))
        self.assertTrue(confirm.upo_reference_code.startswith("UPO-EPUAP-RSC-"))
        self.assertIn("Rejestr Stanu Cywilnego", confirm.recipient_name)
        self.assertTrue(any("pieczęcią cyfrową" in step for step in confirm.next_steps))

        updated_app = get_application_service(app_obj.id)
        self.assertEqual(updated_app.status, "SUBMITTED_TO_USC")

        # Verify PDF generates exactly 1 page
        pdf_bytes = generate_application_pdf_service(app_obj.id)
        reader = PdfReader(io.BytesIO(pdf_bytes))
        self.assertEqual(len(reader.pages), 1)

    def test_router_integration_via_app(self) -> None:
        router = app.applications_router
        templates = router.list_templates()
        self.assertGreaterEqual(len(templates), 9)

        prefill_resp = router.prefill_application(
            ApplicationPrefillRequest(
                application_type=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
                pesel_or_user_id="anna-kowalska",
            )
        )
        self.assertEqual(prefill_resp.applicant.first_name, "Anna")

        create_req = ApplicationCreateRequest(
            application_type=ApplicationType.PATERNITY_LEAVE,
            applicant=prefill_resp.applicant,
            employer=prefill_resp.employer,
            child=prefill_resp.child,
            leave_period=prefill_resp.leave_period,
        )
        app_created = router.create_application(create_req)
        self.assertTrue(app_created.id.startswith("APP-"))

        pdf_resp = router.download_application_pdf(app_created.id)
        self.assertEqual(pdf_resp.media_type, "application/pdf")
        self.assertTrue(bytes(pdf_resp.body).startswith(b"%PDF-"))

        # Test download=True gives attachment header
        pdf_download_resp = router.download_application_pdf(app_created.id, download=True)
        self.assertIn("attachment", pdf_download_resp.headers.get("Content-Disposition", ""))

        # Test render_application_pdf_direct
        direct_resp = router.render_application_pdf_direct(create_req)
        self.assertEqual(direct_resp.media_type, "application/pdf")
        self.assertTrue(bytes(direct_resp.body).startswith(b"%PDF-"))

        confirm = router.submit_application(
            app_created.id, SubmissionRequest(delivery_channel="ELECTRONIC")
        )
        self.assertEqual(confirm.status, "SUBMITTED_TO_EMPLOYER")


if __name__ == "__main__":
    unittest.main()
