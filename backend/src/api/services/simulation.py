from datetime import date

from fastapi import HTTPException, status

from ..data import (
    PREDEFINED_EZLA,
    PREDEFINED_EZLA_BY_DOC,
    PREDEFINED_PROFILES,
)
from ..models.simulation import (
    ActiveEzlaInfo,
    EzlaCertificateResponse,
    EzlaCitizenResponse,
    MonthlyContribution,
    UserProfileResponse,
)


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


def get_mock_user_profile_service(pesel: str) -> UserProfileResponse:
    """
    Returns simulated ZUS insurance profile for a person by their PESEL.
    If the PESEL is recognized in the predefined scenarios, returns specific data.
    If an unknown PESEL is given, generates a realistic, legally compliant default profile.
    """
    clean_pesel = pesel.strip()

    if clean_pesel in PREDEFINED_PROFILES:
        raw = dict(PREDEFINED_PROFILES[clean_pesel])
        gross = float(raw["average_monthly_gross"])
        contributions = _generate_monthly_contributions(gross)

        active_ezla_list: list[ActiveEzlaInfo] = []
        for ez in raw.get("active_ezla", []):
            if isinstance(ez, dict):
                active_ezla_list.append(ActiveEzlaInfo.model_validate(ez))

        return UserProfileResponse(
            pesel=str(raw["pesel"]),
            first_name=str(raw["first_name"]),
            last_name=str(raw["last_name"]),
            date_of_birth=str(raw["date_of_birth"]),
            gender=str(raw["gender"]),
            source="ZUS Centralny Rejestr Ubezpieczonych (eZUS Mock)",
            has_insurance=bool(raw["has_insurance"]),
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
            has_overdue_contributions=bool(raw["has_overdue_contributions"]),
            overdue_amount=float(raw["overdue_amount"]),
            overdue_blocks_benefits=bool(raw["overdue_blocks_benefits"]),
            has_active_ezla=bool(raw["has_active_ezla"]),
            active_ezla=active_ezla_list,
            sickness_days_used_in_year=int(raw["sickness_days_used_in_year"]),
            max_sickness_days=int(raw["max_sickness_days"]),
        )

    # Dynamic generation for any other custom PESEL
    dob, gender = _parse_pesel_details(clean_pesel)
    first_name = "Katarzyna" if gender == "Kobieta" else "Jan"
    last_name = "Kowalski"

    # Standard default in 2026: full-time employment contract, 6000 PLN gross
    gross = 6000.0
    social_deducted = round(gross * 0.1371, 2)
    net_base = round(gross - social_deducted, 2)
    contributions = _generate_monthly_contributions(gross)

    return UserProfileResponse(
        pesel=clean_pesel,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=dob,
        gender=gender,
        source="ZUS Centralny Rejestr Ubezpieczonych (eZUS Mock)",
        has_insurance=True,
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
        has_overdue_contributions=False,
        overdue_amount=0.0,
        overdue_blocks_benefits=False,
        has_active_ezla=False,
        active_ezla=[],
        sickness_days_used_in_year=0,
        max_sickness_days=182,
    )


def get_citizen_ezla_service(pesel: str) -> EzlaCitizenResponse:
    """
    Returns electronic sick leave certificates (e-ZLA) for a citizen by PESEL.
    Simulates retrieval of e-ZLA incapacity certificates from the ZUS medical registry.
    """
    clean_pesel = pesel.strip()

    if clean_pesel in PREDEFINED_PROFILES:
        raw_profile = dict(PREDEFINED_PROFILES[clean_pesel])
        raw_certs = PREDEFINED_EZLA.get(clean_pesel, [])
        certificates = [EzlaCertificateResponse.model_validate(c) for c in raw_certs]

        active_count = sum(1 for c in certificates if c.status == "ACTIVE")
        has_active = active_count > 0

        return EzlaCitizenResponse(
            pesel=str(raw_profile["pesel"]),
            first_name=str(raw_profile["first_name"]),
            last_name=str(raw_profile["last_name"]),
            date_of_birth=str(raw_profile["date_of_birth"]),
            gender=str(raw_profile["gender"]),
            source="ZUS Rejestr Zaświadczeń Lekarskich (e-ZLA Mock)",
            has_active_ezla=has_active,
            total_certificates_count=len(certificates),
            active_certificates_count=active_count,
            sickness_days_used_in_year=int(raw_profile.get("sickness_days_used_in_year", 0)),
            max_sickness_days=int(raw_profile.get("max_sickness_days", 182)),
            certificates=certificates,
        )

    # Dynamic fallback for arbitrary unknown PESEL
    dob, gender = _parse_pesel_details(clean_pesel)
    first_name = "Katarzyna" if gender == "Kobieta" else "Jan"
    last_name = "Kowalski"

    return EzlaCitizenResponse(
        pesel=clean_pesel,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=dob,
        gender=gender,
        source="ZUS Rejestr Zaświadczeń Lekarskich (e-ZLA Mock)",
        has_active_ezla=False,
        total_certificates_count=0,
        active_certificates_count=0,
        sickness_days_used_in_year=0,
        max_sickness_days=182,
        certificates=[],
    )


def get_single_ezla_certificate_service(document_id: str) -> EzlaCertificateResponse:
    """Returns a specific e-ZLA certificate by its unique document ID."""
    normalized_doc = document_id.strip()
    if normalized_doc in PREDEFINED_EZLA_BY_DOC:
        return EzlaCertificateResponse.model_validate(PREDEFINED_EZLA_BY_DOC[normalized_doc])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Nie znaleziono zaświadczenia lekarskiego e-ZLA o identyfikatorze {document_id}",
    )
