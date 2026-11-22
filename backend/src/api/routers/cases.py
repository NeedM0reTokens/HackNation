import urllib.parse
from typing import Any

from fastapi import APIRouter
from fastapi.responses import Response

from ..models.cases import (
    BatchEvaluationResponse,
    TestCaseDetail,
    TestCaseEvaluationResult,
    TestCaseSummary,
)
from ..services.cases import (
    evaluate_all_cases_service,
    evaluate_case_service,
    get_case_pdf_path,
    get_case_service,
    list_cases_service,
)


class CasesRouter(APIRouter):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, prefix="/cases", tags=["Sprawy Testowe ZUS (BE-26)"], **kwargs)
        self.add_api_route(
            "",
            self.list_cases,
            methods=["GET"],
            response_model=list[TestCaseSummary],
            summary="Pobierz listę zanonimizowanych spraw testowych ZUS (BE-26)",
            description=(
                "Zwraca zestaw zanonimizowanych spraw testowych udostępnionych przez ZUS w ramach "
                "wyzwania HackNation 2026. Służy do automatycznego zasilania formularzy "
                "i demonstracji działania kalkulatora w różnych stanach faktycznych."
            ),
        )
        self.add_api_route(
            "/{case_id}",
            self.get_case_by_id,
            methods=["GET"],
            response_model=TestCaseDetail,
            summary="Pobierz szczegóły zanonimizowanej sprawy testowej (BE-26)",
            description=(
                "Zwraca pełne dane sprawy testowej: dane osobowe, płatnika, wyekstrahowane dane "
                "oraz gotowy payload dla kalkulatorów."
            ),
        )
        self.add_api_route(
            "/{case_id}/pdf",
            self.download_case_pdf,
            methods=["GET"],
            summary="Pobierz oryginalny dokument PDF sprawy ze zbioru ZUS",
            description=(
                "Zwraca plik PDF powiązany z daną sprawą testową z oficjalnego zbioru ZUS."
            ),
        )
        self.add_api_route(
            "/{case_id}/evaluate",
            self.evaluate_single_case,
            methods=["POST"],
            response_model=TestCaseEvaluationResult,
            summary="Walidacja pojedynczej sprawy przez silnik kalkulatora ZUS (Teściarka)",
            description=(
                "Przepuszcza wybraną sprawę testową przez reguły kalkulatora backendowego "
                "i porównuje wynik z wzorcową decyzją ZUS."
            ),
        )
        self.add_api_route(
            "/evaluate-all",
            self.evaluate_all_cases,
            methods=["POST"],
            response_model=BatchEvaluationResponse,
            summary="Zbiorcza walidacja wszystkich spraw testowych (Teściarka wsadowa)",
            description=(
                "Uruchamia zautomatyzowany audyt poprawności wyliczeń dla całego datasetu ZUS "
                "i zwraca statystyki zdawalności (dokładność %)."
            ),
        )

    def list_cases(self) -> list[TestCaseSummary]:
        return list_cases_service()

    def get_case_by_id(self, case_id: str) -> TestCaseDetail:
        return get_case_service(case_id)

    def download_case_pdf(self, case_id: str) -> Response:
        file_path = get_case_pdf_path(case_id)
        quoted_name = urllib.parse.quote(file_path.name)
        return Response(
            content=file_path.read_bytes(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename*=UTF-8''{quoted_name}"},
        )

    def evaluate_single_case(self, case_id: str) -> TestCaseEvaluationResult:
        return evaluate_case_service(case_id)

    def evaluate_all_cases(self) -> BatchEvaluationResponse:
        return evaluate_all_cases_service()


router = CasesRouter()
CasesAPI = CasesRouter
