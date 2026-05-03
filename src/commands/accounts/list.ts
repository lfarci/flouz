import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { emptyState } from '@/cli/empty'
import { renderCliTable } from '@/cli/table'
import { ICON_EMPTY } from '@/cli/theme'
import { getAccounts } from '@/db/accounts/queries'
import { openDatabase } from '@/db/schema'
import type { Account } from '@/types'

interface AccountsCommandOptions {
  db: string
}

export function formatAccountsTable(accounts: Account[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Key', width: 18, minWidth: 12, truncate: 18 },
      { header: 'Name', width: 24, minWidth: 16, truncate: 24 },
      { header: 'Company', width: 20, minWidth: 12, truncate: 20 },
      { header: 'IBAN', width: 22, minWidth: 14, truncate: 22 },
    ],
    rows: accounts.map((account) => [account.key, account.name, account.company, account.iban ?? ICON_EMPTY]),
  })
}

function listAccountsAction(options: AccountsCommandOptions): void {
  const database = openDatabase(resolve(options.db))

  try {
    const accounts = getAccounts(database)
    if (accounts.length === 0) {
      emptyState('No accounts configured.', 'Run `flouz accounts add` to create an account.')
      return
    }

    log.message(formatAccountsTable(accounts), { spacing: 0, withGuide: false })
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
