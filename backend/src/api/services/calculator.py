from collections import defaultdict
from datetime import date, timedelta

from ..models.calculator import (
    AllowanceRatesResponse,
    CalculatorPreset,
    IntegratedCalculatorInput,
    IntegratedCalculatorResult,
    MonthlyCashflow,
    RiskAlertItem,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    TimelineMilestone,
    TimelinePeriod,
)
from ..models.maternity import BenefitPaymentVariant, MaternityEmploymentType
from .admin import config_service


def _add_years(d: date, years: int) -> date:
    try:
        return d.replace(year=d.year + years)
    except ValueError:
        return d.replace(year=d.year + years, day=28)


def get_allowance_rates_service() -> AllowanceRatesResponse:
    cfg = config_service.get_config()
    return AllowanceRatesResponse(
        maternity_parental_option_uniform=cfg.benefit_rates.unified_benefit_rate,
        maternity_standard=cfg.benefit_rates.full_maternity_rate,
        parental_standard=cfg.benefit_rates.standard_parental_rate,
        pregnancy_sick_leave=cfg.benefit_rates.pregnancy_sick_leave_rate,
        father_paternity_days=cfg.leave_durations.paternity_leave_days,
        non_transferable_parental_weeks=cfg.leave_durations.non_transferable_parental_weeks,
    )


