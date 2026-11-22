from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class ApplicationCategory(StrEnum):
    """
    Kategoria wniosku:
    - EMPLOYER_LEAVE: Wniosek do pracodawcy o urlop pracowniczy (wymaga zaprojektowania
      zgodnie z Kodeksem Pracy i pomocniczym Rozporządzeniem MRPiPS z 11 marca 2025 r.).
    - ZUS_BENEFIT: Wniosek do ZUS o świadczenie / zasiłek (oficjalne sztywne druki
      dostępne na www.zus.pl, np. ZAM, ZAS-53, Z-3, Z-3a).
    - USC_CIVIL_ACT: Wniosek do Urzędu Stanu Cywilnego o wydanie odpisu aktu urodzenia
      dziecka z centralnego Rejestru Stanu Cywilnego (gov.pl / ePUAP).
    """

    EMPLOYER_LEAVE = "EMPLOYER_LEAVE"
    ZUS_BENEFIT = "ZUS_BENEFIT"
    USC_CIVIL_ACT = "USC_CIVIL_ACT"


class ApplicationType(StrEnum):
    """
    Szczegółowy typ wniosku:
    Wnioski o urlop do pracodawcy (projektowane):
    - UNIFIED_MATERNITY_PARENTAL_81_5: Jednolity wniosek o urlop macierzyński i rodzicielski
      w pełnym wymiarze (art. 179[1] KP, składany do 21 dni po porodzie, stawka 81,5%).
    - PATERNITY_LEAVE: Wniosek o urlop ojcowski (art. 182[3] KP, 14 dni lub 2x7 dni).
    - SUPPLEMENTARY_MATERNITY_LEAVE: Wniosek o uzupełniający urlop macierzyński dla rodziców
      wcześniaków lub dzieci hospitalizowanych po porodzie (art. 180[1] KP).
    - PARENTAL_WORK_COMBINATION: Wniosek o łączenie urlopu rodzicielskiego z wykonywaniem
      pracy u pracodawcy do 1/2 etatu z proporcjonalnym wydłużeniem (art. 182[1e] KP).
    - PARENTAL_LEAVE_PORTION: Wniosek o urlop rodzicielski lub jego część (np. 9 tygodni
      wyłącznego prawa drugiego rodzica, art. 182[1a] KP).

    Wnioski o zasiłki do ZUS (oficjalne formularze ZUS):
    - ZUS_ZAM: Zunifikowany wniosek o zasiłek macierzyński (zastępuje dawne ZUR i ZAO).
    - ZUS_ZAS_53: Wniosek o zasiłek chorobowy / macierzyński dla przedsiębiorców (JDG).
    - ZUS_Z3: Zaświadczenie płatnika składek dla pracowników (składane przez pracodawcę).
    - ZUS_Z3A: Zaświadczenie płatnika składek dla zleceniobiorców.

    Wnioski do Urzędu Stanu Cywilnego / Rejestru Stanu Cywilnego (gov.pl):
    - USC_BIRTH_CERTIFICATE_SHORT: Wniosek o wydanie odpisu skróconego aktu urodzenia dziecka.
    - USC_BIRTH_CERTIFICATE_FULL: Wniosek o wydanie odpisu zupełnego aktu urodzenia dziecka.
    """

    UNIFIED_MATERNITY_PARENTAL_81_5 = "UNIFIED_MATERNITY_PARENTAL_81_5"
    PATERNITY_LEAVE = "PATERNITY_LEAVE"
    SUPPLEMENTARY_MATERNITY_LEAVE = "SUPPLEMENTARY_MATERNITY_LEAVE"
    PARENTAL_WORK_COMBINATION = "PARENTAL_WORK_COMBINATION"
    PARENTAL_LEAVE_PORTION = "PARENTAL_LEAVE_PORTION"

    ZUS_ZAM = "ZUS_ZAM"
    ZUS_ZAS_53 = "ZUS_ZAS_53"
    ZUS_Z3 = "ZUS_Z3"
    ZUS_Z3A = "ZUS_Z3A"

    USC_BIRTH_CERTIFICATE_SHORT = "USC_BIRTH_CERTIFICATE_SHORT"
    USC_BIRTH_CERTIFICATE_FULL = "USC_BIRTH_CERTIFICATE_FULL"


