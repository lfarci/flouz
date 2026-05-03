const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/

export function validateMonth(month: string): boolean {
  return MONTH_PATTERN.test(month)
}

export function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const STRICT_NUMERIC = /^\d+(\.\d+)?$/

export function parseAmount(value: string): number {
  const trimmed = value.trim()
  if (!STRICT_NUMERIC.test(trimmed)) {
    throw new Error(`Invalid amount: "${value}". Must be a positive number.`)
  }
  const amount = Number.parseFloat(trimmed)
  if (amount <= 0) {
    throw new Error(`Invalid amount: "${value}". Must be a positive number.`)
  }
  return amount
}
