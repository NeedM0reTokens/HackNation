import json
from pathlib import Path
from typing import Any

DATA_DIR: Path = Path(__file__).resolve().parent
CITIZENS_FILE: Path = DATA_DIR / "citizens.json"
ROLES_FILE: Path = DATA_DIR / "roles.json"


def load_citizens_raw() -> list[dict[str, Any]]:
    """Loads raw citizen records from the unified JSON file."""
    if not CITIZENS_FILE.exists():
        return []
    with open(CITIZENS_FILE, encoding="utf-8") as f:
        return json.load(f)


def load_mock_data() -> tuple[
    dict[str, dict[str, Any]],
    dict[str, list[dict[str, Any]]],
    dict[str, dict[str, Any]],
]:
    """
    Parses unified citizens.json into:
    1. ZUS insurance profiles dict (keyed by PESEL)
    2. e-ZLA certificates list dict (keyed by PESEL)
    3. Individual e-ZLA certificates dict (keyed by document_id)
    """
    profiles: dict[str, dict[str, Any]] = {}
    ezla_by_pesel: dict[str, list[dict[str, Any]]] = {}
    ezla_by_doc_id: dict[str, dict[str, Any]] = {}

    for c in load_citizens_raw():
        pesel = str(c["pesel"])

        # Parse ZUS insurance profile
        ins = dict(c.get("insurance", {}))
        ins["pesel"] = pesel
        ins["first_name"] = c.get("first_name")
        ins["last_name"] = c.get("last_name")
        ins["date_of_birth"] = c.get("date_of_birth")
        ins["gender"] = c.get("gender")

        # Parse e-ZLA certificates
        certs = list(c.get("ezla_certificates", []))
        ezla_by_pesel[pesel] = certs
        for cert in certs:
            doc_id = str(cert.get("document_id"))
            ezla_by_doc_id[doc_id] = cert

        active_list = [cert for cert in certs if cert.get("status") == "ACTIVE"]
        ins["has_active_ezla"] = len(active_list) > 0
        ins["active_ezla"] = active_list

        profiles[pesel] = ins

    return profiles, ezla_by_pesel, ezla_by_doc_id


PREDEFINED_PROFILES, PREDEFINED_EZLA, PREDEFINED_EZLA_BY_DOC = load_mock_data()

__all__ = [
    "CITIZENS_FILE",
    "DATA_DIR",
    "PREDEFINED_EZLA",
    "PREDEFINED_EZLA_BY_DOC",
    "PREDEFINED_PROFILES",
    "ROLES_FILE",
    "load_citizens_raw",
    "load_mock_data",
]
