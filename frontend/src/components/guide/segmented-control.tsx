import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string; hint?: string }

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const selected = next[0] as T | undefined
        if (selected) onChange(selected)
      }}
      spacing={0}
      className={cn('grid w-full auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1', className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-transparent hover:text-foreground data-[pressed]:bg-card data-[pressed]:text-foreground data-[pressed]:shadow-sm"
        >
          <span className="text-balance text-center leading-tight">{option.label}</span>
          {option.hint && <span className="text-center text-xs font-normal text-muted-foreground">{option.hint}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
