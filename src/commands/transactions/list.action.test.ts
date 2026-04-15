import { mock, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import {
  collectCommandOutcome,
  createCommandTestDatabase,
  createOpenDatabaseMock,
  createProcessExitMock,
  restoreProcessExit,
  setProcessExit,
} from '@/commands/test-helpers'
import { seedCategories } from '@/db/categories/seed'
import { createCategoriesTable } from '@/db/categories/schema'
import { createAccountsTable } from '@/db/accounts/schema'
import { createTransactionsTable } from '@/db/transactions/schema'
import { createTransactionCategorySuggestionsTable } from '@/db/transaction_category_suggestions/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import type { createListCommand as CreateListCommand } from './list'

// Use an existing file as db path so ensureDatabaseExists does not throw.
const EXISTING_PATH = `${import.meta.dir}/../../parsers/__fixtures__/minimal.csv`

const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const cancelMock = mock((_message: string) => {})
const logErrorMock = mock((_message: string) => {})
const logInfoMock = mock((_message: string) => {})

void mock.module('@clack/prompts', () => ({
  cancel: cancelMock,
  log: {
    error: logErrorMock,
    info: logInfoMock,
  },
}))

const writeStdoutMock = mock(async (_text: string) => {})

void mock.module('@/cli/stdout', () => ({
  writeStdout: writeStdoutMock,
  isBrokenPipeError: (error: unknown): boolean =>
    error instanceof Error && (error as NodeJS.ErrnoException).code === 'EPIPE',
}))

const processExitMock = createProcessExitMock()
let createListCommand: typeof CreateListCommand
let originalProcessExit: typeof process.exit

const baseTransaction = {
  date: '2026-01-15',
  amount: -42.5,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

function createInMemoryDatabase() {
  return createCommandTestDatabase(database => {
    createCategoriesTable(database)
    createAccountsTable(database)
    createTransactionsTable(database)
    createTransactionCategorySuggestionsTable(database)
    seedCategories(database)
  })
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createListCommand } = await import('./list'))
})

beforeEach(() => {
  openDatabaseMock.mockReset()
  writeStdoutMock.mockClear()
  logErrorMock.mockClear()
  logInfoMock.mockClear()
  cancelMock.mockClear()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

type ListOutcome = { status: 'resolved' } | { status: 'rejected'; errorCode: number | undefined }

describe('listAction — non-existent database', () => {
  it('logs an error and exits with code 1 when the database file does not exist', async () => {
    const summary = await collectCommandOutcome<ListOutcome>(
      async () => {
        const command = createListCommand('/no/such/file.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--db', '/no/such/file.db'], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
    expect(logErrorMock).toHaveBeenCalled()
  })
})

describe('listAction — empty result in table mode', () => {
  it('logs an info message when no transactions are found', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--db', EXISTING_PATH], { from: 'user' })
      },
      () => undefined,
      () => undefined
    )

    expect(logInfoMock).toHaveBeenCalled()
    expect(logInfoMock.mock.calls[0][0]).toContain('No transactions found')
  })
})

describe('listAction — table output', () => {
  it('writes the table to stdout when transactions exist', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--db', EXISTING_PATH], { from: 'user' })
      },
      () => undefined,
      () => undefined
    )

    expect(writeStdoutMock).toHaveBeenCalled()
    expect(writeStdoutMock.mock.calls[0][0]).toContain('ACME Shop')
  })
})

describe('listAction — csv output', () => {
  it('writes CSV lines to stdout', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--output', 'csv', '--db', EXISTING_PATH], { from: 'user' })
      },
      () => undefined,
      () => undefined
    )

    expect(writeStdoutMock).toHaveBeenCalled()
    const output = writeStdoutMock.mock.calls[0][0] as string
    expect(output).toContain('date,amount,counterparty')
    expect(output).toContain('ACME Shop')
  })
})

describe('listAction — json output', () => {
  it('writes JSON to stdout', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--output', 'json', '--db', EXISTING_PATH], { from: 'user' })
      },
      () => undefined,
      () => undefined
    )

    expect(writeStdoutMock).toHaveBeenCalled()
    const output = writeStdoutMock.mock.calls[0][0] as string
    const parsed = JSON.parse(output) as unknown[]
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
  })
})

describe('listAction — --limit option', () => {
  it('returns only the requested number of transactions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    insertTransaction(database, { ...baseTransaction, date: '2026-01-16', counterparty: 'Test Shop' })
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--limit', '1', '--output', 'json', '--db', EXISTING_PATH], { from: 'user' })
      },
      () => undefined,
      () => undefined
    )

    const output = writeStdoutMock.mock.calls[0][0] as string
    const parsed = JSON.parse(output) as unknown[]
    expect(parsed).toHaveLength(1)
  })

  it('exits with code 1 when --limit is not a positive integer', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectCommandOutcome<ListOutcome>(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--limit', 'bad', '--db', EXISTING_PATH], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
  })
})

describe('listAction — openDatabase error', () => {
  it('logs an error and exits with code 1 when the database cannot be opened', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB corrupt')
    })

    const summary = await collectCommandOutcome<ListOutcome>(
      async () => {
        const command = createListCommand(EXISTING_PATH)
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['--db', EXISTING_PATH], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
    expect(logErrorMock).toHaveBeenCalled()
  })
})
