from pydantic import BaseModel, Field


class MonthlyContribution(BaseModel):
    """Monthly contribution base reported to ZUS."""

    month: str = Field(..., description="Miesiąc rozliczeniowy (YYYY-MM)", examples=["2025-10"])
    gross_amount: float = Field(
        ..., description="Przychód brutto stanowiący podstawę wymiaru w PLN"
    )
    social_contributions_deducted: float = Field(
        ..., description="Odliczone składki na ubezpieczenia społeczne (13.71%)"
    )
    net_base: float = Field(..., description="Podstawa wymiaru netto po potrąceniu 13.71%")


class ActiveEzlaInfo(BaseModel):
    """Electronic sick leave (e-ZLA) certificate summary registered in ZUS."""

    document_id: str = Field(..., description="Identyfikator zaświadczenia e-ZLA")
    medical_code: str | None = Field(
        None, description="Kod literowy ZUS (np. 'B' - ciąża, 'A' - po przerwie <60 dni)"
    )
    start_date: str = Field(..., description="Początek okresu zwolnienia lekarskiego")
    end_date: str = Field(..., description="Koniec okresu zwolnienia lekarskiego")
    days_count: int = Field(..., description="Liczba dni kalendarzowych zwolnienia")
    doctor_name: str = Field(..., description="Lekarz wystawiający zaświadczenie")


class EzlaCertificateResponse(BaseModel):
    """Detailed electronic medical certificate (e-ZLA) for incapacity to work."""

    document_id: str = Field(..., description="Unikalny identyfikator dokumentu e-ZLA")
    series_number: str = Field(..., description="Seria i numer zaświadczenia lekarskiego")
    medical_code: str | None = Field(
        None, description="Kod literowy ZUS (np. 'B' - ciąża, 'A' - ponowna choroba <60 dni)"
    )
    code_description: str | None = Field(None, description="Prawne znaczenie kodu literowego ZUS")
    start_date: str = Field(..., description="Początek okresu orzeczonej niezdolności do pracy")
    end_date: str = Field(..., description="Koniec okresu orzeczonej niezdolności do pracy")
    days_count: int = Field(..., description="Liczba dni kalendarzowych zwolnienia")
    recommendation_code: str = Field(
        ..., description="Zalecenie: '1' - chory powinien leżeć, '2' - chory może chodzić"
    )
    recommendation_description: str = Field(..., description="Opis zalecenia lekarskiego")
    doctor_name: str = Field(..., description="Imię i nazwisko lekarza orzecznika")
    doctor_pwz: str = Field(..., description="Numer Prawa Wykonywania Zawodu (PWZ) lekarza")
    doctor_specialization: str | None = Field(None, description="Specjalizacja lekarza")
    medical_facility: str = Field(
        ..., description="Nazwa podmiotu leczniczego wystawiającego e-ZLA"
    )
    is_pregnancy: bool = Field(False, description="Czy zwolnienie jest z tytułu ciąży (kod B)")
    benefit_percentage: float = Field(
        80.0, description="Wysokość stawki zasiłku (100% dla kodu B, 80% standard, 70% szpital)"
    )
    disbursing_entity: str = Field(
        "EMPLOYER",
        description="Podmiot wypłacający: EMPLOYER (wynagrodzenie chorobowe do 33/14 dni) lub ZUS",
    )
    status: str = Field("ACTIVE", description="Status zaświadczenia: ACTIVE, HISTORICAL, CANCELLED")
    payer_name: str | None = Field(None, description="Nazwa płatnika składek")
    payer_nip: str | None = Field(None, description="NIP płatnika składek")


class EzlaCitizenResponse(BaseModel):
    """Citizen's electronic sick leave certificates preview from ZUS."""

    pesel: str = Field(..., description="Numer PESEL ubezpieczonego")
    first_name: str = Field(..., description="Imię")
    last_name: str = Field(..., description="Nazwisko")
    date_of_birth: str = Field(..., description="Data urodzenia (YYYY-MM-DD)")
    gender: str = Field(..., description="Płeć")
    source: str = Field(
        default="ZUS Rejestr Zaświadczeń Lekarskich (e-ZLA Mock)",
        description="Źródło danych",
    )
    has_active_ezla: bool = Field(
        False, description="Czy ubezpieczony posiada obecnie aktywne zaświadczenie e-ZLA"
    )
    total_certificates_count: int = Field(
        0, description="Łączna liczba zarejestrowanych zaświadczeń e-ZLA"
    )
    active_certificates_count: int = Field(
        0, description="Liczba aktualnie trwających zwolnień lekarskich"
    )
    sickness_days_used_in_year: int = Field(
        0, description="Liczba dni zasiłkowych wykorzystanych w bieżącym roku kalendarzowym"
    )
    max_sickness_days: int = Field(
        182, description="Maksymalny limit okresu zasiłkowego (270 dni w ciąży, 182 standard)"
    )
    certificates: list[EzlaCertificateResponse] = Field(
        default_factory=list, description="Lista zaświadczeń lekarskich e-ZLA"
    )


