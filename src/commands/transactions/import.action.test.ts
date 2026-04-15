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
import { insertAccount } from '@/db/accounts/mutations'
import type { createImportCommand as CreateImportCommand } from './import'

const FIXTURE = `${import.meta.dir}/../../parsers/__fixtures__/minimal.csv`
const FIXTURES_DIR = `${import.meta.dir}/../../parsers/__fixtures__`

const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const introMock = mock((_message: string) => {})
const outroMock = mock((_message: string) => {})
const cancelMock = mock((_message: string) => {})
const logErrorMock = mock((_message: string) => {})
const logWarnMock = mock((_message: string) => {})
const logInfoMock = mock((_message: string) => {})
const spinnerStartMock = mock((_message: string) => {})
const spinnerMessageMock = mock((_message: string) => {})
const spinnerStopMock = mock((_message: string) => {})
const spinnerMock = mock(() => ({
  start: spinnerStartMock,
  message: spinnerMessageMock,
  stop: spinnerStopMock,
}))
const progressStartMock = mock((_message: string) => {})
const progressAdvanceMock = mock((_amount: number, _message: string) => {})
const progressStopMock = mock((_message: string) => {})
const progressErrorMock = mock((_message: string) => {})
const progressMock = mock(() => ({
  start: progressStartMock,
  advance: progressAdvanceMock,
  stop: progressStopMock,
  error: progressErrorMock,
}))

void mock.module('@clack/prompts', () => ({
  intro: introMock,
  outro: outroMock,
  cancel: cancelMock,
  spinner: spinnerMock,
  progress: progressMock,
  log: {
    error: logErrorMock,
    warn: logWarnMock,
    info: logInfoMock,
  },
}))

const processExitMock = createProcessExitMock()
let createImportCommand: typeof CreateImportCommand
let originalProcessExit: typeof process.exit

function createInMemoryDatabase() {
  return createCommandTestDatabase(database => {
    createCategoriesTable(database)
    createAccountsTable(database)
    createTransactionsTable(database)
    createTransactionCategorySuggestionsTable(database)
    seedCategories(database)
    insertAccount(database, { key: 'checking', name: 'Main account', company: 'Test Bank' })
  })
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createImportCommand } = await import('./import'))
})

beforeEach(() => {
  openDatabaseMock.mockReset()
  introMock.mockClear()
  outroMock.mockClear()
  logErrorMock.mockClear()
  logWarnMock.mockClear()
  logInfoMock.mockClear()
  spinnerStartMock.mockClear()
  spinnerStopMock.mockClear()
  progressStartMock.mockClear()
  progressStopMock.mockClear()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

type ImportOutcome = { status: 'resolved' } | { status: 'rejected'; errorCode: number | undefined }

describe('importAction — non-existent path', () => {
  it('logs an error and exits with code 1 for a missing path', async () => {
    const summary = await collectCommandOutcome<ImportOutcome>(
      async () => {
        const command = createImportCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync(['/non/existent/path.csv'], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
    expect(logErrorMock).toHaveBeenCalled()
  })
})

describe('importAction — empty directory', () => {
  it('warns and exits with code 0 when no CSV files exist in the directory', async () => {
    const tmpDir = await import('node:os').then(os => os.tmpdir())

    const summary = await collectCommandOutcome<ImportOutcome>(
      async () => {
        const command = createImportCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync([tmpDir], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 0 })
    expect(logWarnMock).toHaveBeenCalled()
  })
})

describe('importAction — successful import from fixture file', () => {
  it('imports transactions from a CSV file and reports the count', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectCommandOutcome<ImportOutcome>(
      async () => {
        const command = createImportCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync([FIXTURE], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'resolved' })
    expect(outroMock).toHaveBeenCalled()
    expect((outroMock.mock.calls[0][0] as string)).toContain('imported')
  })

  it('imports all CSV files from a directory', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectCommandOutcome<ImportOutcome>(
      async () => {
        const command = createImportCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync([FIXTURES_DIR], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      errorCode => ({ status: 'rejected', errorCode })
    )

    expect(summary).toEqual({ status: 'resolved' })
  })
})
