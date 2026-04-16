import { type Database, type SQLQueryBindings } from 'bun:sqlite'
import type { SuggestionFilters, SuggestionWithContext, TransactionCategorySuggestionStatus } from '@/types'

export function getSuggestedTransactionIds(db: Database): number[] {
  const rows = db.prepare('SELECT transaction_id FROM transaction_category_suggestions').all() as {
    transaction_id: number
  }[]

  return rows.map((row) => row.transaction_id)
}

export function getTransactionCategorySuggestions(
  db: Database,
  filters: SuggestionFilters = {},
): SuggestionWithContext[] {
  const conditions: string[] = []
  const params: SQLQueryBindings[] = []

  if (filters.status !== undefined) {
    conditions.push('s.status = ?')
    params.push(filters.status)
  }
  if (filters.from !== undefined) {
    conditions.push('t.date >= ?')
    params.push(filters.from)
  }
  if (filters.to !== undefined) {
    conditions.push('t.date <= ?')
    params.push(filters.to)
  }
  if (filters.search !== undefined) {
    conditions.push('t.counterparty LIKE ?')
    params.push(`%${filters.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = filters.limit !== undefined ? 'LIMIT ?' : ''

  if (filters.limit !== undefined) {
    params.push(filters.limit)
  }

  const sql = `
    SELECT
      s.transaction_id  AS transactionId,
      t.date            AS transactionDate,
      t.counterparty    AS counterparty,
      t.amount          AS amount,
      s.category_id     AS categoryId,
      c.name            AS categoryName,
      s.confidence      AS confidence,
      s.status          AS status,
      s.suggested_at    AS suggestedAt,
      s.reviewed_at     AS reviewedAt,
      s.applied_at      AS appliedAt
    FROM transaction_category_suggestions s
    JOIN transactions t ON t.id = s.transaction_id
    JOIN categories c ON c.id = s.category_id
    ${whereClause}
    ORDER BY s.suggested_at DESC
    ${limitClause}
  `.trim()

  const rows = db.prepare(sql).all(...params) as {
    transactionId: number
    transactionDate: string
    counterparty: string
    amount: number
    categoryId: string
    categoryName: string
    confidence: number
    status: TransactionCategorySuggestionStatus
    suggestedAt: string
    reviewedAt: string | null
    appliedAt: string | null
  }[]

  return rows.map((row) => ({
    transactionId: row.transactionId,
    transactionDate: row.transactionDate,
    counterparty: row.counterparty,
    amount: row.amount,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    confidence: row.confidence,
    status: row.status,
    suggestedAt: row.suggestedAt,
    reviewedAt: row.reviewedAt ?? undefined,
    appliedAt: row.appliedAt ?? undefined,
  }))
}

export function getApprovedSuggestionTransactionIds(db: Database, filters: SuggestionFilters = {}): number[] {
  const conditions: string[] = ["s.status = 'approved'", 't.category_id IS NULL']
  const params: SQLQueryBindings[] = []

  if (filters.from !== undefined) {
    conditions.push('t.date >= ?')
    params.push(filters.from)
  }
  if (filters.to !== undefined) {
    conditions.push('t.date <= ?')
    params.push(filters.to)
  }
  if (filters.search !== undefined) {
    conditions.push('t.counterparty LIKE ?')
    params.push(`%${filters.search}%`)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const limitClause = filters.limit !== undefined ? 'LIMIT ?' : ''

  if (filters.limit !== undefined) {
    params.push(filters.limit)
  }

  const sql = `
    SELECT s.transaction_id AS transactionId
    FROM transaction_category_suggestions s
    JOIN transactions t ON t.id = s.transaction_id
    ${whereClause}
    ORDER BY s.suggested_at DESC
    ${limitClause}
  `.trim()

  const rows = db.prepare(sql).all(...params) as { transactionId: number }[]
  return rows.map((row) => row.transactionId)
}

export function getApprovedSuggestionCategoryId(db: Database, transactionId: number): string | null {
  const row = db
    .prepare(
      `
    SELECT category_id FROM transaction_category_suggestions
    WHERE transaction_id = ? AND status = 'approved'
  `,
    )
    .get(transactionId) as { category_id: string } | null

  return row?.category_id ?? null
}

export function getSuggestionStatusByTransactionId(db: Database, transactionId: number): string | null {
  const row = db
    .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
    .get(transactionId) as { status: string } | null

  return row?.status ?? null
}
