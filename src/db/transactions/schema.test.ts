import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from './schema'

function getColumnNames(db: Database): string[] {
  const rows = db.prepare("PRAGMA table_info('transactions')").all() as Array<{ name: string }>
  return rows.map(row => row.name)
}

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

  it('creates the hash column', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)

    createTransactionsTable(db)

    expect(getColumnNames(db)).toContain('hash')
  })

  it('creates the hash index', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)

    createTransactionsTable(db)

    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_transactions_hash'"
    ).get()
    expect(row?.name).toBe('idx_transactions_hash')
  })
})