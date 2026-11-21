import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from ..api.models.pdf import DocumentType, InsuranceStatusBadge
from ..api.services.ocr import (
    get_gemini_api_key,
    is_gemini_ocr_available,
    ocr_pdf_with_gemini,
)
from ..api.services.pdf import (
    _assess_eligibility,
    _classify_document,
    _extract_claim_data,
    _extract_insurance_data,
    _extract_payer_data,
    _extract_person_data,
    _validate_nip,
    _validate_pesel,
    parse_and_validate_pdf,
)


def _build_pdf_stream(lines: list[str]) -> bytes:
    stream_content = "BT\n/F1 12 Tf\n50 750 Td\n"
    for i, line in enumerate(lines):
        if i > 0:
            stream_content += f"0 -25 Td\n({line}) Tj\n"
        else:
            stream_content += f"({line}) Tj\n"
    stream_content += "ET\n"
    stream_bytes = stream_content.encode("latin1")

    header = b"%PDF-1.4\n"
    obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    obj3 = (
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    )
    obj4 = (
        f"4 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode()
        + stream_bytes
        + b"\nendstream\nendobj\n"
    )
    obj5 = b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"

    offsets = [0]
    curr = len(header)
    for obj in [obj1, obj2, obj3, obj4, obj5]:
        offsets.append(curr)
        curr += len(obj)

    xref = "xref\n0 6\n0000000000 65535 f \n"
    for off in offsets[1:]:
        xref += f"{off:010d} 00000 n \n"
    trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{curr}\n%%EOF\n"

    return header + obj1 + obj2 + obj3 + obj4 + obj5 + xref.encode() + trailer.encode()


