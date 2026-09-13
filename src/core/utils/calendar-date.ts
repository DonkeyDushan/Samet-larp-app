import { APP_TIME_ZONE } from '@/locales/app-locale'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` naming a real day — `2026-02-30` is refused. */
export const isCalendarDate = (value: string): boolean => {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false

  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0))

  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

/** Swedish formatting is exactly `YYYY-MM-DD`. */
const isoDateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: APP_TIME_ZONE })

/** Today where the game is played, not in the server's UTC. */
export const todayIsoDate = (now: Date = new Date()): string => isoDateFormat.format(now)
