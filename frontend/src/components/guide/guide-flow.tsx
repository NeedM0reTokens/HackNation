import { useState } from 'react'
import { defaultGuideInput, type GuideInput } from '@/lib/guide'
import { SetupStep } from './setup-step'
import { ResultsView } from './results-view'

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

  if (stage === 'setup') {
    return <SetupStep initialInput={input} onSubmit={showResults} />
  }

  return <ResultsView key={revision} input={input} onEdit={() => setStage('setup')} onLoadSample={showResults} />
}
