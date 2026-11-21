from .routers.admin import AdminAPI, AdminRouter
from .routers.calculator import CalculatorAPI, CalculatorRouter
from .routers.health import HealthAPI, HealthRouter
from .routers.pdf import PdfAPI, PdfRouter
from .routers.simulation import SimulationAPI, SimulationRouter
from .routers.special_cases import SpecialCasesAPI, SpecialCasesRouter

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

