import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { upsertAccountBalanceSnapshot } from './mutations'
import {
  getBalanceSnapshotForDate,
  getBalanceSnapshots,
  getEarliestBalanceSnapshotOnOrAfter,
  getLatestBalanceSnapshotOnOrBefore,
  hasBalanceSnapshotsForAccount,
} from './queries'
import { createAccountBalanceSnapshotsTable } from './schema'

let database: Database
let accountId: number
let savingsAccountId: number

beforeEach(() => {
  database = new Database(':memory:')
  createAccountsTable(database)
  createAccountBalanceSnapshotsTable(database)
  accountId = insertAccount(database, {
    key: 'checking',
    company: 'Provider One',
    name: 'Main account',
  })
  savingsAccountId = insertAccount(database, {
    key: 'savings',
    company: 'Provider One',
    name: 'Savings account',
  })
})

describe('account balance snapshot queries', () => {
  beforeEach(() => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-01',
      amount: 1000,
      currency: 'EUR',
    })
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-10',
      amount: 1100,
      currency: 'EUR',
      note: 'Statement',
    })
    upsertAccountBalanceSnapshot(database, {
      accountId: savingsAccountId,
      date: '2026-06-05',
      amount: 5000,
      currency: 'EUR',
    })
  })

  it('returns an exact snapshot for account and date', () => {
    const snapshot = getBalanceSnapshotForDate(database, accountId, '2026-06-10')

    expect(snapshot).toMatchObject({
      accountId,
      date: '2026-06-10',
      amount: 1100,
      note: 'Statement',
    })
  })

  it('returns undefined when exact snapshot is missing', () => {
    const snapshot = getBalanceSnapshotForDate(database, accountId, '2026-06-09')

    expect(snapshot).toBeUndefined()
  })

  it('returns the latest snapshot on or before the date', () => {
    const snapshot = getLatestBalanceSnapshotOnOrBefore(database, accountId, '2026-06-09')

    expect(snapshot?.date).toBe('2026-06-01')
  })

  it('returns the earliest snapshot on or after the date', () => {
    const snapshot = getEarliestBalanceSnapshotOnOrAfter(database, accountId, '2026-06-02')

    expect(snapshot?.date).toBe('2026-06-10')
  })

  it('lists snapshots with account and date filters', () => {
    const snapshots = getBalanceSnapshots(database, {
      accountId,
      from: '2026-06-02',
      to: '2026-06-30',
    })

    expect(snapshots.map((snapshot) => snapshot.date)).toEqual(['2026-06-10'])
  })

  it('detects whether an account has balance snapshots', () => {
    expect({
      checking: hasBalanceSnapshotsForAccount(database, accountId),
      missing: hasBalanceSnapshotsForAccount(database, 999),
    }).toEqual({
      checking: true,
      missing: false,
    })
  })
})
