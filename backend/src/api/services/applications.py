import datetime
import io
import unicodedata
import uuid
from typing import Any

from fastapi import HTTPException, status
from pypdf import PdfReader

try:
    import cairo  # pyright: ignore[reportMissingImports]

    HAS_CAIRO = True
except ImportError:
    cairo: Any = None
    HAS_CAIRO = False  # pyright: ignore[reportConstantRedefinition]

from ..models.applications import (
    ApplicantData,
    ApplicationCategory,
    ApplicationCreateRequest,
    ApplicationDetailResponse,
    ApplicationPrefillRequest,
    ApplicationPrefillResponse,
    ApplicationTemplateInfo,
    ApplicationType,
    ChildData,
    EmployerData,
    LeavePeriodData,
    RequiredAttachment,
    SubmissionConfirmation,
    SubmissionRequest,
)
from .simulation import get_mock_user_profile_service

APPLICATIONS_STORE: dict[str, ApplicationDetailResponse] = {}


def _get_required_attachments_for_type(app_type: ApplicationType) -> list[RequiredAttachment]:
    if app_type == ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5:
        return [
            RequiredAttachment(
                code="BIRTH_CERTIFICATE",
                title="Skrócony odpis aktu urodzenia dziecka",
                description=(
                    "Odpis z Urzędu Stanu Cywilnego potwierdzający urodzenie dziecka "
                    "lub jego urzędowo poświadczona kopia."
                ),
                is_mandatory=True,
                legal_basis=(
                    "§ 18 ust. 1 Rozporządzenia MRPiPS z 11 marca 2025 r. "
                    "w zw. z art. 179[1] § 2 KP"
                ),
            ),
            RequiredAttachment(
                code="OTHER_PARENT_DECLARATION",
                title="Oświadczenie drugiego rodzica dziecka",
                description=(
                    "Pisemne oświadczenie ojca/drugiego rodzica o braku zamiaru "
                    "korzystania z urlopu rodzicielskiego w tym samym okresie."
                ),
                is_mandatory=True,
                legal_basis="§ 19 ust. 2 pkt 3 Rozporządzenia MRPiPS z 11 marca 2025 r.",
            ),
        ]

    if app_type == ApplicationType.PATERNITY_LEAVE:
        return [
            RequiredAttachment(
                code="BIRTH_CERTIFICATE",
                title="Skrócony odpis aktu urodzenia dziecka",
                description="Dokument z USC potwierdzający pokrewieństwo i datę urodzenia dziecka.",
                is_mandatory=True,
                legal_basis="§ 21 ust. 1 pkt 1 Rozporządzenia MRPiPS z 11 marca 2025 r.",
            ),
            RequiredAttachment(
                code="FATHER_DECLARATION",
                title="Oświadczenie pracownika-ojca",
                description=(
                    "Oświadczenie ojca, czy urlop ojcowski był już wcześniej "
                    "wykorzystany w całości lub w części (np. 7 dni)."
                ),
                is_mandatory=True,
                legal_basis="§ 21 ust. 1 pkt 2 Rozporządzenia MRPiPS z 11 marca 2025 r.",
            ),
        ]

    if app_type == ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE:
        return [
            RequiredAttachment(
                code="HOSPITAL_CERTIFICATE",
                title="Zaświadczenie szpitala o okresie hospitalizacji dziecka",
                description=(
                    "Zaświadczenie podmiotu leczniczego o dacie przyjęcia i wypisu "
                    "dziecka ze szpitala po porodzie."
                ),
                is_mandatory=True,
                legal_basis="Art. 180[1] § 5 KP w zw. z przepisami wykonawczymi MRPiPS",
            ),
            RequiredAttachment(
                code="BIRTH_WEIGHT_CERTIFICATE",
                title="Dokumentacja medyczna wagi urodzeniowej i tygodnia ciąży",
                description=(
                    "Karta informacyjna potwierdzająca masę urodzeniową (do 1000g) "
                    "lub tydzień ciąży (przedwczesny poród)."
                ),
                is_mandatory=True,
                legal_basis="Art. 180[1] § 1-3 Kodeksu pracy",
            ),
            RequiredAttachment(
                code="ZA_ZYCIEM_CERTIFICATE",
                title="Zaświadczenie z ustawy 'Za życiem' (art. 4 ust. 3)",
                description=(
                    "Zaświadczenie lekarza ubezpieczenia zdrowotnego o ciężkim "
                    "upośledzeniu albo nieuleczalnej chorobie."
                ),
                is_mandatory=False,
                legal_basis="Ustawa z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży",
            ),
        ]

    if app_type == ApplicationType.PARENTAL_WORK_COMBINATION:
        return [
            RequiredAttachment(
                code="WORK_SCHEDULE_PROPOSAL",
                title="Wniosek o rozkład czasu pracy na część etatu",
                description="Propozycja rozkładu czasu pracy u pracodawcy w wymiarze do 1/2 etatu.",
                is_mandatory=True,
                legal_basis="Art. 182[1e] § 2 Kodeksu pracy",
            ),
            RequiredAttachment(
                code="PREVIOUS_LEAVE_SUMMARY",
                title="Oświadczenie o dotychczasowym wymiarze urlopu rodzicielskiego",
                description="Informacja o liczbie tygodni urlopu już wykorzystanych na to dziecko.",
                is_mandatory=True,
                legal_basis="§ 20 Rozporządzenia MRPiPS z 11 marca 2025 r.",
            ),
        ]

    if app_type == ApplicationType.PARENTAL_LEAVE_PORTION:
        return [
            RequiredAttachment(
                code="BIRTH_CERTIFICATE",
                title="Skrócony odpis aktu urodzenia dziecka",
                description="Odpis z USC potwierdzający wiek dziecka.",
                is_mandatory=True,
                legal_basis="§ 19 ust. 1 Rozporządzenia MRPiPS z 11 marca 2025 r.",
            ),
            RequiredAttachment(
                code="PREVIOUS_PARTS_RECORD",
                title="Oświadczenie o wykorzystanych dotychczas częściach urlopu",
                description="Oświadczenie o dotychczasowych częściach urlopu rodzicielskiego.",
                is_mandatory=True,
                legal_basis="Art. 182[1c] Kodeksu pracy",
            ),
        ]

    if app_type == ApplicationType.ZUS_ZAM:
        return [
            RequiredAttachment(
                code="BIRTH_CERTIFICATE",
                title="Odpis skrócony aktu urodzenia dziecka",
                description="Wymagany do ustalenia prawa do zasiłku macierzyńskiego przez ZUS.",
                is_mandatory=True,
                legal_basis="Art. 61 ust. 1 ustawy zasiłkowej",
            ),
            RequiredAttachment(
                code="PAYER_CERTIFICATE_Z3_OR_Z3A",
                title="Zaświadczenie płatnika składek Z-3 lub Z-3a",
                description="Przekazywane przez płatnika składek w celu ustalenia zasiłku.",
                is_mandatory=True,
                legal_basis="Art. 61 ust. 3 ustawy zasiłkowej",
            ),
        ]

    if app_type == ApplicationType.ZUS_ZAS_53:
        return [
            RequiredAttachment(
                code="BIRTH_CERTIFICATE",
                title="Odpis aktu urodzenia dziecka",
                description="Potwierdzenie urodzenia dziecka dla ZUS.",
                is_mandatory=True,
                legal_basis="Art. 61 ust. 1 ustawy zasiłkowej",
            ),
            RequiredAttachment(
                code="CONTRIBUTIONS_STATUS_DECLARATION",
                title="Oświadczenie o uregulowaniu składek ZUS",
                description="Oświadczenie o braku długu składkowego powyżej 1% minimalnej płacy.",
                is_mandatory=True,
                legal_basis="Art. 2a ustawy o świadczeniach pieniężnych z ub. społecznego",
            ),
        ]

    if app_type == ApplicationType.ZUS_Z3:
        return [
            RequiredAttachment(
                code="EMPLOYEE_LEAVE_APPLICATION_COPY",
                title="Kopia wniosku pracownika o urlop macierzyński/rodzicielski",
                description="Kopia wniosku złożonego u pracodawcy.",
                is_mandatory=True,
                legal_basis="Instrukcja ZUS do formularza Z-3",
            ),
            RequiredAttachment(
                code="PAYROLL_12M_REPORTS",
                title="Zestawienie składników wynagrodzenia za 12 miesięcy",
                description="Podstawa wymiaru składek z ostatnich 12 miesięcy kalendarzowych.",
                is_mandatory=True,
                legal_basis="Art. 36-47 ustawy zasiłkowej",
            ),
        ]

    return [
        RequiredAttachment(
            code="MANDATE_CONTRACT_COPY",
            title="Kopia umowy zlecenia oraz rachunków",
            description="Dokumentacja potwierdzająca ubezpieczenie chorobowe zleceniobiorcy.",
            is_mandatory=True,
            legal_basis="Instrukcja ZUS do formularza Z-3a",
        )
    ]


