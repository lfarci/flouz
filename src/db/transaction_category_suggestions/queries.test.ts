import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction } from '@/db/transactions/mutations'
import { upsertTransactionCategorySuggestion } from './mutations'
import { getSuggestedTransactionIds } from './queries'
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

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)
})

describe('getSuggestedTransactionIds', () => {
  it('returns empty array when no suggestions exist', () => {
    const ids = getSuggestedTransactionIds(db)

    expect(ids).toEqual([])
  })

  it('returns the transaction IDs that have a suggestion', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const firstId = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const secondId = getLastInsertedId(db)

    upsertTransactionCategorySuggestion(db, {
      transactionId: firstId,
      categoryId: CATEGORY_ID,
      confidence: 0.9,
      model: 'test-model',
    })
    upsertTransactionCategorySuggestion(db, {
      transactionId: secondId,
      categoryId: CATEGORY_ID,
      confidence: 0.7,
      model: 'test-model',
    })

    const ids = getSuggestedTransactionIds(db)

    expect(ids).toHaveLength(2)
    expect(ids).toContain(firstId)
    expect(ids).toContain(secondId)
  })

  it('does not return IDs for transactions that have no suggestion', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Suggested' })
    const suggestedId = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Not Suggested' })
    const notSuggestedId = getLastInsertedId(db)

    upsertTransactionCategorySuggestion(db, {
      transactionId: suggestedId,
      categoryId: CATEGORY_ID,
      confidence: 0.9,
      model: 'test-model',
    })

    const ids = getSuggestedTransactionIds(db)

    expect(ids).toContain(suggestedId)
    expect(ids).not.toContain(notSuggestedId)
  })
})
