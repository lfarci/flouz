import { Database } from 'bun:sqlite'
import type { SQLQueryBindings } from 'bun:sqlite'
import type { Transaction, TransactionFilters, Category } from '../types'

export function insertTransaction(db: Database, tx: Omit<Transaction, 'id'>): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO transactions
      (date, amount, counterparty, counterparty_iban, currency, account, source_ref,
       category_id, ai_category_id, ai_confidence, ai_reasoning, note, source_file, imported_at)
    VALUES
      ($date, $amount, $counterparty, $counterpartyIban, $currency, $account, $sourceRef,
       $categoryId, $aiCategoryId, $aiConfidence, $aiReasoning, $note, $sourceFile, $importedAt)
  `)
  const result = stmt.run({
    $date: tx.date,
    $amount: tx.amount,
    $counterparty: tx.counterparty,
    $counterpartyIban: tx.counterpartyIban ?? null,
    $currency: tx.currency,
    $account: tx.account ?? null,
    $sourceRef: tx.sourceRef ?? null,
    $categoryId: tx.categoryId ?? null,
    $aiCategoryId: tx.aiCategoryId ?? null,
    $aiConfidence: tx.aiConfidence ?? null,
    $aiReasoning: tx.aiReasoning ?? null,
    $note: tx.note ?? null,
    $sourceFile: tx.sourceFile ?? null,
    $importedAt: tx.importedAt,
  })
  return result.changes
}

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as number,
    date: row.date as string,
    amount: row.amount as number,
    counterparty: row.counterparty as string,
    counterpartyIban: (row.counterparty_iban as string | null) ?? undefined,
    currency: row.currency as string,
    account: (row.account as string | null) ?? undefined,
    sourceRef: (row.source_ref as string | null) ?? undefined,
    categoryId: (row.category_id as string | null) ?? undefined,
    aiCategoryId: (row.ai_category_id as string | null) ?? undefined,
    aiConfidence: (row.ai_confidence as number | null) ?? undefined,
    aiReasoning: (row.ai_reasoning as string | null) ?? undefined,
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit !== undefined ? `LIMIT ?` : ''
  if (filters.limit !== undefined) params.push(filters.limit)

  const sql = `SELECT * FROM transactions ${where} ORDER BY date DESC ${limit}`.trim()
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
  return rows.map(rowToTransaction)
}

export function updateCategory(db: Database, id: number, categoryId: string): void {
  db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(categoryId, id)
}

export function getCategories(db: Database): Category[] {
  const rows = db.prepare(
    'SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id NULLS FIRST, name'
  ).all() as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    parentId: (row.parent_id as string | null) ?? null,
  }))
}

export function getUncategorized(db: Database): Transaction[] {
  const rows = db.prepare(
    'SELECT * FROM transactions WHERE category_id IS NULL AND ai_category_id IS NULL ORDER BY date DESC'
  ).all() as Record<string, unknown>[]
  return rows.map(rowToTransaction)
}
