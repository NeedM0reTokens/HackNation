import json
from pathlib import Path

from fastapi import HTTPException, status

from ... import constants
from ..data import DATA_DIR, STATUTORY_PARAMETERS_FILE
from ..models.admin import (
    AdminConfig,
    AdminConfigUpdate,
    BenefitAmountsUpdate,
    BenefitRatesUpdate,
    LeaveDurationsUpdate,
    PeriodsAndLimitsUpdate,
    SingleParameterUpdate,
)


class ConfigService:
    """
    Manages statutory parameters persisted in the JSON database.
    Provides reading, updating, and dynamic synchronization of statutory constants
    (benefit rates, statutory benefit amounts, minimum wage, leave durations, and limits).
    """

    def __init__(
        self,
        config_file: Path | None = None,
        legacy_config_file: Path | None = None,
    ) -> None:
        self.config_file: Path = config_file or STATUTORY_PARAMETERS_FILE
        self.legacy_config_file: Path = legacy_config_file or (
            Path(__file__).resolve().parent.parent / "config.json"
        )
        self._config: AdminConfig = self.load_from_disk()

    def load_from_disk(self) -> AdminConfig:
        """Loads statutory parameters from the JSON database file."""
        for path in (self.config_file, self.legacy_config_file):
            if path and path.exists():
                try:
                    with open(path, encoding="utf-8") as f:
                        data = json.load(f)
                    cfg = AdminConfig(**data)
                    self._sync_derived_fields(cfg)
                    self._sync_constants(cfg)
                    return cfg
                except Exception:
                    pass

        cfg = AdminConfig()
        self._sync_derived_fields(cfg)
        self._sync_constants(cfg)
        return cfg

    def get_config(self) -> AdminConfig:
        """Returns the current in-memory statutory configuration."""
        return self._config

    def _sync_derived_fields(self, cfg: AdminConfig) -> None:
        """Calculates derived financial thresholds based on minimum wage and rates."""
        min_wage = cfg.benefit_amounts.min_wage_2026
        debt_pct = cfg.benefit_amounts.zus_debt_limit_percentage
        social_rate = cfg.benefit_rates.social_contributions_rate

        # Ensure consistency between sections
        cfg.periods_and_limits.min_wage_2026 = min_wage
        cfg.periods_and_limits.social_contributions_rate = social_rate
        cfg.periods_and_limits.zus_debt_limit_percentage = debt_pct

        # Statutory ZUS debt threshold: 1% of minimum wage (art. 2a)
        cfg.benefit_amounts.zus_debt_limit = round(min_wage * (debt_pct / 100), 2)

        # Minimum calculation base for employment contract (-13.71%)
        cfg.benefit_amounts.min_benefit_base_uop = round(min_wage * (1 - social_rate / 100), 2)

    def _sync_constants(self, cfg: AdminConfig) -> None:
        """Synchronizes module-level constants in constants.py with current config."""
        constants.MIN_WAGE_2026 = cfg.benefit_amounts.min_wage_2026
        constants.SOCIAL_CONTRIBUTIONS_RATE = cfg.benefit_rates.social_contributions_rate
        constants.ZUS_DEBT_LIMIT = cfg.benefit_amounts.zus_debt_limit
        constants.PREGNANCY_SICK_LEAVE_RATE = cfg.benefit_rates.pregnancy_sick_leave_rate
        constants.STANDARD_SICK_LEAVE_RATE = cfg.benefit_rates.standard_sick_leave_rate
        constants.UNIFIED_BENEFIT_RATE = cfg.benefit_rates.unified_benefit_rate
        constants.FULL_MATERNITY_RATE = cfg.benefit_rates.full_maternity_rate
        constants.STANDARD_PARENTAL_RATE = cfg.benefit_rates.standard_parental_rate
        constants.PATERNITY_BENEFIT_RATE = cfg.benefit_rates.paternity_benefit_rate
        constants.MANDATORY_WAITING_PERIOD_DAYS = (
            cfg.periods_and_limits.mandatory_waiting_period_days
        )
        constants.VOLUNTARY_WAITING_PERIOD_DAYS = (
            cfg.periods_and_limits.voluntary_waiting_period_days
        )
        constants.MAX_PREGNANCY_SICK_LEAVE_DAYS = (
            cfg.periods_and_limits.max_pregnancy_sick_leave_days
        )
        constants.MAX_STANDARD_SICK_LEAVE_DAYS = cfg.periods_and_limits.max_standard_sick_leave_days
        constants.PATERNITY_LEAVE_DAYS = cfg.leave_durations.paternity_leave_days
        constants.NON_TRANSFERABLE_PARENTAL_WEEKS = (
            cfg.leave_durations.non_transferable_parental_weeks
        )
        constants.MANDATORY_MOTHER_MATERNITY_WEEKS = (
            cfg.leave_durations.mandatory_mother_maternity_weeks
        )
        constants.PARENTAL_WEEKS_STANDARD = cfg.leave_durations.parental_weeks_standard
        constants.PARENTAL_WEEKS_MULTIPLE_BIRTH = cfg.leave_durations.parental_weeks_multiple_birth
        constants.PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE = (
            cfg.leave_durations.parental_weeks_za_zyciem_single
        )
        constants.PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE = (
            cfg.leave_durations.parental_weeks_za_zyciem_multiple
        )
        constants.ZA_ZYCIEM_ONE_TIME_GRANT_PLN = cfg.benefit_amounts.za_zyciem_one_time_grant
        constants.DEATH_GRANT_ZUS_PLN = cfg.benefit_amounts.death_grant_zus
        constants.MAX_VOLUNTARY_SICKNESS_BASE_2026 = cfg.benefit_amounts.max_voluntary_sickness_base
        constants.EMPLOYER_SICK_DAYS_STANDARD = cfg.periods_and_limits.employer_sick_days_standard
        constants.EMPLOYER_SICK_DAYS_SENIOR = cfg.periods_and_limits.employer_sick_days_senior
        constants.SENIOR_AGE_THRESHOLD = cfg.periods_and_limits.senior_age_threshold
        constants.MAX_CHILD_AGE_PATERNITY_MONTHS = (
            cfg.periods_and_limits.max_child_age_paternity_months
        )
        constants.MAX_CHILD_AGE_PATERNITY_ADOPTION_YEARS = (
            cfg.periods_and_limits.max_child_age_paternity_adoption_years
        )
        constants.LONG_APPLICATION_DEADLINE_DAYS = (
            cfg.periods_and_limits.long_application_deadline_days
        )
        constants.STILLBIRTH_MATERNITY_WEEKS = cfg.leave_durations.stillbirth_maternity_weeks

    def save_to_disk(self) -> None:
        """Persists the current configuration to the JSON database on disk."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        dump = self._config.model_dump()

        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(dump, f, indent=2, ensure_ascii=False)

        if self.legacy_config_file and self.legacy_config_file != self.config_file:
            self.legacy_config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.legacy_config_file, "w", encoding="utf-8") as f:
                json.dump(dump, f, indent=2, ensure_ascii=False)

    def update_config(self, update_data: AdminConfigUpdate) -> AdminConfig:
        """Updates full or partial configuration sections and saves to JSON DB."""
        current_data = self._config.model_dump()

        if update_data.benefit_rates:
            current_data["benefit_rates"].update(update_data.benefit_rates)
        if update_data.benefit_amounts:
            current_data["benefit_amounts"].update(update_data.benefit_amounts)
        if update_data.leave_durations:
            current_data["leave_durations"].update(update_data.leave_durations)
        if update_data.periods_and_limits:
            current_data["periods_and_limits"].update(update_data.periods_and_limits)

        try:
            new_config = AdminConfig(**current_data)
            self._sync_derived_fields(new_config)
            self._config = new_config
            self._sync_constants(self._config)
            self.save_to_disk()
            return self._config
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Błąd walidacji konfiguracji ustawowej: {e}",
            ) from e

    def update_rates(self, update: BenefitRatesUpdate) -> AdminConfig:
        """Updates percentage benefit rates in the JSON DB."""
        rates_dict = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.update_config(AdminConfigUpdate(benefit_rates=rates_dict))

    def update_amounts(self, update: BenefitAmountsUpdate) -> AdminConfig:
        """Updates statutory amounts (e.g. minimum wage, grants) in the JSON DB."""
        amounts_dict = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.update_config(AdminConfigUpdate(benefit_amounts=amounts_dict))

    def update_durations(self, update: LeaveDurationsUpdate) -> AdminConfig:
        """Updates statutory leave durations in the JSON DB."""
        durations_dict = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.update_config(AdminConfigUpdate(leave_durations=durations_dict))

    def update_limits(self, update: PeriodsAndLimitsUpdate) -> AdminConfig:
        """Updates periods, deadlines and limits in the JSON DB."""
        limits_dict = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.update_config(AdminConfigUpdate(periods_and_limits=limits_dict))

    def update_single_parameter(self, update: SingleParameterUpdate) -> AdminConfig:
        """Updates a single statutory parameter by key name in the JSON DB."""
        name = update.parameter_name.strip()
        val = update.value

        current_data = self._config.model_dump()
        found = False

        for section in (
            "benefit_rates",
            "benefit_amounts",
            "leave_durations",
            "periods_and_limits",
        ):
            if name in current_data[section]:
                current_data[section][name] = val
                found = True
                break

        if not found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nieznany parametr ustawowy '{name}'.",
            )

        try:
            new_config = AdminConfig(**current_data)
            self._sync_derived_fields(new_config)
            self._config = new_config
            self._sync_constants(self._config)
            self.save_to_disk()
            return self._config
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Niepoprawna wartość dla parametru '{name}': {e}",
            ) from e

    def reset_to_defaults(self) -> AdminConfig:
        """Resets all statutory parameters back to defaults in the JSON DB."""
        self._config = AdminConfig()
        self._sync_derived_fields(self._config)
        self._sync_constants(self._config)
        self.save_to_disk()
        return self._config


config_service: ConfigService = ConfigService()


def get_admin_config_service() -> AdminConfig:
    """Returns the current statutory configuration loaded from JSON DB."""
    return config_service.get_config()


def update_admin_config_service(data: AdminConfigUpdate) -> AdminConfig:
    """Updates statutory configuration in the JSON DB."""
    return config_service.update_config(data)
