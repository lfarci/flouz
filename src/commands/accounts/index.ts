import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { resolveDbPath } from '@/config'
import { deleteAccountByKey, insertAccount } from '@/db/accounts/mutations'
import { getAccounts } from '@/db/accounts/queries'
import { openDatabase } from '@/db/schema'
import { hasTransactionsForAccount } from '@/db/transactions/queries'
import type { Account } from '@/types'

type AccountsCommandOptions = {
  db: string
}

type AddAccountOptions = AccountsCommandOptions & {
  description?: string
  iban?: string
}

type DeleteAccountOptions = AccountsCommandOptions

export function formatAccountsTable(accounts: Account[]): string[] {
  const header = ['Key', 'Name', 'Company', 'IBAN'].map(value => value.padEnd(20)).join(' │ ')
  const divider = '─'.repeat(header.length)
  const rows = accounts.map(formatAccountRow)
  return [divider, header, divider, ...rows, divider]
}

function formatAccountRow(account: Account): string {
  return [
    truncateForColumn(account.key).padEnd(20),
    truncateForColumn(account.name).padEnd(20),
    truncateForColumn(account.company).padEnd(20),
    truncateForColumn(account.iban ?? '—').padEnd(20),
  ].join(' │ ')
}

function truncateForColumn(value: string): string {
  return value.substring(0, 18)
}

async function addAccountAction(
  key: string,
  name: string,
  company: string,
  options: AddAccountOptions
): Promise<void> {
  const db = openDatabase(resolve(options.db))

  try {
    insertAccount(db, {
      key,
      name,
      company,
      description: options.description,
      iban: options.iban,
    })
    log.success(`Created account ${key}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    db.close()
  }
}

async function listAccountsAction(options: AccountsCommandOptions): Promise<void> {
  const db = openDatabase(resolve(options.db))

  try {
    const accounts = getAccounts(db)
    if (accounts.length === 0) {
      log.info('No accounts configured.')
      return
    }

    for (const line of formatAccountsTable(accounts)) {
      log.message(line, { symbol: '' })
    }
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    db.close()
  }
}

async function deleteAccountAction(key: string, options: DeleteAccountOptions): Promise<void> {
  const db = openDatabase(resolve(options.db))

  try {
    const accounts = getAccounts(db)
    const account = accounts.find(candidate => candidate.key === key)

    if (account === undefined) {
      throw new Error(`Unknown account key: ${key}`)
    }

    if (hasTransactionsForAccount(db, account.id)) {
      throw new Error(`Cannot delete account ${key}: it is referenced by transactions.`)
    }

    deleteAccountByKey(db, key)
    log.success(`Deleted account ${key}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    db.close()
  }
}

function createAddAccountsCommand(defaultDb: string): Command {
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

function createListAccountsCommand(defaultDb: string): Command {
  return new Command('list')
    .description('List configured accounts')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(listAccountsAction)
}

function createDeleteAccountsCommand(defaultDb: string): Command {
  return new Command('delete')
    .description('Delete a configured account by key')
    .argument('<key>', 'unique import key')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(deleteAccountAction)
}

export async function createAccountsCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('accounts')
    .description('Manage configured accounts')
    .addCommand(createAddAccountsCommand(defaultDb))
    .addCommand(createDeleteAccountsCommand(defaultDb))
    .addCommand(createListAccountsCommand(defaultDb))
}