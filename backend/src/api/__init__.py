from src.api.routers.admin import AdminAPI, AdminRouter
from src.api.routers.calculator import CalculatorAPI, CalculatorRouter
from src.api.routers.health import HealthAPI, HealthRouter
from src.api.routers.maternity import MaternityAPI, MaternityRouter
from src.api.routers.paternity import PaternityAPI, PaternityRouter
from src.api.routers.pdf import PdfAPI, PdfRouter
from src.api.routers.pregnancy import PregnancyAPI, PregnancyRouter
from src.api.routers.simulation import SimulationAPI, SimulationRouter
from src.api.routers.special_cases import SpecialCasesAPI, SpecialCasesRouter

__all__ = [
    "AdminAPI",
    "AdminRouter",
    "CalculatorAPI",
    "CalculatorRouter",
    "HealthAPI",
    "HealthRouter",
    "MaternityAPI",
    "MaternityRouter",
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
]

