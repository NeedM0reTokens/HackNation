import { ChevronDown, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sampleCases, type GuideInput } from '@/lib/guide'

export function SampleCasesMenu({ onSelect }: { onSelect: (input: GuideInput) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <FolderOpen className="size-4" aria-hidden="true" />
            Załaduj przykładową sprawę ZUS
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sprawy testowe</DropdownMenuLabel>
          {sampleCases.map((sample) => (
            <DropdownMenuItem key={sample.id} onClick={() => onSelect(sample.input)} className="flex-col items-start gap-0.5">
              <span className="font-medium text-foreground">{sample.label}</span>
              <span className="text-xs text-muted-foreground">{sample.description}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
