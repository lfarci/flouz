import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { computeTransactionHash } from '@/db/transactions/hash'
import type { NewTransaction } from '@/types'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { upsertTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
import { createTransactionCategorySuggestionsTable } from '@/db/transaction_category_suggestions/schema'
import { insertTransaction, updateCategory } from './mutations'
import { createTransactionsTable } from './schema'
import {
  countTransactions,
  getTransactions,
  getTransactionsMissingCategoryForCategorization,
  getUncategorized,
  hasTransactionsForAccount,
} from './queries'

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
      }),
    )
  })

  it('filters by from date', () => {
    const transactions = getTransactions(db, { from: '2026-01-15' })
    expect(transactions.length).toBe(2)
    expect(
      transactions.every((transaction) => transaction.date >= '2026-01-15'),
    ).toBe(true)
  })

  it('filters by to date', () => {
    const transactions = getTransactions(db, { to: '2026-01-25' })
    expect(transactions.length).toBe(2)
    expect(
      transactions.every((transaction) => transaction.date <= '2026-01-25'),
    ).toBe(true)
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

  it('counts all matching transactions even when the list query is limited', () => {
    const count = countTransactions(db, { search: 'Shop' })
    const transactions = getTransactions(db, { search: 'Shop', limit: 1 })

    expect(count).toBe(2)
    expect(transactions.length).toBe(1)
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

const CATEGORY_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'

describe('getTransactions with uncategorized filter', () => {
  beforeEach(() => {
    insertTransaction(db, { ...fakeTransaction, counterparty: 'No Category' })
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Has Category',
      date: '2026-02-01',
    })
    const allTransactions = getTransactions(db)
    const categorized = allTransactions.find(
      (t) => t.counterparty === 'Has Category',
    )!
    updateCategory(db, categorized.id!, CATEGORY_ID)
  })

  it('returns only transactions where category_id IS NULL when uncategorized is true', () => {
    const transactions = getTransactions(db, { uncategorized: true })

    expect(transactions).toHaveLength(1)
    expect(transactions[0].counterparty).toBe('No Category')
    expect(transactions[0].categoryId).toBeUndefined()
  })

  it('excludes transactions that have a category_id set', () => {
    const transactions = getTransactions(db, { uncategorized: true })

    expect(transactions.every((t) => t.categoryId === undefined)).toBe(true)
  })
})

describe('getTransactionsMissingCategoryForCategorization', () => {
  beforeEach(() => {
    createTransactionCategorySuggestionsTable(db)
  })

  it('returns transactions where category_id IS NULL and no suggestion exists', () => {
    insertTransaction(db, { ...fakeTransaction, counterparty: 'Eligible' })

    const transactions = getTransactionsMissingCategoryForCategorization(db)

    expect(transactions).toHaveLength(1)
    expect(transactions[0].counterparty).toBe('Eligible')
  })

  it('returns empty array when no eligible transactions exist', () => {
    const transactions = getTransactionsMissingCategoryForCategorization(db)

    expect(transactions).toEqual([])
  })

  it('excludes transactions that already have a category_id', () => {
    insertTransaction(db, { ...fakeTransaction, counterparty: 'Categorized' })
    const allTransactions = getTransactions(db)
    updateCategory(db, allTransactions[0].id!, CATEGORY_ID)

    const transactions = getTransactionsMissingCategoryForCategorization(db)

    expect(transactions).toHaveLength(0)
  })

  it('excludes transactions that already have a suggestion', () => {
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Already Suggested',
    })
    const allTransactions = getTransactions(db)
    const transactionId = allTransactions[0].id!

    upsertTransactionCategorySuggestion(db, {
      transactionId,
      categoryId: CATEGORY_ID,
      confidence: 0.9,
      model: 'test-model',
    })

    const transactions = getTransactionsMissingCategoryForCategorization(db)

    expect(transactions).toHaveLength(0)
  })

  it('applies search filter as case-insensitive counterparty match', () => {
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Delhaize Market',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Colruyt Shop',
      date: '2026-02-01',
    })

    const transactions = getTransactionsMissingCategoryForCategorization(db, {
      search: 'delhaize',
    })

    expect(transactions).toHaveLength(1)
    expect(transactions[0].counterparty).toBe('Delhaize Market')
  })

  it('applies from date filter', () => {
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-01-10',
      counterparty: 'Old',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-02-01',
      counterparty: 'New',
    })

    const transactions = getTransactionsMissingCategoryForCategorization(db, {
      from: '2026-01-20',
    })

    expect(transactions).toHaveLength(1)
    expect(transactions[0].counterparty).toBe('New')
  })

  it('applies to date filter', () => {
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-01-10',
      counterparty: 'Old',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      date: '2026-02-01',
      counterparty: 'New',
    })

    const transactions = getTransactionsMissingCategoryForCategorization(db, {
      to: '2026-01-20',
    })

    expect(transactions).toHaveLength(1)
    expect(transactions[0].counterparty).toBe('Old')
  })

  it('respects the limit filter', () => {
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Shop A',
      date: '2026-01-10',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Shop B',
      date: '2026-01-20',
    })
    insertTransaction(db, {
      ...fakeTransaction,
      counterparty: 'Shop C',
      date: '2026-01-30',
    })

    const transactions = getTransactionsMissingCategoryForCategorization(db, {
      limit: 2,
    })

    expect(transactions).toHaveLength(2)
  })
})
