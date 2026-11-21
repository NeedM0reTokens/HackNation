from pydantic import BaseModel, Field


class CitizenIdentity(BaseModel):
    """Represents a mock citizen identity available from mObywatel."""

    pesel: str = Field(..., description="PESEL identification number", examples=["92011501234"])
    first_name: str = Field(..., description="First name of the citizen", examples=["Anna"])
    last_name: str = Field(..., description="Last name of the citizen", examples=["Kowalska"])
    date_of_birth: str = Field(
        ..., description="Date of birth in YYYY-MM-DD format", examples=["1992-01-15"]
    )
    email: str = Field(..., description="Email address", examples=["anna.kowalska@obywatel.gov.pl"])
    role: str = Field(
        ..., description="Assigned application role ('user' or 'admin')", examples=["user"]
    )
    label: str = Field(
        ...,
        description="Human-readable label for UI selection",
        examples=["Anna Kowalska - Przyszla Matka (Obywatel)"],
    )


class MobywatelLoginRequest(BaseModel):
    """Payload to simulate mObywatel login by selecting a citizen's PESEL."""

    pesel: str = Field(..., description="PESEL of the citizen logging in", examples=["92011501234"])


class TokenResponse(BaseModel):
    """OAuth2-compliant access token response with user profile details."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token lifespan in seconds")
    user: CitizenIdentity = Field(..., description="Authenticated citizen profile")


class UserProfileResponse(BaseModel):
    """Profile data returned for the currently authenticated user."""

    pesel: str = Field(..., description="PESEL identification number")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    full_name: str = Field(..., description="Combined full name")
    email: str | None = Field(default=None, description="Email address")
    role: str = Field(..., description="Assigned role name")
    scopes: list[str] = Field(..., description="List of granted permission scopes")
