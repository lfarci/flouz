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
import { createBudgetsTable, createMonthlyIncomeTable } from '@/db/budgets/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { createTransactionsTable } from '@/db/transactions/schema'
import { upsertBudget } from '@/db/budgets/mutations'
import type { createCheckBudgetCommand as CreateCheckBudgetCommand } from './check'

const messageLogMock = mock((_message: string[] | string, _options?: object) => {})
const errorLogMock = mock((_message: string) => {})
const warnLogMock = mock((_message: string) => {})

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
    info: mock(() => {}),
    message: messageLogMock,
    error: errorLogMock,
    success: mock(() => {}),
    warn: warnLogMock,
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const processExitMock = createProcessExitMock()

interface CheckOutcome {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createCheckBudgetCommand: typeof CreateCheckBudgetCommand
let originalProcessExit: typeof process.exit

function createTestDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    seedCategories(database)
    createBudgetsTable(database)
    createMonthlyIncomeTable(database)
    createTransactionsTable(database)
  })
}

async function runCheckCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createCheckBudgetCommand('default.db'), argumentsList)
}

async function collectCheckOutcome(argumentsList: string[]): Promise<CheckOutcome> {
  return await collectCommandOutcome<CheckOutcome>(
    () => runCheckCommand(argumentsList),
    () => ({ status: 'resolved' }),
    (errorCode) => ({ status: 'rejected', errorCode }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createCheckBudgetCommand } = await import('./check'))
})

beforeEach(() => {
  process.env.NO_COLOR = '1'
  messageLogMock.mockClear()
  errorLogMock.mockClear()
  warnLogMock.mockClear()
  openDatabaseMock.mockReset()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  delete process.env.NO_COLOR
  restoreProcessExit(originalProcessExit)
})

describe('check action', () => {
  it('warns when no budgets are configured', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectCheckOutcome(['--month', '2026-05'])
    expect(outcome.status).toBe('resolved')
    expect(warnLogMock).toHaveBeenCalled()
  })

  it('exits with code 1 for invalid month format', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectCheckOutcome(['--month', 'invalid'])
    expect(outcome.status).toBe('rejected')
    expect(outcome.errorCode).toBe(1)
  })

  it('displays budget progress when budgets exist', async () => {
    const { database, handle } = createTestDatabase()
    const categories = database.prepare('SELECT id FROM categories WHERE slug = ?').all('necessities') as {
      id: string
    }[]
    const categoryId = categories[0].id

    upsertBudget(database, {
      categoryId,
      amount: 2000,
      type: 'fixed',
      month: '2026-01',
      createdAt: new Date().toISOString(),
    })

    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectCheckOutcome(['--month', '2026-01'])
    expect(outcome.status).toBe('resolved')
    expect(messageLogMock).toHaveBeenCalled()
    const output = String(messageLogMock.mock.calls[0][0])
    expect(output).toContain('BUDGET PROGRESS')
    expect(output).toContain('€2,000.00')
  })

  it('displays progress for percent budgets with income', async () => {
    const { database, handle } = createTestDatabase()
    const categories = database.prepare('SELECT id FROM categories WHERE slug = ?').all('necessities') as {
      id: string
    }[]
    const categoryId = categories[0].id

    upsertBudget(database, {
      categoryId,
      amount: 60,
      type: 'percent',
      month: '2026-01',
      createdAt: new Date().toISOString(),
    })

    // Insert income for the month
    database
      .prepare('INSERT INTO monthly_income (month, amount, created_at) VALUES (?, ?, ?)')
      .run('2026-01', 5000, new Date().toISOString())

    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectCheckOutcome(['--month', '2026-01'])
    expect(outcome.status).toBe('resolved')
    expect(messageLogMock).toHaveBeenCalled()
    const output = String(messageLogMock.mock.calls[0][0])
    expect(output).toContain('BUDGET PROGRESS')
    expect(output).toContain('€3,000.00')
  })

  it('propagates error when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB error')
    })

    const outcome = await collectCheckOutcome(['--month', '2026-01'])
    expect(outcome.status).toBe('rejected')
  })
})
