import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from './schema'
import {
  insertTransaction,
  getTransactions,
  updateCategory,
  getCategories,
  getUncategorized,
} from './queries'
import type { Transaction } from '../types'

const fakeTx: Omit<Transaction, 'id'> = {
  date: '2026-01-15',
  amount: -42.50,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)
})

describe('insertTransaction', () => {
  it('inserts a transaction and returns 1', () => {
    const changes = insertTransaction(db, fakeTx)
    expect(changes).toBe(1)
  })

  it('returns 0 on duplicate (same date+amount+counterparty)', () => {
    insertTransaction(db, fakeTx)
    const changes = insertTransaction(db, fakeTx)
    expect(changes).toBe(0)
  })
})

describe('getTransactions', () => {
  beforeEach(() => {
    insertTransaction(db, { ...fakeTx, date: '2026-01-10', amount: -10, counterparty: 'Shop A' })
    insertTransaction(db, { ...fakeTx, date: '2026-01-20', amount: -20, counterparty: 'Shop B' })
    insertTransaction(db, { ...fakeTx, date: '2026-01-30', amount: -30, counterparty: 'Other Store' })
  })

  it('returns all transactions when no filters', () => {
    const txs = getTransactions(db)
    expect(txs.length).toBe(3)
  })

  it('filters by from date', () => {
    const txs = getTransactions(db, { from: '2026-01-15' })
    expect(txs.length).toBe(2)
    expect(txs.every(t => t.date >= '2026-01-15')).toBe(true)
  })

  it('filters by to date', () => {
    const txs = getTransactions(db, { to: '2026-01-25' })
    expect(txs.length).toBe(2)
    expect(txs.every(t => t.date <= '2026-01-25')).toBe(true)
  })

  it('filters by search (counterparty LIKE)', () => {
    const txs = getTransactions(db, { search: 'Shop' })
    expect(txs.length).toBe(2)
  })

  it('filters by categoryId', () => {
    const allTxs = getTransactions(db)
    updateCategory(db, allTxs[0].id!, 'food-groceries')
    const txs = getTransactions(db, { categoryId: 'food-groceries' })
    expect(txs.length).toBe(1)
  })

  it('limits results', () => {
    const txs = getTransactions(db, { limit: 2 })
    expect(txs.length).toBe(2)
  })
})

describe('updateCategory', () => {
  it('sets category_id correctly', () => {
    insertTransaction(db, fakeTx)
    const [tx] = getTransactions(db)
    updateCategory(db, tx.id!, 'food-groceries')
    const [updated] = getTransactions(db)
    expect(updated.categoryId).toBe('food-groceries')
  })

  it('does NOT modify ai_category_id', () => {
    insertTransaction(db, { ...fakeTx, aiCategoryId: 'transport-fuel' })
    const [tx] = getTransactions(db)
    updateCategory(db, tx.id!, 'food-groceries')
    const [updated] = getTransactions(db)
    expect(updated.aiCategoryId).toBe('transport-fuel')
  })
})

describe('getCategories', () => {
  it('returns all 24 categories', () => {
    const cats = getCategories(db)
    expect(cats.length).toBe(24)
  })
})

describe('getUncategorized', () => {
  it('returns only transactions with both category fields null', () => {
    insertTransaction(db, fakeTx)
    insertTransaction(db, { ...fakeTx, date: '2026-02-01', amount: -5, counterparty: 'Categorized' })
    const txs = getTransactions(db)
    updateCategory(db, txs[0].id!, 'food-groceries')

    const uncategorized = getUncategorized(db)
    expect(uncategorized.length).toBe(1)
    expect(uncategorized[0].categoryId).toBeUndefined()
    expect(uncategorized[0].aiCategoryId).toBeUndefined()
  })
})
