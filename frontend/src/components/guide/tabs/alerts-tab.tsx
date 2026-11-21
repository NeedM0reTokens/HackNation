import { CircleCheck, Flag, ShieldCheck, ShieldOff } from 'lucide-react'
import type { RiskAlert } from '@/lib/guide'
import { DifficultSituationsDialog } from '../difficult-situations-dialog'

export function AlertsTab({ alerts, shielded }: { alerts: RiskAlert[]; shielded: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="red-flags" className="flex flex-col gap-3">
        <h2 id="red-flags" className="text-lg font-semibold text-foreground">
          Czerwone flagi
        </h2>
        {alerts.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nie wykryliśmy ryzyk w Twojej sytuacji.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className="flex items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive text-white">
                <Flag className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-destructive">{alert.title}</h3>
                <p className="text-sm leading-relaxed text-foreground/80">{alert.description}</p>
              </div>
            </article>
          ))
        )}
      </section>

      {shielded ? (
        <article className="flex items-start gap-4 rounded-2xl border border-primary/30 bg-success-muted p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-accent-foreground">Twoja Tarcza Ochronna</h3>
            <ul className="flex flex-col gap-1 text-sm leading-relaxed text-foreground/80">
              <li>Pracodawca nie może wypowiedzieć ani rozwiązać umowy w ciąży i na urlopie.</li>
              <li>Umowa na czas określony przedłuża się do dnia porodu (po 3. miesiącu ciąży).</li>
            </ul>
            <p data-legal className="text-xs text-muted-foreground">Podstawa prawna: art. 177 Kodeksu pracy.</p>
          </div>
        </article>
      ) : (
        <article className="flex items-start gap-4 rounded-2xl border border-warning/40 bg-warning-muted p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning text-foreground">
            <ShieldOff className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-warning-foreground">Ochrona etatowa Cię nie obejmuje</h3>
            <p className="text-sm leading-relaxed text-foreground/80">
              Przy JDG i umowie zlecenie nie działa zakaz zwolnienia ani przedłużenie umowy do porodu. Zadbaj o ciągłość
              ubezpieczenia samodzielnie.
            </p>
          </div>
        </article>
      )}

      <DifficultSituationsDialog />
    </div>
  )
}
