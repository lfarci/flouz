import { type Database } from 'bun:sqlite'
import type { BalanceHistoryFilters, BalanceHistoryPoint, DerivedAccountBalance } from '@/types'
import { sumTransactionsForAccountAfterDateThroughDate } from '@/db/transactions/queries'
import {
  getEarliestBalanceSnapshotOnOrAfter,
  getLatestBalanceSnapshotOnOrBefore,
} from '@/db/account_balance_snapshots/queries'
import { nextCalendarDate, requireCalendarDate, requireDateRange } from './date'

export function getDerivedAccountBalance(db: Database, accountId: number, date: string): DerivedAccountBalance {
  const targetDate = requireCalendarDate(date, 'date')
  const latestSnapshot = getLatestBalanceSnapshotOnOrBefore(db, accountId, targetDate)

  if (latestSnapshot !== undefined) {
    return deriveFromPriorSnapshot(db, accountId, targetDate, latestSnapshot)
  }

  const futureSnapshot = getEarliestBalanceSnapshotOnOrAfter(db, accountId, targetDate)
  if (futureSnapshot !== undefined) {
    return deriveFromFutureSnapshot(db, accountId, targetDate, futureSnapshot)
  }

  throw new Error(`No balance snapshot found for account ${accountId}`)
}

export function getBalanceHistory(db: Database, filters: BalanceHistoryFilters): BalanceHistoryPoint[] {
  const from = requireCalendarDate(filters.from, 'from date')
  const to = requireCalendarDate(filters.to, 'to date')
  requireDateRange(from, to)

  const points: BalanceHistoryPoint[] = []
  for (let date = from; date <= to; date = nextCalendarDate(date)) {
    points.push(getDerivedAccountBalance(db, filters.accountId, date))
  }

  return points
}

function deriveFromPriorSnapshot(
  db: Database,
  accountId: number,
  date: string,
  snapshot: { amount: number; currency: string; date: string },
): DerivedAccountBalance {
  const transactionTotal = sumTransactionsForAccountAfterDateThroughDate(db, accountId, snapshot.date, date)
  const direction = snapshot.date === date ? 'exact' : 'forward'
  return toDerivedBalance(accountId, date, snapshot.amount + transactionTotal, snapshot, direction)
}

function deriveFromFutureSnapshot(
  db: Database,
  accountId: number,
  date: string,
  snapshot: { amount: number; currency: string; date: string },
): DerivedAccountBalance {
  const transactionTotal = sumTransactionsForAccountAfterDateThroughDate(db, accountId, date, snapshot.date)
  return toDerivedBalance(accountId, date, snapshot.amount - transactionTotal, snapshot, 'reverse')
}

function toDerivedBalance(
  accountId: number,
  date: string,
  amount: number,
  snapshot: { currency: string; date: string },
  direction: DerivedAccountBalance['direction'],
): DerivedAccountBalance {
  return {
    accountId,
    date,
    amount,
    currency: snapshot.currency,
    snapshotDate: snapshot.date,
    direction,
  }
}