def get_presets_service() -> list[CalculatorPreset]:
    birth_demo_str = (date.today() + timedelta(days=30)).isoformat()

    return [
        CalculatorPreset(
            key="maternity_standard",
            title="Urlop macierzyński i rodzicielski (Standard)",
            description=(
                "Jedno dziecko, umowa o pracę, porównanie wariantu 81,5% z wariantem 100%/70%."
            ),
            tab="macierzynski",
            target_endpoint="/api/calculators/maternity-parental",
            default_payload={
                "employment_type": "EMPLOYMENT_CONTRACT",
                "gross_monthly_income": 8000.0,
                "children_born_count": 1,
                "is_insured_at_birth": True,
                "has_za_zyciem_certificate": False,
                "applied_within_21_days": True,
                "chosen_variant": "UNIFIED_81_5",
                "mother_maternity_weeks": 20,
                "father_parental_weeks": 9,
                "mother_parental_weeks": 32,
                "parental_leave_parts_count": 1,
                "child_age_years": 0,
            },
        ),
        CalculatorPreset(
            key="paternity",
            title="Urlop ojcowski (14 dni)",
            description="14 dni płatne 100% dla ojca, do wykorzystania w 1 lub 2 częściach.",
            tab="ojcowski",
            target_endpoint="/api/calculators/paternity-leave",
            default_payload={
                "gross_monthly_income": 9000.0,
                "employment_type": "EMPLOYMENT_CONTRACT",
                "is_insured": True,
                "child_age_months": 2,
                "is_adopted": False,
                "parts": [
                    {"part_number": 1, "days": 7},
                    {"part_number": 2, "days": 7},
                ],
            },
        ),
        CalculatorPreset(
            key="pregnancy",
            title="Zasiłek chorobowy w ciąży (kod B)",
            description="Zwolnienie lekarskie w ciąży płatne 100%, limit 270 dni.",
            tab="ciaza",
            target_endpoint="/api/calculators/pregnancy",
            default_payload={
                "employment_type": "EMPLOYMENT_CONTRACT",
                "gross_monthly_income": 8000.0,
                "insurance_duration_days": 365,
                "sick_leave_duration_days": 30,
                "pregnancy_week": 24,
                "is_code_b": True,
                "prior_sick_leave_days_in_year": 0,
                "age": 30,
            },
        ),
        CalculatorPreset(
            key="parental_work",
            title="Łączenie urlopu rodzicielskiego z pracą",
            description=(
                "Praca na 1/2 etatu podczas urlopu rodzicielskiego i proporcjonalne wydłużenie."
            ),
            tab="praca",
            target_endpoint="/api/calculators/parental-work-combination",
            default_payload={
                "gross_monthly_income": 8000.0,
                "work_fraction": 0.5,
                "parental_weeks_to_combine": 32,
                "work_during_extended_period": True,
                "children_born_count": 1,
                "has_za_zyciem_certificate": False,
                "benefit_rate_percentage": 70.0,
            },
        ),
        CalculatorPreset(
            key="adoption",
            title="Adopcja i rodzina zastępcza niezawodowa",
            description=(
                "Urlop na warunkach macierzyńskiego, limit 7/10 lat, gwarantowane min. 9 tyg."
            ),
            tab="adopcja",
            target_endpoint="/api/calculators/adoption-leave",
            default_payload={
                "gross_monthly_income": 8000.0,
                "employment_type": "EMPLOYMENT_CONTRACT",
                "is_insured": True,
                "caregiver_type": "ADOPTION",
                "children_adopted_count": 1,
                "child_age_years": 3,
                "child_age_months": 0,
                "has_deferred_school_obligation": False,
                "has_za_zyciem_certificate": False,
                "applied_within_21_days": True,
                "chosen_variant": "UNIFIED_81_5",
            },
        ),
        CalculatorPreset(
            key="special_cases_za_zyciem",
            title="Ustawa 'Za życiem' (Wydłużony rodzicielski)",
            description=(
                "Dziecko z ciężkim upośledzeniem: 65 tyg. rodzicielskiego + 4000 zł jednorazowo."
            ),
            tab="przypadki_szczegolne",
            target_endpoint="/api/calculators/special-cases",
            default_payload={
                "case_type": "ZA_ZYCIEM",
                "gross_monthly_income": 8000.0,
                "children_born_count": 1,
                "is_insured_at_birth": True,
                "has_za_zyciem_certificate": True,
            },
        ),
        CalculatorPreset(
            key="special_cases_premature",
            title="Wcześniak i hospitalizacja dziecka",
            description=(
                "Poród przed 28. lub 36. tygodniem: uzupełniający urlop macierzyński do 15 tyg."
            ),
            tab="przypadki_szczegolne",
            target_endpoint="/api/calculators/special-cases",
            default_payload={
                "case_type": "PREMATURE_HOSPITALIZATION",
                "gross_monthly_income": 8000.0,
                "child_birth_week": 27,
                "hospitalization_weeks": 10,
                "birth_weight_grams": 950,
            },
        ),
        CalculatorPreset(
            key="special_cases_stillbirth",
            title="Urodzenie martwe lub zgon dziecka",
            description=(
                "8 tygodni urlopu macierzyńskiego (min. 7 dni od zgonu) + zasiłek pogrzebowy."
            ),
            tab="przypadki_szczegolne",
            target_endpoint="/api/calculators/special-cases",
            default_payload={
                "case_type": "STILLBIRTH_OR_DEATH",
                "gross_monthly_income": 8000.0,
                "is_stillbirth": True,
            },
        ),
        CalculatorPreset(
            key="parental_sharing",
            title="Podział opieki między rodziców",
            description="Symulacja podziału: matka 32 tyg., ojciec 9 tyg. i budżet rodziny.",
            tab="podzial_opieki",
            target_endpoint="/api/calculators/parental-sharing",
            default_payload={
                "sharing_mode": "SEQUENTIAL",
                "children_born_count": 1,
                "has_za_zyciem_certificate": False,
                "applied_within_21_days": True,
                "mother_gross_income": 8000.0,
                "mother_maternity_weeks": 20,
                "mother_parental_weeks": 32,
                "father_gross_income": 9000.0,
                "father_maternity_weeks": 0,
                "father_parental_weeks": 9,
            },
        ),
        CalculatorPreset(
            key="integrated_full",
            title="Pełny zintegrowany kalkulator z osią czasu",
            description="Kompleksowy symulator rodziny z harmonogramem dat, ZUS i pracodawcą.",
            tab="zintegrowany",
            target_endpoint="/api/calculator/parental",
            default_payload={
                "child_birth_date": birth_demo_str,
                "mother_gross_monthly_income": 8000.0,
                "mother_employment_type": "EMPLOYMENT_CONTRACT",
                "is_mother_insured": True,
                "father_gross_monthly_income": 9000.0,
                "father_employment_type": "EMPLOYMENT_CONTRACT",
                "is_father_insured": True,
                "children_count": 1,
                "chosen_variant": "UNIFIED_81_5",
                "applied_within_21_days": True,
                "include_paternity_leave": True,
                "include_pregnancy_sick_leave": False,
                "special_case_type": None,
                "work_combination": {"enabled": False},
                "parental_sharing": {"enabled": False},
            },
        ),
    ]


def get_preset_by_key_service(key: str) -> CalculatorPreset | None:
    presets = get_presets_service()
    for preset in presets:
        if preset.key == key:
            return preset
    return None


