"""
Kalkulator zasiłków w ciąży — logika obliczeniowa.

Pokrywa:
- zasiłek chorobowy w ciąży (kod B, 100% podstawy, max 270 dni)
- wynagrodzenie chorobowe pracodawcy (33 / 14 dni)
- okres wyczekiwania (30 / 90 dni)
- świadczenie rehabilitacyjne po wyczerpaniu 270 dni
- zasiłek w wysokości macierzyńskiego (upadłość / bezprawne zwolnienie)
- zadłużenie JDG w ZUS
"""

from enum import StrEnum

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Stałe (hardcoded — potem pójdą do bazy / configa)
# ---------------------------------------------------------------------------

STOPA_CIAZA = 100.0  # % podstawy wymiaru przy kodzie B
STOPA_BEZ_KODU_B = 80.0
MAX_OKRES_ZASILKOWY_CIAZA = 270  # dni
SKLADKI_SPOLECZNE_PROC = 13.71  # % potrącane z brutto → podstawa wymiaru

WYCZEKIWANIE_OBOWIAZKOWE = 30  # dni (UoP)
WYCZEKIWANIE_DOBROWOLNE = 90  # dni (zlecenie, JDG)

DNI_PRACODAWCA_STANDARD = 33  # dni wynagrodzenia chorobowego od pracodawcy
DNI_PRACODAWCA_50PLUS = 14  # po ukończeniu 50 r.ż.
WIEK_PROG_50 = 50

PLACA_MINIMALNA_2026 = 4806.00  # zł brutto
LIMIT_ZADLUZENIA_ZUS = round(PLACA_MINIMALNA_2026 * 0.01, 2)  # 1% → 48.06 zł


# ---------------------------------------------------------------------------
# Enumy / modele wejścia-wyjścia
# ---------------------------------------------------------------------------


class FormaZatrudnienia(StrEnum):
    UOP = "UOP"
    ZLECENIE = "ZLECENIE"
    JDG = "JDG"
    BRAK = "BRAK"


class WielkoscPlatnika(StrEnum):
    POWYZEJ_20 = "POWYZEJ_20"
    DO_20 = "DO_20"


class StatusFirmy(StrEnum):
    NORMALNY = "NORMALNY"
    UPADLOSC_LIKWIDACJA = "UPADLOSC_LIKWIDACJA"
    BEZPRAWNE_ZWOLNIENIE = "BEZPRAWNE_ZWOLNIENIE"


class PregnancyInput(BaseModel):
    forma_zatrudnienia: FormaZatrudnienia
    wynagrodzenie_brutto: float = Field(..., gt=0, description="Średnie brutto z 12 m-cy")
    dni_ubezpieczenia: int = Field(
        ..., ge=0, description="Dni nieprzerwanego ubezpieczenia chorobowego"
    )
    zwolniona_z_wyczekiwania: bool = Field(
        False, description="Absolwentka do 90 dni od dyplomu / staż > 10 lat"
    )
    kod_b_ciaza: bool = Field(True, description="Czy e-ZLA ma kod literowy B (ciąża)")
    wiek: int = Field(30, ge=16, le=100)
    dni_choroby_w_roku: int = Field(
        0, ge=0, description="Dni choroby już wykorzystane w bieżącym roku"
    )
    dni_zwolnienia: int = Field(30, gt=0, description="Ile dni trwa obecne zwolnienie lekarskie")
    wielkosc_platnika: WielkoscPlatnika = WielkoscPlatnika.POWYZEJ_20
    zadluzenie_zus: float = Field(0.0, ge=0.0, description="Kwota zaległości ZUS (istotne dla JDG)")
    status_firmy: StatusFirmy = StatusFirmy.NORMALNY
    tydzien_ciazy: int | None = Field(None, ge=1, le=42)
    wyczerpany_okres_zasilkowy: bool = Field(False, description="Czy 270 dni już minęło")


class PregnancyResult(BaseModel):
    uprawniona: bool
    rodzaj_swiadczenia: str
    stopa_procentowa: float
    kto_wyplaca: str

    podstawa_wymiaru_netto: float
    stawka_dzienna: float
    kwota_calkowita: float

    dni_pracodawca: int
    kwota_pracodawca: float
    dni_zus: int
    kwota_zus: float

    maksymalny_okres_dni: int

    przyczyny_odmowy: list[str] = []
    wymagane_dokumenty: list[str] = []
    info_prawne: list[str] = []


# ---------------------------------------------------------------------------
# Pomocniki
# ---------------------------------------------------------------------------


