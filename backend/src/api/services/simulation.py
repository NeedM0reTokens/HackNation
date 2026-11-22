from datetime import date

from fastapi import HTTPException, status

from ..data import (
    NAME_TO_PESEL,
    PREDEFINED_EZLA,
    PREDEFINED_EZLA_BY_DOC,
    PREDEFINED_PROFILES,
)
from ..models.simulation import (
    ActiveEzlaInfo,
    ContributionDebtCertificateResponse,
    ContributionDebtItem,
    EzlaCertificateResponse,
    EzlaCitizenResponse,
    MonthlyContribution,
    UserProfileResponse,
)
from .admin import config_service


def _generate_monthly_contributions(gross_amount: float) -> list[MonthlyContribution]:
    """
    Generates 12 monthly contribution records preceding current month.
    Each contribution deducts employee social security portion dynamically from config.
    """
    if gross_amount <= 0:
        return []

    cfg = config_service.get_config()
    social_rate = cfg.benefit_rates.social_contributions_rate

    contributions: list[MonthlyContribution] = []
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

    social_deducted = round(gross_amount * (social_rate / 100.0), 2)
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
    Returns simulated ZUS insurance profile for a person by their PESEL or user_id alias.
    If the PESEL/alias is recognized in the predefined scenarios, returns specific data.
    If an unknown PESEL is given, generates a realistic, legally compliant default profile.
    Statutory limits and thresholds are loaded dynamically from JSON config.
    """
    normalized_id = user_id_or_pesel.strip().lower()
    clean_pesel = NAME_TO_PESEL.get(normalized_id, normalized_id)
    cfg = config_service.get_config()
    statutory_debt_limit = cfg.benefit_amounts.zus_debt_limit

    if clean_pesel in PREDEFINED_PROFILES:
        raw = dict(PREDEFINED_PROFILES[clean_pesel])
        gross = float(raw["average_monthly_gross"])
        contributions = _generate_monthly_contributions(gross)

        active_ezla_list: list[ActiveEzlaInfo] = []
        for ez in raw.get("active_ezla", []):
            if isinstance(ez, dict):
                active_ezla_list.append(ActiveEzlaInfo.model_validate(ez))

        overdue_amt = float(raw["overdue_amount"])
        overdue_blocks = overdue_amt > statutory_debt_limit

        return UserProfileResponse(
            pesel=str(raw["pesel"]),
            user_id=str(raw.get("user_id", normalized_id)),
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
            overdue_amount=overdue_amt,
            overdue_blocks_benefits=overdue_blocks,
            has_active_ezla=bool(raw["has_active_ezla"]),
            active_ezla=active_ezla_list,
            sickness_days_used_in_year=int(raw["sickness_days_used_in_year"]),
            max_sickness_days=int(raw["max_sickness_days"]),
        )

    # Dynamic generation for any other custom PESEL
    dob, gender = _parse_pesel_details(clean_pesel)
    first_name = "Katarzyna" if gender == "Kobieta" else "Jan"
    last_name = "Kowalski"

    gross = 6000.0
    social_rate = cfg.benefit_rates.social_contributions_rate
    social_deducted = round(gross * (social_rate / 100.0), 2)
    net_base = round(gross - social_deducted, 2)
    contributions = _generate_monthly_contributions(gross)

    return UserProfileResponse(
        pesel=clean_pesel,
        user_id=clean_pesel,
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
        waiting_period_days_required=cfg.periods_and_limits.mandatory_waiting_period_days,
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
        max_sickness_days=cfg.periods_and_limits.max_standard_sick_leave_days,
    )


def get_citizen_ezla_service(pesel: str) -> EzlaCitizenResponse:
    """
    Returns electronic sick leave certificates (e-ZLA) for a citizen by PESEL or user_id.
    Simulates retrieval of e-ZLA incapacity certificates from the ZUS medical registry.
    """
    clean = pesel.strip().lower()
    clean_pesel = NAME_TO_PESEL.get(clean, pesel.strip())
    cfg = config_service.get_config()

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
            max_sickness_days=int(
                raw_profile.get(
                    "max_sickness_days", cfg.periods_and_limits.max_standard_sick_leave_days
                )
            ),
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
        max_sickness_days=cfg.periods_and_limits.max_standard_sick_leave_days,
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


def get_citizen_debt_certificate_service(
    pesel: str,
    entitlement_date: str | None = None,
) -> ContributionDebtCertificateResponse:
    """
    Simulates retrieval of contribution debt status and issuance of a ZUS certificate
    (RD-3) as of the date entitlement to benefits arose (Art. 2a of Sickness Benefits Act).
    Crucial for self-employed individuals (JDG/B2B) where arrears > 1% minimum wage
    suspend right to benefits. Threshold is loaded dynamically from JSON config.
    """
    clean = pesel.strip().lower()
    clean_pesel = NAME_TO_PESEL.get(clean, pesel.strip())
    cfg = config_service.get_config()
    statutory_debt_limit = cfg.benefit_amounts.zus_debt_limit

    if clean_pesel in PREDEFINED_PROFILES:
        raw = dict(PREDEFINED_PROFILES[clean_pesel])
        first_name = str(raw["first_name"])
        last_name = str(raw["last_name"])
        payer_name = raw.get("payer_name") or None
        payer_nip = raw.get("payer_nip") or None
        insurance_type = str(raw.get("insurance_type", ""))
        insurance_title = str(raw.get("insurance_title", ""))
        is_entrepreneur = insurance_type.upper() in {"JDG", "B2B"}
        has_overdue = bool(raw.get("has_overdue_contributions", False))
        overdue_amount = float(raw.get("overdue_amount", 0.0))

        if entitlement_date and entitlement_date.strip():
            effective_entitlement_date = entitlement_date.strip()
        else:
            active_ezla_list = raw.get("active_ezla", [])
            if (
                active_ezla_list
                and isinstance(active_ezla_list[0], dict)
                and active_ezla_list[0].get("start_date")
            ):
                effective_entitlement_date = str(active_ezla_list[0]["start_date"])
            else:
                effective_entitlement_date = date.today().isoformat()
    else:
        _dob, gender = _parse_pesel_details(clean_pesel)
        first_name = "Katarzyna" if gender == "Kobieta" else "Jan"
        last_name = "Kowalski"
        payer_name = "Przykładowy Płatnik Sp. z o.o."
        payer_nip = "1112223344"
        insurance_title = "Umowa o pracę (pracownik)"
        is_entrepreneur = False
        has_overdue = False
        overdue_amount = 0.0
        effective_entitlement_date = (
            entitlement_date.strip() if entitlement_date else date.today().isoformat()
        )

    overdue_blocks = overdue_amount > statutory_debt_limit
    issue_date = date.today().isoformat()
    date_path = effective_entitlement_date.replace("-", "/")
    certificate_id = f"ZUS/RD-3/{date_path}/{clean_pesel}"

    if overdue_amount <= 0.0 or not has_overdue:
        payment_status = "CLEARED"
        certificate_type = "ZAŚWIADCZENIE O NIEZALEGANIU W OPŁACANIU SKŁADEK"
        status_description = (
            f"Na dzień powstania prawa do świadczenia ({effective_entitlement_date}) płatnik "
            "nie posiada zaległości z tytułu składek na ubezpieczenia społeczne w rejestrach ZUS. "
            "Warunek określony w art. 2a ustawy zasiłkowej jest w pełni spełniony."
        )
        debt_items: list[ContributionDebtItem] = []
    elif not overdue_blocks:
        payment_status = "WITHIN_TOLERANCE"
        certificate_type = "ZAŚWIADCZENIE O STANIE ZADŁUŻENIA PONIŻEJ PROGU BLOKUJĄCEGO"
        status_description = (
            f"Na dzień powstania prawa do świadczenia ({effective_entitlement_date}) "
            f"stwierdzono zadłużenie w kwocie {overdue_amount:.2f} PLN. Kwota ta nie przekracza "
            f"progu 1% minimalnego wynagrodzenia ({statutory_debt_limit:.2f} PLN). "
            "Zadłużenie nie powoduje zawieszenia wypłaty świadczeń."
        )
        debt_items = [
            ContributionDebtItem(
                fund_name="Fundusz Ubezpieczeń Społecznych (FUS - składka chorobowa)",
                period="2026-03",
                due_amount=overdue_amount,
                interest_amount=0.0,
                total_item_amount=overdue_amount,
            )
        ]
    else:
        payment_status = "DEBT_BLOCKS_BENEFIT"
        certificate_type = "ZAŚWIADCZENIE O STANIE ZALEGŁOŚCI W OPŁACANIU SKŁADEK"
        status_description = (
            f"Na dzień powstania prawa do świadczenia ({effective_entitlement_date}) "
            f"stwierdzono zadłużenie z tytułu składek w łącznej wysokości {overdue_amount:.2f} "
            f"PLN, przekraczające próg 1% minimalnego wynagrodzenia "
            f"({statutory_debt_limit:.2f} PLN). Na podstawie art. 2a ust. 1 ustawy zasiłkowej "
            "wypłata świadczeń zostaje wstrzymana do czasu całkowitej spłaty zadłużenia."
        )
        principal = round(overdue_amount * 0.914, 2)
        interest = round(overdue_amount - principal, 2)
        debt_items = [
            ContributionDebtItem(
                fund_name="Fundusz Ubezpieczeń Społecznych (FUS - chorobowe i wypadkowe)",
                period="2026-03",
                due_amount=principal,
                interest_amount=interest,
                total_item_amount=overdue_amount,
            )
        ]

    legal_instruction = (
        "Zgodnie z art. 2a ust. 1 ustawy z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych "
        "z ubezpieczenia społecznego w razie choroby i macierzyństwa, świadczenia nie przysługują "
        "osobom prowadzącym pozarolniczą działalność i osobom z nimi współpracującym, jeżeli w "
        "dniu powstania prawa do świadczenia występuje zadłużenie z tytułu składek na kwotę "
        f"przekraczającą 1% minimalnego wynagrodzenia za pracę ({statutory_debt_limit:.2f} zł), "
        "do czasu spłaty całości zadłużenia. Zgodnie z art. 2a ust. 2, prawo do świadczenia "
        "przedawnia się, jeżeli zadłużenie nie zostanie spłacone w ciągu 6 miesięcy od dnia "
        "powstania prawa do świadczenia. W razie spłaty całości zadłużenia w terminie 6 miesięcy, "
        "świadczenie przysługuje za cały okres."
    )

    return ContributionDebtCertificateResponse(
        certificate_id=certificate_id,
        certificate_type=certificate_type,
        issue_date=issue_date,
        entitlement_date=effective_entitlement_date,
        source="ZUS Centralny Rejestr Płatników Składek (eZUS Mock)",
        pesel=clean_pesel,
        first_name=first_name,
        last_name=last_name,
        payer_name=payer_name,
        payer_nip=payer_nip,
        is_entrepreneur=is_entrepreneur,
        insurance_title=insurance_title,
        has_overdue_contributions=has_overdue,
        overdue_amount=overdue_amount,
        statutory_debt_limit=statutory_debt_limit,
        overdue_blocks_benefits=overdue_blocks,
        payment_status=payment_status,
        status_description=status_description,
        debt_items=debt_items,
        legal_basis=(
            "Art. 2a ustawy z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia "
            "społecznego w razie choroby i macierzyństwa"
        ),
        legal_instruction=legal_instruction,
    )