TEMPLATES_CATALOG: dict[ApplicationType, ApplicationTemplateInfo] = {
    ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5: ApplicationTemplateInfo(
        type=ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5,
        category=ApplicationCategory.EMPLOYER_LEAVE,
        title=(
            "Wniosek pracownicy o udzielenie urlopu macierzyńskiego "
            "i rodzicielskiego w pełnym wymiarze (wniosek ZAM o wariant ujednolicony)"
        ),
        legal_basis=(
            "Art. 179[1] Kodeksu pracy w zw. z art. 30a ustawy z dnia 25 czerwca 1999 r. "
            "o świadczeniach pieniężnych oraz Rozporządzenie MRPiPS z 11 marca 2025 r."
        ),
        recipient_type="EMPLOYER",
        deadline_description="Nie później niż 21 dni po porodzie",
        description=(
            "Wniosek składany do pracodawcy przez matkę na umowie o pracę. Obejmuje 20 tyg. urlopu "
            "macierzyńskiego oraz 32 tyg. rodzicielskiego (52 tyg. łącznie). Gwarantuje stawkę "
            "zasiłku 81,5% za cały okres. Płatnik pow. 20 ubezpieczonych wypłaca sam; "
            "do 20 ubezpieczonych przekazuje Z-3 do ZUS."
        ),
        required_attachments=_get_required_attachments_for_type(
            ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5
        ),
        is_custom_designed=True,
        official_form_number=None,
    ),
    ApplicationType.PATERNITY_LEAVE: ApplicationTemplateInfo(
        type=ApplicationType.PATERNITY_LEAVE,
        category=ApplicationCategory.EMPLOYER_LEAVE,
        title="Wniosek pracownika-ojca o udzielenie urlopu ojcowskiego",
        legal_basis="Art. 182[3] Kodeksu pracy oraz Rozporządzenie MRPiPS z 11 marca 2025 r.",
        recipient_type="EMPLOYER",
        deadline_description="Nie później niż na 7 dni przed rozpoczęciem korzystania z urlopu",
        description=(
            "Składany do pracodawcy przez ojca wychowującego dziecko. Wymiar wynosi 2 tygodnie "
            "(14 dni) z zasiłkiem 100%. Może być wykorzystany jednorazowo lub w 2 częściach "
            "po 7 dni do ukończenia przez dziecko 12. miesiąca życia."
        ),
        required_attachments=_get_required_attachments_for_type(ApplicationType.PATERNITY_LEAVE),
        is_custom_designed=True,
        official_form_number=None,
    ),
    ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE: ApplicationTemplateInfo(
        type=ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE,
        category=ApplicationCategory.EMPLOYER_LEAVE,
        title=(
            "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego "
            "dla rodziców wcześniaków i hospitalizowanych noworodków"
        ),
        legal_basis="Art. 180[1] Kodeksu pracy oraz Rozporządzenie MRPiPS z 11 marca 2025 r.",
        recipient_type="EMPLOYER",
        deadline_description="Nie później niż na 21 dni przed zakończeniem urlopu macierzyńskiego",
        description=(
            "Uprawnienie dla rodziców dzieci urodzonych przed 37. tygodniem ciąży lub "
            "hospitalizowanych po porodzie. Wymiar wynosi do 8 tygodni (lub do 15 tygodni dla "
            "skrajnych wcześniaków <=1000g). Zasiłek wynosi 100% podstawy."
        ),
        required_attachments=_get_required_attachments_for_type(
            ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE
        ),
        is_custom_designed=True,
        official_form_number=None,
    ),
    ApplicationType.PARENTAL_WORK_COMBINATION: ApplicationTemplateInfo(
        type=ApplicationType.PARENTAL_WORK_COMBINATION,
        category=ApplicationCategory.EMPLOYER_LEAVE,
        title=(
            "Wniosek o łączenie urlopu rodzicielskiego z wykonywaniem pracy "
            "u pracodawcy w niepełnym wymiarze"
        ),
        legal_basis="Art. 182[1e] Kodeksu pracy oraz Rozporządzenie MRPiPS z 11 marca 2025 r.",
        recipient_type="EMPLOYER",
        deadline_description="Nie później niż na 21 dni przed rozpoczęciem wykonywania pracy",
        description=(
            "Umożliwia podjęcie pracy u pracodawcy w wymiarze do 1/2 etatu podczas urlopu "
            "rodzicielskiego z proporcjonalnym wydłużeniem urlopu (np. 8 tyg. pracy na 1/2 etatu "
            "wydłuża urlop o 4 tygodnie)."
        ),
        required_attachments=_get_required_attachments_for_type(
            ApplicationType.PARENTAL_WORK_COMBINATION
        ),
        is_custom_designed=True,
        official_form_number=None,
    ),
    ApplicationType.PARENTAL_LEAVE_PORTION: ApplicationTemplateInfo(
        type=ApplicationType.PARENTAL_LEAVE_PORTION,
        category=ApplicationCategory.EMPLOYER_LEAVE,
        title=(
            "Wniosek o udzielenie części urlopu rodzicielskiego "
            "(w tym 9 tygodni nieprzenoszalnych dla drugiego rodzica)"
        ),
        legal_basis=(
            "Art. 182[1a] i art. 182[1c] Kodeksu pracy "
            "oraz Rozporządzenie MRPiPS z 11 marca 2025 r."
        ),
        recipient_type="EMPLOYER",
        deadline_description="Nie później niż na 21 dni przed rozpoczęciem części urlopu",
        description=(
            "Wniosek o udzielenie urlopu rodzicielskiego w częściach (do 5 części). "
            "Stosowany m.in. przez ojca dziecka ubiegającego się o 9 tygodni nieprzenoszalne "
            "(stawka 70%)."
        ),
        required_attachments=_get_required_attachments_for_type(
            ApplicationType.PARENTAL_LEAVE_PORTION
        ),
        is_custom_designed=True,
        official_form_number=None,
    ),
    ApplicationType.ZUS_ZAM: ApplicationTemplateInfo(
        type=ApplicationType.ZUS_ZAM,
        category=ApplicationCategory.ZUS_BENEFIT,
        title="ZAM - Wniosek o zasiłek macierzyński za okres macierzyńskiego / rodzicielskiego",
        legal_basis=(
            "Art. 30a i art. 31 ustawy z dnia 25 czerwca 1999 r. "
            "o świadczeniach pieniężnych z ubezpieczenia społecznego"
        ),
        recipient_type="ZUS",
        deadline_description="Do 21 dni po porodzie dla stawki 81,5% lub w toku urlopu",
        description=(
            "Oficjalny formularz ZUS dostępny na stronie www.zus.pl i portalu eZUS / PUE. "
            "Zastępuje dawne formularze ZUR i ZAO. Składany do ZUS przez zleceniobiorczynie "
            "lub pracowników małych firm do 20 ubezpieczonych."
        ),
        required_attachments=_get_required_attachments_for_type(ApplicationType.ZUS_ZAM),
        is_custom_designed=False,
        official_form_number="ZAM",
    ),
    ApplicationType.ZUS_ZAS_53: ApplicationTemplateInfo(
        type=ApplicationType.ZUS_ZAS_53,
        category=ApplicationCategory.ZUS_BENEFIT,
        title=(
            "ZAS-53 - Wniosek o zasiłek chorobowy / macierzyński z ubezpieczenia "
            "chorobowego dla przedsiębiorców"
        ),
        legal_basis="Art. 61 ust. 1 ustawy zasiłkowej",
        recipient_type="ZUS",
        deadline_description="Przed upływem 6 miesięcy od zakończenia pobierania zasiłku",
        description=(
            "Oficjalny druk ZUS dla osób prowadzących pozarolniczą działalność (JDG) opłacających "
            "dobrowolną składkę chorobową. Wymaga weryfikacji zadłużenia składkowego."
        ),
        required_attachments=_get_required_attachments_for_type(ApplicationType.ZUS_ZAS_53),
        is_custom_designed=False,
        official_form_number="ZAS-53",
    ),
    ApplicationType.ZUS_Z3: ApplicationTemplateInfo(
        type=ApplicationType.ZUS_Z3,
        category=ApplicationCategory.ZUS_BENEFIT,
        title="Z-3 - Zaświadczenie płatnika składek (dla pracowników)",
        legal_basis=(
            "Rozporządzenie MRPiPS w sprawie zakresu informacji wykazywanych w zaświadczeniach"
        ),
        recipient_type="ZUS",
        deadline_description="Niezwłocznie po wpłynięciu wniosku pracownika (płatnik do 20 osób)",
        description=(
            "Urzędowy druk ZUS wypełniany przez pracodawcę zatrudniającego do 20 ubezpieczonych "
            "w celu przekazania do ZUS podstawy wymiaru składek z 12 miesięcy."
        ),
        required_attachments=_get_required_attachments_for_type(ApplicationType.ZUS_Z3),
        is_custom_designed=False,
        official_form_number="Z-3",
    ),
    ApplicationType.ZUS_Z3A: ApplicationTemplateInfo(
        type=ApplicationType.ZUS_Z3A,
        category=ApplicationCategory.ZUS_BENEFIT,
        title="Z-3a - Zaświadczenie płatnika składek (dla zleceniobiorców)",
        legal_basis=(
            "Rozporządzenie MRPiPS w sprawie zakresu informacji wykazywanych w zaświadczeniach"
        ),
        recipient_type="ZUS",
        deadline_description="Niezwłocznie po przedłożeniu dokumentacji przez zleceniobiorcę",
        description="Urzędowy druk ZUS składany przez zleceniodawcę dla zleceniobiorcy.",
        required_attachments=_get_required_attachments_for_type(ApplicationType.ZUS_Z3A),
        is_custom_designed=False,
        official_form_number="Z-3a",
    ),
}


