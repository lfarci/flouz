import { Database } from 'bun:sqlite'
import type { SQLQueryBindings } from 'bun:sqlite'
import type { Transaction, TransactionFilters } from '@/types'

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as number,
    date: row.date as string,
    amount: row.amount as number,
    counterparty: row.counterparty as string,
    hash: row.hash as string,
    counterpartyIban: (row.counterparty_iban as string | null) ?? undefined,
    currency: row.currency as string,
    account: (row.account as string | null) ?? undefined,
    categoryId: (row.category_id as string | null) ?? undefined,
    note: (row.note as string | null) ?? undefined,
    sourceFile: (row.source_file as string | null) ?? undefined,
    importedAt: row.imported_at as string,
  }
}

export function getTransactions(db: Database, filters: TransactionFilters = {}): Transaction[] {
  const conditions: string[] = []
  const params: SQLQueryBindings[] = []

  if (filters.from !== undefined) {
    conditions.push('date >= ?')
    params.push(filters.from)
  }
  if (filters.to !== undefined) {
    conditions.push('date <= ?')
    params.push(filters.to)
  }
  if (filters.categoryId !== undefined) {
    conditions.push('category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.search !== undefined) {
    conditions.push('counterparty LIKE ?')
    params.push(`%${filters.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = filters.limit !== undefined ? 'LIMIT ?' : ''

  if (filters.limit !== undefined) {
    params.push(filters.limit)
  }

  const sql = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC ${limitClause}`.trim()
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
  return rows.map(rowToTransaction)
}

export function getUncategorized(db: Database): Transaction[] {
  const rows = db.prepare(
    'SELECT * FROM transactions WHERE category_id IS NULL ORDER BY date DESC'
  ).all() as Record<string, unknown>[]
  return rows.map(rowToTransaction)
}