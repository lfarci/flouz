import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { countAccounts, getAccountByKey } from '@/db/accounts/queries'
import { createAccountsTable } from '@/db/accounts/schema'
import type { Account } from '@/types'

const successLogMock = mock(() => {})
const errorLogMock = mock(() => {})

let openDatabaseMock = mock((dbPath: string) => {
  throw new Error(`openDatabase mock not configured for ${dbPath}`)
})

mock.module('@clack/prompts', () => ({
  log: {
    success: successLogMock,
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

type AddModule = typeof import('./add')

type InMemoryDatabase = {
  database: Database
  closeMock: ReturnType<typeof mock>
  handle: Database
}

type ActionSummary = {
  status: 'resolved' | 'rejected'
  errorCode?: number
  account?: Account
  accountCount: number
}

type ArgumentSetup = {
  name: string
  required: boolean
  description?: string
  variadic: boolean
}

let createAddAccountsCommand: AddModule['createAddAccountsCommand']
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

async function runAddCommand(argumentsList: string[]): Promise<void> {
  const command = createAddAccountsCommand('default.db')
  command.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  })
  await command.parseAsync(argumentsList, { from: 'user' })
}

async function collectAddCommandOutcome(
  database: Database,
  argumentsList: string[],
  accountKey?: string
): Promise<ActionSummary> {
  try {
    await runAddCommand(argumentsList)

    return {
      status: 'resolved',
      account: accountKey === undefined ? undefined : getAccountByKey(database, accountKey),
      accountCount: countAccounts(database),
    }
  } catch (error) {
    const errorCode = error instanceof ProcessExitError ? error.code : undefined

    return {
      status: 'rejected',
      errorCode,
      account: accountKey === undefined ? undefined : getAccountByKey(database, accountKey),
      accountCount: countAccounts(database),
    }
  }
}

function getArgumentSetup(command: ReturnType<typeof createAddAccountsCommand>, index: number): ArgumentSetup | undefined {
  const argument = command.registeredArguments[index]

  if (argument === undefined) {
    return undefined
  }

  return {
    name: argument.name(),
    required: argument.required,
    description: argument.description,
    variadic: argument.variadic,
  }
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createAddAccountsCommand } = await import('./add'))
})

beforeEach(() => {
  successLogMock.mockClear()
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

describe('createAddAccountsCommand', () => {
  it('creates the add command', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(command.name()).toBe('add')
  })

  it('registers the key argument', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(getArgumentSetup(command, 0)).toEqual({
      name: 'key',
      required: true,
      description: 'unique import key',
      variadic: false,
    })
  })

  it('registers the name argument', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(getArgumentSetup(command, 1)).toEqual({
      name: 'name',
      required: true,
      description: 'human-readable account name',
      variadic: false,
    })
  })

  it('registers the company argument', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(getArgumentSetup(command, 2)).toEqual({
      name: 'company',
      required: true,
      description: 'provider or institution name',
      variadic: false,
    })
  })

  it('registers the description option', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(command.options[0]?.long).toBe('--description')
  })

  it('registers the iban option', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(command.options[1]?.long).toBe('--iban')
  })

  it('registers the database option', () => {
    const command = createAddAccountsCommand('flouz.db')

    expect(command.options[2]?.long).toBe('--db')
  })
})

