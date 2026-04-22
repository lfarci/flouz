import { mock, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Database } from 'bun:sqlite'
import {
  collectCommandOutcome,
  createCommandTestDatabase,
  createOpenDatabaseMock,
  createProcessExitMock,
  getArgumentSetup,
  restoreProcessExit,
  runCommandSilently,
  setProcessExit,
} from '@/commands/test-helpers'
import { createAccountsTable } from '@/db/accounts/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from '@/db/transactions/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import type { Command } from 'commander'

const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const selectResponseQueue: string[] = []
const textResponseQueue: string[] = []

const selectMock = mock(() => Promise.resolve(selectResponseQueue.shift() ?? 'quit'))
const textMock = mock(() => Promise.resolve(textResponseQueue.shift() ?? ''))
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
  text: textMock,
}))

const processExitMock = createProcessExitMock()
let createCommentCommand: (defaultDb: string) => Command
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
  })
}

function getLastId(database: Database): number {
  const row = database.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }
  return row.id
}

function getComment(database: Database, id: number): string | null {
  const row = database.prepare('SELECT comment FROM transactions WHERE id = ?').get(id) as {
    comment: string | null
  } | null
  return row?.comment ?? null
}

async function runCommentCommand(database: Database, args: string[]): Promise<void> {
  openDatabaseMock.mockReturnValue(database)
  await runCommandSilently(createCommentCommand('default.db'), args)
}

type CommentOutcome = { status: 'resolved' } | { status: 'rejected'; errorCode: number | undefined }

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createCommentCommand } = await import('./comment'))
})

beforeEach(() => {
  openDatabaseMock.mockReset()
  selectMock.mockClear()
  textMock.mockClear()
  introMock.mockClear()
  outroMock.mockClear()
  noteMock.mockClear()
  cancelMock.mockClear()
  logInfoMock.mockClear()
  logErrorMock.mockClear()
  logSuccessMock.mockClear()
  processExitMock.mockClear()
  selectResponseQueue.length = 0
  textResponseQueue.length = 0
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createCommentCommand', () => {
  it('creates the command with name "comment"', () => {
    expect(createCommentCommand('flouz.db').name()).toBe('comment')
  })

  it('registers [id] as an optional non-variadic positional argument', () => {
    const argument = getArgumentSetup(createCommentCommand('flouz.db'), 0)
    expect(argument).toMatchObject({ name: 'id', required: false, variadic: false })
  })

  it('has --from option', () => {
    const option = createCommentCommand('flouz.db').options.find((option) => option.long === '--from')
    expect(option).toBeDefined()
  })

  it('has --to option', () => {
    const option = createCommentCommand('flouz.db').options.find((option) => option.long === '--to')
    expect(option).toBeDefined()
  })

  it('has --search option', () => {
    const option = createCommentCommand('flouz.db').options.find((option) => option.long === '--search')
    expect(option).toBeDefined()
  })

  it('has --limit option', () => {
    const option = createCommentCommand('flouz.db').options.find((option) => option.long === '--limit')
    expect(option).toBeDefined()
  })

  it('registers --db option with the supplied default path', () => {
    const option = createCommentCommand('my.db').options.find((option) => option.long === '--db')
    expect(option?.defaultValue).toBe('my.db')
  })
})

describe('comment action — no transactions found', () => {
  it('exits cleanly when no transactions match filters', async () => {
    const { handle } = createInMemoryDatabase()
    await runCommentCommand(handle, [])
    expect(outroMock).toHaveBeenCalled()
  })

  it('logs an informational message when no transactions match filters', async () => {
    const { handle } = createInMemoryDatabase()
    await runCommentCommand(handle, [])
    expect(logInfoMock).toHaveBeenCalled()
  })

  it('exits cleanly when the given ID does not exist', async () => {
    const { handle } = createInMemoryDatabase()
    await runCommentCommand(handle, ['999'])
    expect(outroMock).toHaveBeenCalled()
  })

  it('logs an informational message when the given ID does not exist', async () => {
    const { handle } = createInMemoryDatabase()
    await runCommentCommand(handle, ['999'])
    expect(logInfoMock).toHaveBeenCalled()
  })
})

