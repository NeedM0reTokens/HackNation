from .admin import AdminRouter
from .adoption import AdoptionRouter
from .assistant import AssistantRouter
from .auth import AuthRouter
from .calculator import CalculatorRouter
from .cases import CasesRouter
from .health import HealthRouter
from .maternity import MaternityRouter
from .mock import MockRouter, ZusRouter
from .parental_work import ParentalWorkRouter
from .paternity import PaternityRouter
from .pdf import PdfRouter
from .pregnancy import PregnancyRouter
from .special_cases import SpecialCasesRouter

__all__ = [
    "AdminRouter",
    "AdoptionRouter",
    "AssistantRouter",
    "AuthRouter",
    "CalculatorRouter",
    "CasesRouter",
    "HealthRouter",
    "MaternityRouter",
    "MockRouter",
    "ParentalWorkRouter",
    "PaternityRouter",
    "PdfRouter",
    "PregnancyRouter",
    "SpecialCasesRouter",
    "ZusRouter",
]