class ApplicantData(BaseModel):
    """Dane identyfikacyjne wnioskodawcy."""

    first_name: str = Field(..., description="Imię wnioskodawcy", examples=["Anna"])
    last_name: str = Field(..., description="Nazwisko wnioskodawcy", examples=["Kowalska"])
    pesel: str = Field(..., description="Numer PESEL wnioskodawcy", examples=["92011501234"])
    date_of_birth: str | None = Field(
        default=None, description="Data urodzenia (YYYY-MM-DD)", examples=["1992-01-15"]
    )
    id_document_number: str | None = Field(
        default=None, description="Numer dowodu osobistego / paszportu", examples=["ABC123456"]
    )
    phone_number: str | None = Field(
        default=None, description="Numer telefonu", examples=["+48 600 100 200"]
    )
    email: str | None = Field(
        default=None, description="Adres e-mail", examples=["anna.kowalska@example.com"]
    )
    address_street: str | None = Field(
        default=None, description="Ulica i numer domu/lokalu", examples=["ul. Marszałkowska 10/12"]
    )
    address_postal_code: str | None = Field(
        default=None, description="Kod pocztowy", examples=["00-001"]
    )
    address_city: str | None = Field(default=None, description="Miejscowość", examples=["Warszawa"])


class EmployerData(BaseModel):
    """Dane pracodawcy / płatnika składek."""

    company_name: str = Field(
        ..., description="Pełna nazwa pracodawcy", examples=["TechPol Sp. z o.o."]
    )
    nip: str | None = Field(
        default=None, description="NIP płatnika (10 cyfr)", examples=["5250001090"]
    )
    regon: str | None = Field(default=None, description="REGON płatnika", examples=["123456789"])
    address_street: str | None = Field(
        default=None, description="Adres siedziby", examples=["Al. Jerozolimskie 100"]
    )
    address_postal_code: str | None = Field(
        default=None, description="Kod pocztowy siedziby", examples=["02-001"]
    )
    address_city: str | None = Field(
        default=None, description="Miejscowość siedziby", examples=["Warszawa"]
    )
    representative_name: str | None = Field(
        default=None, description="Osoba upoważniona / Dział Kadr", examples=["Dział Kadr i Płac"]
    )
    payer_size: str = Field(
        default="ABOVE_20",
        description="Wielkość płatnika (powyżej 20 ubezpieczonych wypłaca sam)",
        examples=["ABOVE_20"],
    )


class ChildData(BaseModel):
    """Dane dziecka, na które wnioskowany jest urlop lub zasiłek."""

    first_name: str | None = Field(default=None, description="Imię dziecka", examples=["Jan"])
    last_name: str | None = Field(
        default=None, description="Nazwisko dziecka", examples=["Kowalski"]
    )
    date_of_birth: str | None = Field(
        default=None, description="Data urodzenia dziecka (YYYY-MM-DD)", examples=["2026-05-01"]
    )
    birth_certificate_number: str | None = Field(
        default=None, description="Oznaczenie odpisu aktu urodzenia", examples=["AU/2026/12345"]
    )
    usc_city: str | None = Field(
        default=None,
        description="Urząd Stanu Cywilnego sporządzający akt",
        examples=["USC Warszawa-Śródmieście"],
    )
    gestational_age_weeks: int | None = Field(
        default=None, description="Tydzień ciąży w chwili porodu (wcześniak <37)", examples=[34]
    )
    birth_weight_grams: int | None = Field(
        default=None,
        description="Masa urodzeniowa w gramach (<1000g uprawnia do 15 tyg)",
        examples=[1800],
    )
    hospital_stay_weeks: int | None = Field(
        default=None, description="Liczba pełnych tygodni hospitalizacji po porodzie", examples=[4]
    )
    has_za_zyciem_certificate: bool = Field(
        default=False, description="Czy posiada zaświadczenie z ustawy 'Za życiem' (art. 4 ust. 3)"
    )


class LeavePeriodData(BaseModel):
    """Parametry wnioskowanego okresu urlopu / świadczenia."""

    start_date: str = Field(
        ..., description="Data początkowa (YYYY-MM-DD)", examples=["2026-05-01"]
    )
    end_date: str = Field(..., description="Data końcowa (YYYY-MM-DD)", examples=["2027-04-29"])
    weeks_count: int = Field(..., description="Liczba tygodni urlopu", examples=[52])
    days_count: int = Field(..., description="Liczba dni kalendarzowych urlopu", examples=[364])
    portion_number: int = Field(default=1, description="Numer części urlopu (1-5)", examples=[1])
    work_time_fraction: str | None = Field(
        default=None,
        description="Wymiar etatu przy łączeniu rodzicielskiego z pracą (np. 1/2, 1/3, 1/4)",
        examples=["1/2"],
    )
    selected_rate_variant: str = Field(
        default="UNIFIED_81_5",
        description="Wybrany wariant stawki zasiłku (UNIFIED_81_5 lub STANDARD_100_70)",
        examples=["UNIFIED_81_5"],
    )
    is_second_parent_exclusive_9w: bool = Field(
        default=False,
        description="Czy dotyczy 9 tygodni nieprzenoszalnego urlopu dla drugiego rodzica",
    )
    other_parent_name: str | None = Field(
        default=None, description="Imię i nazwisko drugiego rodzica", examples=["Piotr Kowalski"]
    )
    other_parent_pesel: str | None = Field(
        default=None, description="PESEL drugiego rodzica", examples=["89032005678"]
    )
    other_parent_declaration_attached: bool = Field(
        default=False,
        description="Czy dołączono oświadczenie drugiego rodzica o braku korzystania z urlopu",
    )