def calculate_integrated_parental_service(
    data: IntegratedCalculatorInput,
) -> IntegratedCalculatorResult:
    cfg = config_service.get_config()
    rates = cfg.benefit_rates
    amounts = cfg.benefit_amounts
    durations = cfg.leave_durations
    limits = cfg.periods_and_limits

    social_rate = rates.social_contributions_rate
    mother_net_base = round(data.mother_gross_monthly_income * (1.0 - social_rate / 100.0), 2)
    father_net_base = round(data.father_gross_monthly_income * (1.0 - social_rate / 100.0), 2)

    min_wage_net = amounts.min_benefit_base_uop
    if (
        data.is_mother_insured
        and data.mother_employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT
        and data.mother_gross_monthly_income > 0
    ):
        mother_net_base = max(mother_net_base, min_wage_net)

    if (
        data.is_father_insured
        and data.father_employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT
        and data.father_gross_monthly_income > 0
    ):
        father_net_base = max(father_net_base, min_wage_net)

    mother_daily_100 = round(mother_net_base / 30.0, 2)
    father_daily_100 = round(father_net_base / 30.0, 2)

    is_unified = (
        data.chosen_variant == BenefitPaymentVariant.UNIFIED_81_5 and data.applied_within_21_days
    )
    maternity_rate = rates.unified_benefit_rate if is_unified else rates.full_maternity_rate
    parental_rate = rates.unified_benefit_rate if is_unified else rates.standard_parental_rate

    is_adoption = data.is_adoption or data.special_case_type == "ADOPTION"
    is_stillbirth = data.special_case_type == "STILLBIRTH_OR_DEATH"
    is_premature = data.special_case_type == "PREMATURE"
    has_za_zyciem = data.has_za_zyciem_certificate or data.special_case_type == "ZA_ZYCIEM"

    maternity_weeks_map = {
        1: durations.maternity_weeks_single_child,
        2: durations.maternity_weeks_twins,
        3: durations.maternity_weeks_triplets,
        4: durations.maternity_weeks_quadruplets,
    }

    if is_stillbirth:
        maternity_weeks = durations.stillbirth_maternity_weeks
        parental_pool_weeks = 0
    elif is_adoption:
        standard_mat = maternity_weeks_map.get(
            data.children_count, durations.maternity_weeks_quintuplets_plus
        )
        child_years = data.adoption_child_age_years
        if child_years >= limits.adoption_child_standard_age_limit:
            maternity_weeks = limits.adoption_min_guaranteed_maternity_weeks
        else:
            maternity_weeks = standard_mat
        parental_pool_weeks = (
            durations.parental_weeks_za_zyciem_single
            if (has_za_zyciem and data.children_count == 1)
            else (
                durations.parental_weeks_za_zyciem_multiple
                if has_za_zyciem
                else (
                    durations.parental_weeks_standard
                    if data.children_count == 1
                    else durations.parental_weeks_multiple_birth
                )
            )
        )
    else:
        maternity_weeks = maternity_weeks_map.get(
            data.children_count, durations.maternity_weeks_quintuplets_plus
        )
        if has_za_zyciem:
            parental_pool_weeks = (
                durations.parental_weeks_za_zyciem_single
                if data.children_count == 1
                else durations.parental_weeks_za_zyciem_multiple
            )
        else:
            parental_pool_weeks = (
                durations.parental_weeks_standard
                if data.children_count == 1
                else durations.parental_weeks_multiple_birth
            )

    supplementary_maternity_weeks = 0
    if is_premature:
        birth_wk = data.premature_birth_week or 27
        if birth_wk <= limits.premature_extreme_week_threshold:
            max_sup = limits.premature_extreme_max_supplementary_weeks
        else:
            max_sup = limits.premature_standard_max_supplementary_weeks
        supplementary_maternity_weeks = min(data.hospitalization_weeks, max_sup)

    mother_maternity_weeks = maternity_weeks
    mother_parental_weeks = parental_pool_weeks - durations.non_transferable_parental_weeks
    father_parental_weeks = durations.non_transferable_parental_weeks

    if data.parental_sharing.enabled:
        mother_parental_weeks = data.parental_sharing.mother_weeks
        father_parental_weeks = data.parental_sharing.father_weeks

    timeline_periods: list[TimelinePeriod] = []
    current_date = data.child_birth_date

    if data.include_pregnancy_sick_leave and data.pregnancy_sick_leave_days > 0:
        sick_days = data.pregnancy_sick_leave_days
        sick_start = current_date - timedelta(days=sick_days)
        sick_end = current_date - timedelta(days=1)
        sick_daily = round(mother_daily_100 * (rates.pregnancy_sick_leave_rate / 100.0), 2)
        sick_total = round(sick_daily * sick_days, 2)
        timeline_periods.append(
            TimelinePeriod(
                id="p0_pregnancy_sick",
                name="Zasilek chorobowy w ciazy (kod B)",
                person="mother",
                start_date=sick_start,
                end_date=sick_end,
                weeks=sick_days // 7,
                days=sick_days,
                rate_percentage=rates.pregnancy_sick_leave_rate,
                daily_benefit_net=sick_daily,
                monthly_benefit_net=round(sick_daily * 30.0, 2),
                total_benefit_net=sick_total,
                work_fraction=0.0,
                monthly_salary_gross=0.0,
                total_salary_gross=0.0,
                combined_period_income=sick_total,
                payer="Pracodawca / ZUS",
                description="Zwolnienie lekarskie z kodem B platne 100% podstawy wymiaru.",
            )
        )

    mat_days = mother_maternity_weeks * 7
    mat_start = current_date
    mat_end = mat_start + timedelta(days=mat_days - 1)
    mat_daily = round(mother_daily_100 * (maternity_rate / 100.0), 2)
    mat_total = round(mat_daily * mat_days, 2)

    timeline_periods.append(
        TimelinePeriod(
            id="p1_maternity_leave",
            name="Urlop macierzynski matki",
            person="mother",
            start_date=mat_start,
            end_date=mat_end,
            weeks=mother_maternity_weeks,
            days=mat_days,
            rate_percentage=maternity_rate,
            daily_benefit_net=mat_daily,
            monthly_benefit_net=round(mat_daily * 30.0, 2),
            total_benefit_net=mat_total,
            work_fraction=0.0,
            monthly_salary_gross=0.0,
            total_salary_gross=0.0,
            combined_period_income=mat_total,
            payer="ZUS",
            description=(
                f"Urlop macierzynski ({mother_maternity_weeks} tyg.). "
                f"Pierwsze {durations.mandatory_mother_maternity_weeks} tyg. "
                "jest obowiazkowe dla matki."
            ),
        )
    )
    current_date = mat_end + timedelta(days=1)

    if supplementary_maternity_weeks > 0:
        sup_days = supplementary_maternity_weeks * 7
        sup_start = current_date
        sup_end = sup_start + timedelta(days=sup_days - 1)
        sup_daily = round(mother_daily_100 * (rates.full_maternity_rate / 100.0), 2)
        sup_total = round(sup_daily * sup_days, 2)
        timeline_periods.append(
            TimelinePeriod(
                id="p1_supplementary_maternity",
                name="Uzupelniajacy urlop macierzynski (wczesniak/szpital)",
                person="mother",
                start_date=sup_start,
                end_date=sup_end,
                weeks=supplementary_maternity_weeks,
                days=sup_days,
                rate_percentage=rates.full_maternity_rate,
                daily_benefit_net=sup_daily,
                monthly_benefit_net=round(sup_daily * 30.0, 2),
                total_benefit_net=sup_total,
                work_fraction=0.0,
                monthly_salary_gross=0.0,
                total_salary_gross=0.0,
                combined_period_income=sup_total,
                payer="ZUS",
                description="Dodatkowy urlop macierzynski z tytulu hospitalizacji wczesniaka.",
            )
        )
        current_date = sup_end + timedelta(days=1)

    work_comb = data.work_combination
    if mother_parental_weeks > 0:
        if work_comb.enabled and work_comb.parent_working == "mother":
            wf = min(work_comb.work_fraction, 0.5)
            base_p_weeks = mother_parental_weeks
            if work_comb.work_during_extended_period:
                total_p_weeks = int(base_p_weeks / (1.0 - wf))
            else:
                total_p_weeks = int(base_p_weeks * (1.0 + wf))
            p_days = total_p_weeks * 7
            p_start = current_date
            p_end = p_start + timedelta(days=p_days - 1)
            p_daily_reduced = round(mother_daily_100 * (parental_rate / 100.0) * (1.0 - wf), 2)
            p_total_benefit = round(p_daily_reduced * p_days, 2)
            monthly_salary = round(data.mother_gross_monthly_income * wf, 2)
            total_salary = round((monthly_salary / 30.0) * p_days, 2)
            timeline_periods.append(
                TimelinePeriod(
                    id="p2_parental_mother_work",
                    name=f"Urlop rodzicielski matki laczony z praca ({wf:.2f} etatu)",
                    person="mother",
                    start_date=p_start,
                    end_date=p_end,
                    weeks=total_p_weeks,
                    days=p_days,
                    rate_percentage=round(parental_rate * (1.0 - wf), 2),
                    daily_benefit_net=p_daily_reduced,
                    monthly_benefit_net=round(p_daily_reduced * 30.0, 2),
                    total_benefit_net=p_total_benefit,
                    work_fraction=wf,
                    monthly_salary_gross=monthly_salary,
                    total_salary_gross=total_salary,
                    combined_period_income=round(p_total_benefit + total_salary, 2),
                    payer="ZUS + Pracodawca",
                    description=(
                        f"Wydluzony urlop rodzicielski ({total_p_weeks} tyg.) "
                        f"z tytulu pracy na {wf:.2f} etatu."
                    ),
                )
            )
            current_date = p_end + timedelta(days=1)
        else:
            p_days = mother_parental_weeks * 7
            p_start = current_date
            p_end = p_start + timedelta(days=p_days - 1)
            p_daily = round(mother_daily_100 * (parental_rate / 100.0), 2)
            p_total = round(p_daily * p_days, 2)
            timeline_periods.append(
                TimelinePeriod(
                    id="p2_parental_mother",
                    name="Urlop rodzicielski matki",
                    person="mother",
                    start_date=p_start,
                    end_date=p_end,
                    weeks=mother_parental_weeks,
                    days=p_days,
                    rate_percentage=parental_rate,
                    daily_benefit_net=p_daily,
                    monthly_benefit_net=round(p_daily * 30.0, 2),
                    total_benefit_net=p_total,
                    work_fraction=0.0,
                    monthly_salary_gross=0.0,
                    total_salary_gross=0.0,
                    combined_period_income=p_total,
                    payer="ZUS",
                    description=f"Urlop rodzicielski matki ({mother_parental_weeks} tyg.).",
                )
            )
            current_date = p_end + timedelta(days=1)

    if father_parental_weeks > 0:
        f_days = father_parental_weeks * 7
        f_start = current_date
        f_end = f_start + timedelta(days=f_days - 1)
        f_daily = round(father_daily_100 * (parental_rate / 100.0), 2)
        f_total = round(f_daily * f_days, 2)
        timeline_periods.append(
            TimelinePeriod(
                id="p3_parental_father",
                name=(
                    f"Nieprzenoszalna czesc urlopu rodzicielskiego ojca "
                    f"({durations.non_transferable_parental_weeks} tyg.)"
                ),
                person="father",
                start_date=f_start,
                end_date=f_end,
                weeks=father_parental_weeks,
                days=f_days,
                rate_percentage=parental_rate,
                daily_benefit_net=f_daily,
                monthly_benefit_net=round(f_daily * 30.0, 2),
                total_benefit_net=f_total,
                work_fraction=0.0,
                monthly_salary_gross=0.0,
                total_salary_gross=0.0,
                combined_period_income=f_total,
                payer="ZUS",
                description=(
                    f"Indywidualne prawo ojca do {durations.non_transferable_parental_weeks} "
                    "tygodni urlopu rodzicielskiego (Dyrektywa Work-Life Balance)."
                ),
            )
        )
        current_date = f_end + timedelta(days=1)

    if data.include_paternity_leave and data.is_father_insured:
        pat_start = data.child_birth_date + timedelta(days=data.paternity_start_offset_days)
        pat_end = pat_start + timedelta(days=durations.paternity_leave_days - 1)
        pat_daily = round(father_daily_100 * (rates.paternity_benefit_rate / 100.0), 2)
        pat_total = round(pat_daily * durations.paternity_leave_days, 2)
        timeline_periods.append(
            TimelinePeriod(
                id="p4_paternity_leave",
                name=f"Urlop ojcowski ({durations.paternity_leave_days} dni)",
                person="father",
                start_date=pat_start,
                end_date=pat_end,
                weeks=2,
                days=durations.paternity_leave_days,
                rate_percentage=rates.paternity_benefit_rate,
                daily_benefit_net=pat_daily,
                monthly_benefit_net=round(pat_daily * 30.0, 2),
                total_benefit_net=pat_total,
                work_fraction=0.0,
                monthly_salary_gross=0.0,
                total_salary_gross=0.0,
                combined_period_income=pat_total,
                payer="ZUS",
                description=(
                    f"{durations.paternity_leave_days} dni kalendarzowych urlopu ojcowskiego "
                    f"platne {rates.paternity_benefit_rate:.0f}% do "
                    f"{limits.max_child_age_paternity_months}. miesiaca zycia dziecka."
                ),
            )
        )

    all_start_dates = [p.start_date for p in timeline_periods]
    all_end_dates = [p.end_date for p in timeline_periods]
    timeline_start = min(all_start_dates) if all_start_dates else data.child_birth_date
    timeline_end = max(all_end_dates) if all_end_dates else data.child_birth_date

    total_benefit_sum = round(sum(p.total_benefit_net for p in timeline_periods), 2)
    total_salary_sum = round(sum(p.total_salary_gross for p in timeline_periods), 2)
    total_family_income = round(total_benefit_sum + total_salary_sum, 2)
    total_leave_days = (timeline_end - timeline_start).days + 1
    total_leave_weeks = total_leave_days // 7

    b_date = data.child_birth_date
    milestones: list[TimelineMilestone] = [
        TimelineMilestone(
            milestone_date=b_date,
            title="Narodziny dziecka / przyjecie na wychowanie",
            importance="HIGH",
            legal_basis="Art. 180 § 1 Kodeksu Pracy",
            action_required="Zgloszenie urodzenia w USC, powiadomienie pracodawcy.",
        ),
        TimelineMilestone(
            milestone_date=b_date + timedelta(days=limits.long_application_deadline_days),
            title=f"Termin {limits.long_application_deadline_days} dni na wniosek o zasilek",
            importance="CRITICAL",
            legal_basis="Art. 30a Ustawy zasilkowej",
            action_required="Zlozenie wniosku o caly okres macierzynskiego i rodzicielskiego.",
        ),
        TimelineMilestone(
            milestone_date=b_date + timedelta(weeks=durations.mandatory_mother_maternity_weeks),
            title=f"Koniec {durations.mandatory_mother_maternity_weeks} tyg. urlopu matki",
            importance="INFO",
            legal_basis="Art. 180 § 4 Kodeksu Pracy",
            action_required="Mozliwosc rezygnacji i przekazania reszty macierzynskiego ojcu.",
        ),
        TimelineMilestone(
            milestone_date=_add_years(b_date, 1),
            title="Koniec terminu na urlop ojcowski (12 miesiecy)",
            importance="HIGH",
            legal_basis="Art. 182(3) § 1 Kodeksu Pracy",
            action_required="Wykorzystanie 14 dni urlopu ojcowskiego przed 1. urodzinami.",
        ),
        TimelineMilestone(
            milestone_date=date(b_date.year + (14 if is_adoption else 6), 12, 31),
            title=f"Koniec terminu na urlop rodzicielski ({14 if is_adoption else 6} lat)",
            importance="INFO",
            legal_basis="Art. 182(1a) Kodeksu Pracy",
            action_required="Ostateczna data na wykorzystanie wszystkich czesci rodzicielskiego.",
        ),
    ]

    monthly_map: dict[str, dict[str, float]] = defaultdict(
        lambda: {"mother_benefit": 0.0, "father_benefit": 0.0, "work_salary": 0.0}
    )

    for p in timeline_periods:
        curr = p.start_date
        while curr <= p.end_date:
            ym = curr.strftime("%Y-%m")
            if p.person == "mother":
                monthly_map[ym]["mother_benefit"] += p.daily_benefit_net
                if p.work_fraction > 0.0:
                    monthly_map[ym]["work_salary"] += round(p.monthly_salary_gross / 30.0, 2)
            elif p.person == "father":
                monthly_map[ym]["father_benefit"] += p.daily_benefit_net
            curr += timedelta(days=1)

    sorted_ym = sorted(monthly_map.keys())
    monthly_cashflow: list[MonthlyCashflow] = []
    for ym in sorted_ym:
        mb = round(monthly_map[ym]["mother_benefit"], 2)
        fb = round(monthly_map[ym]["father_benefit"], 2)
        ws = round(monthly_map[ym]["work_salary"], 2)
        tot = round(mb + fb + ws, 2)
        monthly_cashflow.append(
            MonthlyCashflow(
                year_month=ym,
                mother_benefit=mb,
                father_benefit=fb,
                work_salary=ws,
                total_month_income=tot,
            )
        )

    base_mat_days = mother_maternity_weeks * 7
    base_par_days = (parental_pool_weeks - durations.non_transferable_parental_weeks) * 7
    fat_par_days = durations.non_transferable_parental_weeks * 7

    uni_total = round(
        (mother_daily_100 * (rates.unified_benefit_rate / 100.0) * base_mat_days)
        + (mother_daily_100 * (rates.unified_benefit_rate / 100.0) * base_par_days)
        + (father_daily_100 * (rates.standard_parental_rate / 100.0) * fat_par_days),
        2,
    )
    var_total = round(
        (mother_daily_100 * (rates.full_maternity_rate / 100.0) * base_mat_days)
        + (mother_daily_100 * (rates.standard_parental_rate / 100.0) * base_par_days)
        + (father_daily_100 * (rates.standard_parental_rate / 100.0) * fat_par_days),
        2,
    )

    if is_unified:
        rec_var = "UNIFIED_81_5"
        rec_reason = (
            "Jednolita stawka 81,5% zapewnia staly, stabilny budzet przez caly okres opieki "
            "bez spadku dochodu do 70% w czesci rodzicielskiej."
        )
    else:
        rec_var = "VARIABLE_100_70"
        rec_reason = (
            "Wariant zmienny (100% macierzynski + 70% rodzicielski) przynosi wyzsze wplaty "
            "w pierwszych 20 tygodniach zycia dziecka."
        )

    legal_basis: list[str] = [
        "Art. 180, 182(1a), 182(1c), 182(1e), 182(1f), 182(3), 183 Kodeksu Pracy",
        "Art. 29, 30a, 31 Ustawy o swiadczeniach pienieznych z ubezpieczenia spolecznego",
        "Dyrektywa UE 2019/1158 (Work-Life Balance) dotyczaca uprawnien rodzicielskich",
    ]

    required_documents: list[str] = [
        "Skrocony odpis aktu urodzenia dziecka",
        "Wniosek o udzielenie urlopu macierzynskiego i rodzicielskiego (termin 21 dni)",
        "Oswiadczenie drugiego rodzica o braku jednoczesnego korzystania z urlopu",
        "Zaswiadczenie pracodawcy Z-3 (lub Z-3a dla zleceniobiorcy) potwierdzajace podstawe",
    ]

    summary_notes: list[str] = [
        f"Calkowity budzet swiadczen rodziny wynosi {total_benefit_sum:.2f} PLN.",
        (
            f"Harmonogram obejmuje {len(timeline_periods)} etapow opieki "
            f"od {timeline_start} do {timeline_end}."
        ),
        f"Zarejestrowano {len(milestones)} kluczowych terminow prawnych z Kodeksu Pracy.",
    ]

    is_eligible = data.is_mother_insured or data.is_father_insured
    if not is_eligible:
        summary_notes.append(
            "Oboje rodzice nie podlegają ubezpieczeniu chorobowemu ZUS - przysługuje "
            + "świadczenie rodzicielskie w wysokości 1000 zł miesięcznie z MOPS/GOPS."
        )

    # Główny ubezpieczony do analizy ryzyk i czerwonych flag
    emp_type = data.mother_employment_type
    income = data.mother_gross_monthly_income
    is_insured = data.is_mother_insured
    if not data.is_mother_insured and data.is_father_insured:
        emp_type = data.father_employment_type
        income = data.father_gross_monthly_income
        is_insured = data.is_father_insured

    days = data.insurance_duration_days if data.insurance_duration_days != 365 else data.insured_days
    evaluated_risks = evaluate_risk_alerts(
        employment_type=emp_type,
        gross_monthly_income=income,
        insured_days=days,
        has_sickness_insurance=is_insured,
    )

    return IntegratedCalculatorResult(
        is_eligible=is_eligible,
        child_birth_date=data.child_birth_date,
        timeline_start_date=timeline_start,
        timeline_end_date=timeline_end,
        total_leave_weeks=total_leave_weeks,
        total_leave_days=total_leave_days,
        total_family_benefit_amount=total_benefit_sum,
        total_work_salary_amount=total_salary_sum,
        total_family_combined_income=total_family_income,
        timeline_periods=timeline_periods,
        milestones=milestones,
        monthly_cashflow=monthly_cashflow,
        comparison_unified_81_5_total=uni_total,
        comparison_variable_100_70_total=var_total,
        recommended_variant=rec_var,
        recommendation_reason=rec_reason,
        summary_notes=summary_notes,
        required_documents=required_documents,
        legal_basis=legal_basis,
        risk_alerts=evaluated_risks,
    )


