import { type Database } from 'bun:sqlite'
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
import { getBudgetForCategory, getBudgetsForMonth } from '@/db/budgets/queries'
import { createBudgetsTable, createMonthlyIncomeSnapshotsTable } from '@/db/budgets/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { findCategoryIdBySlug, getCategories } from '@/db/categories/queries'
import type { Category } from '@/types'
import type { createSetBudgetCommand as CreateSetBudgetCommand } from './set'

const cancelledPrompt = Symbol('cancelled-prompt')

const successLogMock = mock((_message: string) => {})
const errorLogMock = mock((_message: string) => {})
const warnLogMock = mock((_message: string) => {})

const openDatabaseMock = createOpenDatabaseMock()

const { spinnerMock } = createSpinnerMocks()
const { progressMock } = createProgressMocks()

const selectResponseQueue: (Category | symbol)[] = []
const textResponseQueue: (string | symbol)[] = []

const selectMock = mock(() => {
  const response = selectResponseQueue.shift()
  if (response === undefined) {
    throw new Error('select mock not configured')
  }
  return Promise.resolve(response)
})

const textMock = mock(() => {
  const response = textResponseQueue.shift()
  if (response === undefined) {
    throw new Error('text mock not configured')
  }
  return Promise.resolve(response)
})

const isCancelMock = mock((value: unknown) => value === cancelledPrompt)

void mock.module('@clack/prompts', () => ({
  intro: mock(() => {}),
  outro: mock(() => {}),
  cancel: mock(() => {}),
  note: () => {},
  isCancel: isCancelMock,
  select: selectMock,
  text: textMock,
  spinner: spinnerMock,
  progress: progressMock,
  log: {
    info: mock(() => {}),
    message: mock(() => {}),
    error: errorLogMock,
    success: successLogMock,
    warn: warnLogMock,
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const processExitMock = createProcessExitMock()

type SetOutcome = { status: 'resolved' } | { status: 'rejected'; errorCode: number | undefined }

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

function findTestCategory(database: Database, slug: string): Category {
  const category = getCategories(database).find((entry) => entry.slug === slug)
  if (category === undefined) {
    throw new Error(`Missing seeded category: ${slug}`)
  }
  return category
}

function getBudgetSummary(database: Database, month: string) {
  const necessitiesId = findCategoryIdBySlug(database, 'necessities')
  const discretionaryId = findCategoryIdBySlug(database, 'discretionary')
  const savingsId = findCategoryIdBySlug(database, 'savings')

  return {
    necessities: getBudgetForCategory(database, necessitiesId, month),
    discretionary: getBudgetForCategory(database, discretionaryId, month),
    savings: getBudgetForCategory(database, savingsId, month),
  }
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
  warnLogMock.mockClear()
  selectMock.mockClear()
  textMock.mockClear()
  isCancelMock.mockClear()
  openDatabaseMock.mockReset()
  processExitMock.mockClear()
  selectResponseQueue.length = 0
  textResponseQueue.length = 0
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

  it('applies the built-in split when --defaults is used on its own', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['--defaults', '--month', '2026-03'])
    const budgets = getBudgetSummary(database, '2026-03')

    expect({
      outcome,
      necessities: budgets.necessities?.amount,
      discretionary: budgets.discretionary?.amount,
      savings: budgets.savings?.amount,
    }).toEqual({
      outcome: { status: 'resolved' },
      necessities: 50,
      discretionary: 30,
      savings: 20,
    })
  })

  it('fills omitted allocation values with defaults when one override is provided', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['--necessities', '40%', '--month', '2026-03'])
    const budgets = getBudgetSummary(database, '2026-03')

    expect({
      outcome,
      necessities: budgets.necessities?.amount,
      discretionary: budgets.discretionary?.amount,
      savings: budgets.savings?.amount,
    }).toEqual({
      outcome: { status: 'resolved' },
      necessities: 40,
      discretionary: 30,
      savings: 20,
    })
  })

  it('supports multiple allocation overrides together', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['--necessities', '40%', '--savings', '25%', '--month', '2026-03'])
    const budgets = getBudgetSummary(database, '2026-03')

    expect({
      outcome,
      necessities: budgets.necessities?.amount,
      discretionary: budgets.discretionary?.amount,
      savings: budgets.savings?.amount,
    }).toEqual({
      outcome: { status: 'resolved' },
      necessities: 40,
      discretionary: 30,
      savings: 25,
    })
  })

  it('prompts for category and amount when no direct or allocation inputs are provided', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)
    selectResponseQueue.push(findTestCategory(database, 'necessities'))
    textResponseQueue.push('500')

    const outcome = await collectSetOutcome(['--month', '2026-03'])
    const budgets = getBudgetsForMonth(database, '2026-03')

    expect({
      outcome,
      count: budgets.length,
      amount: budgets[0]?.amount,
      type: budgets[0]?.type,
    }).toEqual({
      outcome: { status: 'resolved' },
      count: 1,
      amount: 500,
      type: 'fixed',
    })
  })

  it('returns without writing budgets when the category prompt is cancelled', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)
    selectResponseQueue.push(cancelledPrompt)

    const outcome = await collectSetOutcome(['--month', '2026-03'])
    expect({
      outcome,
      budgets: getBudgetsForMonth(database, '2026-03').length,
      warned: warnLogMock.mock.calls.length,
    }).toEqual({
      outcome: { status: 'resolved' },
      budgets: 0,
      warned: 1,
    })
  })

  it('returns without writing budgets when the amount prompt is cancelled', async () => {
    const { database, handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)
    textResponseQueue.push(cancelledPrompt)

    const outcome = await collectSetOutcome(['necessities', '--month', '2026-03'])
    expect({
      outcome,
      budgets: getBudgetsForMonth(database, '2026-03').length,
      warned: warnLogMock.mock.calls.length,
    }).toEqual({
      outcome: { status: 'resolved' },
      budgets: 0,
      warned: 1,
    })
  })

  it('exits with code 1 when --defaults is combined with allocation overrides', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['--defaults', '--necessities', '40%', '--month', '2026-03'])
    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('exits with code 1 when allocation overrides are combined with positional arguments', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['necessities', '500', '--savings', '25%', '--month', '2026-03'])
    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('exits with code 1 for invalid month', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['necessities', '2000', '--month', 'bad'])
    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('exits with code 1 for invalid amount', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['necessities', 'abc', '--month', '2026-03'])
    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('exits with code 1 for unknown category slug', async () => {
    const { handle } = createTestDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectSetOutcome(['nonexistent', '2000', '--month', '2026-03'])
    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('propagates error when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB error')
    })

    const outcome = await collectSetOutcome(['necessities', '2000', '--month', '2026-03'])
    expect(outcome.status).toBe('rejected')
  })
})
