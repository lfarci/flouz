import { Command } from 'commander'
import { log } from '@clack/prompts'
import { readConfig, writeConfig } from '@/config'

const SUPPORTED_KEYS = ['db-path', 'github-token', 'ai-model', 'ai-base-url'] as const

type SupportedKey = (typeof SUPPORTED_KEYS)[number]

const KEY_DESCRIPTIONS: Record<SupportedKey, string> = {
  'db-path':      'Path to the SQLite database file (default: ~/.config/flouz/flouz.db)',
  'github-token': 'GitHub personal access token — required for AI categorization',
  'ai-model':     'AI model name to use (default: openai/gpt-4o-mini)',
  'ai-base-url':  'AI provider base URL (default: https://models.github.ai/inference)',
}

export function isSupportedKey(key: string): key is SupportedKey {
  return SUPPORTED_KEYS.includes(key as SupportedKey)
}

export function toConfigFieldName(key: SupportedKey): 'dbPath' | 'githubToken' | 'aiModel' | 'aiBaseUrl' {
  const keyMap = {
    'db-path': 'dbPath',
    'github-token': 'githubToken',
    'ai-model': 'aiModel',
    'ai-base-url': 'aiBaseUrl',
  } as const
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
      const lines = [
        formatConfigValueLine('db-path', config.dbPath),
        formatConfigValueLine('github-token', config.githubToken ? '***' : undefined),
        formatConfigValueLine('ai-model', config.aiModel),
        formatConfigValueLine('ai-base-url', config.aiBaseUrl),
      ]
      log.info(lines.join('\n'))
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

function buildKeysHelpText(): string {
  const lines = SUPPORTED_KEYS.map(key => `  ${key.padEnd(16)}${KEY_DESCRIPTIONS[key]}`)
  return `\nAvailable keys:\n${lines.join('\n')}`
}

function createSetConfigCommand(): Command {
  return new Command('set')
    .description('Set a config value')
    .argument('<key>')
    .argument('<value>')
    .addHelpText('after', buildKeysHelpText())
    .action(setConfigAction)
}

function createGetConfigCommand(): Command {
  return new Command('get')
    .description('Get config value(s)')
    .argument('[key]')
    .addHelpText('after', buildKeysHelpText())
    .action(getConfigAction)
}

export function createConfigCommand(): Command {
  const configCommand = new Command('config').description('Manage flouz configuration')
  configCommand.addCommand(createSetConfigCommand())
  configCommand.addCommand(createGetConfigCommand())
  return configCommand
}
