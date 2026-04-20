import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction, updateCategory } from '@/db/transactions/mutations'
import { upsertTransactionCategorySuggestion, approveTransactionCategorySuggestion } from './mutations'
import {
  getCategorizationExamples,
  getCounterpartyCategoryConsensus,
  getSuggestedTransactionIds,
  getTransactionCategorySuggestions,
  getApprovedSuggestionTransactionIds,
} from './queries'
import type { NewTransaction, Transaction } from '@/types'

const CATEGORY_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'
const SECOND_CATEGORY_ID = '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91'

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

function seedSuggestion(db: Database, transactionId: number, categoryId = CATEGORY_ID): void {
  upsertTransactionCategorySuggestion(db, {
    transactionId,
    categoryId,
    confidence: 0.9,
    model: 'test-model',
  })
}

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)
})

describe('getSuggestedTransactionIds', () => {
  it('returns empty array when no suggestions exist', () => {
    expect(getSuggestedTransactionIds(db)).toEqual([])
  })

  it('returns the transaction IDs that have a suggestion', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const firstId = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const secondId = getLastInsertedId(db)

    seedSuggestion(db, firstId)
    seedSuggestion(db, secondId)

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

    seedSuggestion(db, suggestedId)

    const ids = getSuggestedTransactionIds(db)

    expect(ids).toContain(suggestedId)
    expect(ids).not.toContain(notSuggestedId)
  })
})

describe('getTransactionCategorySuggestions', () => {
  it('returns empty array when no suggestions exist', () => {
    expect(getTransactionCategorySuggestions(db)).toEqual([])
  })

  it('returns all suggestions when no filters are applied', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)

    const results = getTransactionCategorySuggestions(db)
    expect(results).toHaveLength(2)
  })

  it('filters by status = pending', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)
    approveTransactionCategorySuggestion(db, idB)

    const results = getTransactionCategorySuggestions(db, { status: 'pending' })
    expect(results).toHaveLength(1)
    expect(results[0].transactionId).toBe(idA)
  })

  it('filters by status = approved', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)
    approveTransactionCategorySuggestion(db, idA)

    const results = getTransactionCategorySuggestions(db, { status: 'approved' })
    expect(results).toHaveLength(1)
    expect(results[0].transactionId).toBe(idA)
  })

  it('filters by search counterparty', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Grocery Store' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Gas Station' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)

    const results = getTransactionCategorySuggestions(db, { search: 'Grocery' })
    expect(results).toHaveLength(1)
    expect(results[0].counterparty).toBe('Grocery Store')
  })

  it('filters by from date', () => {
    insertTransaction(db, { ...baseTransaction, date: '2026-01-10', counterparty: 'Old' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, date: '2026-02-01', counterparty: 'New' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)

    const results = getTransactionCategorySuggestions(db, { from: '2026-01-20' })
    expect(results).toHaveLength(1)
    expect(results[0].transactionId).toBe(idB)
  })

  it('filters by to date', () => {
    insertTransaction(db, { ...baseTransaction, date: '2026-01-10', counterparty: 'Old' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, date: '2026-02-01', counterparty: 'New' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)

    const results = getTransactionCategorySuggestions(db, { to: '2026-01-20' })
    expect(results).toHaveLength(1)
    expect(results[0].transactionId).toBe(idA)
  })

  it('respects limit', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)

    const results = getTransactionCategorySuggestions(db, { limit: 1 })
    expect(results).toHaveLength(1)
  })

  it('returns joined transaction context including category name', () => {
    insertTransaction(db, baseTransaction)
    const id = getLastInsertedId(db)
    seedSuggestion(db, id)

    const results = getTransactionCategorySuggestions(db)
    expect(results[0].categoryName).toBeTruthy()
    expect(results[0].counterparty).toBe('ACME Shop')
    expect(results[0].amount).toBe(-10)
    expect(results[0].transactionDate).toBe('2026-01-15')
  })

  it('includes reasoning in returned rows when stored', () => {
    insertTransaction(db, baseTransaction)
    const id = getLastInsertedId(db)
    upsertTransactionCategorySuggestion(db, {
      transactionId: id,
      categoryId: CATEGORY_ID,
      confidence: 0.9,
      model: 'test-model',
      reasoning: 'Looks like a grocery expense',
    })

    const results = getTransactionCategorySuggestions(db)
    expect(results[0].reasoning).toBe('Looks like a grocery expense')
  })

  it('returns undefined for reasoning when not set', () => {
    insertTransaction(db, baseTransaction)
    const id = getLastInsertedId(db)
    seedSuggestion(db, id)

    const results = getTransactionCategorySuggestions(db)
    expect(results[0].reasoning).toBeUndefined()
  })
})

