import { type Database } from 'bun:sqlite'
import { getAccountByKey } from '@/db/accounts/queries'
import { normalizeAccountKey } from '@/db/accounts/mutations'
import { currentCalendarDate, requireCalendarDate, requireDateRange } from '@/db/account_balance_snapshots/date'
import type { Account } from '@/types'

const BALANCE_AMOUNT_PATTERN = /^-?\d+(?:\.\d+)?$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/

export function parseBalanceAmount(value: string): number {
  const trimmedValue = value.trim()
  if (!BALANCE_AMOUNT_PATTERN.test(trimmedValue)) {
    throw new Error(`Invalid amount: "${value}". Use a decimal number.`)
  }

  return Number.parseFloat(trimmedValue)
}

export function normalizeCurrency(value: string | undefined): string {
  const currency = value?.trim() ?? 'EUR'
  if (CURRENCY_PATTERN.test(currency)) return currency
  throw new Error(`Invalid currency: "${value}". Use a 3-letter uppercase code.`)
}

export function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim()
  if (normalizedValue === undefined || normalizedValue.length === 0) return undefined
  return normalizedValue
}

export function resolveDateOption(value: string | undefined): string {
  return requireCalendarDate(value ?? currentCalendarDate(), 'date')
}

export function resolveDateRangeOptions(
  fromValue: string | undefined,
  toValue: string | undefined,
): { from: string; to: string } {
  const to = requireCalendarDate(toValue ?? currentCalendarDate(), 'to date')
  const from = requireCalendarDate(fromValue ?? to, 'from date')
  requireDateRange(from, to)
  return { from, to }
}

export function requireAccount(database: Database, key: string): Account {
  const normalizedKey = normalizeAccountKey(key)
  if (normalizedKey.length === 0) {
    throw new Error('Account key cannot be empty')
  }

  const account = getAccountByKey(database, normalizedKey)
  if (account !== undefined) return account
  throw new Error(`Unknown account key: ${normalizedKey}`)
}
