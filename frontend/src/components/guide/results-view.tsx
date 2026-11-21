import { useMemo, useState } from 'react'
import { BookOpen, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  buildAlerts,
  buildDocuments,
  buildKnowledge,
  buildMilestones,
  calculate,
  defaultResultOptions,
  employmentLabels,
  hasLegalShield,
  qualify,
  roleLabels,
  type GuideInput,
} from '@/lib/guide'
import { formatPLN } from '@/lib/format'
import { QualificationBanner } from './qualification-banner'
import { KnowledgePanel } from './knowledge-panel'
import { SampleCasesMenu } from './sample-cases-menu'
import { SummaryTab } from './tabs/summary-tab'
import { TimelineTab } from './tabs/timeline-tab'
import { DocumentsTab } from './tabs/documents-tab'
import { AlertsTab } from './tabs/alerts-tab'

type TabId = 'summary' | 'timeline' | 'documents' | 'alerts'

export function ResultsView({
  input,
  onEdit,
  onLoadSample,
}: {
  input: GuideInput
  onEdit: () => void
  onLoadSample: (input: GuideInput) => void
}) {
  const [options, setOptions] = useState(defaultResultOptions)
  const [tab, setTab] = useState<TabId>('summary')

  const qualification = useMemo(() => qualify(input), [input])
  const calc = useMemo(() => calculate(input, options), [input, options])
  const milestones = useMemo(() => buildMilestones(input, calc), [input, calc])
  const documents = useMemo(() => buildDocuments(input), [input])
  const alerts = useMemo(() => buildAlerts(input), [input])
  const knowledge = useMemo(() => buildKnowledge(input), [input])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{roleLabels[input.role]}</span> · {employmentLabels[input.employment]} ·{' '}
          {formatPLN(input.grossSalary, true)} brutto
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SampleCasesMenu onSelect={onLoadSample} />
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden="true" />
            Zmień dane
          </Button>
        </div>
      </div>

      <QualificationBanner qualification={qualification} />

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="secondary" className="gap-2 self-start lg:hidden">
                  <BookOpen className="size-4" aria-hidden="true" />
                  Przewodnik dla Twojej sytuacji
                </Button>
              }
            />
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Przewodnik</SheetTitle>
                <SheetDescription>Wiedza dopasowana do Twoich wyborów.</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <KnowledgePanel cards={knowledge} />
              </div>
            </SheetContent>
          </Sheet>

          <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="gap-5">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <TabsList variant="line" className="w-max min-w-full justify-start border-b">
                <TabsTrigger value="summary" className="px-3">
                  <span className="sm:hidden">Kwota</span>
                  <span className="hidden sm:inline">Podsumowanie i Kwota</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="px-3">
                  <span className="sm:hidden">Terminy</span>
                  <span className="hidden sm:inline">Oś Czasu i Terminy</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="px-3">
                  <span className="sm:hidden">Dokumenty</span>
                  <span className="hidden sm:inline">Dokumenty i Kroki</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-2 px-3">
                  <span className="sm:hidden">Alerty</span>
                  <span className="hidden sm:inline">Alerty i Ochrona</span>
                  {alerts.length > 0 && (
                    <span
                      aria-label={`${alerts.length} alertów`}
                      className="flex size-5 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-white"
                    >
                      {alerts.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary">
              <SummaryTab
                qualification={qualification}
                calc={calc}
                options={options}
                onOptionsChange={setOptions}
                onShowAlerts={() => setTab('alerts')}
              />
            </TabsContent>
            <TabsContent value="timeline">
              <TimelineTab milestones={milestones} />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentsTab key={`${input.role}-${input.employment}`} documents={documents} />
            </TabsContent>
            <TabsContent value="alerts">
              <AlertsTab alerts={alerts} shielded={hasLegalShield(input)} />
            </TabsContent>
          </Tabs>
        </div>

        <aside aria-label="Przewodnik dla Twojej sytuacji" className="hidden lg:col-span-2 lg:block">
          <div className="sticky top-24">
            <KnowledgePanel cards={knowledge} />
          </div>
        </aside>
      </div>
    </div>
  )
}