class RequiredAttachment(BaseModel):
    """Opis wymaganego załącznika prawnego do wniosku."""

    code: str = Field(..., description="Kod załącznika", examples=["BIRTH_CERTIFICATE"])
    title: str = Field(
        ..., description="Nazwa dokumentu", examples=["Skrócony odpis aktu urodzenia dziecka"]
    )
    description: str = Field(
        ...,
        description="Szczegóły formalne dokumentu",
        examples=[
            "Dokument z USC potwierdzający urodzenie dziecka lub kopia potwierdzona za zgodność"
        ],
    )
    is_mandatory: bool = Field(default=True, description="Czy załącznik jest bezwzględnie wymagany")
    is_provided: bool = Field(default=False, description="Czy wnioskodawca dołączył załącznik")
    legal_basis: str = Field(
        ...,
        description="Podstawa prawna obowiązku dołączenia załącznika",
        examples=["§ 18 ust. 1 Rozporządzenia MRPiPS z 11 marca 2025 r."],
    )


class ApplicationTemplateInfo(BaseModel):
    """Informacje o szablonie wniosku w systemie."""

    type: ApplicationType = Field(..., description="Typ identyfikatora wniosku")
    category: ApplicationCategory = Field(
        ..., description="Kategoria (EMPLOYER_LEAVE dla pracodawcy vs ZUS_BENEFIT dla ZUS)"
    )
    title: str = Field(..., description="Oficjalny tytuł wniosku")
    legal_basis: str = Field(..., description="Podstawa prawna (Kodeks Pracy / Ustawa zasiłkowa)")
    recipient_type: str = Field(
        ...,
        description="Odbiorca pisma (EMPLOYER - Pracodawca, ZUS - Zakład Ubezpieczeń Społecznych)",
    )
    deadline_description: str = Field(
        ..., description="Ustawowy termin na złożenie wniosku", examples=["Do 21 dni po porodzie"]
    )
    description: str = Field(..., description="Praktyczne wyjaśnienie celu wniosku")
    required_attachments: list[RequiredAttachment] = Field(
        default_factory=list, description="Lista wymaganych załączników formalnych"
    )
    is_custom_designed: bool = Field(
        ...,
        description=(
            "True jeśli formularz wymagał autorskiego zaprojektowania układu (wniosek o urlop do "
            "pracodawcy), False jeśli to oficjalny sztywny druk urzędowy ZUS dostępny na www.zus.pl"
        ),
    )
    official_form_number: str | None = Field(
        default=None, description="Numer formularza urzędowego jeśli dotyczy ZUS", examples=["ZAM"]
    )


class ApplicationCreateRequest(BaseModel):
    """Żądanie wygenerowania lub złożenia wniosku."""

    application_type: ApplicationType = Field(..., description="Typ generowanego wniosku")
    applicant: ApplicantData = Field(..., description="Dane wnioskodawcy")
    employer: EmployerData | None = Field(
        default=None, description="Dane pracodawcy (wymagane dla wniosków o urlopy)"
    )
    child: ChildData | None = Field(default=None, description="Dane dziecka")
    leave_period: LeavePeriodData = Field(..., description="Wnioskowany okres i parametry urlopu")
    bank_account_number: str | None = Field(
        default=None,
        description="Numer rachunku bankowego do wypłaty świadczenia (26 cyfr)",
        examples=["12102010260000123456789012"],
    )
    place_of_signing: str = Field(
        default="Warszawa", description="Miejscowość sporządzenia pisma", examples=["Warszawa"]
    )
    signing_date: str | None = Field(
        default=None, description="Data sporządzenia pisma (YYYY-MM-DD)", examples=["2026-05-02"]
    )
    additional_notes: str | None = Field(
        default=None,
        description="Dodatkowe uwagi wnioskodawcy",
        examples=["Wniosek składany w terminie 21 dni."],
    )
    attachments_provided: list[str] = Field(
        default_factory=list,
        description="Kody dołączonych załączników",
        examples=[["BIRTH_CERTIFICATE", "OTHER_PARENT_DECLARATION"]],
    )


