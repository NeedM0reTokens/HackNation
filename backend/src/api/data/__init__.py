import json
from pathlib import Path
from typing import Any

DATA_DIR: Path = Path(__file__).resolve().parent
ZUS_PROFILES_FILE: Path = DATA_DIR / "zus_profiles.json"
CITIZENS_FILE: Path = DATA_DIR / "citizens.json"
ROLES_FILE: Path = DATA_DIR / "roles.json"


def load_zus_mock_data() -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    """Loads simulated ZUS insurance profiles and aliases from JSON file."""
    if not ZUS_PROFILES_FILE.exists():
        return {}, {}
    with open(ZUS_PROFILES_FILE, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("profiles", {}), data.get("aliases", {})


PREDEFINED_PROFILES, NAME_TO_PESEL = load_zus_mock_data()

__all__ = [
    "CITIZENS_FILE",
    "DATA_DIR",
    "NAME_TO_PESEL",
    "PREDEFINED_PROFILES",
    "ROLES_FILE",
    "ZUS_PROFILES_FILE",
    "load_zus_mock_data",
]
