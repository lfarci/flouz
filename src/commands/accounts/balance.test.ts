import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  collectCommandOutcome,
  createCommandTestDatabase,
  createOpenDatabaseMock,
  createProcessExitMock,
  getArgumentSetup,
  restoreProcessExit,
  runCommandSilently,
  setProcessExit,
} from '@/commands/test-helpers'
import { insertAccount } from '@/db/accounts/mutations'
import { createAccountsTable } from '@/db/accounts/schema'
import { upsertAccountBalanceSnapshot } from '@/db/account_balance_snapshots/mutations'
import { createAccountBalanceSnapshotsTable } from '@/db/account_balance_snapshots/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { createTransactionsTable } from '@/db/transactions/schema'
import type { createBalanceAccountsCommand as CreateBalanceAccountsCommand } from './balance'

const infoLogMock = mock((message: string) => message)
const errorLogMock = mock((message: string) => message)
const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@clack/prompts', () => ({
  log: {
    info: infoLogMock,
    error: errorLogMock,
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

type BalanceSummary = {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createBalanceAccountsCommand: typeof CreateBalanceAccountsCommand
let originalProcessExit: typeof process.exit
const processExitMock = createProcessExitMock()

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createAccountsTable(database)
    createAccountBalanceSnapshotsTable(database)
    createTransactionsTable(database)
  })
}

async function runBalanceCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createBalanceAccountsCommand('default.db'), argumentsList)
}

async function collectBalanceOutcome(argumentsList: string[]): Promise<BalanceSummary> {
  return await collectCommandOutcome<BalanceSummary>(
    () => runBalanceCommand(argumentsList),
    () => ({ status: 'resolved' }),
    (errorCode) => ({ status: 'rejected', errorCode }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createBalanceAccountsCommand } = await import('./balance'))
})

beforeEach(() => {
  infoLogMock.mockClear()
  errorLogMock.mockClear()
  openDatabaseMock.mockReset()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createBalanceAccountsCommand', () => {
  it('creates the balance command', () => {
    const command = createBalanceAccountsCommand('flouz.db')

    expect(command.name()).toBe('balance')
  })

  it('registers the key argument', () => {
    const command = createBalanceAccountsCommand('flouz.db')

    expect(getArgumentSetup(command, 0)).toEqual({
      name: 'key',
      required: true,
      description: 'account key',
      variadic: false,
    })
  })
})

describe('balanceAccountAction', () => {
  it('prints a derived account balance', async () => {
    const { database, handle } = createInMemoryDatabase()
    const accountId = insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
    upsertAccountBalanceSnapshot(database, {
      accountId,
      date: '2026-06-01',
      amount: 1000,
      currency: 'EUR',
    })
    insertTransaction(database, {
      date: '2026-06-02',
      amount: -25,
      counterparty: 'ACME Shop',
      currency: 'EUR',
      accountId,
      importedAt: '2026-06-04T00:00:00.000Z',
    })
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectBalanceOutcome(['checking', '--date', '2026-06-02'])

    expect({
      summary,
      messages: infoLogMock.mock.calls.map((call) => call[0]),
    }).toEqual({
      summary: { status: 'resolved' },
      messages: ['checking balance on 2026-06-02: 975.00 EUR (snapshot 2026-06-01)'],
    })
  })

  it('fails clearly when no snapshot exists', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectBalanceOutcome(['checking', '--date', '2026-06-02'])

    expect({
      summary,
      errors: errorLogMock.mock.calls.map((call) => call[0]),
    }).toEqual({
      summary: { status: 'rejected', errorCode: 1 },
      errors: ['No balance snapshot found for account 1'],
    })
  })
})
