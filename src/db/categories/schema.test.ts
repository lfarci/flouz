import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from './schema'

describe('createCategoriesTable', () => {
  it('creates categories table', () => {
    const db = new Database(':memory:')

    createCategoriesTable(db)

    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
    ).get()
    expect(row?.name).toBe('categories')
  })

  it('is idempotent', () => {
    const db = new Database(':memory:')

    expect(() => {
      createCategoriesTable(db)
      createCategoriesTable(db)
    }).not.toThrow()
  })
})