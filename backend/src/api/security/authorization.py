from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import SecurityScopes

from .authentication import AuthenticationManager, authentication_manager
from .context import AuthContext


class AuthorizationManager:
    """
    Responsible for authorising API requests based on required permission scopes.
    Exposes the require property meant for use with FastAPI Security function.
    """

    def __init__(self, auth_manager: AuthenticationManager | None = None) -> None:
        self.auth_manager: AuthenticationManager = auth_manager or authentication_manager

        def _dependency(
            security_scopes: SecurityScopes,
            auth_context: Annotated[AuthContext, Depends(self.auth_manager.get_auth_context)],
        ) -> AuthContext:
            for scope in security_scopes.scopes:
                if not self.auth_manager.roles.validate(scope, auth_context.user_role):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Action not permitted",
                    )
            return auth_context

        self._dependency: Callable[..., AuthContext] = _dependency

    @property
    def require(self) -> Callable[..., AuthContext]:
        """
        FastAPI dependency that validates whether the authenticated user has all
        required scopes.
        """
        return self._dependency


# Singleton authorization manager instance
authorization_manager: AuthorizationManager = AuthorizationManager()