describe('addAccountAction', () => {
  it('rejects a missing key argument', async () => {
    await expect(runAddCommand([])).rejects.toMatchObject({
      code: 1,
      message: 'process.exit(1)',
    })
  })

  it('rejects a missing name argument', async () => {
    await expect(runAddCommand(['checking'])).rejects.toMatchObject({
      code: 1,
      message: 'process.exit(1)',
    })
  })

  it('rejects a missing company argument', async () => {
    await expect(runAddCommand(['checking', 'Main account'])).rejects.toMatchObject({
      code: 1,
      message: 'process.exit(1)',
    })
  })

  it('inserts an account with only required arguments', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['checking', 'Main account', 'Provider One'],
      'checking'
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Provider One',
        description: undefined,
        iban: undefined,
      },
    })
  })

  it('inserts an account through the command action', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      [
        'checking',
        'Main account',
        'Provider One',
        '--description',
        ' Employer meal card ',
        '--iban',
        ' BE00 0000 0000 0000 ',
        '--db',
        'relative.db',
      ],
      'checking',
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Provider One',
        description: 'Employer meal card',
        iban: 'BE00 0000 0000 0000',
      },
    })
  })

  it('trims required values before insertion', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['  checking  ', '  Main account  ', '  Provider One  '],
      'checking'
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Provider One',
        description: undefined,
        iban: undefined,
      },
    })
  })

  it('rejects duplicate account insertions', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertAccount(database, {
      key: 'checking',
      name: 'Main account',
      company: 'Provider One',
    })
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['checking', 'Other account', 'Provider Two'],
      'checking'
    )

    expect(summary).toEqual({
      status: 'rejected',
      errorCode: 1,
      accountCount: 1,
      account: {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Provider One',
      },
    })
  })

  it('rejects duplicate account keys after trimming whitespace', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertAccount(database, {
      key: 'checking',
      name: 'Main account',
      company: 'Provider One',
    })
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['  checking  ', 'Other account', 'Provider Two'],
      'checking'
    )

    expect(summary).toEqual({
      status: 'rejected',
      errorCode: 1,
      accountCount: 1,
      account: {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Provider One',
      },
    })
  })

  it('rejects a blank key before insertion', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['   ', 'Main account', 'Provider One'] ,
      'checking'
    )

    expect(summary).toEqual({
      status: 'rejected',
      errorCode: 1,
      accountCount: 0,
      account: undefined,
    })
  })

  it('rejects a blank name before insertion', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['checking', '   ', 'Provider One'],
      'checking'
    )

    expect(summary).toEqual({
      status: 'rejected',
      errorCode: 1,
      accountCount: 0,
      account: undefined,
    })
  })

  it('rejects a blank company before insertion', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      ['checking', 'Main account', '   '],
      'checking'
    )

    expect(summary).toEqual({
      status: 'rejected',
      errorCode: 1,
      accountCount: 0,
      account: undefined,
    })
  })

  it('trims a non-blank description before insertion', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      [
        'savings',
        'Savings account',
        'Provider One',
        '--description',
        '  Employer meal card  ',
      ],
      'savings'
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'savings',
        name: 'Savings account',
        company: 'Provider One',
        description: 'Employer meal card',
        iban: undefined,
      },
    })
  })

  it('drops a blank description instead of storing an empty string', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      [
        'savings',
        'Savings account',
        'Provider One',
        '--description',
        '   ',
      ],
      'savings'
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'savings',
        name: 'Savings account',
        company: 'Provider One',
        description: undefined,
        iban: undefined,
      },
    })
  })

  it('trims a non-blank iban before insertion', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      [
        'wallet',
        'Wallet account',
        'Provider Two',
        '--iban',
        '  BE00 0000 0000 0000  ',
      ],
      'wallet'
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'wallet',
        name: 'Wallet account',
        company: 'Provider Two',
        description: undefined,
        iban: 'BE00 0000 0000 0000',
      },
    })
  })

  it('drops a blank iban instead of storing an empty string', async () => {
    const { database, handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const summary = await collectAddCommandOutcome(
      database,
      [
        'wallet',
        'Wallet account',
        'Provider Two',
        '--iban',
        '   ',
      ],
      'wallet'
    )

    expect(summary).toEqual({
      status: 'resolved',
      accountCount: 1,
      account: {
        id: 1,
        key: 'wallet',
        name: 'Wallet account',
        company: 'Provider Two',
        description: undefined,
        iban: undefined,
      },
    })
  })
})
