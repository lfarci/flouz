import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction } from '@/db/transactions/mutations'
import {
  upsertTransactionCategorySuggestion,
  approveTransactionCategorySuggestion,
  deleteTransactionCategorySuggestion,
  markApprovedSuggestionApplied,
  overrideTransactionCategorySuggestion,
} from './mutations'
import type { NewTransaction } from '@/types'

const CATEGORY_ID_A = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'
const CATEGORY_ID_B = '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a'

const baseTransaction: NewTransaction = {
  date: '2026-01-15',
  amount: -10,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

function getSuggestionStatus(db: Database, transactionId: number): string | null {
  const row = db.prepare(
    'SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?'
  ).get(transactionId) as { status: string } | null
  return row?.status ?? null
}

function getSuggestionRow(db: Database, transactionId: number): {
  categoryId: string
  confidence: number
  model: string
  suggestedAt: string
  status: string
  reviewedAt: string | null
  appliedAt: string | null
} | null {
  return db.prepare(`
    SELECT
      category_id AS categoryId,
      confidence,
      model,
      suggested_at AS suggestedAt,
      status,
      reviewed_at AS reviewedAt,
      applied_at AS appliedAt
    FROM transaction_category_suggestions WHERE transaction_id = ?
  `).get(transactionId) as {
    categoryId: string
    confidence: number
    model: string
    suggestedAt: string
    status: string
    reviewedAt: string | null
    appliedAt: string | null
  } | null
}

let db: Database
let transactionId: number

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)

  insertTransaction(db, baseTransaction)
  const row = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }
  transactionId = row.id
})

describe('upsertTransactionCategorySuggestion', () => {
  it('inserts a new suggestion row with status pending', () => {
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
    expect(row?.status).toBe('pending')
    expect(row?.reviewedAt).toBeNull()
    expect(row?.appliedAt).toBeNull()
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
      })
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

  it('resets an approved suggestion back to pending on re-upsert', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)
    expect(getSuggestionStatus(db, transactionId)).toBe('approved')

    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_B,
      confidence: 0.5,
      model: 'gpt-4o-mini',
    })

    const row = getSuggestionRow(db, transactionId)
    expect(row?.status).toBe('pending')
    expect(row?.reviewedAt).toBeNull()
    expect(row?.appliedAt).toBeNull()
  })

  it('resets an applied suggestion back to pending on re-upsert', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)
    markApprovedSuggestionApplied(db, transactionId)
    expect(getSuggestionStatus(db, transactionId)).toBe('applied')

    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_B,
      confidence: 0.5,
      model: 'gpt-4o-mini',
    })

    const row = getSuggestionRow(db, transactionId)
    expect(row?.status).toBe('pending')
    expect(row?.reviewedAt).toBeNull()
    expect(row?.appliedAt).toBeNull()
  })
})

describe('approveTransactionCategorySuggestion', () => {
  it('sets status to approved and sets reviewed_at', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    approveTransactionCategorySuggestion(db, transactionId)

    const row = getSuggestionRow(db, transactionId)
    expect(row?.status).toBe('approved')
    expect(row?.reviewedAt).not.toBeNull()
  })

  it('does not approve an already applied suggestion', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)
    markApprovedSuggestionApplied(db, transactionId)

    approveTransactionCategorySuggestion(db, transactionId)

    expect(getSuggestionStatus(db, transactionId)).toBe('applied')
  })
})

describe('deleteTransactionCategorySuggestion', () => {
  it('deletes a pending suggestion', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    deleteTransactionCategorySuggestion(db, transactionId)

    expect(getSuggestionRow(db, transactionId)).toBeNull()
  })

  it('deletes an approved suggestion', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)

    deleteTransactionCategorySuggestion(db, transactionId)

    expect(getSuggestionRow(db, transactionId)).toBeNull()
  })

  it('does not delete an applied suggestion', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)
    markApprovedSuggestionApplied(db, transactionId)

    deleteTransactionCategorySuggestion(db, transactionId)

    expect(getSuggestionStatus(db, transactionId)).toBe('applied')
  })
})

describe('markApprovedSuggestionApplied', () => {
  it('sets status to applied and sets applied_at', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)

    markApprovedSuggestionApplied(db, transactionId)

    const row = getSuggestionRow(db, transactionId)
    expect(row?.status).toBe('applied')
    expect(row?.appliedAt).not.toBeNull()
  })

  it('does not affect a pending suggestion', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    markApprovedSuggestionApplied(db, transactionId)

    expect(getSuggestionStatus(db, transactionId)).toBe('pending')
  })
})

describe('overrideTransactionCategorySuggestion', () => {
  it('changes the category and resets a pending suggestion to pending', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })

    overrideTransactionCategorySuggestion(db, transactionId, CATEGORY_ID_B)

    const row = getSuggestionRow(db, transactionId)
    expect(row?.categoryId).toBe(CATEGORY_ID_B)
    expect(row?.status).toBe('pending')
    expect(row?.reviewedAt).toBeNull()
    expect(row?.appliedAt).toBeNull()
  })

  it('changes the category and resets an approved suggestion back to pending', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)

    overrideTransactionCategorySuggestion(db, transactionId, CATEGORY_ID_B)

    const row = getSuggestionRow(db, transactionId)
    expect(row?.categoryId).toBe(CATEGORY_ID_B)
    expect(row?.status).toBe('pending')
    expect(row?.reviewedAt).toBeNull()
  })

  it('does not affect an applied suggestion', () => {
    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID_A,
      confidence: 0.8,
      model: 'gpt-4o-mini',
    })
    approveTransactionCategorySuggestion(db, transactionId)
    markApprovedSuggestionApplied(db, transactionId)

    overrideTransactionCategorySuggestion(db, transactionId, CATEGORY_ID_B)

    const row = getSuggestionRow(db, transactionId)
    expect(row?.categoryId).toBe(CATEGORY_ID_A)
    expect(row?.status).toBe('applied')
  })
})
