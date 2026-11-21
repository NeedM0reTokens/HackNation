import os
from datetime import UTC, datetime, timedelta
from typing import cast

import jwt

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "hacknation-2026-mobywatel-secret-key-32charsmin")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)  # Default 24h


def create_access_token(
    data: dict[str, object],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token containing user identity payload."""
    to_encode: dict[str, object] = data.copy()
    now: datetime = datetime.now(UTC)
    if expires_delta is not None:
        expire: datetime = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"iat": now, "exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, object]:
    """Decode and validate a JWT access token, returning the payload."""
    payload: dict[str, object] = cast(
        dict[str, object],
        jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]),
    )
    return payload
