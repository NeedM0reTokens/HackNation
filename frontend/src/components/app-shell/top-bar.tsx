import { Leaf } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useAppState } from '@/components/app-state'
import { Brand } from './brand'
import { MObywatelButton } from './mobywatel-button'

export function TopBar() {
  const { calmMode, setCalmMode } = useAppState()
  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Brand />
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <Leaf className="size-4 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Tryb Spokojny</span>
            <span className="sr-only sm:hidden">Tryb Spokojny</span>
            <Switch checked={calmMode} onCheckedChange={setCalmMode} />
          </label>
          <MObywatelButton />
        </div>
      </div>
    </header>
  )
}
