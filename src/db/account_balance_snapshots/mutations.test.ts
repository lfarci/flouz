import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { upsertAccountBalanceSnapshot } from './mutations'
import { createAccountBalanceSnapshotsTable } from './schema'

let database: Database
let accountId: number

beforeEach(() => {
  database = new Database(':memory:')
  createAccountsTable(database)
  createAccountBalanceSnapshotsTable(database)
  accountId = insertAccount(database, {
    key: 'checking',
    company: 'Provider One',
    name: 'Main account',
  })
})

describe('upsertAccountBalanceSnapshot', () => {
  it('inserts a new snapshot row', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-04',
      amount: 1250,
      currency: 'EUR',
      note: 'Statement balance',
    })

    const row = database.prepare('SELECT * FROM account_balance_snapshots').get() as Record<string, unknown>
    expect(row).toMatchObject({
      account_id: accountId,
      date: '2026-06-04',
      amount: 1250,
      currency: 'EUR',
      note: 'Statement balance',
    })
  })

  it('updates amount, currency, and note for the same account and date', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-04',
      amount: 1250,
      currency: 'EUR',
    })
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-04',
      amount: 1300,
      currency: 'USD',
      note: 'Corrected',
    })

    const rows = database.prepare('SELECT * FROM account_balance_snapshots').all() as Record<string, unknown>[]
    expect(rows).toMatchObject([
      {
        account_id: accountId,
        date: '2026-06-04',
        amount: 1300,
        currency: 'USD',
        note: 'Corrected',
      },
    ])
  })

  it('stores undefined note as null', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-04',
      amount: 1250,
      currency: 'EUR',
    })

    const row = database.prepare('SELECT note FROM account_balance_snapshots').get() as { note: string | null }
    expect(row.note).toBeNull()
  })
})
