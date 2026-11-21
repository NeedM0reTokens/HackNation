from typing import Annotated, Any

from fastapi import APIRouter, Depends, Security
from fastapi.security import OAuth2PasswordRequestForm

from ..models.auth import (
    CitizenIdentity,
    MobywatelLoginRequest,
    TokenResponse,
    UserProfileResponse,
)
from ..security import (
    AuthContext,
    Permission,
    authentication_manager,
    authorization_manager,
)
from ..services.mobywatel import MobywatelService, mobywatel_service


class AuthRouter(APIRouter):
    """Router handling mObywatel identity simulation and OAuth2 authentication."""

    def __init__(
        self,
        service: MobywatelService | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(prefix="/auth", tags=["Autentykacja mObywatel"], **kwargs)
        self.service: MobywatelService = service or mobywatel_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.add_api_route(
            "/mobywatel/identities",
            self.list_identities_route,
            methods=["GET"],
            response_model=list[CitizenIdentity],
            summary="Pobierz listę testowych profili mObywatel",
            description=(
                "Zwraca zestaw predefiniowanych tożsamości obywateli "
                "(matka, ojciec, pracownik ZUS) do wyboru na frontendzie."
            ),
        )

        self.add_api_route(
            "/mobywatel/login",
            self.mobywatel_login_route,
            methods=["POST"],
            response_model=TokenResponse,
            summary="Zaloguj wybraną tożsamością mObywatel",
            description=(
                "Przyjmuje PESEL obywatela i wydaje podpisany token JWT z uprawnieniami (claims) "
                "oraz danymi profilu z mObywatela."
            ),
        )

        self.add_api_route(
            "/login",
            self.oauth2_login_route,
            methods=["POST"],
            response_model=TokenResponse,
            summary="Logowanie OAuth2 kompatybilne ze Swagger UI",
            description=(
                "Endpoint dla przycisku 'Authorize' w dokumentacji Swagger UI. "
                "Pole 'username' przyjmuje PESEL wybranego obywatela."
            ),
        )

        self.add_api_route(
            "/me",
            self.get_current_user_profile_route,
            methods=["GET"],
            response_model=UserProfileResponse,
            dependencies=[
                Security(
                    authorization_manager.require,
                    scopes=[Permission.profile_read],
                )
            ],
            summary="Pobierz profil aktualnie zalogowanego użytkownika",
            description="Zwraca dane tożsamości i uprawnienia zdekodowane z tokena Bearer JWT.",
        )

    def list_identities_route(self) -> list[CitizenIdentity]:
        """Returns all mock citizen identities."""
        return self.service.list_identities()

    def mobywatel_login_route(self, payload: MobywatelLoginRequest) -> TokenResponse:
        """Authenticates a citizen via PESEL and returns JWT token."""
        return self.service.authenticate(payload.pesel)

    def oauth2_login_route(
        self,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    ) -> TokenResponse:
        """OAuth2 password form login compatible with Swagger UI (PESEL in username)."""
        return self.service.authenticate(form_data.username)

    def get_current_user_profile_route(
        self,
        auth_ctx: Annotated[
            AuthContext,
            Depends(authentication_manager.get_auth_context),
        ],
    ) -> UserProfileResponse:
        """Returns current authenticated citizen profile."""
        return UserProfileResponse(
            pesel=auth_ctx.pesel,
            first_name=auth_ctx.first_name,
            last_name=auth_ctx.last_name,
            full_name=auth_ctx.full_name,
            email=auth_ctx.email,
            role=auth_ctx.user_role.name,
            scopes=auth_ctx.user_role.scopes,
        )


router = AuthRouter()
AuthAPI = AuthRouter
