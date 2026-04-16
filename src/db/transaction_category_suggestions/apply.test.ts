import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction } from '@/db/transactions/mutations'
import {
  upsertTransactionCategorySuggestion,
  approveTransactionCategorySuggestion,
} from './mutations'
import { applyApprovedCategorySuggestions } from './apply'
import type { NewTransaction } from '@/types'

const CATEGORY_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'

const baseTransaction: NewTransaction = {
  date: '2026-01-15',
  amount: -10,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

function getLastInsertedId(db: Database): number {
  const row = db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }
  return row.id
}

function seedAndApproveSuggestion(db: Database, transactionId: number): void {
  upsertTransactionCategorySuggestion(db, {
    transactionId,
    categoryId: CATEGORY_ID,
    confidence: 0.9,
    model: 'test-model',
  })
  approveTransactionCategorySuggestion(db, transactionId)
}

function getTransactionCategoryId(db: Database, id: number): string | null {
  const row = db.prepare('SELECT category_id FROM transactions WHERE id = ?').get(id) as {
    category_id: string | null
  } | null
  return row?.category_id ?? null
}

function getSuggestionStatus(db: Database, transactionId: number): string | null {
  const row = db.prepare(
    'SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?'
  ).get(transactionId) as { status: string } | null
  return row?.status ?? null
}

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)
})

describe('applyApprovedCategorySuggestions', () => {
  it('returns zero applied and skipped when no approved suggestions exist', () => {
    const result = applyApprovedCategorySuggestions(db)
    expect(result.applied).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.firstError).toBeUndefined()
  })

  it('applies an approved suggestion and marks it as applied', () => {
    insertTransaction(db, baseTransaction)
    const id = getLastInsertedId(db)
    seedAndApproveSuggestion(db, id)

    const result = applyApprovedCategorySuggestions(db)

    expect(result.applied).toBe(1)
    expect(result.skipped).toBe(0)
    expect(getTransactionCategoryId(db, id)).toBe(CATEGORY_ID)
    expect(getSuggestionStatus(db, id)).toBe('applied')
  })

  it('is idempotent — re-running apply does not re-apply or corrupt state', () => {
    insertTransaction(db, baseTransaction)
    const id = getLastInsertedId(db)
    seedAndApproveSuggestion(db, id)

    applyApprovedCategorySuggestions(db)

    const second = applyApprovedCategorySuggestions(db)
    expect(second.applied).toBe(0)
    expect(second.skipped).toBe(0)
    expect(getSuggestionStatus(db, id)).toBe('applied')
  })

  it('skips a transaction that was manually categorized after approval', () => {
    insertTransaction(db, baseTransaction)
    const id = getLastInsertedId(db)
    seedAndApproveSuggestion(db, id)

    // Manually set category before apply runs — the query pre-filters these out
    db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(CATEGORY_ID, id)

    const result = applyApprovedCategorySuggestions(db)
    // The transaction is excluded from the approved set by the query (category_id IS NULL filter),
    // so it is never selected and does not appear in the skipped count.
    expect(result.applied).toBe(0)
    expect(result.skipped).toBe(0)
    expect(getSuggestionStatus(db, id)).toBe('approved')
  })

  it('applies only approved suggestions — skips pending ones', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    upsertTransactionCategorySuggestion(db, {
      transactionId: idA,
      categoryId: CATEGORY_ID,
      confidence: 0.9,
      model: 'test-model',
    })
    seedAndApproveSuggestion(db, idB)

    const result = applyApprovedCategorySuggestions(db)
    expect(result.applied).toBe(1)
    expect(getTransactionCategoryId(db, idA)).toBeNull()
    expect(getTransactionCategoryId(db, idB)).toBe(CATEGORY_ID)
  })

  it('applies multiple approved suggestions in a single batch', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    seedAndApproveSuggestion(db, idA)
    seedAndApproveSuggestion(db, idB)

    const result = applyApprovedCategorySuggestions(db)
    expect(result.applied).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it('respects filters when selecting approved suggestions', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Grocery Store' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Gas Station' })
    const idB = getLastInsertedId(db)

    seedAndApproveSuggestion(db, idA)
    seedAndApproveSuggestion(db, idB)

    const result = applyApprovedCategorySuggestions(db, { search: 'Grocery' })
    expect(result.applied).toBe(1)
    expect(getTransactionCategoryId(db, idA)).toBe(CATEGORY_ID)
    expect(getTransactionCategoryId(db, idB)).toBeNull()
  })
})
