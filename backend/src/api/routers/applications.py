from typing import Annotated, Any

from fastapi import APIRouter, Query, Response, status

from ..models.applications import (
    ApplicationCategory,
    ApplicationCreateRequest,
    ApplicationDetailResponse,
    ApplicationPrefillRequest,
    ApplicationPrefillResponse,
    ApplicationTemplateInfo,
    ApplicationType,
    SubmissionConfirmation,
    SubmissionRequest,
)
from ..services.applications import (
    create_application_service,
    generate_application_pdf_service,
    get_application_service,
    get_application_template_service,
    list_application_templates_service,
    prefill_application_service,
    render_application_pdf_from_request_service,
    submit_application_service,
)


class ApplicationsRouter(APIRouter):
    """
    Router obsługujący symulację wniosków o urlopy i świadczenia (BE-29 / BE-30).
    Rozróżnia:
    - Wnioski o urlop do pracodawcy (projektowane formularze wg MRPiPS i Kodeksu pracy)
    - Wnioski o świadczenia do ZUS (oficjalne formularze urzędowe www.zus.pl, np. ZAM, ZAS-53, Z-3)
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(
            *args,
            prefix="/applications",
            tags=["Wnioski o Urlopy i Świadczenia (MRPiPS / ZUS)"],
            **kwargs,
        )
        self.add_api_route(
            "/templates",
            self.list_templates,
            methods=["GET"],
            response_model=list[ApplicationTemplateInfo],
            summary="Katalog szablonów wniosków (Pracodawca vs ZUS)",
            description=(
                "Zwraca zestawienie dostępnych wniosków z podziałem na kategorię:\n"
                "- EMPLOYER_LEAVE: wnioski o urlopy do pracodawcy (wymagające zaprojektowania)\n"
                "- ZUS_BENEFIT: wnioski o zasiłki do ZUS (oficjalne druki ZUS ze strony zus.pl)"
            ),
        )
        self.add_api_route(
            "/templates/{app_type}",
            self.get_template_details,
            methods=["GET"],
            response_model=ApplicationTemplateInfo,
            summary="Szczegóły wybranego szablonu wniosku i lista załączników",
        )
        self.add_api_route(
            "/prefill",
            self.prefill_application,
            methods=["POST"],
            response_model=ApplicationPrefillResponse,
            summary="Automatyczne uzupełnienie wniosku z kalkulatora / profilu",
            description=(
                "Pobiera tożsamość z mObywatel/ZUS oraz parametry z kalkulatora "
                "i automatycznie pre-populuje formularz wniosku wraz z harmonogramem."
            ),
        )
        self.add_api_route(
            "",
            self.create_application,
            methods=["POST"],
            response_model=ApplicationDetailResponse,
            status_code=status.HTTP_201_CREATED,
            summary="Wygenerowanie formalnego pisma wniosku (podgląd)",
            description=(
                "Tworzy instancję wniosku, formatuje formalny tekst pisma urzędowego/pracowniczego "
                "zgodny z przepisami MRPiPS oraz waliduje kompletność danych."
            ),
        )
        self.add_api_route(
            "/render-pdf",
            self.render_application_pdf_direct,
            methods=["POST"],
            summary="Bezpośrednie wygenerowanie pliku PDF wniosku bez konieczności zapisywania",
            response_class=Response,
            responses={
                200: {
                    "content": {"application/pdf": {}},
                    "description": "Zwraca binarny plik PDF pisma urzędowego / pracowniczego.",
                }
            },
        )
        self.add_api_route(
            "/{app_id}",
            self.get_application,
            methods=["GET"],
            response_model=ApplicationDetailResponse,
            summary="Pobranie szczegółów wygenerowanego wniosku",
        )
        self.add_api_route(
            "/{app_id}/pdf",
            self.download_application_pdf,
            methods=["GET"],
            summary="Pobranie gotowego do druku pliku PDF wniosku",
            response_class=Response,
            responses={
                200: {
                    "content": {"application/pdf": {}},
                    "description": "Zwraca binarny plik PDF pisma urzędowego / pracowniczego.",
                }
            },
        )
        self.add_api_route(
            "/{app_id}/submit",
            self.submit_application,
            methods=["POST"],
            response_model=SubmissionConfirmation,
            summary="Symulacja wysyłki wniosku do pracodawcy lub ZUS",
            description=(
                "Symuluje oficjalne złożenie wniosku: generuje numer sprawy/kancelaryjny, "
                "UPO (Urzędowe Poświadczenie Odbioru) oraz precyzuje następne kroki proceduralne."
            ),
        )

    def list_templates(
        self,
        category: Annotated[
            ApplicationCategory | None,
            Query(
                description="Filtrowanie: EMPLOYER_LEAVE (pracodawca) lub ZUS_BENEFIT (ZUS)"
            ),
        ] = None,
    ) -> list[ApplicationTemplateInfo]:
        return list_application_templates_service(category)

    def get_template_details(self, app_type: ApplicationType) -> ApplicationTemplateInfo:
        return get_application_template_service(app_type)

    def prefill_application(self, req: ApplicationPrefillRequest) -> ApplicationPrefillResponse:
        return prefill_application_service(req)

    def create_application(self, req: ApplicationCreateRequest) -> ApplicationDetailResponse:
        return create_application_service(req)

    def get_application(self, app_id: str) -> ApplicationDetailResponse:
        return get_application_service(app_id)

    def download_application_pdf(
        self,
        app_id: str,
        download: Annotated[
            bool,
            Query(
                description=(
                    "Jeśli true: wymusza pobranie pliku (attachment); "
                    "jeśli false: podgląd w przeglądarce (inline)"
                )
            ),
        ] = False,
    ) -> Response:
        pdf_bytes = generate_application_pdf_service(app_id)
        filename = f"wniosek-{app_id}.pdf"
        disposition = "attachment" if download else "inline"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        )

    def render_application_pdf_direct(self, req: ApplicationCreateRequest) -> Response:
        pdf_bytes = render_application_pdf_from_request_service(req)
        filename = f"wniosek-{req.application_type.value}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        )

    def submit_application(self, app_id: str, sub_req: SubmissionRequest) -> SubmissionConfirmation:
        return submit_application_service(app_id, sub_req)


router = ApplicationsRouter()
ApplicationsAPI = ApplicationsRouter
