import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { createBudgetsTable } from './schema'

function getColumnNames(db: Database): string[] {
  const rows = db.prepare("PRAGMA table_info('budgets')").all() as { name: string }[]
  return rows.map((row) => row.name)
}

function setupDatabase(): Database {
  const db = new Database(':memory:')
  createCategoriesTable(db)
  return db
}

describe('createBudgetsTable', () => {
  it('creates the budgets table', () => {
    const db = setupDatabase()

    createBudgetsTable(db)

    const row = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name='budgets'")
      .get()
    expect(row?.name).toBe('budgets')
  })

  it('is idempotent', () => {
    const db = setupDatabase()

    expect(() => {
      createBudgetsTable(db)
      createBudgetsTable(db)
    }).not.toThrow()
  })

  it('creates all expected columns', () => {
    const db = setupDatabase()

    createBudgetsTable(db)

    const columns = getColumnNames(db)
    expect(columns).toEqual(['id', 'category_id', 'amount', 'type', 'month', 'created_at'])
  })

  it('enforces unique constraint on category_id and month', () => {
    const db = setupDatabase()
    createBudgetsTable(db)
    db.run("INSERT INTO categories (id, name, slug) VALUES ('cat-1', 'Test', 'test')")
    db.run(
      "INSERT INTO budgets (category_id, amount, month, created_at) VALUES ('cat-1', 100, '2026-05', '2026-05-01T00:00:00Z')",
    )

    expect(() => {
      db.run(
        "INSERT INTO budgets (category_id, amount, month, created_at) VALUES ('cat-1', 200, '2026-05', '2026-05-01T00:00:00Z')",
      )
    }).toThrow()
  })
})
