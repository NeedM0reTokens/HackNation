import { useRef, useState } from 'react'
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAppState } from '@/components/app-state'

const suggestions = ['Czym jest podstawa wymiaru?', 'Wariant 81,5% czy 100% + 70%?', 'Ile tygodni przysługuje tacie?']

export function AssistantPanel() {
  const { assistantOpen, setAssistantOpen, messages, assistantPending, sendMessage } = useAppState()
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const submit = async () => {
    const text = draft.trim()
    if (!text || assistantPending) return
    setDraft('')
    await sendMessage(text)
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            Asystent AI ZUS
          </SheetTitle>
          <SheetDescription>
            Odpowiedzi mają charakter informacyjny i nie są decyzją ZUS.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
          <ul className="flex flex-col gap-3">
            {messages.map((message) => (
              <li key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border bg-card text-card-foreground',
                  )}
                >
                  <p>{message.content}</p>
                  {message.details && message.details.length > 0 && (
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-muted-foreground">
                      {message.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
            {assistantPending && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Asystent przygotowuje odpowiedź…
              </li>
            )}
          </ul>
          <div ref={endRef} />
        </div>

        <div className="border-t p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={assistantPending}
                onClick={() => sendMessage(suggestion)}
                className="rounded-full border bg-muted px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Twoje pytanie
            </label>
            <Textarea
              id="assistant-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="Zapytaj o zasiłki…"
              rows={2}
              className="min-h-0 resize-none"
            />
            <Button type="submit" size="icon-lg" disabled={!draft.trim() || assistantPending} aria-label="Wyślij pytanie">
              <SendHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
