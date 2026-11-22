import { useState } from "react";
import { defaultGuideInput, type GuideInput } from "@/lib/guide";
import { SetupStep } from "./setup-step";
import { ResultsView } from "./results-view";
import { CheckCircle2, ChevronRight } from "lucide-react";

export function GuideFlow() {
  const [input, setInput] = useState<GuideInput>(defaultGuideInput);
  const [stage, setStage] = useState<"setup" | "results">("setup");
  const [revision, setRevision] = useState(0);

  const showResults = (next: GuideInput) => {
    setInput(next);
    setRevision((current) => current + 1);
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToSetup = () => {
    setStage("setup");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="zus-guide-flow" style={{ width: "100%" }}>
      {/* Pasek postępu (ZUS Wizard Stepper) - wskaźnik informacyjny etapów kalkulatora */}
      <div
        aria-label="Kroki kalkulatora"
        className="zus-stepper-bar"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "16px 24px 20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          background: "#FFFFFF",
          border: "1px solid var(--zus-border, #CBD5E1)",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          marginBottom: "24px",
        }}
      >
        {/* Krok 1 */}
        <div
          className={`zus-step-item ${stage === "setup" ? "active" : "completed"}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flex: 1,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "default",
          }}
        >
          <div
            className="zus-step-number"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.95rem",
              backgroundColor: "#007834",
              color: "#FFFFFF",
              flexShrink: 0,
              boxShadow:
                stage === "setup" ? "0 0 0 4px rgba(0, 120, 52, 0.15)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {stage === "results" ? (
              <CheckCircle2 className="size-5 text-white" />
            ) : (
              "1"
            )}
          </div>
          <div
            className="zus-step-content"
            style={{ display: "flex", flexDirection: "column", gap: "2px" }}
          >
            <div
              className="zus-step-title"
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#0F172A",
                lineHeight: 1.25,
              }}
            >
              Wprowadzenie danych i weryfikacja uprawnień
            </div>
            <div
              className="zus-step-desc"
              style={{
                fontSize: "0.78rem",
                color: "#64748B",
              }}
            >
              Rola wnioskodawcy, forma zatrudnienia, staż i wynagrodzenie
            </div>
          </div>
        </div>

        {/* Łącznik progresji między krokiem 1 a 2 – jednolita strzałka bez przerwy przed grotem */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <svg
            width="56"
            height="18"
            viewBox="0 0 56 18"
            fill="none"
            style={{ display: "block" }}
          >
            <path
              d="M 2 9 H 50.5 M 43 4 L 50.5 9 L 43 14"
              stroke={stage === "results" ? "#007834" : "#CBD5E1"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "stroke 0.3s ease" }}
            />
          </svg>
        </div>

        {/* Krok 2 */}
        <div
          className={`zus-step-item ${stage === "results" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flex: 1,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "default",
            opacity: stage === "setup" ? 0.75 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <div
            className="zus-step-number"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.95rem",
              backgroundColor: stage === "results" ? "#007834" : "#F1F5F9",
              border: stage === "results" ? "none" : "1.5px solid #CBD5E1",
              color: stage === "results" ? "#FFFFFF" : "#64748B",
              flexShrink: 0,
              boxShadow:
                stage === "results"
                  ? "0 0 0 4px rgba(0, 120, 52, 0.15)"
                  : "none",
              transition: "all 0.2s ease",
            }}
          >
            2
          </div>
          <div
            className="zus-step-content"
            style={{ display: "flex", flexDirection: "column", gap: "2px" }}
          >
            <div
              className="zus-step-title"
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: stage === "results" ? "#0F172A" : "#475569",
                lineHeight: 1.25,
              }}
            >
              Wyniki kalkulacji, warianty i harmonogram
            </div>
            <div
              className="zus-step-desc"
              style={{
                fontSize: "0.78rem",
                color: "#64748B",
              }}
            >
              Porównanie 81,5% vs 100/70%, osie czasu, dokumenty i alerty
            </div>
          </div>
        </div>

        {/* Dolny pasek postępu (50% -> 100%) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: "#F1F5F9",
          }}
        >
          <div
            style={{
              height: "100%",
              width: stage === "setup" ? "50%" : "100%",
              backgroundColor: "#007834",
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>

      {/* Widok aktywnego kroku */}
      {stage === "setup" ? (
        <SetupStep initialInput={input} onSubmit={showResults} />
      ) : (
        <ResultsView key={revision} input={input} onEdit={goToSetup} />
      )}
    </div>
  );
}
