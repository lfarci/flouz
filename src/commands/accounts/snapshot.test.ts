import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { type Database } from 'bun:sqlite'
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
import { getBalanceSnapshotForDate } from '@/db/account_balance_snapshots/queries'
import { createAccountBalanceSnapshotsTable } from '@/db/account_balance_snapshots/schema'
import type { AccountBalanceSnapshot } from '@/types'
import type { createSnapshotAccountsCommand as CreateSnapshotAccountsCommand } from './snapshot'

const successLogMock = mock((message: string) => message)
const errorLogMock = mock((message: string) => message)
const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@clack/prompts', () => ({
  log: {
    success: successLogMock,
    error: errorLogMock,
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

type SnapshotSummary = {
  status: 'resolved' | 'rejected'
  errorCode?: number
  snapshot?: AccountBalanceSnapshot
}

let createSnapshotAccountsCommand: typeof CreateSnapshotAccountsCommand
let originalProcessExit: typeof process.exit
const processExitMock = createProcessExitMock()

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createAccountsTable(database)
    createAccountBalanceSnapshotsTable(database)
  })
}

async function runSnapshotCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createSnapshotAccountsCommand('default.db'), argumentsList)
}

async function collectSnapshotOutcome(database: Database, argumentsList: string[]): Promise<SnapshotSummary> {
  return await collectCommandOutcome<SnapshotSummary>(
    () => runSnapshotCommand(argumentsList),
    () => ({
      status: 'resolved',
      snapshot: getBalanceSnapshotForDate(database, 1, '2026-06-04'),
    }),
    (errorCode) => ({
      status: 'rejected',
      errorCode,
      snapshot: getBalanceSnapshotForDate(database, 1, '2026-06-04'),
    }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createSnapshotAccountsCommand } = await import('./snapshot'))
})

beforeEach(() => {
  successLogMock.mockClear()
  errorLogMock.mockClear()
  openDatabaseMock.mockReset()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createSnapshotAccountsCommand', () => {
  it('creates the snapshot command', () => {
    const command = createSnapshotAccountsCommand('flouz.db')

    expect(command.name()).toBe('snapshot')
  })

  it('registers key and amount arguments', () => {
    const command = createSnapshotAccountsCommand('flouz.db')

    expect([getArgumentSetup(command, 0), getArgumentSetup(command, 1)]).toEqual([
      {
        name: 'key',
        required: true,
        description: 'account key',
        variadic: false,
      },
      {
        name: 'amount',
        required: true,
        description: 'account balance amount',
        variadic: false,
      },
    ])
  })
})

describe('snapshotAccountAction', () => {
  it('saves a balance snapshot for an existing account', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectSnapshotOutcome(database, [
      'checking',
      '1250.50',
      '--date',
      '2026-06-04',
      '--note',
      ' Statement balance ',
    ])

    expect(summary).toMatchObject({
      status: 'resolved',
      snapshot: {
        accountId: 1,
        date: '2026-06-04',
        amount: 1250.5,
        currency: 'EUR',
        note: 'Statement balance',
      },
    })
  })

  it('rejects an invalid amount before saving', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectSnapshotOutcome(database, ['checking', 'abc', '--date', '2026-06-04'])

    expect(summary).toEqual({
      status: 'rejected',
      errorCode: 1,
      snapshot: undefined,
    })
  })
})
