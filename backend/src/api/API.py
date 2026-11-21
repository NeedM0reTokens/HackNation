from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.admin import AdminRouter
from .routers.adoption import AdoptionRouter
from .routers.calculator import CalculatorRouter
from .routers.health import HealthRouter
from .routers.maternity import MaternityRouter
from .routers.parental_work import ParentalWorkRouter
from .routers.paternity import PaternityRouter
from .routers.pdf import PdfRouter
from .routers.pregnancy import PregnancyRouter
from .routers.simulation import SimulationRouter
from .routers.special_cases import SpecialCasesRouter


class MainAPI(FastAPI):
    """
    Główna klasa API (dziedzicząca po FastAPI).
    W niej konfigurowany jest middleware (CORS) oraz podpinane są routery
    poszczególnych funkcjonalności będące osobnymi klasami dziedziczącymi po APIRouter.
    """

    def __init__(self, **extra):
        super().__init__(
            title="Zasiłkowy Przewodnik Przyszłego Rodzica API",
            version="1.0.0",
            description="API dla Zasiłkowego Przewodnika Przyszłego Rodzica (HackNation 2026).",
            docs_url="/docs",
            redoc_url="/redoc",
            **extra,
        )
        self.setup_middleware()
        self.register_routers()

    def setup_middleware(self):
        # Konfiguracja CORS - pozwala frontendowi (React / Vite) na swobodną komunikację
        self.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "*",
            ],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def register_routers(self):
        # Instancje osobnych klas routerów dla poszczególnych funkcjonalności
        self.health_router = HealthRouter()
        self.calculator_router = CalculatorRouter()
        self.pdf_router = PdfRouter()
        self.simulation_router = SimulationRouter()
        self.admin_router = AdminRouter()
        self.pregnancy_router = PregnancyRouter()
        self.maternity_router = MaternityRouter()
        self.special_cases_router = SpecialCasesRouter()
        self.paternity_router = PaternityRouter()
        self.parental_work_router = ParentalWorkRouter()
        self.adoption_router = AdoptionRouter()

        # Podpinanie routerów do głównej klasy API
        self.include_router(self.health_router)
        self.include_router(self.calculator_router, prefix="/api")
        self.include_router(self.pdf_router, prefix="/api")
        self.include_router(self.simulation_router, prefix="/api")
        self.include_router(self.admin_router, prefix="/api")
        self.include_router(self.pregnancy_router)
        self.include_router(self.maternity_router)
        self.include_router(self.special_cases_router, prefix="/api")
        self.include_router(self.paternity_router, prefix="/api")
        self.include_router(self.parental_work_router, prefix="/api")
        self.include_router(self.adoption_router, prefix="/api")


# Instancja głównej klasy API (uruchamiana przez uvicorn src.main:app lub src.api.API:app)
app = MainAPI()


