import { type Database, type SQLQueryBindings } from 'bun:sqlite'
import type { AccountBalanceSnapshot, BalanceSnapshotFilters } from '@/types'

type AccountBalanceSnapshotRow = {
  id: number
  account_id: number
  date: string
  amount: number
  currency: string
  note: string | null
  created_at: string
  updated_at: string
}

type SnapshotQueryParts = {
  whereClause: string
  params: SQLQueryBindings[]
}

function rowToAccountBalanceSnapshot(row: AccountBalanceSnapshotRow): AccountBalanceSnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    date: row.date,
    amount: row.amount,
    currency: row.currency,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildSnapshotQueryParts(filters: BalanceSnapshotFilters): SnapshotQueryParts {
  const conditions: string[] = []
  const params: SQLQueryBindings[] = []

  if (filters.accountId !== undefined) {
    conditions.push('account_id = ?')
    params.push(filters.accountId)
  }
  if (filters.from !== undefined) {
    conditions.push('date >= ?')
    params.push(filters.from)
  }
  if (filters.to !== undefined) {
    conditions.push('date <= ?')
    params.push(filters.to)
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  }
}

export function getBalanceSnapshotForDate(
  db: Database,
  accountId: number,
  date: string,
): AccountBalanceSnapshot | undefined {
  const row = db
    .prepare('SELECT * FROM account_balance_snapshots WHERE account_id = ? AND date = ?')
    .get(accountId, date) as AccountBalanceSnapshotRow | null

  if (row === null) return undefined
  return rowToAccountBalanceSnapshot(row)
}

export function getLatestBalanceSnapshotOnOrBefore(
  db: Database,
  accountId: number,
  date: string,
): AccountBalanceSnapshot | undefined {
  const row = db
    .prepare('SELECT * FROM account_balance_snapshots WHERE account_id = ? AND date <= ? ORDER BY date DESC LIMIT 1')
    .get(accountId, date) as AccountBalanceSnapshotRow | null

  if (row === null) return undefined
  return rowToAccountBalanceSnapshot(row)
}

export function getEarliestBalanceSnapshotOnOrAfter(
  db: Database,
  accountId: number,
  date: string,
): AccountBalanceSnapshot | undefined {
  const row = db
    .prepare('SELECT * FROM account_balance_snapshots WHERE account_id = ? AND date >= ? ORDER BY date ASC LIMIT 1')
    .get(accountId, date) as AccountBalanceSnapshotRow | null

  if (row === null) return undefined
  return rowToAccountBalanceSnapshot(row)
}

export function getBalanceSnapshots(db: Database, filters: BalanceSnapshotFilters = {}): AccountBalanceSnapshot[] {
  const { whereClause, params } = buildSnapshotQueryParts(filters)
  const sql = `SELECT * FROM account_balance_snapshots ${whereClause} ORDER BY account_id ASC, date ASC`.trim()
  const rows = db.prepare(sql).all(...params) as AccountBalanceSnapshotRow[]
  return rows.map(rowToAccountBalanceSnapshot)
}

export function hasBalanceSnapshotsForAccount(db: Database, accountId: number): boolean {
  const row = db
    .prepare('SELECT 1 AS found FROM account_balance_snapshots WHERE account_id = ? LIMIT 1')
    .get(accountId) as { found: number } | null

  return row !== null
}
