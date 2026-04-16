import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { insertAccount } from '@/db/accounts/mutations'
import { openDatabase } from '@/db/schema'

interface AccountsCommandOptions {
  db: string
}

type AddAccountOptions = AccountsCommandOptions & {
  description?: string
  iban?: string
}

function requireAccountField(value: string, fieldName: string): string {
  const normalizedValue = value.trim()

  if (normalizedValue.length === 0) {
    throw new Error(`Account ${fieldName} cannot be empty`)
  }

  return normalizedValue
}

function normalizeOptionalField(value?: string): string | undefined {
  const normalizedValue = value?.trim()

  if (normalizedValue === undefined || normalizedValue.length === 0) {
    return undefined
  }

  return normalizedValue
}

function addAccountAction(key: string, name: string, company: string, options: AddAccountOptions): void {
  const database = openDatabase(resolve(options.db))

  try {
    insertAccount(database, {
      key: requireAccountField(key, 'key'),
      name: requireAccountField(name, 'name'),
      company: requireAccountField(company, 'company'),
      description: normalizeOptionalField(options.description),
      iban: normalizeOptionalField(options.iban),
    })
    log.success(`Created account ${key}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createAddAccountsCommand(defaultDb: string): Command {
  return new Command('add')
    .description('Add a configured account')
    .argument('<key>', 'unique import key')
    .argument('<name>', 'human-readable account name')
    .argument('<company>', 'provider or institution name')
    .option('-d, --description <text>', 'optional account description')
    .option('-i, --iban <iban>', 'optional account IBAN')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(addAccountAction)
}
