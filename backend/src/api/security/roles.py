import json
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import cast, override


class Permission(StrEnum):
    """Typed permission scopes for route security decorators."""

    admin_config_read = "admin:config:read"
    admin_config_update = "admin:config:update"
    calculator_maternity = "calculator:maternity"
    calculator_pregnancy = "calculator:pregnancy"
    simulation_run = "simulation:run"
    pdf_generate = "pdf:generate"
    profile_read = "profile:read"

    @override
    def __str__(self) -> str:
        return self.value


class PermissionRepository:
    """Maps permission scope identifiers to unique bitmasks."""

    def __init__(self) -> None:
        self.permissions: dict[str, int] = {}

    def add(self, scope: str) -> "PermissionRepository":
        """Adds a new permission scope and assigns it the next power of two."""
        if scope not in self.permissions:
            self.permissions[scope] = 1 << len(self.permissions)
        return self

    def get(self, scope: str) -> int:
        """Retrieves the bitmask for a permission scope."""
        if scope not in self.permissions:
            raise KeyError(f"Permission '{scope}' does not exist in repository")
        return self.permissions[scope]

    def combine(self, scopes: list[str]) -> int:
        """Combines a list of permission scopes into a single bitmask using bitwise OR."""
        res: int = 0
        for scope in scopes:
            if scope not in self.permissions:
                raise KeyError(f"Permission '{scope}' does not exist in repository")
            res |= self.permissions[scope]
        return res


@dataclass(frozen=True)
class Role:
    name: str
    permissions: int  # Combined bitmask
    scopes: list[str]  # List of scope strings
    description: str = ""


class RoleRepository:
    """
    Repository for roles and permissions.
    Backed by a JSON database file (api/data/roles.json).
    """

    def __init__(self, db_file: Path | None = None) -> None:
        self.db_file: Path = db_file or (
            Path(__file__).resolve().parent.parent / "data" / "roles.json"
        )
        self.perms: PermissionRepository = PermissionRepository()
        self.roles: dict[str, Role] = {}
        self.scopes_metadata: dict[str, str] = {}
        self.load_from_disk()

    def load_from_disk(self) -> None:
        """Loads permissions and roles from JSON file and builds bitmask structures."""

        if not self.db_file.exists():
            raise FileNotFoundError(f"Roles database file does not exist: {self.db_file}")

        with open(self.db_file, encoding="utf-8") as f:
            data = cast(dict[str, list[dict[str, object]]], json.load(f))

        # 1. Register all permissions and their bitmasks
        self.perms = PermissionRepository()
        self.scopes_metadata.clear()

        for perm_entry in data.get("permissions", []):
            scope: str = str(perm_entry["scope"])
            desc_val: str = str(perm_entry.get("description", ""))
            self.perms.add(scope)
            self.scopes_metadata[scope] = desc_val

        # 2. Build roles based on registered permissions
        self.roles.clear()
        for role_entry in data.get("roles", []):
            name: str = str(role_entry["name"])
            raw_scopes = cast(list[object], role_entry.get("permissions", []))
            scopes: list[str] = [str(s) for s in raw_scopes]
            role_desc: str = str(role_entry.get("description", ""))
            mask: int = self.perms.combine(scopes)
            self.roles[name] = Role(
                name=name,
                permissions=mask,
                scopes=scopes,
                description=role_desc,
            )

    def save_to_disk(self) -> None:
        """Persists current state to the JSON file."""

        data: dict[str, list[dict[str, object]]] = {
            "permissions": [
                {"scope": scope, "description": desc}
                for scope, desc in self.scopes_metadata.items()
            ],
            "roles": [
                {
                    "name": role.name,
                    "description": role.description,
                    "permissions": role.scopes,
                }
                for role in self.roles.values()
            ],
        }
        self.db_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.db_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get(self, name: str) -> Role:
        if name not in self.roles:
            raise KeyError(f"Role '{name}' does not exist in database")
        return self.roles[name]

    def get_all(self) -> list[Role]:
        return list(self.roles.values())

    def get_scopes(self) -> dict[str, str]:
        """Returns dictionary of {scope: description} for OpenAPI / OAuth2 documentation."""
        return self.scopes_metadata.copy()

    def validate(self, requested_scope: str, role: Role) -> bool:
        """Validates whether a given role holds the requested permission bitmask."""
        try:
            permission_val: int = self.perms.get(requested_scope)
        except KeyError:
            return False

        return (permission_val & role.permissions) > 0


# Singleton role repository
role_repository: RoleRepository = RoleRepository()
SCOPES: dict[str, str] = role_repository.get_scopes()
