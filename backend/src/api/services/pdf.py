import io
import re
from datetime import date, datetime

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

from ...constants import (
    MANDATORY_WAITING_PERIOD_DAYS,
    MIN_WAGE_2026,
    SOCIAL_CONTRIBUTIONS_RATE,
    VOLUNTARY_WAITING_PERIOD_DAYS,
    ZUS_DEBT_LIMIT,
)
from ..models.pdf import (
    BenefitClaimData,
    CalculatorPreFill,
    DocumentType,
    EligibilityAssessment,
    InsuranceData,
    InsuranceStatusBadge,
    PayerData,
    PdfParseResponse,
    PersonData,
)


def _validate_pesel(pesel: str) -> tuple[bool, str | None, str | None]:
    if not re.match(r"^\d{11}$", pesel):
        return False, None, None

    digits = [int(c) for c in pesel]
    weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
    checksum = sum(d * w for d, w in zip(digits[:10], weights, strict=True)) % 10
    control_digit = (10 - checksum) % 10

    if control_digit != digits[10]:
        return False, None, None

    year = 1900 + digits[0] * 10 + digits[1]
    month = digits[2] * 10 + digits[3]
    day = digits[4] * 10 + digits[5]

    if 81 <= month <= 92:
        year = 1800 + digits[0] * 10 + digits[1]
        month -= 80
    elif 21 <= month <= 32:
        year = 2000 + digits[0] * 10 + digits[1]
        month -= 20
    elif 41 <= month <= 52:
        year = 2100 + digits[0] * 10 + digits[1]
        month -= 40
    elif 61 <= month <= 72:
        year = 2200 + digits[0] * 10 + digits[1]
        month -= 60

    try:
        birth_date = date(year, month, day).isoformat()
    except ValueError:
        birth_date = None

    gender = "FEMALE" if digits[9] % 2 == 0 else "MALE"
    return True, birth_date, gender


def _validate_nip(nip: str) -> bool:
    clean_nip = re.sub(r"[-\s]", "", nip)
    if not re.match(r"^\d{10}$", clean_nip):
        return False

    digits = [int(c) for c in clean_nip]
    weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
    checksum = sum(d * w for d, w in zip(digits[:9], weights, strict=True)) % 11
    return checksum == digits[9]


def _extract_text_from_pdf_bytes(file_bytes: bytes) -> tuple[str, int]:
    if not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. The uploaded file is not a valid PDF document.",
        )

    try:
        stream = io.BytesIO(file_bytes)
        reader = PdfReader(stream)
        page_count = len(reader.pages)
        if page_count == 0:
            raise HTTPException(status_code=400, detail="The uploaded PDF file has zero pages.")

        extracted_parts: list[str] = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_parts.append(text)

        full_text = "\n".join(extracted_parts)
        return full_text, page_count
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to parse PDF document. It may be encrypted or corrupted: {exc}",
        ) from exc


def _classify_document(text: str) -> tuple[DocumentType, str]:
    text_upper = text.upper()

    if "Z-3A" in text_upper or (
        ("ZAŚWIADCZENIE PŁATNIKA" in text_upper or "ZASWIADCZENIE PLATNIKA" in text_upper)
        and "ZLECEN" in text_upper
    ):
        return DocumentType.Z3A, "Z-3a Social Security Contribution Payer Certificate"
    if (
        "Z-3" in text_upper
        or "ZAŚWIADCZENIE PŁATNIKA SKŁADEK" in text_upper
        or "ZASWIADCZENIE PLATNIKA SKLADEK" in text_upper
    ):
        return DocumentType.Z3, "Z-3 Social Security Contribution Payer Certificate"
    if (
        "ZAM" in text_upper
        or "WNIOSEK O ZASIŁEK MACIERZYŃSKI" in text_upper
        or "WNIOSEK O ZASILEK MACIERZYNSKI" in text_upper
    ):
        return DocumentType.ZAM, "ZAM Maternity and Parental Allowance Application"
    if (
        "ZAS-53" in text_upper
        or "DZIAŁALNOŚCI POZAROLNICZEJ" in text_upper
        or "DZIALALNOSCI POZAROLNICZEJ" in text_upper
    ):
        return DocumentType.ZAS53, "ZAS-53 Self-Employed Benefit Claim Application"
    if (
        "E-ZLA" in text_upper
        or "ZAŚWIADCZENIE LEKARSKIE" in text_upper
        or "ZASWIADCZENIE LEKARSKIE" in text_upper
    ):
        return DocumentType.EZLA, "e-ZLA Electronic Medical Leave Certificate"
    if (
        "AKT URODZENIA" in text_upper
        or "URZĄD STANU CYWILNEGO" in text_upper
        or "URZAD STANU CYWILNEGO" in text_upper
    ):
        return DocumentType.USC_BIRTH_RECORD, "USC Official Birth Record Certificate"
    if (
        "POŚWIADCZENIE" in text_upper
        or "POSWIADCZENIE" in text_upper
        or "US-7" in text_upper
        or "UBEZPIECZEN" in text_upper
    ):
        return DocumentType.INSURANCE_CERTIFICATE, "ZUS Insurance Status Certificate"

    return DocumentType.OTHER, "General ZUS Document / Notice"


