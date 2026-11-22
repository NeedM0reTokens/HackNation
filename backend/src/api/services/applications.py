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
    cairo = None  # type: ignore[assignment]
    HAS_CAIRO = False

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
            "i rodzicielskiego w pełnym wymiarze (tzw. długi wniosek)"
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
            f"{req.child.first_name or 'Dziecko'} {req.child.last_name or req.applicant.last_name}"
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
        "ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH\nWłaściwy Oddział / Inspektorat ZUS\n(Portal PUE / eZUS)"
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


def submit_application_service(app_id: str, sub_req: SubmissionRequest) -> SubmissionConfirmation:
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


PDF_DIFFS_ENCODING = (
    b"<< /Type /Encoding /Differences [\n"
    b"132 /quotedblbase\n"
    b"148 /quotedblright 149 /bullet 150 /endash 151 /emdash\n"
    b"161 /Aogonek 163 /Lslash 166 /Sacute 167 /section 172 /Zacute 175 /Zdotaccent\n"
    b"177 /aogonek 179 /lslash 182 /sacute 188 /zacute 191 /zdotaccent\n"
    b"198 /Cacute 202 /Eogonek 209 /Nacute 211 /Oacute\n"
    b"230 /cacute 234 /eogonek 241 /nacute 243 /oacute\n"
    b"] >>"
)

PDF_TOUNICODE_CMAP = (
    b"/CIDInit /ProcSet findresource begin\n"
    b"12 dict begin\n"
    b"begincmap\n"
    b"/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n"
    b"/CMapName /Custom-ToUnicode def\n"
    b"/CMapType 2 def\n"
    b"1 begincodespacerange\n"
    b"<00> <FF>\n"
    b"endcodespacerange\n"
    b"24 beginbfrange\n"
    b"<84> <84> <201E>\n"
    b"<94> <94> <201D>\n"
    b"<95> <95> <2022>\n"
    b"<96> <96> <2013>\n"
    b"<97> <97> <2014>\n"
    b"<A1> <A1> <0104>\n"
    b"<A3> <A3> <0141>\n"
    b"<A6> <A6> <015A>\n"
    b"<A7> <A7> <00A7>\n"
    b"<AC> <AC> <0179>\n"
    b"<AF> <AF> <017B>\n"
    b"<B1> <B1> <0105>\n"
    b"<B3> <B3> <0142>\n"
    b"<B6> <B6> <015B>\n"
    b"<BC> <BC> <017A>\n"
    b"<BF> <BF> <017C>\n"
    b"<C6> <C6> <0106>\n"
    b"<CA> <CA> <0118>\n"
    b"<D1> <D1> <0143>\n"
    b"<D3> <D3> <00D3>\n"
    b"<E6> <E6> <0107>\n"
    b"<EA> <EA> <0119>\n"
    b"<F1> <F1> <0144>\n"
    b"<F3> <F3> <00F3>\n"
    b"endbfrange\n"
    b"endcmap\n"
    b"CMapName currentdict /CMap defineresource pop\n"
    b"end\n"
    b"end\n"
)

PDF_PL_CHAR_BYTE_MAP: dict[str, int] = {
    "Ą": 0xA1,
    "Ć": 0xC6,
    "Ę": 0xCA,
    "Ł": 0xA3,
    "Ń": 0xD1,
    "Ó": 0xD3,
    "Ś": 0xA6,
    "Ź": 0xAC,
    "Ż": 0xAF,
    "ą": 0xB1,
    "ć": 0xE6,
    "ę": 0xEA,
    "ł": 0xB3,
    "ń": 0xF1,
    "ó": 0xF3,
    "ś": 0xB6,
    "ź": 0xBC,
    "ż": 0xBF,
    "§": 0xA7,
    "•": 0x95,
    "\u2013": 0x96,
    "\u2014": 0x97,
    "„": 0x84,
    "”": 0x94,
}


def _encode_pdf_text(s: str) -> bytes:
    buf = bytearray()
    for ch in s:
        if ch in PDF_PL_CHAR_BYTE_MAP:
            buf.append(PDF_PL_CHAR_BYTE_MAP[ch])
        elif ch == "(":
            buf.extend(b"\\(")
        elif ch == ")":
            buf.extend(b"\\)")
        elif ch == "\\":
            buf.extend(b"\\\\")
        elif 32 <= ord(ch) <= 126:
            buf.append(ord(ch))
        else:
            norm = unicodedata.normalize("NFKD", ch)
            base = norm[0] if norm and 32 <= ord(norm[0]) <= 126 else " "
            buf.append(ord(base))
    return bytes(buf)


