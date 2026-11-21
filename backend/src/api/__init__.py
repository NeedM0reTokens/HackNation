from .api import MainAPI, app
from .routers.admin import AdminAPI, AdminRouter
from .routers.adoption import AdoptionAPI, AdoptionRouter
from .routers.calculator import CalculatorAPI, CalculatorRouter
from .routers.health import HealthAPI, HealthRouter
from .routers.maternity import MaternityAPI, MaternityRouter
from .routers.parental_work import ParentalWorkAPI, ParentalWorkRouter
from .routers.paternity import PaternityAPI, PaternityRouter
from .routers.pdf import PdfAPI, PdfRouter
from .routers.pregnancy import PregnancyAPI, PregnancyRouter
from .routers.simulation import SimulationAPI, SimulationRouter
from .routers.special_cases import SpecialCasesAPI, SpecialCasesRouter

__all__ = [
    "AdminAPI",
    "AdminRouter",
    "AdoptionAPI",
    "AdoptionRouter",
    "CalculatorAPI",
    "CalculatorRouter",
    "HealthAPI",
    "HealthRouter",
    "MainAPI",
    "MaternityAPI",
    "MaternityRouter",
    "ParentalWorkAPI",
    "ParentalWorkRouter",
    "PaternityAPI",
    "PaternityRouter",
    "PdfAPI",
    "PdfRouter",
    "PregnancyAPI",
    "PregnancyRouter",
    "SimulationAPI",
    "SimulationRouter",
    "SpecialCasesAPI",
    "SpecialCasesRouter",
    "app",
]