def _extract_person_data(text: str) -> PersonData:
    person = PersonData()

    pesel_matches = re.findall(r"\b\d{11}\b", text)
    for candidate in pesel_matches:
        is_valid, b_date, gender = _validate_pesel(candidate)
        if is_valid:
            person.pesel = candidate
            person.is_pesel_valid = True
            person.birth_date = b_date
            person.gender = gender
            break

    if not person.pesel and pesel_matches:
        person.pesel = pesel_matches[0]
        person.is_pesel_valid = False

    name_patterns = [
        r"(?:Imi[ęe] i nazwisko|Ubezpieczony|Imi[ęe]|Nazwisko)[:\s]+"
        + r"([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)",
        r"(?:Pani|Pan)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)",
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text)
        if match:
            person.first_name = match.group(1).strip()
            person.last_name = match.group(2).strip()
            break

    return person


def _extract_payer_data(text: str) -> PayerData:
    payer = PayerData()

    nip_matches = re.findall(r"\b\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}\b|\b\d{10}\b", text)
    for candidate in nip_matches:
        clean = re.sub(r"[-\s]", "", candidate)
        if _validate_nip(clean):
            payer.nip = clean
            payer.is_nip_valid = True
            break

    if not payer.nip and nip_matches:
        payer.nip = re.sub(r"[-\s]", "", nip_matches[0])
        payer.is_nip_valid = False

    regon_match = re.search(r"\bREGON[:\s]*(\d{9}|\d{14})\b", text, re.I)
    if regon_match:
        payer.regon = regon_match.group(1)

    company_patterns = [
        r"(?:P[łl]atnik\s+sk[łl]adek|Nazwa\s+firmy|Pracodawca|Firma)[:\s]+([^\n\r]{2,80})",
        r"([A-ZĄĆĘŁŃÓŚŹŻ][^\n\r]{1,60}(?:Sp\.\s*z\s*o\.o\.|S\.A\.|Sp[óo][łl]ka\s+z\s+o\.o\.))",
    ]
    for pattern in company_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            payer.company_name = match.group(1).strip()
            break

    text_lower = text.lower()
    above_20_pattern = r"(?:powyżej|powyzej|więcej niż|wiecej niz)\s*20|\b>\s*20\b"
    below_20_pattern = (
        r"(?:do|mniej niż|mniej niz)\s*20\s*(?:osób|osob|ubezpieczonych|pracowników|pracownikow)"
        + r"|\b<=\s*20\b"
    )

    if re.search(above_20_pattern, text_lower):
        payer.payer_size = "ABOVE_20"
    elif re.search(below_20_pattern, text_lower):
        payer.payer_size = "UP_TO_20"

    return payer


