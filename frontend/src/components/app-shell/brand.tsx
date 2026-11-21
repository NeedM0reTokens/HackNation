export function Brand() {
  return (
    <a href="/" className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tracking-tight text-primary-foreground"
      >
        ZUS
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">Zasiłkowy Przewodnik</span>
        <span className="text-xs text-muted-foreground">Przyszłego Rodzica</span>
      </span>
    </a>
  )
}
