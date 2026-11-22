import { useState } from 'react'
import { defaultGuideInput, type GuideInput } from '@/lib/guide'
import { SetupStep } from './setup-step'
import { ResultsView } from './results-view'
import { CheckCircle2, ChevronRight } from 'lucide-react'

export function GuideFlow() {
  const [input, setInput] = useState<GuideInput>(defaultGuideInput)
  const [stage, setStage] = useState<'setup' | 'results'>('setup')
  const [revision, setRevision] = useState(0)

  const showResults = (next: GuideInput) => {
    setInput(next)
    setRevision((current) => current + 1)
    setStage('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToSetup = () => {
    setStage('setup')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canGoToResults = Boolean(input.dueDate) && input.grossSalary > 0

  return (
    <div className="zus-guide-flow" style={{ width: '100%' }}>
      {/* Pasek postępu (ZUS Wizard Stepper) */}
      <nav aria-label="Kroki kalkulatora" className="zus-stepper-bar">
        <button
          type="button"
          onClick={goToSetup}
          className={`zus-step-item ${stage === 'setup' ? 'active' : 'completed'}`}
          title="Krok 1: Wprowadzenie danych i weryfikacja"
        >
          <div className="zus-step-number">
            {stage === 'results' ? <CheckCircle2 className="size-4 text-[#007834]" /> : '1'}
          </div>
          <div className="zus-step-content">
            <div className="zus-step-title">Krok 1: Wprowadzenie danych i weryfikacja uprawnień</div>
            <div className="zus-step-desc">Rola wnioskodawcy, forma zatrudnienia, staż i wynagrodzenie</div>
          </div>
        </button>

        <div className="zus-step-separator" aria-hidden="true">
          <ChevronRight className="size-5" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (stage === 'setup' && canGoToResults) {
              showResults(input)
            }
          }}
          disabled={!canGoToResults && stage === 'setup'}
          className={`zus-step-item ${stage === 'results' ? 'active' : ''}`}
          style={{
            cursor: canGoToResults || stage === 'results' ? 'pointer' : 'not-allowed',
            opacity: !canGoToResults && stage === 'setup' ? 0.6 : 1,
          }}
          title={canGoToResults ? 'Przejdź do wyników' : 'Wypełnij najpierw dane w Kroku 1'}
        >
          <div className="zus-step-number">2</div>
          <div className="zus-step-content">
            <div className="zus-step-title">Krok 2: Wyniki kalkulacji, warianty i harmonogram</div>
            <div className="zus-step-desc">Porównanie 81,5% vs 100/70%, osie czasu, dokumenty i alerty</div>
          </div>
        </button>
      </nav>

      {/* Widok aktywnego kroku */}
      {stage === 'setup' ? (
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
  )
}
