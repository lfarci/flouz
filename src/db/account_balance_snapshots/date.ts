const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function currentCalendarDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false

  const parsedDate = new Date(`${value}T00:00:00.000Z`)
  return parsedDate.toISOString().slice(0, 10) === value
}

export function requireCalendarDate(value: string, fieldName: string): string {
  const trimmedValue = value.trim()
  if (isCalendarDate(trimmedValue)) return trimmedValue
  throw new Error(`Invalid ${fieldName}: "${value}". Use YYYY-MM-DD.`)
}

export function requireDateRange(from: string, to: string): void {
  if (from <= to) return
  throw new Error(`Invalid date range: --from ${from} is after --to ${to}.`)
}

export function nextCalendarDate(value: string): string {
  const parsedDate = new Date(`${value}T00:00:00.000Z`)
  parsedDate.setUTCDate(parsedDate.getUTCDate() + 1)
  return parsedDate.toISOString().slice(0, 10)
}
