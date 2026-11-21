import { Sparkles } from 'lucide-react'
import { useAppState } from '@/components/app-state'

export function AssistantFab() {
  const { assistantOpen, setAssistantOpen } = useAppState()
  if (assistantOpen) return null
  return (
    <button
      type="button"
      onClick={() => setAssistantOpen(true)}
      className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Sparkles className="size-4" aria-hidden="true" />
      Zapytaj asystenta AI
    </button>
  )
}
