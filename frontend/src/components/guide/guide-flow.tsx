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
      <div aria-label="Kroki kalkulatora" className="zus-stepper-bar">
        <div
          className={`zus-step-item ${stage === "setup" ? "active" : "completed"}`}
          style={{ cursor: "default" }}
        >
          <div className="zus-step-number">
            {stage === "results" ? (
              <CheckCircle2 className="size-4 text-[#007834]" />
            ) : (
              "1"
            )}
          </div>
          <div className="zus-step-content">
            <div className="zus-step-title">
              Krok 1: Wprowadzenie danych i weryfikacja uprawnień
            </div>
            <div className="zus-step-desc">
              Rola wnioskodawcy, forma zatrudnienia, staż i wynagrodzenie
            </div>
          </div>
        </div>

        <div className="zus-step-separator" aria-hidden="true">
          <ChevronRight className="size-5" />
        </div>

        <div
          className={`zus-step-item ${stage === "results" ? "active" : ""}`}
          style={{
            cursor: "default",
            opacity: stage === "setup" ? 0.7 : 1,
          }}
        >
          <div className="zus-step-number">2</div>
          <div className="zus-step-content">
            <div className="zus-step-title">
              Krok 2: Wyniki kalkulacji, warianty i harmonogram
            </div>
            <div className="zus-step-desc">
              Porównanie 81,5% vs 100/70%, osie czasu, dokumenty i alerty
            </div>
          </div>
        </div>
      </div>

      {/* Widok aktywnego kroku */}
      {stage === "setup" ? (
        <SetupStep initialInput={input} onSubmit={showResults} />
      ) : (
        <ResultsView
          key={revision}
          input={input}
          onEdit={goToSetup}
          onLoadSample={showResults}
        />
      )}
    </div>
  );
}
