from ...constants import (
    DEATH_GRANT_ZUS_PLN,
    FULL_MATERNITY_RATE,
    MANDATORY_MOTHER_MATERNITY_WEEKS,
    MIN_DAYS_LEAVE_AFTER_CHILD_DEATH,
    MIN_MATERNITY_WEEKS_BEFORE_HOSPITAL_INTERRUPTION,
    MIN_WAGE_2026,
    NON_TRANSFERABLE_PARENTAL_WEEKS,
    PARENTAL_WEEKS_MULTIPLE_BIRTH,
    PARENTAL_WEEKS_STANDARD,
    PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE,
    PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE,
    PREMATURE_EXTREME_MAX_SUPPLEMENTARY_WEEKS,
    PREMATURE_EXTREME_WEEK_THRESHOLD,
    PREMATURE_EXTREME_WEIGHT_GRAMS,
    PREMATURE_MODERATE_WEEK_THRESHOLD,
    PREMATURE_STANDARD_MAX_SUPPLEMENTARY_WEEKS,
    STANDARD_PARENTAL_RATE,
    STILLBIRTH_MATERNITY_DAYS,
    STILLBIRTH_MATERNITY_WEEKS,
    TERM_BIRTH_HOSPITALIZATION_MIN_DAYS,
    ZA_ZYCIEM_ONE_TIME_GRANT_PLN,
)
from ..models.maternity import (
    MaternityEmploymentType,
    PeriodBreakdown,
)
from ..models.special_cases import (
    SpecialCasesInput,
    SpecialCasesResult,
    SpecialCaseType,
)
from .maternity import _calculate_net_base, get_maternity_weeks


def calculate_special_cases(data: SpecialCasesInput) -> SpecialCasesResult:
    if not data.is_insured_at_birth or data.employment_type == MaternityEmploymentType.NONE:
        return SpecialCasesResult(
            case_type=data.case_type,
            is_eligible=False,
            base_maternity_weeks=0,
            supplementary_maternity_weeks=0,
            total_maternity_weeks=0,
            parental_weeks=0,
            non_transferable_parental_weeks=0,
            total_leave_weeks=0,
            calculation_base_net=0.0,
            daily_rate=0.0,
            total_benefit_amount=0.0,
            description="Brak prawa do zasiłku macierzyńskiego z powodu braku ubezpieczenia.",
            important_notes=[
                "Osobie nieubezpieczonej przysługuje świadczenie rodzicielskie 1000 zł/mc."
            ],
        )

    base_net = _calculate_net_base(data.gross_monthly_income)
    if data.employment_type == MaternityEmploymentType.EMPLOYMENT_CONTRACT:
        min_net = _calculate_net_base(MIN_WAGE_2026)
        base_net = max(base_net, min_net)

    daily_rate = round(base_net / 30, 2)

    if data.case_type == SpecialCaseType.ZA_ZYCIEM:
        return _calculate_za_zyciem(data, base_net, daily_rate)
    elif data.case_type == SpecialCaseType.PREMATURE_HOSPITALIZATION:
        return _calculate_premature_hospitalization(data, base_net, daily_rate)
    else:
        return _calculate_stillbirth_or_death(data, base_net, daily_rate)