class UserProfileResponse(BaseModel):
    """
    Detailed ZUS insurance status simulation response for a citizen (by PESEL).
    Models actual ZUS records required to determine entitlement to parental and sickness benefits.
    """

    # Identifiers
    pesel: str = Field(..., description="Numer PESEL ubezpieczonego")
    first_name: str = Field(..., description="Imię")
    last_name: str = Field(..., description="Nazwisko")
    date_of_birth: str = Field(..., description="Data urodzenia (YYYY-MM-DD)")
    gender: str = Field(..., description="Płeć (Kobieta / Mężczyzna)")
    source: str = Field(
        default="ZUS Centralny Rejestr Ubezpieczonych (eZUS Mock)",
        description="Źródło danych",
    )

    # Insurance Status
    has_insurance: bool = Field(
        ..., description="Czy osoba podlega aktualnie ubezpieczeniom społecznym"
    )
    insurance_status: str = Field(
        ..., description="Status ubezpieczenia: ACTIVE, NOT_INSURED, SUSPENDED"
    )
    insurance_title: str = Field(
        ...,
        description=(
            "Tytuł ubezpieczenia (np. Umowa o pracę, Umowa zlecenie, Działalność gospodarcza)"
        ),
    )
    insurance_type: str = Field(
        ..., description="Skrócony kod typu ubezpieczenia (UoP, Zlecenie, JDG, Brak)"
    )
    employment_type: str = Field(
        ...,
        description=("Kod typu zatrudnienia: EMPLOYMENT_CONTRACT, MANDATE_CONTRACT, B2B, NONE"),
    )

    # Sickness Insurance details (Art. 1, 4, 29 Ustawy zasiłkowej)
    has_sickness_insurance: bool = Field(
        ..., description="Czy osoba podlega ubezpieczeniu chorobowemu (warunek prawa do zasiłków)"
    )
    sickness_insurance_type: str = Field(
        ...,
        description="Tryb ubezpieczenia chorobowego: MANDATORY (UoP), VOLUNTARY (Zlecenie/JDG)",
    )
    insurance_start_date: str | None = Field(
        None, description="Data objęcia aktualnym ubezpieczeniem chorobowym"
    )
    insurance_duration_days: int = Field(
        ..., description="Łączny nieprzerwany staż ubezpieczenia chorobowego w dniach"
    )
    waiting_period_days_required: int = Field(
        ..., description="Wymagany ustawowy okres wyczekiwania (30 dni UoP / 90 dni inne)"
    )
    waiting_period_satisfied: bool = Field(
        ..., description="Czy warunek okresu wyczekiwania został spełniony"
    )

    # Contribution Base (Art. 36-48 Ustawy zasiłkowej, średnia z 12 miesięcy -13.71%)
    average_monthly_gross: float = Field(
        ...,
        description="Przeciętna miesięczna podstawa wymiaru brutto z ostatnich 12 miesięcy (PLN)",
    )
    calculation_base_net: float = Field(
        ..., description="Podstawa wymiaru zasiłku po potrąceniu 13.71% składek społecznych (PLN)"
    )
    monthly_contributions_12m: list[MonthlyContribution] = Field(
        default_factory=list, description="Wykaz podstaw wymiaru składek za ostatnie 12 miesięcy"
    )

    # Contribution Payer (Art. 61 Ustawy zasiłkowej)
    payer_name: str | None = Field(None, description="Nazwa płatnika składek (pracodawcy)")
    payer_nip: str | None = Field(None, description="NIP płatnika składek")
    is_large_payer: bool = Field(
        True,
        description="Czy płatnik zatrudnia >20 ubezpieczonych (wypłata pracodawca vs ZUS)",
    )

    # Contribution Debt Verification (Art. 2a Ustawy zasiłkowej)
    has_overdue_contributions: bool = Field(..., description="Czy występuje zadłużenie składkowe")
    overdue_amount: float = Field(0.0, description="Kwota zadłużenia składkowego w PLN")
    overdue_blocks_benefits: bool = Field(
        False,
        description="Czy zadłużenie >1% minimalnego wynagrodzenia (48,06 zł) blokuje zasiłek",
    )

    # Medical Certificates e-ZLA
    has_active_ezla: bool = Field(
        False, description="Czy zarejestrowano aktywne zwolnienie e-ZLA w ZUS"
    )
    active_ezla: list[ActiveEzlaInfo] = Field(
        default_factory=list, description="Lista aktywnych zaświadczeń e-ZLA"
    )
    sickness_days_used_in_year: int = Field(
        0, description="Liczba dni zasiłkowych wykorzystanych w bieżącym roku"
    )
    max_sickness_days: int = Field(
        270, description="Maksymalny limit okresu zasiłkowego (270 dni w ciąży, 182 dni standard)"
    )
