from .api import MainAPI, app
from .routers.admin import AdminAPI, AdminRouter
from .routers.adoption import AdoptionAPI, AdoptionRouter
from .routers.applications import ApplicationsAPI, ApplicationsRouter
from .routers.assistant import AssistantAPI, AssistantRouter
from .routers.auth import AuthAPI, AuthRouter
from .routers.calculator import CalculatorAPI, CalculatorRouter
from .routers.health import HealthAPI, HealthRouter
from .routers.maternity import MaternityAPI, MaternityRouter
from .routers.mock import MockRouter, ZusRouter
from .routers.parental_work import ParentalWorkAPI, ParentalWorkRouter
from .routers.paternity import PaternityAPI, PaternityRouter
from .routers.pdf import PdfAPI, PdfRouter
from .routers.pregnancy import PregnancyAPI, PregnancyRouter
from .routers.special_cases import SpecialCasesAPI, SpecialCasesRouter

__all__ = [
    "AdminAPI",
    "AdminRouter",
    "AdoptionAPI",
    "AdoptionRouter",
    "ApplicationsAPI",
    "ApplicationsRouter",
    "AssistantAPI",
    "AssistantRouter",
    "AuthAPI",
    "AuthRouter",
    "CalculatorAPI",
    "CalculatorRouter",
    "HealthAPI",
    "HealthRouter",
    "MainAPI",
    "MaternityAPI",
    "MaternityRouter",
    "MockRouter",
    "ParentalWorkAPI",
    "ParentalWorkRouter",
    "PaternityAPI",
    "PaternityRouter",
    "PdfAPI",
    "PdfRouter",
    "PregnancyAPI",
    "PregnancyRouter",
    "SpecialCasesAPI",
    "SpecialCasesRouter",
    "ZusRouter",
    "app",
]
