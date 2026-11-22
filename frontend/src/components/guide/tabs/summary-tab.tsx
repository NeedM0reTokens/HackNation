import { useState } from "react";
import {
  ArrowRight,
  CalendarRange,
  Wallet,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatPLN, pluralWeeks } from "@/lib/format";
import type {
  Calculation,
  PaymentVariant,
  Qualification,
  ResultOptions,
} from "@/lib/guide";
import type { IntegratedCalculatorResult } from "@/types/calculator";
import { SegmentedControl } from "../segmented-control";
import { AiFieldExplainer } from "@/components/ai/AiFieldExplainer";

const variantOptions: { value: PaymentVariant; label: string; hint: string }[] =
  [
    { value: "standard", label: "100% + 70%", hint: "Więcej na start" },
    { value: "single", label: "81,5%", hint: "Wniosek do 21 dni" },
  ];

function formatWeeks(weeks: number) {
  const rounded = Math.round(weeks * 10) / 10;
  return `${String(rounded).replace(".", ",")} ${pluralWeeks(rounded)}`;
}

export function SummaryTab({
  qualification,
  calc,
  options,
  onOptionsChange,
  onShowAlerts,
  backendResult,
}: {
  qualification: Qualification;
  calc: Calculation;
  options: ResultOptions;
  onOptionsChange: (options: ResultOptions) => void;
  onShowAlerts: () => void;
  backendResult?: IntegratedCalculatorResult | null;
}) {
  const [isCashflowExpanded, setIsCashflowExpanded] = useState(false);

  if (!qualification.eligible) {
    return (
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Co możesz zrobić teraz?
        </h2>
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Sprawdź w eZUS (PUE), od kiedy podlegasz ubezpieczeniu chorobowemu.
          </li>
          <li>
            Jeśli go nie masz – zgłoś się do dobrowolnego ubezpieczenia
            chorobowego.
          </li>
          <li>
            Umów bezpłatną konsultację w placówce ZUS lub zapytaj asystenta AI.
          </li>
        </ol>
        <Button
          variant="outline"
          onClick={onShowAlerts}
          className="gap-2 self-start"
        >
          Zobacz alerty i ochronę prawną
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 3 kafelki statystyk w rzędzie */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "14px",
          marginBottom: "6px",
        }}
      >
        {/* Karta 1: Kwota miesięcznie */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderTop: "3px solid #007834",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#6B7280",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <Wallet className="size-4 text-[#007834]" />
            <span>Kwota miesięcznie</span>
          </div>
          <div>
            <div
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#1A1A1A",
                letterSpacing: "-0.5px",
              }}
            >
              {formatPLN(calc.monthlyNet, true)}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "#6B7280",
                marginTop: "2px",
              }}
            >
              netto · {formatPLN(calc.monthlyGross, true)} brutto
            </div>
          </div>
          {calc.followUpMonthlyGross !== null && (
            <div
              style={{
                fontSize: "0.78rem",
                color: "#007834",
                fontWeight: 600,
                marginTop: "auto",
                paddingTop: "4px",
              }}
            >
              Potem: {formatPLN(calc.followUpMonthlyGross, true)} brutto / mies.
            </div>
          )}
        </div>

        {/* Karta 2: Łączny czas opieki */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderTop: "3px solid #003B6F",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#6B7280",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <CalendarRange className="size-4 text-[#003B6F]" />
            <span>Łączny czas opieki</span>
          </div>
          <div>
            <div
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#1A1A1A",
                letterSpacing: "-0.5px",
              }}
            >
              {backendResult
                ? formatWeeks(backendResult.total_leave_weeks)
                : formatWeeks(calc.totalWeeks)}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "#6B7280",
                marginTop: "2px",
              }}
            >
              {backendResult
                ? `${backendResult.total_leave_days} dni kalendarzowych`
                : "Płatnego urlopu z ZUS"}
            </div>
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "#003B6F",
              fontWeight: 600,
              marginTop: "auto",
              paddingTop: "4px",
            }}
          >
            W tym 9 tyg. nieprzenoszalne dla drugiego rodzica
          </div>
        </div>

        {/* Karta 3: Wybór wariantu wypłaty */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderTop: "3px solid #F3A847",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1A1A1A" }}
          >
            Wariant wypłaty
          </div>
          {calc.variantAvailable ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginTop: "2px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  onOptionsChange({ ...options, variant: "standard" })
                }
                style={{
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border:
                    options.variant === "standard"
                      ? "2px solid #007834"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    options.variant === "standard" ? "#E6F4EC" : "#FFFFFF",
                  color: options.variant === "standard" ? "#00441c" : "#1A1A1A",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  100% + 70%
                </span>
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                  Więcej na start
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onOptionsChange({ ...options, variant: "single" })
                }
                style={{
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border:
                    options.variant === "single"
                      ? "2px solid #007834"
                      : "1.5px solid #CBD5E0",
                  backgroundColor:
                    options.variant === "single" ? "#E6F4EC" : "#FFFFFF",
                  color: options.variant === "single" ? "#00441c" : "#1A1A1A",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  81,5%
                </span>
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                  Wniosek do 21 dni
                </span>
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#1A1A1A",
                }}
              >
                100% → 70%
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#6B7280",
                  marginTop: "4px",
                }}
              >
                Ojcowski 100%, rodzicielski taty 70%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Karta: Łączenie rodzicielskiego z pracą na 1/2 etatu */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "14px 18px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: "6px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1A1A1A" }}
            >
              Łączę rodzicielski z pracą na 1/2 etatu
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#6B7280",
                marginTop: "2px",
                lineHeight: 1.4,
              }}
            >
              Zasiłek maleje o połowę, a okres urlopu ulega proporcjonalnemu
              wydłużeniu (art. 182¹f KP).
            </div>
          </div>
          <input
            type="checkbox"
            checked={options.partTime}
            onChange={(e) =>
              onOptionsChange({ ...options, partTime: e.target.checked })
            }
            style={{
              width: "20px",
              height: "20px",
              accentColor: "#007834",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
        </label>
      </div>

      {/* Porównanie wariantów 81,5% vs 100%/70% z rekomendacją ZUS */}
      {backendResult && (
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <TrendingUp className="size-4 text-[#007834]" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  margin: 0,
                }}
              >
                Porównanie wariantów wypłaty zasiłku macierzyńskiego
              </h3>
              <AiFieldExplainer
                topicId="wariant-815"
                label="Wariant 81,5% vs 100/70%"
                variant="compact"
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Wariant 81.5% */}
            <div
              onClick={() => onOptionsChange({ ...options, variant: "single" })}
              style={{
                padding: "14px 16px",
                backgroundColor:
                  options.variant === "single" ? "#E6F4EC" : "#FFFFFF",
                border:
                  options.variant === "single"
                    ? "2.5px solid #007834"
                    : "1.5px solid #CBD5E0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                boxShadow:
                  options.variant === "single"
                    ? "0 2px 8px rgba(0, 120, 52, 0.15)"
                    : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "#00441c",
                  }}
                >
                  Wariant uśredniony (81,5% przez cały okres)
                </span>
                {options.variant === "single" ? (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      backgroundColor: "#007834",
                      color: "#FFFFFF",
                      padding: "3px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    WYBRANY WARIANT
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "#6B7280",
                    }}
                  >
                    Kliknij, aby wybrać
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#007834",
                }}
              >
                {backendResult.comparison_unified_81_5_total} zł łącznie
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#4A4A4A",
                  lineHeight: 1.4,
                }}
              >
                Stała kwota przez cały okres trwania świadczenia.
              </div>
            </div>

            {/* Wariant 100/70% */}
            <div
              onClick={() =>
                onOptionsChange({ ...options, variant: "standard" })
              }
              style={{
                padding: "14px 16px",
                backgroundColor:
                  options.variant === "standard" ? "#E6F4EC" : "#FFFFFF",
                border:
                  options.variant === "standard"
                    ? "2.5px solid #007834"
                    : "1.5px solid #CBD5E0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                boxShadow:
                  options.variant === "standard"
                    ? "0 2px 8px rgba(0, 120, 52, 0.15)"
                    : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "#00441c",
                  }}
                >
                  Wariant standardowy (100% macierzyński + 70% rodzicielski)
                </span>
                {options.variant === "standard" ? (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      backgroundColor: "#007834",
                      color: "#FFFFFF",
                      padding: "3px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    WYBRANY WARIANT
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "#6B7280",
                    }}
                  >
                    Kliknij, aby wybrać
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#007834",
                }}
              >
                {backendResult.comparison_variable_100_70_total} zł łącznie
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#4A4A4A",
                  lineHeight: 1.4,
                }}
              >
                Wyższa kwota przez pierwsze 20 tygodni, niższa w okresie
                rodzicielskim.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Miesięczny plan wpływów na konto (Monthly cashflow) - zwijany/rozwijany */}
      {backendResult &&
        backendResult.monthly_cashflow &&
        backendResult.monthly_cashflow.length > 0 && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              onClick={() => setIsCashflowExpanded(!isCashflowExpanded)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none",
                gap: "12px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 700,
                      color: "#1A1A1A",
                      margin: 0,
                    }}
                  >
                    Prognoza wpływów do budżetu domowego (Miesięczny Cashflow)
                  </h3>
                  <AiFieldExplainer
                    topicId="potracenie-1371"
                    label="Odliczenie 13,71% składek"
                    buttonText="−13,71%"
                  />
                  {backendResult.monthly_cashflow.some(
                    (m) => m.father_benefit > 0,
                  ) && (
                    <AiFieldExplainer
                      topicId="cashflow-ojciec-70"
                      label="Stawka ojca 70%"
                      buttonText="Tata 70%"
                    />
                  )}
                </div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#666666",
                    margin: "4px 0 0 0",
                  }}
                >
                  Szczegółowy harmonogram wypłat miesiąc po miesiącu (
                  {backendResult.monthly_cashflow.length} miesięcy)
                </p>
              </div>

              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  backgroundColor: isCashflowExpanded ? "#00441C" : "#E6F4EC",
                  color: isCashflowExpanded ? "#FFFFFF" : "#007834",
                  border: "1.5px solid",
                  borderColor: isCashflowExpanded ? "#00441C" : "#007834",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                <span>
                  {isCashflowExpanded ? "Zwiń tabelę" : "Rozwiń tabelę"}
                </span>
                {isCashflowExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            </div>

            {isCashflowExpanded && (
              <div
                style={{
                  overflowX: "auto",
                  marginTop: "16px",
                  borderTop: "1px solid #EDF2F7",
                  paddingTop: "12px",
                }}
              >
                {(() => {
                  const hasFather = backendResult.monthly_cashflow.some(
                    (m) => m.father_benefit > 0,
                  );
                  const hasSalary = backendResult.monthly_cashflow.some(
                    (m) => m.work_salary > 0,
                  );
                  const hasMother = backendResult.monthly_cashflow.some(
                    (m) => m.mother_benefit > 0,
                  );

                  return (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.86rem",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#F8FAFC",
                            borderBottom: "2px solid #E2E8F0",
                            textAlign: "left",
                          }}
                        >
                          <th style={{ padding: "8px 12px" }}>Okres</th>
                          {hasMother && (
                            <th style={{ padding: "8px 12px" }}>
                              Zasiłek matki
                            </th>
                          )}
                          {hasFather && (
                            <th style={{ padding: "8px 12px" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span>Zasiłek ojca</span>
                                <AiFieldExplainer
                                  topicId="cashflow-ojciec-70"
                                  label="Zasiłek ojca (70%)"
                                  variant="compact"
                                />
                              </div>
                            </th>
                          )}
                          {hasSalary && (
                            <th style={{ padding: "8px 12px" }}>
                              Pensja z pracy
                            </th>
                          )}
                          <th
                            style={{
                              padding: "8px 12px",
                              fontWeight: 800,
                              color: "#007834",
                            }}
                          >
                            Łącznie / m-c
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {backendResult.monthly_cashflow.map((m, idx) => (
                          <tr
                            key={idx}
                            style={{ borderBottom: "1px solid #E2E8F0" }}
                          >
                            <td
                              style={{ padding: "8px 12px", fontWeight: 600 }}
                            >
                              {m.year_month}
                            </td>
                            {hasMother && (
                              <td style={{ padding: "8px 12px" }}>
                                {m.mother_benefit > 0
                                  ? `${m.mother_benefit} zł`
                                  : "—"}
                              </td>
                            )}
                            {hasFather && (
                              <td style={{ padding: "8px 12px" }}>
                                {m.father_benefit > 0
                                  ? `${m.father_benefit} zł`
                                  : "—"}
                              </td>
                            )}
                            {hasSalary && (
                              <td style={{ padding: "8px 12px" }}>
                                {m.work_salary > 0
                                  ? `${m.work_salary} zł`
                                  : "—"}
                              </td>
                            )}
                            <td
                              style={{
                                padding: "8px 12px",
                                fontWeight: 700,
                                color: "#007834",
                              }}
                            >
                              {m.total_month_income} zł
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "12px 18px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Accordion data-legal>
          <AccordionItem value="details" style={{ border: "none", padding: 0 }}>
            <AccordionTrigger>
              <span
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "#00441c",
                }}
              >
                Zobacz szczegółowe wyliczenia i podstawę prawną
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <dl className="flex flex-col divide-y pb-2 text-sm">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground flex items-center gap-2">
                    <span>Podstawa wymiaru (brutto − 13,71%)</span>
                    <AiFieldExplainer
                      topicId="potracenie-1371"
                      label="Podstawa netto (-13,71%)"
                      variant="compact"
                    />
                  </dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatPLN(calc.assessmentBase)}
                  </dd>
                </div>
                {calc.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="flex justify-between gap-4 py-2.5"
                  >
                    <dt className="text-muted-foreground">
                      {phase.label}
                      <span className="block text-xs">
                        {formatWeeks(phase.weeks)} ·{" "}
                        {String(phase.ratePercent).replace(".", ",")}%
                      </span>
                    </dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {formatPLN(phase.monthlyGross)} / mies.
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="font-medium text-foreground">
                    Łącznie zasiłki rodziny (brutto)
                  </dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {backendResult
                      ? `${backendResult.total_family_benefit_amount} zł`
                      : formatPLN(calc.totalGross, true)}
                  </dd>
                </div>
              </dl>
              <p className="pb-3 text-xs text-muted-foreground">
                Wyliczenia zgodne z Ustawą z dnia 25 czerwca 1999 r. o
                świadczeniach pieniężnych z ubezpieczenia społecznego w razie
                choroby i macierzyństwa (Dz.U. z 2026 r. poz. 854).
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
