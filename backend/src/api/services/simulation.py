from datetime import date

from ..data import NAME_TO_PESEL, PREDEFINED_PROFILES
from ..models.simulation import ActiveEzlaInfo, MonthlyContribution, UserProfileResponse


def _generate_monthly_contributions(gross_amount: float) -> list[MonthlyContribution]:
    """
    Generates 12 monthly contribution records preceding current month.
    Each contribution deducts employee social security portion: 13.71%.
    """
    if gross_amount <= 0:
        return []

    contributions: list[MonthlyContribution] = []
    # Reference year-month for simulation (2025-05 to 2026-04)
    months = [
        "2025-05",
        "2025-06",
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
        "2026-03",
        "2026-04",
    ]

    social_deducted = round(gross_amount * 0.1371, 2)
    net_base = round(gross_amount - social_deducted, 2)

    for m in months:
        contributions.append(
            MonthlyContribution(
                month=m,
                gross_amount=gross_amount,
                social_contributions_deducted=social_deducted,
                net_base=net_base,
            )
        )
    return contributions


def _parse_pesel_details(pesel: str) -> tuple[str, str]:
    """
    Parses date of birth and gender from Polish PESEL number.
    Returns (date_of_birth_iso, gender).
    """
    if len(pesel) == 11 and pesel.isdigit():
        year_part = int(pesel[0:2])
        month_part = int(pesel[2:4])
        day_part = int(pesel[4:6])

        if 1 <= month_part <= 12:
            century = 1900
            real_month = month_part
        elif 21 <= month_part <= 32:
            century = 2000
            real_month = month_part - 20
        elif 81 <= month_part <= 92:
            century = 1800
            real_month = month_part - 80
        else:
            century = 1900
            real_month = month_part

        real_year = century + year_part
        try:
            dob = date(real_year, real_month, day_part).isoformat()
        except ValueError:
            dob = "1992-01-01"

        gender_digit = int(pesel[9])
        gender = "Mężczyzna" if gender_digit % 2 != 0 else "Kobieta"
        return dob, gender

    return "1992-01-01", "Kobieta"


def get_mock_user_profile_service(user_id_or_pesel: str) -> UserProfileResponse:
    """
    Returns simulated ZUS insurance profile for a person by their PESEL or alias.
    If the PESEL is recognized in the predefined scenarios, returns specific data.
    If an unknown PESEL is given, generates a realistic, legally compliant default profile.
    """
    normalized_id = user_id_or_pesel.strip().lower()
    pesel = NAME_TO_PESEL.get(normalized_id, normalized_id)

    if pesel in PREDEFINED_PROFILES:
        raw = dict(PREDEFINED_PROFILES[pesel])
        gross = float(raw["average_monthly_gross"])
        contributions = _generate_monthly_contributions(gross)

        active_ezla_list: list[ActiveEzlaInfo] = []
        for ez in raw.get("active_ezla", []):
            if isinstance(ez, dict):
                active_ezla_list.append(ActiveEzlaInfo.model_validate(ez))

        return UserProfileResponse(
            pesel=str(raw["pesel"]),
            user_id=str(raw["pesel"]),
            first_name=str(raw["first_name"]),
            last_name=str(raw["last_name"]),
            date_of_birth=str(raw["date_of_birth"]),
            gender=str(raw["gender"]),
            source="ZUS Centralny Rejestr Ubezpieczonych (eZUS Mock)",
            has_insurance=bool(raw["has_insurance"]),
            has_active_insurance=bool(raw["has_insurance"]),
            insurance_status=str(raw["insurance_status"]),
            insurance_title=str(raw["insurance_title"]),
            insurance_type=str(raw["insurance_type"]),
            employment_type=str(raw["employment_type"]),
            has_sickness_insurance=bool(raw["has_sickness_insurance"]),
            sickness_insurance_type=str(raw["sickness_insurance_type"]),
            insurance_start_date=raw.get("insurance_start_date") or None,
            insurance_duration_days=int(raw["insurance_duration_days"]),
            waiting_period_days_required=int(raw["waiting_period_days_required"]),
            waiting_period_satisfied=bool(raw["waiting_period_satisfied"]),
            average_monthly_gross=gross,
            calculation_base_net=float(raw["calculation_base_net"]),
            monthly_contributions_12m=contributions,
            payer_name=raw.get("payer_name") or None,
            payer_nip=raw.get("payer_nip") or None,
            is_large_payer=bool(raw["is_large_payer"]),
            overdue_contributions=bool(raw["overdue_contributions"]),
            has_overdue_contributions=bool(raw["has_overdue_contributions"]),
            overdue_amount=float(raw["overdue_amount"]),
            overdue_blocks_benefits=bool(raw["overdue_blocks_benefits"]),
            has_active_ezla=bool(raw["has_active_ezla"]),
            active_ezla=active_ezla_list,
            sickness_days_used_in_year=int(raw["sickness_days_used_in_year"]),
            max_sickness_days=int(raw["max_sickness_days"]),
        )

    # Dynamic generation for any other custom PESEL
    dob, gender = _parse_pesel_details(pesel)
    first_name = "Katarzyna" if gender == "Kobieta" else "Jan"
    last_name = "Kowalski"

    # Standard default in 2026: full-time employment contract, 6000 PLN gross
    gross = 6000.0
    social_deducted = round(gross * 0.1371, 2)
    net_base = round(gross - social_deducted, 2)
    contributions = _generate_monthly_contributions(gross)

    return UserProfileResponse(
        pesel=pesel,
        user_id=pesel,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=dob,
        gender=gender,
        source="ZUS Centralny Rejestr Ubezpieczonych (eZUS Mock)",
        has_insurance=True,
        has_active_insurance=True,
        insurance_status="ACTIVE",
        insurance_title="Umowa o pracę (pracownik)",
        insurance_type="UoP",
        employment_type="EMPLOYMENT_CONTRACT",
        has_sickness_insurance=True,
        sickness_insurance_type="MANDATORY",
        insurance_start_date="2024-01-01",
        insurance_duration_days=450,
        waiting_period_days_required=30,
        waiting_period_satisfied=True,
        average_monthly_gross=gross,
        calculation_base_net=net_base,
        monthly_contributions_12m=contributions,
        payer_name="Przykładowy Płatnik Sp. z o.o.",
        payer_nip="1112223344",
        is_large_payer=True,
        overdue_contributions=False,
        has_overdue_contributions=False,
        overdue_amount=0.0,
        overdue_blocks_benefits=False,
        has_active_ezla=False,
        active_ezla=[],
        sickness_days_used_in_year=0,
        max_sickness_days=182,
    )
