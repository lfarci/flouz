import { Command } from 'commander'
import { log } from '@clack/prompts'
import { readConfig, writeConfig } from '@/config'

const SUPPORTED_KEYS = ['db-path'] as const
type SupportedKey = (typeof SUPPORTED_KEYS)[number]

function isSupported(key: string): key is SupportedKey {
  return SUPPORTED_KEYS.includes(key as SupportedKey)
}

function toConfigField(key: SupportedKey): 'dbPath' {
  const map = { 'db-path': 'dbPath' } as const
  return map[key]
}

export function createConfigCommand(): Command {
  const config = new Command('config').description('Manage flouz configuration')

  config
    .command('set <key> <value>')
    .description(`Set a config value. Supported keys: ${SUPPORTED_KEYS.join(', ')}`)
    .action(async (key: string, value: string) => {
      if (!isSupported(key)) {
        log.error(`Unknown key: "${key}". Supported: ${SUPPORTED_KEYS.join(', ')}`)
        process.exit(1)
      }
      await writeConfig({ [toConfigField(key)]: value })
      log.success(`${key} set to ${value}`)
    })

  config
    .command('get [key]')
    .description('Get config value(s)')
    .action(async (key?: string) => {
      if (key !== undefined && !isSupported(key)) {
        log.error(`Unknown key: "${key}". Supported: ${SUPPORTED_KEYS.join(', ')}`)
        process.exit(1)
      }
      const current = await readConfig()
      if (key !== undefined) {
        const value = current[toConfigField(key as SupportedKey)]
        log.info(`${key} = ${value ?? '(not set)'}`)
      } else {
        log.info(`db-path = ${current.dbPath ?? '(not set)'}`)
      }
    })

  return config
}