def list_application_templates_service(
    category: ApplicationCategory | None = None,
) -> list[ApplicationTemplateInfo]:
    items = list(TEMPLATES_CATALOG.values())
    if category is not None:
        items = [t for t in items if t.category == category]
    return items


def get_application_template_service(app_type: ApplicationType) -> ApplicationTemplateInfo:
    template = TEMPLATES_CATALOG.get(app_type)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nie znaleziono szablonu wniosku dla typu '{app_type.value}'.",
        )
    return template


def prefill_application_service(req: ApplicationPrefillRequest) -> ApplicationPrefillResponse:
    template = get_application_template_service(req.application_type)
    user_id_or_pesel = req.pesel_or_user_id or "anna-kowalska"
    user_profile = get_mock_user_profile_service(user_id_or_pesel)

    applicant = ApplicantData(
        first_name=user_profile.first_name,
        last_name=user_profile.last_name,
        pesel=user_profile.pesel,
        date_of_birth=user_profile.date_of_birth,
        id_document_number="CBA987654",
        phone_number="+48 601 234 567",
        email=f"{user_profile.first_name.lower()}.{user_profile.last_name.lower()}@example.com",
        address_street="ul. Marszałkowska 10/12",
        address_postal_code="00-001",
        address_city="Warszawa",
    )

    employer = EmployerData(
        company_name=user_profile.payer_name or "TechPol Sp. z o.o.",
        nip=user_profile.payer_nip or "5250001090",
        regon="142000192",
        address_street="Al. Jerozolimskie 100",
        address_postal_code="02-001",
        address_city="Warszawa",
        representative_name="Dział Kadr i Płac",
        payer_size="ABOVE_20" if user_profile.is_large_payer else "UP_TO_20",
    )

    today = datetime.date.today()
    birth_date_str = req.child_birth_date or today.isoformat()
    try:
        birth_d = datetime.date.fromisoformat(birth_date_str)
    except ValueError:
        birth_d = today

    child = ChildData(
        first_name="Jan",
        last_name=user_profile.last_name,
        date_of_birth=birth_d.isoformat(),
        birth_certificate_number=f"AU/{birth_d.year}/09812",
        usc_city="USC Warszawa-Śródmieście",
        gestational_age_weeks=39,
        birth_weight_grams=3450,
        hospital_stay_weeks=0,
        has_za_zyciem_certificate=False,
    )

    advisory_notes: list[str] = []

    if req.application_type == ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5:
        start_d = birth_d
        end_d = start_d + datetime.timedelta(days=364)
        leave = LeavePeriodData(
            start_date=start_d.isoformat(),
            end_date=end_d.isoformat(),
            weeks_count=52,
            days_count=364,
            portion_number=1,
            selected_rate_variant="UNIFIED_81_5",
            other_parent_name="Piotr Kowalski",
            other_parent_pesel="89032005678",
            other_parent_declaration_attached=True,
        )
        advisory_notes.append(
            "Wniosek jednolity (tzw. długi) należy złożyć w terminie 21 dni od dnia porodu."
        )
        advisory_notes.append(
            "Wybór stawki 81,5% zapewnia jednolite świadczenie za cały 52-tygodniowy okres."
        )

    elif req.application_type == ApplicationType.PATERNITY_LEAVE:
        start_d = birth_d + datetime.timedelta(days=14)
        end_d = start_d + datetime.timedelta(days=13)
        leave = LeavePeriodData(
            start_date=start_d.isoformat(),
            end_date=end_d.isoformat(),
            weeks_count=2,
            days_count=14,
            portion_number=1,
            selected_rate_variant="STANDARD_100_70",
            other_parent_name=f"{user_profile.first_name} {user_profile.last_name}",
            other_parent_pesel=user_profile.pesel,
            other_parent_declaration_attached=True,
        )
        advisory_notes.append(
            "Wniosek o urlop ojcowski złóż najpóźniej na 7 dni przed planowanym rozpoczęciem."
        )
        advisory_notes.append("Urlop ojcowski przysługuje w wymiarze 14 dni ze stawką 100%.")

    elif req.application_type == ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE:
        child.gestational_age_weeks = 32
        child.birth_weight_grams = 1750
        child.hospital_stay_weeks = 6
        start_d = birth_d + datetime.timedelta(days=140)
        end_d = start_d + datetime.timedelta(days=41)
        leave = LeavePeriodData(
            start_date=start_d.isoformat(),
            end_date=end_d.isoformat(),
            weeks_count=6,
            days_count=42,
            portion_number=1,
            selected_rate_variant="STANDARD_100_70",
        )
        advisory_notes.append(
            "Wniosek złóż co najmniej na 21 dni przed zakończeniem urlopu macierzyńskiego."
        )
        advisory_notes.append(
            "Za 6 tygodni hospitalizacji przysługuje 6 dodatkowych tygodni urlopu ze stawką 100%."
        )

    elif req.application_type == ApplicationType.PARENTAL_WORK_COMBINATION:
        start_d = birth_d + datetime.timedelta(days=140)
        end_d = start_d + datetime.timedelta(days=55)
        leave = LeavePeriodData(
            start_date=start_d.isoformat(),
            end_date=end_d.isoformat(),
            weeks_count=8,
            days_count=56,
            portion_number=1,
            work_time_fraction="1/2",
            selected_rate_variant=req.selected_variant,
        )
        advisory_notes.append(
            "Wniosek o łączenie urlopu z pracą złóż na min. 21 dni przed rozpoczęciem pracy."
        )
        advisory_notes.append(
            "Praca na 1/2 etatu przez 8 tygodni wydłuża urlop rodzicielski o dodatkowe 4 tygodnie."
        )

    else:
        start_d = birth_d
        end_d = start_d + datetime.timedelta(days=139)
        leave = LeavePeriodData(
            start_date=start_d.isoformat(),
            end_date=end_d.isoformat(),
            weeks_count=20,
            days_count=140,
            portion_number=1,
            selected_rate_variant=req.selected_variant,
        )
        advisory_notes.append(
            "Oficjalny wniosek do ZUS. Upewnij się o poprawności numeru rachunku bankowego."
        )

    if user_profile.overdue_blocks_benefits:
        advisory_notes.append(
            f"UWAGA: Zadłużenie składkowe w kwocie {user_profile.overdue_amount:.2f} PLN "
            "blokuje wypłatę świadczeń."
        )

    return ApplicationPrefillResponse(
        application_type=req.application_type,
        template_info=template,
        applicant=applicant,
        employer=employer,
        child=child,
        leave_period=leave,
        required_attachments=template.required_attachments,
        advisory_notes=advisory_notes,
    )


