from app.api.admin import AdminAPI, AdminRouter
from app.api.calculator import CalculatorAPI, CalculatorRouter
from app.api.health import HealthAPI, HealthRouter
from app.api.pdf import PdfAPI, PdfRouter
from app.api.simulation import SimulationAPI, SimulationRouter

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
]
