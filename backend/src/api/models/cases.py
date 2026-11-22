from typing import Any

from pydantic import BaseModel, Field


class CasePersonData(BaseModel):
    first_name: str
    last_name: str
    pesel: str
    is_pesel_valid: bool = True
    birth_date: str | None = None


class CasePayerData(BaseModel):
    name: str
    nip: str
    is_nip_valid: bool = True
    employee_count_status: str = "ABOVE_20"


class CaseExpectedDecision(BaseModel):
    is_eligible: bool
    benefit_percentage: float
    disbursing_entity: str = "ZUS"
    max_coverage_days: int = 0
    legal_basis: str
    key_rules: list[str] = Field(default_factory=list)


class TestCaseSummary(BaseModel):
    id: str
    title: str
    description: str
    tag: str
    category: str
    document_type: str
    pdf_filename: str | None = None


class TestCaseDetail(BaseModel):
    id: str
    title: str
    description: str
    tag: str
    category: str
    document_type: str
    pdf_filename: str | None = None
    person: CasePersonData
    payer: CasePayerData
    extracted_data: dict[str, Any] = Field(default_factory=dict)
    validation_messages: list[str] = Field(default_factory=list)
    calculator_input: dict[str, Any] = Field(default_factory=dict)
    expected_decision: CaseExpectedDecision


class TestCaseEvaluationResult(BaseModel):
    case_id: str
    title: str
    passed: bool
    calculated_result: dict[str, Any] = Field(default_factory=dict)
    expected_decision: CaseExpectedDecision
    comparison_notes: list[str] = Field(default_factory=list)


class BatchEvaluationResponse(BaseModel):
    total_cases: int
    passed_cases: int
    accuracy_percent: float
    results: list[TestCaseEvaluationResult]
