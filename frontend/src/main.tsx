import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppStateProvider } from '@/components/app-state'
import { AppShell } from '@/components/app-shell/app-shell'
import { GuideFlow } from '@/components/guide/guide-flow'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <TooltipProvider>
        <AppShell>
          <GuideFlow />
        </AppShell>
      </TooltipProvider>
    </AppStateProvider>
  </StrictMode>,
)
