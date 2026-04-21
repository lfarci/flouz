import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { type Database } from 'bun:sqlite'
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
import { insertAccount } from '@/db/accounts/mutations'
import { getAccounts } from '@/db/accounts/queries'
import { createAccountsTable } from '@/db/accounts/schema'
import type {
  createListAccountsCommand as CreateListAccountsCommand,
  formatAccountsTable as FormatAccountsTable,
} from './list'

const infoLogMock = mock((message: string) => message)
const messageLogMock = mock((message: string[] | string, options?: { spacing?: number; withGuide?: boolean }) => ({
  message,
  options,
}))
const errorLogMock = mock((message: string) => message)

const openDatabaseMock = createOpenDatabaseMock()

const { spinnerMock } = createSpinnerMocks()
const { progressMock } = createProgressMocks()

void mock.module('@clack/prompts', () => ({
  intro: mock((_message: string) => {}),
  outro: mock((_message: string) => {}),
  cancel: mock((_message: string) => {}),
  note: () => {},
  isCancel: () => false,
  select: async () => 'quit',
  spinner: spinnerMock,
  progress: progressMock,
  log: {
    info: infoLogMock,
    message: messageLogMock,
    error: errorLogMock,
    success: () => {},
  },
}))

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const processExitMock = createProcessExitMock()

interface ListSummary {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createListAccountsCommand: typeof CreateListAccountsCommand
let formatAccountsTable: typeof FormatAccountsTable
let originalProcessExit: typeof process.exit

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createAccountsTable(database)
  })
}

async function runListCommand(argumentsList: string[]): Promise<void> {
  await runCommandSilently(createListAccountsCommand('default.db'), argumentsList)
}

async function collectListCommandOutcome(argumentsList: string[]): Promise<ListSummary> {
  return await collectCommandOutcome<ListSummary>(
    () => runListCommand(argumentsList),
    () => ({ status: 'resolved' }),
    (errorCode) => ({
      status: 'rejected',
      errorCode,
    }),
  )
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createListAccountsCommand, formatAccountsTable } = await import('./list'))
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

describe('formatAccountsTable', () => {
  it('formats accounts into a printable boxed table', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Belfius',
        iban: 'BE00 0000 0000 0000',
      },
    ])

    expect(lines[0]).toMatch(/^╭/)
    expect(lines[1]).toContain('Key')
    expect(lines[2]).toMatch(/^├/)
    expect(lines[3]).toContain('checking')
    expect(lines[3]).toContain('Main account')
    expect(lines[3]).toContain('Belfius')
    expect(lines[4]).toMatch(/^╰/)
  })

  it('shows a placeholder when iban is missing', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'wallet',
        name: 'Meal vouchers',
        company: 'Pluxee',
      },
    ])

    expect(lines[3]).toContain('—')
  })

  it('truncates long values with an ellipsis', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'checking-account-long-key',
        name: 'Household primary account',
        company: 'Very Long Provider Name',
        iban: 'BE00 0000 0000 0000 9999',
      },
    ])

    expect(lines[3]).toContain('checking-account-')
    expect(lines[3]).toContain('Household prima')
    expect(lines[3]).toContain('Very Long P')
    expect(lines[3]).toContain('BE00 0000 0000 0000')
    expect(lines[3]).toContain('…')
    expect(lines[3]).not.toContain('checking-account-long-key')
  })
})

describe('createListAccountsCommand', () => {
  it('creates the list command without positional arguments', () => {
    const command = createListAccountsCommand('flouz.db')

    expect(command.name()).toBe('list')
    expect(command.registeredArguments).toHaveLength(0)
  })

  it('registers the database option', () => {
    const command = createListAccountsCommand('flouz.db')

    expect(command.options[0]?.long).toBe('--db')
  })
})

describe('listAccountsAction', () => {
  it('prints an info message when no accounts are configured', async () => {
    const { handle, closeMock } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectListCommandOutcome([])

    expect({
      summary,
      infoMessages: infoLogMock.mock.calls.map((call) => call[0]),
      tableLines: messageLogMock.mock.calls.map((call) => call[0]),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: { status: 'resolved' },
      infoMessages: ['No accounts configured.'],
      tableLines: [],
      closeCalls: 1,
    })
  })

  it('prints the formatted accounts table', async () => {
    const { database, handle, closeMock } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)
    insertAccount(database, {
      key: 'wallet',
      company: 'Provider Two',
      name: 'Meal card',
    })
    insertAccount(database, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
      iban: 'BE00 0000 0000 0000',
    })

    const summary = await collectListCommandOutcome([])
    const expectedLines = formatAccountsTable(getAccounts(database))

    expect({
      summary,
      tableBlocks: messageLogMock.mock.calls.map((call) => call[0]),
      messageOptions: messageLogMock.mock.calls.map((call) => call[1]),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: { status: 'resolved' },
      tableBlocks: [expectedLines],
      messageOptions: [{ spacing: 0, withGuide: false }],
      closeCalls: 1,
    })
  })

  it('logs an error and exits when listing accounts fails', async () => {
    const closeMock = mock(() => {})
    const failingHandle = {
      prepare: () => {
        throw new Error('Query failed')
      },
      close: closeMock,
    } as unknown as Database
    openDatabaseMock.mockReturnValue(failingHandle)

    const summary = await collectListCommandOutcome([])

    expect({
      summary,
      errorMessages: errorLogMock.mock.calls.map((call) => call[0]),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: {
        status: 'rejected',
        errorCode: 1,
      },
      errorMessages: ['Query failed'],
      closeCalls: 1,
    })
  })
})
