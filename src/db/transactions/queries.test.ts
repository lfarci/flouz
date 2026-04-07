import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { Transaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction, updateCategory } from './mutations'
import { createTransactionsTable } from './schema'
import { getTransactions, getUncategorized } from './queries'

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

describe('getTransactions', () => {
  beforeEach(() => {
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-01-10',
      amount: -10,
      counterparty: 'Shop A',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-01-20',
      amount: -20,
      counterparty: 'Shop B',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-01-30',
      amount: -30,
      counterparty: 'Other Store',
    })
  })

  it('returns all transactions when no filters', () => {
    const transactions = getTransactions(db)
    expect(transactions.length).toBe(3)
  })

  it('filters by from date', () => {
    const transactions = getTransactions(db, { from: '2026-01-15' })
    expect(transactions.length).toBe(2)
    expect(transactions.every(transaction => transaction.date >= '2026-01-15')).toBe(true)
  })

  it('filters by to date', () => {
    const transactions = getTransactions(db, { to: '2026-01-25' })
    expect(transactions.length).toBe(2)
    expect(transactions.every(transaction => transaction.date <= '2026-01-25')).toBe(true)
  })

  it('filters by search (counterparty LIKE)', () => {
    const transactions = getTransactions(db, { search: 'Shop' })
    expect(transactions.length).toBe(2)
  })

  it('filters by categoryId', () => {
    const allTransactions = getTransactions(db)
    updateCategory(db, allTransactions[0].id!, 'food-groceries')
    const transactions = getTransactions(db, { categoryId: 'food-groceries' })
    expect(transactions.length).toBe(1)
  })

  it('limits results', () => {
    const transactions = getTransactions(db, { limit: 2 })
    expect(transactions.length).toBe(2)
  })
})

describe('getUncategorized', () => {
  it('returns only transactions with both category fields null', () => {
    insertTransaction(db, fakeTransaction)
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-02-01',
      amount: -5,
      counterparty: 'Categorized',
    })
    const transactions = getTransactions(db)
    updateCategory(db, transactions[0].id!, 'food-groceries')

    const uncategorizedTransactions = getUncategorized(db)
    expect(uncategorizedTransactions.length).toBe(1)
    expect(uncategorizedTransactions[0].categoryId).toBeUndefined()
    expect(uncategorizedTransactions[0].aiCategoryId).toBeUndefined()
  })
})