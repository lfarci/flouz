import { log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { formatAmountWithCurrency } from '@/commands/accounts/balance-output'
import {
  normalizeCurrency,
  normalizeOptionalText,
  parseBalanceAmount,
  requireAccount,
  resolveDateOption,
} from '@/commands/accounts/balance-input'
import { upsertAccountBalanceSnapshot } from '@/db/account_balance_snapshots/mutations'
import { openDatabase } from '@/db/schema'

type SnapshotOptions = {
  date?: string
  currency?: string
  note?: string
  db: string
}

function snapshotAccountAction(key: string, amountValue: string, options: SnapshotOptions): void {
  let database: Database | undefined

  try {
    const date = resolveDateOption(options.date)
    const amount = parseBalanceAmount(amountValue)
    const currency = normalizeCurrency(options.currency)
    database = openDatabase(resolve(options.db))
    const account = requireAccount(database, key)

    upsertAccountBalanceSnapshot(database, {
      accountId: account.id,
      date,
      amount,
      currency,
      note: normalizeOptionalText(options.note),
    })
    log.success(`Saved ${account.key} balance snapshot for ${date}: ${formatAmountWithCurrency(amount, currency)}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database?.close()
  }
}

export function createSnapshotAccountsCommand(defaultDb: string): Command {
  return new Command('snapshot')
    .description('Save an account balance snapshot')
    .argument('<key>', 'account key')
    .argument('<amount>', 'account balance amount')
    .option('--date <YYYY-MM-DD>', 'snapshot date (defaults to today)')
    .option('--currency <code>', '3-letter currency code', 'EUR')
    .option('--note <text>', 'optional snapshot note')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(snapshotAccountAction)
}
