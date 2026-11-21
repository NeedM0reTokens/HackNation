import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


class StopyProcentowe(BaseModel):
    stopa_chorobowy_kod_b: float = Field(100.0, description="% zasiłku chorobowego w ciąży (kod B)")
    stopa_chorobowy_standard: float = Field(80.0, description="% standardowego zasiłku chorobowego")
    stopa_macierzynski_jednolity: float = Field(
        81.5, description="% wniosek długi (macierzyński + rodzicielski)"
    )
    stopa_macierzynski_standard: float = Field(
        100.0, description="% zasiłku macierzyńskiego standard"
    )
    stopa_rodzicielski_standard: float = Field(
        70.0, description="% zasiłku rodzicielskiego standard"
    )
    stopa_ojcowski: float = Field(100.0, description="% zasiłku ojcowskiego")
    stopa_swiadczenie_rehab_1_3: float = Field(
        90.0, description="% świadczenie rehabilitacyjne pierwsze 3 m-ce"
    )
    stopa_swiadczenie_rehab_pozostale: float = Field(
        75.0, description="% świadczenie rehabilitacyjne pozostałe m-ce"
    )
    stopa_swiadczenie_rehab_ciaza: float = Field(
        100.0, description="% świadczenie rehabilitacyjne w ciąży"
    )


class WymiaryUrlopow(BaseModel):
    urlop_macierzynski_1_dziecko_tygodnie: int = 20
    urlop_macierzynski_2_dzieci_tygodnie: int = 31
    urlop_macierzynski_3_dzieci_tygodnie: int = 33
    urlop_macierzynski_4_dzieci_tygodnie: int = 35
    urlop_macierzynski_5_plus_tygodnie: int = 37
    urlop_macierzynski_obligatoryjny_matki_tygodnie: int = 14
    urlop_rodzicielski_1_dziecko_tygodnie: int = 41
    urlop_rodzicielski_wieloraczki_tygodnie: int = 43
    urlop_rodzicielski_nieprzenoszalny_tygodnie: int = 9
    urlop_ojcowski_dni: int = 14
    max_czesci_urlopu_rodzicielskiego: int = 5


class OkresyILimity(BaseModel):
    okres_wyczekiwania_uop_dni: int = 30
    okres_wyczekiwania_dobrowolne_dni: int = 90
    dni_chorobowe_pracodawca_standard: int = 33
    dni_chorobowe_pracodawca_50plus: int = 14
    wiek_prog_pracodawca: int = 50
    max_okres_zasilkowy_ciaza_dni: int = 270
    max_okres_zasilkowy_standard_dni: int = 182
    limit_wieku_ojcowski_miesiace: int = 12
    limit_wieku_adopcja_ojcowski_lat: int = 14
    termin_wniosku_macierzynski_81_5_dni: int = 21
    placa_minimalna_2026: float = 4806.00
    skladki_spoleczne_proc: float = 13.71
    procent_zadluzenia_limit_zus: float = 1.0


class AdminConfig(BaseModel):
    stopy_procentowe: StopyProcentowe = Field(default_factory=StopyProcentowe)
    wymiary_urlopow: WymiaryUrlopow = Field(default_factory=WymiaryUrlopow)
    okresy_i_limity: OkresyILimity = Field(default_factory=OkresyILimity)


class AdminConfigUpdate(BaseModel):
    stopy_procentowe: dict[str, Any] | None = None
    wymiary_urlopow: dict[str, Any] | None = None
    okresy_i_limity: dict[str, Any] | None = None


class ConfigService:
    """Serwis wczytujący i zapisujący parametry konfiguracyjne w locie (BE-02)."""

    def __init__(self, config_file: Path | None = None):
        self.config_file = config_file or (Path(__file__).resolve().parent.parent / "config.json")
        self._config: AdminConfig = self.load_from_disk()

    def load_from_disk(self) -> AdminConfig:
        if self.config_file.exists():
            try:
                with open(self.config_file, encoding="utf-8") as f:
                    data = json.load(f)
                return AdminConfig(**data)
            except Exception:
                pass
        return AdminConfig()

    def get_config(self) -> AdminConfig:
        return self._config

    def save_to_disk(self) -> None:
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self._config.model_dump(), f, indent=2, ensure_ascii=False)

    def update_config(self, update_data: AdminConfigUpdate) -> AdminConfig:
        current_data = self._config.model_dump()

        if update_data.stopy_procentowe:
            current_data["stopy_procentowe"].update(update_data.stopy_procentowe)
        if update_data.wymiary_urlopow:
            current_data["wymiary_urlopow"].update(update_data.wymiary_urlopow)
        if update_data.okresy_i_limity:
            current_data["okresy_i_limity"].update(update_data.okresy_i_limity)

        try:
            self._config = AdminConfig(**current_data)
            self.save_to_disk()
            return self._config
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Błąd walidacji konfiguracji: {e}") from e


# Globalna instancja serwisu konfiguracyjnego
config_service = ConfigService()


class AdminRouter(APIRouter):
    """
    Klasa routera dla Panelu Admina (BE-03).
    Udostępnia endpointy GET i PUT do zarządzania parametrami w locie.
    """

    def __init__(self, **kwargs):
        super().__init__(prefix="/admin", tags=["Panel Admina"], **kwargs)
        self._setup_routes()

    def _setup_routes(self):
        self.add_api_route(
            "/config",
            self.get_admin_config,
            methods=["GET"],
            response_model=AdminConfig,
            summary="Pobierz aktualne parametry prawne i konfiguracyjne",
            description="Zwraca aktualną konfigurację stawek, limitów i wymiarów urlopów.",
        )
        self.add_api_route(
            "/config",
            self.update_admin_config,
            methods=["PUT"],
            response_model=AdminConfig,
            summary="Zaktualizuj parametry w locie (bez restartu serwera)",
            description="Umożliwia modyfikację stawek i limitów oraz zapisuje je do config.json.",
        )

    def get_admin_config(self) -> AdminConfig:
        return config_service.get_config()

    def update_admin_config(self, dane: AdminConfigUpdate) -> AdminConfig:
        return config_service.update_config(dane)


# Alias dla kompatybilności
AdminAPI = AdminRouter
