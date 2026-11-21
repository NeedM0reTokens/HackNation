import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getExplanation } from '@/lib/api-client'
import { useAppState } from '@/components/app-state'
import type { Explanation } from '@/lib/types'

export function ExplainSparkle({ topicId, label }: { topicId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Explanation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { explainTopic } = useAppState()

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen && !data) {
      setIsLoading(true)
      try {
        const result = await getExplanation(topicId)
        setData(result)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={`Wyjaśnij: ${label}`}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-primary transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 align-middle"
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Wyjaśnienie AI
        </div>
        {isLoading || !data ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Upraszczam przepisy…
          </div>
        ) : (
          <div className="mt-1 flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{data.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                explainTopic(topicId, data.title)
              }}
              className="self-start text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Zapytaj asystenta o więcej
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