def generate_formal_content_text(
    req: ApplicationCreateRequest, template: ApplicationTemplateInfo
) -> str:
    app_date = req.signing_date or datetime.date.today().isoformat()
    place = req.place_of_signing or "Warszawa"

    emp_name = req.employer.company_name if req.employer else "Pracodawca"
    emp_nip = f"NIP: {req.employer.nip}" if req.employer and req.employer.nip else ""
    emp_addr = (
        f"{req.employer.address_street}, "
        f"{req.employer.address_postal_code} {req.employer.address_city}"
        if req.employer and req.employer.address_street
        else ""
    )

    child_info = ""
    if req.child:
        child_name = (
            f"{req.child.first_name or 'Dziecko'} "
            f"{req.child.last_name or req.applicant.last_name}"
        )
        child_dob = req.child.date_of_birth or "---"
        child_act = req.child.birth_certificate_number or "w załączeniu"
        child_info = (
            f"Dane dziecka:\n"
            f"- Imię i nazwisko dziecka: {child_name}\n"
            f"- Data urodzenia: {child_dob}\n"
            f"- Oznaczenie aktu urodzenia: {child_act}\n"
        )
        if req.child.hospital_stay_weeks and req.child.hospital_stay_weeks > 0:
            child_info += (
                f"- Okres hospitalizacji po porodzie: {req.child.hospital_stay_weeks} tyg.\n"
                f"- Tydzień ciąży / masa: {req.child.gestational_age_weeks or '---'}. tydzień / "
                f"{req.child.birth_weight_grams or '---'} g\n"
            )

    variant_desc = (
        "stawka 81,5% podstawy wymiaru za cały okres (art. 30a ustawy zasiłkowej)"
        if req.leave_period.selected_rate_variant == "UNIFIED_81_5"
        else "stawka 100% za okres macierzyńskiego i 70% za okres rodzicielskiego"
    )

    attachments_lines: list[str] = []
    for idx, att in enumerate(template.required_attachments, 1):
        status_txt = "[DOŁĄCZONO]" if att.code in req.attachments_provided else "[DO UZUPEŁNIENIA]"
        attachments_lines.append(f"  {idx}. {att.title} - {status_txt}")
    attachments_block = "\n".join(attachments_lines) if attachments_lines else "  Brak załączników."

    applicant_addr = (
        f"{req.applicant.address_street or ''}, "
        f"{req.applicant.address_postal_code or ''} {req.applicant.address_city or ''}"
    ).strip()

    if template.category == ApplicationCategory.EMPLOYER_LEAVE:
        recipient_block = f"{emp_name}\n{emp_nip}\n{emp_addr}".strip()
        body = (
            f"{place}, dnia {app_date} r.\n\n"
            f"Wnioskodawca (Pracownik):\n"
            f"{req.applicant.first_name} {req.applicant.last_name}\n"
            f"PESEL: {req.applicant.pesel}\n"
            f"Adres: {applicant_addr}\n"
            f"Tel: {req.applicant.phone_number or '---'}\n"
            f"E-mail: {req.applicant.email or '---'}\n\n"
            f"Do Pracodawcy:\n"
            f"{recipient_block}\n\n"
            f"--------------------------------------------------------------------------------\n"
            f"{template.title.upper()}\n"
            f"Podstawa prawna: {template.legal_basis}\n"
            f"--------------------------------------------------------------------------------\n\n"
            f"Działając na podstawie powołanych wyżej przepisów Kodeksu pracy oraz Rozporządzenia\n"
            f"Ministra Rodziny, Pracy i Polityki Społecznej z dnia 11 marca 2025 r., niniejszym\n"
            f"zwracam się z wnioskiem o:\n\n"
            f"UDZIELENIE URLOPU w wymiarze {req.leave_period.weeks_count} tygodni "
            f"({req.leave_period.days_count} dni kalendarzowych),\n"
            f"w okresie od {req.leave_period.start_date} r. do {req.leave_period.end_date} r.\n\n"
            f"{child_info}\n"
            f"Wybrany wariant wypłaty świadczenia:\n"
            f"- {variant_desc}.\n\n"
        )

        if req.leave_period.work_time_fraction:
            body += (
                f"Wymiar pracy w trakcie urlopu rodzicielskiego: "
                f"{req.leave_period.work_time_fraction} etatu.\n"
                f"Proszę o proporcjonalne wydłużenie urlopu zgodnie z art. 182[1e] KP.\n\n"
            )

        if req.leave_period.other_parent_name:
            body += (
                f"Oświadczenie o drugim rodzicu:\n"
                f"- Drugi rodzic: {req.leave_period.other_parent_name} "
                f"(PESEL: {req.leave_period.other_parent_pesel or '---'})\n"
                f"- Oświadczam, że drugi rodzic nie korzysta z urlopu w tym samym okresie.\n\n"
            )

        body += (
            f"Oświadczam pod rygorem odpowiedzialności karnej, że wszelkie powyższe\n"
            f"dane są zgodne ze stanem faktycznym i prawnym.\n\n"
            f"Załączniki do wniosku:\n"
            f"{attachments_block}\n\n\n"
            f".......................................................\n"
            f"               (podpis pracownika)"
        )
        return body

    recipient_block = (
        "ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH\n"
        "Właściwy Oddział / Inspektorat ZUS\n"
        "(Portal PUE / eZUS)"
    )
    body = (
        f"{place}, dnia {app_date} r.\n\n"
        f"Wnioskodawca (Ubezpieczony):\n"
        f"{req.applicant.first_name} {req.applicant.last_name}\n"
        f"PESEL: {req.applicant.pesel}\n"
        f"Adres: {applicant_addr}\n"
        f"Rachunek bankowy do wypłaty: {req.bank_account_number or 'Zgodny z kontem w ZUS'}\n\n"
        f"Adresat:\n"
        f"{recipient_block}\n\n"
        f"--------------------------------------------------------------------------------\n"
        f"URZĘDOWY DRUK ZUS: {template.official_form_number or 'ZUS'}\n"
        f"{template.title.upper()}\n"
        f"Podstawa prawna: {template.legal_basis}\n"
        f"--------------------------------------------------------------------------------\n\n"
        f"Wnoszę o przyznanie i wypłatę zasiłku macierzyńskiego za okres:\n"
        f"od {req.leave_period.start_date} r. do {req.leave_period.end_date} r. "
        f"({req.leave_period.weeks_count} tygodni).\n\n"
        f"Dane płatnika składek:\n"
        f"- Płatnik: {emp_name} ({emp_nip})\n\n"
        f"{child_info}\n"
        f"Wnioskowany wariant zasiłku: {variant_desc}.\n\n"
        f"Załączniki przekazywane do ZUS:\n"
        f"{attachments_block}\n\n\n"
        f".......................................................\n"
        f"          (podpis ubezpieczonego / podpis elektroniczny)"
    )
    return body