def _extract_insurance_data(text: str, doc_type: DocumentType) -> InsuranceData:
    insurance = InsuranceData()
    text_upper = text.upper()

    if doc_type == DocumentType.Z3:
        insurance.employment_type = "EMPLOYMENT_CONTRACT"
    elif doc_type == DocumentType.Z3A:
        insurance.employment_type = "MANDATE_CONTRACT"
    elif doc_type == DocumentType.ZAS53:
        insurance.employment_type = "B2B"
    elif "UMOWA O PRAC" in text_upper or "KODEKS PRACY" in text_upper:
        insurance.employment_type = "EMPLOYMENT_CONTRACT"
    elif "UMOWA ZLECENIE" in text_upper or "ZLECENIOBIORCA" in text_upper:
        insurance.employment_type = "MANDATE_CONTRACT"
    elif (
        "DZIAŁALNOŚĆ GOSPODARCZA" in text_upper
        or "DZIALALNOSC GOSPODARCZA" in text_upper
        or "POZAROLNICZA" in text_upper
    ):
        insurance.employment_type = "B2B"

    code_match = re.search(r"\b(01\s?10|04\s?11|05\s?10|05\s?70|05\s?90)\b", text)
    if code_match:
        insurance.insurance_title_code = code_match.group(0).replace(" ", "")

    dates = re.findall(r"\b(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})\b", text)
    if len(dates) >= 2:
        d1 = _parse_date(dates[0])
        d2 = _parse_date(dates[1])
        if d1 and d2 and d2 >= d1:
            insurance.insurance_start_date = d1.isoformat()
            insurance.insurance_end_date = d2.isoformat()
            insurance.insurance_duration_days = (d2 - d1).days + 1
            insurance.is_currently_insured = d2 >= date.today()

    days_pattern = r"(?:okres ubezpieczenia|sta[żz] ubezpieczenia)[^:\n]*[:\s]+(\d+)\s*dni"
    days_match = re.search(days_pattern, text, re.I)
    if days_match:
        insurance.insurance_duration_days = int(days_match.group(1))
    elif not insurance.insurance_duration_days:
        insurance.insurance_duration_days = 180

    no_insurance_patterns = (
        "NIE PODLEGA UBEZPIECZENIU",
        "BRAK UBEZPIECZENIA",
        "NIE ZGŁOSIŁ",
        "NIE ZGLOSIL",
    )
    if any(p in text_upper for p in no_insurance_patterns):
        insurance.is_currently_insured = False
        insurance.has_sickness_insurance = False

    amounts = re.findall(r"\b(\d{1,3}(?:[\s\.]\d{3})*|\d+)[,\.](\d{2})\s*(?:zł|zl|PLN)?\b", text)
    parsed_amounts: list[float] = []
    for whole, cents in amounts:
        clean_whole = re.sub(r"[\s\.]", "", whole)
        try:
            val = float(f"{clean_whole}.{cents}")
            if 1000.0 <= val <= 200000.0:
                parsed_amounts.append(val)
        except ValueError:
            continue

    if parsed_amounts:
        gross = max(parsed_amounts)
        insurance.gross_monthly_income = round(gross, 2)
    else:
        insurance.gross_monthly_income = MIN_WAGE_2026

    insurance.calculation_base_net = round(
        insurance.gross_monthly_income * (1 - SOCIAL_CONTRIBUTIONS_RATE / 100), 2
    )

    debt_match = re.search(
        r"(?:zad[łl]u[żz]enie|zaleg[łl]o[śs][ćc]|kwota d[łl]ugu)[:\s]+(\d+(?:[\.,]\d{2})?)",
        text,
        re.I,
    )
    if debt_match:
        debt_val = float(debt_match.group(1).replace(",", "."))
        insurance.debt_amount = debt_val
        insurance.has_overdue_debt = debt_val > ZUS_DEBT_LIMIT

    return insurance


def _parse_date(d_str: str) -> date | None:
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(d_str, fmt).date()
        except ValueError:
            pass
    return None


