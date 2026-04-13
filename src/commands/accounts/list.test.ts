import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { getAccounts } from '@/db/accounts/queries'
import { createAccountsTable } from '@/db/accounts/schema'

const infoLogMock = mock(() => {})
const messageLogMock = mock(() => {})
const errorLogMock = mock(() => {})

let openDatabaseMock = mock((dbPath: string) => {
  throw new Error(`openDatabase mock not configured for ${dbPath}`)
})

mock.module('@clack/prompts', () => ({
  log: {
    info: infoLogMock,
    message: messageLogMock,
    error: errorLogMock,
  },
}))

mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

class ProcessExitError extends Error {
  constructor(readonly code: number) {
    super(`process.exit(${code})`)
  }
}

const processExitMock = mock((code?: number) => {
  throw new ProcessExitError(code ?? 0)
})

type ListModule = typeof import('./list')

type InMemoryDatabase = {
  database: Database
  closeMock: ReturnType<typeof mock>
  handle: Database
}

type ListSummary = {
  status: 'resolved' | 'rejected'
  errorCode?: number
}

let createListAccountsCommand: ListModule['createListAccountsCommand']
let formatAccountsTable: ListModule['formatAccountsTable']
let originalProcessExit: typeof process.exit

function createInMemoryDatabase(): InMemoryDatabase {
  const database = new Database(':memory:')
  createAccountsTable(database)
  const closeMock = mock(() => {})

  const handle = {
    prepare: database.prepare.bind(database),
    close: closeMock,
  } as Database

  return { database, closeMock, handle }
}

async function runListCommand(argumentsList: string[]): Promise<void> {
  const command = createListAccountsCommand('default.db')
  command.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  })
  await command.parseAsync(argumentsList, { from: 'user' })
}

async function collectListCommandOutcome(argumentsList: string[]): Promise<ListSummary> {
  try {
    await runListCommand(argumentsList)

    return { status: 'resolved' }
  } catch (error) {
    const errorCode = error instanceof ProcessExitError ? error.code : undefined

    return {
      status: 'rejected',
      errorCode,
    }
  }
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

  Object.defineProperty(process, 'exit', {
    value: processExitMock,
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  Object.defineProperty(process, 'exit', {
    value: originalProcessExit,
    configurable: true,
    writable: true,
  })
})

describe('formatAccountsTable', () => {
  it('formats accounts into a printable table', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Belfius',
        iban: 'BE00 0000 0000 0000',
      },
    ])

    expect(lines[0]).toBe(lines[2])
    expect(lines[1]).toContain('Key')
    expect(lines[3]).toContain('checking')
    expect(lines[3]).toContain('Main account')
    expect(lines[3]).toContain('Belfius')
    expect(lines[4]).toBe(lines[0])
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

  it('truncates long values to fit the fixed-width columns', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'checking-account-long-key',
        name: 'Household primary account',
        company: 'Very Long Provider Name',
        iban: 'BE00 0000 0000 0000 9999',
      },
    ])

    expect(lines[3]).toContain('checking-account-l')
    expect(lines[3]).toContain('Household primary')
    expect(lines[3]).toContain('Very Long Provider')
    expect(lines[3]).toContain('BE00 0000 0000 00')
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
      infoMessages: infoLogMock.mock.calls.map(call => call[0]),
      tableLines: messageLogMock.mock.calls.map(call => call[0]),
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
      tableLines: messageLogMock.mock.calls.map(call => call[0]),
      messageOptions: messageLogMock.mock.calls.map(call => call[1]),
      closeCalls: closeMock.mock.calls.length,
    }).toEqual({
      summary: { status: 'resolved' },
      tableLines: expectedLines,
      messageOptions: expectedLines.map(() => ({ symbol: '' })),
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
    } as Database
    openDatabaseMock.mockReturnValue(failingHandle)

    const summary = await collectListCommandOutcome([])

    expect({
      summary,
      errorMessages: errorLogMock.mock.calls.map(call => call[0]),
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
