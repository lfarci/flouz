import { mock, spyOn, afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createProcessExitMock, restoreProcessExit, setProcessExit } from '@/commands/test-helpers'
import * as configModule from '@/config'

const logSuccessMock = mock((_message: string) => {})
const logErrorMock = mock((_message: string) => {})
const logInfoMock = mock((_message: string) => {})

void mock.module('@clack/prompts', () => ({
  log: {
    success: logSuccessMock,
    error: logErrorMock,
    info: logInfoMock,
  },
}))

import { createConfigCommand, formatConfigValueLine, isSupportedKey, toConfigFieldName } from '.'

const processExitMock = createProcessExitMock()
let originalProcessExit: typeof process.exit

describe('isSupportedKey', () => {
  it('returns true for db-path', () => {
    expect(isSupportedKey('db-path')).toBe(true)
  })

  it('returns true for github-token', () => {
    expect(isSupportedKey('github-token')).toBe(true)
  })

  it('returns true for ai-model', () => {
    expect(isSupportedKey('ai-model')).toBe(true)
  })

  it('returns true for ai-base-url', () => {
    expect(isSupportedKey('ai-base-url')).toBe(true)
  })

  it('returns false for unsupported keys', () => {
    expect(isSupportedKey('missing')).toBe(false)
  })
})

describe('toConfigFieldName', () => {
  it('maps db-path to dbPath', () => {
    expect(toConfigFieldName('db-path')).toBe('dbPath')
  })

  it('maps github-token to githubToken', () => {
    expect(toConfigFieldName('github-token')).toBe('githubToken')
  })

  it('maps ai-model to aiModel', () => {
    expect(toConfigFieldName('ai-model')).toBe('aiModel')
  })

  it('maps ai-base-url to aiBaseUrl', () => {
    expect(toConfigFieldName('ai-base-url')).toBe('aiBaseUrl')
  })
})

describe('formatConfigValueLine', () => {
  it('formats configured values', () => {
    expect(formatConfigValueLine('db-path', '/tmp/flouz.db')).toBe('db-path = /tmp/flouz.db')
  })

  it('formats missing values', () => {
    expect(formatConfigValueLine('db-path', undefined)).toBe('db-path = (not set)')
  })
})

beforeEach(() => {
  logSuccessMock.mockClear()
  logErrorMock.mockClear()
  logInfoMock.mockClear()
  processExitMock.mockClear()
  originalProcessExit = setProcessExit(processExitMock)
})

afterEach(() => {
  restoreProcessExit(originalProcessExit)
})

describe('createConfigCommand', () => {
  it('creates the config command', () => {
    const command = createConfigCommand()
    expect(command.name()).toBe('config')
  })

  it('registers the set subcommand', () => {
    const command = createConfigCommand()
    expect(command.commands.some((subcommand) => subcommand.name() === 'set')).toBe(true)
  })

  it('registers the get subcommand', () => {
    const command = createConfigCommand()
    expect(command.commands.some((subcommand) => subcommand.name() === 'get')).toBe(true)
  })
})

describe('setConfigAction', () => {
  it('writes the config value and logs success', async () => {
    const writeConfigSpy = spyOn(configModule, 'writeConfig').mockResolvedValue(undefined)
    const command = createConfigCommand()
    command.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    await command.parseAsync(['set', 'db-path', '/tmp/test.db'], {
      from: 'user',
    })

    expect(writeConfigSpy).toHaveBeenCalledWith({ dbPath: '/tmp/test.db' })
    expect(logSuccessMock.mock.calls[0][0]).toContain('db-path')
    writeConfigSpy.mockRestore()
  })

  it('logs an error and exits for an unknown key', async () => {
    const command = createConfigCommand()
    command.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    await expect(command.parseAsync(['set', 'not-a-key', 'value'], { from: 'user' })).rejects.toThrow()

    expect(logErrorMock).toHaveBeenCalled()
    expect(processExitMock).toHaveBeenCalledWith(1)
  })
})

describe('getConfigAction', () => {
  it('logs all config values when no key is given', async () => {
    const readConfigSpy = spyOn(configModule, 'readConfig').mockResolvedValue({
      dbPath: '/custom/path.db',
    })
    const command = createConfigCommand()
    command.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    await command.parseAsync(['get'], { from: 'user' })

    expect(logInfoMock).toHaveBeenCalled()
    const message = logInfoMock.mock.calls[0][0]
    expect(message).toContain('db-path')
    expect(message).toContain('/custom/path.db')
    readConfigSpy.mockRestore()
  })

  it('logs the value for a specific key', async () => {
    const readConfigSpy = spyOn(configModule, 'readConfig').mockResolvedValue({
      aiModel: 'openai/gpt-4o',
    })
    const command = createConfigCommand()
    command.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    await command.parseAsync(['get', 'ai-model'], { from: 'user' })

    expect(logInfoMock).toHaveBeenCalled()
    const message = logInfoMock.mock.calls[0][0]
    expect(message).toContain('ai-model')
    expect(message).toContain('openai/gpt-4o')
    readConfigSpy.mockRestore()
  })

  it('logs an error and exits for an unknown key', async () => {
    const command = createConfigCommand()
    command.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    await expect(command.parseAsync(['get', 'bad-key'], { from: 'user' })).rejects.toThrow()

    expect(logErrorMock).toHaveBeenCalled()
    expect(processExitMock).toHaveBeenCalledWith(1)
  })

  it('masks the github-token value when it is set', async () => {
    const readConfigSpy = spyOn(configModule, 'readConfig').mockResolvedValue({
      githubToken: 'ghp_super_secret',
    })
    const command = createConfigCommand()
    command.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    await command.parseAsync(['get'], { from: 'user' })

    const message = logInfoMock.mock.calls[0][0]
    expect(message).not.toContain('ghp_super_secret')
    expect(message).toContain('***')
    readConfigSpy.mockRestore()
  })
})
