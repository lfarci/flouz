import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  collectCommandOutcome,
  createCommandTestDatabase,
  createOpenDatabaseMock,
  createProcessExitMock,
  createProgressMocks,
  createSpinnerMocks,
  restoreProcessExit,
  runCommandSilently,
  setProcessExit,
} from '@/commands/test-helpers'
import { createBudgetsTable, createMonthlyIncomeSnapshotsTable } from '@/db/budgets/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { upsertBudget } from '@/db/budgets/mutations'
import type { createListBudgetCommand as CreateListBudgetCommand } from './list'

const infoLogMock = mock((_message: string) => {})
const messageLogMock = mock((_message: string[] | string, _options?: object) => {})
const errorLogMock = mock((_message: string) => {})

const openDatabaseMock = createOpenDatabaseMock()

const { spinnerMock } = createSpinnerMocks()
const { progressMock } = createProgressMocks()

void mock.module('@clack/prompts', () => ({
  intro: mock(() => {}),
  outro: mock(() => {}),
  cancel: mock(() => {}),
  note: () => {},
  isCancel: () => false,
  select: () => Promise.resolve('quit'),
  text: () => Promise.resolve(''),
  spinner: spinnerMock,
  progress: progressMock,
  log: {
    info: infoLogMock,
    message: messageLogMock,
    error: errorLogMock,
    success: mock(() => {}),
    warn: mock(() => {}),
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const processExitMock = createProcessExitMock()

interface ListOutcome {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createListBudgetCommand: typeof CreateListBudgetCommand
let originalProcessExit: typeof process.exit

function createTestDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    seedCategories(database)
    createBudgetsTable(database)
    createMonthlyIncomeSnapshotsTable(database)
  })
}

async function runListCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createListBudgetCommand('default.db'), argumentsList)
}

async function collectListOutcome(argumentsList: string[]): Promise<ListOutcome> {
  return await collectCommandOutcome<ListOutcome>(
    () => runListCommand(argumentsList),
    () => ({ status: 'resolved' }),
    (errorCode) => ({ status: 'rejected', errorCode }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createListBudgetCommand } = await import('./list'))
})

beforeEach(() => {
  infoLogMock.mockClear()
  messageLogMock.mockClear()
  errorLogMock.mockClear()
  openDatabaseMock.mockReset()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('list action', () => {
  it('shows info message when no budgets are set', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectListOutcome(['--month', '2026-05'])
    expect(outcome.status).toBe('resolved')
    expect(infoLogMock).toHaveBeenCalledWith('No budgets set for 2026-05.')
  })

  it('exits with code 1 for invalid month format', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectListOutcome(['--month', 'bad'])
    expect(outcome.status).toBe('rejected')
    expect(outcome.errorCode).toBe(1)
  })

  it('displays budget table when budgets exist', async () => {
    const { database, handle } = createTestDatabase()
    const categories = database.prepare('SELECT id FROM categories WHERE slug = ?').all('necessities') as {
      id: string
    }[]
    const categoryId = categories[0].id

    upsertBudget(database, {
      categoryId,
      amount: 2000,
      type: 'fixed',
      month: '2026-03',
      createdAt: new Date().toISOString(),
    })

    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectListOutcome(['--month', '2026-03'])
    expect(outcome.status).toBe('resolved')
    expect(messageLogMock).toHaveBeenCalled()
  })

  it('displays percent budgets with income resolution', async () => {
    const { database, handle } = createTestDatabase()
    const categories = database.prepare('SELECT id FROM categories WHERE slug = ?').all('savings') as {
      id: string
    }[]
    const categoryId = categories[0].id

    upsertBudget(database, {
      categoryId,
      amount: 20,
      type: 'percent',
      month: '2026-03',
      createdAt: new Date().toISOString(),
    })

    database
      .prepare('INSERT INTO monthly_income_snapshots (month, amount, created_at) VALUES (?, ?, ?)')
      .run('2026-03', 4000, new Date().toISOString())

    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectListOutcome(['--month', '2026-03'])
    expect(outcome.status).toBe('resolved')
    expect(messageLogMock).toHaveBeenCalled()
  })

  it('propagates error when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB error')
    })

    const outcome = await collectListOutcome(['--month', '2026-03'])
    expect(outcome.status).toBe('rejected')
  })
})
