import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { computeTransactionHash } from '@/db/transactions/hash'
import type { NewTransaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction, updateCategory } from './mutations'
import { createTransactionsTable } from './schema'
import { getTransactions, getUncategorized, hasTransactionsForAccount } from './queries'

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

  it('maps hash from the database row', () => {
    const [transaction] = getTransactions(db)

    expect(transaction.hash).toBe(
      computeTransactionHash({
        date: transaction.date,
        amount: transaction.amount,
        counterparty: transaction.counterparty,
        note: transaction.note,
      })
    )
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

  it('maps accountId from the database row', () => {
    const accountId = insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-02-01',
      accountId,
    })

    const [transaction] = getTransactions(db, { from: '2026-02-01' })

    expect(transaction.accountId).toBe(accountId)
  })
})

describe('getUncategorized', () => {
  it('returns only transactions with no category', () => {
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
  })
})

describe('hasTransactionsForAccount', () => {
  it('returns false when no transaction references the account', () => {
    const accountId = insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    expect(hasTransactionsForAccount(db, accountId)).toBe(false)
  })

  it('returns true when a transaction references the account', () => {
    const accountId = insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    insertTransaction(db, {
      ...fakeTransaction,
      accountId,
    })

    expect(hasTransactionsForAccount(db, accountId)).toBe(true)
  })
})