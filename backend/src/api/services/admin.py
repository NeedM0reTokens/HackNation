import json
from pathlib import Path

from fastapi import HTTPException

from src.api.models.admin import AdminConfig, AdminConfigUpdate


class ConfigService:
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

        if update_data.benefit_rates:
            current_data["benefit_rates"].update(update_data.benefit_rates)
        if update_data.leave_durations:
            current_data["leave_durations"].update(update_data.leave_durations)
        if update_data.periods_and_limits:
            current_data["periods_and_limits"].update(update_data.periods_and_limits)

        try:
            self._config = AdminConfig(**current_data)
            self.save_to_disk()
            return self._config
        except Exception as e:
            raise HTTPException(
                status_code=422, detail=f"Configuration validation error: {e}"
            ) from e


config_service = ConfigService()


def get_admin_config_service() -> AdminConfig:
    return config_service.get_config()


def update_admin_config_service(data: AdminConfigUpdate) -> AdminConfig:
    return config_service.update_config(data)
