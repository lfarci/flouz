import { describe, expect, it, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { createBudgetsTable, createMonthlyIncomeSnapshotsTable } from './schema'
import { upsertBudget, upsertMonthlyIncomeSnapshot } from './mutations'

describe('upsertBudget', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createCategoriesTable(db)
    createBudgetsTable(db)
    db.run("INSERT INTO categories (id, name, slug) VALUES ('cat-1', 'Necessities', 'necessities')")
    db.run("INSERT INTO categories (id, name, slug) VALUES ('cat-2', 'Savings', 'savings')")
  })

  it('inserts a new budget row', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2000,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    const row = db.prepare('SELECT * FROM budgets WHERE category_id = ?').get('cat-1') as Record<string, unknown>
    expect(row.amount).toBe(2000)
    expect(row.type).toBe('fixed')
    expect(row.month).toBe('2026-05')
  })

  it('updates amount when called again for same category and month', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2000,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2500,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-02T00:00:00Z',
    })

    const rows = db.prepare('SELECT * FROM budgets WHERE category_id = ?').all('cat-1') as Record<string, unknown>[]
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(2500)
  })

  it('does not affect other months for the same category', () => {
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

    const rows = db.prepare('SELECT * FROM budgets ORDER BY month').all() as Record<string, unknown>[]
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBe(2000)
    expect(rows[1].amount).toBe(2500)
  })

  it('stores percentage budget with type percent', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 60,
      type: 'percent',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    const row = db.prepare('SELECT * FROM budgets WHERE category_id = ?').get('cat-1') as Record<string, unknown>
    expect(row.amount).toBe(60)
    expect(row.type).toBe('percent')
  })

  it('updates type when changing from fixed to percent', () => {
    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 2000,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    })

    upsertBudget(db, {
      categoryId: 'cat-1',
      amount: 60,
      type: 'percent',
      month: '2026-05',
      createdAt: '2026-05-02T00:00:00Z',
    })

    const row = db.prepare('SELECT * FROM budgets WHERE category_id = ?').get('cat-1') as Record<string, unknown>
    expect(row.amount).toBe(60)
    expect(row.type).toBe('percent')
  })
})

describe('upsertMonthlyIncomeSnapshot', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createMonthlyIncomeSnapshotsTable(db)
  })

  it('inserts a new monthly income row', () => {
    upsertMonthlyIncomeSnapshot(db, '2026-05', 3500)

    const row = db.prepare('SELECT * FROM monthly_income_snapshots WHERE month = ?').get('2026-05') as Record<
      string,
      unknown
    >
    expect(row.amount).toBe(3500)
    expect(row.month).toBe('2026-05')
  })

  it('updates amount for the same month', () => {
    upsertMonthlyIncomeSnapshot(db, '2026-05', 3500)
    upsertMonthlyIncomeSnapshot(db, '2026-05', 4000)

    const rows = db.prepare('SELECT * FROM monthly_income_snapshots WHERE month = ?').all('2026-05') as Record<
      string,
      unknown
    >[]
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(4000)
  })

  it('does not affect other months', () => {
    upsertMonthlyIncomeSnapshot(db, '2026-04', 3200)
    upsertMonthlyIncomeSnapshot(db, '2026-05', 3500)

    const rows = db.prepare('SELECT * FROM monthly_income_snapshots ORDER BY month').all() as Record<string, unknown>[]
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBe(3200)
    expect(rows[1].amount).toBe(3500)
  })
})
