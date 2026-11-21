from datetime import UTC, datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(examples=["ok"])
    message: str = Field(examples=["Backend ZUS Przewodnika działa poprawnie!"])
    version: str = Field(default="1.0.0", examples=["1.0.0"])
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