describe('getCategorizationExamples', () => {
  const targetTransaction: Transaction = {
    id: undefined,
    date: '2026-01-15',
    amount: -10,
    counterparty: 'ACME Shop',
    hash: 'abc',
    currency: 'EUR',
    importedAt: new Date().toISOString(),
  }

  let exampleDateCounter = 0

  function insertApprovedSuggestion(db: Database, counterparty: string, categoryId = CATEGORY_ID): number {
    exampleDateCounter++
    const date = `2026-02-${String(exampleDateCounter).padStart(2, '0')}`
    insertTransaction(db, { ...baseTransaction, date, counterparty })
    const { id } = db.prepare('SELECT id FROM transactions ORDER BY id DESC LIMIT 1').get() as { id: number }
    seedSuggestion(db, id, categoryId)
    approveTransactionCategorySuggestion(db, id)
    return id
  }

  it('returns empty array when no approved or applied suggestions exist', () => {
    expect(getCategorizationExamples(db, targetTransaction)).toEqual([])
  })

  it('excludes pending suggestions', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Pending Shop' })
    const { id } = db.prepare('SELECT id FROM transactions ORDER BY id DESC LIMIT 1').get() as { id: number }
    seedSuggestion(db, id)

    expect(getCategorizationExamples(db, targetTransaction)).toEqual([])
  })

  it('orders same-counterparty matches before other approved suggestions', () => {
    insertApprovedSuggestion(db, 'Other Shop')
    insertApprovedSuggestion(db, 'ACME Shop')

    const examples = getCategorizationExamples(db, targetTransaction)

    expect(examples).toHaveLength(2)
    expect(examples[0].counterparty).toBe('ACME Shop')
  })

  it('respects the limit parameter', () => {
    insertApprovedSuggestion(db, 'Shop A')
    insertApprovedSuggestion(db, 'Shop B')
    insertApprovedSuggestion(db, 'Shop C')

    const examples = getCategorizationExamples(db, targetTransaction, 2)
    expect(examples).toHaveLength(2)
  })

  it('returns counterparty, amount, date, categoryId, categoryName, categorySlug for each example', () => {
    insertApprovedSuggestion(db, 'ACME Shop')

    const examples = getCategorizationExamples(db, targetTransaction)
    expect(examples).toHaveLength(1)
    expect(examples[0].counterparty).toBe('ACME Shop')
    expect(typeof examples[0].amount).toBe('number')
    expect(typeof examples[0].date).toBe('string')
    expect(typeof examples[0].categoryId).toBe('string')
    expect(typeof examples[0].categoryName).toBe('string')
    expect(typeof examples[0].categorySlug).toBe('string')
  })
})

describe('getApprovedSuggestionTransactionIds', () => {
  it('returns empty array when no approved suggestions exist', () => {
    expect(getApprovedSuggestionTransactionIds(db)).toEqual([])
  })

  it('returns only approved suggestion transaction IDs', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop B' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)
    approveTransactionCategorySuggestion(db, idA)

    const ids = getApprovedSuggestionTransactionIds(db)
    expect(ids).toContain(idA)
    expect(ids).not.toContain(idB)
  })

  it('excludes transactions that already have a category_id set', () => {
    insertTransaction(db, { ...baseTransaction, counterparty: 'Shop A' })
    const idA = getLastInsertedId(db)

    seedSuggestion(db, idA)
    approveTransactionCategorySuggestion(db, idA)
    updateCategory(db, idA, CATEGORY_ID)

    const ids = getApprovedSuggestionTransactionIds(db)
    expect(ids).not.toContain(idA)
  })

  it('filters by date range', () => {
    insertTransaction(db, { ...baseTransaction, date: '2026-01-01', counterparty: 'Old' })
    const idA = getLastInsertedId(db)
    insertTransaction(db, { ...baseTransaction, date: '2026-03-01', counterparty: 'New' })
    const idB = getLastInsertedId(db)

    seedSuggestion(db, idA)
    seedSuggestion(db, idB)
    approveTransactionCategorySuggestion(db, idA)
    approveTransactionCategorySuggestion(db, idB)

    const ids = getApprovedSuggestionTransactionIds(db, { from: '2026-02-01' })
    expect(ids).toContain(idB)
    expect(ids).not.toContain(idA)
  })
})

describe('getCounterpartyCategoryConsensus', () => {
  let dateCounter = 0

  function insertApprovedSuggestionForCounterparty(
    db: Database,
    counterparty: string,
    categoryId: string = CATEGORY_ID,
  ): void {
    dateCounter++
    const date = `2026-01-${String(dateCounter).padStart(2, '0')}`
    insertTransaction(db, { ...baseTransaction, date, counterparty })
    const { id } = db.prepare('SELECT id FROM transactions ORDER BY id DESC LIMIT 1').get() as { id: number }
    seedSuggestion(db, id, categoryId)
    approveTransactionCategorySuggestion(db, id)
  }

  it('returns null when no approved suggestions exist for the counterparty', () => {
    expect(getCounterpartyCategoryConsensus(db, 'ACME Shop', 1)).toBeNull()
  })

  it('returns null when approved count is below minCount', () => {
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop')
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop')

    expect(getCounterpartyCategoryConsensus(db, 'ACME Shop', 3)).toBeNull()
  })

  it('returns the consensus when a single category reaches minCount', () => {
    for (let i = 0; i < 3; i++) {
      insertApprovedSuggestionForCounterparty(db, 'ACME Shop')
    }

    const consensus = getCounterpartyCategoryConsensus(db, 'ACME Shop', 3)
    expect(consensus).not.toBeNull()
    expect(consensus?.categoryId).toBe(CATEGORY_ID)
    expect(consensus?.count).toBe(3)
  })

  it('returns null when approvals are split across two categories', () => {
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop', CATEGORY_ID)
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop', SECOND_CATEGORY_ID)
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop', CATEGORY_ID)

    expect(getCounterpartyCategoryConsensus(db, 'ACME Shop', 2)).toBeNull()
  })

  it('excludes pending suggestions from the count', () => {
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop')
    insertApprovedSuggestionForCounterparty(db, 'ACME Shop')
    insertTransaction(db, { ...baseTransaction, counterparty: 'ACME Shop' })
    const { id } = db.prepare('SELECT id FROM transactions ORDER BY id DESC LIMIT 1').get() as { id: number }
    seedSuggestion(db, id)

    expect(getCounterpartyCategoryConsensus(db, 'ACME Shop', 3)).toBeNull()
  })
})
