import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { Transaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { getTransactions } from './queries'
import { createTransactionsTable, createDuplicateTransactionsTable } from './schema'
import { computeTransactionHash, insertTransaction, updateCategory } from './mutations'

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
  createDuplicateTransactionsTable(db)
  seedCategories(db)
})

describe('computeTransactionHash', () => {
  it('returns a 64-character hex string', () => {
    const hash = computeTransactionHash(fakeTransaction)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same hash for identical deduplication fields', () => {
    const hashA = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const hashB = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    expect(hashA).toBe(hashB)
  })

  it('returns different hashes when date differs', () => {
    const hashA = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const hashB = computeTransactionHash({ date: '2026-01-16', amount: -42.5, counterparty: 'ACME Shop' })
    expect(hashA).not.toBe(hashB)
  })

  it('returns different hashes when amount differs', () => {
    const hashA = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const hashB = computeTransactionHash({ date: '2026-01-15', amount: -10.0, counterparty: 'ACME Shop' })
    expect(hashA).not.toBe(hashB)
  })

  it('returns different hashes when counterparty differs', () => {
    const hashA = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const hashB = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'Other Store' })
    expect(hashA).not.toBe(hashB)
  })

  it('returns different hashes when note differs', () => {
    const hashA = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop', note: 'invoice 1' })
    const hashB = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop', note: 'invoice 2' })
    expect(hashA).not.toBe(hashB)
  })

  it('returns different hashes when note is present vs absent', () => {
    const hashA = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop', note: 'memo' })
    const hashB = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    expect(hashA).not.toBe(hashB)
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
    const transactions = getTransactions(db)
    expect(transactions).toHaveLength(1)
  })

  it('inserts two transactions with the same date and amount but different counterparty', () => {
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, { ...fakeTransaction, counterparty: 'Other Store' })
    const transactions = getTransactions(db)
    expect(transactions).toHaveLength(2)
  })

  it('persists a duplicate record in duplicate_transactions when a duplicate is inserted', () => {
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, fakeTransaction)
    const rows = db.query<{ hash: string; counterparty: string }, []>(
      'SELECT hash, counterparty FROM duplicate_transactions'
    ).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].counterparty).toBe('ACME Shop')
  })

  it('does not create a duplicate_transactions record on a fresh insert', () => {
    insertTransaction(db, fakeTransaction)
    const rows = db.query<{ id: number }, []>('SELECT id FROM duplicate_transactions').all()
    expect(rows).toHaveLength(0)
  })

  it('accumulates multiple duplicate records across repeated imports', () => {
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, fakeTransaction)
    const rows = db.query<{ id: number }, []>('SELECT id FROM duplicate_transactions').all()
    expect(rows).toHaveLength(2)
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
