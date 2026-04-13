import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { getAccounts } from '@/db/accounts/queries'
import { openDatabase } from '@/db/schema'
import type { Account } from '@/types'

type AccountsCommandOptions = {
  db: string
}

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

async function listAccountsAction(options: AccountsCommandOptions): Promise<void> {
  const database = openDatabase(resolve(options.db))

  try {
    const accounts = getAccounts(database)
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
    database.close()
  }
}

export function createListAccountsCommand(defaultDb: string): Command {
  return new Command('list')
    .description('List configured accounts')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(listAccountsAction)
}
