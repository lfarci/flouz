import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { createTransactionsTable } from '@/db/transactions/schema'
import { upsertAccountBalanceSnapshot } from './mutations'
import { getBalanceHistory, getDerivedAccountBalance } from './derived'
import { createAccountBalanceSnapshotsTable } from './schema'

let database: Database
let accountId: number
let otherAccountId: number

beforeEach(() => {
  database = new Database(':memory:')
  createAccountsTable(database)
  createAccountBalanceSnapshotsTable(database)
  createTransactionsTable(database)
  accountId = insertAccount(database, {
    key: 'checking',
    company: 'Provider One',
    name: 'Main account',
  })
  otherAccountId = insertAccount(database, {
    key: 'savings',
    company: 'Provider One',
    name: 'Savings account',
  })
})

function addTransaction(date: string, amount: number, targetAccountId = accountId): void {
  insertTransaction(database, {
    date,
    amount,
    counterparty: 'ACME Shop',
    currency: 'EUR',
    accountId: targetAccountId,
    importedAt: '2026-06-04T00:00:00.000Z',
  })
}

describe('getDerivedAccountBalance', () => {
  it('returns exact snapshot balance on the snapshot date', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-01',
      amount: 1000,
      currency: 'EUR',
    })
    addTransaction('2026-06-01', -50)

    const balance = getDerivedAccountBalance(database, accountId, '2026-06-01')

    expect(balance).toMatchObject({
      accountId,
      date: '2026-06-01',
      amount: 1000,
      snapshotDate: '2026-06-01',
      direction: 'exact',
    })
  })

  it('derives forward from a prior snapshot', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-01',
      amount: 1000,
      currency: 'EUR',
    })
    addTransaction('2026-06-02', -25)
    addTransaction('2026-06-03', 100)

    const balance = getDerivedAccountBalance(database, accountId, '2026-06-03')

    expect(balance).toMatchObject({
      amount: 1075,
      snapshotDate: '2026-06-01',
      direction: 'forward',
    })
  })

  it('derives reverse from a future snapshot', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-10',
      amount: 1000,
      currency: 'EUR',
    })
    addTransaction('2026-06-09', -50)
    addTransaction('2026-06-10', 20)

    const balance = getDerivedAccountBalance(database, accountId, '2026-06-08')

    expect(balance).toMatchObject({
      amount: 1030,
      snapshotDate: '2026-06-10',
      direction: 'reverse',
    })
  })

  it('ignores transactions from other accounts and unassigned transactions', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-01',
      amount: 1000,
      currency: 'EUR',
    })
    addTransaction('2026-06-02', -25)
    addTransaction('2026-06-02', -200, otherAccountId)
    insertTransaction(database, {
      date: '2026-06-02',
      amount: -300,
      counterparty: 'Unassigned Merchant',
      currency: 'EUR',
      importedAt: '2026-06-04T00:00:00.000Z',
    })

    const balance = getDerivedAccountBalance(database, accountId, '2026-06-02')

    expect(balance.amount).toBe(975)
  })

  it('throws when the account has no snapshots', () => {
    expect(() => getDerivedAccountBalance(database, accountId, '2026-06-04')).toThrow(
      'No balance snapshot found for account',
    )
  })
})

describe('getBalanceHistory', () => {
  it('returns daily points for the inclusive range', () => {
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-01',
      amount: 1000,
      currency: 'EUR',
    })
    addTransaction('2026-06-02', -25)

    const history = getBalanceHistory(database, {
      accountId,
      from: '2026-06-01',
      to: '2026-06-03',
    })

    expect(history.map((point) => ({ date: point.date, amount: point.amount }))).toEqual([
      { date: '2026-06-01', amount: 1000 },
      { date: '2026-06-02', amount: 975 },
      { date: '2026-06-03', amount: 975 },
    ])
  })
})
