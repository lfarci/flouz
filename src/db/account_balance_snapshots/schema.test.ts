import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { createAccountBalanceSnapshotsTable } from './schema'

function createDatabase(): Database {
  const database = new Database(':memory:')
  database.run('PRAGMA foreign_keys = ON')
  createAccountsTable(database)
  createAccountBalanceSnapshotsTable(database)
  return database
}

function getColumnNames(database: Database): string[] {
  const rows = database.prepare("PRAGMA table_info('account_balance_snapshots')").all() as {
    name: string
  }[]
  return rows.map((row) => row.name)
}

describe('createAccountBalanceSnapshotsTable', () => {
  it('creates account balance snapshots table', () => {
    const database = createDatabase()

    const row = database
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='account_balance_snapshots'",
      )
      .get()

    expect(row?.name).toBe('account_balance_snapshots')
  })

  it('is idempotent', () => {
    const database = createDatabase()

    expect(() => createAccountBalanceSnapshotsTable(database)).not.toThrow()
  })

  it('creates all expected columns', () => {
    const database = createDatabase()

    expect(getColumnNames(database)).toEqual([
      'id',
      'account_id',
      'date',
      'amount',
      'currency',
      'note',
      'created_at',
      'updated_at',
    ])
  })

  it('creates an account date index', () => {
    const database = createDatabase()

    const row = database
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_account_balance_snapshots_account_date'",
      )
      .get()

    expect(row?.name).toBe('idx_account_balance_snapshots_account_date')
  })

  it('rejects duplicate snapshots for the same account and date', () => {
    const database = createDatabase()
    const accountId = insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })

    database
      .prepare(
        `
        INSERT INTO account_balance_snapshots (account_id, date, amount, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(accountId, '2026-06-04', 1000, 'EUR', '2026-06-04T00:00:00.000Z', '2026-06-04T00:00:00.000Z')

    expect(() =>
      database
        .prepare(
          `
          INSERT INTO account_balance_snapshots (account_id, date, amount, currency, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        )
        .run(accountId, '2026-06-04', 1100, 'EUR', '2026-06-04T00:00:00.000Z', '2026-06-04T00:00:00.000Z'),
    ).toThrow()
  })

  it('enforces account foreign keys', () => {
    const database = createDatabase()

    expect(() =>
      database
        .prepare(
          `
          INSERT INTO account_balance_snapshots (account_id, date, amount, currency, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        )
        .run(999, '2026-06-04', 1000, 'EUR', '2026-06-04T00:00:00.000Z', '2026-06-04T00:00:00.000Z'),
    ).toThrow()
  })

  it('allows negative balances for overdrafts', () => {
    const database = createDatabase()
    const accountId = insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })

    database
      .prepare(
        `
        INSERT INTO account_balance_snapshots (account_id, date, amount, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(accountId, '2026-06-04', -100, 'EUR', '2026-06-04T00:00:00.000Z', '2026-06-04T00:00:00.000Z')

    const row = database.prepare('SELECT amount FROM account_balance_snapshots').get() as { amount: number }
    expect(row.amount).toBe(-100)
  })
})