def create_application_service(req: ApplicationCreateRequest) -> ApplicationDetailResponse:
    template = get_application_template_service(req.application_type)
    app_id = f"APP-{uuid.uuid4().hex[:12].upper()}"
    formal_text = generate_formal_content_text(req, template)

    recipient_hdr = (
        f"{req.employer.company_name} - Dział Kadr"
        if template.category == ApplicationCategory.EMPLOYER_LEAVE and req.employer
        else "Zakład Ubezpieczeń Społecznych (eZUS)"
    )

    detail = ApplicationDetailResponse(
        id=app_id,
        application_type=req.application_type,
        category=template.category,
        title=template.title,
        legal_basis=template.legal_basis,
        recipient_header=recipient_hdr,
        created_at=datetime.datetime.now(datetime.UTC).isoformat(),
        status="DRAFT",
        applicant=req.applicant,
        employer=req.employer,
        child=req.child,
        leave_period=req.leave_period,
        required_attachments=template.required_attachments,
        formal_content_text=formal_text,
        submission_confirmation=None,
    )
    APPLICATIONS_STORE[app_id] = detail
    return detail


_DEFAULT_APP_IDS = {
    "APP-2026-0001",
    "APP-2026-0002",
    "APP-2026-0003",
    "APP-2026-0004",
    "APP-2026-0005",
    "APP-2026-0006",
}


def _initialize_default_applications() -> None:
    seed_configs: list[tuple[str, ApplicationType, str]] = [
        ("APP-2026-0001", ApplicationType.UNIFIED_MATERNITY_PARENTAL_81_5, "anna-kowalska"),
        ("APP-2026-0002", ApplicationType.PATERNITY_LEAVE, "piotr-kowalski"),
        ("APP-2026-0003", ApplicationType.SUPPLEMENTARY_MATERNITY_LEAVE, "agnieszka-poznanska"),
        ("APP-2026-0004", ApplicationType.PARENTAL_WORK_COMBINATION, "alicja-chojnicka"),
        ("APP-2026-0005", ApplicationType.ZUS_ZAM, "anna-kowalska"),
        ("APP-2026-0006", ApplicationType.ZUS_ZAS_53, "piotr-chojnicki"),
    ]
    for app_id, app_type, user_id in seed_configs:
        if app_id in APPLICATIONS_STORE:
            continue
        try:
            prefill = prefill_application_service(
                ApplicationPrefillRequest(
                    pesel_or_user_id=user_id,
                    application_type=app_type,
                )
            )
            req = ApplicationCreateRequest(
                application_type=app_type,
                applicant=prefill.applicant,
                employer=prefill.employer,
                child=prefill.child,
                leave_period=prefill.leave_period,
                attachments_provided=[
                    a.code for a in prefill.required_attachments if a.is_mandatory
                ],
            )
            app_obj = create_application_service(req)
            app_obj.id = app_id
            APPLICATIONS_STORE[app_id] = app_obj
        except Exception:
            continue


# Pre-seed default applications at module initialization
_initialize_default_applications()


def get_application_service(app_id: str) -> ApplicationDetailResponse:
    if not APPLICATIONS_STORE:
        _initialize_default_applications()

    app_obj = APPLICATIONS_STORE.get(app_id)
    if not app_obj:
        if app_id in _DEFAULT_APP_IDS or app_id.startswith("APP-2026-"):
            _initialize_default_applications()
            app_obj = APPLICATIONS_STORE.get(app_id)

    if not app_obj:
        for app_type in ApplicationType:
            if app_id.lower() in (app_type.value.lower(), app_type.name.lower()):
                prefill = prefill_application_service(
                    ApplicationPrefillRequest(
                        pesel_or_user_id="anna-kowalska",
                        application_type=app_type,
                    )
                )
                req = ApplicationCreateRequest(
                    application_type=app_type,
                    applicant=prefill.applicant,
                    employer=prefill.employer,
                    child=prefill.child,
                    leave_period=prefill.leave_period,
                    attachments_provided=[
                        a.code for a in prefill.required_attachments if a.is_mandatory
                    ],
                )
                app_obj = create_application_service(req)
                app_obj.id = app_id
                APPLICATIONS_STORE[app_id] = app_obj
                break

    if not app_obj:
        samples = ", ".join(sorted(APPLICATIONS_STORE.keys())[:6])
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Nie odnaleziono wniosku o identyfikatorze '{app_id}'. "
                f"Dostępne wnioski demonstracyjne: {samples} lub utwórz "
                "nowy przez POST /api/applications."
            ),
        )
    return app_obj


