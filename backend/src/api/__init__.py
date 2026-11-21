from src.api.routers.admin import AdminAPI, AdminRouter
from src.api.routers.calculator import CalculatorAPI, CalculatorRouter
from src.api.routers.health import HealthAPI, HealthRouter
from src.api.routers.pdf import PdfAPI, PdfRouter
from src.api.routers.simulation import SimulationAPI, SimulationRouter
from src.api.routers.special_cases import SpecialCasesAPI, SpecialCasesRouter

__all__ = [
    "AdminAPI",
    "AdminRouter",
    "CalculatorAPI",
    "CalculatorRouter",
    "HealthAPI",
    "HealthRouter",
    "PdfAPI",
    "PdfRouter",
    "SimulationAPI",
    "SimulationRouter",
    "SpecialCasesAPI",
    "SpecialCasesRouter",
]
