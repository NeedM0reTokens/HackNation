import React, { useState, useMemo, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  User,
  Calendar,
  CreditCard,
  Info,
  FileUp,
} from "lucide-react";
import { waitingPeriodDays, qualify, type GuideInput } from "@/lib/guide";
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

  const [daysStr, setDaysStr] = useState<string>(
    initialInput.insuredDays ? String(initialInput.insuredDays) : "",
  );
  const [salaryStr, setSalaryStr] = useState<string>(
    initialInput.grossSalary ? String(initialInput.grossSalary) : "",
  );

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Walidacja pól:
  // 1. staż >= 0
  const isDaysNegative = daysStr !== "" && Number(daysStr) < 0;
  const isDaysValid =
    daysStr !== "" && !isNaN(Number(daysStr)) && Number(daysStr) >= 0;

  // 2. data >= today
  const isDateInPast = Boolean(input.dueDate) && input.dueDate < todayStr;
  const isDateValid = Boolean(input.dueDate) && input.dueDate >= todayStr;

  // 3. wynagrodzenie >= 0
  const isSalaryNegative = salaryStr !== "" && Number(salaryStr) < 0;
  const isSalaryValid =
    salaryStr !== "" && !isNaN(Number(salaryStr)) && Number(salaryStr) >= 0;

  const isEmployee = input.employment === "uop";
  const canSubmit =
    Boolean(input.role) &&
    Boolean(input.employment) &&
    isDateValid &&
    isSalaryValid &&
    isDaysValid;

  // Wstępna kwalifikacja na żywo
  const qualification = useMemo(() => qualify(input), [input]);

  // Szacunki na żywo
  const grossNum = isSalaryValid ? Number(salaryStr) : 0;
  const baseNet = Math.round(grossNum * (1 - 0.1371) * 100) / 100;
  const estimatedMonthlyUnified = Math.round(baseNet * 0.815 * 100) / 100;
  const estimatedMonthly100 = Math.round(baseNet * 1.0 * 100) / 100;

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
              extracted.gross_salary && extracted.gross_salary >= 0
                ? extracted.gross_salary
                : prev.grossSalary,
            employment: emp,
            sicknessInsurance: extracted.has_active_ezla_code_b !== false,
            role: "mother",
          };
        });

        if (
          extracted.gross_salary !== undefined &&
          extracted.gross_salary >= 0
        ) {
          setSalaryStr(String(extracted.gross_salary));
        }
        const salaryText =
          extracted.gross_salary !== undefined
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
    <form
      className="zus-calc-flow"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) {
          onSubmit({
            ...input,
            grossSalary: Math.max(0, Number(salaryStr) || 0),
            insuredDays: Math.max(0, Number(daysStr) || 0),
          });
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
      }}
    >
      {/* 1. SEKCJA: Formularz danych w stylu ZUS */}
      <div className="zus-card">
        <div className="zus-card-header">
          <div className="zus-card-header-title">
            <ClipboardList className="size-5 text-[var(--zus-green)]" />
            <span>Dane do kalkulacji</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Opcja wgrania PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="zus-btn-outline-pue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                height: "36px",
                padding: "0 14px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "9999px",
              }}
              disabled={isParsingPdf}
              title="Wgraj zaświadczenie płatnika lub wniosek ZUS w formacie PDF (np. Z-3, Z-3a, ZAM, e-ZLA)"
            >
              <FileUp className="size-4 text-[var(--zus-green)]" />
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

        <div className="zus-form">
          {/* 1. Rola: Kto wnioskuje o świadczenie */}
          <div className="zus-form-group">
            <label
              className="zus-label"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <User className="size-4 text-[var(--zus-green)]" />
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
                      ? "2px solid var(--zus-green)"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.role === "mother"
                      ? "var(--zus-green-light)"
                      : "#FFFFFF",
                  color:
                    input.role === "mother"
                      ? "var(--zus-green-dark)"
                      : "var(--zus-text-main)",
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
                      ? "0 0 0 1px var(--zus-green)"
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
                      ? "2px solid var(--zus-green)"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.role === "father"
                      ? "var(--zus-green-light)"
                      : "#FFFFFF",
                  color:
                    input.role === "father"
                      ? "var(--zus-green-dark)"
                      : "var(--zus-text-main)",
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
                      ? "0 0 0 1px var(--zus-green)"
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
                      ? "2px solid var(--zus-green)"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.role === "guardian"
                      ? "var(--zus-green-light)"
                      : "#FFFFFF",
                  color:
                    input.role === "guardian"
                      ? "var(--zus-green-dark)"
                      : "var(--zus-text-main)",
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
                      ? "0 0 0 1px var(--zus-green)"
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
              <CreditCard className="size-4 text-[var(--zus-green)]" />
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
                onClick={() => {
                  update("employment", "uop");
                  update("sicknessInsurance", true);
                }}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.employment === "uop"
                      ? "2px solid var(--zus-green)"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.employment === "uop"
                      ? "var(--zus-green-light)"
                      : "#FFFFFF",
                  color:
                    input.employment === "uop"
                      ? "var(--zus-green-dark)"
                      : "var(--zus-text-main)",
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
                      ? "0 0 0 1px var(--zus-green)"
                      : "none",
                }}
              >
                Umowa o pracę
              </button>

              <button
                type="button"
                onClick={() => {
                  update("employment", "zlecenie");
                  update("sicknessInsurance", false);
                }}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.employment === "zlecenie"
                      ? "2px solid var(--zus-green)"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.employment === "zlecenie"
                      ? "var(--zus-green-light)"
                      : "#FFFFFF",
                  color:
                    input.employment === "zlecenie"
                      ? "var(--zus-green-dark)"
                      : "var(--zus-text-main)",
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
                      ? "0 0 0 1px var(--zus-green)"
                      : "none",
                }}
              >
                Umowa zlecenie
              </button>

              <button
                type="button"
                onClick={() => {
                  update("employment", "jdg");
                  update("sicknessInsurance", false);
                }}
                style={{
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border:
                    input.employment === "jdg"
                      ? "2px solid var(--zus-green)"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    input.employment === "jdg"
                      ? "var(--zus-green-light)"
                      : "#FFFFFF",
                  color:
                    input.employment === "jdg"
                      ? "var(--zus-green-dark)"
                      : "var(--zus-text-main)",
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
                      ? "0 0 0 1px var(--zus-green)"
                      : "none",
                }}
              >
                Działalność (JDG)
              </button>
            </div>

            {/* Informacja o statusie ubezpieczenia chorobowego */}
            {!input.employment ? null : isEmployee ? (
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
                <Info className="size-4 text-[var(--zus-green)] shrink-0" />
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
                      accentColor: "var(--zus-green)",
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
                <Calendar className="size-4 text-[var(--zus-green)]" />
                <span>Staż ubezpieczenia w dniach</span>
              </label>
              <input
                id="insured-days"
                type="number"
                min="0"
                className={`zus-input ${isDaysNegative ? "is-invalid" : ""}`}
                style={{
                  borderColor: isDaysNegative ? "#DC2626" : undefined,
                }}
                value={daysStr}
                onChange={(e) => {
                  const val = e.target.value;
                  setDaysStr(val);
                  update("insuredDays", val === "" ? 0 : Number(val) || 0);
                }}
                placeholder="np. 365"
              />
              {isDaysNegative ? (
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "#DC2626",
                    fontWeight: 600,
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Staż nie może być ujemny.
                </span>
              ) : (
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
              )}
            </div>

            <div className="zus-form-group">
              <label
                className="zus-label"
                htmlFor="due-date"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Calendar className="size-4 text-[var(--zus-green)]" />
                <span>
                  {input.role === "guardian"
                    ? "Data przyjęcia dziecka"
                    : "Planowana data porodu"}
                </span>
              </label>
              <input
                id="due-date"
                type="date"
                min={todayStr}
                required
                className={`zus-input ${isDateInPast ? "is-invalid" : ""}`}
                style={{
                  borderColor: isDateInPast ? "#DC2626" : undefined,
                }}
                value={input.dueDate || ""}
                onChange={(e) => update("dueDate", e.target.value)}
              />
              {isDateInPast ? (
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "#DC2626",
                    fontWeight: 600,
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Data nie może być z przeszłości.
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.76rem",
                    color: "#64748B",
                    marginTop: "3px",
                  }}
                >
                  Początek okresu pobierania świadczenia.
                </span>
              )}
            </div>
          </div>

          {/* 4. Wynagrodzenie brutto / podstawa składek */}
          <div className="zus-form-group">
            <label
              className="zus-label"
              htmlFor="gross-salary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <CreditCard className="size-4 text-[var(--zus-green)]" />
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
                step="any"
                required
                className={`zus-input ${isSalaryNegative ? "is-invalid" : ""}`}
                style={{
                  paddingRight: "45px",
                  borderColor: isSalaryNegative ? "#DC2626" : undefined,
                }}
                value={salaryStr}
                onChange={(e) => {
                  const val = e.target.value;
                  setSalaryStr(val);
                  update("grossSalary", val === "" ? 0 : Number(val) || 0);
                }}
                placeholder="np. 7000"
              />
              <span
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontWeight: 600,
                  color: isSalaryNegative ? "#DC2626" : "#64748B",
                  fontSize: "0.88rem",
                  pointerEvents: "none",
                }}
              >
                zł
              </span>
            </div>
            {isSalaryNegative ? (
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#DC2626",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <AlertTriangle className="size-3.5 shrink-0" />
                Wynagrodzenie nie może być ujemne.
              </span>
            ) : (
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
            )}
          </div>

          {/* Opcja uwzględnienia drugiego rodzica */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '12px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1E293B' }}>
                Uwzględnij dochód drugiego rodzica (do kalkulacji 9 tyg. ojca / urlopu ojcowskiego)
              </span>
              <input
                type="checkbox"
                checked={input.includePartner}
                onChange={(e) => update('includePartner', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#334155', cursor: 'pointer' }}
              />
            </label>
            {input.includePartner && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Średnie miesięczne wynagrodzenie brutto drugiego rodzica (PLN):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="zus-input"
                    value={input.partnerGrossSalary || ''}
                    onChange={(e) => update('partnerGrossSalary', Math.max(0, Number(e.target.value) || 0))}
                    placeholder="np. 6000"
                    style={{ paddingRight: '45px' }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 600,
                    color: '#64748B',
                    fontSize: '0.88rem',
                    pointerEvents: 'none',
                  }}>
                    zł
                  </span>
                </div>
              </div>
            )}
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
              <ShieldCheck className="size-4 text-[var(--zus-green)]" />
              <span>Sytuacje szczególne (opcjonalnie):</span>
            </div>

            {input.role === "mother" && (
              <>
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
                    checked={input.pregnancySickLeave}
                    onChange={(e) => update("pregnancySickLeave", e.target.checked)}
                    style={{
                      accentColor: "var(--zus-green)",
                      width: "16px",
                      height: "16px",
                    }}
                  />
                  <span style={{ color: "#1E293B" }}>
                    Przebywam na zwolnieniu lekarskim w ciąży (L4 z kodem B, 100% płatne przed porodem)
                  </span>
                </label>

                {input.pregnancySickLeave && (
                  <div style={{ marginLeft: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748B" }}>Liczba dni L4 przed porodem:</span>
                    <input
                      type="number"
                      min="1"
                      max="270"
                      className="zus-input"
                      style={{ width: "80px", padding: "4px 8px", height: "32px" }}
                      value={input.pregnancySickLeaveDays || 30}
                      onChange={(e) => update("pregnancySickLeaveDays", Math.max(1, Number(e.target.value) || 30))}
                    />
                  </div>
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
                    checked={input.premature}
                    onChange={(e) => update("premature", e.target.checked)}
                    style={{
                      accentColor: "var(--zus-green)",
                      width: "16px",
                      height: "16px",
                    }}
                  />
                  <span style={{ color: "#1E293B" }}>
                    Wcześniak lub hospitalizacja noworodka (+ do 15 tyg. urlopu
                    uzupełniającego 100%)
                  </span>
                </label>
              </>
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
                  accentColor: "var(--zus-green)",
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
        </div>
      </div>

      {/* 2. SEKCJA: Wstępne podsumowanie (pod sytuacjami szczególnymi, nad kontynuuj) */}
      <div className="zus-card">
        <div className="zus-card-header">
          <div className="zus-card-header-title">
            <CheckCircle2 className="size-5 text-[var(--zus-green)]" />
            <span>Wstępne podsumowanie</span>
          </div>
        </div>

        <div
          className="zus-results-box"
          style={{ padding: "0", background: "transparent", border: "none" }}
        >
          {/* Status Kwalifikacji w stonowanym stylu */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: qualification.eligible ? "#FAFAFA" : "#F5F5F5",
              border: `1px solid ${qualification.eligible ? "#D4D4D4" : "#E5E5E5"}`,
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
                  color: qualification.eligible ? "#171717" : "#525252",
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
                      ? "#007834"
                      : "#A3A3A3",
                  }}
                ></span>
                {qualification.headline}
              </span>
              {input.employment && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#737373",
                    textTransform: "uppercase",
                  }}
                >
                  {input.employment === "uop"
                    ? "Etat (UoP)"
                    : input.employment === "zlecenie"
                      ? "Zlecenie"
                      : "Działalność"}
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: "0.84rem",
                color: qualification.eligible ? "#404040" : "#525252",
                lineHeight: 1.45,
                margin: 0,
              }}
            >
              {qualification.reason}
            </p>
          </div>

          {/* Statystyki wstępne na kafelkach (2x2 / 4 w rzędzie na szerszych) */}
          <div
            className="zus-stat-grid"
            style={{
              marginBottom: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
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
                {!input.role
                  ? "—"
                  : input.zaZyciem
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
              <Info className="size-4 text-[var(--zus-green)]" />
              <span>Co sprawdzisz w Kroku 2:</span>
            </div>
            Otrzymasz harmonogram wypłat z dokładnymi datami, terminy złożenia
            wniosków (m.in. wniosek w 21 dni) oraz symulację podziału urlopu
            między oboje rodziców.
          </div>
        </div>
      </div>

      {/* 3. OSOBNA WYSPA: Przycisk kontynuuj */}
      <div
        className="zus-card"
        style={{
          borderTop: "1px solid var(--zus-border, #CBD5E0)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
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
          }}
        >
          <span>Kontynuuj</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </form>
  );
}
