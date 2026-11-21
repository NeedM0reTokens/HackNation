from dataclasses import dataclass

from .roles import Role


@dataclass
class AuthContext:
    """Authentication context of an authenticated citizen/user from mObywatel."""

    pesel: str
    first_name: str
    last_name: str
    user_role: Role
    email: str | None = None
    token: str | None = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