class TestPdfService(unittest.TestCase):
    def test_validate_pesel_valid_female(self) -> None:
        is_valid, b_date, gender = _validate_pesel("92051412309")
        self.assertTrue(is_valid)
        self.assertEqual(b_date, "1992-05-14")
        self.assertEqual(gender, "FEMALE")

    def test_validate_pesel_valid_male(self) -> None:
        is_valid, b_date, gender = _validate_pesel("88112045618")
        self.assertTrue(is_valid)
        self.assertEqual(b_date, "1988-11-20")
        self.assertEqual(gender, "MALE")

    def test_validate_pesel_century_2000_leap_year(self) -> None:
        is_valid, b_date, gender = _validate_pesel("24222978905")
        self.assertTrue(is_valid)
        self.assertEqual(b_date, "2024-02-29")
        self.assertEqual(gender, "FEMALE")

    def test_validate_pesel_invalid(self) -> None:
        is_valid, b_date, gender = _validate_pesel("92051412300")
        self.assertFalse(is_valid)
        self.assertIsNone(b_date)
        self.assertIsNone(gender)

    def test_validate_nip(self) -> None:
        self.assertTrue(_validate_nip("5260250995"))
        self.assertTrue(_validate_nip("526-025-09-95"))
        self.assertFalse(_validate_nip("5260250991"))
        self.assertFalse(_validate_nip("123"))

    def test_document_classification(self) -> None:
        t_z3, _ = _classify_document("ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3 DLA PRACOWNIKA")
        self.assertEqual(t_z3, DocumentType.Z3)

        t_z3a, _ = _classify_document("ZAŚWIADCZENIE PŁATNIKA SKŁADEK DLA ZLECENIOBIORCY Z-3A")
        self.assertEqual(t_z3a, DocumentType.Z3A)

        t_zam, _ = _classify_document("WNIOSEK O ZASIŁEK MACIERZYŃSKI ZAM")
        self.assertEqual(t_zam, DocumentType.ZAM)

        t_zas53, _ = _classify_document("WNIOSEK ZAS-53 DZIAŁALNOŚCI POZAROLNICZEJ")
        self.assertEqual(t_zas53, DocumentType.ZAS53)

        t_ezla, _ = _classify_document("ZAŚWIADCZENIE LEKARSKIE E-ZLA")
        self.assertEqual(t_ezla, DocumentType.EZLA)

        t_usc, _ = _classify_document("ODPIS SKRÓCONY AKT URODZENIA URZĄD STANU CYWILNEGO")
        self.assertEqual(t_usc, DocumentType.USC_BIRTH_RECORD)

        t_ins, _ = _classify_document("POŚWIADCZENIE UBEZPIECZENIA US-7 ZUS")
        self.assertEqual(t_ins, DocumentType.INSURANCE_CERTIFICATE)

        t_other, _ = _classify_document("ZWYKŁY DOKUMENT PISMO PRZEWODNIE")
        self.assertEqual(t_other, DocumentType.OTHER)

    def test_extract_person_data(self) -> None:
        text = "Ubezpieczony: Jan Kowalski PESEL: 88112045618"
        person = _extract_person_data(text)
        self.assertEqual(person.first_name, "Jan")
        self.assertEqual(person.last_name, "Kowalski")
        self.assertEqual(person.pesel, "88112045618")
        self.assertTrue(person.is_pesel_valid)
        self.assertEqual(person.gender, "MALE")

    def test_extract_payer_data(self) -> None:
        text = (
            "Płatnik składek: ABC Software Sp. z o.o. "
            "NIP: 526-025-09-95 REGON: 123456789 "
            "Liczba ubezpieczonych powyżej 20 osób"
        )
        payer = _extract_payer_data(text)
        self.assertEqual(payer.nip, "5260250995")
        self.assertTrue(payer.is_nip_valid)
        self.assertEqual(payer.regon, "123456789")
        self.assertEqual(payer.payer_size, "ABOVE_20")

    def test_extract_insurance_data(self) -> None:
        text = (
            "Zatrudnienie na podstawie: UMOWA O PRACĘ kod 01 10. "
            "Okres ubezpieczenia: 2023-01-01 do 2026-12-31. "
            "Staż ubezpieczenia: 360 dni. "
            "Przychód miesięczny: 8 500,00 zł. "
            "Zadłużenie: 0,00 zł."
        )
        ins = _extract_insurance_data(text, DocumentType.Z3)
        self.assertEqual(ins.employment_type, "EMPLOYMENT_CONTRACT")
        self.assertEqual(ins.insurance_title_code, "0110")
        self.assertTrue(ins.is_currently_insured)
        self.assertEqual(ins.gross_monthly_income, 8500.0)
        self.assertFalse(ins.has_overdue_debt)

    def test_extract_claim_data(self) -> None:
        text = (
            "Wniosek o zasiłek macierzyński, poród: 2026-04-15. "
            "Urodziły się bliźnięta. Posiada zaświadczenie Za Życiem. "
            "Zwolnienie lekarskie na okres od 2026-01-01 do 2026-01-31."
        )
        claim = _extract_claim_data(text, DocumentType.ZAM)
        self.assertEqual(claim.children_count, 2)
        self.assertTrue(claim.has_za_zyciem_certificate)
        self.assertEqual(claim.child_birth_date, "2026-04-15")
        self.assertEqual(claim.sick_leave_start_date, "2026-01-01")
        self.assertEqual(claim.sick_leave_end_date, "2026-01-31")

    def test_eligibility_waiting_period_sickness_vs_maternity(self) -> None:
        person = _extract_person_data("Ubezpieczona: Anna Nowak PESEL: 92051412309")
        payer = _extract_payer_data("Płatnik: Test Sp. z o.o. NIP: 5260250995")
        ins = _extract_insurance_data("UMOWA O PRACĘ 8000 zł staż 15 dni", DocumentType.Z3)
        ins.insurance_duration_days = 15

        claim_sick = _extract_claim_data("Zwolnienie lekarskie e-ZLA 30 dni", DocumentType.EZLA)
        sick_eval = _assess_eligibility(DocumentType.EZLA, person, payer, ins, claim_sick)
        self.assertFalse(sick_eval.is_eligible)
        self.assertEqual(sick_eval.status_badge, InsuranceStatusBadge.NOT_ELIGIBLE_WAITING_PERIOD)

        claim_mat = _extract_claim_data("Wniosek o zasiłek macierzyński ZAM", DocumentType.ZAM)
        mat_eval = _assess_eligibility(DocumentType.ZAM, person, payer, ins, claim_mat)
        self.assertTrue(mat_eval.is_eligible)
        self.assertEqual(mat_eval.status_badge, InsuranceStatusBadge.ELIGIBLE)

    def test_eligibility_debt_over_limit(self) -> None:
        person = _extract_person_data("Ubezpieczony: Jan Kowalski PESEL: 88112045618")
        payer = _extract_payer_data("Płatnik: Test Sp. z o.o. NIP: 5260250995")
        ins = _extract_insurance_data("B2B 8000 zł staż 200 dni", DocumentType.ZAS53)
        ins.has_overdue_debt = True
        ins.debt_amount = 350.0

        claim_mat = _extract_claim_data("Wniosek ZAM", DocumentType.ZAM)
        eval_res = _assess_eligibility(DocumentType.ZAS53, person, payer, ins, claim_mat)
        self.assertFalse(eval_res.is_eligible)
        self.assertEqual(eval_res.status_badge, InsuranceStatusBadge.WARNING_DEBT)

    def test_parse_and_validate_pdf_invalid_bytes(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            parse_and_validate_pdf(b"not a valid pdf", "test.txt")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_parse_z3_pdf_with_text_layer(self) -> None:
        pdf_raw = _build_pdf_stream(
            [
                "Z-3 ZASWIADCZENIE PLATNIKA SKLADEK",
                "Ubezpieczony: Anna Kowalska PESEL: 92051412309",
                "Platnik skladek: Firma ABC Sp. z o.o. NIP: 5260250995 Powyzej 20",
                "Przychody brutto: 8500,00 zl",
            ]
        )
        res = parse_and_validate_pdf(pdf_raw, "test_z3.pdf")
        self.assertEqual(res.document_type, "Z-3")
        self.assertEqual(res.person.first_name, "Anna")
        self.assertEqual(res.person.last_name, "Kowalska")
        self.assertEqual(res.person.pesel, "92051412309")
        self.assertEqual(res.person.gender, "FEMALE")
        self.assertEqual(res.payer.nip, "5260250995")
        self.assertEqual(res.payer.payer_size, "ABOVE_20")
        self.assertEqual(res.insurance.gross_monthly_income, 8500.0)
        self.assertEqual(res.insurance_status, "ELIGIBLE")
        self.assertEqual(res.calculator_prefill.mother_gross_monthly_income, 8500.0)

    def test_parse_zam_pdf_with_text_layer(self) -> None:
        pdf_raw = _build_pdf_stream(
            [
                "WNIOSEK O ZASILEK MACIERZYNSKI ZAM",
                "Ubezpieczony: Jan Kowalski PESEL: 88112045618",
                "Platnik skladek: Kancelaria NIP: 5260250995",
                "Przychody brutto: 6000,00 zl",
                "Porod: 2026-05-15",
            ]
        )
        res = parse_and_validate_pdf(pdf_raw, "test_zam.pdf")
        self.assertEqual(res.document_type, "ZAM")
        self.assertEqual(res.person.first_name, "Jan")
        self.assertEqual(res.person.last_name, "Kowalski")
        self.assertEqual(res.person.pesel, "88112045618")
        self.assertEqual(res.insurance_status, "ELIGIBLE")
        self.assertEqual(res.claim.child_birth_date, "2026-05-15")

    def test_parse_ezla_pdf_with_text_layer(self) -> None:
        pdf_raw = _build_pdf_stream(
            [
                "ZASWIADCZENIE LEKARSKIE E-ZLA",
                "Ubezpieczony: Anna Kowalska PESEL: 92051412309",
                "Kod B w okresie ciazy",
                "Zwolnienie od 2026-01-01 do 2026-01-30",
            ]
        )
        res = parse_and_validate_pdf(pdf_raw, "test_ezla.pdf")
        self.assertEqual(res.document_type, "e-ZLA")
        self.assertTrue(res.claim.has_pregnancy_code_b)

    def test_parse_zas53_debt_warning_with_text_layer(self) -> None:
        pdf_raw = _build_pdf_stream(
            [
                "WNIOSEK ZAS-53 DZIALALNOSCI POZAROLNICZEJ",
                "Ubezpieczony: Jan Kowalski PESEL: 88112045618",
                "Platnik NIP: 5260250995",
                "Zadluzenie: 450,00 zl",
            ]
        )
        res = parse_and_validate_pdf(pdf_raw, "test_zas53.pdf")
        self.assertEqual(res.document_type, "ZAS-53")
        self.assertEqual(res.insurance_status, "WARNING_DEBT")

    @patch("src.api.services.pdf.ocr_pdf_with_gemini")
    def test_parse_scanned_pdf_without_gemini_api_key(
        self, mock_ocr: MagicMock
    ) -> None:
        mock_ocr.return_value = None
        pdf_raw = _build_pdf_stream([])
        res = parse_and_validate_pdf(pdf_raw, "scan.pdf")
        self.assertEqual(res.document_type, "OTHER")
        self.assertEqual(res.insurance_status, "NEEDS_ADDITIONAL_DOCUMENTS")
        self.assertEqual(res.confidence_score, 0.0)
        self.assertIn("GEMINI_API_KEY", res.eligibility.summary)

    @patch("src.api.services.pdf.ocr_pdf_with_gemini")
    def test_parse_scanned_pdf_with_gemini_ocr_success(
        self, mock_ocr: MagicMock
    ) -> None:
        mock_ocr.return_value = {
            "document_type": "Z-3",
            "document_title": "ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3",
            "first_name": "Anna",
            "last_name": "Kowalska",
            "pesel": "92051412309",
            "company_name": "ABC Sp. z o.o.",
            "nip": "5260250995",
            "payer_size": "ABOVE_20",
            "employment_type": "EMPLOYMENT_CONTRACT",
            "gross_monthly_income": 9500.0,
            "insurance_duration_days": 365,
            "has_pregnancy_code_b": True,
            "children_count": 1,
            "is_eligible": True,
            "status_badge": "ELIGIBLE",
            "summary": "Ubezpieczona uprawniona do 100% zasiłku z kodem B.",
            "validation_messages": ["Prawo do 100% zasiłku chorobowego"],
        }
        pdf_raw = _build_pdf_stream([])
        res = parse_and_validate_pdf(pdf_raw, "scanned_z3.pdf")
        self.assertEqual(res.document_type, "Z-3")
        self.assertEqual(res.person.first_name, "Anna")
        self.assertEqual(res.person.last_name, "Kowalska")
        self.assertEqual(res.person.pesel, "92051412309")
        self.assertEqual(res.payer.nip, "5260250995")
        self.assertEqual(res.payer.payer_size, "ABOVE_20")
        self.assertEqual(res.insurance.gross_monthly_income, 9500.0)
        self.assertTrue(res.claim.has_pregnancy_code_b)
        self.assertEqual(res.insurance_status, "ELIGIBLE")
        self.assertEqual(res.confidence_score, 0.95)

    @patch.dict("os.environ", {"GEMINI_API_KEY": ""})
    def test_gemini_ocr_not_available_when_key_empty(self) -> None:
        self.assertIsNone(get_gemini_api_key())
        self.assertFalse(is_gemini_ocr_available())
        self.assertIsNone(ocr_pdf_with_gemini(b"some bytes", "test.pdf"))

    @patch("src.api.services.ocr.requests.post")
    @patch.dict("os.environ", {"GEMINI_API_KEY": "fake_test_key"})
    def test_gemini_ocr_success(self, mock_post: MagicMock) -> None:
        self.assertTrue(is_gemini_ocr_available())
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": '{"document_type": "Z-3", "gross_monthly_income": 5000.0}'
                            }
                        ]
                    }
                }
            ]
        }
        mock_post.return_value = mock_resp
        res = ocr_pdf_with_gemini(b"test pdf", "test.pdf")
        self.assertIsNotNone(res)
        assert res is not None
        self.assertEqual(res["document_type"], "Z-3")


if __name__ == "__main__":
    unittest.main()