class _CairoApplicationPdfRenderer:
    def __init__(self, app_obj: ApplicationDetailResponse) -> None:
        self.app = app_obj
        self.buf = io.BytesIO()
        self.width = 595.28
        self.height = 841.89
        self.margin_x = 40.0
        self.usable_w = self.width - 2 * self.margin_x
        self.surface: Any = cairo.PDFSurface(self.buf, self.width, self.height)  # type: ignore[union-attr]
        self.cr: Any = cairo.Context(self.surface)  # type: ignore[union-attr]
        self.page = 1
        self.y = 30.0

    def set_font(self, size: float, bold: bool = False, italic: bool = False) -> None:
        slant = cairo.FONT_SLANT_ITALIC if italic else cairo.FONT_SLANT_NORMAL  # type: ignore[union-attr]
        weight = cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL  # type: ignore[union-attr]
        self.cr.select_font_face("DejaVu Sans", slant, weight)
        self.cr.set_font_size(size)

    def wrap(self, text: str, max_w: float, size: float = 8.5, bold: bool = False) -> list[str]:
        self.cr.save()
        self.set_font(size, bold=bold)
        res: list[str] = []
        for p in text.split("\n"):
            if not p.strip():
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

    def draw_footer(self) -> None:
        self.cr.save()
        self.cr.set_source_rgb(0.85, 0.88, 0.92)
        self.cr.set_line_width(0.6)
        self.cr.move_to(self.margin_x, 810)
        self.cr.line_to(self.margin_x + self.usable_w, 810)
        self.cr.stroke()

        self.cr.set_source_rgb(0.45, 0.45, 0.45)
        self.set_font(7.0)
        self.cr.move_to(self.margin_x, 822)
        self.cr.show_text(
            f"Dokument urzędowy wygenerowany w module ZUS Asystent Rodzica | "
            f"MRPiPS 2025 | ID: {self.app.id}"
        )
        p_txt = "Strona 1 z 1"
        self.set_font(7.5, bold=True)
        text_w = self.cr.text_extents(p_txt).width
        self.cr.move_to(self.width - self.margin_x - text_w, 822)
        self.cr.show_text(p_txt)
        self.cr.restore()

    def render(self) -> bytes:
        # 1. Top banner bar
        self.cr.set_source_rgb(0.00, 0.23, 0.44)  # ZUS Navy
        self.cr.rectangle(self.margin_x, 34, self.usable_w, 3)
        self.cr.fill()

        self.set_font(8.5, bold=True)
        self.cr.move_to(self.margin_x, 48)
        self.cr.show_text("RZECZPOSPOLITA POLSKA • URZĘDOWY MODUŁ WNIOSKÓW I ŚWIADCZEŃ")

        self.set_font(8.0)
        self.cr.set_source_rgb(0.3, 0.3, 0.3)
        date_str = f"Warszawa, dn. {self.app.created_at[:10]} r."
        dw = self.cr.text_extents(date_str).width
        self.cr.move_to(self.width - self.margin_x - dw, 48)
        self.cr.show_text(date_str)

        self.set_font(7.5)
        self.cr.set_source_rgb(0.45, 0.45, 0.45)
        ref_str = f"Znak ref.: {self.app.id}"
        rw = self.cr.text_extents(ref_str).width
        self.cr.move_to(self.width - self.margin_x - rw, 60)
        self.cr.show_text(ref_str)

        # 2. Parties Box (2 columns with natural breathing room)
        col_w = (self.usable_w - 19.0) / 2
        parties_h = 90.0

        # Left Box (Wnioskodawca)
        self.cr.set_source_rgb(0.98, 0.99, 1.0)
        self.cr.rectangle(self.margin_x, 74, col_w, parties_h)
        self.cr.fill()
        self.cr.set_source_rgb(0.80, 0.85, 0.90)
        self.cr.set_line_width(0.8)
        self.cr.rectangle(self.margin_x, 74, col_w, parties_h)
        self.cr.stroke()

        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        self.set_font(7.5, bold=True)
        self.cr.move_to(self.margin_x + 8, 90)
        self.cr.show_text("WNIOSKODAWCA (PRACOWNIK / UBEZPIECZONY):")

        self.cr.set_source_rgb(0.1, 0.1, 0.1)
        self.set_font(9.5, bold=True)
        self.cr.move_to(self.margin_x + 8, 108)
        self.cr.show_text(f"{self.app.applicant.first_name} {self.app.applicant.last_name}")

        self.set_font(8.0)
        self.cr.move_to(self.margin_x + 8, 125)
        self.cr.show_text(f"PESEL: {self.app.applicant.pesel}")

        self.set_font(7.5)
        app_street = self.app.applicant.address_street or ""
        app_city = self.app.applicant.address_city or ""
        addr = f"Adres: {app_street}, {app_city}".strip(", ")
        self.cr.move_to(self.margin_x + 8, 141)
        self.cr.show_text(addr[:42])

        app_phone = self.app.applicant.phone_number or "---"
        app_email = self.app.applicant.email or "---"
        contact = f"Kontakt: Tel. {app_phone} | {app_email}"
        self.set_font(7.2)
        self.cr.move_to(self.margin_x + 8, 156)
        self.cr.show_text(contact[:42])

        # Right Box (Adresat)
        rx = self.margin_x + col_w + 19.0
        self.cr.set_source_rgb(0.98, 0.99, 1.0)
        self.cr.rectangle(rx, 74, col_w, parties_h)
        self.cr.fill()
        self.cr.set_source_rgb(0.80, 0.85, 0.90)
        self.cr.set_line_width(0.8)
        self.cr.rectangle(rx, 74, col_w, parties_h)
        self.cr.stroke()

        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        self.set_font(7.5, bold=True)
        self.cr.move_to(rx + 8, 90)
        self.cr.show_text("ADRESAT (PRACODAWCA / ZUS):")

        self.cr.set_source_rgb(0.1, 0.1, 0.1)
        self.set_font(9.5, bold=True)
        emp_name = (
            self.app.employer.company_name
            if self.app.employer
            else "Zakład Ubezpieczeń Społecznych"
        )
        self.cr.move_to(rx + 8, 108)
        self.cr.show_text(emp_name[:38])

        self.set_font(8.0)
        emp_nip = (
            f"NIP: {self.app.employer.nip}"
            if self.app.employer and self.app.employer.nip
            else "Elektroniczna Skrzynka PUE ZUS"
        )
        self.cr.move_to(rx + 8, 125)
        self.cr.show_text(emp_nip)

        self.set_font(7.5)
        emp_street = self.app.employer.address_street or "" if self.app.employer else ""
        emp_city = self.app.employer.address_city or "" if self.app.employer else ""
        emp_addr = (
            f"Adres: {emp_street}, {emp_city}".strip(", ")
            if self.app.employer
            else "Centralny Rejestr Ubezpieczonych"
        )
        self.cr.move_to(rx + 8, 141)
        self.cr.show_text(emp_addr[:38])

        self.set_font(7.2)
        self.cr.move_to(rx + 8, 156)
        self.cr.show_text("Kanał: Portal Pracowniczy / PUE eZUS")

        # 3. Formal Document Title (Clean, authoritative header - NO GREEN FRAME)
        self.cr.set_source_rgb(0.85, 0.88, 0.92)
        self.cr.set_line_width(0.6)
        self.cr.move_to(self.margin_x, 182)
        self.cr.line_to(self.margin_x + self.usable_w, 182)
        self.cr.stroke()

        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        t_lines = self.wrap(self.app.title.upper(), self.usable_w - 20, size=9.5, bold=True)
        self.set_font(9.5, bold=True)
        if len(t_lines) == 1:
            self.cr.move_to(self.margin_x + 6, 202)
            self.cr.show_text(t_lines[0])
            lb_y = 222
        else:
            self.cr.move_to(self.margin_x + 6, 196)
            self.cr.show_text(t_lines[0])
            self.cr.move_to(self.margin_x + 6, 212)
            self.cr.show_text(t_lines[1][:85])
            lb_y = 228

        self.cr.set_source_rgb(0.35, 0.40, 0.45)
        self.set_font(7.5, italic=True)
        self.cr.move_to(self.margin_x + 6, lb_y)
        self.cr.show_text(f"Podstawa prawna: {self.app.legal_basis[:95]}")

        self.cr.set_source_rgb(0.85, 0.88, 0.92)
        self.cr.set_line_width(0.6)
        self.cr.move_to(self.margin_x, 242)
        self.cr.line_to(self.margin_x + self.usable_w, 242)
        self.cr.stroke()

        # 4. Section 1: Parameters Table (Spacious row heights of 35 pt)
        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        self.set_font(8.5, bold=True)
        self.cr.move_to(self.margin_x, 262)
        self.cr.show_text("1. WNIOSKOWANY WYMIAR I OKRES ŚWIADCZENIA / URLOPU")
        self.cr.set_line_width(0.6)
        self.cr.move_to(self.margin_x, 266)
        self.cr.line_to(self.margin_x + self.usable_w, 266)
        self.cr.stroke()

        self.cr.set_source_rgb(1.0, 1.0, 1.0)
        self.cr.rectangle(self.margin_x, 274, self.usable_w, 105)
        self.cr.fill()
        self.cr.set_source_rgb(0.82, 0.85, 0.89)
        self.cr.set_line_width(0.8)
        self.cr.rectangle(self.margin_x, 274, self.usable_w, 105)
        self.cr.stroke()

        self.cr.set_line_width(0.5)
        self.cr.set_source_rgb(0.88, 0.90, 0.93)
        self.cr.move_to(self.margin_x, 309)
        self.cr.line_to(self.margin_x + self.usable_w, 309)
        self.cr.move_to(self.margin_x, 344)
        self.cr.line_to(self.margin_x + self.usable_w, 344)
        self.cr.move_to(self.margin_x + 160, 274)
        self.cr.line_to(self.margin_x + 160, 379)
        self.cr.stroke()

        self.cr.set_source_rgb(0.1, 0.1, 0.1)
        self.set_font(8.0, bold=True)
        self.cr.move_to(self.margin_x + 8, 296)
        self.cr.show_text("Okres korzystania:")
        self.set_font(8.0)
        self.cr.move_to(self.margin_x + 168, 296)
        lp = self.app.leave_period
        self.cr.show_text(
            f"Od {lp.start_date} do {lp.end_date} ({lp.weeks_count} tyg. / {lp.days_count} dni)"
        )

        self.set_font(8.0, bold=True)
        self.cr.move_to(self.margin_x + 8, 331)
        self.cr.show_text("Wariant zasiłku / stawka:")
        self.set_font(8.0)
        self.cr.move_to(self.margin_x + 168, 331)
        rate_desc = (
            "Stawka 81,5% podstawy wymiaru (wniosek jednolity w terminie 21 dni)"
            if self.app.leave_period.selected_rate_variant == "UNIFIED_81_5"
            else "Stawka 100% / 70% podstawy wymiaru"
        )
        self.cr.show_text(rate_desc)

        self.set_font(8.0, bold=True)
        self.cr.move_to(self.margin_x + 8, 366)
        self.cr.show_text("Dane dziecka:")
        self.set_font(8.0)
        self.cr.move_to(self.margin_x + 168, 366)
        ch = self.app.child
        ch_info = (
            f"{ch.first_name} {ch.last_name}, ur. {ch.date_of_birth}, "
            f"Akt: {ch.birth_certificate_number} ({ch.usc_city})"
            if ch
            else "---"
        )
        self.cr.show_text(ch_info[:70])

        # 5. Section 2: Declarations (Natural line spacing of 22 pt)
        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        self.set_font(8.5, bold=True)
        self.cr.move_to(self.margin_x, 404)
        self.cr.show_text("2. OŚWIADCZENIA I POUCZENIA PRAWNE WNIOSKODAWCY")
        self.cr.set_line_width(0.6)
        self.cr.move_to(self.margin_x, 408)
        self.cr.line_to(self.margin_x + self.usable_w, 408)
        self.cr.stroke()

        self.set_font(7.8)
        self.cr.set_source_rgb(0.15, 0.15, 0.15)
        self.cr.move_to(self.margin_x + 6, 428)
        self.cr.show_text(
            "[X] Oświadczam, że drugi z rodziców nie korzysta z urlopu / "
            "zasiłku macierzyńskiego w tym samym okresie."
        )
        self.cr.move_to(self.margin_x + 6, 450)
        self.cr.show_text(
            "[X] Oświadczam pod rygorem odpowiedzialności karnej z art. 233 § 1 "
            "Kodeksu karnego, że powyższe dane są prawdziwe."
        )
        self.cr.move_to(self.margin_x + 6, 472)
        self.cr.show_text(
            "[X] Zobowiązuję się niezwłocznie powiadomić płatnika składek / ZUS "
            "o wszelkich zmianach uprawnień."
        )

        # 6. Section 3: Attachments (Natural line spacing of 22 pt)
        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        self.set_font(8.5, bold=True)
        self.cr.move_to(self.margin_x, 500)
        self.cr.show_text(
            "3. WYKAZ ZAŁĄCZNIKÓW FORMALNYCH (ROZPORZĄDZENIE MRPIPS Z 11 MARCA 2025 R.)"
        )
        self.cr.set_line_width(0.6)
        self.cr.move_to(self.margin_x, 504)
        self.cr.line_to(self.margin_x + self.usable_w, 504)
        self.cr.stroke()

        self.set_font(7.8)
        self.cr.set_source_rgb(0.15, 0.15, 0.15)
        ay = 524
        for idx, att in enumerate(self.app.required_attachments[:3], 1):
            status = "Dołączono" if att.is_provided else "Do uzupełnienia"
            self.cr.move_to(self.margin_x + 6, ay)
            self.cr.show_text(f"[X] {idx}. {att.title[:55]} ({status}) - {att.legal_basis[:30]}")
            ay += 22

        # 7. Section 4: UPO if submitted
        if self.app.submission_confirmation:
            self.cr.set_source_rgb(0.96, 0.99, 0.97)
            self.cr.rectangle(self.margin_x, 590, self.usable_w, 55)
            self.cr.fill()
            self.cr.set_source_rgb(0.10, 0.50, 0.25)
            self.cr.set_line_width(0.8)
            self.cr.rectangle(self.margin_x, 590, self.usable_w, 55)
            self.cr.stroke()

            self.set_font(7.5, bold=True)
            self.cr.move_to(self.margin_x + 8, 604)
            self.cr.show_text("URZĘDOWE POŚWIADCZENIE PRZEDŁOŻENIA / ODBIORU (UPO):")

            self.set_font(7.2)
            conf = self.app.submission_confirmation
            self.cr.move_to(self.margin_x + 8, 620)
            self.cr.show_text(
                f"Znak sprawy: {conf.case_number} | Status: {conf.status} | "
                f"Kod UPO: {conf.upo_reference_code}"
            )
            self.cr.move_to(self.margin_x + 8, 633)
            self.cr.show_text(
                f"Data doręczenia: {conf.submitted_at[:19]} | Adresat: {conf.recipient_name[:40]}"
            )
            sig_y = 660
            sig_h = 85.0
        else:
            sig_y = 595
            sig_h = 115.0

        # 8. Section 5: Signature Boxes (Generous vertical space)
        self.cr.set_source_rgb(0.99, 0.99, 1.0)
        self.cr.rectangle(self.margin_x, sig_y, col_w, sig_h)
        self.cr.rectangle(rx, sig_y, col_w, sig_h)
        self.cr.fill()
        self.cr.set_source_rgb(0.80, 0.85, 0.90)
        self.cr.set_line_width(0.8)
        self.cr.rectangle(self.margin_x, sig_y, col_w, sig_h)
        self.cr.rectangle(rx, sig_y, col_w, sig_h)
        self.cr.stroke()

        self.cr.set_source_rgb(0.00, 0.23, 0.44)
        self.set_font(7.5, bold=True)
        title_y = sig_y + 18 if self.app.submission_confirmation else sig_y + 20
        self.cr.move_to(self.margin_x + 8, title_y)
        self.cr.show_text("POTWIERDZENIE ODBIORU (PŁATNIK / ZUS)")
        self.cr.move_to(rx + 8, title_y)
        self.cr.show_text("PODPIS WNIOSKODAWCY (PRACOWNIKA)")

        self.set_font(7.2)
        self.cr.set_source_rgb(0.4, 0.4, 0.4)
        line1_y = sig_y + 44 if self.app.submission_confirmation else sig_y + 54
        line2_y = sig_y + 70 if self.app.submission_confirmation else sig_y + 88
        self.cr.move_to(self.margin_x + 8, line1_y)
        self.cr.show_text("Data wpływu: .......................................")
        self.cr.move_to(self.margin_x + 8, line2_y)
        self.cr.show_text("Podpis i pieczęć przyjmującego: ....................")

        self.cr.move_to(rx + 8, line1_y)
        self.cr.show_text(f"Miejscowość i data: Warszawa, {self.app.created_at[:10]} r.")
        self.cr.move_to(rx + 8, line2_y)
        self.cr.show_text("Czytelny podpis: ...................................")

        # 9. Footer
        self.draw_footer()
        self.surface.show_page()
        self.surface.finish()
        return self.buf.getvalue()