def _extract_claim_data(text: str, doc_type: DocumentType) -> BenefitClaimData:
    claim = BenefitClaimData()
    text_upper = text.upper()

    code_b_found = any(k in text_upper for k in ("KOD B", "KODEM B", "CIĄŻA", "CIAZA"))
    if code_b_found:
        claim.has_pregnancy_code_b = True

    if "ZA ŻYCIEM" in text_upper or "ZA ZYCIEM" in text_upper:
        claim.has_za_zyciem_certificate = True

    if "WCZEŚNIAK" in text_upper or "WCZESNIAK" in text_upper or "HOSPITALIZAC" in text_upper:
        claim.is_premature_or_hospitalized = True

    if any(
        k in text_upper
        for k in ("TROJACZKI", "3 DZIECI", "TROJE DZIECI", "TROJGA DZIECI")
    ):
        claim.children_count = 3
    elif any(
        k in text_upper
        for k in ("BLIŹNIĘTA", "BLIZNIETA", "2 DZIECI", "DWOJE DZIECI", "DWOJGA DZIECI")
    ):
        claim.children_count = 2
    else:
        claim.children_count = 1

    is_sickness_doc = (
        doc_type == DocumentType.EZLA
        or "E-ZLA" in text_upper
        or "ZASWIADCZENIE LEKARSKIE" in text_upper
        or "ZAŚWIADCZENIE LEKARSKIE" in text_upper
        or "CHOROBOW" in text_upper
    )
    is_maternity_doc = (
        doc_type in (DocumentType.ZAM, DocumentType.USC_BIRTH_RECORD)
        or "MACIERZYŃSK" in text_upper
        or "MACIERZYNSK" in text_upper
        or "RODZICIELSK" in text_upper
        or "OJCOWSK" in text_upper
    )

    if is_sickness_doc and not is_maternity_doc:
        claim.claim_type = "SICKNESS"
    else:
        claim.claim_type = "MATERNITY"

    sick_days_pat = r"(?:okres niezdolno[śs]ci|zwolnienie na|na okres)[:\s]+(\d+)\s*dni"
    sick_days_match = re.search(sick_days_pat, text, re.I)
    if sick_days_match:
        claim.sick_leave_duration_days = int(sick_days_match.group(1))
    elif claim.claim_type == "SICKNESS":
        claim.sick_leave_duration_days = 30
    else:
        claim.sick_leave_duration_days = 0

    return claim


def _assess_eligibility(
    doc_type: DocumentType,
    person: PersonData,
    payer: PayerData,
    insurance: InsuranceData,
    claim: BenefitClaimData,
) -> EligibilityAssessment:
    reasons: list[str] = []
    advisory_notes: list[str] = []
    followup_docs: list[str] = []

    req_waiting_days = (
        MANDATORY_WAITING_PERIOD_DAYS
        if insurance.employment_type == "EMPLOYMENT_CONTRACT"
        else VOLUNTARY_WAITING_PERIOD_DAYS
    )

    is_eligible = True
    status_badge = InsuranceStatusBadge.ELIGIBLE
    confidence = 0.85

    if person.is_pesel_valid:
        confidence += 0.08
    if insurance.insurance_duration_days > 0:
        confidence += 0.05
    confidence = min(confidence, 0.99)

    if not insurance.is_currently_insured:
        is_eligible = False
        status_badge = InsuranceStatusBadge.NOT_ELIGIBLE_NO_INSURANCE
        reasons.append(
            "Applicant is not covered by active statutory social insurance "
            + "(insurance period ended or no active coverage)."
        )
        followup_docs.append(
            "Application for Parental Allowance (kosiniakowe) submitted to MOPS/GOPS"
        )

    elif claim.claim_type == "SICKNESS" and insurance.insurance_duration_days < req_waiting_days:
        missing_days = req_waiting_days - insurance.insurance_duration_days
        is_eligible = False
        status_badge = InsuranceStatusBadge.NOT_ELIGIBLE_WAITING_PERIOD
        reasons.append(
            f"Statutory waiting period not fulfilled. Required: {req_waiting_days} days. "
            + f"Current record: {insurance.insurance_duration_days} days "
            + f"(missing {missing_days} days)."
        )

    elif insurance.has_overdue_debt:
        is_eligible = False
        status_badge = InsuranceStatusBadge.WARNING_DEBT
        reasons.append(
            f"Outstanding ZUS contribution debt ({insurance.debt_amount:.2f} PLN) exceeds "
            + f"statutory tolerance limit of {ZUS_DEBT_LIMIT:.2f} PLN."
        )
        advisory_notes.append(
            "Settling all outstanding contributions within 6 months from the date of incapacity "
            + "restores entitlement to benefit with retroactive effect."
        )

    if is_eligible:
        if claim.claim_type == "SICKNESS":
            reasons.append(
                f"Active insurance verified ({insurance.employment_type}). "
                + f"Waiting period satisfied ({insurance.insurance_duration_days} "
                + f"days >= {req_waiting_days} days)."
            )
        else:
            reasons.append(
                f"Active insurance verified ({insurance.employment_type}). "
                + "No statutory waiting period required for maternity benefits."
            )

    if payer.payer_size == "ABOVE_20":
        advisory_notes.append(
            "Payer employs over 20 insured persons: the employer calculates and pays the benefit "
            + "directly (no need to submit Z-3 to ZUS unless employment has ended)."
        )
    elif payer.payer_size == "UP_TO_20":
        advisory_notes.append(
            "Payer employs up to 20 insured persons: ZUS calculates and pays the benefit "
            + "after receiving Z-3/Z-3a from the employer."
        )

    if claim.claim_type == "SICKNESS":
        if claim.has_pregnancy_code_b:
            advisory_notes.append(
                "Medical certificate includes Code B: 100% replacement rate applies. "
                + "Maximum statutory sick leave duration extended to 270 days."
            )
        if (
            insurance.employment_type == "EMPLOYMENT_CONTRACT"
            and 0 < claim.sick_leave_duration_days <= 33
        ):
            advisory_notes.append(
                "For employment contracts, the employer pays sick pay (wynagrodzenie chorobowe) "
                + "for the first 33 days of incapacity in a calendar year; ZUS sickness allowance "
                + "starts from day 34."
            )
        if payer.payer_size != "ABOVE_20":
            followup_docs.append("Employer confirmation Z-3 or Z-3a submitted to ZUS")
    else:
        advisory_notes.append(
            "Submit maternity and parental allowance application within 21 days from child birth "
            + "to qualify for the unified 81.5% allowance rate across both periods."
        )
        followup_docs.append("Shortened copy of child birth certificate (odpis aktu urodzenia)")

    summary = (
        f"Document {doc_type.value} analyzed successfully. "
        + f"Eligibility status: {status_badge.value}. "
        + f"Calculation base established at {insurance.gross_monthly_income:.2f} PLN."
    )

    return EligibilityAssessment(
        is_eligible=is_eligible,
        status_badge=status_badge,
        confidence_score=round(confidence, 2),
        summary=summary,
        reasons=reasons,
        advisory_notes=advisory_notes,
        required_followup_documents=followup_docs,
    )


