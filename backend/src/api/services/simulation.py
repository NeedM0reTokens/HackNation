from ..models.simulation import UserProfileResponse


def get_mock_user_profile_service(user_id: str) -> UserProfileResponse:
    return UserProfileResponse(
        user_id=user_id,
        source="mObywatel / ZUS mock",
        has_active_insurance=True,
        insurance_type="UoP",
        overdue_contributions=False,
    )
