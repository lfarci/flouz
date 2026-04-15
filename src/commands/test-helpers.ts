import { mock } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { Command } from 'commander'

export class ProcessExitError extends Error {
  constructor(readonly code: number) {
    super(`process.exit(${code})`)
  }
}

export interface CommandTestDatabase {
  database: Database
  closeMock: ReturnType<typeof mock>
  handle: Database
}

export interface CommandArgumentSetup {
  name: string
  required: boolean
  description?: string
  variadic: boolean
}

export function createOpenDatabaseMock() {
  return mock((dbPath: string): Database => {
    throw new Error(`openDatabase mock not configured for ${dbPath}`)
  })
}

export function createProcessExitMock() {
  return mock((code?: number) => {
    throw new ProcessExitError(code ?? 0)
  })
}

export function setProcessExit(processExitMock: typeof process.exit): typeof process.exit {
  const originalProcessExit = process.exit

  Object.defineProperty(process, 'exit', {
    value: processExitMock,
    configurable: true,
    writable: true,
  })

  return originalProcessExit
}

export function restoreProcessExit(originalProcessExit: typeof process.exit): void {
  Object.defineProperty(process, 'exit', {
    value: originalProcessExit,
    configurable: true,
    writable: true,
  })
}

export function createCommandTestDatabase(
  initializeDatabase: (database: Database) => void
): CommandTestDatabase {
  const database = new Database(':memory:')
  initializeDatabase(database)
  const closeMock = mock(() => {})

  const handle = database as unknown as Database & { close: typeof closeMock }
  handle.close = closeMock

  return { database, closeMock, handle }
}

export async function runCommandSilently(command: Command, argumentsList: string[]): Promise<void> {
  command.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  })

  await command.parseAsync(argumentsList, { from: 'user' })
}

export async function collectCommandOutcome<T>(
  runCommand: () => Promise<void>,
  createResolvedOutcome: () => T,
  createRejectedOutcome: (errorCode: number | undefined) => T
): Promise<T> {
  try {
    await runCommand()
    return createResolvedOutcome()
  } catch (error) {
    return createRejectedOutcome(getProcessExitCode(error))
  }
}

export function getArgumentSetup(command: Command, index: number): CommandArgumentSetup | undefined {
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

function getProcessExitCode(error: unknown): number | undefined {
  return error instanceof ProcessExitError ? error.code : undefined
}