def _calculate_za_zyciem(
    data: SpecialCasesInput, base_net: float, daily_rate: float
) -> SpecialCasesResult:
    base_maternity = get_maternity_weeks(data.children_born_count)
    parental_weeks = (
        PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE
        if data.children_born_count == 1
        else PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE
    )
    total_weeks = base_maternity + parental_weeks

    maternity_amount = round(daily_rate * base_maternity * 7 * FULL_MATERNITY_RATE / 100, 2)
    parental_amount = round(daily_rate * parental_weeks * 7 * STANDARD_PARENTAL_RATE / 100, 2)
    total_amount = round(maternity_amount + parental_amount, 2)

    periods = [
        PeriodBreakdown(
            name="Urlop macierzyński (Za życiem)",
            weeks=base_maternity,
            days=base_maternity * 7,
            rate_percentage=FULL_MATERNITY_RATE,
            monthly_amount=round(daily_rate * 30, 2),
            total_amount=maternity_amount,
            taken_by="Matka",
        ),
        PeriodBreakdown(
            name="Wydłużony urlop rodzicielski z ustawy 'Za życiem'",
            weeks=parental_weeks,
            days=parental_weeks * 7,
            rate_percentage=STANDARD_PARENTAL_RATE,
            monthly_amount=round(daily_rate * 30 * STANDARD_PARENTAL_RATE / 100, 2),
            total_amount=parental_amount,
            taken_by="Rodzice (pula wspólna + 9 tyg. nieprzenoszalne)",
        ),
    ]

    return SpecialCasesResult(
        case_type=SpecialCaseType.ZA_ZYCIEM,
        is_eligible=True,
        base_maternity_weeks=base_maternity,
        supplementary_maternity_weeks=0,
        total_maternity_weeks=base_maternity,
        parental_weeks=parental_weeks,
        non_transferable_parental_weeks=NON_TRANSFERABLE_PARENTAL_WEEKS,
        total_leave_weeks=total_weeks,
        calculation_base_net=base_net,
        daily_rate=daily_rate,
        total_benefit_amount=total_amount,
        one_time_grant_pln=ZA_ZYCIEM_ONE_TIME_GRANT_PLN,
        can_interrupt_maternity_for_hospitalization=True,
        min_mandatory_mother_maternity_weeks=MANDATORY_MOTHER_MATERNITY_WEEKS,
        periods=periods,
        description=(
            f"Zaświadczenie 'Za życiem': rodzicielski {parental_weeks} tyg., "
            f"oraz jednorazowe świadczenie {int(ZA_ZYCIEM_ONE_TIME_GRANT_PLN)} zł."
        ),
        legal_basis=[
            "Art. 182(1a) § 2 Kodeksu Pracy (wydłużony wymiar 65/67 tygodni)",
            "Ustawa z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem”",
            "Art. 10 ustawy 'Za życiem' - jednorazowe świadczenie 4000 zł",
        ],
        required_documents=[
            "Zaświadczenie lekarskie potwierdzające ciężkie i nieodwracalne upośledzenie",
            "Wniosek o wydłużony urlop rodzicielski do pracodawcy",
            "Wniosek o jednorazowe świadczenie 4000 zł do MOPS/GOPS (do 12 m-cy)",
        ],
        important_notes=[
            f"Z puli {parental_weeks} tyg. 9 tyg. przysługuje wyłącznie drugiemu rodzicowi.",
            "Przy łączeniu z pracą na 1/2 etatu, urlop wydłuża się do 130/134 tyg.",
        ],
    )