def parse_and_validate_pdf(file_bytes: bytes, filename: str) -> PdfParseResponse:
    raw_text, page_count = _extract_text_from_pdf_bytes(file_bytes)
    doc_type, doc_title = _classify_document(raw_text)

    person = _extract_person_data(raw_text)
    payer = _extract_payer_data(raw_text)
    insurance = _extract_insurance_data(raw_text, doc_type)
    claim = _extract_claim_data(raw_text, doc_type)

    eligibility = _assess_eligibility(doc_type, person, payer, insurance, claim)

    calculator_prefill = CalculatorPreFill(
        employment_type=insurance.employment_type,
        gross_monthly_income=insurance.gross_monthly_income,
        insurance_duration_days=insurance.insurance_duration_days,
        is_insured_at_birth=insurance.is_currently_insured,
        has_pregnancy_code_b=claim.has_pregnancy_code_b,
        has_za_zyciem_certificate=claim.has_za_zyciem_certificate,
        children_born_count=claim.children_count,
        sick_leave_duration_days=claim.sick_leave_duration_days,
        payer_size=payer.payer_size,
    )

    preview = (raw_text[:600] + "...") if len(raw_text) > 600 else raw_text

    return PdfParseResponse(
        filename=filename,
        file_size_bytes=len(file_bytes),
        page_count=page_count,
        document_type=doc_type,
        document_title=doc_title,
        raw_text_preview=preview.strip(),
        person=person,
        payer=payer,
        insurance=insurance,
        claim=claim,
        eligibility=eligibility,
        calculator_prefill=calculator_prefill,
    )


async def parse_pdf_service(file: UploadFile) -> PdfParseResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. File must have a .pdf extension.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum allowable limit of 15 MB.",
        )

    return parse_and_validate_pdf(file_bytes, file.filename)
