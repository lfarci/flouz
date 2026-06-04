import { emptyState } from '@/cli/empty'
import { isBrokenPipeError, writeStdout } from '@/cli/stdout'
import { log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import {
  buildBalanceHistoryCsv,
  buildBalanceHistoryJson,
  formatBalanceHistoryTable,
  toBalanceHistoryRow,
  type BalanceHistoryRow,
} from '@/commands/accounts/balance-output'
import { requireAccount, resolveDateRangeOptions } from '@/commands/accounts/balance-input'
import { getAccounts } from '@/db/accounts/queries'
import { getBalanceHistory } from '@/db/account_balance_snapshots/derived'
import { getBalanceSnapshots } from '@/db/account_balance_snapshots/queries'
import { openDatabase } from '@/db/schema'
import type { Account } from '@/types'

type OutputFormat = 'table' | 'csv' | 'json'

type HistoryOptions = {
  from?: string
  to?: string
  output: OutputFormat
  db: string
}

export function parseHistoryOutputFormat(value: string): OutputFormat {
  if (value === 'table' || value === 'csv' || value === 'json') return value
  throw new Error(`Invalid output format: ${value}. Use table, csv, or json.`)
}

async function historyAccountAction(key: string | undefined, options: HistoryOptions): Promise<void> {
  let database: Database | undefined

  try {
    const range = resolveDateRangeOptions(options.from, options.to)
    database = openDatabase(resolve(options.db))
    const accounts = resolveHistoryAccounts(database, key)
    const rows = buildHistoryRows(database, accounts, range)
    await writeHistoryRows(rows, options.output)
  } catch (error) {
    if (isBrokenPipeError(error)) {
      process.exit(0)
    }

    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database?.close()
  }
}

function resolveHistoryAccounts(database: Database, key: string | undefined): Account[] {
  if (key !== undefined) return [requireAccount(database, key)]

  return getAccounts(database).filter((account) => {
    return getBalanceSnapshots(database, { accountId: account.id }).length > 0
  })
}

function buildHistoryRows(
  database: Database,
  accounts: Account[],
  range: { from: string; to: string },
): BalanceHistoryRow[] {
  return accounts.flatMap((account) => {
    const points = getBalanceHistory(database, { accountId: account.id, from: range.from, to: range.to })
    return points.map((point) => toBalanceHistoryRow(account.key, point))
  })
}

async function writeHistoryRows(rows: BalanceHistoryRow[], outputFormat: OutputFormat): Promise<void> {
  if (rows.length === 0 && outputFormat === 'table') {
    emptyState('No balance snapshots found.', 'Run `flouz accounts snapshot` to save an account balance.')
    return
  }

  if (outputFormat === 'csv') {
    await writeStdout(`${buildBalanceHistoryCsv(rows)}\n`)
    return
  }
  if (outputFormat === 'json') {
    await writeStdout(`${buildBalanceHistoryJson(rows)}\n`)
    return
  }

  log.message(formatBalanceHistoryTable(rows), { spacing: 0, withGuide: false })
}

export function createHistoryAccountsCommand(defaultDb: string): Command {
  return new Command('history')
    .description('Show account balance history')
    .argument('[key]', 'account key')
    .option('--from <YYYY-MM-DD>', 'start date (defaults to --to)')
    .option('--to <YYYY-MM-DD>', 'end date (defaults to today)')
    .option('-o, --output <format>', 'output format (table, csv, json)', parseHistoryOutputFormat, 'table')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(historyAccountAction)
}