class ApplicationPrefillRequest(BaseModel):
    """Parametry żądania auto-uzupełnienia formularza wniosku."""

    application_type: ApplicationType = Field(
        default=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
        description="Typ wniosku, który chcemy wypełnić",
    )
    pesel_or_user_id: str | None = Field(
        default="anna-kowalska",
        description="PESEL lub identyfikator użytkownika z symulacji tożsamości mObywatel",
    )
    child_birth_date: str | None = Field(
        default=None, description="Data urodzenia dziecka (YYYY-MM-DD) do wyliczenia harmonogramu"
    )
    selected_variant: str = Field(
        default="UNIFIED_81_5",
        description="Wybrany wariant zasiłku (UNIFIED_81_5 lub STANDARD_100_70)",
    )
    calculator_state: dict[str, Any] | None = Field(
        default=None, description="Opcjonalny stan parametrów z kalkulatora zasiłkowego"
    )


class ApplicationPrefillResponse(BaseModel):
    """Zwrócone dane prefill do formularza w UI."""

    application_type: ApplicationType
    template_info: ApplicationTemplateInfo
    applicant: ApplicantData
    employer: EmployerData
    child: ChildData
    leave_period: LeavePeriodData
    required_attachments: list[RequiredAttachment]
    advisory_notes: list[str] = Field(default_factory=list)


class SubmissionRequest(BaseModel):
    """Parametry symulacji przesłania wniosku do odbiorcy."""

    delivery_channel: str = Field(
        default="ELECTRONIC",
        description="Kanał złożenia pisma (ELECTRONIC, PUE_EZUS, PAPER_PRINT)",
    )
    destination: str | None = Field(
        default=None,
        description="Adresat wniosku (np. EMPLOYER, ZUS)",
    )
    delivery_method: str | None = Field(
        default=None,
        description="Metoda doręczenia (np. PORTAL_PRACOWNICZY, PUE_EZUS, OSOBISCIE)",
    )
    recipient_email: str | None = Field(
        default="kadry@techpol.pl", description="Adres e-mail działu kadr lub skrzynki podawczej"
    )
    notes: str | None = Field(
        default=None,
        description="Dodatkowe uwagi wnioskodawcy przy składaniu wniosku",
    )
    confirm_truthfulness: bool = Field(
        default=True,
        description="Potwierdzenie zapoznania się z pouczeniem i odpowiedzialności prawnej",
    )


class SubmissionConfirmation(BaseModel):
    """Potwierdzenie formalnego wpływu i złożenia wniosku (odpowiednik UPO / UPPO)."""

    application_id: str = Field(..., description="Identyfikator wniosku w systemie")
    case_number: str = Field(
        ...,
        description="Urzędowy numer sprawy / znak kancelaryjny",
        examples=["KADR/2026/05/0087", "ZUS-PUE-2026-92011501234-ZAM-19284"],
    )
    submitted_at: str = Field(..., description="Sygnatura czasowa złożenia (ISO 8601)")
    recipient_name: str = Field(
        ..., description="Nazwa odbiorcy (Pracodawca lub właściwy oddział ZUS)"
    )
    channel: str = Field(..., description="Zastosowany kanał doręczenia")
    status: str = Field(
        ...,
        description="Status procesowania (np. ZŁOŻONO_DO_PRACODAWCY, PRZEKAZANO_DO_ZUS)",
        examples=["SUBMITTED_TO_EMPLOYER", "SUBMITTED_TO_ZUS"],
    )
    upo_reference_code: str = Field(
        ...,
        description="Kryptograficzny identyfikator Urzędowego Poświadczenia Odbioru (UPO/UPPO)",
        examples=["UPO-7F9B1E4A-2026-0502-140221"],
    )
    next_steps: list[str] = Field(
        ..., description="Kolejne kroki proceduralne dla pracownika i pracodawcy"
    )
    legal_notices: list[str] = Field(
        ..., description="Pouczenia prawne wynikające z Kodeksu pracy i ustawy zasiłkowej"
    )


class ApplicationDetailResponse(BaseModel):
    """Pełne szczegóły wygenerowanego wniosku wraz z formalną treścią pisma."""

    id: str = Field(..., description="Unikalny identyfikator wygenerowanego wniosku")
    application_type: ApplicationType
    category: ApplicationCategory
    title: str
    legal_basis: str
    recipient_header: str
    created_at: str
    status: str = Field(
        default="DRAFT",
        description="Status wniosku (DRAFT, SUBMITTED_TO_EMPLOYER, SUBMITTED_TO_ZUS)",
    )
    applicant: ApplicantData
    employer: EmployerData | None = None
    child: ChildData | None = None
    leave_period: LeavePeriodData
    required_attachments: list[RequiredAttachment]
    formal_content_text: str = Field(
        ...,
        description="Pełna treść pisma urzędowego/pracowniczego przygotowana do podglądu i druku",
    )
    submission_confirmation: SubmissionConfirmation | None = None
