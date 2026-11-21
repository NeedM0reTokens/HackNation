export type DataSource = 'pue' | 'manual'

export type InsuredUser = {
  firstName: string
  lastName: string
  peselMasked: string
}

export type InsuranceStatus = {
  active: boolean
  kind: 'obowiązkowe' | 'dobrowolne'
  title: string
  since: string
  payer: string
  waitingPeriodDays: number
  insuredDaysContinuous: number
}

export type ContributionDebt = {
  amount: number
  period: string
  dueDate: string
  lastPaymentDate: string
  items: { label: string; amount: number }[]
}

export type EZlaCertificate = {
  id: string
  from: string
  to: string
  days: number
  code: string | null
  codeLabel: string
  doctor: string
  status: 'Przyjęte' | 'W weryfikacji' | 'Wypłacone'
  benefitRate: number
}

export type RiskSeverity = 'high' | 'medium' | 'info'

export type RiskAlert = {
  id: string
  severity: RiskSeverity
  title: string
  description: string
  topicId: string
}

export type TimelinePhase = {
  id: string
  label: string
  start: string
  end: string
  tone: 'pregnancy' | 'maternity' | 'parental' | 'father' | 'return'
}

export type DashboardData = {
  source: DataSource
  syncedAt: string | null
  insurance: InsuranceStatus
  debt: ContributionDebt | null
  ezla: EZlaCertificate[]
  alerts: RiskAlert[]
  timeline: TimelinePhase[]
}

export type Explanation = {
  id: string
  title: string
  summary: string
  details: string[]
  legalBasis?: string
}

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  details?: string[]
}