def _render_pdf_with_pure_python(app_obj: ApplicationDetailResponse) -> bytes:
    h = 842.0
    margin_x = 40.0
    usable_w = 515.0
    col_w = (usable_w - 19.0) / 2
    rx = margin_x + col_w + 19.0

    stream_ops: list[bytes] = []

    def rect(
        x: float,
        y: float,
        rw: float,
        rh: float,
        fill: tuple[float, float, float] | None = None,
        stroke: tuple[float, float, float] | None = None,
        lw: float = 0.8,
    ) -> None:
        pdf_y = h - y - rh
        if stroke:
            stream_ops.append(
                f"{stroke[0]:.2f} {stroke[1]:.2f} {stroke[2]:.2f} RG {lw:.2f} w\n".encode("ascii")
            )
        if fill:
            stream_ops.append(f"{fill[0]:.2f} {fill[1]:.2f} {fill[2]:.2f} rg\n".encode("ascii"))
        stream_ops.append(f"{x:.1f} {pdf_y:.1f} {rw:.1f} {rh:.1f} re\n".encode("ascii"))
        if fill and stroke:
            stream_ops.append(b"B\n")
        elif fill:
            stream_ops.append(b"f\n")
        elif stroke:
            stream_ops.append(b"S\n")

    def line(
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        stroke: tuple[float, float, float] = (0.7, 0.7, 0.7),
        lw: float = 0.6,
    ) -> None:
        stream_ops.append(
            f"{stroke[0]:.2f} {stroke[1]:.2f} {stroke[2]:.2f} RG {lw:.2f} w "
            f"{x1:.1f} {h - y1:.1f} m {x2:.1f} {h - y2:.1f} l S\n".encode("ascii")
        )

    def text(
        t: str,
        x: float,
        y: float,
        font: str = "/F2",
        size: float = 8.0,
        rgb: tuple[float, float, float] = (0.1, 0.1, 0.1),
    ) -> None:
        raw_bytes = _encode_pdf_text(t)
        pdf_y = h - y
        stream_ops.append(
            f"BT {font} {size} Tf {rgb[0]:.2f} {rgb[1]:.2f} {rgb[2]:.2f} rg "
            f"{x:.1f} {pdf_y:.1f} Td (".encode("ascii")
            + raw_bytes
            + b") Tj ET\n"
        )

    # 1. Top banner bar
    rect(margin_x, 34, usable_w, 3, fill=(0.0, 0.23, 0.44))
    text(
        "RZECZPOSPOLITA POLSKA • URZĘDOWY MODUŁ WNIOSKÓW I ŚWIADCZEŃ",
        margin_x,
        48,
        font="/F1",
        size=8.5,
        rgb=(0.0, 0.23, 0.44),
    )
    date_str = f"Warszawa, dn. {app_obj.created_at[:10]} r."
    text(date_str, 400, 48, font="/F2", size=8.0, rgb=(0.3, 0.3, 0.3))
    text(f"Znak ref.: {app_obj.id}", 400, 60, font="/F2", size=7.5, rgb=(0.45, 0.45, 0.45))

    # 2. Parties Box (2 columns with generous vertical breathing room)
    parties_h = 90.0
    rect(margin_x, 74, col_w, parties_h, fill=(0.98, 0.99, 1.0), stroke=(0.80, 0.85, 0.90), lw=0.8)
    text(
        "WNIOSKODAWCA (PRACOWNIK / UBEZPIECZONY):",
        margin_x + 8,
        90,
        font="/F1",
        size=7.5,
        rgb=(0.0, 0.23, 0.44),
    )
    text(
        f"{app_obj.applicant.first_name} {app_obj.applicant.last_name}",
        margin_x + 8,
        108,
        font="/F1",
        size=9.5,
    )
    text(f"PESEL: {app_obj.applicant.pesel}", margin_x + 8, 125, font="/F2", size=8.0)
    strt = app_obj.applicant.address_street or ""
    cty = app_obj.applicant.address_city or ""
    app_addr = f"Adres: {strt}, {cty}".strip(", ")
    text(app_addr[:42], margin_x + 8, 141, font="/F2", size=7.5)
    phone_s = app_obj.applicant.phone_number or "---"
    email_s = app_obj.applicant.email or "---"
    app_contact = f"Kontakt: Tel. {phone_s} | {email_s}"
    text(app_contact[:42], margin_x + 8, 156, font="/F2", size=7.2)

    rect(rx, 74, col_w, parties_h, fill=(0.98, 0.99, 1.0), stroke=(0.80, 0.85, 0.90), lw=0.8)
    text("ADRESAT (PRACODAWCA / ZUS):", rx + 8, 90, font="/F1", size=7.5, rgb=(0.0, 0.23, 0.44))
    emp_name = (
        app_obj.employer.company_name if app_obj.employer else "Zakład Ubezpieczeń Społecznych"
    )
    text(emp_name[:38], rx + 8, 108, font="/F1", size=9.5)
    emp_nip = (
        f"NIP: {app_obj.employer.nip}"
        if app_obj.employer and app_obj.employer.nip
        else "Elektroniczna Skrzynka PUE ZUS"
    )
    text(emp_nip, rx + 8, 125, font="/F2", size=8.0)
    estr = app_obj.employer.address_street or "" if app_obj.employer else ""
    ecty = app_obj.employer.address_city or "" if app_obj.employer else ""
    emp_addr = (
        f"Adres: {estr}, {ecty}".strip(", ")
        if app_obj.employer
        else "Centralny Rejestr Ubezpieczonych"
    )
    text(emp_addr[:38], rx + 8, 141, font="/F2", size=7.5)
    text("Kanał: Portal Pracowniczy / PUE eZUS", rx + 8, 156, font="/F2", size=7.2)

    # 3. Formal Document Title (Clean, authoritative header - NO GREEN FRAME)
    line(margin_x, 182, margin_x + usable_w, 182, stroke=(0.85, 0.88, 0.92), lw=0.6)
    t1 = app_obj.title[:75]
    t2 = app_obj.title[75:150] if len(app_obj.title) > 75 else ""
    if t2:
        text(t1.upper(), margin_x + 6, 196, font="/F1", size=9.5, rgb=(0.0, 0.23, 0.44))
        text(t2.upper(), margin_x + 6, 212, font="/F1", size=9.5, rgb=(0.0, 0.23, 0.44))
        lb_y = 228
    else:
        text(t1.upper(), margin_x + 6, 202, font="/F1", size=9.5, rgb=(0.0, 0.23, 0.44))
        lb_y = 222
    text(
        f"Podstawa prawna: {app_obj.legal_basis[:95]}",
        margin_x + 6,
        lb_y,
        font="/F3",
        size=7.5,
        rgb=(0.35, 0.40, 0.45),
    )
    line(margin_x, 242, margin_x + usable_w, 242, stroke=(0.85, 0.88, 0.92), lw=0.6)

    # 4. Section 1: Parameters Table (Spacious row heights of 35 pt)
    text(
        "1. WNIOSKOWANY WYMIAR I OKRES ŚWIADCZENIA / URLOPU",
        margin_x,
        262,
        font="/F1",
        size=8.5,
        rgb=(0.0, 0.23, 0.44),
    )
    line(margin_x, 266, margin_x + usable_w, 266, stroke=(0.0, 0.23, 0.44), lw=0.6)
    rect(margin_x, 274, usable_w, 105, fill=(1.0, 1.0, 1.0), stroke=(0.82, 0.85, 0.89), lw=0.8)
    line(margin_x, 309, margin_x + usable_w, 309, stroke=(0.88, 0.90, 0.93), lw=0.5)
    line(margin_x, 344, margin_x + usable_w, 344, stroke=(0.88, 0.90, 0.93), lw=0.5)
    line(margin_x + 160, 274, margin_x + 160, 379, stroke=(0.88, 0.90, 0.93), lw=0.5)

    lp_p = app_obj.leave_period
    lp_text = (
        f"Od {lp_p.start_date} do {lp_p.end_date} "
        f"({lp_p.weeks_count} tyg. / {lp_p.days_count} dni)"
    )
    text("Okres korzystania:", margin_x + 8, 296, font="/F1", size=8.0)
    text(lp_text, margin_x + 168, 296, font="/F2", size=8.0)

    text("Wariant zasiłku / stawka:", margin_x + 8, 331, font="/F1", size=8.0)
    rate_desc = (
        "Stawka 81,5% podstawy wymiaru (wniosek jednolity w terminie 21 dni)"
        if app_obj.leave_period.selected_rate_variant == "UNIFIED_81_5"
        else "Stawka 100% / 70% podstawy wymiaru"
    )
    text(rate_desc, margin_x + 168, 331, font="/F2", size=8.0)

    text("Dane dziecka:", margin_x + 8, 366, font="/F1", size=8.0)
    ch_p = app_obj.child
    ch_info = (
        f"{ch_p.first_name} {ch_p.last_name}, ur. {ch_p.date_of_birth}, "
        f"Akt: {ch_p.birth_certificate_number} ({ch_p.usc_city})"
        if ch_p
        else "---"
    )
    text(ch_info[:70], margin_x + 168, 366, font="/F2", size=8.0)

    # 5. Section 2: Declarations (Natural line spacing of 22 pt)
    text(
        "2. OŚWIADCZENIA I POUCZENIA PRAWNE WNIOSKODAWCY",
        margin_x,
        404,
        font="/F1",
        size=8.5,
        rgb=(0.0, 0.23, 0.44),
    )
    line(margin_x, 408, margin_x + usable_w, 408, stroke=(0.0, 0.23, 0.44), lw=0.6)
    text(
        "[X] Oświadczam, że drugi z rodziców nie korzysta z urlopu / "
        "zasiłku macierzyńskiego w tym samym okresie.",
        margin_x + 6,
        428,
        font="/F2",
        size=7.8,
    )
    text(
        "[X] Oświadczam pod rygorem odpowiedzialności karnej z art. 233 § 1 "
        "Kodeksu karnego, że powyższe dane są prawdziwe.",
        margin_x + 6,
        450,
        font="/F2",
        size=7.8,
    )
    text(
        "[X] Zobowiązuję się niezwłocznie powiadomić płatnika składek / ZUS "
        "o wszelkich zmianach uprawnień.",
        margin_x + 6,
        472,
        font="/F2",
        size=7.8,
    )

    # 6. Section 3: Attachments (Natural line spacing of 22 pt)
    text(
        "3. WYKAZ ZAŁĄCZNIKÓW FORMALNYCH (ROZPORZĄDZENIE MRPIPS Z 11 MARCA 2025 R.)",
        margin_x,
        500,
        font="/F1",
        size=8.5,
        rgb=(0.0, 0.23, 0.44),
    )
    line(margin_x, 504, margin_x + usable_w, 504, stroke=(0.0, 0.23, 0.44), lw=0.6)
    ay = 524
    for idx, att in enumerate(app_obj.required_attachments[:3], 1):
        status = "Dołączono" if att.is_provided else "Do uzupełnienia"
        text(
            f"[X] {idx}. {att.title[:55]} ({status}) - {att.legal_basis[:30]}",
            margin_x + 6,
            ay,
            font="/F2",
            size=7.8,
        )
        ay += 22

    # 7. Section 4: UPO if present
    if app_obj.submission_confirmation:
        rect(
            margin_x, 590, usable_w, 55, fill=(0.96, 0.99, 0.97), stroke=(0.10, 0.50, 0.25), lw=0.8
        )
        text(
            "URZĘDOWE POŚWIADCZENIE PRZEDŁOŻENIA / ODBIORU (UPO):",
            margin_x + 8,
            604,
            font="/F1",
            size=7.5,
            rgb=(0.10, 0.50, 0.25),
        )
        conf = app_obj.submission_confirmation
        text(
            f"Znak sprawy: {conf.case_number} | Status: {conf.status} | "
            f"Kod UPO: {conf.upo_reference_code}",
            margin_x + 8,
            620,
            font="/F2",
            size=7.2,
            rgb=(0.1, 0.3, 0.1),
        )
        text(
            f"Data doręczenia: {conf.submitted_at[:19]} | Adresat: {conf.recipient_name[:40]}",
            margin_x + 8,
            633,
            font="/F2",
            size=7.2,
            rgb=(0.1, 0.3, 0.1),
        )
        sig_y = 660
        sig_h = 85.0
    else:
        sig_y = 595
        sig_h = 115.0

    # 8. Section 5: Signatures (Generous vertical space)
    rect(margin_x, sig_y, col_w, sig_h, fill=(0.99, 0.99, 1.0), stroke=(0.80, 0.85, 0.90), lw=0.8)
    rect(rx, sig_y, col_w, sig_h, fill=(0.99, 0.99, 1.0), stroke=(0.80, 0.85, 0.90), lw=0.8)
    title_y = sig_y + 18 if app_obj.submission_confirmation else sig_y + 20
    text(
        "POTWIERDZENIE ODBIORU (PŁATNIK / ZUS)",
        margin_x + 8,
        title_y,
        font="/F1",
        size=7.5,
        rgb=(0.0, 0.23, 0.44),
    )
    text(
        "PODPIS WNIOSKODAWCY (PRACOWNIKA)",
        rx + 8,
        title_y,
        font="/F1",
        size=7.5,
        rgb=(0.0, 0.23, 0.44),
    )
    line1_y = sig_y + 44 if app_obj.submission_confirmation else sig_y + 54
    line2_y = sig_y + 70 if app_obj.submission_confirmation else sig_y + 88
    text(
        "Data wpływu: .......................................",
        margin_x + 8,
        line1_y,
        font="/F2",
        size=7.2,
        rgb=(0.4, 0.4, 0.4),
    )
    text(
        "Podpis i pieczęć przyjmującego: ....................",
        margin_x + 8,
        line2_y,
        font="/F2",
        size=7.2,
        rgb=(0.4, 0.4, 0.4),
    )
    text(
        f"Miejscowość i data: Warszawa, {app_obj.created_at[:10]} r.",
        rx + 8,
        line1_y,
        font="/F2",
        size=7.2,
        rgb=(0.4, 0.4, 0.4),
    )
    text(
        "Czytelny podpis: ...................................",
        rx + 8,
        line2_y,
        font="/F2",
        size=7.2,
        rgb=(0.4, 0.4, 0.4),
    )

    # 9. Footer
    line(margin_x, 810, margin_x + usable_w, 810, stroke=(0.85, 0.88, 0.92), lw=0.6)
    text(
        f"Dokument urzędowy wygenerowany w module ZUS Asystent Rodzica | "
        f"MRPiPS 2025 | ID: {app_obj.id}",
        margin_x,
        822,
        font="/F2",
        size=7.0,
        rgb=(0.45, 0.45, 0.45),
    )
    text(
        "Strona 1 z 1",
        margin_x + usable_w - 55,
        822,
        font="/F1",
        size=7.5,
        rgb=(0.45, 0.45, 0.45),
    )

    stream_bytes = b"".join(stream_ops)

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets: dict[int, int] = {}

    def obj(n: int, data: bytes) -> None:
        offsets[n] = len(output)
        output.extend(f"{n} 0 obj\n".encode("ascii") + data + b"\nendobj\n")

    obj(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    obj(2, b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    page_res = (
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> "
        b"/Contents 7 0 R >>"
    )
    obj(3, page_res)
    obj(
        4,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding "
        + PDF_DIFFS_ENCODING
        + b" /ToUnicode 8 0 R >>",
    )
    obj(
        5,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding "
        + PDF_DIFFS_ENCODING
        + b" /ToUnicode 8 0 R >>",
    )
    obj(
        6,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding "
        + PDF_DIFFS_ENCODING
        + b" /ToUnicode 8 0 R >>",
    )
    stream_header = f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
    obj(7, stream_header + stream_bytes + b"\nendstream")
    cmap_header = f"<< /Length {len(PDF_TOUNICODE_CMAP)} >>\nstream\n".encode("ascii")
    obj(8, cmap_header + PDF_TOUNICODE_CMAP + b"\nendstream")

    startxref = len(output)
    output.extend(b"xref\n0 9\n0000000000 65535 f \r\n")
    for i in range(1, 9):
        output.extend(f"{offsets[i]:010d} 00000 n \r\n".encode("ascii"))
    trailer_bytes = (
        f"trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n".encode("ascii")
    )
    output.extend(trailer_bytes)
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
            req.employer.company_name if req.employer else "Zakład Ubezpieczeń Społecznych"
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
