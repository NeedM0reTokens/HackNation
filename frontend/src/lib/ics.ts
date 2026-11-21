import type { Milestone } from './guide'

function toIcsDate(iso: string) {
  return iso.replaceAll('-', '')
}

function escapeText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function nextDay(iso: string) {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function buildIcs(milestones: Milestone[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const events = milestones.flatMap((milestone) => [
    'BEGIN:VEVENT',
    `UID:${milestone.id}-${milestone.date}@zasilkowy-przewodnik`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(milestone.date)}`,
    `DTEND;VALUE=DATE:${toIcsDate(nextDay(milestone.date))}`,
    `SUMMARY:${escapeText(milestone.title)}`,
    `DESCRIPTION:${escapeText(milestone.description)}`,
    ...(milestone.kind === 'deadline'
      ? ['BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(milestone.title)}`, 'END:VALARM']
      : []),
    'END:VEVENT',
  ])
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZUS//Zasilkowy Przewodnik//PL', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join(
    '\r\n',
  )
}

export function downloadIcs(milestones: Milestone[], filename = 'zasilki-terminy.ics') {
  const blob = new Blob([buildIcs(milestones)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
