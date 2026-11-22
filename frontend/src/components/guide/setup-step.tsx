import React, { useState, useMemo, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  User,
  Calendar,
  CreditCard,
  Info,
  FileUp,
} from "lucide-react";
import {
  waitingPeriodDays,
  qualify,
  sampleCases,
  type GuideInput,
} from "@/lib/guide";
import { SampleCasesMenu } from "./sample-cases-menu";
import { parsePdfDocument } from "@/lib/api-client";

export function SetupStep({
  initialInput,
  onSubmit,
}: {
  initialInput: GuideInput;
  onSubmit: (input: GuideInput) => void;
}) {
  const [input, setInput] = useState<GuideInput>(initialInput);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  const isEmployee = input.employment === "uop";
  const canSubmit = Boolean(input.dueDate) && input.grossSalary > 0;

  // Wstępna kwalifikacja na żywo
  const qualification = useMemo(() => qualify(input), [input]);

  // Szacunki na żywo
  const baseNet = Math.round(input.grossSalary * (1 - 0.1371) * 100) / 100;
  const estimatedMonthlyUnified = Math.round(baseNet * 0.815 * 100) / 100;
  const estimatedMonthly100 = Math.round(baseNet * 1.0 * 100) / 100;

  const handleSelectSample = (sampleInput: GuideInput) => {
    setInput(sampleInput);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingPdf(true);
    setPdfStatusMessage(null);

    try {
      const data = await parsePdfDocument(file);
      if (data) {
        const extracted = data.extracted_data || {};
        const docType = data.document_type || "Z-3";

        setInput((prev) => {
          let emp: GuideInput["employment"] = prev.employment;
          if (docType === "Z-3") emp = "uop";
          else if (docType === "Z-3a") emp = "zlecenie";

          return {
            ...prev,
            grossSalary:
              extracted.gross_salary && extracted.gross_salary > 0
                ? extracted.gross_salary
                : prev.grossSalary,
            employment: emp,
            sicknessInsurance: extracted.has_active_ezla_code_b !== false,
            role: "mother",
          };
        });

        const salaryText = extracted.gross_salary
          ? `${extracted.gross_salary} zł brutto`
          : "";
        setPdfStatusMessage(
          `Wczytano z pliku ${file.name}: dokument ${docType} (${salaryText || "uzupełniono parametry formularza"}).`,
        );
      }
    } catch (err) {
      console.warn("PDF parsing error", err);
      setPdfStatusMessage(
        "Nie udało się przetworzyć pliku PDF. Wprowadź dane ręcznie.",
      );
    } finally {
      setIsParsingPdf(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="zus-calc-grid">
      {/* 1. LEWA KOLUMNA: Formularz danych w stylu ZUS */}
      <div className="zus-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h2
              className="zus-card-header-title"
              style={{ margin: 0, border: "none", padding: 0 }}
            >
              Dane do kalkulacji uprawnień
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Załaduj przykładową sprawę ZUS - identycznie jak w Kroku 2 */}
            <SampleCasesMenu onSelect={handleSelectSample} />

            {/* Opcja wgrania PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="zus-btn-outline-pue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                height: "38px",
                padding: "0 12px",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              disabled={isParsingPdf}
              title="Wgraj zaświadczenie płatnika lub wniosek ZUS w formacie PDF (np. Z-3, Z-3a, ZAM, e-ZLA)"
            >
              <FileUp className="size-4 text-[#475569]" />
              <span>{isParsingPdf ? "Parsowanie PDF..." : "Wgraj PDF"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handlePdfUpload}
            />
          </div>
        </div>

        {/* Powiadomienie o załadowaniu z PDF */}
        {pdfStatusMessage && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#E6F4EC",
              border: "1px solid #99D2AF",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "0.84rem",
              color: "#00441c",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 className="size-4 text-[#007834] shrink-0" />
              <span>{pdfStatusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfStatusMessage(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#007834",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}

        <form
          className="zus-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(input);
          }}
        >
          {/* 1. Rola: Kto wnioskuje o świadczenie */}
          <div className="zus-form-group">
            <label
              className="zus-label"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <User className="size-4 text-[#475569]" />
              <span>Kto wnioskuje o świadczenie? (Rola wnioskodawcy)</span>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => update("role", "mother")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.role === "mother"
                      ? "2px solid #334155"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.role === "mother" ? "#F1F5F9" : "#FFFFFF",
                  color: input.role === "mother" ? "#0F172A" : "#475569",
                  fontWeight: input.role === "mother" ? 700 : 500,
                  fontSize: "0.94rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  boxShadow:
                    input.role === "mother"
                      ? "0 1px 2px rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                Matka
              </button>

              <button
                type="button"
                onClick={() => update("role", "father")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.role === "father"
                      ? "2px solid #334155"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.role === "father" ? "#F1F5F9" : "#FFFFFF",
                  color: input.role === "father" ? "#0F172A" : "#475569",
                  fontWeight: input.role === "father" ? 700 : 500,
                  fontSize: "0.94rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  boxShadow:
                    input.role === "father"
                      ? "0 1px 2px rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                Ojciec
              </button>

              <button
                type="button"
                onClick={() => update("role", "guardian")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.role === "guardian"
                      ? "2px solid #334155"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.role === "guardian" ? "#F1F5F9" : "#FFFFFF",
                  color: input.role === "guardian" ? "#0F172A" : "#475569",
                  fontWeight: input.role === "guardian" ? 700 : 500,
                  fontSize: "0.94rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  boxShadow:
                    input.role === "guardian"
                      ? "0 1px 2px rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                Opiekun
              </button>
            </div>
          </div>

          {/* 2. Forma zatrudnienia (Tytuł ubezpieczenia) */}
          <div className="zus-form-group">
            <label
              className="zus-label"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <CreditCard className="size-4 text-[#475569]" />
              <span>Forma zatrudnienia (Tytuł ubezpieczenia społecznego)</span>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => update("employment", "uop")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.employment === "uop"
                      ? "2px solid #334155"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.employment === "uop" ? "#F1F5F9" : "#FFFFFF",
                  color: input.employment === "uop" ? "#0F172A" : "#475569",
                  fontWeight: input.employment === "uop" ? 700 : 500,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  transition: "all 0.15s ease",
                  boxShadow:
                    input.employment === "uop"
                      ? "0 1px 2px rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                Umowa o pracę
              </button>

              <button
                type="button"
                onClick={() => update("employment", "zlecenie")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.employment === "zlecenie"
                      ? "2px solid #334155"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.employment === "zlecenie" ? "#F1F5F9" : "#FFFFFF",
                  color:
                    input.employment === "zlecenie" ? "#0F172A" : "#475569",
                  fontWeight: input.employment === "zlecenie" ? 700 : 500,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  transition: "all 0.15s ease",
                  boxShadow:
                    input.employment === "zlecenie"
                      ? "0 1px 2px rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                Umowa zlecenie
              </button>

              <button
                type="button"
                onClick={() => update("employment", "jdg")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.employment === "jdg"
                      ? "2px solid #334155"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.employment === "jdg" ? "#F1F5F9" : "#FFFFFF",
                  color: input.employment === "jdg" ? "#0F172A" : "#475569",
                  fontWeight: input.employment === "jdg" ? 700 : 500,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  transition: "all 0.15s ease",
                  boxShadow:
                    input.employment === "jdg"
                      ? "0 1px 2px rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                Działalność (JDG)
              </button>
            </div>

            {/* Informacja o statusie ubezpieczenia chorobowego */}
            {isEmployee ? (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.84rem",
                  color: "#334155",
                }}
              >
                <Info className="size-4 text-[#475569] shrink-0" />
                <span>
                  Ubezpieczenie chorobowe na etacie jest obowiązkowe od 1. dnia
                  pracy. Brak karencji przy macierzyńskim.
                </span>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: input.sicknessInsurance
                    ? "#F8FAFC"
                    : "#FEF2F2",
                  border: `1.5px solid ${input.sicknessInsurance ? "#CBD5E0" : "#EF4444"}`,
                  borderRadius: "6px",
                  marginTop: "8px",
                  transition: "all 0.2s ease",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: input.sicknessInsurance ? "#1A1A1A" : "#991B1B",
                      }}
                    >
                      Opłacam dobrowolne ubezpieczenie chorobowe (składka 2,45%)
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: input.sicknessInsurance ? "#64748B" : "#B91C1C",
                        marginTop: "2px",
                      }}
                    >
                      {input.sicknessInsurance
                        ? "Zgłoszenie do ZUS (ZUA/ZZA) – warunek prawa do zasiłku macierzyńskiego."
                        : "UWAGA: Bez ubezpieczenia chorobowego ZUS wyda decyzję odmowną!"}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={input.sicknessInsurance}
                    onChange={(e) =>
                      update("sicknessInsurance", e.target.checked)
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#334155",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3. Staż ubezpieczenia i data porodu w jednym rzędzie */}
          <div className="zus-form-row">
            <div className="zus-form-group">
              <label
                className="zus-label"
                htmlFor="insured-days"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Calendar className="size-4 text-[#475569]" />
                <span>Staż ubezpieczenia w dniach</span>
              </label>
              <input
                id="insured-days"
                type="number"
                min="0"
                className="zus-input"
                value={input.insuredDays || ""}
                onChange={(e) =>
                  update(
                    "insuredDays",
                    Math.max(0, Number(e.target.value) || 0),
                  )
                }
                placeholder="np. 365"
              />
              <span
                style={{
                  fontSize: "0.76rem",
                  color: "#64748B",
                  marginTop: "3px",
                }}
              >
                Min. {waitingPeriodDays(input.employment)} dni okresu
                wyczekiwania (
                {input.employment === "uop"
                  ? "przy UoP brak karencji na macierzyński"
                  : "wymagana ciągłość składek"}
                ).
              </span>
            </div>

            <div className="zus-form-group">
              <label
                className="zus-label"
                htmlFor="due-date"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Calendar className="size-4 text-[#475569]" />
                <span>
                  {input.role === "guardian"
                    ? "Data przyjęcia dziecka"
                    : "Planowana data porodu"}
                </span>
              </label>
              <input
                id="due-date"
                type="date"
                required
                className="zus-input"
                value={input.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
              <span
                style={{
                  fontSize: "0.76rem",
                  color: "#64748B",
                  marginTop: "3px",
                }}
              >
                Początek okresu pobierania świadczenia.
              </span>
            </div>
          </div>

          {/* 4. Wynagrodzenie brutto / podstawa składek */}
          <div className="zus-form-group">
            <label
              className="zus-label"
              htmlFor="gross-salary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <CreditCard className="size-4 text-[#475569]" />
              <span>
                {input.employment === "jdg"
                  ? "Zadeklarowana miesięczna podstawa wymiaru składek (PLN)"
                  : "Średnie miesięczne wynagrodzenie brutto (PLN)"}
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="gross-salary"
                type="number"
                min="0"
                step="50"
                required
                className="zus-input"
                value={input.grossSalary || ""}
                onChange={(e) =>
                  update(
                    "grossSalary",
                    Math.max(0, Number(e.target.value) || 0),
                  )
                }
                placeholder="np. 7000"
                style={{ paddingRight: "45px" }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontWeight: 600,
                  color: "#64748B",
                  fontSize: "0.88rem",
                  pointerEvents: "none",
                }}
              >
                zł
              </span>
            </div>
            <span
              style={{
                fontSize: "0.76rem",
                color: "#64748B",
                marginTop: "3px",
              }}
            >
              Przeciętne wynagrodzenie z ostatnich 12 miesięcy kalendarzowych
              przed porodem.
            </span>
          </div>

          {/* 5. Sytuacje szczególne (opcjonalnie) */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "0.86rem",
                fontWeight: 600,
                color: "#1E293B",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck className="size-4 text-[#475569]" />
              <span>Sytuacje szczególne (opcjonalnie):</span>
            </div>

            {input.role === "mother" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "0.84rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={input.premature}
                  onChange={(e) => update("premature", e.target.checked)}
                  style={{
                    accentColor: "#334155",
                    width: "16px",
                    height: "16px",
                  }}
                />
                <span style={{ color: "#1E293B" }}>
                  Wcześniak lub hospitalizacja noworodka (+ do 15 tyg. urlopu
                  uzupełniającego 100%)
                </span>
              </label>
            )}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "0.84rem",
              }}
            >
              <input
                type="checkbox"
                checked={input.zaZyciem}
                onChange={(e) => update("zaZyciem", e.target.checked)}
                style={{
                  accentColor: "#334155",
                  width: "16px",
                  height: "16px",
                }}
              />
              <span style={{ color: "#1E293B" }}>
                Zaświadczenie z Ustawy „Za życiem” (+24 tyg. rodzicielskiego i
                jednorazowe 4 000 zł)
              </span>
            </label>
          </div>

          {/* Przycisk przejścia do Kroku 2 */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="zus-btn-primary"
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: "1rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? "pointer" : "not-allowed",
              borderRadius: "6px",
              boxShadow: canSubmit ? "0 2px 4px rgba(0, 0, 0, 0.1)" : "none",
              marginTop: "4px",
            }}
          >
            <span>Kontynuuj</span>
            <ArrowRight className="size-4" />
          </button>
        </form>
      </div>

      {/* 2. PRAWA KOLUMNA: Spokojne, czytelne podsumowanie wstępne */}
      <div className="zus-card">
        <h2
          className="zus-card-header-title"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Wstępne podsumowanie</span>
          <span
            style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}
          >
            Szacunek na żywo
          </span>
        </h2>

        <div
          className="zus-results-box"
          style={{ padding: "0", background: "transparent", border: "none" }}
        >
          {/* Status Kwalifikacji w stonowanym stylu */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: qualification.eligible ? "#F8FAFC" : "#FEF2F2",
              border: `1px solid ${qualification.eligible ? "#CBD5E1" : "#FCA5A5"}`,
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: qualification.eligible ? "#1E293B" : "#DC2626",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: qualification.eligible
                      ? "#475569"
                      : "#DC2626",
                  }}
                ></span>
                {qualification.eligible
                  ? "Warunki formalne spełnione"
                  : "Brak wymaganego stażu"}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#64748B",
                  textTransform: "uppercase",
                }}
              >
                {input.employment === "uop"
                  ? "Etat (UoP)"
                  : input.employment === "zlecenie"
                    ? "Zlecenie"
                    : "Działalność"}
              </span>
            </div>

            <p
              style={{
                fontSize: "0.84rem",
                color: qualification.eligible ? "#334155" : "#991B1B",
                lineHeight: 1.45,
                margin: 0,
              }}
            >
              {qualification.reason}
            </p>
          </div>

          {/* Statystyki wstępne na kafelkach (2x2) */}
          <div className="zus-stat-grid" style={{ marginBottom: "16px" }}>
            <div className="zus-stat-item">
              <div className="zus-stat-label">Podstawa netto</div>
              <div className="zus-stat-value" style={{ color: "#0F172A" }}>
                {baseNet > 0 ? `${baseNet.toLocaleString("pl-PL")} zł` : "—"}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748B",
                  marginTop: "2px",
                }}
              >
                Po potrąceniu 13,71% składek
              </div>
            </div>

            <div className="zus-stat-item">
              <div className="zus-stat-label">Wariant stały 81,5%</div>
              <div className="zus-stat-value" style={{ color: "#0F172A" }}>
                {estimatedMonthlyUnified > 0
                  ? `${estimatedMonthlyUnified.toLocaleString("pl-PL")} zł`
                  : "—"}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748B",
                  marginTop: "2px",
                }}
              >
                Miesięcznie przez cały urlop
              </div>
            </div>

            <div className="zus-stat-item">
              <div className="zus-stat-label">Wariant zmienny 100%</div>
              <div className="zus-stat-value" style={{ color: "#0F172A" }}>
                {estimatedMonthly100 > 0
                  ? `${estimatedMonthly100.toLocaleString("pl-PL")} zł`
                  : "—"}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748B",
                  marginTop: "2px",
                }}
              >
                Macierzyński 100%, potem 70%
              </div>
            </div>

            <div className="zus-stat-item">
              <div className="zus-stat-label">Łączny wymiar opieki</div>
              <div className="zus-stat-value" style={{ color: "#0F172A" }}>
                {input.zaZyciem
                  ? "85 tyg."
                  : input.role === "father"
                    ? "9 tyg. + 14 dni"
                    : "61 tyg."}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748B",
                  marginTop: "2px",
                }}
              >
                Zasiłek wypłacany z ZUS (FUS)
              </div>
            </div>
          </div>

          {/* Wskazówka i zapowiedź Kroku 2 */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              fontSize: "0.82rem",
              color: "#334155",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "#1E293B",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Info className="size-4 text-[#475569]" />
              <span>Co sprawdzisz w Kroku 2:</span>
            </div>
            Otrzymasz harmonogram wypłat z dokładnymi datami, terminy złożenia
            wniosków (m.in. wniosek w 21 dni) oraz symulację podziału urlopu
            między oboje rodziców.
          </div>
        </div>
      </div>
    </div>
  );
}
