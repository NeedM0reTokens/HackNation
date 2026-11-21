import asyncio
import json
import unittest
from pathlib import Path
from typing import Any

from ..api.api import app
from ..api.models.pdf import InsuranceStatusBadge
from ..api.services.cases import (
    evaluate_all_cases_service,
    evaluate_case_service,
    get_case_pdf_path,
    get_case_service,
    get_cases_pdf_directory,
    list_cases_service,
)
from ..api.services.pdf import parse_and_validate_pdf


def _call_api(
    path: str,
    method: str = "GET",
    json_body: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    body_bytes = json.dumps(json_body).encode() if json_body else b""
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

    asyncio.run(app(scope, receive, send))
    raw_bytes = bytes(resp_body)
    try:
        parsed = json.loads(raw_bytes.decode()) if raw_bytes else None
    except Exception:
        parsed = raw_bytes
    return status_code, parsed


class TestZusCasesRunner(unittest.TestCase):
    def test_list_all_cases(self) -> None:
        cases = list_cases_service()
        self.assertGreaterEqual(len(cases), 6)
        case_ids = [c.id for c in cases]
        self.assertIn("case-1", case_ids)
        self.assertIn("case-2", case_ids)
        self.assertIn("case-3", case_ids)
        self.assertIn("case-4", case_ids)
        self.assertIn("case-5", case_ids)
        self.assertIn("case-6", case_ids)

    def test_get_individual_case_details(self) -> None:
        case = get_case_service("case-1")
        self.assertEqual(case.id, "case-1")
        self.assertEqual(case.document_type, "Z-3")
        self.assertEqual(case.payer.nip, "5250001098")
        self.assertTrue(case.extracted_data.get("has_active_ezla_code_b"))

    def test_evaluate_case_1_pregnancy_code_b(self) -> None:
        res = evaluate_case_service("case-1")
        self.assertTrue(res.passed)
        self.assertEqual(res.calculated_result.get("benefit_percentage"), 100.0)
        self.assertEqual(res.calculated_result.get("disbursing_entity"), "EMPLOYER")

    def test_evaluate_case_2_jdg_maternity_21_days(self) -> None:
        res = evaluate_case_service("case-2")
        self.assertTrue(res.passed)
        self.assertEqual(res.calculated_result.get("chosen_variant"), "UNIFIED_81_5")
        self.assertEqual(res.calculated_result.get("total_weeks"), 61)

    def test_evaluate_case_3_premature_hospitalization(self) -> None:
        res = evaluate_case_service("case-3")
        self.assertTrue(res.passed)
        self.assertEqual(res.calculated_result.get("supplementary_maternity_weeks"), 9)

    def test_evaluate_case_4_paternity_14_days(self) -> None:
        res = evaluate_case_service("case-4")
        self.assertTrue(res.passed)
        self.assertEqual(res.calculated_result.get("total_days"), 14)

    def test_evaluate_case_5_employer_liquidation(self) -> None:
        res = evaluate_case_service("case-5")
        self.assertTrue(res.passed)
        self.assertEqual(res.calculated_result.get("disbursing_entity"), "ZUS")

    def test_evaluate_case_6_zus_debt_blocking(self) -> None:
        res = evaluate_case_service("case-6")
        self.assertTrue(res.passed)
        self.assertFalse(res.calculated_result.get("is_eligible"))

    def test_batch_runner_100_percent_accuracy(self) -> None:
        batch = evaluate_all_cases_service()
        self.assertEqual(batch.total_cases, 6)
        self.assertEqual(batch.passed_cases, 6)
        self.assertEqual(batch.accuracy_percent, 100.0)

    def test_api_routes_cases(self) -> None:
        code, data = _call_api("/api/cases", "GET")
        self.assertEqual(code, 200)
        self.assertGreaterEqual(len(data), 6)

        code_single, single_data = _call_api("/api/cases/case-1", "GET")
        self.assertEqual(code_single, 200)
        self.assertEqual(single_data["id"], "case-1")

        code_eval, eval_data = _call_api("/api/cases/case-1/evaluate", "POST")
        self.assertEqual(code_eval, 200)
        self.assertTrue(eval_data["passed"])

        code_batch, batch_data = _call_api("/api/cases/evaluate-all", "POST")
        self.assertEqual(code_batch, 200)
        self.assertEqual(batch_data["accuracy_percent"], 100.0)

    def test_api_simulation_and_mock_routes(self) -> None:
        code_sim, sim_data = _call_api("/api/simulation/profile/anna-kowalska", "GET")
        self.assertEqual(code_sim, 200)
        self.assertEqual(sim_data["user_id"], "anna-kowalska")

        code_zus, _ = _call_api("/api/mock/zus/profile", "GET")
        self.assertEqual(code_zus, 200)

    def test_case_pdf_files_exist_and_valid(self) -> None:
        if not get_cases_pdf_directory():
            self.skipTest("Katalog z plikami PDF nie jest obecny.")
        cases = list_cases_service()
        for case in cases:
            self.assertIsNotNone(case.pdf_filename)
            pdf_path = get_case_pdf_path(case.id)
            self.assertTrue(pdf_path.exists())
            self.assertGreater(pdf_path.stat().st_size, 50_000)
            with open(pdf_path, "rb") as f:
                header = f.read(8)
                self.assertTrue(header.startswith(b"%PDF-"))

    def test_api_download_case_pdf(self) -> None:
        if not get_cases_pdf_directory():
            self.skipTest("Katalog z plikami PDF nie jest obecny.")
        code, raw_bytes = _call_api("/api/cases/case-1/pdf", "GET")
        self.assertEqual(code, 200)
        self.assertIsInstance(raw_bytes, (bytes, bytearray))
        self.assertTrue(bytes(raw_bytes).startswith(b"%PDF-"))


def _get_sprawy_pdf_paths() -> list[Path]:
    candidates = [
        Path("data/Sprawy"),
        Path.cwd() / "data" / "Sprawy",
        Path(__file__).resolve().parent.parent.parent.parent / "data" / "Sprawy",
        Path(__file__).resolve().parent.parent / "api" / "data" / "Sprawy ",
        Path(__file__).resolve().parent.parent / "api" / "data" / "Sprawy",
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            files = sorted(
                [p for p in c.rglob("*") if p.is_file() and p.suffix.lower() == ".pdf"]
            )
            if files:
                return files
    return []


def _sanitize_name(name: str) -> str:
    cleaned = "".join(c if c.isalnum() else "_" for c in name)
    parts = filter(None, cleaned.split("_"))
    return "_".join(parts)[:70].lower()


def _make_pdf_test(pdf_path: Path):
    def test_method(self: unittest.TestCase) -> None:
        self.assertTrue(pdf_path.exists())
        file_bytes = pdf_path.read_bytes()
        self.assertTrue(file_bytes.startswith(b"%PDF-"))
        self.assertGreater(len(file_bytes), 1000)

        res = parse_and_validate_pdf(file_bytes, pdf_path.name)
        self.assertIsNotNone(res)
        self.assertEqual(res.filename, pdf_path.name)
        self.assertGreaterEqual(res.page_count, 1)
        self.assertEqual(res.file_size_bytes, len(file_bytes))
        self.assertIsInstance(res.document_type, str)
        self.assertTrue(len(res.document_type) > 0)
        self.assertIsInstance(res.document_title, str)

        self.assertIsNotNone(res.person)
        self.assertIsNotNone(res.payer)
        self.assertIsNotNone(res.insurance)
        self.assertIsNotNone(res.claim)
        self.assertIsNotNone(res.eligibility)
        self.assertIsNotNone(res.calculator_prefill)

        valid_badges = {b.value for b in InsuranceStatusBadge}
        self.assertIn(res.insurance_status, valid_badges)
        self.assertEqual(res.insurance_status, res.eligibility.status_badge.value)
        self.assertGreaterEqual(len(res.validation_messages), 1)
        self.assertIsInstance(res.extracted_data, dict)

        if res.raw_text_preview:
            self.assertGreater(len(res.raw_text_preview.strip()), 0)
        else:
            self.assertEqual(
                res.insurance_status,
                InsuranceStatusBadge.NEEDS_ADDITIONAL_DOCUMENTS.value,
            )
            self.assertEqual(res.confidence_score, 0.0)
            self.assertEqual(
                res.extracted_data.get("error"),
                "NO_TEXT_LAYER_AND_NO_OCR",
            )

    return test_method


class TestAllSprawyPdfs(unittest.TestCase):
    def test_sprawy_folder_contains_pdfs(self) -> None:
        pdfs = _get_sprawy_pdf_paths()
        if not pdfs:
            self.skipTest("Katalog z plikami PDF Sprawy nie jest obecny.")
        self.assertGreaterEqual(len(pdfs), 80)


for idx, p in enumerate(_get_sprawy_pdf_paths(), 1):
    method_name = f"test_pdf_{idx:02d}_{_sanitize_name(p.stem)}"
    setattr(TestAllSprawyPdfs, method_name, _make_pdf_test(p))


if __name__ == "__main__":
    unittest.main()
