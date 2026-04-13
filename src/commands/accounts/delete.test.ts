import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { countAccounts, getAccountByKey } from '@/db/accounts/queries'
import { createAccountsTable } from '@/db/accounts/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from '@/db/transactions/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import type { Account } from '@/types'

const successLogMock = mock(() => {})
const errorLogMock = mock(() => {})

let openDatabaseMock = mock((dbPath: string) => {
  throw new Error(`openDatabase mock not configured for ${dbPath}`)
})

mock.module('@clack/prompts', () => ({
  log: {
    success: successLogMock,
    error: errorLogMock,
  },
}))

mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

class ProcessExitError extends Error {
  constructor(readonly code: number) {
    super(`process.exit(${code})`)
  }
}

const processExitMock = mock((code?: number) => {
  throw new ProcessExitError(code ?? 0)
})

type DeleteModule = typeof import('./delete')

type InMemoryDatabase = {
  database: Database
  closeMock: ReturnType<typeof mock>
  handle: Database
}

type DeleteSummary = {
  status: 'resolved' | 'rejected'
  errorCode?: number
  account?: Account
  accountCount: number
}

type ArgumentSetup = {
  name: string
  required: boolean
  description?: string
  variadic: boolean
}

let createDeleteAccountsCommand: DeleteModule['createDeleteAccountsCommand']
let originalProcessExit: typeof process.exit

function createInMemoryDatabase(): InMemoryDatabase {
  const database = new Database(':memory:')
  createCategoriesTable(database)
  createAccountsTable(database)
  createTransactionsTable(database)
  const closeMock = mock(() => {})

  const handle = {
    prepare: database.prepare.bind(database),
    close: closeMock,
  } as Database

  return { database, closeMock, handle }
}

async function runDeleteCommand(argumentsList: string[]): Promise<void> {
  const command = createDeleteAccountsCommand('default.db')
  command.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  })
  await command.parseAsync(argumentsList, { from: 'user' })
}

async function collectDeleteCommandOutcome(
  database: Database,
  argumentsList: string[],
  accountKey?: string
): Promise<DeleteSummary> {
  try {
    await runDeleteCommand(argumentsList)

    return {
      status: 'resolved',
      account: accountKey === undefined ? undefined : getAccountByKey(database, accountKey),
      accountCount: countAccounts(database),
    }
  } catch (error) {
    const errorCode = error instanceof ProcessExitError ? error.code : undefined

    return {
      status: 'rejected',
      errorCode,
      account: accountKey === undefined ? undefined : getAccountByKey(database, accountKey),
      accountCount: countAccounts(database),
    }
  }
}

function getArgumentSetup(
  command: ReturnType<typeof createDeleteAccountsCommand>,
  index: number
): ArgumentSetup | undefined {
  const argument = command.registeredArguments[index]

  if (argument === undefined) {
    return undefined
  }

  return {
    name: argument.name(),
    required: argument.required,
    description: argument.description,
    variadic: argument.variadic,
  }
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

  Object.defineProperty(process, 'exit', {
    value: processExitMock,
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  Object.defineProperty(process, 'exit', {
    value: originalProcessExit,
    configurable: true,
    writable: true,
  })
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
      errorMessages: errorLogMock.mock.calls.map(call => call[0]),
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
      errorMessages: errorLogMock.mock.calls.map(call => call[0]),
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

    const summary = await collectDeleteCommandOutcome(database, ['checking'], 'checking')

    expect({
      summary,
      errorMessages: errorLogMock.mock.calls.map(call => call[0]),
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
      errorMessages: ['Cannot delete account checking: it is referenced by transactions.'],
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

    const summary = await collectDeleteCommandOutcome(database, ['checking'], 'checking')

    expect({
      summary,
      successMessages: successLogMock.mock.calls.map(call => call[0]),
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

    const summary = await collectDeleteCommandOutcome(database, ['  checking  '], 'checking')

    expect(summary).toEqual({
      status: 'resolved',
      account: undefined,
      accountCount: 0,
    })
  })
})
