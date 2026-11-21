import json
from pathlib import Path
from typing import cast

from fastapi import HTTPException, status

from ..models.auth import CitizenIdentity, TokenResponse
from ..security.roles import Role, RoleRepository, role_repository
from ..security.tokens import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token


class MobywatelService:
    """
    Mock service simulating the mObywatel identity provider.
    Loads mock citizen identities from a JSON database file and issues JWT tokens.
    """

    def __init__(
        self,
        db_file: Path | None = None,
        role_repo: RoleRepository | None = None,
    ) -> None:
        self.db_file: Path = db_file or (
            Path(__file__).resolve().parent.parent / "data" / "citizens.json"
        )
        self.role_repo: RoleRepository = role_repo or role_repository
        self._citizens: dict[str, CitizenIdentity] = {}
        self.load_from_disk()

    def load_from_disk(self) -> None:
        """Loads citizen records from the JSON database file into memory."""
        if not self.db_file.exists():
            raise FileNotFoundError(f"Citizens database file does not exist: {self.db_file}")

        with open(self.db_file, encoding="utf-8") as f:
            raw_data = cast(list[dict[str, object]], json.load(f))

        self._citizens.clear()
        for item in raw_data:
            citizen = CitizenIdentity.model_validate(item)
            self._citizens[citizen.pesel] = citizen

    def list_identities(self) -> list[CitizenIdentity]:
        """Returns all mock citizen identities available for simulation."""
        return list(self._citizens.values())

    def get_identity(self, pesel: str) -> CitizenIdentity | None:
        """Looks up a citizen identity by their PESEL."""
        return self._citizens.get(pesel)

    def authenticate(self, pesel: str) -> TokenResponse:
        """
        Authenticates a citizen by PESEL and issues a signed JWT access token.

        Raises:
            HTTPException: 404 if citizen is not found in mock database.
            HTTPException: 400 if citizen role is invalid.
        """
        citizen: CitizenIdentity | None = self.get_identity(pesel)
        if citizen is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nie znaleziono obywatela o podanym numerze PESEL",
            )

        try:
            role: Role = self.role_repo.get(citizen.role)
        except KeyError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid citizen role '{citizen.role}'",
            ) from err

        token_payload: dict[str, object] = {
            "sub": citizen.pesel,
            "pesel": citizen.pesel,
            "first_name": citizen.first_name,
            "last_name": citizen.last_name,
            "email": citizen.email,
            "role": role.name,
            "scopes": role.scopes,
        }

        access_token: str = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=citizen,
        )


# Singleton instance of MobywatelService
mobywatel_service: MobywatelService = MobywatelService()
