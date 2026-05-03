import { mock, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Database } from 'bun:sqlite'
import {
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
import {
  upsertTransactionCategorySuggestion,
  approveTransactionCategorySuggestion,
} from '@/db/transaction_category_suggestions/mutations'
import type { Command } from 'commander'

const CATEGORY_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'

const baseTransaction = {
  date: '2026-01-15',
  amount: -42.5,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const outroMock = mock((_message: string) => {})
const logInfoMock = mock((_message: string) => {})
const logWarnMock = mock((_message: string) => {})
const logErrorMock = mock((_message: string) => {})

void mock.module('@clack/prompts', () => ({
  intro: () => {},
  outro: outroMock,
  note: () => {},
  cancel: () => {},
  isCancel: () => false,
  select: () => Promise.resolve('quit'),
  text: () => Promise.resolve(''),
  log: {
    info: logInfoMock,
    warn: logWarnMock,
    error: logErrorMock,
    success: () => {},
  },
}))

const writeStdoutMock = mock((_output: string) => Promise.resolve())

void mock.module('@/cli/stdout', () => ({
  writeStdout: writeStdoutMock,
  isBrokenPipeError: () => false,
}))

const processExitMock = createProcessExitMock()
let createSuggestionsCommand: (defaultDb: string) => Command
let originalProcessExit: typeof process.exit

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    createAccountsTable(database)
    createTransactionsTable(database)
    createTransactionCategorySuggestionsTable(database)
    seedCategories(database)
  })
}

function seedSuggestion(database: Database, transactionId: number): void {
  upsertTransactionCategorySuggestion(database, {
    transactionId,
    categoryId: CATEGORY_ID,
    confidence: 0.9,
    model: 'test-model',
  })
}

function getLastId(database: Database): number {
  const row = database.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }
  return row.id
}

async function runSuggestionsCommand(database: Database, args: string[]): Promise<void> {
  openDatabaseMock.mockReturnValue(database)
  await runCommandSilently(createSuggestionsCommand('default.db'), args)
}

async function collectOutcome(run: () => Promise<void>): Promise<'resolved' | 'rejected'> {
  try {
    await run()
    return 'resolved'
  } catch {
    return 'rejected'
  }
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createSuggestionsCommand } = await import('./index'))
})

beforeEach(() => {
  openDatabaseMock.mockReset()
  outroMock.mockClear()
  logInfoMock.mockClear()
  logWarnMock.mockClear()
  logErrorMock.mockClear()
  writeStdoutMock.mockClear()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createSuggestionsCommand', () => {
  it('creates the suggestions command', () => {
    const command = createSuggestionsCommand('flouz.db')
    expect(command.name()).toBe('suggestions')
  })

  it('registers list, approve, reject, fix, apply, review subcommands', () => {
    const command = createSuggestionsCommand('flouz.db')
    const names = command.commands.map((c) => c.name())
    expect(names).toContain('list')
    expect(names).toContain('approve')
    expect(names).toContain('reject')
    expect(names).toContain('fix')
    expect(names).toContain('apply')
    expect(names).toContain('review')
  })
})

describe('suggestions list', () => {
  it('completes without error when no pending suggestions exist', async () => {
    const { handle } = createInMemoryDatabase()

    await runSuggestionsCommand(handle, ['list'])
  })

  it('runs without error when pending suggestions exist', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)

    await runSuggestionsCommand(handle, ['list'])

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('pending')
  })

  it('runs without error when filtering by approved status', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    approveTransactionCategorySuggestion(database, id)

    await runSuggestionsCommand(handle, ['list', '--status', 'approved'])

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('approved')
  })
})

describe('suggestions approve', () => {
  it('completes without error when no pending suggestions exist', async () => {
    const { handle } = createInMemoryDatabase()

    await runSuggestionsCommand(handle, ['approve'])
  })

  it('approves pending suggestions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)

    await runSuggestionsCommand(handle, ['approve'])

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('approved')
  })
})

describe('suggestions reject', () => {
  it('completes without error when no suggestions exist', async () => {
    const { handle } = createInMemoryDatabase()

    await runSuggestionsCommand(handle, ['reject'])
  })

  it('deletes pending suggestions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)

    await runSuggestionsCommand(handle, ['reject'])

    const row = database.prepare('SELECT * FROM transaction_category_suggestions WHERE transaction_id = ?').get(id)
    expect(row).toBeNull()
  })

  it('does not modify transactions.category_id when rejecting', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)

    await runSuggestionsCommand(handle, ['reject'])

    const tx = database.prepare('SELECT category_id FROM transactions WHERE id = ?').get(id) as {
      category_id: string | null
    } | null
    expect(tx?.category_id).toBeNull()
  })
})

