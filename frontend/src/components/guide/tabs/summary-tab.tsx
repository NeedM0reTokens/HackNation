import { ArrowRight, CalendarRange, Wallet } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatPLN, pluralWeeks } from '@/lib/format'
import type { Calculation, PaymentVariant, Qualification, ResultOptions } from '@/lib/guide'
import { SegmentedControl } from '../segmented-control'

const variantOptions: { value: PaymentVariant; label: string; hint: string }[] = [
  { value: 'standard', label: '100% + 70%', hint: 'Więcej na start' },
  { value: 'single', label: '81,5%', hint: 'Wniosek do 21 dni' },
]

function formatWeeks(weeks: number) {
  const rounded = Math.round(weeks * 10) / 10
  return `${String(rounded).replace('.', ',')} ${pluralWeeks(rounded)}`
}

export function SummaryTab({
  qualification,
  calc,
  options,
  onOptionsChange,
  onShowAlerts,
}: {
  qualification: Qualification
  calc: Calculation
  options: ResultOptions
  onOptionsChange: (options: ResultOptions) => void
  onShowAlerts: () => void
}) {
  if (!qualification.eligible) {
    return (
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Co możesz zrobić teraz?</h2>
        <ol className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <li>1. Sprawdź w eZUS (PUE), od kiedy podlegasz ubezpieczeniu chorobowemu.</li>
          <li>2. Jeśli go nie masz – zgłoś się do dobrowolnego ubezpieczenia chorobowego.</li>
          <li>3. Umów bezpłatną konsultację w placówce ZUS lub zapytaj asystenta AI.</li>
        </ol>
        <Button variant="outline" onClick={onShowAlerts} className="gap-2 self-start">
          Zobacz alerty i ochronę prawną
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="size-4 text-primary" aria-hidden="true" />
            Kwota miesięcznie
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {formatPLN(calc.monthlyNet, true)}
            </span>
            <span className="text-sm text-muted-foreground">netto · {formatPLN(calc.monthlyGross, true)} brutto</span>
          </div>
          {calc.followUpMonthlyGross !== null && (
            <span className="text-xs text-muted-foreground">
              Potem {formatPLN(calc.followUpMonthlyGross, true)} brutto / mies.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarRange className="size-4 text-primary" aria-hidden="true" />
            Łączny czas
          </span>
          <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{formatWeeks(calc.totalWeeks)}</span>
          <span className="text-xs text-muted-foreground">Płatnego urlopu z ZUS</span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <span className="text-sm font-medium text-muted-foreground">Wariant wypłaty</span>
          {calc.variantAvailable ? (
            <SegmentedControl
              label="Wariant wypłaty"
              value={options.variant}
              onChange={(variant) => onOptionsChange({ ...options, variant })}
              options={variantOptions}
            />
          ) : (
            <>
              <span className="text-3xl font-bold tracking-tight text-foreground">100% → 70%</span>
              <span className="text-xs text-muted-foreground">Ojcowski 100%, rodzicielski taty 70%</span>
            </>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Łączę rodzicielski z pracą na 1/2 etatu</span>
          <span className="text-sm text-muted-foreground">Zasiłek maleje o połowę, urlop wydłuża się dwukrotnie.</span>
        </span>
        <Switch checked={options.partTime} onCheckedChange={(partTime) => onOptionsChange({ ...options, partTime })} />
      </label>

      <Accordion data-legal className="rounded-2xl border bg-card px-5">
        <AccordionItem value="details">
          <AccordionTrigger className="py-4">Zobacz szczegółowe wyliczenia</AccordionTrigger>
          <AccordionContent>
            <dl className="flex flex-col divide-y pb-2 text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">Podstawa wymiaru (brutto − 13,71%)</dt>
                <dd className="font-medium tabular-nums text-foreground">{formatPLN(calc.assessmentBase)}</dd>
              </div>
              {calc.phases.map((phase) => (
                <div key={phase.id} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">
                    {phase.label}
                    <span className="block text-xs">
                      {formatWeeks(phase.weeks)} · {String(phase.ratePercent).replace('.', ',')}%
                    </span>
                  </dt>
                  <dd className="font-medium tabular-nums text-foreground">{formatPLN(phase.monthlyGross)} / mies.</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="font-medium text-foreground">Łącznie (brutto, szacunkowo)</dt>
                <dd className="font-semibold tabular-nums text-foreground">{formatPLN(calc.totalGross, true)}</dd>
              </div>
            </dl>
            <p className="pb-3 text-xs text-muted-foreground">
              Kwota netto uwzględnia zaliczkę na PIT 12%. Wyliczenie ma charakter orientacyjny.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
