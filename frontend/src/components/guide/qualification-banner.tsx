import { ShieldCheck, TriangleAlert } from 'lucide-react'
import type { Qualification } from '@/lib/guide'
import { cn } from '@/lib/utils'

export function QualificationBanner({ qualification }: { qualification: Qualification }) {
  const Icon = qualification.eligible ? ShieldCheck : TriangleAlert
  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8',
        qualification.eligible ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white',
      )}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-balance text-2xl font-bold uppercase tracking-tight sm:text-3xl">{qualification.headline}</h1>
        <p className="text-pretty text-base leading-relaxed opacity-95">{qualification.reason}</p>
      </div>
    </section>
  )
}
