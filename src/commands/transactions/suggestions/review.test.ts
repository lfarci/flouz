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
import { upsertTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
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

const selectResponseQueue: string[] = []
const selectMock = mock(async () => selectResponseQueue.shift() ?? 'quit')

const introMock = mock((_message: string) => {})
const outroMock = mock((_message: string) => {})
const noteMock = mock((_message: string, _title?: string) => {})
const cancelMock = mock((_message: string) => {})
const logInfoMock = mock((_message: string) => {})
const logErrorMock = mock((_message: string) => {})
const logSuccessMock = mock((_message: string) => {})

void mock.module('@clack/prompts', () => ({
  intro: introMock,
  outro: outroMock,
  note: noteMock,
  cancel: cancelMock,
  isCancel: (_value: unknown) => false,
  log: {
    info: logInfoMock,
    error: logErrorMock,
    success: logSuccessMock,
  },
  select: selectMock,
}))

const processExitMock = createProcessExitMock()
let createReviewCommand: (defaultDb: string) => Command
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

async function runReviewCommand(database: Database, args: string[]): Promise<void> {
  openDatabaseMock.mockReturnValue(database)
  await runCommandSilently(createReviewCommand('default.db'), args)
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createReviewCommand } = await import('./review'))
})

beforeEach(() => {
  openDatabaseMock.mockReset()
  selectMock.mockClear()
  introMock.mockClear()
  outroMock.mockClear()
  noteMock.mockClear()
  cancelMock.mockClear()
  logInfoMock.mockClear()
  logErrorMock.mockClear()
  logSuccessMock.mockClear()
  processExitMock.mockClear()
  selectResponseQueue.length = 0
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createReviewCommand', () => {
  it('creates the review command with name "review"', () => {
    expect(createReviewCommand('flouz.db').name()).toBe('review')
  })

  it('has --from option', () => {
    const option = createReviewCommand('flouz.db').options.find((o) => o.long === '--from')
    expect(option).toBeDefined()
  })

  it('has --to option', () => {
    const option = createReviewCommand('flouz.db').options.find((o) => o.long === '--to')
    expect(option).toBeDefined()
  })

  it('has --search option', () => {
    const option = createReviewCommand('flouz.db').options.find((o) => o.long === '--search')
    expect(option).toBeDefined()
  })

  it('has --limit option', () => {
    const option = createReviewCommand('flouz.db').options.find((o) => o.long === '--limit')
    expect(option).toBeDefined()
  })
})

describe('review action', () => {
  it('completes without error when no pending suggestions exist', async () => {
    const { handle } = createInMemoryDatabase()
    await runReviewCommand(handle, [])
  })

  it('approves suggestion when approve is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    selectResponseQueue.push('approve')

    await runReviewCommand(handle, [])

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('approved')
  })

  it('deletes suggestion when reject is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    selectResponseQueue.push('reject')

    await runReviewCommand(handle, [])

    const row = database.prepare('SELECT * FROM transaction_category_suggestions WHERE transaction_id = ?').get(id)
    expect(row).toBeNull()
  })

  it('leaves suggestion as pending when skip is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    selectResponseQueue.push('skip')

    await runReviewCommand(handle, [])

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('pending')
  })

  it('leaves suggestion as pending when quit is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)
    selectResponseQueue.push('quit')

    await runReviewCommand(handle, [])

    const row = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string } | null
    expect(row?.status).toBe('pending')
  })

  it('overrides category and approves suggestion when fix is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    seedSuggestion(database, id)

    const groceriesCategory = database.prepare("SELECT id FROM categories WHERE slug = 'groceries'").get() as {
      id: string
    }
    selectResponseQueue.push('fix', groceriesCategory.id)

    await runReviewCommand(handle, [])

    const row = database
      .prepare('SELECT status, category_id FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id) as { status: string; category_id: string } | null
    expect({ status: row?.status, categoryId: row?.category_id }).toEqual({
      status: 'approved',
      categoryId: groceriesCategory.id,
    })
  })

  it('stops after first suggestion when quit is selected with multiple pending suggestions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id1 = getLastId(database)
    insertTransaction(database, { ...baseTransaction, counterparty: 'Other Shop' })
    const id2 = getLastId(database)
    seedSuggestion(database, id1)
    seedSuggestion(database, id2)
    selectResponseQueue.push('quit')

    await runReviewCommand(handle, [])

    const row1 = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id1) as { status: string } | null
    const row2 = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id2) as { status: string } | null
    expect({ status1: row1?.status, status2: row2?.status }).toEqual({ status1: 'pending', status2: 'pending' })
  })

  it('only reviews suggestions matching --search filter', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id1 = getLastId(database)
    insertTransaction(database, { ...baseTransaction, counterparty: 'Other Shop' })
    const id2 = getLastId(database)
    seedSuggestion(database, id1)
    seedSuggestion(database, id2)
    selectResponseQueue.push('approve')

    await runReviewCommand(handle, ['--search', 'ACME'])

    const row1 = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id1) as { status: string } | null
    const row2 = database
      .prepare('SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?')
      .get(id2) as { status: string } | null
    expect({ status1: row1?.status, status2: row2?.status }).toEqual({ status1: 'approved', status2: 'pending' })
  })
})
