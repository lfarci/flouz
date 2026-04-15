import { describe, it, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, openDatabase } from './schema'

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

describe('openDatabase', () => {
  it('returns a database with all tables created', () => {
    const db = openDatabase(':memory:')
    const tables = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map(row => row.name)
    expect(tables).toContain('categories')
    expect(tables).toContain('transactions')
    expect(tables).toContain('accounts')
    db.close()
  })

  it('seeds categories on open', () => {
    const db = openDatabase(':memory:')
    const count = db.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM categories').get()
    expect(count?.count).toBeGreaterThan(0)
    db.close()
  })
})
