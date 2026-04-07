import { Command } from 'commander'
import { log } from '@clack/prompts'
import { readConfig, writeConfig } from '@/config'

const SUPPORTED_KEYS = ['db-path'] as const

type SupportedKey = (typeof SUPPORTED_KEYS)[number]

export function isSupportedKey(key: string): key is SupportedKey {
  return SUPPORTED_KEYS.includes(key as SupportedKey)
}

export function toConfigFieldName(key: SupportedKey): 'dbPath' {
  const keyMap = { 'db-path': 'dbPath' } as const
  return keyMap[key]
}

function buildUnknownKeyMessage(key: string): string {
  return `Unknown key: "${key}". Supported: ${SUPPORTED_KEYS.join(', ')}`
}

function validateSupportedKey(key: string): SupportedKey {
  if (isSupportedKey(key)) return key
  throw new Error(buildUnknownKeyMessage(key))
}

async function setConfigAction(key: string, value: string): Promise<void> {
  try {
    const supportedKey = validateSupportedKey(key)
    await writeConfig({ [toConfigFieldName(supportedKey)]: value })
    log.success(`${supportedKey} set to ${value}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function getConfigAction(key: string | undefined): Promise<void> {
  try {
    const config = await readConfig()
    if (key === undefined) {
      log.info(formatConfigValueLine('db-path', config.dbPath))
      return
    }

    const supportedKey = validateSupportedKey(key)
    log.info(formatConfigValueLine(supportedKey, config[toConfigFieldName(supportedKey)]))
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function formatConfigValueLine(key: SupportedKey, value: string | undefined): string {
  return `${key} = ${value ?? '(not set)'}`
}

function createSetConfigCommand(): Command {
  return new Command('set')
    .description(`Set a config value. Supported keys: ${SUPPORTED_KEYS.join(', ')}`)
    .argument('<key>')
    .argument('<value>')
    .action(setConfigAction)
}

function createGetConfigCommand(): Command {
  return new Command('get')
    .description('Get config value(s)')
    .argument('[key]')
    .action(getConfigAction)
}

export function createConfigCommand(): Command {
  const configCommand = new Command('config').description('Manage flouz configuration')
  configCommand.addCommand(createSetConfigCommand())
  configCommand.addCommand(createGetConfigCommand())
  return configCommand
}