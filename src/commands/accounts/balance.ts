import { log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { formatDerivedBalance } from '@/commands/accounts/balance-output'
import { requireAccount, resolveDateOption } from '@/commands/accounts/balance-input'
import { getDerivedAccountBalance } from '@/db/account_balance_snapshots/derived'
import { openDatabase } from '@/db/schema'

type BalanceOptions = {
  date?: string
  db: string
}

function balanceAccountAction(key: string, options: BalanceOptions): void {
  let database: Database | undefined

  try {
    const date = resolveDateOption(options.date)
    database = openDatabase(resolve(options.db))
    const account = requireAccount(database, key)
    const balance = getDerivedAccountBalance(database, account.id, date)
    log.info(formatDerivedBalance(account.key, balance))
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database?.close()
  }
}

export function createBalanceAccountsCommand(defaultDb: string): Command {
  return new Command('balance')
    .description('Show an account balance for a date')
    .argument('<key>', 'account key')
    .option('--date <YYYY-MM-DD>', 'balance date (defaults to today)')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(balanceAccountAction)
}
