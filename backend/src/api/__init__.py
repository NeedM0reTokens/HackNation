<<<<<<< HEAD
from src.api.routers.admin import AdminAPI, AdminRouter
from src.api.routers.adoption import AdoptionAPI, AdoptionRouter
from src.api.routers.calculator import CalculatorAPI, CalculatorRouter
from src.api.routers.health import HealthAPI, HealthRouter
from src.api.routers.maternity import MaternityAPI, MaternityRouter
from src.api.routers.parental_work import ParentalWorkAPI, ParentalWorkRouter
from src.api.routers.paternity import PaternityAPI, PaternityRouter
from src.api.routers.pdf import PdfAPI, PdfRouter
from src.api.routers.pregnancy import PregnancyAPI, PregnancyRouter
from src.api.routers.simulation import SimulationAPI, SimulationRouter
from src.api.routers.special_cases import SpecialCasesAPI, SpecialCasesRouter
=======
from .API import MainAPI, app
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
>>>>>>> c6e189d6c07fea4503a797e5834df1f985859c4a

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
