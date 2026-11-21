import unittest

from fastapi import HTTPException

from ..api.models.pdf import DocumentType, InsuranceStatusBadge
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

    def test_parse_and_validate_pdf_end_to_end(self) -> None:
        pdf_raw = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
            b"4 0 obj\n<< /Length 200 >>\nstream\n"
            b"BT\n/F1 12 Tf\n50 700 Td\n"
            b"(Z-3 ZASWIADCZENIE PLATNIKA SKLADEK) Tj\n"
            b"0 -20 Td\n"
            b"(Ubezpieczony: Anna Kowalska PESEL: 92051412309) Tj\n"
            b"0 -20 Td\n"
            b"(Platnik skladek: Firma ABC Sp. z o.o. NIP: 5260250995 Powyzej 20) Tj\n"
            b"0 -20 Td\n"
            b"(Przychody brutto: 8500,00 zl) Tj\n"
            b"ET\nendstream\nendobj\n"
            b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
            b"xref\n0 6\n"
            b"0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n"
            b"0000000115 00000 n \n0000000247 00000 n \n0000000497 00000 n \n"
            b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n568\n%%EOF\n"
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
        self.assertEqual(res.calculator_prefill.mother_gross_monthly_income, 8500.0)
        self.assertEqual(res.calculator_prefill.father_gross_monthly_income, 0.0)


if __name__ == "__main__":
    unittest.main()
