import { mock, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import {
  collectCommandOutcome,
  createCommandTestDatabase,
  createOpenDatabaseMock,
  createProcessExitMock,
  restoreProcessExit,
  setProcessExit,
} from '@/commands/test-helpers'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import type { createListCategoriesCommand as CreateListCategoriesCommand } from './list'

const openDatabaseMock = createOpenDatabaseMock()

void mock.module('@/db/schema', () => ({
  openDatabase: (dbPath: string) => openDatabaseMock(dbPath),
}))

const logInfoMock = mock((_message: string) => {})
const logErrorMock = mock((_message: string) => {})

void mock.module('@clack/prompts', () => ({
  log: {
    info: logInfoMock,
    error: logErrorMock,
  },
}))

const writeStdoutMock = mock(async (_text: string) => {})

void mock.module('@/cli/stdout', () => ({
  writeStdout: writeStdoutMock,
  isBrokenPipeError: (error: unknown): boolean =>
    error instanceof Error && (error as NodeJS.ErrnoException).code === 'EPIPE',
}))

const processExitMock = createProcessExitMock()
let createListCategoriesCommand: typeof CreateListCategoriesCommand
let originalProcessExit: typeof process.exit

type ListCategoriesOutcome = { status: 'resolved' } | { status: 'rejected'; errorCode: number | undefined }

function createInMemoryDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
    seedCategories(database)
  })
}

function createEmptyDatabase() {
  return createCommandTestDatabase((database) => {
    createCategoriesTable(database)
  })
}

async function runListCategories(
  handle: ReturnType<typeof createInMemoryDatabase>['handle'],
  args: string[],
): Promise<void> {
  openDatabaseMock.mockReturnValue(handle)
  const command = createListCategoriesCommand('default.db')
  command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
  await command.parseAsync(args, { from: 'user' })
}

beforeAll(async () => {
  originalProcessExit = process.exit
  ;({ createListCategoriesCommand } = await import('./list'))
})

beforeEach(() => {
  openDatabaseMock.mockReset()
  logInfoMock.mockClear()
  logErrorMock.mockClear()
  writeStdoutMock.mockClear()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createListCategoriesCommand', () => {
  it('creates a command named list', () => {
    const command = createListCategoriesCommand('flouz.db')
    expect(command.name()).toBe('list')
  })

  it('has a --tree option defaulting to false', () => {
    const command = createListCategoriesCommand('flouz.db')
    const treeOption = command.options.find((option) => option.long === '--tree')
    expect(treeOption).toBeDefined()
    expect(treeOption?.defaultValue).toBe(false)
  })

  it('has a --db option', () => {
    const command = createListCategoriesCommand('flouz.db')
    const dbOption = command.options.find((option) => option.long === '--db')
    expect(dbOption).toBeDefined()
  })
})

describe('listCategoriesAction — empty categories', () => {
  it('logs an info message when no categories are found', async () => {
    const { handle } = createEmptyDatabase()

    await runListCategories(handle, [])

    expect(logInfoMock).toHaveBeenCalledWith('No categories found.')
  })

  it('does not write to stdout when no categories are found', async () => {
    const { handle } = createEmptyDatabase()

    await runListCategories(handle, [])

    expect(writeStdoutMock).not.toHaveBeenCalled()
  })
})

describe('listCategoriesAction — table output (default)', () => {
  it('writes the table to stdout when categories exist', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, [])

    expect(writeStdoutMock).toHaveBeenCalledTimes(1)
  })

  it('output contains category slugs', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, [])

    const output = writeStdoutMock.mock.calls[0][0]
    expect(output).toContain('groceries')
  })

  it('output contains category names', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, [])

    const output = writeStdoutMock.mock.calls[0][0]
    expect(output).toContain('Groceries')
  })

  it('does not log an info message when categories exist', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, [])

    expect(logInfoMock).not.toHaveBeenCalled()
  })
})

describe('listCategoriesAction — tree output (--tree)', () => {
  it('writes tree output to stdout when --tree is passed', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, ['--tree'])

    expect(writeStdoutMock).toHaveBeenCalledTimes(1)
  })

  it('tree output contains tree branch characters', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, ['--tree'])

    const output = writeStdoutMock.mock.calls[0][0]
    expect(output).toMatch(/[├└]──/)
  })

  it('tree output contains category names', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, ['--tree'])

    const output = writeStdoutMock.mock.calls[0][0]
    expect(output).toContain('Groceries')
  })

  it('tree output contains category slugs', async () => {
    const { handle } = createInMemoryDatabase()

    await runListCategories(handle, ['--tree'])

    const output = writeStdoutMock.mock.calls[0][0]
    expect(output).toContain('groceries')
  })
})

describe('listCategoriesAction — error handling', () => {
  it('exits with code 1 when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB open failed')
    })

    const outcome = await collectCommandOutcome<ListCategoriesOutcome>(
      async () => {
        const command = createListCategoriesCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync([], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(outcome).toEqual({ status: 'rejected', errorCode: 1 })
  })

  it('logs the error message when openDatabase throws', async () => {
    openDatabaseMock.mockImplementation(() => {
      throw new Error('DB open failed')
    })

    await collectCommandOutcome(
      async () => {
        const command = createListCategoriesCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync([], { from: 'user' })
      },
      () => undefined,
      () => undefined,
    )

    expect(logErrorMock).toHaveBeenCalledWith('DB open failed')
  })

  it('exits with code 0 on EPIPE error', async () => {
    const epipeError = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })
    openDatabaseMock.mockImplementation(() => {
      throw epipeError
    })

    const outcome = await collectCommandOutcome<ListCategoriesOutcome>(
      async () => {
        const command = createListCategoriesCommand('default.db')
        command.configureOutput({ writeErr: () => {}, writeOut: () => {} })
        await command.parseAsync([], { from: 'user' })
      },
      () => ({ status: 'resolved' }),
      (errorCode) => ({ status: 'rejected', errorCode }),
    )

    expect(outcome).toEqual({ status: 'rejected', errorCode: 0 })
  })
})
