import os
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import PyJWTError

from .context import AuthContext
from .roles import SCOPES, Role, RoleRepository, role_repository
from .tokens import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
    scopes=SCOPES,
)


class AuthenticationManager:
    """
    Responsible for authenticating API requests using JWT bearer tokens.
    Extracts user identity and resolves their role into an AuthContext.
    Supports optional development bypass when DEV_AUTH_BYPASS is enabled.
    """

    def __init__(
        self,
        role_repo: RoleRepository | None = None,
        dev_bypass: bool | None = None,
    ) -> None:
        self.roles: RoleRepository = role_repo or role_repository
        if dev_bypass is not None:
            self.dev_bypass: bool = dev_bypass
        else:
            self.dev_bypass = os.getenv("DEV_AUTH_BYPASS", "false").strip().lower() in (
                "true",
                "1",
                "yes",
            )

    def get_auth_context(
        self,
        access_token: Annotated[str | None, Depends(oauth2_scheme)],
    ) -> AuthContext:
        """
        Validates the incoming Bearer token and returns an AuthContext.
        If no token is supplied and dev_bypass is enabled, returns a default
        developer AuthContext with full administrative permissions.

        Raises:
            HTTPException: 401 if token is missing, invalid, or expired.
        """
        if not access_token:
            if self.dev_bypass:
                dev_role: Role = self.roles.get("admin")
                return AuthContext(
                    pesel="00000000000",
                    first_name="Dev",
                    last_name="Swagger",
                    user_role=dev_role,
                    email="dev@swagger.local",
                    token="dev-bypass-token",
                )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload: dict[str, object] = decode_access_token(access_token)
        except PyJWTError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err

        role_name: str = str(payload.get("role", "user"))
        try:
            role: Role = self.roles.get(role_name)
        except KeyError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Role '{role_name}' is not recognized",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err

        pesel: str = str(payload.get("pesel", ""))
        first_name: str = str(payload.get("first_name", ""))
        last_name: str = str(payload.get("last_name", ""))
        email_val: object = payload.get("email")
        email: str | None = str(email_val) if email_val is not None else None

        return AuthContext(
            pesel=pesel,
            first_name=first_name,
            last_name=last_name,
            user_role=role,
            email=email,
            token=access_token,
        )


# Singleton authentication manager instance
authentication_manager: AuthenticationManager = AuthenticationManager()
