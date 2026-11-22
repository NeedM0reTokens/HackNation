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
  assistantOpen: boolean
  setAssistantOpen: (open: boolean) => void
  messages: AssistantMessage[]
  assistantPending: boolean
  explainTopic: (topicId: string, title: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
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

  const explainTopic = useCallback(
    (topicId: string, title: string) => runAssistant(`Wyjaśnij po ludzku: ${title}`, () => getExplanation(topicId)),
    [runAssistant],
  )

  const sendMessage = useCallback(
    (text: string) => {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
      return runAssistant(text, () => askAssistantApi(text, history))
    },
    [runAssistant, messages],
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
