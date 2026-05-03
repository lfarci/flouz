import { type Database, type SQLQueryBindings } from 'bun:sqlite'
import type { Transaction, TransactionFilters, CategorizeTransactionsFilters } from '@/types'

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as number,
    date: row.date as string,
    amount: row.amount as number,
    counterparty: row.counterparty as string,
    hash: row.hash as string,
    counterpartyIban: (row.counterparty_iban as string | null) ?? undefined,
    currency: row.currency as string,
    accountId: (row.account_id as number | null) ?? undefined,
    categoryId: (row.category_id as string | null) ?? undefined,
    bankCommunication: (row.bank_communication as string | null) ?? undefined,
    sourceFile: (row.source_file as string | null) ?? undefined,
    importedAt: row.imported_at as string,
    comment: (row.comment as string | null) ?? undefined,
  }
}

interface FilterQueryParts {
  whereClause: string
  params: SQLQueryBindings[]
}

function buildFilterQueryParts(filters: TransactionFilters): FilterQueryParts {
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
  if (filters.categoryIds !== undefined && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(', ')
    conditions.push(`category_id IN (${placeholders})`)
    params.push(...filters.categoryIds)
  }
  if (filters.search !== undefined) {
    conditions.push('counterparty LIKE ?')
    params.push(`%${filters.search}%`)
  }
  if (filters.uncategorized === true) {
    conditions.push('category_id IS NULL')
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  }
}

export function getTransactions(db: Database, filters: TransactionFilters = {}): Transaction[] {
  const { whereClause, params } = buildFilterQueryParts(filters)
  const limitClause = filters.limit !== undefined ? 'LIMIT ?' : ''

  if (filters.limit !== undefined) {
    params.push(filters.limit)
  }

  const sql = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC ${limitClause}`.trim()
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
  return rows.map(rowToTransaction)
}

export function countTransactions(db: Database, filters: TransactionFilters = {}): number {
  const { whereClause, params } = buildFilterQueryParts(filters)
  const sql = `SELECT COUNT(*) AS count FROM transactions ${whereClause}`.trim()
  const row = db.prepare(sql).get(...params) as { count: number }
  return row.count
}

export function getUncategorized(db: Database): Transaction[] {
  const rows = db.prepare('SELECT * FROM transactions WHERE category_id IS NULL ORDER BY date DESC').all() as Record<
    string,
    unknown
  >[]
  return rows.map(rowToTransaction)
}

export function getTransactionById(db: Database, id: number): Transaction | undefined {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, unknown> | null
  if (row === null) return undefined
  return rowToTransaction(row)
}

function monthDateRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
  const nextYear = monthNumber === 12 ? year + 1 : year
  return {
    startDate: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    endDate: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}

export function sumExpensesForCategories(db: Database, categoryIds: string[], month: string): number {
  if (categoryIds.length === 0) return 0
  const placeholders = categoryIds.map(() => '?').join(', ')
  const { startDate, endDate } = monthDateRange(month)
  const row = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE amount < 0
      AND date >= ?
      AND date < ?
      AND category_id IN (${placeholders})
  `,
    )
    .get(startDate, endDate, ...categoryIds) as { total: number }
  return row.total
}

export function hasTransactionsForAccount(db: Database, accountId: number): boolean {
  const row = db.prepare('SELECT 1 AS found FROM transactions WHERE account_id = ? LIMIT 1').get(accountId) as {
    found: number
  } | null

  return row !== null
}

export function getTransactionsEligibleForCategorization(
  db: Database,
  filters: CategorizeTransactionsFilters = {},
): Transaction[] {
  const conditions: string[] = []
  const params: SQLQueryBindings[] = []

  if (!filters.override) {
    conditions.push('category_id IS NULL')
    conditions.push('id NOT IN (SELECT transaction_id FROM transaction_category_suggestions)')
  }

  if (filters.from !== undefined) {
    conditions.push('date >= ?')
    params.push(filters.from)
  }
  if (filters.to !== undefined) {
    conditions.push('date <= ?')
    params.push(filters.to)
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