def evaluate_risk_alerts(
    employment_type: MaternityEmploymentType,
    gross_monthly_income: float,
    insured_days: int,
    has_sickness_insurance: bool,
) -> list[RiskAlertItem]:
    alerts: list[RiskAlertItem] = []
    is_voluntary = employment_type in (
        MaternityEmploymentType.MANDATE_CONTRACT,
        MaternityEmploymentType.B2B,
    )
    waiting_days = 30 if employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT else 90

    if not has_sickness_insurance:
        alerts.append(
            RiskAlertItem(
                id="no-insurance",
                title="Brak dobrowolnego ubezpieczenia chorobowego",
                description="Na umowie zlecenie i w JDG ubezpieczenie chorobowe jest dobrowolne. Zgłoś je w ZUS (ZUA/ZZA), bez niego nie nabędziesz prawa do świadczeń.",
                severity="danger",
            )
        )
    elif insured_days < waiting_days:
        alerts.append(
            RiskAlertItem(
                id="waiting-period",
                title="Okres wyczekiwania nie minął",
                description=f"Zasiłek chorobowy w ciąży wymaga {waiting_days} dni nieprzerwanego ubezpieczenia. Sprawdź w ZUS, od kiedy przysługuje Ci zasiłek macierzyński.",
                severity="warning",
            )
        )

    if insured_days < 180 and (is_voluntary or gross_monthly_income > 12000.0):
        alerts.append(
            RiskAlertItem(
                id="sham-contract",
                title="Ryzyko zakwestionowania umowy lub JDG jako pozornej",
                description="ZUS często kontroluje tytuły ubezpieczenia zawarte krótko przed lub w trakcie ciąży. Zachowaj dowody faktycznej pracy: faktury, korespondencję, ewidencję.",
                severity="warning",
            )
        )

    if employment_type == MaternityEmploymentType.B2B and gross_monthly_income > 9000.0:
        alerts.append(
            RiskAlertItem(
                id="raised-contributions",
                title="Sztuczne podwyższenie składek w ciąży",
                description="Wysoka zadeklarowana podstawa składek u przedsiębiorcy może zostać obniżona przez ZUS, jeśli nie odpowiada realnym przychodom firmy.",
                severity="warning",
            )
        )

    if is_voluntary:
        if employment_type == MaternityEmploymentType.MANDATE_CONTRACT:
            alerts.append(
                RiskAlertItem(
                    id="lose-insurance",
                    title="Utrata ubezpieczenia przed porodem",
                    description="Jeśli umowa zlecenie skończy się przed porodem, tracisz prawo do zasiłku macierzyńskiego. Na zleceniu nie ma kodeksowej ochrony przedłużenia umowy.",
                    severity="warning",
                )
            )
        else:
            alerts.append(
                RiskAlertItem(
                    id="lose-insurance",
                    title="Utrata ubezpieczenia przed porodem",
                    description="Zadłużenie składkowe powyżej określonej kwoty może wstrzymać wypłatę zasiłku. Dbaj o terminowe opłacanie składek ZUS do 20. dnia miesiąca.",
                    severity="warning",
                )
            )

    return alerts


def analyze_risks_service(data: RiskAnalysisRequest) -> RiskAnalysisResponse:
    alerts = evaluate_risk_alerts(
        employment_type=data.employment_type,
        gross_monthly_income=data.gross_monthly_income,
        insured_days=data.insured_days,
        has_sickness_insurance=data.has_sickness_insurance,
    )
    status = "STATUS: BEZPIECZNY" if len(alerts) == 0 else f"WYKRYTE RYZYKA: {len(alerts)}"
    return RiskAnalysisResponse(
        status=status,
        risk_count=len(alerts),
        alerts=alerts,
    )
