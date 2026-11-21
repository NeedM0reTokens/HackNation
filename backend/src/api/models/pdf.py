from enum import StrEnum

from pydantic import BaseModel, Field


class DocumentType(StrEnum):
    ZAM = "ZAM"
    Z3 = "Z-3"
    Z3A = "Z-3a"
    ZAS53 = "ZAS-53"
    EZLA = "e-ZLA"
    USC_BIRTH_RECORD = "USC_BIRTH_RECORD"
    INSURANCE_CERTIFICATE = "INSURANCE_CERTIFICATE"
    OTHER = "OTHER"


class InsuranceStatusBadge(StrEnum):
    ELIGIBLE = "ELIGIBLE"
    NOT_ELIGIBLE_NO_INSURANCE = "NOT_ELIGIBLE_NO_INSURANCE"
    NOT_ELIGIBLE_WAITING_PERIOD = "NOT_ELIGIBLE_WAITING_PERIOD"
    WARNING_DEBT = "WARNING_DEBT"
    NEEDS_ADDITIONAL_DOCUMENTS = "NEEDS_ADDITIONAL_DOCUMENTS"


class PersonData(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    pesel: str | None = None
    is_pesel_valid: bool = False
    birth_date: str | None = None
    gender: str | None = None


class PayerData(BaseModel):
    company_name: str | None = None
    nip: str | None = None
    is_nip_valid: bool = False
    regon: str | None = None
    payer_size: str = Field(default="ABOVE_20", description="ABOVE_20 or UP_TO_20")


class InsuranceData(BaseModel):
    employment_type: str = Field(
        default="EMPLOYMENT_CONTRACT",
        description="EMPLOYMENT_CONTRACT, MANDATE_CONTRACT, B2B, or NONE",
    )
    insurance_title_code: str | None = None
    insurance_start_date: str | None = None
    insurance_end_date: str | None = None
    insurance_duration_days: int = Field(default=0, ge=0)
    is_currently_insured: bool = True
    has_sickness_insurance: bool = True
    has_overdue_debt: bool = False
    debt_amount: float = Field(default=0.0, ge=0.0)
    gross_monthly_income: float = Field(default=0.0, ge=0.0)
    calculation_base_net: float = Field(default=0.0, ge=0.0)


class BenefitClaimData(BaseModel):
    claim_type: str = Field(default="MATERNITY", description="MATERNITY, PARENTAL, SICKNESS")
    has_pregnancy_code_b: bool = False
    child_birth_date: str | None = None
    children_count: int = Field(default=1, ge=1)
    has_za_zyciem_certificate: bool = False
    is_premature_or_hospitalized: bool = False
    sick_leave_start_date: str | None = None
    sick_leave_end_date: str | None = None
    sick_leave_duration_days: int = Field(default=0, ge=0)


class CalculatorPreFill(BaseModel):
    employment_type: str
    gross_monthly_income: float
    insurance_duration_days: int
    is_insured_at_birth: bool
    has_pregnancy_code_b: bool
    has_za_zyciem_certificate: bool
    children_born_count: int
    sick_leave_duration_days: int = Field(default=0, ge=0)
    payer_size: str


class EligibilityAssessment(BaseModel):
    is_eligible: bool
    status_badge: InsuranceStatusBadge
    confidence_score: float = Field(ge=0.0, le=1.0)
    summary: str
    reasons: list[str] = Field(default_factory=list)
    advisory_notes: list[str] = Field(default_factory=list)
    required_followup_documents: list[str] = Field(default_factory=list)


class PdfParseResponse(BaseModel):
    filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentType
    document_title: str
    raw_text_preview: str
    person: PersonData
    payer: PayerData
    insurance: InsuranceData
    claim: BenefitClaimData
    eligibility: EligibilityAssessment
    calculator_prefill: CalculatorPreFill
