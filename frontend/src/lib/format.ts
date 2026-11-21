const plnFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 2,
})

const plnRoundFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatPLN(value: number, round = false) {
  return (round ? plnRoundFormatter : plnFormatter).format(value)
}

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function formatShortDate(iso: string) {
  return shortDateFormatter.format(new Date(iso))
}

export function addWeeks(iso: string, weeks: number) {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + Math.round(weeks * 7))
  return date.toISOString().slice(0, 10)
}

export function pluralWeeks(n: number) {
  const abs = Math.abs(Math.round(n))
  if (abs === 1) return 'tydzień'
  const lastDigit = abs % 10
  const lastTwo = abs % 100
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'tygodnie'
  return 'tygodni'
}