def submit_application_service(
    app_id: str, sub_req: SubmissionRequest
) -> SubmissionConfirmation:
    app_obj = get_application_service(app_id)
    now = datetime.datetime.now(datetime.UTC)
    now_iso = now.isoformat()
    random_suffix = uuid.uuid4().hex[:6].upper()

    delivery_channel = sub_req.delivery_method or sub_req.delivery_channel or "ELECTRONIC"

    if app_obj.category == ApplicationCategory.EMPLOYER_LEAVE:
        case_nr = f"KADR/{now.year}/{now.strftime('%m')}/{random_suffix}"
        upo_code = f"UPO-KADR-{uuid.uuid4().hex[:8].upper()}-{now.strftime('%Y%m%d%H%M')}"
        status_code = "SUBMITTED_TO_EMPLOYER"
        recipient = app_obj.employer.company_name if app_obj.employer else "Pracodawca"
        next_steps = [
            f"Wniosek doręczono do pracodawcy: {recipient} (kanał: {delivery_channel}).",
            "Dział Kadr rejestruje wniosek i wydaje decyzję o udzieleniu urlopu.",
        ]
        if app_obj.employer and app_obj.employer.payer_size == "UP_TO_20":
            next_steps.append(
                "Płatnik zatrudnia do 20 osób - przesyła Z-3 do ZUS w celu wypłaty zasiłku."
            )
        else:
            next_steps.append(
                "Płatnik zatrudnia pow. 20 osób - sam naliczy i wypłaci zasiłek macierzyński."
            )
        legal_notices = [
            "Złożenie wniosku chroni pracownika przed zwolnieniem z art. 177 Kodeksu pracy.",
            "Wniosek jest prawnie wiążący dla pracodawcy przy spełnieniu wymogów Kodeksu pracy.",
        ]
    else:
        pesel_val = app_obj.applicant.pesel
        app_type_val = app_obj.application_type.value[:3]
        case_nr = f"ZUS-PUE-{now.year}-{pesel_val}-{app_type_val}-{random_suffix}"
        upo_code = f"UPPO-ZUS-{uuid.uuid4().hex[:10].upper()}-{now.strftime('%Y%m%d%H%M')}"
        status_code = "SUBMITTED_TO_ZUS"
        recipient = "Zakład Ubezpieczeń Społecznych (Centralny Rejestr eZUS / PUE)"
        next_steps = [
            f"Wniosek przyjęty przez Elektroniczną Skrzynkę Podawczą ZUS: {case_nr}.",
            f"Wygenerowano Urzędowe Poświadczenie Przedłożenia (UPPO): {upo_code}.",
            "ZUS dokona weryfikacji prawa do zasiłku w terminie do 30 dni.",
        ]
        legal_notices = [
            "Wypłata zasiłku nastąpi na wskazany rachunek bankowy po pozytywnej decyzji.",
            "W przypadku braku zaświadczenia Z-3 ZUS wezwie pracodawcę do uzupełnienia.",
        ]

    confirmation = SubmissionConfirmation(
        application_id=app_id,
        case_number=case_nr,
        submitted_at=now_iso,
        recipient_name=recipient,
        channel=delivery_channel,
        status=status_code,
        upo_reference_code=upo_code,
        next_steps=next_steps,
        legal_notices=legal_notices,
    )

    app_obj.status = status_code
    app_obj.submission_confirmation = confirmation
    return confirmation