def _calculate_premature_hospitalization(
    data: SpecialCasesInput, base_net: float, daily_rate: float
) -> SpecialCasesResult:
    base_maternity = get_maternity_weeks(data.children_born_count)
    parental_weeks = (
        PARENTAL_WEEKS_STANDARD if data.children_born_count == 1 else PARENTAL_WEEKS_MULTIPLE_BIRTH
    )

    supplementary_weeks = 0
    rule_description = ""
    birth_week = data.child_birth_week or 40
    weight = data.birth_weight_grams or 3500
    hosp_weeks = data.hospitalization_weeks

    if birth_week <= PREMATURE_EXTREME_WEEK_THRESHOLD or weight <= PREMATURE_EXTREME_WEIGHT_GRAMS:
        supplementary_weeks = min(hosp_weeks, PREMATURE_EXTREME_MAX_SUPPLEMENTARY_WEEKS)
        min_w = PREMATURE_EXTREME_WEEK_THRESHOLD
        max_w = PREMATURE_EXTREME_MAX_SUPPLEMENTARY_WEEKS
        rule_description = (
            f"Urodzenie < {min_w}. tyg. lub waga <= {PREMATURE_EXTREME_WEIGHT_GRAMS}g: "
            f"do {max_w} tyg. uzupełniającego urlopu."
        )
    elif birth_week <= PREMATURE_MODERATE_WEEK_THRESHOLD:
        supplementary_weeks = min(hosp_weeks, PREMATURE_STANDARD_MAX_SUPPLEMENTARY_WEEKS)
        rule_description = (
            f"Urodzenie 28-{PREMATURE_MODERATE_WEEK_THRESHOLD}. tyg.: "
            f"do {PREMATURE_STANDARD_MAX_SUPPLEMENTARY_WEEKS} tyg. uzupełniającego urlopu."
        )
    else:
        supplementary_weeks = min(hosp_weeks, PREMATURE_STANDARD_MAX_SUPPLEMENTARY_WEEKS)
        rule_description = (
            f"Hospitalizacja po terminie (min. {TERM_BIRTH_HOSPITALIZATION_MIN_DAYS} dni): "
            f"do {PREMATURE_STANDARD_MAX_SUPPLEMENTARY_WEEKS} tyg. uzupełniającego urlopu."
        )

    total_maternity = base_maternity + supplementary_weeks
    total_weeks = total_maternity + parental_weeks

    base_mat_amount = round(daily_rate * base_maternity * 7 * FULL_MATERNITY_RATE / 100, 2)
    supp_mat_amount = round(daily_rate * supplementary_weeks * 7 * FULL_MATERNITY_RATE / 100, 2)
    parental_amount = round(daily_rate * parental_weeks * 7 * STANDARD_PARENTAL_RATE / 100, 2)
    total_amount = round(base_mat_amount + supp_mat_amount + parental_amount, 2)

    periods = [
        PeriodBreakdown(
            name="Podstawowy urlop macierzyński",
            weeks=base_maternity,
            days=base_maternity * 7,
            rate_percentage=FULL_MATERNITY_RATE,
            monthly_amount=round(daily_rate * 30, 2),
            total_amount=base_mat_amount,
            taken_by="Matka",
        )
    ]

    if supplementary_weeks > 0:
        periods.append(
            PeriodBreakdown(
                name="Uzupełniający urlop macierzyński (hospitalizacja wcześniaka)",
                weeks=supplementary_weeks,
                days=supplementary_weeks * 7,
                rate_percentage=FULL_MATERNITY_RATE,
                monthly_amount=round(daily_rate * 30, 2),
                total_amount=supp_mat_amount,
                taken_by="Matka",
            )
        )

    periods.append(
        PeriodBreakdown(
            name="Urlop rodzicielski",
            weeks=parental_weeks,
            days=parental_weeks * 7,
            rate_percentage=STANDARD_PARENTAL_RATE,
            monthly_amount=round(daily_rate * 30 * STANDARD_PARENTAL_RATE / 100, 2),
            total_amount=parental_amount,
            taken_by="Rodzice",
        )
    )

    return SpecialCasesResult(
        case_type=SpecialCaseType.PREMATURE_HOSPITALIZATION,
        is_eligible=True,
        base_maternity_weeks=base_maternity,
        supplementary_maternity_weeks=supplementary_weeks,
        total_maternity_weeks=total_maternity,
        parental_weeks=parental_weeks,
        non_transferable_parental_weeks=NON_TRANSFERABLE_PARENTAL_WEEKS,
        total_leave_weeks=total_weeks,
        calculation_base_net=base_net,
        daily_rate=daily_rate,
        total_benefit_amount=total_amount,
        one_time_grant_pln=0.0,
        can_interrupt_maternity_for_hospitalization=True,
        min_mandatory_mother_maternity_weeks=MIN_MATERNITY_WEEKS_BEFORE_HOSPITAL_INTERRUPTION,
        periods=periods,
        description=f"{rule_description} Dodano {supplementary_weeks} tyg. uzupełniającego urlopu.",
        legal_basis=[
            "Art. 180(1) i 180(2) Kodeksu Pracy (uzupełniający urlop macierzyński)",
            (
                "Art. 181 KP (przerwanie urlopu po min. "
                f"{MIN_MATERNITY_WEEKS_BEFORE_HOSPITAL_INTERRUPTION} tyg.)"
            ),
        ],
        required_documents=[
            "Zaświadczenie szpitalne o okresie hospitalizacji dziecka i tygodniu urodzenia",
            "Wniosek do pracodawcy o uzupełniający urlop macierzyński",
            "Wniosek o przerwanie urlopu macierzyńskiego na czas hospitalizacji",
        ],
        important_notes=[
            (
                "Matka może przerwać urlop po "
                f"{MIN_MATERNITY_WEEKS_BEFORE_HOSPITAL_INTERRUPTION} tyg., "
                "jeśli dziecko przebywa w szpitalu, i odebrać resztę po wypisie."
            ),
            "W czasie pobytu dziecka w szpitalu rodzic może pobierać zasiłek opiekuńczy.",
        ],
    )


