import { describe, it, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from './schema'

describe('initDb', () => {
  it('creates categories table', () => {
    const db = new Database(':memory:')
    initDb(db)
    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
    ).get()
    expect(row?.name).toBe('categories')
  })

  it('creates transactions table', () => {
    const db = new Database(':memory:')
    initDb(db)
    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    ).get()
    expect(row?.name).toBe('transactions')
  })

  it('is idempotent (safe to call twice)', () => {
    const db = new Database(':memory:')
    expect(() => {
      initDb(db)
      initDb(db)
    }).not.toThrow()
  })
})
