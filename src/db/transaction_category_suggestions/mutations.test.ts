import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction } from '@/db/transactions/mutations'
import { upsertTransactionCategorySuggestion } from './mutations'
import type { NewTransaction, TransactionCategorySuggestion } from '@/types'

const CATEGORY_ID_A = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'
const CATEGORY_ID_B = '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a'

const baseTransaction: NewTransaction = {
  date: '2026-01-15',
  amount: -10,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

function getSuggestionRow(
  db: Database,
  transactionId: number,
): Omit<TransactionCategorySuggestion, 'transactionId'> | null {
  return db
    .prepare(
      'SELECT category_id AS categoryId, confidence, model, suggested_at AS suggestedAt FROM transaction_category_suggestions WHERE transaction_id = ?',
    )
    .get(transactionId) as Omit<TransactionCategorySuggestion, 'transactionId'> | null
}

let db: Database
let transactionId: number

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)

  insertTransaction(db, baseTransaction)
  const row = db.prepare('SELECT id FROM transactions LIMIT 1').get() as {
    id: number
  }
  transactionId = row.id
})

describe('upsertTransactionCategorySuggestion', () => {
  it('inserts a new suggestion row', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    const row = getSuggestionRow(db, transactionId)

    expect(row).not.toBeNull()
    expect(row?.categoryId).toBe(CATEGORY_ID_A)
    expect(row?.confidence).toBe(0.8)
    expect(row?.model).toBe('gpt-4o-mini')
  })

  it('updates the existing row when called again with the same transactionId', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    expect(() =>
      upsertTransactionCategorySuggestion(db, {
        transactionId,
        categoryId: CATEGORY_ID_B,
        confidence: 0.6,
        model: 'gpt-4o-mini',
      }),
    ).not.toThrow()
  })

  it('reflects the new values after an upsert on the same transactionId', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_B,
      confidence: 0.6,
      model: 'updated-model',
    })

    const row = getSuggestionRow(db, transactionId)

    expect(row?.categoryId).toBe(CATEGORY_ID_B)
    expect(row?.confidence).toBe(0.6)
    expect(row?.model).toBe('updated-model')
  })
})
