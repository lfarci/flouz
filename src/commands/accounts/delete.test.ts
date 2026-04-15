import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test'
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
import { countAccounts, getAccountByKey } from '@/db/accounts/queries'
import { createAccountsTable } from '@/db/accounts/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from '@/db/transactions/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import type { Account } from '@/types'
import type { createDeleteAccountsCommand as CreateDeleteAccountsCommand } from './delete'

const successLogMock = mock(() => {})
const errorLogMock = mock(() => {})

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

const processExitMock = createProcessExitMock()

interface DeleteSummary {
  status: 'resolved' | 'rejected'
  errorCode?: number
  account?: Account
  accountCount: number
}

type DeleteOutcomeFactory = () => DeleteSummary

type RejectedDeleteOutcomeFactory = (
  errorCode: number | undefined,
) => DeleteSummary

type LogMessage = [message?: string, ...details: unknown[]]

function getLoggedMessages(logMock: {
  mock: { calls: LogMessage[] }
}): string[] {
  return logMock.mock.calls.flatMap((call) => {
    const [message] = call
    return typeof message === 'string' ? [message] : []
  })
}

let createDeleteAccountsCommand: typeof CreateDeleteAccountsCommand
let originalProcessExit: typeof process.exit

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    createAccountsTable(database)
    createTransactionsTable(database)
  })
}

async function runDeleteCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(
    createDeleteAccountsCommand('default.db'),
    argumentsList,
  )
}

async function collectDeleteCommandOutcome(
  database: Database,
  argumentsList: string[],
  accountKey?: string,
): Promise<DeleteSummary> {
  const account = () =>
    accountKey === undefined ? undefined : getAccountByKey(database, accountKey)

  return await collectCommandOutcome(
    () => runDeleteCommand(argumentsList),
    (() => ({
      status: 'resolved',
      account: account(),
      accountCount: countAccounts(database),
    })) as DeleteOutcomeFactory,
    ((errorCode: number | undefined) => ({
      status: 'rejected',
      errorCode,
      account: account(),
      accountCount: countAccounts(database),
    })) as RejectedDeleteOutcomeFactory,
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createDeleteAccountsCommand } = await import('./delete'))
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

describe('createDeleteAccountsCommand', () => {
  it('creates the delete command', () => {
    const command = createDeleteAccountsCommand('flouz.db')

    expect(command.name()).toBe('delete')
  })

  it('registers the key argument', () => {
    const command = createDeleteAccountsCommand('flouz.db')

    expect(getArgumentSetup(command, 0)).toEqual({
      name: 'key',
      required: true,
      description: 'unique import key',
      variadic: false,
    })
  })

  it('registers the database option', () => {
    const command = createDeleteAccountsCommand('flouz.db')

    expect(command.options[0]?.long).toBe('--db')
  })
})

describe('deleteAccountAction', () => {
  it('rejects a missing key argument', async () => {
    await expect(runDeleteCommand([])).rejects.toMatchObject({
      code: 1,
      message: 'process.exit(1)',
    })
  })

  it('rejects a blank key argument', async () => {
    const { handle, closeMock } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectDeleteCommandOutcome(handle, ['   '])

    expect({
      summary,
      errorMessages: getLoggedMessages(errorLogMock),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: {
        status: 'rejected',
        errorCode: 1,
        account: undefined,
        accountCount: 0,
      },
      errorMessages: ['Account key cannot be empty'],
      closeCalls: 1,
    })
  })

  it('rejects an unknown key', async () => {
    const { database, handle, closeMock } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectDeleteCommandOutcome(database, ['missing'])

    expect({
      summary,
      errorMessages: getLoggedMessages(errorLogMock),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: {
        status: 'rejected',
        errorCode: 1,
        account: undefined,
        accountCount: 0,
      },
      errorMessages: ['Unknown account key: missing'],
      closeCalls: 1,
    })
  })

  it('rejects deleting an account referenced by transactions', async () => {
    const { database, handle, closeMock } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)
    const accountId = insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })

    insertTransaction(database, {
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'ACME Shop',
      currency: 'EUR',
      accountId,
      importedAt: '2026-01-15T10:00:00.000Z',
    })

    const summary = await collectDeleteCommandOutcome(
      database,
      ['checking'],
      'checking',
    )

    expect({
      summary,
      errorMessages: getLoggedMessages(errorLogMock),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: {
        status: 'rejected',
        errorCode: 1,
        account: {
          id: 1,
          key: 'checking',
          company: 'Provider One',
          name: 'Main account',
        },
        accountCount: 1,
      },
      errorMessages: [
        'Cannot delete account checking: it is referenced by transactions.',
      ],
      closeCalls: 1,
    })
  })

  it('deletes an account with a matching key', async () => {
    const { database, handle, closeMock } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)
    insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })

    const summary = await collectDeleteCommandOutcome(
      database,
      ['checking'],
      'checking',
    )

    expect({
      summary,
      successMessages: getLoggedMessages(successLogMock),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: {
        status: 'resolved',
        account: undefined,
        accountCount: 0,
      },
      successMessages: ['Deleted account checking'],
      closeCalls: 1,
    })
  })

  it('deletes an account after trimming surrounding whitespace from the key', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)
    insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })

    const summary = await collectDeleteCommandOutcome(
      database,
      ['  checking  '],
      'checking',
    )

    expect(summary).toEqual({
      status: 'resolved',
      account: undefined,
      accountCount: 0,
    })
  })
})