def _podstawa_netto(brutto: float) -> float:
    """Brutto pomniejszone o 13,71% składek społecznych."""
    return round(brutto * (1 - SKLADKI_SPOLECZNE_PROC / 100), 2)


def _pusty_wynik(
    odmowy: list[str],
    dokumenty: list[str] | None = None,
    info: list[str] | None = None,
) -> PregnancyResult:
    return PregnancyResult(
        uprawniona=False,
        rodzaj_swiadczenia="BRAK",
        stopa_procentowa=0.0,
        kto_wyplaca="BRAK",
        podstawa_wymiaru_netto=0.0,
        stawka_dzienna=0.0,
        kwota_calkowita=0.0,
        dni_pracodawca=0,
        kwota_pracodawca=0.0,
        dni_zus=0,
        kwota_zus=0.0,
        maksymalny_okres_dni=MAX_OKRES_ZASILKOWY_CIAZA,
        przyczyny_odmowy=odmowy,
        wymagane_dokumenty=dokumenty or [],
        info_prawne=info or [],
    )


# ---------------------------------------------------------------------------
# Główna funkcja
# ---------------------------------------------------------------------------


def oblicz_zasilek_ciaza(dane: PregnancyInput) -> PregnancyResult:
    """Oblicza zasiłek chorobowy w ciąży na podstawie danych wejściowych."""

    odmowy: list[str] = []
    info: list[str] = []
    dokumenty: list[str] = []

    # ── 1. Brak ubezpieczenia ──────────────────────────────────────────
    if dane.forma_zatrudnienia == FormaZatrudnienia.BRAK:
        return _pusty_wynik(
            odmowy=["Brak tytułu do ubezpieczenia chorobowego."],
            dokumenty=["Wniosek o świadczenie rodzicielskie (1 000 zł/mc) — MOPS/GOPS"],
            info=[
                "Osobom bez ubezpieczenia przysługuje świadczenie rodzicielskie (tzw. kosiniakowe)."
            ],
        )

    # ── 2. Okres wyczekiwania (art. 4 ustawy zasiłkowej) ──────────────
    wymagany = (
        WYCZEKIWANIE_OBOWIAZKOWE
        if dane.forma_zatrudnienia == FormaZatrudnienia.UOP
        else WYCZEKIWANIE_DOBROWOLNE
    )
    if not dane.zwolniona_z_wyczekiwania and dane.dni_ubezpieczenia < wymagany:
        brak = wymagany - dane.dni_ubezpieczenia
        msg = (
            f"Nie upłynął okres wyczekiwania: wymagane {wymagany} dni, "
            + f"masz {dane.dni_ubezpieczenia} (brakuje {brak})."
        )
        odmowy.append(msg)

    # ── 3. Zadłużenie ZUS dla JDG ─────────────────────────────────────
    if (
        dane.forma_zatrudnienia == FormaZatrudnienia.JDG
        and dane.zadluzenie_zus > LIMIT_ZADLUZENIA_ZUS
    ):
        msg = (
            f"Zadłużenie w ZUS: {dane.zadluzenie_zus:.2f} zł przekracza limit "
            + f"{LIMIT_ZADLUZENIA_ZUS:.2f} zł (1% płacy minimalnej). "
            + "Spłata w ciągu 6 mies. przywraca prawo do zasiłku."
        )
        odmowy.append(msg)

    if odmowy:
        return _pusty_wynik(odmowy)

    # ── 4. Podstawa wymiaru ────────────────────────────────────────────
    podstawa = _podstawa_netto(dane.wynagrodzenie_brutto)

    # Gwarancja minimum dla pełnego etatu UoP
    if dane.forma_zatrudnienia == FormaZatrudnienia.UOP:
        min_podstawa = _podstawa_netto(PLACA_MINIMALNA_2026)
        podstawa = max(podstawa, min_podstawa)

    stawka = round(podstawa / 30, 2)
    stopa = STOPA_CIAZA if dane.kod_b_ciaza else STOPA_BEZ_KODU_B

    # ── 5. Przypadki szczególne ────────────────────────────────────────
    if dane.status_firmy in (StatusFirmy.UPADLOSC_LIKWIDACJA, StatusFirmy.BEZPRAWNE_ZWOLNIENIE):
        dni_p, kw_p = 0, 0.0
        dni_z = dane.dni_zwolnienia
        kw_z = round(stawka * dni_z * stopa / 100, 2)
        rodzaj = "ZASIŁEK_W_WYSOKOŚCI_MACIERZYŃSKIEGO"
        kto = "ZUS"
        info.append(
            "Świadczenie od ZUS do dnia porodu — utrata pracy w okolicznościach chronionych."
        )
        dokumenty.extend(
            [
                "e-ZLA z kodem B",
                "Świadectwo pracy lub wyrok sądu",
                "Oświadczenie o braku innego zatrudnienia",
            ]
        )

    elif dane.wyczerpany_okres_zasilkowy:
        dni_p, kw_p = 0, 0.0
        dni_z = dane.dni_zwolnienia
        kw_z = round(stawka * dni_z * stopa / 100, 2)
        rodzaj = "ŚWIADCZENIE_REHABILITACYJNE"
        kto = "ZUS"
        info.append("Po 270 dniach — świadczenie rehabilitacyjne 100% podstawy (maks. 12 mies.).")
        dokumenty.extend(
            [
                "Wniosek o świadczenie rehabilitacyjne (zał. nr 5)",
                "Zaświadczenie lekarskie o stanie zdrowia",
            ]
        )

    else:
        rodzaj = "ZASIŁEK_CHOROBOWY_CIĄŻA"

        if dane.forma_zatrudnienia == FormaZatrudnienia.UOP:
            limit = DNI_PRACODAWCA_50PLUS if dane.wiek >= WIEK_PROG_50 else DNI_PRACODAWCA_STANDARD
            wolne = max(0, limit - dane.dni_choroby_w_roku)
            dni_p = min(dane.dni_zwolnienia, wolne)
            dni_z = dane.dni_zwolnienia - dni_p
            kw_p = round(stawka * dni_p * stopa / 100, 2)
            kw_z = round(stawka * dni_z * stopa / 100, 2)

            if dni_p > 0 and dni_z > 0:
                kto = "PRACODAWCA + ZUS"
            elif dni_p > 0:
                kto = "PRACODAWCA"
            else:
                kto = "ZUS"
        else:
            # Zlecenie / JDG — brak wynagrodzenia chorobowego
            dni_p, kw_p = 0, 0.0
            dni_z = dane.dni_zwolnienia
            kw_z = round(stawka * dni_z * stopa / 100, 2)
            kto = (
                "PRACODAWCA (wypłata w imieniu ZUS)"
                if dane.wielkosc_platnika == WielkoscPlatnika.POWYZEJ_20
                else "ZUS"
            )

    kwota_total = round(kw_p + kw_z, 2)

    # ── 6. Dokumenty i info prawne ─────────────────────────────────────
    if dane.forma_zatrudnienia == FormaZatrudnienia.UOP:
        dokumenty.append("e-ZLA z kodem B (trafia automatycznie do ZUS i pracodawcy)")
        if dane.wielkosc_platnika == WielkoscPlatnika.DO_20:
            dokumenty.append("Z-3 — zaświadczenie płatnika składek (pracodawca → ZUS)")
        info.append("Ochrona przed wypowiedzeniem w ciąży — art. 177 KP.")
        if dane.tydzien_ciazy and dane.tydzien_ciazy >= 13:
            info.append("Umowa na czas określony przedłuża się do dnia porodu — art. 177 § 3 KP.")
    elif dane.forma_zatrudnienia == FormaZatrudnienia.ZLECENIE:
        dokumenty.extend(["e-ZLA z kodem B", "Z-3a — zaświadczenie płatnika składek"])
    elif dane.forma_zatrudnienia == FormaZatrudnienia.JDG:
        dokumenty.extend(["e-ZLA z kodem B", "ZAS-53 — wniosek o zasiłek chorobowy"])

    info.append(f"Maks. okres zasiłkowy w ciąży: {MAX_OKRES_ZASILKOWY_CIAZA} dni (zamiast 182).")
    info.append(f"Wysokość: {stopa}% podstawy wymiaru od 1. dnia zwolnienia z kodem B.")

    return PregnancyResult(
        uprawniona=True,
        rodzaj_swiadczenia=rodzaj,
        stopa_procentowa=stopa,
        kto_wyplaca=kto,
        podstawa_wymiaru_netto=podstawa,
        stawka_dzienna=stawka,
        kwota_calkowita=kwota_total,
        dni_pracodawca=dni_p,
        kwota_pracodawca=kw_p,
        dni_zus=dni_z,
        kwota_zus=kw_z,
        maksymalny_okres_dni=MAX_OKRES_ZASILKOWY_CIAZA,
        wymagane_dokumenty=dokumenty,
        info_prawne=info,
    )
