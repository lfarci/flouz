import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createAccountsTable } from '@/db/accounts/schema'
import { computeTransactionHash } from '@/db/transactions/hash'
import type { NewTransaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { getTransactions } from './queries'
import { createTransactionsTable } from './schema'
import { insertTransaction, updateCategory } from './mutations'

const fakeTransaction: NewTransaction = {
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
  createAccountsTable(db)
  createTransactionsTable(db)
  seedCategories(db)
})

describe('insertTransaction', () => {
  it('inserts a transaction and returns 1', () => {
    const changes = insertTransaction(db, fakeTransaction)
    expect(changes).toBe(1)
  })

  it('stores the computed hash', () => {
    insertTransaction(db, fakeTransaction)

    const row = db
      .query<{ hash: string }, []>('SELECT hash FROM transactions LIMIT 1')
      .get()

    expect(row?.hash).toBe(computeTransactionHash(fakeTransaction))
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
})
