import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { Transaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { getTransactions } from './queries'
import { createTransactionsTable } from './schema'
import { computeFingerprint, insertTransaction, updateCategory } from './mutations'

const fakeTransaction: Omit<Transaction, 'id'> = {
  date: '2026-01-15',
  amount: -42.5,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  createCategoriesTable(db)
  createTransactionsTable(db)
  seedCategories(db)
})

describe('computeFingerprint', () => {
  it('returns a 64-character hex string', () => {
    const fingerprint = computeFingerprint('2026-01-15', -42.5, 'ACME Shop')
    expect(fingerprint).toHaveLength(64)
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same fingerprint for the same inputs', () => {
    const first = computeFingerprint('2026-01-15', -42.5, 'ACME Shop')
    const second = computeFingerprint('2026-01-15', -42.5, 'ACME Shop')
    expect(first).toBe(second)
  })

  it('returns different fingerprints when date differs', () => {
    const first = computeFingerprint('2026-01-15', -42.5, 'ACME Shop')
    const second = computeFingerprint('2026-01-16', -42.5, 'ACME Shop')
    expect(first).not.toBe(second)
  })

  it('returns different fingerprints when amount differs', () => {
    const first = computeFingerprint('2026-01-15', -42.5, 'ACME Shop')
    const second = computeFingerprint('2026-01-15', -10.0, 'ACME Shop')
    expect(first).not.toBe(second)
  })

  it('returns different fingerprints when counterparty differs', () => {
    const first = computeFingerprint('2026-01-15', -42.5, 'ACME Shop')
    const second = computeFingerprint('2026-01-15', -42.5, 'Other Shop')
    expect(first).not.toBe(second)
  })
})

describe('insertTransaction', () => {
  it('inserts a transaction and returns 1', () => {
    const changes = insertTransaction(db, fakeTransaction)
    expect(changes).toBe(1)
  })

  it('returns 0 when inserting a duplicate transaction', () => {
    insertTransaction(db, fakeTransaction)
    const changes = insertTransaction(db, fakeTransaction)
    expect(changes).toBe(0)
  })

  it('stores only one row when the same transaction is inserted twice', () => {
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, fakeTransaction)
    expect(getTransactions(db)).toHaveLength(1)
  })

  it('inserts two transactions with the same counterparty but different dates', () => {
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, { ...fakeTransaction, date: '2026-01-16' })
    expect(getTransactions(db)).toHaveLength(2)
  })
})

describe('updateCategory', () => {
  it('sets category_id correctly', () => {
    insertTransaction(db, fakeTransaction)
    const [transaction] = getTransactions(db)
    updateCategory(db, transaction.id!, 'food-groceries')
    const [updatedTransaction] = getTransactions(db)
    expect(updatedTransaction.categoryId).toBe('food-groceries')
  })

  it('does NOT modify ai_category_id', () => {
    insertTransaction(db, { ...fakeTransaction, aiCategoryId: 'transport-fuel' })
    const [transaction] = getTransactions(db)
    updateCategory(db, transaction.id!, 'food-groceries')
    const [updatedTransaction] = getTransactions(db)
    expect(updatedTransaction.aiCategoryId).toBe('transport-fuel')
  })
})