from .admin import AdminRouter
from .adoption import AdoptionRouter
from .auth import AuthRouter
from .calculator import CalculatorRouter
from .health import HealthRouter
from .maternity import MaternityRouter
from .mock import MockRouter, SimulationRouter
from .parental_work import ParentalWorkRouter
from .paternity import PaternityRouter
from .pdf import PdfRouter
from .pregnancy import PregnancyRouter
from .special_cases import SpecialCasesRouter

__all__ = [
    "AdminRouter",
    "AdoptionRouter",
    "AuthRouter",
    "CalculatorRouter",
    "HealthRouter",
    "MaternityRouter",
    "MockRouter",
    "ParentalWorkRouter",
    "PaternityRouter",
    "PdfRouter",
    "PregnancyRouter",
    "SimulationRouter",
    "SpecialCasesRouter",
]