class _CairoApplicationPdfRenderer:
    def __init__(self, app_obj: ApplicationDetailResponse) -> None:
        self.app = app_obj
        self.buf = io.BytesIO()
        self.width = 595.28
        self.height = 841.89
        self.margin_x = 45.0
        self.usable_w = self.width - 2 * self.margin_x
        self.surface: Any = cairo.PDFSurface(self.buf, self.width, self.height)  # type: ignore[union-attr]
        self.cr: Any = cairo.Context(self.surface)  # type: ignore[union-attr]
        self.page = 1
        self.y = 45.0

    def wrap(
        self, text: str, max_w: float, size: float = 9.0, bold: bool = False
    ) -> list[str]:
        self.cr.save()
        slant = cairo.FONT_SLANT_NORMAL  # type: ignore[union-attr]
        weight = (
            cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.select_font_face("Sans", slant, weight)
        self.cr.set_font_size(size)
        res: list[str] = []
        for p in text.split("\n"):
            if not p.strip():
                res.append("")
                continue
            words = p.split(" ")
            cur = words[0]
            for w in words[1:]:
                test_line = f"{cur} {w}"
                if self.cr.text_extents(test_line).width <= max_w:
                    cur = test_line
                else:
                    res.append(cur)
                    cur = w
            res.append(cur)
        self.cr.restore()
        return res

    def check_page(self, needed: float) -> None:
        if self.y + needed > self.height - 45.0:
            self.draw_footer()
            self.surface.show_page()
            self.page += 1
            self.y = 45.0
            self.draw_subsequent_header()

    def draw_footer(self) -> None:
        self.cr.save()
        self.cr.set_source_rgb(0.5, 0.5, 0.5)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.move_to(self.margin_x, self.height - 25)
        self.cr.show_text(
            f"Dokument: {self.app.id} | Wygenerowano: {self.app.created_at[:10]} | "
            "ZUS Asystent Rodzica"
        )
        p_txt = f"Strona {self.page}"
        text_w = self.cr.text_extents(p_txt).width
        self.cr.move_to(self.width - self.margin_x - text_w, self.height - 25)
        self.cr.show_text(p_txt)
        self.cr.restore()

    def draw_subsequent_header(self) -> None:
        self.cr.save()
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.rectangle(self.margin_x, self.y, self.usable_w, 2)
        self.cr.fill()
        self.y += 12
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.set_source_rgb(0.4, 0.4, 0.4)
        self.cr.move_to(self.margin_x, self.y)
        self.cr.show_text(f"{self.app.title[:60]} (kontynuacja)")
        self.y += 18
        self.cr.restore()

    def render(self) -> bytes:
        # Header Page 1
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.rectangle(self.margin_x, self.y, self.usable_w, 3)
        self.cr.fill()
        self.y += 14

        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8.5)
        self.cr.move_to(self.margin_x, self.y)
        self.cr.show_text("RZECZPOSPOLITA POLSKA • URZĘDOWY MODUŁ WNIOSKÓW RODZICIELSKICH")

        ref_txt = f"ID: {self.app.id} | Data: {self.app.created_at[:10]}"
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.set_source_rgb(0.4, 0.4, 0.4)
        ref_w = self.cr.text_extents(ref_txt).width
        self.cr.move_to(self.width - self.margin_x - ref_w, self.y)
        self.cr.show_text(ref_txt)
        self.y += 16

        # Title Box
        title_lines = self.wrap(self.app.title, self.usable_w - 20, size=10, bold=True)
        box_h = 24 + len(title_lines) * 13 + 14
        self.cr.set_source_rgb(0.95, 0.96, 0.98)
        self.cr.rectangle(self.margin_x, self.y, self.usable_w, box_h)
        self.cr.fill()
        self.cr.set_source_rgb(0.8, 0.85, 0.9)
        self.cr.set_line_width(0.8)
        self.cr.rectangle(self.margin_x, self.y, self.usable_w, box_h)
        self.cr.stroke()

        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(10)
        ty = self.y + 15
        for tl in title_lines:
            self.cr.move_to(self.margin_x + 10, ty)
            self.cr.show_text(tl)
            ty += 13

        self.cr.set_source_rgb(0.35, 0.4, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_ITALIC, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(7.5)
        self.cr.move_to(self.margin_x + 10, ty + 2)
        self.cr.show_text(self.app.legal_basis[:95])
        self.y += box_h + 14

        # Parties Box (2 columns)
        col_w = (self.usable_w - 15) / 2
        parties_h = 75
        self.cr.set_source_rgb(0.98, 0.98, 0.99)
        self.cr.rectangle(self.margin_x, self.y, col_w, parties_h)
        self.cr.rectangle(self.margin_x + col_w + 15, self.y, col_w, parties_h)
        self.cr.fill()
        self.cr.set_source_rgb(0.88, 0.9, 0.93)
        self.cr.rectangle(self.margin_x, self.y, col_w, parties_h)
        self.cr.rectangle(self.margin_x + col_w + 15, self.y, col_w, parties_h)
        self.cr.stroke()

        # Left Party: Wnioskodawca
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8.5)
        self.cr.move_to(self.margin_x + 8, self.y + 14)
        self.cr.show_text("WNIOSKODAWCA (PRACOWNIK):")
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.set_source_rgb(0.15, 0.15, 0.15)
        self.cr.move_to(self.margin_x + 8, self.y + 28)
        self.cr.show_text(f"{self.app.applicant.first_name} {self.app.applicant.last_name}")
        self.cr.move_to(self.margin_x + 8, self.y + 40)
        self.cr.show_text(f"PESEL: {self.app.applicant.pesel}")
        addr = (
            f"{self.app.applicant.address_street or ''}, "
            f"{self.app.applicant.address_city or ''}"
        ).strip(", ")
        self.cr.move_to(self.margin_x + 8, self.y + 52)
        self.cr.show_text(addr[:35])
        self.cr.move_to(self.margin_x + 8, self.y + 64)
        self.cr.show_text(f"Tel: {self.app.applicant.phone_number or '---'}")

        # Right Party: Odbiorca
        rx = self.margin_x + col_w + 15
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8.5)
        self.cr.move_to(rx + 8, self.y + 14)
        self.cr.show_text("ODBIORCA (PRACODAWCA / ZUS):")
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.set_source_rgb(0.15, 0.15, 0.15)
        emp_name = (
            self.app.employer.company_name
            if self.app.employer
            else "Zakład Ubezpieczeń Społecznych"
        )
        self.cr.move_to(rx + 8, self.y + 28)
        self.cr.show_text(emp_name[:35])
        if self.app.employer and self.app.employer.nip:
            self.cr.move_to(rx + 8, self.y + 40)
            self.cr.show_text(f"NIP: {self.app.employer.nip}")
            emp_addr = (
                f"{self.app.employer.address_street or ''}, "
                f"{self.app.employer.address_city or ''}"
            ).strip(", ")
            self.cr.move_to(rx + 8, self.y + 52)
            self.cr.show_text(emp_addr[:35])
        else:
            self.cr.move_to(rx + 8, self.y + 40)
            self.cr.show_text("Elektroniczna Skrzynka Podawcza eZUS")

        self.y += parties_h + 16

        # Section: Parametry urlopu
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(9)
        self.cr.move_to(self.margin_x, self.y)
        self.cr.show_text("1. WNIOSKOWANY WYMIAR I OKRES URLOPU / ŚWIADCZENIA")
        self.cr.set_line_width(0.5)
        self.cr.move_to(self.margin_x, self.y + 3)
        self.cr.line_to(self.margin_x + self.usable_w, self.y + 3)
        self.cr.stroke()
        self.y += 15

        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8.5)
        self.cr.set_source_rgb(0.1, 0.1, 0.1)
        rate_desc = (
            "stawka 81,5% podstawy wymiaru (art. 30a ustawy zasiłkowej)"
            if self.app.leave_period.selected_rate_variant == "UNIFIED_81_5"
            else "stawka 100% / 70% podstawy wymiaru"
        )
        leave_info = [
            f"• Wymiar urlopu: {self.app.leave_period.weeks_count} tygodni "
            f"({self.app.leave_period.days_count} dni kalendarzowych)",
            f"• Okres korzystania: od {self.app.leave_period.start_date} "
            f"do {self.app.leave_period.end_date}",
            f"• Wariant zasiłku: {rate_desc}",
        ]
        if self.app.leave_period.work_time_fraction:
            leave_info.append(
                f"• Łączenie z pracą: wymiar {self.app.leave_period.work_time_fraction} "
                "etatu u pracodawcy"
            )
        for li in leave_info:
            self.cr.move_to(self.margin_x + 8, self.y)
            self.cr.show_text(li)
            self.y += 13
        self.y += 8

        # Section: Dziecko
        if self.app.child:
            self.cr.set_source_rgb(0.08, 0.22, 0.45)
            self.cr.select_font_face(
                "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
            )
            self.cr.set_font_size(9)
            self.cr.move_to(self.margin_x, self.y)
            self.cr.show_text("2. DANE DZIECKA")
            self.cr.move_to(self.margin_x, self.y + 3)
            self.cr.line_to(self.margin_x + self.usable_w, self.y + 3)
            self.cr.stroke()
            self.y += 15

            self.cr.select_font_face(
                "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
            )
            self.cr.set_font_size(8.5)
            self.cr.set_source_rgb(0.1, 0.1, 0.1)
            ch_name = (
                f"{self.app.child.first_name or 'Dziecko'} "
                f"{self.app.child.last_name or self.app.applicant.last_name}"
            )
            child_lines = [
                f"• Imię i nazwisko: {ch_name}",
                f"• Data urodzenia: {self.app.child.date_of_birth or '---'}",
                f"• Oznaczenie aktu urodzenia: "
                f"{self.app.child.birth_certificate_number or 'W załączeniu'} "
                f"({self.app.child.usc_city or 'USC'})",
            ]
            if (
                self.app.child.hospital_stay_weeks
                and self.app.child.hospital_stay_weeks > 0
            ):
                child_lines.append(
                    f"• Okres hospitalizacji: {self.app.child.hospital_stay_weeks} tyg. | "
                    f"Tydzień ciąży: {self.app.child.gestational_age_weeks or '---'} | "
                    f"Masa: {self.app.child.birth_weight_grams or '---'} g"
                )
            for cl in child_lines:
                self.cr.move_to(self.margin_x + 8, self.y)
                self.cr.show_text(cl)
                self.y += 13
            self.y += 8

        # Section: Oświadczenia
        self.check_page(90)
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(9)
        self.cr.move_to(self.margin_x, self.y)
        self.cr.show_text("3. OŚWIADCZENIA I POUCZENIA PRAWNE")
        self.cr.move_to(self.margin_x, self.y + 3)
        self.cr.line_to(self.margin_x + self.usable_w, self.y + 3)
        self.cr.stroke()
        self.y += 15

        decls = [
            "Oświadczam, że drugi rodzic dziecka nie korzysta w tym samym okresie z urlopu.",
            "Oświadczam pod rygorem odpowiedzialności karnej z art. 233 § 1 Kodeksu karnego "
            "za składanie fałszywych zeznań, że dane zawarte we wniosku są zgodne z prawdą.",
            "Zobowiązuję się do niezwłocznego powiadomienia o wszelkich zmianach mających "
            "wpływ na prawo do urlopu lub zasiłku.",
        ]
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.set_source_rgb(0.2, 0.2, 0.2)
        for d in decls:
            for dl in self.wrap("• " + d, self.usable_w - 10, size=8):
                self.check_page(14)
                self.cr.move_to(self.margin_x + 8, self.y)
                self.cr.show_text(dl)
                self.y += 12
        self.y += 8

        # Section: Załączniki
        self.check_page(80)
        self.cr.set_source_rgb(0.08, 0.22, 0.45)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
        )
        self.cr.set_font_size(9)
        self.cr.move_to(self.margin_x, self.y)
        self.cr.show_text("4. WYKAZ ZAŁĄCZNIKÓW")
        self.cr.move_to(self.margin_x, self.y + 3)
        self.cr.line_to(self.margin_x + self.usable_w, self.y + 3)
        self.cr.stroke()
        self.y += 15

        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(8)
        self.cr.set_source_rgb(0.15, 0.15, 0.15)
        for idx, att in enumerate(self.app.required_attachments, 1):
            self.check_page(16)
            status_box = "[X]" if att.is_provided else "[  ]"
            status_desc = "DOŁĄCZONO" if att.is_provided else "DO UZUPEŁNIENIA"
            txt = f"{status_box} {idx}. {att.title} ({status_desc}) - {att.legal_basis}"
            for line in self.wrap(txt, self.usable_w - 10, size=8):
                self.cr.move_to(self.margin_x + 8, self.y)
                self.cr.show_text(line)
                self.y += 12
        self.y += 15

        # Section: UPO confirmation (if submitted)
        if self.app.submission_confirmation:
            self.check_page(75)
            self.cr.set_source_rgb(0.08, 0.45, 0.25)
            self.cr.rectangle(self.margin_x, self.y, self.usable_w, 65)
            self.cr.set_line_width(1.0)
            self.cr.stroke()

            self.cr.set_source_rgb(0.95, 0.99, 0.96)
            self.cr.rectangle(self.margin_x + 1, self.y + 1, self.usable_w - 2, 63)
            self.cr.fill()

            self.cr.set_source_rgb(0.08, 0.45, 0.25)
            self.cr.select_font_face(
                "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD  # type: ignore[union-attr]
            )
            self.cr.set_font_size(8.5)
            self.cr.move_to(self.margin_x + 10, self.y + 15)
            self.cr.show_text("URZĘDOWE POŚWIADCZENIE PRZEDŁOŻENIA / ODBIORU (UPO)")

            self.cr.select_font_face(
                "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
            )
            self.cr.set_font_size(8)
            self.cr.set_source_rgb(0.15, 0.2, 0.15)
            conf = self.app.submission_confirmation
            self.cr.move_to(self.margin_x + 10, self.y + 30)
            self.cr.show_text(f"Znak sprawy: {conf.case_number} | Status: {conf.status}")
            self.cr.move_to(self.margin_x + 10, self.y + 44)
            self.cr.show_text(f"Identyfikator UPO: {conf.upo_reference_code}")
            self.cr.move_to(self.margin_x + 10, self.y + 57)
            self.cr.show_text(
                f"Data złożenia: {conf.submitted_at[:19]} | Adresat: {conf.recipient_name[:35]}"
            )
            self.y += 75

        # Section: Podpisy
        self.check_page(70)
        sig_y = self.y
        self.cr.set_source_rgb(0.85, 0.88, 0.92)
        self.cr.rectangle(self.margin_x, sig_y, col_w, 55)
        self.cr.rectangle(self.margin_x + col_w + 15, sig_y, col_w, 55)
        self.cr.stroke()

        self.cr.set_source_rgb(0.3, 0.3, 0.3)
        self.cr.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        )
        self.cr.set_font_size(7.5)
        self.cr.move_to(self.margin_x + 10, sig_y + 14)
        self.cr.show_text(f"Miejscowość i data: Warszawa, {self.app.created_at[:10]}")
        self.cr.move_to(self.margin_x + 10, sig_y + 44)
        self.cr.show_text("...................................................................")
        self.cr.move_to(self.margin_x + 10, sig_y + 51)
        self.cr.show_text("(podpis wnioskodawcy / pracownika)")

        rx = self.margin_x + col_w + 15
        self.cr.move_to(rx + 10, sig_y + 14)
        self.cr.show_text("Data wpływu i potwierdzenie odbioru:")
        self.cr.move_to(rx + 10, sig_y + 44)
        self.cr.show_text("...................................................................")
        self.cr.move_to(rx + 10, sig_y + 51)
        self.cr.show_text("(podpis pracodawcy / organu ZUS)")
        self.y += 65

        # Finish document
        self.draw_footer()
        self.surface.show_page()
        self.surface.finish()
        return self.buf.getvalue()


