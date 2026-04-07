import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { Transaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { getTransactions } from './queries'
import { createTransactionsTable } from './schema'
import { insertTransaction, updateCategory } from './mutations'

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

describe('insertTransaction', () => {
  it('inserts a transaction and returns 1', () => {
    const changes = insertTransaction(db, fakeTransaction)
    expect(changes).toBe(1)
  })

  it('returns 0 when inserting a duplicate transaction', () => {
    insertTransaction(db, fakeTransaction)

    const changes = insertTransaction(db, fakeTransaction)

    expect(changes).toBe(0)
    expect(getTransactions(db)).toHaveLength(1)
  })

  it('treats source_ref as metadata and not part of the duplicate detection key', () => {
    insertTransaction(db, {
      ...fakeTransaction,
      sourceRef: '001:1001',
    })

    const changes = insertTransaction(db, {
      ...fakeTransaction,
      sourceRef: '001:1002',
    })

    expect(changes).toBe(0)
    expect(getTransactions(db)).toHaveLength(1)
  })

  it('inserts a second row when the duplicate detection key changes', () => {
    insertTransaction(db, fakeTransaction)

    const changes = insertTransaction(db, {
      ...fakeTransaction,
      amount: -40.5,
    })

    expect(changes).toBe(1)
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