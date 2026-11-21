from pydantic import BaseModel


class UserProfileResponse(BaseModel):
    user_id: str
    source: str
    has_active_insurance: bool
    insurance_type: str
    overdue_contributions: bool