describe('suggestions apply', () => {
  it('completes without error when no approved suggestions exist', async () => {
    const { handle } = createInMemoryDatabase()

    await runSuggestionsCommand(handle, ['apply'])
  })

  it('applies approved suggestions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    approveTransactionCategorySuggestion(database, id)

    await runSuggestionsCommand(handle, ['apply'])

    const tx = database.prepare('SELECT category_id FROM transactions WHERE id = ?').get(id) as {
      category_id: string | null
    } | null
    expect(tx?.category_id).toBe(CATEGORY_ID)
  })

  it('is idempotent — second apply does not re-apply', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    approveTransactionCategorySuggestion(database, id)

    openDatabaseMock.mockReturnValue(handle)
    await runCommandSilently(createSuggestionsCommand('default.db'), ['apply'])

    openDatabaseMock.mockReturnValue(handle)
    await runCommandSilently(createSuggestionsCommand('default.db'), ['apply'])

    const tx = database.prepare('SELECT category_id FROM transactions WHERE id = ?').get(id) as {
      category_id: string | null
    } | null
    expect(tx?.category_id).toBe(CATEGORY_ID)

    const suggestion = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(suggestion?.status).toBe('applied')
  })
})

describe('suggestions fix', () => {
  it('registers the fix subcommand', () => {
    const command = createSuggestionsCommand('flouz.db')
    const names = command.commands.map((c) => c.name())
    expect(names).toContain('fix')
  })

  it('errors when no suggestion exists for the given id', async () => {
    const { handle } = createInMemoryDatabase()

    const outcome = await collectOutcome(() =>
      runSuggestionsCommand(handle, ['fix', '--id', '99999', '--category', 'groceries']),
    )

    expect(outcome).toBe('rejected')
  })

  it('errors when the category slug does not exist', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)

    const outcome = await collectOutcome(() =>
      runSuggestionsCommand(handle, ['fix', '--id', String(id), '--category', 'nonexistent-slug']),
    )

    expect(outcome).toBe('rejected')
  })

  it('errors when trying to fix an applied suggestion', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    approveTransactionCategorySuggestion(database, id)
    database
      .prepare(
        "UPDATE transaction_category_suggestions SET status = 'applied', applied_at = ? WHERE transaction_id = ?",
      )
      .run(new Date().toISOString(), id)

    const outcome = await collectOutcome(() =>
      runSuggestionsCommand(handle, ['fix', '--id', String(id), '--category', 'groceries']),
    )

    expect(outcome).toBe('rejected')

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('applied')
  })

  it('overrides the category and resets status to pending', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    approveTransactionCategorySuggestion(database, id)

    await runSuggestionsCommand(handle, ['fix', '--id', String(id), '--category', 'groceries'])

    const groceriesCategory = database.prepare("SELECT id FROM categories WHERE slug = 'groceries'").get() as {
      id: string
    } | null

    const row = database
      .prepare('SELECT status, category_id FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string; category_id: string } | null
    expect(row?.status).toBe('pending')
    expect(row?.category_id).toBe(groceriesCategory?.id)
  })
})

describe('end-to-end: categorize -> approve -> apply', () => {
  it('produces applied suggestion and non-null category_id after full workflow', async () => {
    const { database, handle } = createInMemoryDatabase()

    insertTransaction(database, { ...baseTransaction, counterparty: 'Keep' })
    const keepId = getLastId(database)
    insertTransaction(database, { ...baseTransaction, counterparty: 'Discard' })
    const discardId = getLastId(database)

    seedSuggestion(database, keepId)
    seedSuggestion(database, discardId)

    openDatabaseMock.mockReturnValue(handle)
    await runCommandSilently(createSuggestionsCommand('default.db'), ['reject', '--search', 'Discard'])

    const discardRow = database
      .prepare('SELECT * FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(discardId)
    expect(discardRow).toBeNull()

    openDatabaseMock.mockReturnValue(handle)
    await runCommandSilently(createSuggestionsCommand('default.db'), ['approve'])

    openDatabaseMock.mockReturnValue(handle)
    await runCommandSilently(createSuggestionsCommand('default.db'), ['apply'])

    const keepTx = database.prepare('SELECT category_id FROM transactions WHERE id = ?').get(keepId) as {
      category_id: string | null
    } | null
    expect(keepTx?.category_id).toBe(CATEGORY_ID)

    const keepSuggestion = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(keepId) as { status: string } | null
    expect(keepSuggestion?.status).toBe('applied')
  })
})
