import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { askAssistantApi, getExplanation, loginWithMObywatel } from '@/lib/api-client'
import type { AssistantMessage, DataSource, Explanation, InsuredUser } from '@/lib/types'

type AppState = {
  user: InsuredUser | null
  isLoggingIn: boolean
  login: (pesel?: string) => Promise<void>
  logout: () => void
  isMockSelectorOpen: boolean
  openMockSelector: () => void
  closeMockSelector: () => void
  dataSource: DataSource
  setDataSource: (source: DataSource) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  assistantOpen: boolean
  setAssistantOpen: (open: boolean) => void
  messages: AssistantMessage[]
  assistantPending: boolean
  explainTopic: (
    topicId: string,
    title: string,
    topicContext?: {
      summary?: string
      details?: string[]
      legalBasis?: string
    },
  ) => Promise<void>
  sendMessage: (text: string, contextOverride?: Record<string, any>) => Promise<void>
  calmMode: boolean
  setCalmMode: (calm: boolean) => void
}

const AppStateContext = createContext<AppState | null>(null)

const welcomeMessage: AssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Cześć! Jestem asystentem ZUS. Wyjaśnię prostym językiem zasady zasiłków dla rodziców. Zapytaj np. o podstawę wymiaru, wariant 81,5% albo urlop dla taty.',
}

let messageCounter = 0
const nextId = () => `msg-${++messageCounter}`

function toAssistantMessage(explanation: Explanation): AssistantMessage {
  return {
    id: nextId(),
    role: 'assistant',
    content: explanation.summary,
    details: explanation.legalBasis
      ? [...explanation.details, `Podstawa prawna: ${explanation.legalBasis}`]
      : explanation.details,
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<InsuredUser | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isMockSelectorOpen, setIsMockSelectorOpen] = useState(false)
  const [dataSource, setDataSource] = useState<DataSource>('pue')
  const [activeTab, setActiveTab] = useState<string>('start')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([welcomeMessage])
  const [assistantPending, setAssistantPending] = useState(false)
  const [calmMode, setCalmMode] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('calm', calmMode)
  }, [calmMode])

  const openMockSelector = useCallback(() => {
    setIsMockSelectorOpen(true)
  }, [])

  const closeMockSelector = useCallback(() => {
    setIsMockSelectorOpen(false)
  }, [])

  const login = useCallback(async (pesel: string = '92011501234') => {
    setIsLoggingIn(true)
    try {
      const { user: loggedUser } = await loginWithMObywatel(pesel)
      setUser(loggedUser)
      setIsMockSelectorOpen(false)
    } finally {
      setIsLoggingIn(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const runAssistant = useCallback(async (userText: string, load: () => Promise<Explanation>) => {
    setAssistantOpen(true)
    setMessages((current) => [...current, { id: nextId(), role: 'user', content: userText }])
    setAssistantPending(true)
    try {
      const explanation = await load()
      setMessages((current) => [...current, toAssistantMessage(explanation)])
    } catch {
      setMessages((current) => [        ...current,
        { id: nextId(), role: 'assistant', content: 'Nie udało się pobrać odpowiedzi. Spróbuj ponownie za chwilę.' },
      ])
    } finally {
      setAssistantPending(false)
    }
  }, [])

  const sendMessage = useCallback(
    (text: string, contextOverride?: Record<string, any>) => {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
      const tabNames: Record<string, string> = {
        start: 'Katalog świadczeń ZUS (Strona główna)',
        kalkulator: 'Zintegrowany Kalkulator Zasiłkowy (Macierzyński / Rodzicielski)',
        chorobowy: 'Zasiłek chorobowy w ciąży (kod B i e-ZLA)',
        macierzynski: 'Urlopy dla ojca (ojcowski 14 dni, rodzicielski 9 tyg., transfer)',
        wnioski: 'Wnioski, terminy i prawa pracownicze (Z-3, 21 dni na 81,5%)',
        'trudne-sytuacje': 'Sytuacje szczególne (Wcześniak, Za życiem, Strata dziecka)',
        'strefa-pdf': 'Strefa Testowa PDF (Analiza pism i decyzji ZUS)',
        admin: 'Panel Administratora ZUS',
      }
      const userContext = {
        active_tab: activeTab,
        tab_name: tabNames[activeTab] || activeTab,
        is_logged_in: Boolean(user),
        user_name: user ? `${user.firstName} ${user.lastName}` : null,
        ...contextOverride,
      }
      return runAssistant(text, () => askAssistantApi(text, history, userContext))
    },
    [runAssistant, messages, activeTab, user],
  )

  const explainTopic = useCallback(
    (
      topicId: string,
      title: string,
      topicContext?: {
        summary?: string
        details?: string[]
        legalBasis?: string
      },
    ) => {
      const legalRef = topicContext?.legalBasis ? `\nPodstawa prawna: ${topicContext.legalBasis}` : ''
      const summaryRef = topicContext?.summary ? `\nWstępne ustalenia: ${topicContext.summary}` : ''
      const rulesRef = topicContext?.details?.length
        ? `\nKluczowe wymogi i zasady:\n• ${topicContext.details.join('\n• ')}`
        : ''

      const prompt = `Dopytuję o zagadnienie ZUS: "${title}" (kod: ${topicId}).${legalRef}${summaryRef}${rulesRef}

Proszę o kompleksowe wyjaśnienie w kontekście przepisów ZUS 2026:
1. Jak w praktyce ZUS i pracodawca rozliczają to świadczenie lub weryfikują to uprawnienie?
2. Jakie bezwzględne terminy, procedury i dokumenty (np. Z-3, Z-3a, ZAM, oświadczenia) obowiązują wnioskodawcę?
3. Jakie są potencjalne pułapki prawne, ryzyka kontroli i jak się przed nimi zabezpieczyć?`

      return sendMessage(prompt, {
        requested_topic: topicId,
        requested_title: title,
        topic_legal_basis: topicContext?.legalBasis || null,
        topic_summary: topicContext?.summary || null,
        topic_rules: topicContext?.details || [],
        user_status: user
          ? {
              pesel: user.pesel || user.peselMasked,
              name: `${user.firstName} ${user.lastName}`,
              role: user.role,
              simulation: user.simulation,
            }
          : null,
      })
    },
    [sendMessage, user],
  )

  const value = useMemo<AppState>(
    () => ({
      user,
      isLoggingIn,
      login,
      logout,
      isMockSelectorOpen,
      openMockSelector,
      closeMockSelector,
      dataSource,
      setDataSource,
      activeTab,
      setActiveTab,
      assistantOpen,
      setAssistantOpen,
      messages,
      assistantPending,
      explainTopic,
      sendMessage,
      calmMode,
      setCalmMode,
    }),
    [
      user,
      isLoggingIn,
      login,
      logout,
      isMockSelectorOpen,
      openMockSelector,
      closeMockSelector,
      dataSource,
      assistantOpen,
      messages,
      assistantPending,
      explainTopic,
      sendMessage,
      calmMode,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState musi być użyty wewnątrz AppStateProvider')
  return context
}
