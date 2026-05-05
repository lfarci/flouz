import { describe, expect, it, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from '@/db/transactions/schema'
import { createAccountsTable } from '@/db/accounts/schema'
import { createBudgetsTable, createMonthlyIncomeSnapshotsTable } from './schema'
import { upsertBudget, upsertMonthlyIncomeSnapshot } from './mutations'
import {
  getBudgetsForMonth,
  getBudgetForCategory,
  getMonthlyIncomeSnapshot,
  getIncomeForMonth,
  previousMonth,
  resolveMonthlyTotal,
} from './queries'

describe('getBudgetsForMonth', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createCategoriesTable(db)
    createBudgetsTable(db)
    db.run("INSERT INTO categories (id, name, slug) VALUES ('cat-1', 'Necessities', 'necessities')")
    db.run("INSERT INTO categories (id, name, slug) VALUES ('cat-2', 'Savings', 'savings')")
  })

  it('returns empty array when no budgets exist', () => {
    const result = getBudgetsForMonth(db, '2026-05')

    expect(result).toEqual([])
  })

  it('returns only rows for the given month', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2000,
      type: 'fixed',
      month: '2026-04',
      createdAt: '2026-04-01T00:00:00Z',
    })
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2500,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })
    upsertBudget(db, {
      categoryId: 'cat-2',
      amount: 500,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    const result = getBudgetsForMonth(db, '2026-05')

    expect(result).toHaveLength(2)
    expect(result[0].amount).toBe(2500)
    expect(result[1].amount).toBe(500)
  })

  it('returns budget with correct type field', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 60,
      type: 'percent',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    const result = getBudgetsForMonth(db, '2026-05')

    expect(result[0].type).toBe('percent')
    expect(result[0].amount).toBe(60)
  })
})

describe('getBudgetForCategory', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createCategoriesTable(db)
    createBudgetsTable(db)
    db.run("INSERT INTO categories (id, name, slug) VALUES ('cat-1', 'Necessities', 'necessities')")
  })

  it('returns undefined when no match exists', () => {
    const result = getBudgetForCategory(db, 'cat-1', '2026-05')

    expect(result).toBeUndefined()
  })

  it('returns the budget when it exists', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2000,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    const result = getBudgetForCategory(db, 'cat-1', '2026-05')

    expect(result).toBeDefined()
    expect(result!.amount).toBe(2000)
    expect(result!.categoryId).toBe('cat-1')
  })
})

describe('previousMonth', () => {
  it('returns previous month within same year', () => {
    expect(previousMonth('2026-05')).toBe('2026-04')
  })

  it('wraps to December of previous year', () => {
    expect(previousMonth('2026-01')).toBe('2025-12')
  })
})

describe('getIncomeForMonth', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createCategoriesTable(db)
    createAccountsTable(db)
    createTransactionsTable(db)
    db.run("INSERT INTO categories (id, name, slug) VALUES ('inc-root', 'Income', 'income')")
    db.run("INSERT INTO categories (id, name, slug, parent_id) VALUES ('inc-salary', 'Salary', 'salary', 'inc-root')")
  })

  it('returns 0 when no income transactions exist', () => {
    const result = getIncomeForMonth(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(0)
  })

  it('sums positive transactions in income categories for the month', () => {
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-05-01', 3300, 'Employer', 'h1', '2026-05-01T00:00:00Z', 'inc-salary')`)
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-05-15', 200, 'Refund', 'h2', '2026-05-15T00:00:00Z', 'inc-root')`)

    const result = getIncomeForMonth(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(3500)
  })

  it('excludes transactions from other months', () => {
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-04-01', 3300, 'Employer', 'h1', '2026-04-01T00:00:00Z', 'inc-salary')`)
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-05-01', 3300, 'Employer', 'h2', '2026-05-01T00:00:00Z', 'inc-salary')`)

    const result = getIncomeForMonth(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(3300)
  })
})

describe('getMonthlyIncomeSnapshot', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createMonthlyIncomeSnapshotsTable(db)
  })

  it('returns undefined when no stored income exists', () => {
    const result = getMonthlyIncomeSnapshot(db, '2026-05')
    expect(result).toBeUndefined()
  })

  it('returns stored income for the month', () => {
    upsertMonthlyIncomeSnapshot(db, '2026-05', 3500)

    const result = getMonthlyIncomeSnapshot(db, '2026-05')
    expect(result).toBe(3500)
  })
})

describe('resolveMonthlyTotal', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createCategoriesTable(db)
    createAccountsTable(db)
    createTransactionsTable(db)
    createMonthlyIncomeSnapshotsTable(db)
    db.run("INSERT INTO categories (id, name, slug) VALUES ('inc-root', 'Income', 'income')")
    db.run("INSERT INTO categories (id, name, slug, parent_id) VALUES ('inc-salary', 'Salary', 'salary', 'inc-root')")
  })

  it('returns stored monthly income when available', () => {
    upsertMonthlyIncomeSnapshot(db, '2026-05', 4000)
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-05-01', 3300, 'Employer', 'h1', '2026-05-01T00:00:00Z', 'inc-salary')`)

    const result = resolveMonthlyTotal(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(4000)
  })

  it('falls back to detected income when no stored value', () => {
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-05-01', 3300, 'Employer', 'h1', '2026-05-01T00:00:00Z', 'inc-salary')`)

    const result = resolveMonthlyTotal(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(3300)
  })

  it('falls back to previous month stored income', () => {
    upsertMonthlyIncomeSnapshot(db, '2026-04', 3800)

    const result = resolveMonthlyTotal(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(3800)
  })

  it('falls back to previous month detected income', () => {
    db.run(`INSERT INTO transactions (date, amount, counterparty, hash, imported_at, category_id)
            VALUES ('2026-04-01', 3300, 'Employer', 'h1', '2026-04-01T00:00:00Z', 'inc-salary')`)

    const result = resolveMonthlyTotal(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(3300)
  })

  it('returns 0 when no income source is available', () => {
    const result = resolveMonthlyTotal(db, ['inc-root', 'inc-salary'], '2026-05')
    expect(result).toBe(0)
  })
})