def _calculate_stillbirth_or_death(
    data: SpecialCasesInput, base_net: float, daily_rate: float
) -> SpecialCasesResult:
    if data.is_stillbirth or (
        data.child_death_after_birth
        and data.child_age_days_at_death is not None
        and data.child_age_days_at_death < STILLBIRTH_MATERNITY_DAYS
    ):
        maternity_weeks = STILLBIRTH_MATERNITY_WEEKS
        maternity_days = STILLBIRTH_MATERNITY_DAYS
        description = (
            f"Urodzenie martwego dziecka lub zgon w pierwszych 8 tyg. życia: "
            f"przysługuje skrócony urlop macierzyński w wymiarze {STILLBIRTH_MATERNITY_WEEKS} tyg."
        )
    elif (
        data.child_death_after_birth
        and data.child_age_days_at_death is not None
        and data.child_age_days_at_death >= STILLBIRTH_MATERNITY_DAYS
    ):
        maternity_weeks = 1
        maternity_days = MIN_DAYS_LEAVE_AFTER_CHILD_DEATH
        description = (
            f"Zgon dziecka po upływie 8 tyg. życia: przysługuje urlop macierzyński "
            f"przez {MIN_DAYS_LEAVE_AFTER_CHILD_DEATH} dni od dnia zgonu dziecka."
        )
    else:
        maternity_weeks = STILLBIRTH_MATERNITY_WEEKS
        maternity_days = STILLBIRTH_MATERNITY_DAYS
        if data.child_death_after_birth:
            description = (
                f"Zgon dziecka po porodzie: przysługuje urlop macierzyński "
                f"w wymiarze {STILLBIRTH_MATERNITY_WEEKS} tyg. (art. 180(1) § 2 KP)."
            )
        else:
            description = (
                f"Urodzenie martwego dziecka: urlop macierzyński {STILLBIRTH_MATERNITY_WEEKS} tyg."
            )

    if data.surviving_children_count > 0:
        surviving_maternity_weeks = get_maternity_weeks(data.surviving_children_count)
        maternity_weeks = max(maternity_weeks, surviving_maternity_weeks)
        maternity_days = maternity_weeks * 7
        description += (
            f" Ze względu na {data.surviving_children_count} żyjących dzieci wymiar "
            + f"urlopu macierzyńskiego wynosi {maternity_weeks} tygodni."
        )

    total_amount = round(daily_rate * maternity_days * FULL_MATERNITY_RATE / 100, 2)

    periods = [
        PeriodBreakdown(
            name="Urlop macierzyński po urodzeniu martwym / zgonie dziecka",
            weeks=maternity_weeks,
            days=maternity_days,
            rate_percentage=FULL_MATERNITY_RATE,
            monthly_amount=round(daily_rate * 30, 2),
            total_amount=total_amount,
            taken_by="Matka",
        )
    ]

    return SpecialCasesResult(
        case_type=SpecialCaseType.STILLBIRTH_OR_DEATH,
        is_eligible=True,
        base_maternity_weeks=maternity_weeks,
        supplementary_maternity_weeks=0,
        total_maternity_weeks=maternity_weeks,
        parental_weeks=0,
        non_transferable_parental_weeks=0,
        total_leave_weeks=maternity_weeks,
        calculation_base_net=base_net,
        daily_rate=daily_rate,
        total_benefit_amount=total_amount,
        one_time_grant_pln=DEATH_GRANT_ZUS_PLN,
        can_interrupt_maternity_for_hospitalization=False,
        min_mandatory_mother_maternity_weeks=STILLBIRTH_MATERNITY_WEEKS,
        periods=periods,
        description=description,
        legal_basis=[
            "Art. 180(1) § 1 KP (urodzenie martwego dziecka - 8 tygodni po porodzie)",
            "Art. 180(1) § 2 KP (zgon dziecka przed upływem 8 tygodni - min. 7 dni od zgonu)",
            "Art. 180(1) § 3 KP (zgon dziecka po upływie 8 tygodni - 7 dni od dnia zgonu)",
        ],
        required_documents=[
            "Odpis skrócony aktu urodzenia z adnotacją o martwym urodzeniu LUB akt zgonu dziecka",
            "Wniosek do pracodawcy o urlop macierzyński w wymiarze 8 tygodni / 7 dni",
            "Wniosek do ZUS o zasiłek pogrzebowy (druk Z-12, kwota 4000 zł)",
        ],
        important_notes=[
            "Urlop rodzicielski w przypadku martwego urodzenia nie przysługuje.",
            "Zasiłek macierzyński wynosi 100% podstawy wymiaru.",
            "Rodzicom przysługuje zasiłek pogrzebowy z ZUS (4000 zł) niezależnie od tygodnia.",
            "Wsparcie psychologiczne: pomoc fundacji (np. Rodzić po Ludzku, Fundacja Ernesta).",
        ],
    )
