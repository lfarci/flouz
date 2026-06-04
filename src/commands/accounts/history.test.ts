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
import type {
  createHistoryAccountsCommand as CreateHistoryAccountsCommand,
  parseHistoryOutputFormat as ParseHistoryOutputFormat,
} from './history'

const messageLogMock = mock((message: string[] | string, options?: { spacing?: number; withGuide?: boolean }) => ({
  message,
  options,
}))
const infoLogMock = mock((message: string) => message)
const errorLogMock = mock((message: string) => message)
const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@clack/prompts', () => ({
  log: {
    message: messageLogMock,
    info: infoLogMock,
    error: errorLogMock,
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

type HistorySummary = {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createHistoryAccountsCommand: typeof CreateHistoryAccountsCommand
let parseHistoryOutputFormat: typeof ParseHistoryOutputFormat
let originalProcessExit: typeof process.exit
const processExitMock = createProcessExitMock()

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createAccountsTable(database)
    createAccountBalanceSnapshotsTable(database)
    createTransactionsTable(database)
  })
}

async function runHistoryCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createHistoryAccountsCommand('default.db'), argumentsList)
}

async function collectHistoryOutcome(argumentsList: string[]): Promise<HistorySummary> {
  return await collectCommandOutcome<HistorySummary>(
    () => runHistoryCommand(argumentsList),
    () => ({ status: 'resolved' }),
    (errorCode) => ({ status: 'rejected', errorCode }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createHistoryAccountsCommand, parseHistoryOutputFormat } = await import('./history'))
})

beforeEach(() => {
  messageLogMock.mockClear()
  infoLogMock.mockClear()
  errorLogMock.mockClear()
  openDatabaseMock.mockReset()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createHistoryAccountsCommand', () => {
  it('creates the history command with an optional key argument', () => {
    const command = createHistoryAccountsCommand('flouz.db')

    expect({
      name: command.name(),
      argument: getArgumentSetup(command, 0),
    }).toEqual({
      name: 'history',
      argument: {
        name: 'key',
        required: false,
        description: 'account key',
        variadic: false,
      },
    })
  })

  it('parses supported output formats', () => {
    expect(['table', 'csv', 'json'].map(parseHistoryOutputFormat)).toEqual(['table', 'csv', 'json'])
  })
})

describe('historyAccountAction', () => {
  it('prints daily derived balance history for one account', async () => {
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

    const summary = await collectHistoryOutcome(['checking', '--from', '2026-06-01', '--to', '2026-06-02'])
    const tableText = (messageLogMock.mock.calls[0][0] as string[]).join('\n')

    expect({
      summary,
      hasChecking: tableText.includes('checking'),
      hasDerivedBalance: tableText.includes('975.00 EUR'),
    }).toEqual({
      summary: { status: 'resolved' },
      hasChecking: true,
      hasDerivedBalance: true,
    })
  })

  it('rejects an invalid date range', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectHistoryOutcome(['--from', '2026-06-03', '--to', '2026-06-01'])

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
  })
})
