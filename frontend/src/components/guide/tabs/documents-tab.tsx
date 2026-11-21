import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import type { DocumentItem } from '@/lib/guide'
import { cn } from '@/lib/utils'

export function DocumentsTab({ documents }: { documents: DocumentItem[] }) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const toggle = (id: string, checked: boolean) =>
    setDone((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Dokumenty krok po kroku</h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {done.size} z {documents.length}
          </span>
        </div>
        <Progress value={(done.size / documents.length) * 100} aria-label="Postęp kompletowania dokumentów" />
      </div>

      <ol className="flex flex-col gap-3">
        {documents.map((doc, index) => {
          const checked = done.has(doc.id)
          return (
            <li key={doc.id}>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors',
                  checked ? 'border-primary/30 bg-success-muted' : 'bg-background hover:bg-muted/60',
                )}
              >
                <Checkbox checked={checked} onCheckedChange={(value) => toggle(doc.id, value)} className="mt-1" />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Krok {index + 1}</span>
                    {doc.code && (
                      <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
                        {doc.code}
                      </span>
                    )}
                  </span>
                  <span className={cn('text-base font-medium text-foreground', checked && 'line-through decoration-1')}>
                    {doc.title}
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{doc.description}</span>
                  <span className="text-xs font-medium text-muted-foreground">Kto: {doc.owner}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
