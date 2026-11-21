from pydantic import BaseModel


class AllowanceRatesResponse(BaseModel):
    maternity_parental_option_uniform: float
    maternity_standard: float
    parental_standard: float
    pregnancy_sick_leave: float
    father_paternity_days: int
    non_transferable_parental_weeks: int
