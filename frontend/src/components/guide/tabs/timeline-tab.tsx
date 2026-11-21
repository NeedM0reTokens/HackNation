import { CalendarPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { Milestone } from '@/lib/guide'
import { downloadIcs } from '@/lib/ics'
import { cn } from '@/lib/utils'

export function TimelineTab({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Twoje terminy</h2>
          <p className="text-sm text-muted-foreground">Daty liczone od {formatDate(milestones.find((m) => m.id === 'start' || m.id === 'birth')?.date ?? milestones[0].date)}.</p>
        </div>
        <Button onClick={() => downloadIcs(milestones)} className="gap-2">
          <CalendarPlus className="size-4" aria-hidden="true" />
          Pobierz przypomnienia do kalendarza (.ics)
        </Button>
      </div>

      <ol className="flex flex-col">
        {milestones.map((milestone, index) => {
          const isDeadline = milestone.kind === 'deadline'
          const isLast = index === milestones.length - 1
          return (
            <li key={milestone.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && <span aria-hidden="true" className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px bg-border" />}
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-card',
                  isDeadline ? 'border-destructive' : 'border-primary',
                )}
              >
                <span className={cn('size-2 rounded-full', isDeadline ? 'bg-destructive' : 'bg-primary')} />
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <time dateTime={milestone.date} className="text-sm font-semibold tabular-nums text-foreground">
                    {formatDate(milestone.date)}
                  </time>
                  {isDeadline && <Badge variant="destructive">Termin</Badge>}
                </div>
                <p className="text-base font-medium text-foreground">{milestone.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{milestone.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
