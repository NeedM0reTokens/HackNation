import { AssistantPanel } from '@/components/assistant/assistant-panel'
import { TopBar } from './top-bar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="flex-1 px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        {children}
      </main>
      <AssistantPanel />
    </div>
  )
}