describe('comment action — invalid ID argument', () => {
  it('exits with code 1 when ID is not a number', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectCommandOutcome<CommentOutcome>(
      () => runCommandSilently(createCommentCommand('default.db'), ['abc']),
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('logs an error message when ID is not a number', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    await collectCommandOutcome(
      () => runCommandSilently(createCommentCommand('default.db'), ['abc']),
      () => undefined,
      () => undefined,
    )

    expect(logErrorMock).toHaveBeenCalled()
  })

  it('exits with code 1 when ID is zero', async () => {
    const { handle } = createInMemoryDatabase()
    openDatabaseMock.mockReturnValue(handle)

    const outcome = await collectCommandOutcome<CommentOutcome>(
      () => runCommandSilently(createCommentCommand('default.db'), ['0']),
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })
})

describe('comment action — skip', () => {
  it('does not save a comment when skip is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    selectResponseQueue.push('skip')

    await runCommentCommand(handle, [])

    expect(getComment(database, id)).toBeNull()
  })
})

describe('comment action — set', () => {
  it('saves the comment when set is selected and text is entered', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    selectResponseQueue.push('set')
    textResponseQueue.push('Grocery run')

    await runCommentCommand(handle, [])

    expect(getComment(database, id)).toBe('Grocery run')
  })

  it('trims whitespace from the saved comment', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    selectResponseQueue.push('set')
    textResponseQueue.push('  Grocery run  ')

    await runCommentCommand(handle, [])

    expect(getComment(database, id)).toBe('Grocery run')
  })

  it('does not save when the entered comment is blank', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id = getLastId(database)
    selectResponseQueue.push('set')
    textResponseQueue.push('   ')

    await runCommentCommand(handle, [])

    expect(getComment(database, id)).toBeNull()
  })
})

describe('comment action — clear', () => {
  it('removes an existing comment when clear is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, { ...baseTransaction, comment: 'Old note' } as typeof baseTransaction)
    const id = getLastId(database)
    database.prepare('UPDATE transactions SET comment = ? WHERE id = ?').run('Old note', id)
    selectResponseQueue.push('clear')

    await runCommentCommand(handle, [])

    expect(getComment(database, id)).toBeNull()
  })
})

describe('comment action — quit', () => {
  it('stops processing remaining transactions when quit is selected', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id1 = getLastId(database)
    insertTransaction(database, { ...baseTransaction, counterparty: 'Other Shop' })
    const id2 = getLastId(database)
    selectResponseQueue.push('quit')

    await runCommentCommand(handle, [])

    expect({ comment1: getComment(database, id1), comment2: getComment(database, id2) }).toEqual({
      comment1: null,
      comment2: null,
    })
  })
})

describe('comment action — direct ID', () => {
  it('targets only the transaction with the given ID', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id1 = getLastId(database)
    insertTransaction(database, { ...baseTransaction, counterparty: 'Other Shop' })
    const id2 = getLastId(database)
    selectResponseQueue.push('set')
    textResponseQueue.push('Only this one')

    await runCommentCommand(handle, [String(id1)])

    expect({ comment1: getComment(database, id1), comment2: getComment(database, id2) }).toEqual({
      comment1: 'Only this one',
      comment2: null,
    })
  })
})

describe('comment action — filters', () => {
  it('only processes transactions matching --search filter', async () => {
    const { database, handle } = createInMemoryDatabase()
    insertTransaction(database, baseTransaction)
    const id1 = getLastId(database)
    insertTransaction(database, { ...baseTransaction, counterparty: 'Other Shop' })
    const id2 = getLastId(database)
    selectResponseQueue.push('set')
    textResponseQueue.push('Matched')

    await runCommentCommand(handle, ['--search', 'ACME'])

    expect({ comment1: getComment(database, id1), comment2: getComment(database, id2) }).toEqual({
      comment1: 'Matched',
      comment2: null,
    })
  })
})

describe('comment action — database error', () => {
  it('exits with code 1 when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('Cannot open DB')
    })

    const outcome = await collectCommandOutcome<CommentOutcome>(
      () => runCommandSilently(createCommentCommand('default.db'), []),
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })
})
