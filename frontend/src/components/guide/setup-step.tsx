import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { waitingPeriodDays, type Employment, type GuideInput, type Role } from '@/lib/guide'
import { SegmentedControl } from './segmented-control'
import { SampleCasesMenu } from './sample-cases-menu'

const roleOptions: { value: Role; label: string }[] = [
  { value: 'mother', label: 'Matka' },
  { value: 'father', label: 'Ojciec' },
  { value: 'guardian', label: 'Opiekun (Adopcja / Rodzina zastępcza)' },
]

const employmentOptions: { value: Employment; label: string }[] = [
  { value: 'uop', label: 'Umowa o pracę' },
  { value: 'zlecenie', label: 'Zlecenie' },
  { value: 'jdg', label: 'JDG' },
]

export function SetupStep({
  initialInput,
  onSubmit,
}: {
  initialInput: GuideInput
  onSubmit: (input: GuideInput) => void
}) {
  const [input, setInput] = useState(initialInput)
  const update = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }))

  const isEmployee = input.employment === 'uop'
  const canSubmit = Boolean(input.dueDate) && input.grossSalary > 0

  return (
    <section aria-labelledby="setup-title" className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Krok 1 z 2</p>
        <h1 id="setup-title" className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Sprawdź, czy masz prawo do zasiłku
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">
          Odpowiedz na kilka pytań. Pokażemy tylko to, co dotyczy Twojej sytuacji.
        </p>
      </div>

      <form
        className="flex flex-col gap-7 rounded-2xl border bg-card p-5 shadow-sm sm:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onSubmit(input)
        }}
      >
        <div className="-mb-3 -mt-2 flex justify-end">
          <SampleCasesMenu onSelect={onSubmit} />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-foreground">Kim jesteś?</legend>
          <SegmentedControl label="Rola" value={input.role} onChange={(role) => update('role', role)} options={roleOptions} />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-foreground">Forma zatrudnienia</legend>
          <SegmentedControl
            label="Forma zatrudnienia"
            value={input.employment}
            onChange={(employment) => update('employment', employment)}
            options={employmentOptions}
          />
          {isEmployee ? (
            <p className="text-sm text-muted-foreground">Na etacie ubezpieczenie chorobowe jest obowiązkowe.</p>
          ) : (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-background p-4">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Opłacam dobrowolne ubezpieczenie chorobowe</span>
                <span className="text-sm text-muted-foreground">Składka 2,45% – bez niej nie ma zasiłku.</span>
              </span>
              <Switch
                checked={input.sicknessInsurance}
                onCheckedChange={(checked) => update('sicknessInsurance', checked)}
              />
            </label>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="insured-days">Staż ubezpieczenia (dni)</Label>
            <Input
              id="insured-days"
              type="number"
              inputMode="numeric"
              min={0}
              className="h-11"
              value={input.insuredDays || ''}
              onChange={(event) => update('insuredDays', Number(event.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Wymagane minimum: {waitingPeriodDays(input.employment)} dni</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="due-date">{input.role === 'guardian' ? 'Data przyjęcia dziecka' : 'Planowana data porodu'}</Label>
            <Input
              id="due-date"
              type="date"
              required
              className="h-11"
              value={input.dueDate}
              onChange={(event) => update('dueDate', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="gross">
              {input.employment === 'jdg' ? 'Zadeklarowana podstawa składek (zł)' : 'Średnie wynagrodzenie brutto (zł / mies.)'}
            </Label>
            <Input
              id="gross"
              type="number"
              inputMode="decimal"
              min={0}
              step={100}
              required
              className="h-11"
              value={input.grossSalary || ''}
              onChange={(event) => update('grossSalary', Number(event.target.value) || 0)}
            />
          </div>
        </div>

        <Accordion className="rounded-xl border px-4">
          <AccordionItem value="optional">
            <AccordionTrigger className="py-3.5">Sytuacje dodatkowe (opcjonalnie)</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3 pb-2">
                {input.role === 'mother' && (
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={input.premature}
                      onCheckedChange={(checked) => update('premature', checked)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground">Dziecko urodzi się / urodziło jako wcześniak</span>
                  </label>
                )}
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={input.zaZyciem}
                    onCheckedChange={(checked) => update('zaZyciem', checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">Mam zaświadczenie „Za życiem"</span>
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 gap-2 text-base">
          Oblicz uprawnienia i zasiłek
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  )
}
