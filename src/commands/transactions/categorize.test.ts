import {
  mock,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import type { Database } from 'bun:sqlite'
import {
  collectCommandOutcome,
  createCommandTestDatabase,
  createOpenDatabaseMock,
  createProcessExitMock,
  restoreProcessExit,
  runCommandSilently,
  setProcessExit,
} from '@/commands/test-helpers'
import { seedCategories } from '@/db/categories/seed'
import { createCategoriesTable } from '@/db/categories/schema'
import { createAccountsTable } from '@/db/accounts/schema'
import { createTransactionsTable } from '@/db/transactions/schema'
import { createTransactionCategorySuggestionsTable } from '@/db/transaction_category_suggestions/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import type { createCategorizeCommand as CreateCategorizeCommand } from './categorize'

const categorizeTransactionMock = mock(() =>
  Promise.resolve({
    categoryId: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
    confidence: 0.9,
    model: 'openai/gpt-4o-mini',
  }),
)

void mock.module('@/ai/categorize', () => ({
  categorizeTransaction: categorizeTransactionMock,
}))

const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const introMock = mock((_message: string) => {})
const outroMock = mock((_message: string) => {})
const cancelMock = mock((_message: string) => {})
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

void mock.module('@clack/prompts', () => ({
  intro: introMock,
  outro: outroMock,
  cancel: cancelMock,
  spinner: spinnerMock,
  log: {
    warn: logWarnMock,
    info: logInfoMock,
    error: mock((_message: string) => {}),
  },
}))

const processExitMock = createProcessExitMock()
let createCategorizeCommand: typeof CreateCategorizeCommand
let originalProcessExit: typeof process.exit

const baseTransaction = {
  date: '2026-01-15',
  amount: -42.5,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    createAccountsTable(database)
    createTransactionsTable(database)
    createTransactionCategorySuggestionsTable(database)
    seedCategories(database)
  })
}

async function runCategorizeCommand(
  database: Database,
  argumentsList: string[],
): Promise<void> {
  openDatabaseMock.mockReturnValue(database)
  await runCommandSilently(createCategorizeCommand('default.db'), argumentsList)
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createCategorizeCommand } = await import('./categorize'))
})

beforeEach(() => {
  categorizeTransactionMock.mockReset()
  categorizeTransactionMock.mockResolvedValue({
    categoryId: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
    confidence: 0.9,
    model: 'openai/gpt-4o-mini',
  })
  openDatabaseMock.mockReset()
  introMock.mockClear()
  outroMock.mockClear()
  logWarnMock.mockClear()
  logInfoMock.mockClear()
  spinnerStartMock.mockClear()
  spinnerStopMock.mockClear()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createCategorizeCommand', () => {
  it('creates the categorize command', () => {
    const command = createCategorizeCommand('flouz.db')
    expect(command.name()).toBe('categorize')
  })

  it('registers the --from option', () => {
    const command = createCategorizeCommand('flouz.db')
    expect(command.options.some((option) => option.long === '--from')).toBe(
      true,
    )
  })

  it('registers the --limit option', () => {
    const command = createCategorizeCommand('flouz.db')
    expect(command.options.some((option) => option.long === '--limit')).toBe(
      true,
    )
  })

  it('registers the --db option with the default path', () => {
    const command = createCategorizeCommand('my.db')
    const dbOption = command.options.find((option) => option.long === '--db')
    expect(dbOption?.defaultValue).toBe('my.db')
  })
})

describe('categorizeAction — no eligible transactions', () => {
  it('logs that no transactions are eligible and exits cleanly', async () => {
    const { handle } = createInMemoryDatabase()

    await collectCommandOutcome(
      () => runCategorizeCommand(handle, []),
      () => undefined,
      () => undefined,
    )

    expect(logInfoMock).toHaveBeenCalled()
    expect(logInfoMock.mock.calls[0][0]).toContain('No transactions')
  })
})

type CategorizeOutcome =
  | { status: 'resolved' }
  | { status: 'rejected'; errorCode: number | undefined }

describe('categorizeAction — with eligible transactions', () => {
  it('categorizes eligible transactions and reports the count', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)

    await collectCommandOutcome(
      () => runCategorizeCommand(handle, []),
      () => undefined,
      () => undefined,
    )

    expect(categorizeTransactionMock).toHaveBeenCalledTimes(1)
    expect(outroMock).toHaveBeenCalled()
  })

  it('shows a warning when the first categorization error occurs', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    categorizeTransactionMock.mockRejectedValue(new Error('AI timeout'))

    await collectCommandOutcome(
      () => runCategorizeCommand(handle, []),
      () => undefined,
      () => undefined,
    )

    expect(logWarnMock).toHaveBeenCalled()
    const message = logWarnMock.mock.calls[0][0]
    expect(message).toContain('AI timeout')
  })

  it('exits with code 1 when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('Cannot open DB')
    })

    const summary = await collectCommandOutcome<CategorizeOutcome>(
      () => runCommandSilently(createCategorizeCommand('default.db'), []),
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
  })
})

describe('categorizeAction — invalid --limit option', () => {
  it('exits with code 1 when --limit is not a positive integer', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectCommandOutcome<CategorizeOutcome>(
      () =>
        runCommandSilently(createCategorizeCommand('default.db'), [
          '--limit',
          'abc',
        ]),
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(summary).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('respects a valid --limit and processes only that many transactions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    insertTransaction(database, {
      ...baseTransaction,
      date: '2026-01-16',
      counterparty: 'Second Shop',
    })

    await collectCommandOutcome(
      () => runCategorizeCommand(handle, ['--limit', '1']),
      () => undefined,
      () => undefined,
    )

    expect(categorizeTransactionMock).toHaveBeenCalledTimes(1)
  })
})

describe('categorizeAction — no categories available', () => {
  it('warns and skips all transactions when no categories are seeded', async () => {
    const { database, handle } = createCommandTestDatabase((database) => {
      createCategoriesTable(database)
      createAccountsTable(database)
      createTransactionsTable(database)
      createTransactionCategorySuggestionsTable(database)
    })
    insertTransaction(database, baseTransaction)
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      () => runCommandSilently(createCategorizeCommand('default.db'), []),
      () => undefined,
      () => undefined,
    )

    expect(logWarnMock).toHaveBeenCalled()
    expect(categorizeTransactionMock).not.toHaveBeenCalled()
  })
})
