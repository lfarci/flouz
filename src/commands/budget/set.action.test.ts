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
import { getBudgetsForMonth } from '@/db/budgets/queries'
import type { createSetBudgetCommand as CreateSetBudgetCommand } from './set'

const successLogMock = mock((_message: string) => {})
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
    info: mock(() => {}),
    message: mock(() => {}),
    error: errorLogMock,
    success: successLogMock,
    warn: mock(() => {}),
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const processExitMock = createProcessExitMock()

interface SetOutcome {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createSetBudgetCommand: typeof CreateSetBudgetCommand
let originalProcessExit: typeof process.exit

function createTestDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    seedCategories(database)
    createBudgetsTable(database)
    createMonthlyIncomeSnapshotsTable(database)
  })
}

async function runSetCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createSetBudgetCommand('default.db'), argumentsList)
}

async function collectSetOutcome(argumentsList: string[]): Promise<SetOutcome> {
  return await collectCommandOutcome<SetOutcome>(
    () => runSetCommand(argumentsList),
    () => ({ status: 'resolved' }),
    (errorCode) => ({ status: 'rejected', errorCode }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createSetBudgetCommand } = await import('./set'))
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

describe('set action', () => {
  it('creates a fixed budget for a top-level category', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['necessities', '2000', '--month', '2026-03'])
    expect(outcome.status).toBe('resolved')
    expect(successLogMock).toHaveBeenCalled()

    const budgets = getBudgetsForMonth(database, '2026-03')
    expect(budgets.length).toBe(1)
    expect(budgets[0].amount).toBe(2000)
    expect(budgets[0].type).toBe('fixed')
  })

  it('creates a percent budget', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['savings', '20%', '--month', '2026-03'])
    expect(outcome.status).toBe('resolved')

    const budgets = getBudgetsForMonth(database, '2026-03')
    expect(budgets.length).toBe(1)
    expect(budgets[0].amount).toBe(20)
    expect(budgets[0].type).toBe('percent')
  })

  it('exits with code 1 for invalid month', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['necessities', '2000', '--month', 'bad'])
    expect(outcome.status).toBe('rejected')
    expect(outcome.errorCode).toBe(1)
  })

  it('exits with code 1 for invalid amount', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['necessities', 'abc', '--month', '2026-03'])
    expect(outcome.status).toBe('rejected')
    expect(outcome.errorCode).toBe(1)
  })

  it('exits with code 1 for unknown category slug', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['nonexistent', '2000', '--month', '2026-03'])
    expect(outcome.status).toBe('rejected')
    expect(outcome.errorCode).toBe(1)
  })

  it('propagates error when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB error')
    })

    const outcome = await collectSetOutcome(['necessities', '2000', '--month', '2026-03'])
    expect(outcome.status).toBe('rejected')
  })
})
