import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from './schema'

describe('createTransactionsTable', () => {
  it('creates transactions table', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)

    createTransactionsTable(db)

    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    ).get()
    expect(row?.name).toBe('transactions')
  })

  it('is idempotent', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)

    expect(() => {
      createTransactionsTable(db)
      createTransactionsTable(db)
    }).not.toThrow()
  })
})