import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createAccountsTable } from './schema'

function getColumnNames(db: Database): string[] {
  const rows = db.prepare("PRAGMA table_info('accounts')").all() as {
    name: string
  }[]
  return rows.map((row) => row.name)
}

describe('createAccountsTable', () => {
  it('creates accounts table', () => {
    const db = new Database(':memory:')

    createAccountsTable(db)

    const row = db
      .query<
        { name: string },
        []
      >("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
      .get()
    expect(row?.name).toBe('accounts')
  })

  it('is idempotent', () => {
    const db = new Database(':memory:')

    expect(() => {
      createAccountsTable(db)
      createAccountsTable(db)
    }).not.toThrow()
  })

  it('creates all expected columns', () => {
    const db = new Database(':memory:')

    createAccountsTable(db)

    expect(getColumnNames(db)).toEqual([
      'id',
      'key',
      'company',
      'name',
      'description',
      'iban',
    ])
  })

  it('creates a unique key index', () => {
    const db = new Database(':memory:')

    createAccountsTable(db)

    const row = db
      .query<
        { name: string },
        []
      >("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_accounts_key'")
      .get()
    expect(row?.name).toBe('idx_accounts_key')
  })
})