def _sanitize_ascii_for_pdf(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = "".join(c for c in normalized if not unicodedata.combining(c))
    replacements = {
        "„": '"',
        "”": '"',
        "\u2013": "-",
        "\u2014": "--",
        "•": "*",
        "§": "par.",
        "…": "...",
    }
    for k, v in replacements.items():
        ascii_text = ascii_text.replace(k, v)
    return ascii_text


def _render_pdf_with_pure_python(app_obj: ApplicationDetailResponse) -> bytes:
    clean_text = _sanitize_ascii_for_pdf(app_obj.formal_content_text)
    raw_lines = clean_text.splitlines()

    wrapped: list[str] = []
    for rl in raw_lines:
        if not rl:
            wrapped.append("")
            continue
        while len(rl) > 85:
            split_at = rl[:85].rfind(" ")
            if split_at <= 0:
                split_at = 85
            wrapped.append(rl[:split_at].strip())
            rl = rl[split_at:].strip()
        if rl:
            wrapped.append(rl)

    lines_per_page = 46
    pages_lines: list[list[str]] = []
    for i in range(0, max(1, len(wrapped)), lines_per_page):
        pages_lines.append(wrapped[i : i + lines_per_page])

    output = bytearray()
    output.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets: dict[int, int] = {}

    def start_obj(num: int) -> None:
        offsets[num] = len(output)
        output.extend(f"{num} 0 obj\n".encode("ascii"))

    def end_obj() -> None:
        output.extend(b"endobj\n")

    catalog_id = 1
    pages_id = 2
    font_id = 3

    page_obj_ids: list[int] = []
    content_obj_ids: list[int] = []
    cur_id = 4
    for _ in pages_lines:
        page_obj_ids.append(cur_id)
        content_obj_ids.append(cur_id + 1)
        cur_id += 2

    # 1: Catalog
    start_obj(catalog_id)
    output.extend(f"<< /Type /Catalog /Pages {pages_id} 0 R >>\n".encode("ascii"))
    end_obj()

    # 2: Pages
    start_obj(pages_id)
    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    output.extend(
        f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_obj_ids)} >>\n".encode("ascii")
    )
    end_obj()

    # 3: Font
    start_obj(font_id)
    output.extend(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n")
    end_obj()

    for page_idx, (page_id, cont_id, lines) in enumerate(
        zip(page_obj_ids, content_obj_ids, pages_lines, strict=True), 1
    ):
        start_obj(page_id)
        output.extend(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> "
            f"/Contents {cont_id} 0 R >>\n".encode("ascii")
        )
        end_obj()

        stream_parts = ["BT", "/F1 9 Tf", "40 800 Td", "13 TL"]
        for line in lines:
            safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            stream_parts.append(f"({safe}) Tj T*")
        footer = f"-- Strona {page_idx} z {len(pages_lines)} --"
        stream_parts.append(f"0 -15 Td ({footer}) Tj")
        stream_parts.append("ET")
        stream_bytes = "\n".join(stream_parts).encode("latin1", errors="replace")

        start_obj(cont_id)
        output.extend(f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii"))
        output.extend(stream_bytes)
        output.extend(b"\nendstream\n")
        end_obj()

    startxref = len(output)
    total_objs = cur_id
    output.extend(f"xref\n0 {total_objs}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \r\n")
    for num in range(1, total_objs):
        output.extend(f"{offsets[num]:010d} 00000 n \r\n".encode("ascii"))

    output.extend(
        f"trailer\n<< /Size {total_objs} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{startxref}\n%%EOF\n".encode("ascii")
    )
    return bytes(output)


def render_application_pdf(app_obj: ApplicationDetailResponse) -> bytes:
    if HAS_CAIRO and cairo is not None:
        try:
            renderer = _CairoApplicationPdfRenderer(app_obj)
            pdf_bytes = renderer.render()
            PdfReader(io.BytesIO(pdf_bytes))
            return pdf_bytes
        except Exception:
            pass

    pdf_bytes = _render_pdf_with_pure_python(app_obj)
    PdfReader(io.BytesIO(pdf_bytes))
    return pdf_bytes


def generate_application_pdf_service(app_id: str) -> bytes:
    app_obj = get_application_service(app_id)
    return render_application_pdf(app_obj)


def render_application_pdf_from_request_service(req: ApplicationCreateRequest) -> bytes:
    template = get_application_template_service(req.application_type)
    content_text = generate_formal_content_text(req, template)
    temp_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    temp_app = ApplicationDetailResponse(
        id=temp_id,
        application_type=req.application_type,
        category=template.category,
        title=template.title,
        legal_basis=template.legal_basis,
        recipient_header=(
            req.employer.company_name
            if req.employer
            else "Zakład Ubezpieczeń Społecznych"
        ),
        created_at=datetime.datetime.now(datetime.UTC).isoformat(),
        status="DRAFT",
        applicant=req.applicant,
        employer=req.employer,
        child=req.child,
        leave_period=req.leave_period,
        required_attachments=template.required_attachments,
        formal_content_text=content_text,
        submission_confirmation=None,
    )
    return render_application_pdf(temp_app)
