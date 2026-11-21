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

OPENAPI_TAGS = [
    {
        "name": "Health",
        "description": "Endpointy diagnostyczne weryfikujące dostępność serwera i gotowość API.",
    },
    {
        "name": "Admin Panel",
        "description": (
            "Panel administracyjny: dynamiczny odczyt i aktualizacja wskaźników prawnych "
            "(stopy 100/70/81.5%, płaca minimalna, wymiary urlopów) w locie bez restartu "
            "(BE-01, BE-02, BE-03)."
        ),
    },
    {
        "name": "Kalkulator Zasiłków i Oś Czasu",
        "description": (
            "Główny zintegrowany kalkulator rodzicielski (BE-21) z generowaniem harmonogramu "
            "dat dziennych, kamieni milowych i miesięcznego cashflow oraz systemem presetów "
            "dla zakładek UI."
        ),
    },
    {
        "name": "Pregnancy Benefits",
        "description": (
            "Kalkulator zasiłków w ciąży: zwolnienie lekarskie kod B (100%), okres wyczekiwania, "
            "świadczenie rehabilitacyjne oraz ochrona przed upadłością pracodawcy (BE-04 - BE-08)."
        ),
    },
    {
        "name": "Maternity Benefits",
        "description": (
            "Kalkulator urlopu macierzyńskiego i rodzicielskiego: porównanie wariantu 81,5% vs "
            "100%/70%, 14 tygodni matki, części urlopu (BE-09 - BE-12)."
        ),
    },
    {
        "name": "Paternity & Family Sharing",
        "description": (
            "Urlop ojcowski (14 dni, 100%), przejęcie macierzyńskiego przez ojca "
            "(standard 14 tyg. lub 8/0 tyg. w sytuacjach szczególnych) oraz symulacja "
            "podziału opieki (BE-16, BE-17, BE-18)."
        ),
    },
    {
        "name": "Parental Work Combination",
        "description": (
            "Łączenie urlopu rodzicielskiego z pracą na max 1/2 etatu: proporcjonalne wydłużenie "
            "urlopu (do 64/82 tyg.) i redukcja zasiłku (BE-19)."
        ),
    },
    {
        "name": "Adoption & Foster Care",
        "description": (
            "Urlop na warunkach macierzyńskiego dla rodziców adopcyjnych i rodzin zastępczych "
            "niezawodowych: limity 7/10/14 lat i gwarantowane minimum 9 tygodni (BE-20)."
        ),
    },
    {
        "name": "Special Cases",
        "description": (
            "Przypadki szczególne: zaświadczenie 'Za życiem' (+24 tyg., 4000 zł), wcześniak "
            "i hospitalizacja (uzupełniający urlop do 15 tyg.) oraz urodzenie martwe/zgon "
            "dziecka (BE-13 - BE-15)."
        ),
    },
    {
        "name": "PDF Processing & Extraction",
        "description": (
            "Ekstrakcja formularzy ZUS (Z-3, Z-3a, ZAM, e-ZLA) z plików PDF, walidacja PESEL/NIP "
            "i automatyczne zasilanie kalkulatorów (BE-22 - BE-25)."
        ),
    },
    {
        "name": "Symulacja mObywatel / ZUS",
        "description": (
            "Profile testowe ubezpieczonych oraz weryfikacja dopuszczalnego limitu zadłużenia "
            "składkowego w ZUS dla przedsiębiorców (BE-26)."
        ),
    },
]


class MainAPI(FastAPI):
    def __init__(self, **extra):
        super().__init__(
            title="Zasiłkowy Przewodnik Przyszłego Rodzica API",
            version="1.0.0",
            description=(
                "Kompleksowe API dla Zasiłkowego Przewodnika Przyszłego Rodzica (HackNation 2026). "
                "Zawiera silnik kalkulatorów świadczeń rodzicielskich (macierzyński, rodzicielski, "
                "ojcowski, w ciąży, praca na 1/2 etatu, adopcja, przypadki szczególne), "
                "generowanie harmonogramu dat dziennych, parser dokumentów PDF ZUS "
                "oraz moduł symulacji profili mObywatel."
            ),
            docs_url="/docs",
            redoc_url="/redoc",
            openapi_tags=OPENAPI_TAGS,
            **extra,
        )
        self.setup_middleware()
        self.register_routers()

    def setup_middleware(self):
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


app = MainAPI()


