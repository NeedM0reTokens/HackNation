import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from src.api import app  # noqa: E402


class TestAssistantEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_status_endpoint(self) -> None:
        resp = self.client.get("/api/assistant/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("is_configured", data)
        self.assertIn("model", data)
        self.assertEqual(data.get("provider"), "Google Gemini AI")

    def test_explain_valid_topic(self) -> None:
        resp = self.client.get("/api/assistant/explain/wariant-815")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], "wariant-815")
        self.assertIn("81,5%", data["title"])
        self.assertTrue(len(data["details"]) > 0)
        self.assertIn("Art.", data["legal_basis"])

    def test_explain_unknown_topic(self) -> None:
        resp = self.client.get("/api/assistant/explain/nonexistent-topic")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], "nonexistent-topic")
        self.assertIn("ZUS", data["title"])

    def test_ask_paternity_leave(self) -> None:
        resp = self.client.post(
            "/api/assistant/ask",
            json={"message": "Ile dni ma urlop ojcowski i do kiedy można go wziąć?"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("ojcowsk", data["title"].lower())
        self.assertTrue(any("14" in d for d in data["details"]))
        self.assertIn("182(3)", data["legal_basis"])

    def test_ask_premature_hospitalization(self) -> None:
        resp = self.client.post(
            "/api/assistant/ask",
            json={
                "message": (
                    "Moje dziecko urodziło się jako wcześniak i jest w inkubatorze. Co z urlopem?"
                )
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("wcześniak", data["title"].lower())
        self.assertIn("180", data["legal_basis"])

    def test_ask_general_query(self) -> None:
        resp = self.client.post(
            "/api/assistant/ask",
            json={"message": "Jak działa ten portal zasiłkowy?"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("Zasiłkow", data["title"])
        self.assertIn("summary", data)


if __name__ == "__main__":
    unittest.main()
